from fastapi import HTTPException, Request, status

from app.config import get_settings
from app.database import get_users_collection
from app.firebase_auth import verify_id_token
from app.utils import map_user, utc_now


def _extract_bearer_token(request: Request) -> str:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing auth token")
    return auth_header[7:]


def sync_user_from_token(id_token: str) -> dict:
    settings = get_settings()
    decoded = verify_id_token(id_token)
    email = (decoded.get("email") or "").strip().lower()
    name = decoded.get("name") or email.split("@")[0] or "Unknown"
    role = "owner" if email == settings.owner_email else "staff"
    now = utc_now()

    users = get_users_collection()
    users.update_one(
        {"firebaseUid": decoded["uid"]},
        {
            "$set": {
                "firebaseUid": decoded["uid"],
                "email": email,
                "name": name,
                "role": role,
                "updatedAt": now,
            },
            "$setOnInsert": {"createdAt": now},
        },
        upsert=True,
    )

    user = users.find_one({"firebaseUid": decoded["uid"]})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User sync failed")
    return user


def get_current_user(request: Request) -> dict:
    token = _extract_bearer_token(request)
    return sync_user_from_token(token)


def require_owner(request: Request) -> dict:
    user = get_current_user(request)
    if user["role"] != "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner access required")
    return user


def serialize_current_user(request: Request) -> dict:
    return map_user(get_current_user(request))
