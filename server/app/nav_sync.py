"""
AMFI NAV Sync
-------------
Fetches the daily NAV file from amfiindia.com, parses it, and upserts
into the nav_master MongoDB collection.

AMFI publishes NAVAll.txt every business day by ~9 PM IST.
URL: https://www.amfiindia.com/spages/NAVAll.txt

File format (semicolon-separated, 8 columns):
  Scheme Code ; ISIN Div Payout/Growth ; ISIN Div Reinvestment ;
  Scheme Name ; NAV ; Repurchase Price ; Sale Price ; Date

Non-data lines (category headers, AMC names, blank lines) have
fewer than 8 semicolon-separated tokens and are skipped.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

import urllib.request
from pymongo import UpdateOne
from pymongo.errors import BulkWriteError

from app.database import get_db

logger = logging.getLogger(__name__)

AMFI_NAV_URL = "https://www.amfiindia.com/spages/NAVAll.txt"
NAV_COLLECTION = "nav_master"


def get_nav_collection():
    return get_db()[NAV_COLLECTION]


def _parse_date(raw: str) -> Optional[datetime]:
    """Parse DD-Mon-YYYY format returned by AMFI into UTC datetime."""
    raw = raw.strip()
    if not raw:
        return None
    for fmt in ("%d-%b-%Y", "%d/%b/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(raw, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _parse_nav_line(line: str) -> Optional[dict]:
    """
    Parse one semicolon-delimited line from NAVAll.txt.
    Returns None if the line is not a valid NAV data row.
    """
    parts = line.strip().split(";")
    if len(parts) != 8:
        return None

    scheme_code = parts[0].strip()
    if not scheme_code.isdigit():
        return None

    nav_raw = parts[4].strip()
    try:
        nav = float(nav_raw)
    except ValueError:
        # NAV reported as "N.A." for suspended schemes — skip
        return None

    nav_date = _parse_date(parts[7])
    if nav_date is None:
        return None

    return {
        "schemeCode": scheme_code,
        "isinGrowth": parts[1].strip() or None,
        "isinDivReinvest": parts[2].strip() or None,
        "schemeName": parts[3].strip(),
        "nav": nav,
        "repurchasePrice": _safe_float(parts[5]),
        "salePrice": _safe_float(parts[6]),
        "navDate": nav_date,
    }


def _safe_float(value: str) -> Optional[float]:
    try:
        return float(value.strip())
    except (ValueError, AttributeError):
        return None


def fetch_nav_text() -> str:
    """Download NAVAll.txt from AMFI. Returns raw text content."""
    req = urllib.request.Request(
        AMFI_NAV_URL,
        headers={"User-Agent": "FinlitApp/1.0 (internal MFD tool)"},
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        raw_bytes = response.read()

    # AMFI file is typically UTF-8 or latin-1
    try:
        return raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        return raw_bytes.decode("latin-1")


def parse_nav_text(text: str) -> list[dict]:
    """Parse the full NAVAll.txt content into a list of NAV records."""
    records = []
    for line in text.splitlines():
        record = _parse_nav_line(line)
        if record:
            records.append(record)
    return records


def upsert_nav_records(records: list[dict]) -> dict:
    """
    Bulk upsert NAV records into nav_master collection.
    Key: schemeCode (unique per scheme, never changes).
    Also maintains an ISINindex so holdings can look up NAV by ISIN.
    Returns a summary dict with counts.
    """
    if not records:
        return {"upserted": 0, "matched": 0, "total": 0}

    collection = get_nav_collection()
    now = datetime.now(timezone.utc)

    ops = []
    for record in records:
        ops.append(
            UpdateOne(
                {"schemeCode": record["schemeCode"]},
                {
                    "$set": {
                        **record,
                        "updatedAt": now,
                    },
                    "$setOnInsert": {"createdAt": now},
                },
                upsert=True,
            )
        )

    try:
        result = collection.bulk_write(ops, ordered=False)
        return {
            "upserted": result.upserted_count,
            "matched": result.matched_count,
            "modified": result.modified_count,
            "total": len(records),
        }
    except BulkWriteError as e:
        logger.warning("NAV bulk write partial error: %s", e.details)
        return {"upserted": 0, "matched": 0, "modified": 0, "total": len(records), "error": str(e)}


def run_nav_sync() -> dict:
    """
    Full pipeline: fetch → parse → upsert.
    Called by the /api/nav/sync endpoint and can also be called
    from a cron job or startup hook.
    """
    logger.info("Starting AMFI NAV sync...")
    text = fetch_nav_text()
    records = parse_nav_text(text)
    logger.info("Parsed %d NAV records from AMFI", len(records))
    result = upsert_nav_records(records)
    logger.info("NAV sync complete: %s", result)
    return result


def get_nav_for_scheme(scheme_code: str) -> Optional[dict]:
    """Fetch the latest NAV record for a given AMFI scheme code."""
    return get_nav_collection().find_one({"schemeCode": scheme_code})


def get_nav_for_isin(isin: str) -> Optional[dict]:
    """
    Fetch the latest NAV record by ISIN.
    Checks both isinGrowth and isinDivReinvest fields.
    """
    return get_nav_collection().find_one(
        {"$or": [{"isinGrowth": isin}, {"isinDivReinvest": isin}]}
    )


def revalue_holdings_for_client(client_id) -> int:
    """
    After a NAV sync, recompute marketValue for every holding of a client
    by multiplying current units × latest NAV.
    Returns count of holdings updated.
    """
    from app.database import get_holdings_current_collection

    holdings = list(
        get_holdings_current_collection().find({"clientId": client_id})
    )
    updated = 0
    now = datetime.now(timezone.utc)

    for holding in holdings:
        nav_record = None

        # Try ISIN first (more precise)
        if holding.get("isin"):
            nav_record = get_nav_for_isin(holding["isin"])

        # Fall back to scheme code
        if nav_record is None and holding.get("schemeCode"):
            nav_record = get_nav_for_scheme(holding["schemeCode"])

        if nav_record is None:
            continue

        latest_nav = nav_record["nav"]
        units = holding.get("units", 0)
        market_value = round(units * latest_nav, 2)
        cost_value = holding.get("costValue", 0)
        unrealized_gain = round(market_value - cost_value, 2)

        get_holdings_current_collection().update_one(
            {"_id": holding["_id"]},
            {
                "$set": {
                    "nav": latest_nav,
                    "marketValue": market_value,
                    "unrealizedGain": unrealized_gain,
                    "lastNavDate": nav_record["navDate"],
                    "valuationSource": "amfi_nav",
                    "asOfDate": nav_record["navDate"],
                    "updatedAt": now,
                }
            },
        )
        updated += 1

    return updated


def revalue_all_holdings() -> dict:
    """
    Revalue every holding in the database using the latest stored NAV.
    Called after a full NAV sync.
    """
    from app.database import get_holdings_current_collection

    all_holdings = list(get_holdings_current_collection().find({}))
    updated = 0
    skipped = 0
    now = datetime.now(timezone.utc)

    for holding in all_holdings:
        nav_record = None

        if holding.get("isin"):
            nav_record = get_nav_for_isin(holding["isin"])
        if nav_record is None and holding.get("schemeCode"):
            nav_record = get_nav_for_scheme(holding["schemeCode"])

        if nav_record is None:
            skipped += 1
            continue

        latest_nav = nav_record["nav"]
        units = holding.get("units", 0)
        market_value = round(units * latest_nav, 2)
        cost_value = holding.get("costValue", 0)
        unrealized_gain = round(market_value - cost_value, 2)

        get_holdings_current_collection().update_one(
            {"_id": holding["_id"]},
            {
                "$set": {
                    "nav": latest_nav,
                    "marketValue": market_value,
                    "unrealizedGain": unrealized_gain,
                    "lastNavDate": nav_record["navDate"],
                    "valuationSource": "amfi_nav",
                    "asOfDate": nav_record["navDate"],
                    "updatedAt": now,
                }
            },
        )
        updated += 1

    return {"updated": updated, "skipped": skipped, "total": len(all_holdings)}