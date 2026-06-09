from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import get_current_user
from app.client_workflow import date_to_utc_datetime, refresh_client_summary
from app.config import get_settings
from app.database import get_clients_collection, get_tasks_collection, get_users_collection
from app.notifications_service import create_notification
from app.schemas import FollowUpTaskCreate, FollowUpTaskUpdate, TaskRequestDecision
from app.utils import map_task, object_id, utc_now

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _owner_user() -> dict | None:
    settings = get_settings()
    users = get_users_collection()
    owner = users.find_one({"role": "owner", "active": {"$ne": False}})
    if owner:
        return owner
    if settings.owner_email:
        return users.find_one({"email": settings.owner_email})
    return None


def _task_involved_query(user: dict) -> dict:
    if user["role"] == "owner":
        return {}
    return {
        "$or": [
            {"assignedToUserId": user["_id"]},
            {"requestedByUserId": user["_id"]},
            {"requestedForUserId": user["_id"]},
        ]
    }


def _notify_task_state(task: dict, kind: str, title: str, detail: str, *, recipient_ids: list[dict | None], dedupe_suffix: str = "") -> None:
    for recipient in recipient_ids:
        if not recipient:
            continue
        create_notification(
            recipient["_id"],
            kind,
            title,
            detail,
            entity_type="task",
            entity_id=task["_id"],
            action_path="/app/tasks",
            created_by_user_id=task.get("createdByUserId"),
            created_by_name=task.get("createdByName", ""),
            severity="info",
            dedupe_key=f"task:{task['_id']}:{kind}:{recipient['_id']}:{dedupe_suffix}",
            meta={
                "taskId": str(task["_id"]),
                "clientId": str(task["clientId"]),
                "requestedForUserId": str(task.get("requestedForUserId") or ""),
                "requestedByUserId": str(task.get("requestedByUserId") or ""),
            },
        )


def _recipient_user_id(user: dict | None):
    return user["_id"] if user else None


def _finalize_open_task(task: dict, approved_by: dict | None, *, auto: bool = False, note: str = "") -> dict:
    now = utc_now()
    patch = {
        "status": "open",
        "approvalStatus": "approved" if not auto else "auto_approved",
        "approvedAt": now,
        "approvedByUserId": approved_by["_id"] if approved_by else None,
        "approvedByName": approved_by.get("name", "System") if approved_by else "System",
        "rejectionRequestedAt": None,
        "rejectionRequestedByUserId": None,
        "rejectionRequestedByName": "",
        "rejectionDecisionDueAt": None,
        "updatedAt": now,
    }
    get_tasks_collection().update_one({"_id": task["_id"]}, {"$set": patch})
    updated = get_tasks_collection().find_one({"_id": task["_id"]})
    refresh_client_summary(task["clientId"])

    recipients = []
    owner = _owner_user()
    requester = None
    requested_for = None
    if task.get("requestedByUserId"):
        requester = get_users_collection().find_one({"_id": task["requestedByUserId"]})
    if task.get("requestedForUserId"):
        requested_for = get_users_collection().find_one({"_id": task["requestedForUserId"]})
    recipients.extend([requester, requested_for])
    if owner and owner["_id"] not in {_recipient_user_id(requester), _recipient_user_id(requested_for)}:
        recipients.append(owner)

    message = note or (
        "The request was auto-accepted and is now an active task." if auto else "The request was accepted and is now an active task."
    )
    _notify_task_state(updated, "task_approved", "Task approved", message, recipient_ids=recipients, dedupe_suffix="approved")
    return updated


def _finalize_rejection(task: dict, actor: dict | None, *, reason: str = "The request was rejected.") -> None:
    requester = get_users_collection().find_one({"_id": task.get("requestedByUserId")}) if task.get("requestedByUserId") else None
    target = get_users_collection().find_one({"_id": task.get("requestedForUserId")}) if task.get("requestedForUserId") else None
    recipients = [requester, target]
    _notify_task_state(task, "task_rejected", "Task rejected", reason, recipient_ids=recipients, dedupe_suffix="rejected")
    get_tasks_collection().delete_one({"_id": task["_id"]})
    refresh_client_summary(task["clientId"])


