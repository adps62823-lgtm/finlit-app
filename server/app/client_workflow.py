from datetime import date, datetime, time, timezone
from typing import Optional

from app.database import get_clients_collection, get_logs_collection, get_tasks_collection
from app.utils import object_id, utc_now


def normalize_client_name(name: str) -> str:
    return " ".join((name or "").strip().lower().split())


def date_to_utc_datetime(value: Optional[date]) -> Optional[datetime]:
    if value is None:
        return None
    return datetime.combine(value, time.min, tzinfo=timezone.utc)


def upsert_client_from_meeting(client_name: str, location: str, notes: str, user: dict) -> dict:
    now = utc_now()
    normalized_name = normalize_client_name(client_name)
    clients = get_clients_collection()
    existing = clients.find_one({"searchName": normalized_name})

    if existing:
        clients.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "primaryHolderName": client_name.strip(),
                    "city": location.strip(),
                    "lastMeetingLocation": location.strip(),
                    "latestNotes": notes.strip(),
                    "updatedAt": now,
                }
            },
        )
        return clients.find_one({"_id": existing["_id"]})

    client_code = f"MEET-{now.strftime('%Y%m%d%H%M%S%f')}"
    document = {
        "clientCode": client_code,
        "primaryHolderName": client_name.strip(),
        "searchName": normalized_name,
        "city": location.strip(),
        "relationshipStatus": "active",
        "notes": "",
        "nextAction": "",
        "familyName": "",
        "email": "",
        "mobile": "",
        "source": "meeting_log",
        "assignedRmUserId": user["_id"],
        "assignedRmName": user["name"],
        "ownerUserId": None,
        "lastMeetingLocation": location.strip(),
        "latestNotes": notes.strip(),
        "createdAt": now,
        "updatedAt": now,
    }
    result = clients.insert_one(document)
    return clients.find_one({"_id": result.inserted_id})


def ensure_client_link_for_log(log: dict, fallback_user: Optional[dict] = None) -> Optional[dict]:
    client_id = log.get("clientId")
    clients = get_clients_collection()

    if client_id is not None:
        client = clients.find_one({"_id": client_id})
        if client:
            return client

    if fallback_user is None:
        return None

    client = upsert_client_from_meeting(log["clientName"], log["location"], log["notes"], fallback_user)
    get_logs_collection().update_one(
        {"_id": log["_id"]},
        {
            "$set": {
                "clientId": client["_id"],
                "updatedAt": utc_now(),
            }
        },
    )
    return client


def _ensure_aware_utc(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    return value


def refresh_client_summary(client_id) -> None:
    client_oid = object_id(client_id) if isinstance(client_id, str) else client_id
    logs = list(get_logs_collection().find({"clientId": client_oid}).sort("createdAt", -1))
    tasks = list(get_tasks_collection().find({"clientId": client_oid, "status": "open"}).sort("dueDate", 1))
    now = utc_now()

    latest_log = logs[0] if logs else None
    overdue_count = 0
    for task in tasks:
        due_date = _ensure_aware_utc(task.get("dueDate"))
        if due_date and due_date < now:
            overdue_count += 1

    next_follow_up = next((_ensure_aware_utc(task.get("dueDate")) for task in tasks if task.get("dueDate")), None)
    patch = {
        "meetingCount": len(logs),
        "openTaskCount": len(tasks),
        "overdueTaskCount": overdue_count,
        "nextFollowUpDate": next_follow_up,
        "updatedAt": now,
        "lastMeetingAt": latest_log["createdAt"] if latest_log else None,
        "lastMeetingLocation": latest_log.get("location", "") if latest_log else "",
        "latestNotes": latest_log.get("notes", "") if latest_log else "",
        "lastActivityAt": latest_log["updatedAt"] if latest_log else None,
    }

    get_clients_collection().update_one({"_id": client_oid}, {"$set": patch})
