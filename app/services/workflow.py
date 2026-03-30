from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable

from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Call, CallbackTask, Incident, IntegrationEvent, Practice
from app.services.normalization import CanonicalCallData


def create_operational_records(db: Session, practice: Practice, call: Call, normalized: CanonicalCallData) -> tuple[list[Incident], list[CallbackTask], list[IntegrationEvent]]:
    incidents: list[Incident] = []
    callback_tasks: list[CallbackTask] = []
    integration_events: list[IntegrationEvent] = []

    if normalized.needs_incident:
        incident = Incident(
            practice_id=practice.id,
            call_id=call.id,
            incident_type=normalized.disposition,
            severity=normalized.urgency,
            status="open",
            summary=normalized.call_summary or normalized.reason_for_call or "Urgent call requires review",
            details=normalized.message_for_staff,
        )
        db.add(incident)
        incidents.append(incident)

    if normalized.needs_callback:
        callback_task = CallbackTask(
            practice_id=practice.id,
            call_id=call.id,
            status="open",
            priority="high" if normalized.needs_incident else "normal",
            callback_name=normalized.caller_name,
            callback_phone=normalized.caller_phone,
            reason=normalized.reason_for_call or "Callback requested",
            due_note="Follow up as soon as possible" if normalized.needs_incident else "Return call when office opens",
        )
        db.add(callback_task)
        callback_tasks.append(callback_task)

    db.flush()

    if normalized.needs_incident and incidents:
        integration_events.append(
            _queue_event(
                db,
                practice_id=practice.id,
                call_id=call.id,
                incident_id=incidents[0].id,
                callback_task_id=callback_tasks[0].id if callback_tasks else None,
                channel="internal_alert",
                event_type="urgent_call_alert",
                payload={
                    "severity": normalized.urgency,
                    "summary": normalized.call_summary,
                    "caller_name": normalized.caller_name,
                    "caller_phone": normalized.caller_phone,
                },
            )
        )

    if normalized.disposition in {"appointment_request", "general_message"} or callback_tasks:
        integration_events.append(
            _queue_event(
                db,
                practice_id=practice.id,
                call_id=call.id,
                incident_id=incidents[0].id if incidents else None,
                callback_task_id=callback_tasks[0].id if callback_tasks else None,
                channel="crm",
                event_type="lead_or_callback_sync",
                payload={
                    "disposition": normalized.disposition,
                    "urgency": normalized.urgency,
                    "caller_name": normalized.caller_name,
                    "caller_phone": normalized.caller_phone,
                    "reason_for_call": normalized.reason_for_call,
                },
            )
        )

    if callback_tasks:
        integration_events.append(
            _queue_event(
                db,
                practice_id=practice.id,
                call_id=call.id,
                incident_id=incidents[0].id if incidents else None,
                callback_task_id=callback_tasks[0].id,
                channel="sms",
                event_type="staff_callback_notification",
                payload={
                    "callback_phone": normalized.caller_phone,
                    "reason_for_call": normalized.reason_for_call,
                },
            )
        )

    return incidents, callback_tasks, integration_events


def _queue_event(
    db: Session,
    *,
    practice_id: str,
    call_id: str | None,
    incident_id: str | None,
    callback_task_id: str | None,
    channel: str,
    event_type: str,
    payload: dict,
) -> IntegrationEvent:
    event = IntegrationEvent(
        practice_id=practice_id,
        call_id=call_id,
        incident_id=incident_id,
        callback_task_id=callback_task_id,
        channel=channel,
        event_type=event_type,
        status="queued",
        payload=payload,
    )
    db.add(event)
    db.flush()
    return event


def process_integration_events_async(event_ids: Iterable[str]) -> None:
    db = SessionLocal()
    try:
        for event_id in event_ids:
            event = db.get(IntegrationEvent, event_id)
            if not event or event.status not in {"queued", "retry"}:
                continue
            event.attempts += 1
            event.status = "processed"
            event.processed_at = datetime.now(timezone.utc)
        db.commit()
    finally:
        db.close()
