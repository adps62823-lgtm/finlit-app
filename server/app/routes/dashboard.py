from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.database import get_aum_snapshots_collection, get_clients_collection, get_transactions_collection
from app.utils import map_aum_snapshot

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/aum")
def get_aum_dashboard(_user: dict = Depends(get_current_user)):
    business = get_aum_snapshots_collection().find_one({"scopeType": "business"}, sort=[("asOfDate", -1)])
    rms = list(
        get_aum_snapshots_collection()
        .find({"scopeType": "rm"})
        .sort("totalAum", -1)
        .limit(10)
    )

    return {
        "business": map_aum_snapshot(business) if business else None,
        "topRelationshipManagers": [map_aum_snapshot(item) for item in rms],
        "totals": {
            "clientCount": get_clients_collection().count_documents({}),
            "transactionCount": get_transactions_collection().count_documents({}),
        },
    }
