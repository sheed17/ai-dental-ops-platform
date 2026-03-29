from typing import Any

from fastapi import APIRouter

from app.core.config import settings
from app.services.practice_directory import PRACTICES_BY_PHONE, get_practice_by_phone


router = APIRouter(prefix="/api/v1")


@router.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok", "environment": settings.app_env}


def _extract_message_type(payload: dict[str, Any]) -> str | None:
    message = payload.get("message")
    if isinstance(message, dict):
        message_type = message.get("type")
        if isinstance(message_type, str):
            return message_type
    return None


def _extract_called_number(payload: dict[str, Any]) -> str | None:
    message = payload.get("message")
    if isinstance(message, dict):
        call = message.get("call")
        if isinstance(call, dict):
            phone_number = call.get("phoneNumber")
            if isinstance(phone_number, dict):
                number = phone_number.get("number")
                if isinstance(number, str):
                    return number

    call = payload.get("call")
    if isinstance(call, dict):
        phone_number = call.get("phoneNumber")
        if isinstance(phone_number, dict):
            number = phone_number.get("number")
            if isinstance(number, str):
                return number

    phone_number = payload.get("phoneNumber")
    if isinstance(phone_number, dict):
        number = phone_number.get("number")
        if isinstance(number, str):
            return number

    return None


@router.post("/vapi/assistant-request")
def vapi_assistant_request(payload: dict[str, Any]) -> dict:
    message_type = _extract_message_type(payload)

    # Vapi may send non-selector events to the same server URL. Acknowledge them
    # rather than failing the request path during live calls.
    if message_type and message_type != "assistant-request":
        return {"ok": True, "messageType": message_type}

    called_number, practice = get_practice_by_phone(_extract_called_number(payload))

    if not practice:
        # During early single-practice setups, fall back to the first configured
        # practice so live calls still work even if the upstream payload shape
        # changes slightly.
        practice = next(iter(PRACTICES_BY_PHONE.values()), None)
        if not practice:
            return {
                "assistantId": settings.vapi_base_assistant_id,
                "assistantOverrides": {"variableValues": {}},
                "debug": {"calledNumber": called_number or "unknown"},
            }

    return {
        "assistantId": settings.vapi_base_assistant_id,
        "assistantOverrides": {
            "variableValues": practice.to_vapi_variables(),
        },
    }
