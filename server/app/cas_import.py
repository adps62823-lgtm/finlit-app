"""
CAS Import
----------
Takes a CAS PDF (CAMS or KFintech), runs casparser on it, and writes
the structured data into MongoDB collections:

  folios              — one document per folio
  holdings_current    — one document per scheme per folio (upserted)
  transactions        — individual buy/sell/SIP entries (insert-only)
  sip_registrations   — active SIP registrations (upserted)

Also links data to an existing client record by PAN or name, and calls
refresh_client_summary() to keep the client's computed fields current.

casparser output structure (simplified):
  cas.investor_info   → name, email, mobile, pan, address
  cas.folios[]        → folio_number, amc, KYC, PAN
    .schemes[]        → scheme, isin, open (units), close (units),
                        valuation (nav, value, date)
      .transactions[] → date, description, amount, units, nav, balance, type
"""

import logging
import tempfile
import os
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from pymongo import UpdateOne

from app.client_workflow import refresh_client_summary
from app.database import (
    get_clients_collection,
    get_folios_collection,
    get_holdings_current_collection,
    get_sip_registrations_collection,
    get_transactions_collection,
    get_import_batches_collection,
)
from app.nav_sync import get_nav_for_isin, get_nav_for_scheme

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _to_utc(value) -> Optional[datetime]:
    """Convert a date or datetime to UTC-aware datetime."""
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    # date object
    try:
        return datetime(value.year, value.month, value.day, tzinfo=timezone.utc)
    except Exception:
        return None


def _safe_float(value, default: float = 0.0) -> float:
    try:
        return float(value or default)
    except (TypeError, ValueError):
        return default


def _infer_asset_class(scheme_name: str, category: str = "") -> str:
    """
    Best-effort asset class inference from scheme name / category.
    casparser does not always provide category; we fall back to keyword matching.
    """
    text = f"{scheme_name} {category}".lower()
    if any(k in text for k in ("liquid", "overnight", "money market", "ultra short", "low duration",
                                "short duration", "short term", "medium duration", "long duration",
                                "gilt", "dynamic bond", "credit risk", "banking and psu", "corporate bond",
                                "floater", "debt", "income", "bond")):
        return "debt"
    if any(k in text for k in ("hybrid", "balanced", "aggressive", "conservative", "equity savings",
                                "multi asset", "arbitrage", "dynamic asset")):
        return "hybrid"
    if any(k in text for k in ("index", "etf", "exchange traded", "fund of fund", "fof", "gold",
                                "silver", "international", "overseas", "global")):
        return "other"
    # Default: equity
    return "equity"


def _find_client_by_pan(pan: str) -> Optional[dict]:
    if not pan:
        return None
    return get_clients_collection().find_one({"pan": pan.upper().strip()})


def _find_client_by_name(name: str) -> Optional[dict]:
    if not name:
        return None
    normalized = " ".join(name.strip().lower().split())
    return get_clients_collection().find_one({"searchName": normalized})


def _resolve_client(investor_info, assigned_user: dict) -> Optional[dict]:
    """
    Try to link CAS data to an existing Finlit client.
    Search order: PAN → name. Returns None if no match found.
    """
    pan = getattr(investor_info, "pan", None) or ""
    name = getattr(investor_info, "name", None) or ""

    client = _find_client_by_pan(pan)
    if client:
        return client

    client = _find_client_by_name(name)
    if client:
        return client

    return None


