from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict

from app.core.config import settings
from app.services.practice_directory import get_practice_by_phone


router = APIRouter(prefix="/api/v1")


class PhoneNumber(BaseModel):
    number: str | None = None


class CallPayload(BaseModel):
    phoneNumber: PhoneNumber | None = None


class MessagePayload(BaseModel):
    type: str
    call: CallPayload | None = None


class AssistantRequestPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    message: MessagePayload


@router.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok", "environment": settings.app_env}


@router.post("/vapi/assistant-request")
def vapi_assistant_request(payload: AssistantRequestPayload) -> dict:
    if payload.message.type != "assistant-request":
        raise HTTPException(status_code=400, detail="Unsupported Vapi message type.")

    called_number, practice = get_practice_by_phone(
        payload.message.call.phoneNumber.number if payload.message.call and payload.message.call.phoneNumber else None
    )

    if not practice:
        raise HTTPException(
            status_code=404,
            detail=f"No matching practice configuration for number: {called_number or 'unknown'}",
        )

    return {
        "assistantId": settings.vapi_base_assistant_id,
        "assistantOverrides": {
            "variableValues": practice.to_vapi_variables(),
        },
    }
