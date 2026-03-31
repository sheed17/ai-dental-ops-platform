from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.db import get_db
from app.models import Call, CallArtifact, CallStructuredOutput, CallbackTask, Incident, IntegrationEvent, Practice
from app.models import RoutingRule
from app.schemas import (
    CallRead,
    CallActionRequest,
    CallListItemRead,
    CallbackTaskRead,
    CallbackTaskUpdate,
    DashboardSummary,
    IncidentRead,
    IntegrationCatalogItemRead,
    IntegrationEventRead,
    OperationFeedItemRead,
    OnboardingChecklistItemRead,
    OnboardingOverviewRead,
    PracticeRead,
    PracticeIntegrationSettingRead,
    PracticeIntegrationSettingUpdate,
    PracticeSettingsUpdate,
    RoutingRuleRead,
    RoutingRuleUpdate,
)
from app.services.integration_catalog import list_integration_capabilities
from app.services.integration_settings import ensure_practice_integration_settings, upsert_practice_integration_setting
from app.services.normalization import (
    extract_called_number,
    extract_message_type,
    is_final_vapi_call_payload,
    merge_webhook_with_enrichment,
    normalize_vapi_end_of_call,
)
from app.services.practice_directory import get_default_practice, get_practice_by_phone
from app.services.vapi_client import fetch_call_details
from app.services.workflow import create_operational_records, process_integration_events_async


router = APIRouter(prefix="/api/v1")


def verify_vapi_webhook(
    authorization: str | None = Header(default=None),
    x_vapi_secret: str | None = Header(default=None),
) -> None:
    expected_secret = settings.vapi_webhook_secret
    if not expected_secret:
        return

    bearer_secret = None
    if isinstance(authorization, str) and authorization.lower().startswith("bearer "):
        bearer_secret = authorization.split(" ", 1)[1].strip()

    if expected_secret not in {x_vapi_secret, bearer_secret}:
        raise HTTPException(status_code=401, detail="Invalid Vapi webhook authentication.")


def _serialize_call(call: Call) -> CallRead:
    related_calls: list[CallListItemRead] = []
    repeat_caller_count = 0
    if call.caller_phone:
        related_calls = [
            CallListItemRead(
                id=related.id,
                caller_name=related.caller_name,
                caller_phone=related.caller_phone,
                disposition=related.disposition,
                urgency=related.urgency,
                call_summary=related.call_summary,
                created_at=related.created_at,
            )
            for related in getattr(call, "related_calls", [])[:5]
            if related.id != call.id
        ]
        repeat_caller_count = max(0, len(getattr(call, "related_calls", [])) - 1)

    return CallRead(
        id=call.id,
        practice_id=call.practice_id,
        vapi_call_id=call.vapi_call_id,
        caller_name=call.caller_name,
        caller_phone=call.caller_phone,
        disposition=call.disposition,
        urgency=call.urgency,
        reason_for_call=call.reason_for_call,
        message_for_staff=call.message_for_staff,
        call_summary=call.call_summary,
        needs_callback=call.needs_callback,
        needs_incident=call.needs_incident,
        review_status=call.review_status,
        transcript=call.transcript,
        recording_url=call.recording_url,
        duration_seconds=call.duration_seconds,
        ended_reason=call.ended_reason,
        created_at=call.created_at,
        incidents=[IncidentRead.model_validate(incident, from_attributes=True) for incident in call.incidents],
        callback_tasks=[CallbackTaskRead.model_validate(task, from_attributes=True) for task in call.callback_tasks],
        artifacts=[
            {
                "id": artifact.id,
                "artifact_type": artifact.artifact_type,
                "url": artifact.url,
                "metadata_json": artifact.metadata_json,
            }
            for artifact in call.artifacts
        ],
        structured_outputs=[
            {
                "id": output.id,
                "field_name": output.field_name,
                "value_text": output.value_text,
                "value_bool": output.value_bool,
                "value_json": output.value_json,
            }
            for output in call.structured_outputs
        ],
        repeat_caller_count=repeat_caller_count,
        recent_related_calls=related_calls,
    )


