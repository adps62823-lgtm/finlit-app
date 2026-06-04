from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from socketio import ASGIApp

from app.cloudinary_service import configure_cloudinary
from app.config import get_settings
from app.database import ensure_indexes, get_client
from app.routes.auth import router as auth_router
from app.routes.chat import router as chat_router
from app.routes.clients import router as clients_router
from app.routes.dashboard import router as dashboard_router
from app.routes.aum import router as aum_router
from app.routes.logs import router as logs_router
from app.routes.users import router as users_router
from app.routes.tasks import router as tasks_router
from app.routes.transactions import router as transactions_router
from app.routes.uploads import router as uploads_router
from app.socket_app import sio

settings = get_settings()
api = FastAPI(title=settings.app_name)

api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sio.eio.cors_allowed_origins = ["*"]

api.include_router(auth_router)
api.include_router(clients_router)
api.include_router(dashboard_router)
api.include_router(aum_router)
api.include_router(logs_router)
api.include_router(users_router)
api.include_router(tasks_router)
api.include_router(chat_router)
api.include_router(transactions_router)
api.include_router(uploads_router)


@api.on_event("startup")
def startup_event():
    get_client().admin.command("ping")
    ensure_indexes()
    configure_cloudinary()


@api.get("/health")
def health():
    return {"ok": True}


app = ASGIApp(sio, other_asgi_app=api)
