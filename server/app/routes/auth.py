from fastapi import APIRouter, Depends, Request

from app.auth import get_current_user
from app.utils import map_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/me")
def get_me(user: dict = Depends(get_current_user)):
    return {"user": map_user(user)}


@router.get("/client-config")
def get_client_config(_request: Request):
    from app.config import get_settings

    settings = get_settings()
    return {
        "cloudinaryCloudName": settings.cloudinary_cloud_name,
        "uploadFolder": settings.cloudinary_upload_folder,
    }
