from __future__ import annotations

from typing import Protocol

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import CommunicationEvent, IntegrationEvent, IntegrationSetting
from app.services.integration_catalog import get_integration_capability


class IntegrationAdapter(Protocol):
    provider: str

    def process(self, db: Session, event: IntegrationEvent) -> dict:
        ...


class GenericCRMAdapter:
    provider = "generic_crm_stub"

    def process(self, db: Session, event: IntegrationEvent) -> dict:
        return {
            "status": "processed",
            "provider": self.provider,
            "message": f"Prepared CRM sync for event {event.id}",
        }


class HubSpotAdapter:
    provider = "hubspot"

    def process(self, db: Session, event: IntegrationEvent) -> dict:
        return {
            "status": "processed",
            "provider": self.provider,
            "message": f"Prepared HubSpot sync for event {event.id}",
        }


class GoHighLevelAdapter:
    provider = "go_high_level"

    def process(self, db: Session, event: IntegrationEvent) -> dict:
        return {
            "status": "processed",
            "provider": self.provider,
            "message": f"Prepared GoHighLevel sync for event {event.id}",
        }


class TwilioManagedSMSAdapter:
    provider = "twilio_managed"

    def process(self, db: Session, event: IntegrationEvent) -> dict:
        payload = event.payload or {}
        setting = _get_setting(db, event)
        config = setting.config_json or {} if setting and setting.config_json else {}
        to_number = payload.get("to") or payload.get("callback_phone")
        message_body = payload.get("message") or payload.get("reason_for_call") or "Dental Ops Platform follow-up"

        if not to_number:
            return {
                "status": "failed",
                "provider": self.provider,
                "message": "No destination phone number available for SMS delivery.",
            }

        sender_number = config.get("sender_number") or settings.twilio_from_number
        messaging_service_sid = config.get("messaging_service_sid") or settings.twilio_messaging_service_sid
        if settings.twilio_account_sid and settings.twilio_auth_token and (sender_number or messaging_service_sid):
            request_data = {"To": to_number, "Body": message_body}
            if messaging_service_sid:
                request_data["MessagingServiceSid"] = messaging_service_sid
            else:
                request_data["From"] = sender_number

            response = httpx.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json",
                data=request_data,
                auth=(settings.twilio_account_sid, settings.twilio_auth_token),
                timeout=15.0,
            )
            response.raise_for_status()
            response_payload = response.json()
            db.add(
                CommunicationEvent(
                    practice_id=event.practice_id,
                    call_id=event.call_id,
                    callback_task_id=event.callback_task_id,
                    channel="sms",
                    direction="outbound",
                    event_type=event.event_type,
                    counterpart=to_number,
                    body=message_body,
                    status="sent",
                    external_id=response_payload.get("sid"),
                    metadata_json={"provider": self.provider},
                )
            )
            return {
                "status": "processed",
                "provider": self.provider,
                "message": f"Sent Twilio SMS for event {event.id}",
                "to": to_number,
                "sid": response_payload.get("sid"),
            }

        db.add(
            CommunicationEvent(
                practice_id=event.practice_id,
                call_id=event.call_id,
                callback_task_id=event.callback_task_id,
                channel="sms",
                direction="outbound",
                event_type=event.event_type,
                counterpart=to_number,
                body=message_body,
                status="simulated",
                external_id=None,
                metadata_json={"provider": self.provider, "simulated": True},
            )
        )
        return {
            "status": "processed",
            "provider": self.provider,
            "message": f"Prepared Twilio-managed SMS for event {event.id} in simulation mode",
            "to": payload.get("to") or payload.get("callback_phone"),
            "simulated": True,
        }


class PlatformInternalAlertAdapter:
    provider = "platform_internal_alerts"

    def process(self, db: Session, event: IntegrationEvent) -> dict:
        return {
            "status": "processed",
            "provider": self.provider,
            "message": f"Prepared internal alert for event {event.id}",
        }


ADAPTERS: dict[str, IntegrationAdapter] = {
    "generic_crm_stub": GenericCRMAdapter(),
    "hubspot": HubSpotAdapter(),
    "go_high_level": GoHighLevelAdapter(),
    "twilio_managed": TwilioManagedSMSAdapter(),
    "platform_internal_alerts": PlatformInternalAlertAdapter(),
}


def _get_setting(db: Session, event: IntegrationEvent) -> IntegrationSetting | None:
    return db.scalar(
        select(IntegrationSetting).where(
            IntegrationSetting.practice_id == event.practice_id,
            IntegrationSetting.channel == event.channel,
        )
    )


def resolve_provider(db: Session, event: IntegrationEvent) -> str:
    setting = _get_setting(db, event)
    config = setting.config_json or {} if setting else {}
    if setting and setting.is_enabled and isinstance(config.get("provider"), str):
        return config["provider"]

    capability = get_integration_capability(event.channel)
    if capability:
        return capability.default_provider

    return event.channel


def process_integration_event(db: Session, event: IntegrationEvent) -> dict:
    adapter = ADAPTERS.get(resolve_provider(db, event))
    if not adapter:
        return {
            "status": "failed",
            "provider": "none",
            "message": f"No adapter configured for channel {event.channel}",
        }
    result = adapter.process(db, event)
    result.setdefault("provider", getattr(adapter, "provider", "unknown"))
    return result
