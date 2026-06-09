from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status

from app.auth import get_current_user
from app.client_imports import enrich_import_rows_with_gemini, normalize_import_row, parse_bulk_client_source
from app.client_workflow import date_to_utc_datetime, refresh_client_summary, upsert_client_from_payload
from app.database import (
    get_clients_collection,
    get_logs_collection,
    get_tasks_collection,
)
from app.config import get_settings
from app.schemas import ClientCreate, ClientUpdate
from app.utils import (
    map_client,
    map_log,
    map_task,
    object_id,
    utc_now,
)

router = APIRouter(prefix="/api/clients", tags=["clients"])


@router.get("")
def list_clients(
    q: str = Query(default="", alias="query"),
    limit: int = Query(default=50, ge=1, le=200),
    user: dict = Depends(get_current_user),
):
    # All staff can see all clients — no assignedRmUserId filter
    query = {}
    if q.strip():
        search = {"$regex": q.strip(), "$options": "i"}
        query = {
            "$or": [
                {"primaryHolderName": search},
                {"pan": search},
                {"clientCode": search},
                {"email": search},
                {"mobile": search},
                {"city": search},
                {"familyName": search},
                {"notes": search},
                {"nextAction": search},
            ],
        }
    clients = get_clients_collection().find(query).sort("updatedAt", -1).limit(limit)
    return [map_client(item) for item in clients]


@router.post("")
def create_client(payload: ClientCreate, user: dict = Depends(get_current_user)):
    client, created = upsert_client_from_payload(payload, user)
    if client is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unable to create client")
    return {**map_client(client), "created": created}


@router.post("/bulk")
def bulk_create_clients(payload: list[ClientCreate], user: dict = Depends(get_current_user)):
    created_count = 0
    updated_count = 0
    clients = []
    for item in payload:
        client, created = upsert_client_from_payload(item, user)
        if created:
            created_count += 1
        else:
            updated_count += 1
        clients.append(map_client(client))
    return {
        "created": created_count,
        "updated": updated_count,
        "total": len(payload),
        "clients": clients,
    }


@router.post("/bulk/import")
async def bulk_import_clients(
    user: dict = Depends(get_current_user),
    file: UploadFile | None = File(default=None),
    text: str = Form(default=""),
):
    raw_bytes = await file.read() if file else None
    try:
        raw_rows = parse_bulk_client_source(
            filename=file.filename if file else "",
            content_type=file.content_type if file else "",
            raw_bytes=raw_bytes,
            text=text,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not raw_rows:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No client rows were found in the upload.")

    enriched_rows, ai_used, ai_error = enrich_import_rows_with_gemini(raw_rows)

    created_count = 0
    updated_count = 0
    skipped_count = 0
    clients = []

    valid_fields = set(ClientCreate.model_fields.keys())
    for row in enriched_rows:
        if not (row.get("primaryHolderName") or "").strip():
            skipped_count += 1
            continue

        payload_data = {key: value for key, value in row.items() if key in valid_fields}
        payload = ClientCreate.model_validate(payload_data)
        client, created = upsert_client_from_payload(payload, user)
        clients.append(map_client(client))
        if created:
            created_count += 1
        else:
            updated_count += 1

    settings = get_settings()
    return {
        "created": created_count,
        "updated": updated_count,
        "skipped": skipped_count,
        "total": len(enriched_rows),
        "aiUsed": ai_used,
        "aiError": ai_error if settings.gemini_api_key else "",
        "clients": clients,
    }


@router.get("/{client_id}")
def get_client(client_id: str, user: dict = Depends(get_current_user)):
    client = get_clients_collection().find_one({"_id": object_id(client_id)})
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    # All staff can access any client
    return map_client(client)


@router.patch("/{client_id}")
def update_client(client_id: str, payload: ClientUpdate, user: dict = Depends(get_current_user)):
    client = get_clients_collection().find_one({"_id": object_id(client_id)})
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    # All staff can update any client

    patch = {}
    for key, value in payload.model_dump(exclude_none=True).items():
        if isinstance(value, str):
            patch[key] = value.strip()
        else:
            patch[key] = value
    if "nextReviewDate" in patch:
        patch["nextReviewDate"] = date_to_utc_datetime(patch["nextReviewDate"])
    if "primaryHolderName" in patch:
        patch["searchName"] = " ".join(patch["primaryHolderName"].lower().split())
    if not patch:
        return map_client(client)

    patch["updatedAt"] = utc_now()
    get_clients_collection().update_one({"_id": client["_id"]}, {"$set": patch})
    if "primaryHolderName" in patch:
        get_logs_collection().update_many({"clientId": client["_id"]}, {"$set": {"clientName": patch["primaryHolderName"], "updatedAt": utc_now()}})
        get_tasks_collection().update_many({"clientId": client["_id"]}, {"$set": {"clientName": patch["primaryHolderName"], "updatedAt": utc_now()}})
    updated = get_clients_collection().find_one({"_id": client["_id"]})
    refresh_client_summary(client["_id"])
    return map_client(updated)


@router.get("/{client_id}/activity")
def get_client_activity(client_id: str, user: dict = Depends(get_current_user)):
    client = get_clients_collection().find_one({"_id": object_id(client_id)})
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    # All staff can access any client's activity

    logs = list(get_logs_collection().find({"clientId": client["_id"]}).sort("createdAt", -1).limit(50))
    tasks = list(get_tasks_collection().find({"clientId": client["_id"]}).sort("createdAt", -1).limit(50))

    return {
        "client": map_client(client),
        "logs": [map_log(item) for item in logs],
        "tasks": [map_task(item) for item in tasks],
    }