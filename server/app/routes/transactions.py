from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import get_current_user
from app.bse_starmf import get_bse_starmf_status
from app.database import get_clients_collection, get_orders_collection, get_transactions_collection
from app.domain_models import OrderDraftCreate, OrderUpdate
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


@router.get("/orders")
def list_orders(
    clientId: str = Query(default=""),
    status_filter: str = Query(default="", alias="status"),
    rail: str = Query(default=""),
    limit: int = Query(default=100, ge=1, le=300),
    user: dict = Depends(get_current_user),
):
    query = {} if user["role"] == "owner" else {"createdByUserId": user["_id"]}
    if clientId:
        query["clientId"] = object_id(clientId)
    if status_filter:
        query["status"] = status_filter
    if rail:
        query["rail"] = rail

    orders = get_orders_collection().find(query).sort("createdAt", -1).limit(limit)
    return [map_order(item) for item in orders]


@router.post("/orders/draft")
def create_order_draft(payload: OrderDraftCreate, user: dict = Depends(get_current_user)):
    client = get_clients_collection().find_one({"_id": object_id(payload.clientId)})
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    if user["role"] != "owner" and client.get("assignedRmUserId") != user["_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to create orders for this client")
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


@router.patch("/orders/{order_id}")
def update_order(order_id: str, payload: OrderUpdate, user: dict = Depends(get_current_user)):
    order = get_orders_collection().find_one({"_id": object_id(order_id)})
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if user["role"] != "owner" and order.get("createdByUserId") != user["_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to update this order")

    patch = {}
    for key, value in payload.model_dump(exclude_none=True).items():
        if isinstance(value, str):
            patch[key] = value.strip()
        else:
            patch[key] = value

    if not patch:
        return map_order(order)

    patch["updatedAt"] = utc_now()
    get_orders_collection().update_one({"_id": order["_id"]}, {"$set": patch})
    updated = get_orders_collection().find_one({"_id": order["_id"]})
    return map_order(updated)


@router.get("/integrations/bse-starmf/status")
def get_bse_status(_user: dict = Depends(get_current_user)):
    return get_bse_starmf_status()