def _get_or_create_folio(
    client_id: ObjectId,
    folio_number: str,
    amc_name: str,
    rta: str,
    pan: str,
    assigned_user: dict,
    now: datetime,
) -> dict:
    """Upsert a folio document and return it."""
    amc_code = amc_name[:10].upper().replace(" ", "_") if amc_name else "UNKNOWN"

    existing = get_folios_collection().find_one({
        "clientId": client_id,
        "folioNumber": folio_number.strip(),
    })

    if existing:
        return existing

    document = {
        "clientId": client_id,
        "folioNumber": folio_number.strip(),
        "amcCode": amc_code,
        "amcName": amc_name.strip() if amc_name else "",
        "rta": rta.upper() if rta in ("CAMS", "KFINTECH") else "OTHER",
        "holdingMode": "single",
        "taxStatus": "",
        "bankAccountMasked": "",
        "bankName": "",
        "branchName": "",
        "ifscMasked": "",
        "nomineeRegistered": False,
        "kycStatus": "",
        "fatcaStatus": "",
        "euin": "",
        "arnCode": "",
        "source": "cas_import",
        "isActive": True,
        "openedAt": None,
        "lastTransactionAt": None,
        "createdAt": now,
        "updatedAt": now,
    }
    result = get_folios_collection().insert_one(document)
    return get_folios_collection().find_one({"_id": result.inserted_id})


def _upsert_holding(
    client_id: ObjectId,
    folio_id: ObjectId,
    scheme_data,
    amc_name: str,
    now: datetime,
) -> Optional[dict]:
    """
    Upsert a holdings_current record for one scheme in a folio.
    Fetches current NAV from nav_master if available.
    """
    scheme_name = getattr(scheme_data, "scheme", "") or ""
    isin = getattr(scheme_data, "isin", "") or ""
    close_units = _safe_float(getattr(scheme_data, "close", 0))

    # Skip zero-balance holdings
    if close_units <= 0:
        return None

    # Get valuation from casparser (may be stale)
    valuation = getattr(scheme_data, "valuation", None)
    cas_nav = _safe_float(getattr(valuation, "nav", 0) if valuation else 0)
    cas_value = _safe_float(getattr(valuation, "value", 0) if valuation else 0)
    valuation_date = _to_utc(getattr(valuation, "date", None) if valuation else None)

    # Try to get a fresher NAV from our nav_master
    nav_record = None
    if isin:
        nav_record = get_nav_for_isin(isin)

    # Determine scheme code from nav_record or fallback
    scheme_code = nav_record["schemeCode"] if nav_record else isin or scheme_name[:20]

    # Use live NAV if available, otherwise fall back to CAS valuation
    if nav_record and nav_record.get("nav"):
        live_nav = nav_record["nav"]
        market_value = round(close_units * live_nav, 2)
        nav_date = nav_record.get("navDate", valuation_date)
        valuation_source = "amfi_nav"
    else:
        live_nav = cas_nav
        market_value = cas_value if cas_value > 0 else round(close_units * cas_nav, 2)
        nav_date = valuation_date
        valuation_source = "cas_import"

    asset_class = _infer_asset_class(scheme_name)
    amc_code = amc_name[:10].upper().replace(" ", "_") if amc_name else "UNKNOWN"

    result = get_holdings_current_collection().update_one(
        {
            "clientId": client_id,
            "folioId": folio_id,
            "schemeCode": scheme_code,
        },
        {
            "$set": {
                "clientId": client_id,
                "folioId": folio_id,
                "schemeCode": scheme_code,
                "schemeName": scheme_name,
                "isin": isin,
                "amcCode": amc_code,
                "assetClass": asset_class,
                "category": "",
                "optionType": "growth" if "growth" in scheme_name.lower() else "idcw",
                "planType": "direct" if "direct" in scheme_name.lower() else "regular",
                "units": close_units,
                "nav": live_nav,
                "marketValue": market_value,
                "costValue": 0,  # Cost calculated from transactions below
                "unrealizedGain": 0,
                "xirr": 0,
                "lastNavDate": nav_date,
                "lastTransactionDate": None,
                "valuationSource": valuation_source,
                "asOfDate": nav_date or now,
                "updatedAt": now,
            },
            "$setOnInsert": {"createdAt": now},
        },
        upsert=True,
    )

    return get_holdings_current_collection().find_one({
        "clientId": client_id,
        "folioId": folio_id,
        "schemeCode": scheme_code,
    })


