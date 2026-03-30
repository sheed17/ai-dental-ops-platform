from __future__ import annotations

from typing import Protocol

from sqlalchemy.orm import Session

from app.models import IntegrationEvent


class IntegrationAdapter(Protocol):
    channel: str

    def process(self, db: Session, event: IntegrationEvent) -> dict:
        ...


class CRMAdapter:
    channel = "crm"

    def process(self, db: Session, event: IntegrationEvent) -> dict:
        return {
            "status": "processed",
            "provider": "crm_stub",
            "message": f"Prepared CRM sync for event {event.id}",
        }


class SMSAdapter:
    channel = "sms"

    def process(self, db: Session, event: IntegrationEvent) -> dict:
        return {
            "status": "processed",
            "provider": "sms_stub",
            "message": f"Prepared SMS workflow for event {event.id}",
        }


class InternalAlertAdapter:
    channel = "internal_alert"

    def process(self, db: Session, event: IntegrationEvent) -> dict:
        return {
            "status": "processed",
            "provider": "internal_alert_stub",
            "message": f"Prepared internal alert for event {event.id}",
        }


ADAPTERS: dict[str, IntegrationAdapter] = {
    "crm": CRMAdapter(),
    "sms": SMSAdapter(),
    "internal_alert": InternalAlertAdapter(),
}


def process_integration_event(db: Session, event: IntegrationEvent) -> dict:
    adapter = ADAPTERS.get(event.channel)
    if not adapter:
        return {
            "status": "failed",
            "provider": "none",
            "message": f"No adapter configured for channel {event.channel}",
        }
    return adapter.process(db, event)
