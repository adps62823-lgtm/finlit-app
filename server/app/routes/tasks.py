from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import get_current_user
from app.client_workflow import date_to_utc_datetime, refresh_client_summary
from app.database import get_clients_collection, get_tasks_collection, get_users_collection
from app.schemas import FollowUpTaskCreate, FollowUpTaskUpdate
from app.utils import map_task, object_id, utc_now

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("")
def list_tasks(
    client_id: str = Query(default="", alias="clientId"),
    status_filter: str = Query(default="", alias="status"),
    scope: str = Query(default="mine"),
    limit: int = Query(default=100, ge=1, le=300),
    user: dict = Depends(get_current_user),
):
    query = {} if user["role"] == "owner" else {"assignedToUserId": user["_id"]}
    if user["role"] == "owner":
        if scope == "mine":
            query["assignedToUserId"] = user["_id"]
        elif scope == "others":
            query["assignedToUserId"] = {"$ne": user["_id"]}
        elif scope == "open":
            query["status"] = "open"
        elif scope == "done":
            query["status"] = "done"
        elif scope not in {"all", "mine", "others", "open", "done"}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid scope")
    if client_id.strip():
        query["clientId"] = object_id(client_id)
    if status_filter.strip():
        query["status"] = status_filter.strip()

    tasks = get_tasks_collection().find(query).sort([("status", 1), ("dueDate", 1), ("createdAt", -1)]).limit(limit)
    return [map_task(item) for item in tasks]


@router.post("")
def create_task(payload: FollowUpTaskCreate, user: dict = Depends(get_current_user)):
    client = get_clients_collection().find_one({"_id": object_id(payload.clientId)})
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    if user["role"] != "owner" and client.get("assignedRmUserId") != user["_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to create a task for this client")

    assignee_id = user["_id"]
    assignee_name = user["name"]
    if payload.assignedToUserId:
        if user["role"] != "owner":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to assign tasks")
        assignee = get_users_collection().find_one({"_id": object_id(payload.assignedToUserId)})
        if not assignee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignee not found")
        assignee_id = assignee["_id"]
        assignee_name = assignee.get("name", "")

    now = utc_now()
    document = {
        "clientId": client["_id"],
        "clientName": client.get("primaryHolderName", ""),
        "title": payload.title.strip(),
        "details": payload.details.strip(),
        "dueDate": date_to_utc_datetime(payload.dueDate),
        "taskType": payload.taskType.strip() or "follow_up",
        "priority": payload.priority,
        "status": "open",
        "sourceType": "manual",
        "sourceLogId": None,
        "createdByUserId": user["_id"],
        "assignedToUserId": assignee_id if payload.assignedToUserId else client.get("assignedRmUserId") or user["_id"],
        "assignedToName": assignee_name if payload.assignedToUserId else client.get("assignedRmName") or user["name"],
        "createdAt": now,
        "updatedAt": now,
        "completedAt": None,
    }
    result = get_tasks_collection().insert_one(document)
    created = get_tasks_collection().find_one({"_id": result.inserted_id})
    refresh_client_summary(client["_id"])
    return map_task(created)


@router.patch("/{task_id}")
def update_task(task_id: str, payload: FollowUpTaskUpdate, user: dict = Depends(get_current_user)):
    task = get_tasks_collection().find_one({"_id": object_id(task_id)})
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if user["role"] != "owner" and task.get("assignedToUserId") != user["_id"]:
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
        if user["role"] != "owner":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to reassign tasks")
        assignee = get_users_collection().find_one({"_id": object_id(patch["assignedToUserId"])})
        if not assignee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignee not found")
        patch["assignedToName"] = assignee.get("name", "")
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
    if user["role"] != "owner" and task.get("assignedToUserId") != user["_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to delete this task")

    get_tasks_collection().delete_one({"_id": task["_id"]})
    refresh_client_summary(task["clientId"])
    return {"message": "Deleted"}
