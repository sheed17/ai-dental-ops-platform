from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Call, CallbackTask, Incident, IntegrationEvent, Practice
from app.services.integrations import process_integration_event
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
                    "message": normalized.message_for_staff or normalized.call_summary or normalized.reason_for_call,
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
        max_attempts=3,
    )
    db.add(event)
    db.flush()
    return event


def process_pending_integration_events(limit: int = 50) -> int:
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        pending_ids = db.scalars(
            select(IntegrationEvent.id)
            .where(
                IntegrationEvent.status.in_(("queued", "retry")),
                (IntegrationEvent.next_attempt_at.is_(None) | (IntegrationEvent.next_attempt_at <= now)),
            )
            .order_by(IntegrationEvent.created_at)
            .limit(limit)
        ).all()
        if pending_ids:
            process_integration_events_async(pending_ids)
        return len(pending_ids)
    finally:
        db.close()


def process_integration_events_async(event_ids: Iterable[str]) -> None:
    db = SessionLocal()
    try:
        for event_id in event_ids:
            event = db.get(IntegrationEvent, event_id)
            if not event or event.status not in {"queued", "retry"}:
                continue
            event.attempts += 1
            try:
                result = process_integration_event(db, event)
                event_status = result.get("status", "processed")
            except Exception as exc:  # noqa: BLE001
                result = {
                    "status": "failed",
                    "provider": "exception",
                    "message": str(exc),
                }
                event_status = "failed"

            event.payload = {**(event.payload or {}), "adapterResult": result}

            if event_status == "failed":
                event.last_error = result.get("message")
                if event.attempts >= event.max_attempts:
                    event.status = "failed"
                    event.processed_at = datetime.now(timezone.utc)
                    event.next_attempt_at = None
                else:
                    event.status = "retry"
                    event.next_attempt_at = datetime.now(timezone.utc) + timedelta(minutes=event.attempts)
            else:
                event.status = event_status
                event.last_error = None
                event.processed_at = datetime.now(timezone.utc)
                event.next_attempt_at = None
        db.commit()
    finally:
        db.close()