def _auto_process_pending_requests() -> None:
    now = utc_now()
    collection = get_tasks_collection()

    pending_requests = list(
        collection.find(
            {
                "status": "request_pending",
                "requestExpiresAt": {"$ne": None, "$lte": now},
            }
        )
    )
    for task in pending_requests:
        _finalize_open_task(task, None, auto=True)

    rejection_requests = list(
        collection.find(
            {
                "approvalStatus": "rejection_requested",
                "rejectionDecisionDueAt": {"$ne": None, "$lte": now},
            }
        )
    )
    for task in rejection_requests:
        _finalize_open_task(task, None, auto=True, note="The rejection window expired, so the task is now active again.")


@router.get("")
def list_tasks(
    client_id: str = Query(default="", alias="clientId"),
    status_filter: str = Query(default="", alias="status"),
    scope: str = Query(default="all"),
    limit: int = Query(default=200, ge=1, le=300),
    user: dict = Depends(get_current_user),
):
    _auto_process_pending_requests()

    filters = [_task_involved_query(user)] if user["role"] != "owner" else []
    if client_id.strip():
        filters.append({"clientId": object_id(client_id)})
    if status_filter.strip():
        filters.append({"status": status_filter.strip()})

    if scope == "mine":
        filters.append({"assignedToUserId": user["_id"], "status": {"$in": ["open", "done"]}})
    elif scope == "team":
        if user["role"] == "owner":
            filters.append({"assignedToUserId": {"$ne": user["_id"]}})
        else:
            filters.append({"assignedToUserId": {"$ne": user["_id"]}})
    elif scope == "requests":
        filters.append({"$or": [{"status": "request_pending"}, {"approvalStatus": "rejection_requested"}]})
    elif scope == "outbox":
        filters.append({"requestedByUserId": user["_id"]})
    elif scope == "inbox":
        filters.append({"requestedForUserId": user["_id"]})
    elif scope not in {"all", "mine", "team", "requests", "outbox", "inbox"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid task scope")

    query = {"$and": [item for item in filters if item]} if filters else {}
    tasks = get_tasks_collection().find(query).sort([("createdAt", -1)]).limit(limit)
    return [map_task(item) for item in tasks]


@router.post("")
def create_task(payload: FollowUpTaskCreate, user: dict = Depends(get_current_user)):
    client = get_clients_collection().find_one({"_id": object_id(payload.clientId)})
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    if user["role"] != "owner" and client.get("assignedRmUserId") != user["_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to create a task for this client")

    now = utc_now()
    target_user = None
    target_user_id = user["_id"]
    if payload.assignedToUserId:
        target_user = get_users_collection().find_one({"_id": object_id(payload.assignedToUserId)})
        if not target_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignee not found")
        target_user_id = target_user["_id"]
    else:
        target_user = user
    owner = _owner_user()
    requester_is_owner = user["role"] == "owner"
    request_mode = not requester_is_owner and target_user_id != user["_id"]

    document = {
        "clientId": client["_id"],
        "clientName": client.get("primaryHolderName", ""),
        "title": payload.title.strip(),
        "details": payload.details.strip(),
        "dueDate": date_to_utc_datetime(payload.dueDate),
        "taskType": (payload.taskType or "follow_up").strip() or "follow_up",
        "priority": payload.priority,
        "sourceType": "manual",
        "sourceLogId": None,
        "createdByUserId": user["_id"],
        "createdByName": user["name"],
        "createdAt": now,
        "updatedAt": now,
        "completedAt": None,
        "assignedToUserId": target_user_id,
        "assignedToName": target_user.get("name", user["name"]),
        "requestedByUserId": None,
        "requestedByName": "",
        "requestedForUserId": None,
        "requestedForName": "",
        "requestExpiresAt": None,
        "approvalStatus": "approved",
        "approvedAt": now,
        "approvedByUserId": user["_id"] if requester_is_owner else None,
        "approvedByName": user["name"] if requester_is_owner else "",
        "rejectionRequestedAt": None,
        "rejectionRequestedByUserId": None,
        "rejectionRequestedByName": "",
        "rejectionDecisionDueAt": None,
        "status": "open",
        "workflowType": "direct",
    }

    if request_mode:
        document.update(
            {
                "status": "request_pending",
                "approvalStatus": "pending",
                "approvedAt": None,
                "approvedByUserId": None,
                "approvedByName": "",
                "workflowType": "request",
                "requestedByUserId": user["_id"],
                "requestedByName": user["name"],
                "requestedForUserId": target_user_id,
                "requestedForName": target_user.get("name", ""),
                "requestExpiresAt": now + timedelta(hours=24),
            }
        )

    result = get_tasks_collection().insert_one(document)
    created = get_tasks_collection().find_one({"_id": result.inserted_id})
    refresh_client_summary(client["_id"])

    if request_mode:
        recipients = [target_user]
        if owner and owner["_id"] != target_user_id:
            recipients.append(owner)
        _notify_task_state(
            created,
            "task_request",
            "Task request",
            f"{user['name']} requested '{payload.title.strip()}' for {target_user.get('name', 'team member')}",
            recipient_ids=recipients,
            dedupe_suffix="created",
        )
    elif target_user and target_user["_id"] != user["_id"]:
        _notify_task_state(
            created,
            "task_assigned",
            "Task assigned",
            f"{payload.title.strip()} was assigned by {user['name']}",
            recipient_ids=[target_user],
            dedupe_suffix="assigned",
        )

    return map_task(created)


@router.post("/{task_id}/accept-request")
def accept_task_request(task_id: str, payload: TaskRequestDecision | None = None, user: dict = Depends(get_current_user)):
    _auto_process_pending_requests()
    task = get_tasks_collection().find_one({"_id": object_id(task_id)})
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if task.get("status") != "request_pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task request is not pending")

    is_owner = user["role"] == "owner"
    is_target = task.get("requestedForUserId") == user["_id"]
    if not is_owner and not is_target:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to accept this request")

    updated = _finalize_open_task(task, user, note=(payload.notes if payload and payload.notes else "The request was accepted."))
    return map_task(updated)


