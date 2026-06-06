from app.config import get_settings


def get_bse_starmf_status() -> dict:
    settings = get_settings()
    configured = all(
        [
            settings.bse_member_code,
            settings.bse_user_id,
            settings.bse_password,
            settings.bse_api_base_url,
        ]
    )
    return {
        "enabled": settings.bse_starmf_enabled,
        "configured": configured,
        "memberCode": settings.bse_member_code,
        "apiBaseUrl": settings.bse_api_base_url,
        "phase": "manual_and_adapter_ready",
        "nextStep": "Provide BSE StAR MF credentials to activate real transaction submission.",
    }