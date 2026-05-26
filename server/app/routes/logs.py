from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user
from app.client_workflow import date_to_utc_datetime, ensure_client_link_for_log, refresh_client_summary, upsert_client_from_meeting
from app.database import get_logs_collection, get_tasks_collection, get_users_collection
from app.schemas import MeetingLogCreate, MeetingLogUpdate
from app.utils import map_log, object_id, utc_now

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.post("")
def create_log(payload: MeetingLogCreate, user: dict = Depends(get_current_user)):
    now = utc_now()
    client = upsert_client_from_meeting(payload.clientName, payload.location, payload.notes, user)
    document = {
        "staffId": user["_id"],
        "staffName": user["name"],
        "clientId": client["_id"],
        "clientName": payload.clientName.strip(),
        "location": payload.location.strip(),
        "notes": payload.notes.strip(),
        "meetingType": payload.meetingType.strip() or "review",
        "priority": payload.priority,
        "outcome": payload.outcome.strip(),
        "followUpSummary": payload.followUpSummary.strip(),
        "followUpDate": date_to_utc_datetime(payload.followUpDate),
        "createdAt": now,
        "updatedAt": now,
    }
    result = get_logs_collection().insert_one(document)
    created = get_logs_collection().find_one({"_id": result.inserted_id})

    if document["followUpSummary"] or document["followUpDate"]:
        get_tasks_collection().insert_one(
            {
                "clientId": client["_id"],
                "clientName": client["primaryHolderName"],
                "title": document["followUpSummary"] or f"Follow up with {client['primaryHolderName']}",
                "details": document["notes"],
                "dueDate": document["followUpDate"],
                "priority": document["priority"],
                "status": "open",
                "sourceType": "meeting_log",
                "sourceLogId": created["_id"],
                "createdByUserId": user["_id"],
                "assignedToUserId": user["_id"],
                "assignedToName": user["name"],
                "createdAt": now,
                "updatedAt": now,
                "completedAt": None,
            }
        )

    refresh_client_summary(client["_id"])
    return map_log(created)


@router.get("")
def list_logs(user: dict = Depends(get_current_user)):
    query = {} if user["role"] == "owner" else {"staffId": user["_id"]}
    logs = list(get_logs_collection().find(query).sort("createdAt", -1))

    out = []
    for log in logs:
        if log.get("clientId") is None:
            fallback_user = get_users_collection().find_one({"_id": log["staffId"]}) or user
            client = ensure_client_link_for_log(log, fallback_user=fallback_user)
            if client:
                refresh_client_summary(client["_id"])
                log = get_logs_collection().find_one({"_id": log["_id"]})
        out.append(map_log(log))

    return out


@router.put("/{log_id}")
def update_log(log_id: str, payload: MeetingLogUpdate, user: dict = Depends(get_current_user)):
    log = get_logs_collection().find_one({"_id": object_id(log_id)})
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Log not found")

    is_owner = user["role"] == "owner"
    is_self = str(log["staffId"]) == str(user["_id"])
    if not is_owner and not is_self:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to edit this log")

    previous_client_id = log.get("clientId")
    raw_patch = payload.model_dump(exclude_none=True)
    patch = {}
    for key, value in raw_patch.items():
        if isinstance(value, str):
            patch[key] = value.strip()
        else:
            patch[key] = value
    if not patch:
        return map_log(log)

    if "followUpDate" in patch:
        patch["followUpDate"] = date_to_utc_datetime(patch["followUpDate"])

    next_client_name = patch.get("clientName", log["clientName"])
    next_location = patch.get("location", log["location"])
    next_notes = patch.get("notes", log["notes"])
    client = upsert_client_from_meeting(next_client_name, next_location, next_notes, user)
    patch["clientId"] = client["_id"]
    patch["updatedAt"] = utc_now()
    get_logs_collection().update_one({"_id": log["_id"]}, {"$set": patch})
    updated = get_logs_collection().find_one({"_id": log["_id"]})

    generated_task = get_tasks_collection().find_one({"sourceLogId": log["_id"], "sourceType": "meeting_log"})
    if updated.get("followUpSummary") or updated.get("followUpDate"):
        task_patch = {
            "clientId": client["_id"],
            "clientName": client["primaryHolderName"],
            "title": updated.get("followUpSummary") or f"Follow up with {client['primaryHolderName']}",
            "details": updated.get("notes", ""),
            "dueDate": updated.get("followUpDate"),
            "priority": updated.get("priority", "medium"),
            "updatedAt": utc_now(),
        }
        if generated_task:
            get_tasks_collection().update_one({"_id": generated_task["_id"]}, {"$set": task_patch})
        else:
            get_tasks_collection().insert_one(
                {
                    **task_patch,
                    "status": "open",
                    "sourceType": "meeting_log",
                    "sourceLogId": updated["_id"],
                    "createdByUserId": user["_id"],
                    "assignedToUserId": user["_id"],
                    "assignedToName": user["name"],
                    "createdAt": utc_now(),
                    "completedAt": None,
                }
            )
    elif generated_task and generated_task.get("status") == "open":
        get_tasks_collection().delete_one({"_id": generated_task["_id"]})

    refresh_client_summary(client["_id"])
    if previous_client_id and str(previous_client_id) != str(client["_id"]):
        refresh_client_summary(previous_client_id)
    return map_log(updated)


@router.delete("/{log_id}")
def delete_log(log_id: str, user: dict = Depends(get_current_user)):
    log = get_logs_collection().find_one({"_id": object_id(log_id)})
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Log not found")

    is_owner = user["role"] == "owner"
    is_self = str(log["staffId"]) == str(user["_id"])
    if not is_owner and not is_self:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to delete this log")

    get_logs_collection().delete_one({"_id": log["_id"]})
    get_tasks_collection().delete_many({"sourceLogId": log["_id"], "sourceType": "meeting_log"})
    if log.get("clientId") is not None:
        refresh_client_summary(log["clientId"])
    return {"message": "Deleted"}
