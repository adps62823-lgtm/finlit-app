from functools import lru_cache

import firebase_admin
from firebase_admin import auth, credentials

from app.config import get_settings


@lru_cache
def get_firebase_app():
    settings = get_settings()
    if firebase_admin._apps:
        return firebase_admin.get_app()

    cred = credentials.Certificate(
        {
            "type": "service_account",
            "project_id": settings.firebase_project_id,
            "private_key": settings.firebase_private_key,
            "client_email": settings.firebase_client_email,
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    )
    return firebase_admin.initialize_app(cred)


def verify_id_token(id_token: str) -> dict:
    get_firebase_app()
    return auth.verify_id_token(id_token)
