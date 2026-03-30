from __future__ import annotations

from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.db import get_db
from app.models import Call, CallArtifact, CallStructuredOutput, CallbackTask, Incident, IntegrationEvent
from app.schemas import CallRead, CallbackTaskRead, CallbackTaskUpdate, IncidentRead, IntegrationEventRead
from app.services.normalization import extract_called_number, extract_message_type, normalize_vapi_end_of_call
from app.services.practice_directory import get_default_practice, get_practice_by_phone
from app.services.workflow import create_operational_records, process_integration_events_async


router = APIRouter(prefix="/api/v1")


def _serialize_call(call: Call) -> CallRead:
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
    )


@router.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok", "environment": settings.app_env}


@router.post("/vapi/assistant-request")
def vapi_assistant_request(payload: dict[str, Any], db: Session = Depends(get_db)) -> dict:
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
            },
        },
    }


@router.post("/vapi/end-of-call")
def vapi_end_of_call(
    payload: dict[str, Any],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    called_number, practice = get_practice_by_phone(db, extract_called_number(payload))
    if not practice:
        practice = get_default_practice(db)
    if not practice:
        raise HTTPException(status_code=404, detail=f"No practice found for number: {called_number or 'unknown'}")

    normalized = normalize_vapi_end_of_call(payload)

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
        raw_payload=normalized.raw_payload,
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


@router.get("/integration-events", response_model=list[IntegrationEventRead])
def list_integration_events(db: Session = Depends(get_db)) -> list[IntegrationEventRead]:
    events = db.scalars(select(IntegrationEvent).order_by(desc(IntegrationEvent.created_at))).all()
    return [IntegrationEventRead.model_validate(event, from_attributes=True) for event in events]
