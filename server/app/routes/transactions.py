from fastapi import APIRouter, Depends, Query

from app.auth import get_current_user
from app.bse_starmf import get_bse_starmf_status
from app.database import get_orders_collection, get_transactions_collection
from app.domain_models import OrderDraftCreate
from app.utils import map_order, map_transaction, object_id, utc_now

router = APIRouter(prefix="/api", tags=["transactions"])


@router.get("/transactions")
def list_transactions(
    clientId: str = Query(default=""),
    limit: int = Query(default=50, ge=1, le=200),
    _user: dict = Depends(get_current_user),
):
    query = {}
    if clientId:
        query["clientId"] = object_id(clientId)
    transactions = get_transactions_collection().find(query).sort("transactionDate", -1).limit(limit)
    return [map_transaction(item) for item in transactions]


@router.post("/orders/draft")
def create_order_draft(payload: OrderDraftCreate, user: dict = Depends(get_current_user)):
    now = utc_now()
    document = {
        "clientId": object_id(payload.clientId),
        "folioId": object_id(payload.folioId),
        "schemeCode": payload.schemeCode,
        "rail": "bse_starmf",
        "orderIntentType": payload.orderIntentType,
        "amount": payload.amount,
        "units": payload.units,
        "status": "draft",
        "externalRef": "",
        "remarks": payload.remarks.strip(),
        "createdByUserId": user["_id"],
        "submittedAt": None,
        "responseAt": None,
        "responseRaw": None,
        "createdAt": now,
        "updatedAt": now,
    }
    result = get_orders_collection().insert_one(document)
    created = get_orders_collection().find_one({"_id": result.inserted_id})
    return map_order(created)


@router.get("/integrations/bse-starmf/status")
def get_bse_status(_user: dict = Depends(get_current_user)):
    return get_bse_starmf_status()
