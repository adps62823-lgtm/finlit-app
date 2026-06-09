from datetime import date, datetime, timezone

from bson import ObjectId


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def object_id(value: str) -> ObjectId:
    if isinstance(value, ObjectId):
        return value
    return ObjectId(value)


def map_user(document: dict) -> dict:
    return {
        "_id": str(document["_id"]),
        "firebaseUid": document["firebaseUid"],
        "email": document["email"],
        "name": document["name"],
        "role": document["role"],
        "createdAt": document["createdAt"].isoformat(),
        "updatedAt": document["updatedAt"].isoformat(),
    }


def map_log(document: dict) -> dict:
    return {
        "_id": str(document["_id"]),
        "staffId": str(document["staffId"]),
        "clientId": str(document["clientId"]) if document.get("clientId") is not None else "",
        "staffName": document["staffName"],
        "clientName": document["clientName"],
        "location": document["location"],
        "notes": document["notes"],
        "meetingType": document.get("meetingType", "review"),
        "priority": document.get("priority", "medium"),
        "outcome": document.get("outcome", ""),
        "followUpSummary": document.get("followUpSummary", ""),
        "followUpDate": document["followUpDate"].isoformat() if document.get("followUpDate") else "",
        "createdAt": document["createdAt"].isoformat(),
        "updatedAt": document["updatedAt"].isoformat(),
    }


def map_chat_message(document: dict) -> dict:
    return {
        "_id": str(document["_id"]),
        "senderId": str(document["senderId"]),
        "senderName": document["senderName"],
        "text": document.get("text", ""),
        "attachmentUrl": document.get("attachmentUrl", ""),
        "attachmentType": document.get("attachmentType", ""),
        "attachmentName": document.get("attachmentName", ""),
        "createdAt": document["createdAt"].isoformat(),
        "updatedAt": document["updatedAt"].isoformat(),
    }


def map_client(document: dict) -> dict:
    document = dict(document)
    return _serialize_document(document)


def map_folio(document: dict) -> dict:
    document = dict(document)
    return _serialize_document(document)


def map_holding_current(document: dict) -> dict:
    document = dict(document)
    return _serialize_document(document)


def map_sip_registration(document: dict) -> dict:
    document = dict(document)
    return _serialize_document(document)


def map_mandate(document: dict) -> dict:
    document = dict(document)
    return _serialize_document(document)


def map_aum_snapshot(document: dict) -> dict:
    document = dict(document)
    return _serialize_document(document)


def map_transaction(document: dict) -> dict:
    document = dict(document)
    return _serialize_document(document)


def map_order(document: dict) -> dict:
    document = dict(document)
    return _serialize_document(document)


def map_task(document: dict) -> dict:
    return _serialize_document(dict(document))


def map_notification(document: dict) -> dict:
    return _serialize_document(dict(document))


def _serialize_document(document: dict) -> dict:
    return {key: _serialize_value(value) for key, value in document.items()}


def _serialize_value(value):
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: _serialize_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_serialize_value(item) for item in value]
    return value
