from functools import lru_cache
from os import getenv

from dotenv import load_dotenv

load_dotenv()


class Settings:
    app_name = "Finlit Python Backend"
    app_env = getenv("APP_ENV", "development")
    port = int(getenv("PORT", "8000"))
    client_origin = getenv("CLIENT_ORIGIN", "http://127.0.0.1:5173")
    mongo_uri = getenv("MONGODB_URI", "")
    mongo_db_name = getenv("MONGODB_DB_NAME", "finlit_app")
    owner_email = getenv("OWNER_EMAIL", "").strip().lower()
    firebase_project_id = getenv("FIREBASE_PROJECT_ID", "")
    firebase_client_email = getenv("FIREBASE_CLIENT_EMAIL", "")
    firebase_private_key = getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n")
    cloudinary_cloud_name = getenv("CLOUDINARY_CLOUD_NAME", "")
    cloudinary_api_key = getenv("CLOUDINARY_API_KEY", "")
    cloudinary_api_secret = getenv("CLOUDINARY_API_SECRET", "")
    cloudinary_upload_folder = getenv("CLOUDINARY_UPLOAD_FOLDER", "finlit")
    bse_starmf_enabled = getenv("BSE_STARMF_ENABLED", "false").lower() == "true"
    bse_member_code = getenv("BSE_MEMBER_CODE", "")
    bse_user_id = getenv("BSE_USER_ID", "")
    bse_password = getenv("BSE_PASSWORD", "")
    bse_api_base_url = getenv("BSE_API_BASE_URL", "")

    @property
    def client_origins(self) -> list[str]:
        configured = [origin.strip() for origin in self.client_origin.split(",") if origin.strip()]
        defaults = [
            "http://127.0.0.1:5173",
            "http://localhost:5173",
        ]
        return list(dict.fromkeys(configured + defaults))


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    missing = []
    if not settings.mongo_uri:
        missing.append("MONGODB_URI")
    if not settings.owner_email:
        missing.append("OWNER_EMAIL")
    if not settings.firebase_project_id:
        missing.append("FIREBASE_PROJECT_ID")
    if not settings.firebase_client_email:
        missing.append("FIREBASE_CLIENT_EMAIL")
    if not settings.firebase_private_key:
        missing.append("FIREBASE_PRIVATE_KEY")
    if missing:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")
    return settings
