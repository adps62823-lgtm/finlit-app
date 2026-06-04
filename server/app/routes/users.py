from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.database import get_users_collection

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/team")
def list_team_members(_user: dict = Depends(get_current_user)):
    users = get_users_collection().find({"active": {"$ne": False}}).sort([("role", 1), ("name", 1)])
    return [
        {
            "_id": str(user["_id"]),
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "role": user.get("role", "staff"),
        }
        for user in users
    ]
