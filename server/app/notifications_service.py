from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Iterable, Optional

from app.database import get_notifications_collection
from app.utils import object_id, utc_now


def create_notification(
    recipient_user_id,
    kind: str,
    title: str,
    detail: str = "",
    *,
    entity_type: str = "",
    entity_id=None,
    action_path: str = "",
    created_by_user_id=None,
    created_by_name: str = "",
    audience: str = "user",
    severity: str = "info",
    dedupe_key: str = "",
    meta: Optional[dict] = None,
    expires_in_hours: Optional[int] = None,
) -> dict:
    collection = get_notifications_collection()
    now = utc_now()
    recipient_oid = object_id(recipient_user_id) if recipient_user_id else None
    created_by_oid = object_id(created_by_user_id) if created_by_user_id else None
    entity_oid = object_id(entity_id) if entity_id else None

    if dedupe_key and recipient_oid:
        existing = collection.find_one({"recipientUserId": recipient_oid, "dedupeKey": dedupe_key})
        if existing:
            patch = {
                "title": title,
                "detail": detail,
                "actionPath": action_path,
                "entityType": entity_type,
                "entityId": entity_oid,
                "createdByUserId": created_by_oid,
                "createdByName": created_by_name,
                "audience": audience,
                "severity": severity,
                "meta": meta or {},
                "updatedAt": now,
            }
            if expires_in_hours is not None:
                patch["expiresAt"] = now + timedelta(hours=expires_in_hours)
            collection.update_one({"_id": existing["_id"]}, {"$set": patch})
            return collection.find_one({"_id": existing["_id"]})

    document = {
        "recipientUserId": recipient_oid,
        "kind": kind,
        "title": title.strip(),
        "detail": detail.strip(),
        "entityType": entity_type,
        "entityId": entity_oid,
        "actionPath": action_path,
        "audience": audience,
        "severity": severity,
        "createdByUserId": created_by_oid,
        "createdByName": created_by_name,
        "dedupeKey": dedupe_key,
        "meta": meta or {},
        "readAt": None,
        "createdAt": now,
        "updatedAt": now,
    }
    if expires_in_hours is not None:
        document["expiresAt"] = now + timedelta(hours=expires_in_hours)
    result = collection.insert_one(document)
    return collection.find_one({"_id": result.inserted_id})


def mark_notifications_read(recipient_user_id, ids: Iterable[str] | None = None, mark_all: bool = False) -> int:
    collection = get_notifications_collection()
    query = {"recipientUserId": object_id(recipient_user_id), "readAt": None}
    if not mark_all and ids:
        query["_id"] = {"$in": [object_id(value) for value in ids]}
    elif not mark_all:
        return 0
    now = utc_now()
    result = collection.update_many(query, {"$set": {"readAt": now, "updatedAt": now}})
    return result.modified_count


def unread_notification_count(user) -> int:
    collection = get_notifications_collection()
    return collection.count_documents({"recipientUserId": object_id(user["_id"]), "readAt": None})


def list_notifications_for_user(user, limit: int = 100) -> list[dict]:
    collection = get_notifications_collection()
    query = {} if user["role"] == "owner" else {"recipientUserId": object_id(user["_id"])}
    cursor = collection.find(query).sort([("readAt", 1), ("createdAt", -1)]).limit(limit)
    return list(cursor)
