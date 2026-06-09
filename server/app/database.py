from functools import lru_cache

from pymongo import MongoClient

from app.config import get_settings
from app.indexes import create_platform_indexes


@lru_cache
def get_client() -> MongoClient:
    settings = get_settings()
    return MongoClient(settings.mongo_uri)


def get_db():
    settings = get_settings()
    return get_client()[settings.mongo_db_name]


def get_users_collection():
    return get_db()["users"]


def get_clients_collection():
    return get_db()["clients"]


def get_folios_collection():
    return get_db()["folios"]


def get_holdings_current_collection():
    return get_db()["holdings_current"]


def get_holding_snapshots_collection():
    return get_db()["holding_snapshots"]


def get_sip_registrations_collection():
    return get_db()["sip_registrations"]


def get_mandates_collection():
    return get_db()["mandates"]


def get_aum_snapshots_collection():
    return get_db()["aum_snapshots"]


def get_transactions_collection():
    return get_db()["transactions"]


def get_orders_collection():
    return get_db()["orders"]


def get_rejections_collection():
    return get_db()["rejections"]


def get_import_batches_collection():
    return get_db()["import_batches"]


def get_logs_collection():
    return get_db()["meeting_logs"]


def get_chat_collection():
    return get_db()["chat_messages"]


def get_tasks_collection():
    return get_db()["follow_up_tasks"]


def get_notifications_collection():
    return get_db()["notifications"]


def ensure_indexes() -> None:
    users = get_users_collection()
    users.create_index("firebaseUid", unique=True)
    users.create_index("email", unique=True)
    create_platform_indexes(get_db())
