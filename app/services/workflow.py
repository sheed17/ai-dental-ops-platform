from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Iterable

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Call, CallbackTask, CommunicationEvent, Incident, IntegrationEvent, Practice, RoutingRule
from app.services.integrations import process_integration_event
from app.services.normalization import CanonicalCallData
from app.services.platform import emit_operational_event


def create_operational_records(db: Session, practice: Practice, call: Call, normalized: CanonicalCallData) -> tuple[list[Incident], list[CallbackTask], list[IntegrationEvent]]:
    incidents: list[Incident] = []
    callback_tasks: list[CallbackTask] = []
    integration_events: list[IntegrationEvent] = []

    emit_operational_event(
        db,
        practice_id=practice.id,
        event_name="call.after_hours" if normalized.disposition != "missed_call" else "call.missed",
        source="voice",
        title=f"{normalized.disposition.replace('_', ' ')} call",
        detail=normalized.call_summary or normalized.reason_for_call,
        status=call.review_status,
        severity=normalized.urgency,
        call_id=call.id,
        payload={
            "disposition": normalized.disposition,
            "urgency": normalized.urgency,
            "caller_name": normalized.caller_name,
            "caller_phone": normalized.caller_phone,
        },
    )

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

    for incident in incidents:
        emit_operational_event(
            db,
            practice_id=practice.id,
            event_name="incident.created",
            source="workflow",
            title=f"{incident.incident_type.replace('_', ' ')} incident",
            detail=incident.summary,
            status=incident.status,
            severity=incident.severity,
            call_id=call.id,
            incident_id=incident.id,
            payload={"details": incident.details},
        )

    for callback_task in callback_tasks:
        emit_operational_event(
            db,
            practice_id=practice.id,
            event_name="callback.created",
            source="workflow",
            title="Callback task created",
            detail=callback_task.reason,
            status=callback_task.status,
            severity=callback_task.priority,
            call_id=call.id,
            callback_task_id=callback_task.id,
            payload={"callback_phone": callback_task.callback_phone},
        )

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

    integration_events.extend(
        execute_routing_rules(
            db,
            practice=practice,
            trigger_event="call.completed",
            context={
                "disposition": normalized.disposition,
                "urgency": normalized.urgency,
                "caller_name": normalized.caller_name,
                "caller_phone": normalized.caller_phone,
                "message": normalized.message_for_staff or normalized.call_summary or normalized.reason_for_call,
            },
            call_id=call.id,
            incident_id=incidents[0].id if incidents else None,
            callback_task_id=callback_tasks[0].id if callback_tasks else None,
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


def _matches_condition(condition: dict | None, context: dict) -> bool:
    if not condition:
        return True
    for key, expected in condition.items():
        actual = context.get(key)
        if key == "minutes_overdue":
            if not isinstance(actual, (int, float)):
                return False
            if actual < expected:
                return False
            continue
        if actual != expected:
            return False
    return True


def execute_routing_rules(
    db: Session,
    *,
    practice: Practice,
    trigger_event: str,
    context: dict,
    call_id: str | None = None,
    incident_id: str | None = None,
    callback_task_id: str | None = None,
) -> list[IntegrationEvent]:
    rules = db.scalars(
        select(RoutingRule)
        .where(
            RoutingRule.practice_id == practice.id,
            RoutingRule.trigger_event == trigger_event,
            RoutingRule.is_enabled.is_(True),
        )
        .order_by(RoutingRule.created_at)
    ).all()

    queued: list[IntegrationEvent] = []
    for rule in rules:
        if not _matches_condition(rule.condition_json, context):
            continue
        action = rule.action_json or {}
        channel = action.get("channel")
        event_type = action.get("event_type")
        if not isinstance(channel, str) or not isinstance(event_type, str):
            continue
        queued.append(
            _queue_event(
                db,
                practice_id=practice.id,
                call_id=call_id,
                incident_id=incident_id,
                callback_task_id=callback_task_id,
                channel=channel,
                event_type=event_type,
                payload={
                    **context,
                    "ruleName": rule.name,
                    **({k: v for k, v in action.items() if k not in {"channel", "event_type"}}),
                },
            )
        )
    return queued


def find_recent_open_task_for_phone(db: Session, practice_id: str, caller_phone: str) -> CallbackTask | None:
    return db.scalar(
        select(CallbackTask)
        .where(
            CallbackTask.practice_id == practice_id,
            CallbackTask.callback_phone == caller_phone,
            CallbackTask.status != "completed",
        )
        .order_by(desc(CallbackTask.created_at))
        .limit(1)
    )


def create_inbound_communication_event(
    db: Session,
    *,
    practice: Practice,
    caller_phone: str,
    body: str,
    external_id: str | None = None,
) -> tuple[CommunicationEvent, CallbackTask | None, list[IntegrationEvent]]:
    task = find_recent_open_task_for_phone(db, practice.id, caller_phone)
    call_id = task.call_id if task else None

    communication = CommunicationEvent(
        practice_id=practice.id,
        call_id=call_id,
        callback_task_id=task.id if task else None,
        channel="sms",
        direction="inbound",
        event_type="reply",
        counterpart=caller_phone,
        body=body,
        status="received",
        external_id=external_id,
        metadata_json=None,
    )
    db.add(communication)

    if task:
        existing_notes = task.internal_notes or ""
        note_line = f"Patient replied via SMS: {body}"
        task.internal_notes = f"{existing_notes}\n{note_line}".strip()
        if task.status == "open":
            task.status = "in_progress"
        if not task.outcome:
            task.outcome = "patient_replied"

    db.flush()
    emit_operational_event(
        db,
        practice_id=practice.id,
        event_name="patient.replied",
        source="messaging",
        title="Patient replied",
        detail=body,
        status="received",
        call_id=call_id,
        callback_task_id=task.id if task else None,
        communication_event_id=communication.id,
        payload={"caller_phone": caller_phone},
    )
    events = execute_routing_rules(
        db,
        practice=practice,
        trigger_event="messaging.inbound_reply",
        context={
            "caller_phone": caller_phone,
            "message": body,
            "callback_task_status": task.status if task else None,
        },
        call_id=call_id,
        callback_task_id=task.id if task else None,
    )
    return communication, task, events


def queue_overdue_callback_recovery(
    db: Session,
    *,
    practice: Practice,
    task: CallbackTask,
    minutes_overdue: int,
) -> list[IntegrationEvent]:
    existing_follow_up = db.scalar(
        select(IntegrationEvent)
        .where(
            IntegrationEvent.callback_task_id == task.id,
            IntegrationEvent.event_type == "callback_recovery_follow_up",
        )
        .limit(1)
    )
    if existing_follow_up:
        return []

    emit_operational_event(
        db,
        practice_id=practice.id,
        event_name="callback.overdue",
        source="workflow",
        title="Callback overdue",
        detail=task.reason,
        status=task.status,
        severity=task.priority,
        call_id=task.call_id,
        callback_task_id=task.id,
        payload={"minutes_overdue": minutes_overdue, "callback_phone": task.callback_phone},
    )

    message = (
        f"Hi from {practice.practice_name}. We tried reaching you about your request. "
        "Reply if you'd still like help and our team will follow up."
    )
    queued = [
        _queue_event(
            db,
            practice_id=practice.id,
            call_id=task.call_id,
            incident_id=None,
            callback_task_id=task.id,
            channel="sms",
            event_type="callback_recovery_follow_up",
            payload={
                "to": task.callback_phone,
                "message": message,
                "minutes_overdue": minutes_overdue,
            },
        )
    ]
    queued.extend(
        execute_routing_rules(
            db,
            practice=practice,
            trigger_event="callback.overdue",
            context={
                "minutes_overdue": minutes_overdue,
                "callback_phone": task.callback_phone,
                "message": f"Callback task overdue for {minutes_overdue} minutes.",
            },
            call_id=task.call_id,
            callback_task_id=task.id,
        )
    )
    return queued


def process_callback_recovery_automation(limit: int = 50) -> list[str]:
    db = SessionLocal()
    queued_event_ids: list[str] = []
    try:
        now = datetime.now(timezone.utc)
        tasks = db.scalars(
            select(CallbackTask)
            .where(CallbackTask.status.in_(("open", "in_progress")))
            .order_by(CallbackTask.created_at)
            .limit(limit)
        ).all()
        practices = {practice.id: practice for practice in db.scalars(select(Practice)).all()}
        for task in tasks:
            practice = practices.get(task.practice_id)
            if not practice or not task.callback_phone:
                continue
            created_at = task.created_at if task.created_at.tzinfo else task.created_at.replace(tzinfo=timezone.utc)
            minutes_overdue = int((now - created_at).total_seconds() // 60) - practice.callback_sla_minutes
            if minutes_overdue < 0:
                continue
            queued = queue_overdue_callback_recovery(db, practice=practice, task=task, minutes_overdue=minutes_overdue)
            queued_event_ids.extend(event.id for event in queued)
        db.commit()
        if queued_event_ids:
            process_integration_events_async(queued_event_ids)
        return queued_event_ids
    finally:
        db.close()


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
                emit_operational_event(
                    db,
                    practice_id=event.practice_id,
                    event_name="integration.sent",
                    source="integration",
                    title=f"{event.channel.replace('_', ' ')} {event.event_type.replace('_', ' ')}",
                    detail=result.get("message"),
                    status=event.status,
                    call_id=event.call_id,
                    incident_id=event.incident_id,
                    callback_task_id=event.callback_task_id,
                    integration_event_id=event.id,
                    payload=event.payload,
                )
        db.commit()
    finally:
        db.close()
