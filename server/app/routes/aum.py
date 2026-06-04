from fastapi import APIRouter, Depends, Query

from app.auth import get_current_user
from app.database import (
    get_aum_snapshots_collection,
    get_clients_collection,
    get_folios_collection,
    get_holdings_current_collection,
    get_sip_registrations_collection,
)
from app.utils import map_aum_snapshot, object_id, utc_now

router = APIRouter(prefix="/api/aum", tags=["aum"])


def _visible_clients(user: dict):
    query = {} if user["role"] == "owner" else {"assignedRmUserId": user["_id"]}
    return list(get_clients_collection().find(query).sort("updatedAt", -1))


def _compute_snapshot(client: dict) -> dict:
    holdings = list(get_holdings_current_collection().find({"clientId": client["_id"]}))
    folios = list(get_folios_collection().find({"clientId": client["_id"]}))
    sips = list(get_sip_registrations_collection().find({"clientId": client["_id"]}))

    total_aum = sum(item.get("marketValue", 0) for item in holdings)
    equity_aum = sum(item.get("marketValue", 0) for item in holdings if item.get("assetClass") == "equity")
    debt_aum = sum(item.get("marketValue", 0) for item in holdings if item.get("assetClass") == "debt")
    hybrid_aum = sum(item.get("marketValue", 0) for item in holdings if item.get("assetClass") == "hybrid")
    other_aum = max(total_aum - equity_aum - debt_aum - hybrid_aum, 0)
    active_sip_amount = sum(
        item.get("sipAmount", 0)
        for item in sips
        if item.get("status") == "active" and item.get("registrationStatus") == "registered"
    )

    return {
        "scopeType": "client",
        "scopeId": client["_id"],
        "scopeLabel": client.get("primaryHolderName", ""),
        "totalAum": round(total_aum, 2),
        "equityAum": round(equity_aum, 2),
        "debtAum": round(debt_aum, 2),
        "hybridAum": round(hybrid_aum, 2),
        "otherAum": round(other_aum, 2),
        "activeSipAmount": round(active_sip_amount, 2),
        "folioCount": len(folios),
        "schemeCount": len(holdings),
        "clientCount": 1,
        "asOfDate": utc_now(),
        "source": "manual_sync",
        "importBatchId": None,
    }


def _compute_business_snapshot(clients: list[dict]) -> dict:
    holdings = []
    folio_count = 0
    sip_count = 0
    active_sip_amount = 0
    for client in clients:
        client_holdings = list(get_holdings_current_collection().find({"clientId": client["_id"]}))
        holdings.extend(client_holdings)
        folio_count += get_folios_collection().count_documents({"clientId": client["_id"]})
        sips = list(get_sip_registrations_collection().find({"clientId": client["_id"]}))
        sip_count += len(sips)
        active_sip_amount += sum(
            item.get("sipAmount", 0)
            for item in sips
            if item.get("status") == "active" and item.get("registrationStatus") == "registered"
        )

    total_aum = sum(item.get("marketValue", 0) for item in holdings)
    equity_aum = sum(item.get("marketValue", 0) for item in holdings if item.get("assetClass") == "equity")
    debt_aum = sum(item.get("marketValue", 0) for item in holdings if item.get("assetClass") == "debt")
    hybrid_aum = sum(item.get("marketValue", 0) for item in holdings if item.get("assetClass") == "hybrid")
    other_aum = max(total_aum - equity_aum - debt_aum - hybrid_aum, 0)

    return {
        "scopeType": "business",
        "scopeId": None,
        "scopeLabel": "Business",
        "totalAum": round(total_aum, 2),
        "equityAum": round(equity_aum, 2),
        "debtAum": round(debt_aum, 2),
        "hybridAum": round(hybrid_aum, 2),
        "otherAum": round(other_aum, 2),
        "activeSipAmount": round(active_sip_amount, 2),
        "folioCount": folio_count,
        "schemeCount": len(holdings),
        "clientCount": len(clients),
        "asOfDate": utc_now(),
        "source": "manual_sync",
        "importBatchId": None,
    }


def _insert_snapshot(document: dict) -> dict:
    payload = dict(document)
    payload["createdAt"] = utc_now()
    result = get_aum_snapshots_collection().insert_one(payload)
    return get_aum_snapshots_collection().find_one({"_id": result.inserted_id})


def _latest_snapshot(query: dict):
    cursor = get_aum_snapshots_collection().find(query).sort([("asOfDate", -1), ("createdAt", -1)]).limit(1)
    for document in cursor:
        return document
    return None


@router.get("")
def get_aum(clientId: str = Query(default=""), user: dict = Depends(get_current_user)):
    clients = _visible_clients(user)
    business = _compute_business_snapshot(clients)
    response = {
        "business": map_aum_snapshot(business),
        "clients": [],
    }

    if clientId:
        client = get_clients_collection().find_one({"_id": object_id(clientId)})
        if client and (user["role"] == "owner" or client.get("assignedRmUserId") == user["_id"]):
            snapshot = _latest_snapshot({"scopeType": "client", "scopeId": client["_id"]})
            response["client"] = map_aum_snapshot(snapshot or _compute_snapshot(client))

    client_snapshots = []
    seen = set()
    visible_ids = {str(client["_id"]) for client in clients}
    for snapshot in get_aum_snapshots_collection().find({"scopeType": "client"}).sort([("asOfDate", -1), ("createdAt", -1)]):
        scope_id = str(snapshot.get("scopeId"))
        if scope_id not in visible_ids:
            continue
        if scope_id in seen:
            continue
        seen.add(scope_id)
        client_snapshots.append(map_aum_snapshot(snapshot))
        if len(client_snapshots) >= 50:
            break
    response["clients"] = client_snapshots
    return response


@router.post("/sync")
def sync_aum(clientId: str = Query(default=""), user: dict = Depends(get_current_user)):
    clients = _visible_clients(user)
    synced_clients = []
    if clientId:
        client = get_clients_collection().find_one({"_id": object_id(clientId)})
        if client and (user["role"] == "owner" or client.get("assignedRmUserId") == user["_id"]):
            synced_clients.append(_insert_snapshot(_compute_snapshot(client)))
    else:
        for client in clients:
            synced_clients.append(_insert_snapshot(_compute_snapshot(client)))

    business = _insert_snapshot(_compute_business_snapshot(clients))
    return {
        "synced": len(synced_clients),
        "business": map_aum_snapshot(business),
        "clients": [map_aum_snapshot(item) for item in synced_clients],
    }