@router.post("/{task_id}/reject-request")
def reject_task_request(task_id: str, payload: TaskRequestDecision | None = None, user: dict = Depends(get_current_user)):
    _auto_process_pending_requests()
    task = get_tasks_collection().find_one({"_id": object_id(task_id)})
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if task.get("status") != "request_pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task request is not pending")
    if user["role"] != "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner can reject a task request")

    reason = payload.notes if payload and payload.notes else "The owner rejected the task request."
    _finalize_rejection(task, user, reason=reason)
    return {"message": "Rejected"}


@router.post("/{task_id}/request-rejection")
def request_task_rejection(task_id: str, payload: TaskRequestDecision | None = None, user: dict = Depends(get_current_user)):
    _auto_process_pending_requests()
    task = get_tasks_collection().find_one({"_id": object_id(task_id)})
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if task.get("status") != "request_pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only pending requests can be rejected")
    if task.get("requestedForUserId") != user["_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to request rejection for this task")
    if not task.get("requestExpiresAt") or task["requestExpiresAt"] < utc_now():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The 24 hour request window has expired")

    now = utc_now()
    patch = {
        "approvalStatus": "rejection_requested",
        "rejectionRequestedAt": now,
        "rejectionRequestedByUserId": user["_id"],
        "rejectionRequestedByName": user["name"],
        "rejectionDecisionDueAt": now + timedelta(hours=24),
        "updatedAt": now,
    }
    get_tasks_collection().update_one({"_id": task["_id"]}, {"$set": patch})
    updated = get_tasks_collection().find_one({"_id": task["_id"]})
    owner = _owner_user()
    _notify_task_state(
        updated,
        "task_rejection_requested",
        "Task rejection requested",
        payload.notes or f"{user['name']} requested rejection for {task['title']}",
        recipient_ids=[owner],
        dedupe_suffix="rejection-requested",
    )
    return map_task(updated)