def _serialize_practice(practice: Practice) -> PracticeRead:
    return PracticeRead.model_validate(practice, from_attributes=True)


def _serialize_integration_setting(setting) -> PracticeIntegrationSettingRead:
    config = setting.config_json or {}
    provider = config.get("provider") if isinstance(config.get("provider"), str) else setting.channel
    return PracticeIntegrationSettingRead(
        id=setting.id,
        practice_id=setting.practice_id,
        capability_key=setting.channel,
        is_enabled=setting.is_enabled,
        provider=provider,
        config=config,
    )


def _serialize_call_list_item(call: Call) -> CallListItemRead:
    return CallListItemRead(
        id=call.id,
        caller_name=call.caller_name,
        caller_phone=call.caller_phone,
        disposition=call.disposition,
        urgency=call.urgency,
        call_summary=call.call_summary,
        created_at=call.created_at,
    )


def _serialize_routing_rule(rule: RoutingRule) -> RoutingRuleRead:
    return RoutingRuleRead.model_validate(rule, from_attributes=True)


def _build_operations_feed(db: Session, limit: int = 25) -> list[OperationFeedItemRead]:
    items: list[OperationFeedItemRead] = []

    for call in db.scalars(select(Call).order_by(desc(Call.created_at)).limit(limit)).all():
        items.append(
            OperationFeedItemRead(
                id=f"call:{call.id}",
                occurred_at=call.created_at,
                item_type="call",
                title=f"{call.disposition.replace('_', ' ')} call",
                detail=call.call_summary or call.reason_for_call,
                status=call.review_status,
                severity=call.urgency,
                related_call_id=call.id,
            )
        )

    for task in db.scalars(select(CallbackTask).order_by(desc(CallbackTask.updated_at)).limit(limit)).all():
        items.append(
            OperationFeedItemRead(
                id=f"callback:{task.id}",
                occurred_at=task.updated_at,
                item_type="callback_task",
                title="Callback task updated",
                detail=task.reason,
                status=task.status,
                severity=task.priority,
                related_call_id=task.call_id,
            )
        )

    for incident in db.scalars(select(Incident).order_by(desc(Incident.created_at)).limit(limit)).all():
        items.append(
            OperationFeedItemRead(
                id=f"incident:{incident.id}",
                occurred_at=incident.created_at,
                item_type="incident",
                title=f"{incident.incident_type.replace('_', ' ')} incident",
                detail=incident.summary,
                status=incident.status,
                severity=incident.severity,
                related_call_id=incident.call_id,
            )
        )

    for event in db.scalars(select(IntegrationEvent).order_by(desc(IntegrationEvent.created_at)).limit(limit)).all():
        items.append(
            OperationFeedItemRead(
                id=f"event:{event.id}",
                occurred_at=event.processed_at or event.created_at,
                item_type="integration_event",
                title=f"{event.channel.replace('_', ' ')} {event.event_type.replace('_', ' ')}",
                detail=(event.payload or {}).get("message") if isinstance(event.payload, dict) else None,
                status=event.status,
                severity=None,
                related_call_id=event.call_id,
            )
        )

    items.sort(key=lambda item: item.occurred_at, reverse=True)
    return items[:limit]


def _overdue_tasks(db: Session) -> list[CallbackTask]:
    tasks = db.scalars(select(CallbackTask).where(CallbackTask.status != "completed").order_by(desc(CallbackTask.created_at))).all()
    practices = {practice.id: practice for practice in db.scalars(select(Practice)).all()}
    now = datetime.now(timezone.utc)
    overdue: list[CallbackTask] = []
    for task in tasks:
        practice = practices.get(task.practice_id)
        if not practice:
            continue
        created_at = task.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        if created_at + timedelta(minutes=practice.callback_sla_minutes) <= now:
            overdue.append(task)
    return overdue


