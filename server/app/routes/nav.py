"""
NAV Routes
----------
GET  /api/nav/status          — last sync time + record count
POST /api/nav/sync            — trigger a full AMFI NAV sync (owner only)
GET  /api/nav/scheme/{code}   — lookup NAV by AMFI scheme code
GET  /api/nav/isin/{isin}     — lookup NAV by ISIN
POST /api/nav/revalue         — revalue all holdings using latest stored NAVs
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user, require_owner
from app.database import get_db
from app.nav_sync import (
    get_nav_collection,
    get_nav_for_isin,
    get_nav_for_scheme,
    revalue_all_holdings,
    run_nav_sync,
)
from app.utils import _serialize_value

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/nav", tags=["nav"])


def _serialize_nav(doc: dict) -> dict:
    if doc is None:
        return None
    return {k: _serialize_value(v) for k, v in doc.items()}


@router.get("/status")
def nav_status(_user: dict = Depends(get_current_user)):
    """Return last sync metadata and total NAV record count."""
    collection = get_nav_collection()
    total = collection.count_documents({})

    # Find the most recently updated record to derive last sync time
    latest = collection.find_one({}, sort=[("updatedAt", -1)])
    last_sync = latest["updatedAt"].isoformat() if latest and latest.get("updatedAt") else None
    last_nav_date = latest["navDate"].isoformat() if latest and latest.get("navDate") else None

    return {
        "totalSchemes": total,
        "lastSyncAt": last_sync,
        "lastNavDate": last_nav_date,
        "status": "ready" if total > 0 else "empty",
    }


@router.post("/sync")
def sync_nav(user: dict = Depends(require_owner)):
    """
    Trigger a full AMFI NAV sync.
    Downloads NAVAll.txt, parses ~20,000 schemes, upserts into nav_master,
    then revalues all holdings in the database.
    Owner-only — this is a heavy operation.
    """
    try:
        sync_result = run_nav_sync()
    except Exception as exc:
        logger.error("AMFI NAV sync failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch NAV from AMFI: {str(exc)}",
        )

    try:
        revalue_result = revalue_all_holdings()
    except Exception as exc:
        logger.warning("Revaluation after NAV sync failed: %s", exc)
        revalue_result = {"updated": 0, "skipped": 0, "error": str(exc)}

    return {
        "navSync": sync_result,
        "revaluation": revalue_result,
        "syncedAt": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/scheme/{scheme_code}")
def get_scheme_nav(scheme_code: str, _user: dict = Depends(get_current_user)):
    """Look up the latest stored NAV for an AMFI scheme code."""
    record = get_nav_for_scheme(scheme_code)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No NAV found for scheme code {scheme_code}. Run a sync first.",
        )
    return _serialize_nav(record)


@router.get("/isin/{isin}")
def get_isin_nav(isin: str, _user: dict = Depends(get_current_user)):
    """Look up the latest stored NAV for an ISIN."""
    record = get_nav_for_isin(isin)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No NAV found for ISIN {isin}. Run a sync first.",
        )
    return _serialize_nav(record)


@router.post("/revalue")
def revalue_holdings(user: dict = Depends(require_owner)):
    """
    Revalue all holdings using the latest NAVs already stored in nav_master.
    Use this when you want to refresh valuations without re-fetching from AMFI.
    """
    try:
        result = revalue_all_holdings()
    except Exception as exc:
        logger.error("Revaluation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Revaluation failed: {str(exc)}",
        )
    return {**result, "revaluedAt": datetime.now(timezone.utc).isoformat()}