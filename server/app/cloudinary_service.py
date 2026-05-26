from cloudinary import config as cloudinary_config
from cloudinary.utils import api_sign_request

from app.config import get_settings


def configure_cloudinary() -> None:
    settings = get_settings()
    if not settings.cloudinary_cloud_name:
        return

    cloudinary_config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )


def build_upload_signature(folder: str, resource_type: str) -> dict:
    settings = get_settings()
    configure_cloudinary()

    timestamp = __import__("time").time()
    timestamp = int(timestamp)
    params_to_sign = {"folder": folder, "timestamp": timestamp}
    signature = api_sign_request(params_to_sign, settings.cloudinary_api_secret)

    return {
        "cloudName": settings.cloudinary_cloud_name,
        "apiKey": settings.cloudinary_api_key,
        "timestamp": timestamp,
        "signature": signature,
        "folder": folder,
        "resourceType": resource_type,
    }