@router.post("/{task_id}/accept-rejection")
def accept_task_rejection(task_id: str, payload: TaskRequestDecision | None = None, user: dict = Depends(get_current_user)):
    _auto_process_pending_requests()
    task = get_tasks_collection().find_one({"_id": object_id(task_id)})
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if user["role"] != "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner can approve rejection requests")
    if task.get("approvalStatus") != "rejection_requested":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No rejection request is pending")

    reason = payload.notes if payload and payload.notes else "The owner approved the rejection request."
    _finalize_rejection(task, user, reason=reason)
    return {"message": "Rejected"}


@router.post("/{task_id}/reject-rejection")
def reject_task_rejection(task_id: str, payload: TaskRequestDecision | None = None, user: dict = Depends(get_current_user)):
    _auto_process_pending_requests()
    task = get_tasks_collection().find_one({"_id": object_id(task_id)})
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if user["role"] != "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner can reject the rejection request")
    if task.get("approvalStatus") != "rejection_requested":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No rejection request is pending")

    now = utc_now()
    patch = {
        "status": "open",
        "approvalStatus": "approved",
        "approvedAt": now,
        "approvedByUserId": user["_id"],
        "approvedByName": user["name"],
        "rejectionRequestedAt": None,
        "rejectionRequestedByUserId": None,
        "rejectionRequestedByName": "",
        "rejectionDecisionDueAt": None,
        "updatedAt": now,
    }
    get_tasks_collection().update_one({"_id": task["_id"]}, {"$set": patch})
    updated = get_tasks_collection().find_one({"_id": task["_id"]})
    refresh_client_summary(task["clientId"])
    requester = get_users_collection().find_one({"_id": task.get("requestedByUserId")}) if task.get("requestedByUserId") else None
    target = get_users_collection().find_one({"_id": task.get("requestedForUserId")}) if task.get("requestedForUserId") else None
    _notify_task_state(
        updated,
        "task_rejection_rejected",
        "Task kept active",
        payload.notes or "The rejection request was rejected, so the task remains active.",
        recipient_ids=[requester, target],
        dedupe_suffix="rejection-rejected",
    )
    return map_task(updated)


@router.patch("/{task_id}")
def update_task(task_id: str, payload: FollowUpTaskUpdate, user: dict = Depends(get_current_user)):
    _auto_process_pending_requests()
    task = get_tasks_collection().find_one({"_id": object_id(task_id)})
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    is_owner = user["role"] == "owner"
    can_edit = is_owner or task.get("assignedToUserId") == user["_id"] or task.get("requestedByUserId") == user["_id"]
    if not can_edit:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to update this task")

    patch = {}
    for key, value in payload.model_dump(exclude_none=True).items():
        if isinstance(value, str):
            patch[key] = value.strip()
        else:
            patch[key] = value
    if "dueDate" in patch:
        patch["dueDate"] = date_to_utc_datetime(patch["dueDate"])
    if "assignedToUserId" in patch:
        assignee = get_users_collection().find_one({"_id": object_id(patch["assignedToUserId"])})
        if not assignee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignee not found")
        patch["assignedToName"] = assignee.get("name", "")
        if user["role"] != "owner":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff cannot reassign tasks directly")
    if patch.get("status") == "done":
        patch["completedAt"] = utc_now()
    elif "status" in patch and patch["status"] == "open":
        patch["completedAt"] = None
    if not patch:
        return map_task(task)

    patch["updatedAt"] = utc_now()
    get_tasks_collection().update_one({"_id": task["_id"]}, {"$set": patch})
    updated = get_tasks_collection().find_one({"_id": task["_id"]})
    refresh_client_summary(task["clientId"])
    return map_task(updated)


@router.delete("/{task_id}")
def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    task = get_tasks_collection().find_one({"_id": object_id(task_id)})
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    is_owner = user["role"] == "owner"
    is_creator = task.get("createdByUserId") == user["_id"]
    is_requester = task.get("requestedByUserId") == user["_id"]
    is_assignee = task.get("assignedToUserId") == user["_id"]
    if not (is_owner or is_creator or is_requester or is_assignee):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to delete this task")

    get_tasks_collection().delete_one({"_id": task["_id"]})
    refresh_client_summary(task["clientId"])
    return {"message": "Deleted"}