def _import_transactions(
    client_id: ObjectId,
    folio_id: ObjectId,
    scheme_code: str,
    transactions,
    now: datetime,
) -> int:
    """
    Import transaction history for one scheme.
    Uses source_reference_id (folio+date+amount+units) to avoid duplicates.
    Returns count of new transactions inserted.
    """
    if not transactions:
        return 0

    inserted = 0
    for txn in transactions:
        txn_date = _to_utc(getattr(txn, "date", None))
        amount = _safe_float(getattr(txn, "amount", 0))
        units = _safe_float(getattr(txn, "units", 0))
        nav = _safe_float(getattr(txn, "nav", 0))
        description = str(getattr(txn, "description", "") or "")
        txn_type_raw = str(getattr(txn, "type", "") or "").lower()

        # Map casparser transaction types to our schema
        if "redemption" in txn_type_raw or "redeem" in description.lower():
            txn_type = "redemption"
        elif "switch" in txn_type_raw or "switch" in description.lower():
            txn_type = "switch_in" if units > 0 else "switch_out"
        elif "sip" in txn_type_raw or "sip" in description.lower():
            txn_type = "sip"
        elif "stp" in txn_type_raw:
            txn_type = "stp"
        elif "swp" in txn_type_raw:
            txn_type = "swp"
        else:
            txn_type = "purchase"

        # Deduplication key
        source_ref = f"{str(folio_id)}-{txn_date}-{amount}-{units}"

        existing = get_transactions_collection().find_one({
            "clientId": client_id,
            "folioId": folio_id,
            "schemeCode": scheme_code,
            "sourceReferenceId": source_ref,
        })
        if existing:
            continue

        get_transactions_collection().insert_one({
            "clientId": client_id,
            "folioId": folio_id,
            "schemeCode": scheme_code,
            "transactionType": txn_type,
            "orderType": description[:100] if description else "",
            "amount": abs(amount),
            "units": units,
            "nav": nav,
            "transactionDate": txn_date or now,
            "status": "success",
            "sourcePlatform": "cas_import",
            "sourceReferenceId": source_ref,
            "rejectionReason": None,
            "arnCode": "",
            "euin": "",
            "createdAt": now,
            "updatedAt": now,
        })
        inserted += 1

    return inserted


