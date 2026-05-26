import socketio

from app.auth import sync_user_from_token
from app.database import get_chat_collection
from app.schemas import ChatMessagePayload
from app.utils import map_chat_message, utc_now

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=[],
)


@sio.event
async def connect(sid, environ, auth):
    token = (auth or {}).get("token")
    if not token:
        raise ConnectionRefusedError("Unauthorized")

    try:
        user = sync_user_from_token(token)
    except Exception as exc:  # noqa: BLE001
        raise ConnectionRefusedError("Unauthorized") from exc

    await sio.save_session(sid, {"user": user})


@sio.on("chat:send")
async def chat_send(sid, payload):
    session = await sio.get_session(sid)
    user = session.get("user")
    if not user:
        return {"ok": False, "message": "Unauthorized"}

    parsed = ChatMessagePayload.model_validate(payload or {})
    text = parsed.text.strip()
    attachment_url = parsed.attachmentUrl.strip()

    if not text and not attachment_url:
        return {"ok": False, "message": "Message text or attachment required"}

    now = utc_now()
    document = {
        "senderId": user["_id"],
        "senderName": user["name"],
        "text": text,
        "attachmentUrl": attachment_url,
        "attachmentType": parsed.attachmentType.strip(),
        "attachmentName": parsed.attachmentName.strip(),
        "createdAt": now,
        "updatedAt": now,
    }
    result = get_chat_collection().insert_one(document)
    created = get_chat_collection().find_one({"_id": result.inserted_id})
    out = map_chat_message(created)
    await sio.emit("chat:new", out)
    return {"ok": True, "message": out}
