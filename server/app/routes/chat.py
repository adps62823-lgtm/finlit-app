from fastapi import APIRouter, Depends, Query

from app.auth import get_current_user
from app.database import get_chat_collection
from app.utils import map_chat_message

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.get("/history")
def chat_history(
    limit: int = Query(default=50, ge=1, le=100),
    _user: dict = Depends(get_current_user),
):
    cursor = get_chat_collection().find().sort("createdAt", -1).limit(limit)
    messages = list(cursor)
    messages.reverse()
    return [map_chat_message(message) for message in messages]
