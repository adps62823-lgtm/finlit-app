"""
AUM Routes
----------
GET  /api/aum              — business + client AUM using real stored NAV values
POST /api/aum/sync         — revalue holdings then rebuild AUM snapshots

All market values now come from holdings_current.marketValue which is
populated by casparser import and kept fresh by the AMFI NAV sync.
The old fake _compute_snapshot() that multiplied zeroed holdings is removed.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query

from app.auth import get_current_user, require_owner
from app.database import (
    get_aum_snapshots_collection,
    get_clients_collection,
    get_folios_collection,
    get_holdings_current_collection,
    get_sip_registrations_collection,
)
from app.nav_sync import revalue_all_holdings
from app.utils import map_aum_snapshot, object_id

router = APIRouter(prefix="/api/aum", tags=["aum"])


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _visible_clients(user: dict) -> list[dict]:
    query = {} if user["role"] == "owner" else {"assignedRmUserId": user["_id"]}
    return list(get_clients_collection().find(query).sort("updatedAt", -1))


def _build_client_snapshot(client: dict) -> dict:
    """
    Build an AUM snapshot for one client using real marketValue figures
    that were written by the CAS import + AMFI NAV revaluation.
    """
    holdings = list(get_holdings_current_collection().find({"clientId": client["_id"]}))
    folios = list(get_folios_collection().find({"clientId": client["_id"]}))
    sips = list(get_sip_registrations_collection().find({"clientId": client["_id"]}))

    total_aum = sum(h.get("marketValue", 0) for h in holdings)
    equity_aum = sum(h.get("marketValue", 0) for h in holdings if h.get("assetClass", "").lower() == "equity")
    debt_aum = sum(h.get("marketValue", 0) for h in holdings if h.get("assetClass", "").lower() == "debt")
    hybrid_aum = sum(h.get("marketValue", 0) for h in holdings if h.get("assetClass", "").lower() == "hybrid")
    other_aum = max(round(total_aum - equity_aum - debt_aum - hybrid_aum, 2), 0)

    active_sip_amount = sum(
        s.get("sipAmount", 0)
        for s in sips
        if s.get("status") == "active" and s.get("registrationStatus") == "registered"
    )

    return {
        "scopeType": "client",
        "scopeId": client["_id"],
        "scopeLabel": client.get("primaryHolderName", ""),
        "totalAum": round(total_aum, 2),
        "equityAum": round(equity_aum, 2),
        "debtAum": round(debt_aum, 2),
        "hybridAum": round(hybrid_aum, 2),
        "otherAum": other_aum,
        "activeSipAmount": round(active_sip_amount, 2),
        "folioCount": len(folios),
        "schemeCount": len(holdings),
        "clientCount": 1,
        "asOfDate": datetime.now(timezone.utc),
        "source": "amfi_nav",
    }


def _build_business_snapshot(clients: list[dict]) -> dict:
    """
    Aggregate AUM snapshot across all visible clients.
    """
    total_aum = equity_aum = debt_aum = hybrid_aum = active_sip_amount = 0.0
    folio_count = scheme_count = 0

    for client in clients:
        holdings = list(get_holdings_current_collection().find({"clientId": client["_id"]}))
        sips = list(get_sip_registrations_collection().find({"clientId": client["_id"]}))

        for h in holdings:
            mv = h.get("marketValue", 0)
            total_aum += mv
            asset_class = h.get("assetClass", "").lower()
            if asset_class == "equity":
                equity_aum += mv
            elif asset_class == "debt":
                debt_aum += mv
            elif asset_class == "hybrid":
                hybrid_aum += mv

        scheme_count += len(holdings)
        folio_count += get_folios_collection().count_documents({"clientId": client["_id"]})

        active_sip_amount += sum(
            s.get("sipAmount", 0)
            for s in sips
            if s.get("status") == "active" and s.get("registrationStatus") == "registered"
        )

    other_aum = max(round(total_aum - equity_aum - debt_aum - hybrid_aum, 2), 0)

    return {
        "scopeType": "business",
        "scopeId": None,
        "scopeLabel": "Business",
        "totalAum": round(total_aum, 2),
        "equityAum": round(equity_aum, 2),
        "debtAum": round(debt_aum, 2),
        "hybridAum": round(hybrid_aum, 2),
        "otherAum": other_aum,
        "activeSipAmount": round(active_sip_amount, 2),
        "folioCount": folio_count,
        "schemeCount": scheme_count,
        "clientCount": len(clients),
        "asOfDate": datetime.now(timezone.utc),
        "source": "amfi_nav",
    }


def _save_snapshot(document: dict) -> dict:
    now = datetime.now(timezone.utc)
    document["createdAt"] = now
    result = get_aum_snapshots_collection().insert_one(document)
    return get_aum_snapshots_collection().find_one({"_id": result.inserted_id})


def _latest_snapshot(query: dict) -> dict | None:
    cursor = (
        get_aum_snapshots_collection()
        .find(query)
        .sort([("asOfDate", -1), ("createdAt", -1)])
        .limit(1)
    )
    for doc in cursor:
        return doc
    return None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("")
def get_aum(
    clientId: str = Query(default=""),
    user: dict = Depends(get_current_user),
):
    """
    Return AUM overview built from real holdings + AMFI NAV values.
    If clientId is provided, also return per-client snapshot.
    """
    clients = _visible_clients(user)
    business = _build_business_snapshot(clients)

    response = {
        "business": map_aum_snapshot(business),
        "clients": [],
    }

    if clientId:
        client = get_clients_collection().find_one({"_id": object_id(clientId)})
        if client and (
            user["role"] == "owner"
            or client.get("assignedRmUserId") == user["_id"]
        ):
            snapshot = _latest_snapshot({"scopeType": "client", "scopeId": client["_id"]})
            if snapshot is None:
                snapshot = _build_client_snapshot(client)
            response["client"] = map_aum_snapshot(snapshot)

    # Populate recent per-client snapshots from saved records
    client_snapshots = []
    seen = set()
    visible_ids = {str(c["_id"]) for c in clients}

    for snap in (
        get_aum_snapshots_collection()
        .find({"scopeType": "client"})
        .sort([("asOfDate", -1), ("createdAt", -1)])
    ):
        scope_id = str(snap.get("scopeId", ""))
        if scope_id not in visible_ids or scope_id in seen:
            continue
        seen.add(scope_id)
        client_snapshots.append(map_aum_snapshot(snap))
        if len(client_snapshots) >= 50:
            break

    response["clients"] = client_snapshots
    return response


@router.post("/sync")
def sync_aum(
    clientId: str = Query(default=""),
    user: dict = Depends(require_owner),
):
    """
    1. Revalue all holdings using latest NAVs in nav_master.
    2. Save fresh AUM snapshots to aum_snapshots collection.

    This replaces the old fake sync that computed from zero-valued holdings.
    For a full fresh NAV pull from AMFI, use POST /api/nav/sync first.
    """
    # Step 1 — revalue holdings with stored NAVs
    revalue_result = revalue_all_holdings()

    clients = _visible_clients(user)
    synced_clients = []

    if clientId:
        client = get_clients_collection().find_one({"_id": object_id(clientId)})
        if client and (
            user["role"] == "owner"
            or client.get("assignedRmUserId") == user["_id"]
        ):
            synced_clients.append(_save_snapshot(_build_client_snapshot(client)))
    else:
        for client in clients:
            synced_clients.append(_save_snapshot(_build_client_snapshot(client)))

    business = _save_snapshot(_build_business_snapshot(clients))

    return {
        "revaluation": revalue_result,
        "synced": len(synced_clients),
        "business": map_aum_snapshot(business),
        "clients": [map_aum_snapshot(s) for s in synced_clients],
    }