def _repeat_callers(db: Session, limit: int = 5) -> list[Call]:
    repeated_numbers = db.execute(
        select(Call.caller_phone)
        .where(Call.caller_phone.is_not(None))
        .group_by(Call.caller_phone)
        .having(func.count(Call.id) > 1)
        .limit(limit)
    ).scalars().all()
    if not repeated_numbers:
        return []

    calls: list[Call] = []
    for number in repeated_numbers:
        latest_call = db.scalar(
            select(Call)
            .where(Call.caller_phone == number)
            .order_by(desc(Call.created_at))
            .limit(1)
        )
        if latest_call:
            calls.append(latest_call)
    return calls


def _build_onboarding_overview(db: Session, practice: Practice) -> OnboardingOverviewRead:
    integration_settings = ensure_practice_integration_settings(db, practice)
    integration_map = {setting.channel: setting for setting in integration_settings}

    def enabled(channel: str) -> bool:
        setting = integration_map.get(channel)
        return bool(setting and setting.is_enabled)

    checklist = [
        OnboardingChecklistItemRead(
            key="practice_profile",
            label="Practice profile completed",
            completed=all(
                [
                    practice.practice_name,
                    practice.office_hours,
                    practice.address,
                    practice.emergency_number,
                ]
            ),
            detail="Basic practice identity, hours, address, and emergency handling are filled in.",
        ),
        OnboardingChecklistItemRead(
            key="workflow_modes",
            label="Office workflow modes chosen",
            completed=bool(practice.scheduling_mode and practice.insurance_mode),
            detail="Scheduling mode, insurance mode, and callback SLA are configured.",
        ),
        OnboardingChecklistItemRead(
            key="messaging",
            label="Platform messaging configured",
            completed=enabled("sms"),
            detail="Twilio-managed messaging is enabled for missed-call recovery and callback texts.",
        ),
        OnboardingChecklistItemRead(
            key="crm",
            label="CRM connection configured",
            completed=enabled("crm"),
            detail="A CRM provider is connected so leads and callback workflows can sync outward.",
        ),
        OnboardingChecklistItemRead(
            key="alerts",
            label="Urgent alerting configured",
            completed=enabled("internal_alert"),
            detail="Internal alert workflow is enabled for urgent incidents and escalations.",
        ),
    ]
    completed_steps = sum(1 for item in checklist if item.completed)
    return OnboardingOverviewRead(
        practice_id=practice.id,
        practice_name=practice.practice_name,
        completed_steps=completed_steps,
        total_steps=len(checklist),
        checklist=checklist,
    )


@router.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok", "environment": settings.app_env}


@router.post("/vapi/assistant-request")
def vapi_assistant_request(
    payload: dict[str, Any],
    _: None = Depends(verify_vapi_webhook),
    db: Session = Depends(get_db),
) -> dict:
    message_type = extract_message_type(payload)
    if message_type and message_type != "assistant-request":
        return {"ok": True, "messageType": message_type}

    called_number, practice = get_practice_by_phone(db, extract_called_number(payload))
    if not practice:
        practice = get_default_practice(db)
        if not practice:
            return {
                "assistantId": settings.vapi_base_assistant_id,
                "assistantOverrides": {"variableValues": {}},
                "debug": {"calledNumber": called_number or "unknown"},
            }

    return {
        "assistantId": settings.vapi_base_assistant_id,
        "assistantOverrides": {
            "variableValues": {
                "practiceName": practice.practice_name,
                "officeHours": practice.office_hours,
                "address": practice.address,
                "website": practice.website,
                "emergencyNumber": practice.emergency_number,
                "servicesSummary": practice.services_summary,
                "insuranceSummary": practice.insurance_summary,
                "sameDayEmergencyPolicy": practice.same_day_emergency_policy,
                "languages": practice.languages,
                "schedulingMode": practice.scheduling_mode,
                "insuranceMode": practice.insurance_mode,
            },
        },
    }