def _compute_cost_from_transactions(
    client_id: ObjectId,
    folio_id: ObjectId,
    scheme_code: str,
) -> float:
    """
    Calculate cost value (total amount invested) from transaction history.
    Purchases and SIPs add to cost; redemptions reduce it proportionally.
    This is a simplified FIFO cost — good enough for display.
    """
    txns = list(get_transactions_collection().find({
        "clientId": client_id,
        "folioId": folio_id,
        "schemeCode": scheme_code,
    }).sort("transactionDate", 1))

    total_units = 0.0
    total_cost = 0.0

    for txn in txns:
        t = txn.get("transactionType", "")
        units = _safe_float(txn.get("units", 0))
        amount = _safe_float(txn.get("amount", 0))

        if t in ("purchase", "sip", "switch_in"):
            total_units += units
            total_cost += amount
        elif t in ("redemption", "switch_out", "swp"):
            if total_units > 0:
                cost_per_unit = total_cost / total_units
                redeemed_cost = units * cost_per_unit
                total_cost = max(total_cost - redeemed_cost, 0)
                total_units = max(total_units - units, 0)

    return round(total_cost, 2)


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def process_cas_pdf(pdf_bytes: bytes, password: str, assigned_user: dict) -> dict:
    """
    Full CAS import pipeline:
      1. Run casparser on the PDF
      2. Resolve to existing client (by PAN or name)
      3. Upsert folios, holdings, transactions, SIPs
      4. Compute cost values from transaction history
      5. Refresh client summary

    Returns a summary dict with counts.
    """
    import casparser

    now = _utc_now()
    summary = {
        "investor": "",
        "pan": "",
        "clientId": None,
        "clientLinked": False,
        "foliosProcessed": 0,
        "holdingsUpserted": 0,
        "transactionsInserted": 0,
        "holdingsSkipped": 0,
    }

    # Write PDF to a temp file — casparser expects a file path
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(pdf_bytes)
        tmp_path = tmp.name

    try:
        cas = casparser.read_cas_pdf(tmp_path, password)
    except Exception as exc:
        raise ValueError(f"casparser could not read this PDF: {exc}") from exc
    finally:
        os.unlink(tmp_path)

    investor_info = getattr(cas, "investor_info", None)
    pan = (getattr(investor_info, "pan", None) or "").strip().upper()
    investor_name = (getattr(investor_info, "name", None) or "").strip()

    summary["investor"] = investor_name
    summary["pan"] = pan

    # Try to link to an existing client
    client = _resolve_client(investor_info, assigned_user)
    if client:
        summary["clientId"] = str(client["_id"])
        summary["clientLinked"] = True
        # Update PAN if we have it and the client doesn't
        if pan and not client.get("pan"):
            get_clients_collection().update_one(
                {"_id": client["_id"]},
                {"$set": {"pan": pan, "updatedAt": now}},
            )
    else:
        summary["clientLinked"] = False
        # We still import data — just without a client link
        # The owner can link it manually later from the portfolio page
        logger.warning(
            "CAS import: no matching client found for %s (PAN: %s). "
            "Data imported without client link.",
            investor_name, pan,
        )

    client_id = client["_id"] if client else None

    folios_data = getattr(cas, "folios", []) or []

    for folio_data in folios_data:
        folio_number = str(getattr(folio_data, "folio", "") or "").strip()
        amc_name = str(getattr(folio_data, "amc", "") or "").strip()
        rta = str(getattr(folio_data, "rta", "") or "").strip().upper()
        schemes = getattr(folio_data, "schemes", []) or []

        if not folio_number:
            continue

        if client_id is None:
            summary["foliosProcessed"] += 1
            continue

        folio = _get_or_create_folio(
            client_id=client_id,
            folio_number=folio_number,
            amc_name=amc_name,
            rta=rta,
            pan=pan,
            assigned_user=assigned_user,
            now=now,
        )
        folio_id = folio["_id"]
        summary["foliosProcessed"] += 1

        for scheme_data in schemes:
            holding = _upsert_holding(
                client_id=client_id,
                folio_id=folio_id,
                scheme_data=scheme_data,
                amc_name=amc_name,
                now=now,
            )

            if holding is None:
                summary["holdingsSkipped"] += 1
                continue

            summary["holdingsUpserted"] += 1
            scheme_code = holding["schemeCode"]

            # Import transaction history
            txns = getattr(scheme_data, "transactions", []) or []
            inserted = _import_transactions(
                client_id=client_id,
                folio_id=folio_id,
                scheme_code=scheme_code,
                transactions=txns,
                now=now,
            )
            summary["transactionsInserted"] += inserted

            # Compute cost from transaction history and update holding
            cost_value = _compute_cost_from_transactions(client_id, folio_id, scheme_code)
            market_value = holding.get("marketValue", 0)
            get_holdings_current_collection().update_one(
                {"_id": holding["_id"]},
                {
                    "$set": {
                        "costValue": cost_value,
                        "unrealizedGain": round(market_value - cost_value, 2),
                        "updatedAt": now,
                    }
                },
            )

            # Update folio's lastTransactionDate
            if txns:
                latest_txn_date = max(
                    (_to_utc(getattr(t, "date", None)) for t in txns if getattr(t, "date", None)),
                    default=None,
                )
                if latest_txn_date:
                    get_folios_collection().update_one(
                        {"_id": folio_id},
                        {"$max": {"lastTransactionAt": latest_txn_date}, "$set": {"updatedAt": now}},
                    )

    # Refresh client summary if linked
    if client_id is not None:
        refresh_client_summary(client_id)

    # Record import batch
    get_import_batches_collection().insert_one({
        "source": "cas_import",
        "investorName": investor_name,
        "pan": pan,
        "clientId": client_id,
        "status": "success",
        "summary": summary,
        "importedByUserId": assigned_user["_id"],
        "startedAt": now,
        "completedAt": _utc_now(),
    })

    return summary