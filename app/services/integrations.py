from __future__ import annotations

from typing import Protocol

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import IntegrationEvent, IntegrationSetting
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
        return {
            "status": "processed",
            "provider": self.provider,
            "message": f"Prepared Twilio-managed SMS for event {event.id}",
            "to": payload.get("to") or payload.get("callback_phone"),
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