@router.post("/vapi/end-of-call")
def vapi_end_of_call(
    payload: dict[str, Any],
    background_tasks: BackgroundTasks,
    _: None = Depends(verify_vapi_webhook),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    message_type = extract_message_type(payload)
    if message_type and message_type not in {"end-of-call-report", "status-update", "assistant-request"}:
        return {"ok": True, "messageType": message_type}

    called_number, practice = get_practice_by_phone(db, extract_called_number(payload))
    if not practice:
        practice = get_default_practice(db)
    if not practice:
        raise HTTPException(status_code=404, detail=f"No practice found for number: {called_number or 'unknown'}")

    enriched_payload = fetch_call_details(payload.get("message", {}).get("call", {}).get("id") if isinstance(payload.get("message"), dict) else None)
    if not is_final_vapi_call_payload(payload, enriched_payload):
        return {
            "status": "ignored",
            "reason": "non-final-call-event",
            "callId": payload.get("message", {}).get("call", {}).get("id") if isinstance(payload.get("message"), dict) else None,
        }

    normalized = normalize_vapi_end_of_call(merge_webhook_with_enrichment(payload, enriched_payload))

    existing_call = None
    if normalized.vapi_call_id:
        existing_call = db.scalar(select(Call).where(Call.vapi_call_id == normalized.vapi_call_id))
    if existing_call:
        return {"status": "duplicate", "callId": existing_call.id}

    call = Call(
        practice_id=practice.id,
        vapi_call_id=normalized.vapi_call_id,
        caller_name=normalized.caller_name,
        caller_phone=normalized.caller_phone,
        disposition=normalized.disposition,
        urgency=normalized.urgency,
        reason_for_call=normalized.reason_for_call,
        message_for_staff=normalized.message_for_staff,
        call_summary=normalized.call_summary,
        needs_callback=normalized.needs_callback,
        needs_incident=normalized.needs_incident,
        review_status="new",
        transcript=normalized.transcript,
        recording_url=normalized.recording_url,
        duration_seconds=normalized.duration_seconds,
        ended_reason=normalized.ended_reason,
        raw_payload={
            "webhook": payload,
            "enriched_call": enriched_payload,
            "normalized_structured_outputs": normalized.structured_outputs,
        },
    )
    db.add(call)
    db.flush()

    if normalized.recording_url:
        db.add(
            CallArtifact(
                call_id=call.id,
                artifact_type="recording",
                url=normalized.recording_url,
                metadata_json=None,
            )
        )

    for field_name, value in normalized.structured_outputs.items():
        db.add(
            CallStructuredOutput(
                call_id=call.id,
                field_name=field_name,
                value_text=value if isinstance(value, str) else None,
                value_bool=value if isinstance(value, bool) else None,
                value_json=value if isinstance(value, (dict, list)) else None,
            )
        )

    incidents, callback_tasks, integration_events = create_operational_records(db, practice, call, normalized)
    db.commit()
    event_ids = [event.id for event in integration_events]
    if event_ids:
        background_tasks.add_task(process_integration_events_async, event_ids)

    return {
        "status": "stored",
        "callId": call.id,
        "incidentCount": len(incidents),
        "callbackTaskCount": len(callback_tasks),
        "integrationEventCount": len(integration_events),
    }


@router.post("/telephony/missed-call")
def missed_call_recovery(
    payload: dict[str, Any],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    called_number, practice = get_practice_by_phone(db, payload.get("calledNumber"))
    if not practice:
        practice = get_default_practice(db)
    if not practice:
        raise HTTPException(status_code=404, detail=f"No practice found for number: {called_number or 'unknown'}")

    caller_phone = payload.get("callerPhone")
    if not isinstance(caller_phone, str):
        raise HTTPException(status_code=400, detail="callerPhone is required for missed call recovery.")

    call = Call(
        practice_id=practice.id,
        caller_phone=caller_phone,
        caller_name=payload.get("callerName"),
        disposition="missed_call",
        urgency="routine",
        reason_for_call="Missed call recovery",
        message_for_staff="Inbound call was missed during business hours.",
        call_summary="Missed call created a callback task for staff follow-up.",
        needs_callback=True,
        needs_incident=False,
        review_status="new",
        raw_payload=payload,
    )
    db.add(call)
    db.flush()

    task = CallbackTask(
        practice_id=practice.id,
        call_id=call.id,
        status="open",
        priority="normal",
        callback_name=payload.get("callerName"),
        callback_phone=caller_phone,
        reason="Missed call recovery",
        due_note=f"Return the missed call within {practice.callback_sla_minutes} minutes.",
    )
    db.add(task)
    db.flush()

    event_ids: list[str] = []
    if practice.missed_call_recovery_enabled:
        event = IntegrationEvent(
            practice_id=practice.id,
            call_id=call.id,
            callback_task_id=task.id,
            channel="sms",
            event_type="missed_call_recovery_sms",
            status="queued",
            payload={
                "to": caller_phone,
                "message": (practice.missed_call_recovery_message or "").replace("{{practiceName}}", practice.practice_name),
            },
        )
        db.add(event)
        db.flush()
        event_ids.append(event.id)

    db.commit()
    if event_ids:
        background_tasks.add_task(process_integration_events_async, event_ids)

    return {"status": "stored", "callId": call.id, "callbackTaskId": task.id, "integrationEventCount": len(event_ids)}


@router.get("/calls", response_model=list[CallRead])
def list_calls(db: Session = Depends(get_db)) -> list[CallRead]:
    calls = db.scalars(
        select(Call)
        .options(
            selectinload(Call.incidents),
            selectinload(Call.callback_tasks),
            selectinload(Call.artifacts),
            selectinload(Call.structured_outputs),
        )
        .order_by(desc(Call.created_at))
    ).all()
    return [_serialize_call(call) for call in calls]


@router.get("/calls/{call_id}", response_model=CallRead)
def get_call(call_id: str, db: Session = Depends(get_db)) -> CallRead:
    call = db.scalar(
        select(Call)
        .where(Call.id == call_id)
        .options(
            selectinload(Call.incidents),
            selectinload(Call.callback_tasks),
            selectinload(Call.artifacts),
            selectinload(Call.structured_outputs),
        )
    )
    if not call:
        raise HTTPException(status_code=404, detail="Call not found.")
    if call.caller_phone:
        call.related_calls = db.scalars(  # type: ignore[attr-defined]
            select(Call)
            .where(
                Call.caller_phone == call.caller_phone,
                Call.id != call.id,
            )
            .order_by(desc(Call.created_at))
            .limit(5)
        ).all()
        call.related_calls.insert(0, call)  # type: ignore[attr-defined]
    return _serialize_call(call)


@router.get("/callback-tasks", response_model=list[CallbackTaskRead])
def list_callback_tasks(db: Session = Depends(get_db)) -> list[CallbackTaskRead]:
    tasks = db.scalars(select(CallbackTask).order_by(desc(CallbackTask.created_at))).all()
    return [CallbackTaskRead.model_validate(task, from_attributes=True) for task in tasks]


@router.patch("/callback-tasks/{task_id}", response_model=CallbackTaskRead)
def update_callback_task(task_id: str, payload: CallbackTaskUpdate, db: Session = Depends(get_db)) -> CallbackTaskRead:
    task = db.get(CallbackTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Callback task not found.")
    task.status = payload.status
    task.assigned_to = payload.assigned_to
    task.internal_notes = payload.internal_notes
    task.outcome = payload.outcome
    if payload.status == "completed":
        from datetime import datetime, timezone

        task.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(task)
    return CallbackTaskRead.model_validate(task, from_attributes=True)


@router.get("/incidents", response_model=list[IncidentRead])
def list_incidents(db: Session = Depends(get_db)) -> list[IncidentRead]:
    incidents = db.scalars(select(Incident).order_by(desc(Incident.created_at))).all()
    return [IncidentRead.model_validate(incident, from_attributes=True) for incident in incidents]


@router.post("/incidents/{incident_id}/resolve", response_model=IncidentRead)
def resolve_incident(incident_id: str, db: Session = Depends(get_db)) -> IncidentRead:
    from datetime import datetime, timezone

    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
    incident.status = "resolved"
    incident.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(incident)
    return IncidentRead.model_validate(incident, from_attributes=True)


@router.get("/practice-settings", response_model=list[PracticeRead])
def list_practice_settings(db: Session = Depends(get_db)) -> list[PracticeRead]:
    practices = db.scalars(select(Practice).order_by(Practice.practice_name)).all()
    return [_serialize_practice(practice) for practice in practices]


@router.patch("/practice-settings/{practice_id}", response_model=PracticeRead)
def update_practice_settings(
    practice_id: str,
    payload: PracticeSettingsUpdate,
    db: Session = Depends(get_db),
) -> PracticeRead:
    practice = db.get(Practice, practice_id)
    if not practice:
        raise HTTPException(status_code=404, detail="Practice not found.")
    practice.scheduling_mode = payload.scheduling_mode
    practice.insurance_mode = payload.insurance_mode
    practice.missed_call_recovery_enabled = payload.missed_call_recovery_enabled
    practice.missed_call_recovery_message = payload.missed_call_recovery_message
    practice.callback_sla_minutes = payload.callback_sla_minutes
    db.commit()
    db.refresh(practice)
    return _serialize_practice(practice)


@router.get("/integration-events", response_model=list[IntegrationEventRead])
def list_integration_events(db: Session = Depends(get_db)) -> list[IntegrationEventRead]:
    events = db.scalars(select(IntegrationEvent).order_by(desc(IntegrationEvent.created_at))).all()
    return [IntegrationEventRead.model_validate(event, from_attributes=True) for event in events]


@router.get("/operations/feed", response_model=list[OperationFeedItemRead])
def operations_feed(limit: int = 25, db: Session = Depends(get_db)) -> list[OperationFeedItemRead]:
    return _build_operations_feed(db, limit=limit)


@router.get("/dashboard/summary", response_model=DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)) -> DashboardSummary:
    recent_calls = db.scalars(
        select(Call)
        .options(
            selectinload(Call.incidents),
            selectinload(Call.callback_tasks),
            selectinload(Call.artifacts),
            selectinload(Call.structured_outputs),
        )
        .order_by(desc(Call.created_at))
        .limit(10)
    ).all()
    urgent_incidents = db.scalars(select(Incident).where(Incident.status == "open").order_by(desc(Incident.created_at)).limit(8)).all()
    open_callback_tasks = db.scalars(
        select(CallbackTask).where(CallbackTask.status != "completed").order_by(desc(CallbackTask.created_at)).limit(12)
    ).all()
    overdue_callback_tasks = _overdue_tasks(db)[:8]
    repeat_callers = _repeat_callers(db, limit=5)
    practices = db.scalars(select(Practice).order_by(Practice.practice_name)).all()

    return DashboardSummary(
        recent_calls=[_serialize_call(call) for call in recent_calls],
        urgent_incidents=[IncidentRead.model_validate(incident, from_attributes=True) for incident in urgent_incidents],
        open_callback_tasks=[CallbackTaskRead.model_validate(task, from_attributes=True) for task in open_callback_tasks],
        overdue_callback_tasks=[CallbackTaskRead.model_validate(task, from_attributes=True) for task in overdue_callback_tasks],
        repeat_callers=[_serialize_call_list_item(call) for call in repeat_callers],
        practices=[_serialize_practice(practice) for practice in practices],
    )


@router.post("/integration-events/process-pending")
def process_pending_events(limit: int = 50) -> dict[str, int]:
    from app.services.workflow import process_pending_integration_events

    processed = process_pending_integration_events(limit=limit)
    return {"processed": processed}


@router.get("/integrations/catalog", response_model=list[IntegrationCatalogItemRead])
def get_integration_catalog() -> list[IntegrationCatalogItemRead]:
    return [IntegrationCatalogItemRead(**item) for item in list_integration_capabilities()]


@router.get("/practices/{practice_id}/integrations", response_model=list[PracticeIntegrationSettingRead])
def list_practice_integrations(practice_id: str, db: Session = Depends(get_db)) -> list[PracticeIntegrationSettingRead]:
    practice = db.get(Practice, practice_id)
    if not practice:
        raise HTTPException(status_code=404, detail="Practice not found.")
    settings_rows = ensure_practice_integration_settings(db, practice)
    return [_serialize_integration_setting(setting) for setting in settings_rows]


@router.put("/practices/{practice_id}/integrations/{capability_key}", response_model=PracticeIntegrationSettingRead)
def update_practice_integration(
    practice_id: str,
    capability_key: str,
    payload: PracticeIntegrationSettingUpdate,
    db: Session = Depends(get_db),
) -> PracticeIntegrationSettingRead:
    practice = db.get(Practice, practice_id)
    if not practice:
        raise HTTPException(status_code=404, detail="Practice not found.")
    try:
        setting = upsert_practice_integration_setting(
            db,
            practice,
            capability_key,
            is_enabled=payload.is_enabled,
            provider=payload.provider,
            config=payload.config,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _serialize_integration_setting(setting)


@router.get("/practices/{practice_id}/onboarding", response_model=OnboardingOverviewRead)
def get_onboarding_overview(practice_id: str, db: Session = Depends(get_db)) -> OnboardingOverviewRead:
    practice = db.get(Practice, practice_id)
    if not practice:
        raise HTTPException(status_code=404, detail="Practice not found.")
    return _build_onboarding_overview(db, practice)


@router.get("/practices/{practice_id}/routing-rules", response_model=list[RoutingRuleRead])
def list_routing_rules(practice_id: str, db: Session = Depends(get_db)) -> list[RoutingRuleRead]:
    practice = db.get(Practice, practice_id)
    if not practice:
        raise HTTPException(status_code=404, detail="Practice not found.")
    rules = db.scalars(select(RoutingRule).where(RoutingRule.practice_id == practice_id).order_by(RoutingRule.created_at)).all()
    return [_serialize_routing_rule(rule) for rule in rules]


@router.put("/practices/{practice_id}/routing-rules/{rule_id}", response_model=RoutingRuleRead)
def update_routing_rule(practice_id: str, rule_id: str, payload: RoutingRuleUpdate, db: Session = Depends(get_db)) -> RoutingRuleRead:
    rule = db.get(RoutingRule, rule_id)
    if not rule or rule.practice_id != practice_id:
        raise HTTPException(status_code=404, detail="Routing rule not found.")
    rule.name = payload.name
    rule.trigger_event = payload.trigger_event
    rule.condition_json = payload.condition_json
    rule.action_json = payload.action_json
    rule.is_enabled = payload.is_enabled
    db.commit()
    db.refresh(rule)
    return _serialize_routing_rule(rule)


@router.post("/calls/{call_id}/actions")
def perform_call_action(call_id: str, payload: CallActionRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)) -> dict[str, Any]:
    call = db.get(Call, call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found.")

    result: dict[str, Any] = {"status": "ok", "action": payload.action, "callId": call.id}
    event_ids: list[str] = []

    if payload.action == "mark_handled":
        call.review_status = "handled"
        result["reviewStatus"] = call.review_status
    elif payload.action == "send_sms":
        event = IntegrationEvent(
            practice_id=call.practice_id,
            call_id=call.id,
            channel="sms",
            event_type="manual_follow_up_sms",
            status="queued",
            payload={
                "to": call.caller_phone,
                "message": payload.note or call.message_for_staff or call.call_summary or "We will follow up soon.",
            },
        )
        db.add(event)
        db.flush()
        event_ids.append(event.id)
        result["queuedEventId"] = event.id
    elif payload.action == "schedule_callback":
        task = CallbackTask(
            practice_id=call.practice_id,
            call_id=call.id,
            status="open",
            priority="normal",
            callback_name=call.caller_name,
            callback_phone=call.caller_phone,
            reason=payload.note or call.reason_for_call or "Manual callback requested",
            due_note="Scheduled manually from call detail",
        )
        db.add(task)
        db.flush()
        result["callbackTaskId"] = task.id
    else:
        raise HTTPException(status_code=400, detail="Unsupported call action.")

    db.commit()
    if event_ids:
        background_tasks.add_task(process_integration_events_async, event_ids)
    return result
