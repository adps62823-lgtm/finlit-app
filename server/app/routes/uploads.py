from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user
from app.cloudinary_service import build_upload_signature
from app.config import get_settings
from app.schemas import UploadSignRequest

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


@router.post("/sign")
def sign_upload(payload: UploadSignRequest, _user: dict = Depends(get_current_user)):
    settings = get_settings()
    if not settings.cloudinary_cloud_name or not settings.cloudinary_api_key or not settings.cloudinary_api_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cloudinary is not configured on the server",
        )

    folder = (payload.folder or settings.cloudinary_upload_folder).strip("/")
    return build_upload_signature(folder, payload.resourceType)
