from fastapi import APIRouter, Depends, Query

from app.auth import get_current_user
from app.notifications_service import list_notifications_for_user, mark_notifications_read, unread_notification_count
from app.utils import map_notification
from app.schemas import NotificationMarkRead

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def list_notifications(
    limit: int = Query(default=100, ge=1, le=300),
    user: dict = Depends(get_current_user),
):
    notifications = list_notifications_for_user(user, limit=limit)
    return [map_notification(item) for item in notifications]


@router.get("/unread-count")
def get_unread_count(user: dict = Depends(get_current_user)):
    return {"count": unread_notification_count(user)}


@router.patch("/read")
def mark_read(payload: NotificationMarkRead, user: dict = Depends(get_current_user)):
    modified = mark_notifications_read(user["_id"], ids=payload.ids, mark_all=payload.markAll)
    return {"updated": modified}

