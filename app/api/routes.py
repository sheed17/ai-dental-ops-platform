from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json
import logging
import time
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.db import get_db
from app.models import Call, CallArtifact, CallStructuredOutput, CallbackTask, CommunicationEvent, Incident, IntegrationEvent, OperationalEvent, Practice, PracticeModule, PracticePhoneNumber, RoutingRule
from app.schemas import (
    AssistantContextRead,
    AutomationRunSummary,
    BuildChecklistItemRead,
    BuildChecklistRead,
    CallRead,
    CallActionRequest,
    CallListItemRead,
    CallbackTaskRead,
    CallbackTaskUpdate,
    CommunicationEventRead,
    DashboardSummary,
    IncidentRead,
    IntegrationCatalogItemRead,
    IntegrationEventRead,
    OperationFeedItemRead,
    OnboardingChecklistItemRead,
    OnboardingOverviewRead,
    OperationalEventRead,
    PracticeRead,
    PracticeIntegrationSettingRead,
    PracticeModuleRead,
    PracticeModuleUpdate,
    PracticePhoneNumberCreate,
    PracticePhoneNumberRead,
    PracticePhoneNumberUpdate,
    PracticeIntegrationSettingUpdate,
    PracticeSettingsUpdate,
    RoutingRuleRead,
    RoutingRuleUpdate,
    TwilioInboundMessageRead,
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
from app.services.practice_directory import (
    evaluate_phone_number_routing,
    get_active_practice_by_phone,
    get_default_practice,
    get_practice_by_phone,
    normalize_phone_number,
    parse_debug_time,
)
from app.services.platform import ensure_practice_modules, emit_operational_event, upsert_practice_module
from app.services.vapi_client import fetch_assistant_details, fetch_call_details
from app.services.workflow import (
    create_inbound_communication_event,
    create_operational_records,
    process_callback_recovery_automation,
    process_integration_events_async,
)


router = APIRouter(prefix="/api/v1")
logger = logging.getLogger(__name__)


RESOLVED_ASSISTANT_PROMPT = """You are Clara, the after-hours virtual receptionist for {practice_name}, a dental office.

You answer calls only when the office is closed. You are calm, warm, professional, and efficient. You sound like a real front desk receptionist on a phone call, not a chatbot.

Your job is to:
- Triage urgent situations safely.
- Answer simple office questions using the office details provided below.
- Take accurate callback messages for the dental team.
- End calls cleanly once enough information has been collected.

You are not a dentist, not a hygienist, not a treatment coordinator, not a scheduler, and not a billing specialist. Do not diagnose, do not give clinical advice, do not recommend medication or dosages, do not promise appointment availability, and do not invent office policies.

OFFICE DETAILS
Use these office details as factual context for the call:
Practice name: {practice_name}
Office hours: {office_hours}
Address: {address}
Website: {website}
Emergency line: {emergency_number}
Services summary: {services_summary}
Insurance summary: {insurance_summary}
Same-day emergency policy: {same_day_emergency_policy}
Languages spoken: {languages}

CRITICAL RULES
- Always identify the office by name when asked.
- Answer service questions directly from the services summary.
- Answer insurance questions directly from the insurance summary.
- Use the office hours, address, website, and emergency line directly when asked.
- Do not say you are unable to confirm the practice name if it is available above.
- Do not say you do not know the services if they are available above.
- Only fall back to callback capture if the requested detail is actually missing, unclear, or would require guessing.

If any office detail is missing, blank, or unclear, do not guess and do not read placeholder-like text aloud. Instead say that you can have the office follow up.

VOICE RULES
- Speak in short, clear, natural sentences.
- Keep responses brief.
- Ask only one question at a time.
- Never ask the same question twice in a row.
- If the caller does not answer, rephrase once or move on.
- Do not use bullet points or numbered lists in spoken responses.
- Do not sound scripted, overly cheerful, or robotic.
- Do not repeat the greeting.
- Do not end by asking anything else.

GENERAL INFORMATION
If the caller asks for simple office information and the answer is known, answer briefly:
- Hours: We're open {office_hours}.
- Address: Our address is {address}.
- Website: You can find more information at {website}.
- Practice name: You've reached {practice_name}.
- Services: We offer {services_summary}.
- Insurance: {insurance_summary}

If the answer is not explicitly provided, say:
I don't want to guess. I can have the office follow up.

EMERGENCY TRIAGE
Treat this as a medical emergency if the caller mentions trouble breathing, trouble swallowing, severe swelling affecting the face, jaw, mouth, or throat, uncontrolled bleeding, major facial trauma, a broken jaw, loss of consciousness, or severe injury after an accident.

If medical emergency, say:
I'm sorry you're dealing with that. That may need immediate medical attention. Please call 911 now or go to the nearest emergency room.

If appropriate, also say:
You can also call {emergency_number} for urgent dental guidance.

URGENT DENTAL ISSUES
For urgent dental issues like severe tooth pain, a knocked-out tooth, swelling, or suspected infection, say:
I'm sorry you're going through that. Please call {emergency_number} for urgent dental guidance. I can also take your name and number so the team can follow up when the office opens.

SPECIFIC FLOWS
If caller asks which office this is, say:
You've reached {practice_name}'s after-hours line.

If caller asks what services the office offers, say:
We offer {services_summary}.

If caller asks whether the office takes insurance, say:
{insurance_summary}
Do not overpromise exact coverage.

CLOSING
Once enough information is collected, say:
Thank you. I'll make sure the team gets your message and follows up when the office opens. Take care.

HARD STOPS
Never diagnose, recommend treatment, recommend medications or dosages, promise appointment availability, promise insurance coverage or pricing, invent office policies, say a doctor is available unless explicitly provided, claim you are checking the schedule, put the caller on hold, or ask more than one question in a turn."""


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


def _build_assistant_variables(practice: Practice) -> dict[str, str]:
    return {
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
    }


def _build_resolved_assistant_overrides(practice: Practice) -> dict[str, Any]:
    prompt = RESOLVED_ASSISTANT_PROMPT.format(
        practice_name=practice.practice_name or "the dental office",
        office_hours=practice.office_hours or "the posted office hours",
        address=practice.address or "the office address on file",
        website=practice.website or "the office website",
        emergency_number=practice.emergency_number or "the office emergency line",
        services_summary=practice.services_summary or "general dental care",
        insurance_summary=practice.insurance_summary or "The office can review insurance questions during business hours.",
        same_day_emergency_policy=practice.same_day_emergency_policy or "Urgent concerns should be escalated for office follow-up.",
        languages=practice.languages or "English",
    )
    first_message = (
        f"Hi, thank you for calling {practice.practice_name}. This is Clara. "
        "The office is currently closed. How can I help you?"
    )

    return {
        "firstMessage": first_message,
        "model": {
            "messages": [
                {
                    "role": "system",
                    "content": prompt,
                }
            ]
        },
        "variableValues": _build_assistant_variables(practice),
    }


def _build_transient_assistant(practice: Practice) -> dict[str, Any]:
    base_assistant = fetch_assistant_details(settings.vapi_base_assistant_id) or {}
    overrides = _build_resolved_assistant_overrides(practice)

    assistant: dict[str, Any] = {
        key: value
        for key, value in base_assistant.items()
        if key not in {"id", "orgId", "createdAt", "updatedAt"}
    }

    if not assistant:
        assistant = {
            "name": "Dental After Hours Receptionist",
            "voice": {"voiceId": "Emma", "provider": "vapi"},
            "model": {"provider": "openai", "model": "gpt-4.1", "maxTokens": 350, "temperature": 0.2},
            "transcriber": {
                "model": "nova-3",
                "language": "en",
                "numerals": False,
                "provider": "deepgram",
                "confidenceThreshold": 0.4,
            },
        }

    model = assistant.get("model")
    if not isinstance(model, dict):
        model = {}
    model["messages"] = overrides["model"]["messages"]
    assistant["model"] = model
    assistant["firstMessage"] = overrides["firstMessage"]
    assistant["variableValues"] = overrides["variableValues"]
    return assistant


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


def _serialize_module(module: PracticeModule) -> PracticeModuleRead:
    return PracticeModuleRead.model_validate(module, from_attributes=True)


def _serialize_practice_phone_number(phone_number: PracticePhoneNumber) -> PracticePhoneNumberRead:
    return PracticePhoneNumberRead.model_validate(phone_number, from_attributes=True)


def _serialize_operational_event(event: OperationalEvent) -> OperationalEventRead:
    return OperationalEventRead.model_validate(event, from_attributes=True)


def _build_operations_feed(db: Session, limit: int = 25) -> list[OperationFeedItemRead]:
    return [
        OperationFeedItemRead(
            id=event.id,
            occurred_at=event.created_at,
            item_type=event.event_name,
            title=event.title,
            detail=event.detail,
            status=event.status,
            severity=event.severity,
            related_call_id=event.call_id,
        )
        for event in db.scalars(select(OperationalEvent).order_by(desc(OperationalEvent.created_at)).limit(limit)).all()
    ]


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
    modules = ensure_practice_modules(db, practice)
    integration_map = {setting.channel: setting for setting in integration_settings}

    def enabled(channel: str) -> bool:
        setting = integration_map.get(channel)
        return bool(setting and setting.is_enabled)

    checklist = [
        OnboardingChecklistItemRead(
            key="modules",
            label="Core modules selected",
            completed=all(module.is_enabled for module in modules if module.module_key in {"after_hours", "callback_manager"}),
            detail="The practice has the core operational modules enabled.",
        ),
        OnboardingChecklistItemRead(
            key="phone_numbers",
            label="Practice numbers configured",
            completed=bool(practice.phone_numbers)
            and any(number.is_primary for number in practice.phone_numbers)
            and any(number.voice_enabled and number.routing_mode for number in practice.phone_numbers),
            detail="At least one owned number is assigned, marked primary, and configured for live routing.",
        ),
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


def _build_platform_checklist() -> BuildChecklistRead:
    return BuildChecklistRead(
        built=[
            BuildChecklistItemRead(key="event_abstraction", status="built", label="Event abstraction layer", detail="Operational events are standardized and stored."),
            BuildChecklistItemRead(key="workflow_routing", status="built", label="Workflow routing layer", detail="Per-practice routing rules execute against workflow triggers."),
            BuildChecklistItemRead(key="module_layer", status="built", label="Module abstraction layer", detail="Practices have enable/disable modules for core platform behaviors."),
            BuildChecklistItemRead(key="unified_feed", status="built", label="Unified event feed", detail="The operations feed is driven by first-class operational events."),
            BuildChecklistItemRead(key="connector_abstraction", status="built", label="Connector abstraction", detail="Voice, messaging, email alerts, Slack-capable alerts, and CRM placeholders sit behind connectors."),
        ],
        pending=[
            BuildChecklistItemRead(key="crm_live", status="pending", label="Live CRM integrations", detail="HubSpot/GHL/Salesforce need real sync implementations."),
            BuildChecklistItemRead(key="scheduling_live", status="pending", label="Live scheduling integrations", detail="NextHealth/OpenDental and scheduling connectors still need lightweight production integrations."),
            BuildChecklistItemRead(key="module_first_onboarding", status="pending", label="Module-first onboarding UI", detail="The onboarding flow should start with module selection and connector setup."),
            BuildChecklistItemRead(key="automation_scheduler", status="pending", label="Automated scheduler", detail="Recovery and escalation automation should run automatically on a worker/cron."),
            BuildChecklistItemRead(key="owner_summary", status="pending", label="Owner summary mode", detail="A simplified owner-facing summary layer still needs to be added."),
        ],
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
    started_at = time.perf_counter()
    message_type = extract_message_type(payload)
    if message_type and message_type != "assistant-request":
        return {"ok": True, "messageType": message_type}

    debug_time = parse_debug_time(
        payload.get("debug", {}).get("currentTime") if isinstance(payload.get("debug"), dict) else None
    )
    called_number, practice, routing_reason = get_active_practice_by_phone(
        db,
        extract_called_number(payload),
        current_time=debug_time,
    )
    if not practice:
        response = {
            "assistantId": settings.vapi_base_assistant_id,
            "assistantOverrides": {"variableValues": {}},
            "debug": {"calledNumber": called_number or "unknown", "routingReason": routing_reason},
        }
        _log_assistant_request_response(
            response=response,
            called_number=called_number,
            practice_name=None,
            routing_reason=routing_reason,
            started_at=started_at,
        )
        return response

    response = {
        "assistant": _build_transient_assistant(practice),
    }
    _log_assistant_request_response(
        response=response,
        called_number=called_number,
        practice_name=practice.practice_name,
        routing_reason=routing_reason,
        started_at=started_at,
    )
    return response


def _log_assistant_request_response(
    *,
    response: dict[str, Any],
    called_number: str | None,
    practice_name: str | None,
    routing_reason: str,
    started_at: float,
) -> None:
    duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
    try:
        response_preview = json.dumps(response, default=str)[:4000]
    except TypeError:
        response_preview = str(response)[:4000]

    logger.info(
        "assistant-request completed",
        extra={
            "called_number": called_number or "unknown",
            "practice_name": practice_name or "none",
            "routing_reason": routing_reason,
            "duration_ms": duration_ms,
            "response_preview": response_preview,
        },
    )


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
    emit_operational_event(
        db,
        practice_id=practice.id,
        event_name="call.missed",
        source="telephony",
        title="Missed call",
        detail="Missed call recovery was triggered during business hours.",
        status=call.review_status,
        severity="routine",
        call_id=call.id,
        payload={"caller_phone": caller_phone, "caller_name": payload.get("callerName")},
    )

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
    emit_operational_event(
        db,
        practice_id=practice.id,
        event_name="callback.created",
        source="workflow",
        title="Callback task created",
        detail=task.reason,
        status=task.status,
        severity=task.priority,
        call_id=call.id,
        callback_task_id=task.id,
        payload={"callback_phone": task.callback_phone},
    )

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


@router.post("/twilio/inbound-message", response_model=TwilioInboundMessageRead)
async def twilio_inbound_message(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> TwilioInboundMessageRead:
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        payload = await request.json()
    else:
        form = await request.form()
        payload = dict(form)

    to_number = payload.get("To") or payload.get("to")
    from_number = payload.get("From") or payload.get("from")
    body = payload.get("Body") or payload.get("body")
    message_sid = payload.get("MessageSid") or payload.get("messageSid")

    if not isinstance(to_number, str) or not isinstance(from_number, str) or not isinstance(body, str):
        raise HTTPException(status_code=400, detail="To, From, and Body are required.")

    _, practice = get_practice_by_phone(db, to_number)
    if not practice:
        practice = get_default_practice(db)
    if not practice:
        raise HTTPException(status_code=404, detail="Practice not found for inbound message.")

    communication, callback_task, events = create_inbound_communication_event(
        db,
        practice=practice,
        caller_phone=from_number,
        body=body,
        external_id=message_sid if isinstance(message_sid, str) else None,
    )
    db.commit()
    if events:
        background_tasks.add_task(process_integration_events_async, [event.id for event in events])

    return TwilioInboundMessageRead(
        status="stored",
        communication_event_id=communication.id,
        callback_task_id=callback_task.id if callback_task else None,
    )


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


@router.get("/practices/{practice_id}/phone-numbers", response_model=list[PracticePhoneNumberRead])
def list_practice_phone_numbers(practice_id: str, db: Session = Depends(get_db)) -> list[PracticePhoneNumberRead]:
    practice = db.get(Practice, practice_id)
    if not practice:
        raise HTTPException(status_code=404, detail="Practice not found.")
    numbers = db.scalars(
        select(PracticePhoneNumber)
        .where(PracticePhoneNumber.practice_id == practice_id)
        .order_by(desc(PracticePhoneNumber.is_primary), PracticePhoneNumber.phone_number)
    ).all()
    return [_serialize_practice_phone_number(number) for number in numbers]


@router.post("/practices/{practice_id}/phone-numbers", response_model=PracticePhoneNumberRead)
def create_practice_phone_number(
    practice_id: str,
    payload: PracticePhoneNumberCreate,
    db: Session = Depends(get_db),
) -> PracticePhoneNumberRead:
    practice = db.get(Practice, practice_id)
    if not practice:
        raise HTTPException(status_code=404, detail="Practice not found.")

    normalized_phone = normalize_phone_number(payload.phone_number)
    if not normalized_phone:
        raise HTTPException(status_code=400, detail="A valid phone number is required.")

    existing_number = db.scalar(select(PracticePhoneNumber).where(PracticePhoneNumber.phone_number == normalized_phone))
    if existing_number:
        raise HTTPException(status_code=409, detail="That phone number is already assigned.")

    should_be_primary = payload.is_primary or not db.scalar(
        select(PracticePhoneNumber.id).where(PracticePhoneNumber.practice_id == practice_id).limit(1)
    )
    if should_be_primary:
        for row in db.scalars(select(PracticePhoneNumber).where(PracticePhoneNumber.practice_id == practice_id)).all():
            row.is_primary = False

    number = PracticePhoneNumber(
        practice_id=practice_id,
        phone_number=normalized_phone,
        label=payload.label.strip() or "secondary",
        is_primary=should_be_primary,
        routing_mode=payload.routing_mode,
        forward_to_number=normalize_phone_number(payload.forward_to_number) if payload.forward_to_number else None,
        voice_enabled=payload.voice_enabled,
        sms_enabled=payload.sms_enabled,
    )
    db.add(number)
    db.commit()
    db.refresh(number)
    return _serialize_practice_phone_number(number)


@router.put("/practices/{practice_id}/phone-numbers/{phone_number_id}", response_model=PracticePhoneNumberRead)
def update_practice_phone_number(
    practice_id: str,
    phone_number_id: str,
    payload: PracticePhoneNumberUpdate,
    db: Session = Depends(get_db),
) -> PracticePhoneNumberRead:
    practice = db.get(Practice, practice_id)
    if not practice:
        raise HTTPException(status_code=404, detail="Practice not found.")

    target = db.get(PracticePhoneNumber, phone_number_id)
    if not target or target.practice_id != practice_id:
        raise HTTPException(status_code=404, detail="Phone number not found.")

    if payload.is_primary:
        for row in db.scalars(select(PracticePhoneNumber).where(PracticePhoneNumber.practice_id == practice_id)).all():
            row.is_primary = row.id == phone_number_id

    target.label = payload.label.strip() or target.label
    target.routing_mode = payload.routing_mode
    target.forward_to_number = normalize_phone_number(payload.forward_to_number) if payload.forward_to_number else None
    target.voice_enabled = payload.voice_enabled
    target.sms_enabled = payload.sms_enabled

    db.commit()
    db.refresh(target)
    return _serialize_practice_phone_number(target)


@router.post("/practices/{practice_id}/phone-numbers/{phone_number_id}/make-primary", response_model=PracticePhoneNumberRead)
def make_practice_phone_number_primary(practice_id: str, phone_number_id: str, db: Session = Depends(get_db)) -> PracticePhoneNumberRead:
    practice = db.get(Practice, practice_id)
    if not practice:
        raise HTTPException(status_code=404, detail="Practice not found.")

    target = db.get(PracticePhoneNumber, phone_number_id)
    if not target or target.practice_id != practice_id:
        raise HTTPException(status_code=404, detail="Phone number not found.")

    for row in db.scalars(select(PracticePhoneNumber).where(PracticePhoneNumber.practice_id == practice_id)).all():
        row.is_primary = row.id == phone_number_id

    db.commit()
    db.refresh(target)
    return _serialize_practice_phone_number(target)


@router.get("/practices/{practice_id}/modules", response_model=list[PracticeModuleRead])
def list_practice_modules(practice_id: str, db: Session = Depends(get_db)) -> list[PracticeModuleRead]:
    practice = db.get(Practice, practice_id)
    if not practice:
        raise HTTPException(status_code=404, detail="Practice not found.")
    modules = ensure_practice_modules(db, practice)
    return [_serialize_module(module) for module in modules]


@router.put("/practices/{practice_id}/modules/{module_key}", response_model=PracticeModuleRead)
def update_practice_module(
    practice_id: str,
    module_key: str,
    payload: PracticeModuleUpdate,
    db: Session = Depends(get_db),
) -> PracticeModuleRead:
    practice = db.get(Practice, practice_id)
    if not practice:
        raise HTTPException(status_code=404, detail="Practice not found.")
    module = upsert_practice_module(
        db,
        practice,
        module_key,
        is_enabled=payload.is_enabled,
        config_json=payload.config_json,
    )
    return _serialize_module(module)


@router.patch("/practice-settings/{practice_id}", response_model=PracticeRead)
def update_practice_settings(
    practice_id: str,
    payload: PracticeSettingsUpdate,
    db: Session = Depends(get_db),
) -> PracticeRead:
    practice = db.get(Practice, practice_id)
    if not practice:
        raise HTTPException(status_code=404, detail="Practice not found.")
    updates = payload.model_dump(exclude_unset=True)
    for field_name, value in updates.items():
        setattr(practice, field_name, value)
    db.commit()
    db.refresh(practice)
    return _serialize_practice(practice)


@router.get("/practice-settings/{practice_id}/assistant-context", response_model=AssistantContextRead)
def practice_assistant_context(practice_id: str, current_time: str | None = None, db: Session = Depends(get_db)) -> AssistantContextRead:
    practice = db.scalar(
        select(Practice)
        .options(selectinload(Practice.phone_numbers))
        .where(Practice.id == practice_id)
    )
    if not practice:
        raise HTTPException(status_code=404, detail="Practice not found.")

    primary_number = next((number for number in practice.phone_numbers if number.is_primary), None)
    if not primary_number and practice.phone_numbers:
        primary_number = practice.phone_numbers[0]
    debug_time = parse_debug_time(current_time)
    routing_active, routing_reason = (
        evaluate_phone_number_routing(primary_number, practice, current_time=debug_time)
        if primary_number
        else (False, "No managed receptionist number is assigned.")
    )

    return AssistantContextRead(
        practice_id=practice.id,
        practice_name=practice.practice_name,
        routing_number=primary_number.phone_number if primary_number else None,
        routing_mode=primary_number.routing_mode if primary_number else None,
        routing_active=routing_active,
        routing_reason=routing_reason,
        variable_values=_build_assistant_variables(practice),
    )


@router.get("/integration-events", response_model=list[IntegrationEventRead])
def list_integration_events(db: Session = Depends(get_db)) -> list[IntegrationEventRead]:
    events = db.scalars(select(IntegrationEvent).order_by(desc(IntegrationEvent.created_at))).all()
    return [IntegrationEventRead.model_validate(event, from_attributes=True) for event in events]


@router.get("/events", response_model=list[OperationalEventRead])
def list_operational_events(limit: int = 100, db: Session = Depends(get_db)) -> list[OperationalEventRead]:
    events = db.scalars(select(OperationalEvent).order_by(desc(OperationalEvent.created_at)).limit(limit)).all()
    return [_serialize_operational_event(event) for event in events]


@router.get("/communications", response_model=list[CommunicationEventRead])
def list_communications(db: Session = Depends(get_db)) -> list[CommunicationEventRead]:
    events = db.scalars(select(CommunicationEvent).order_by(desc(CommunicationEvent.created_at))).all()
    return [CommunicationEventRead.model_validate(event, from_attributes=True) for event in events]


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


@router.post("/automation/recovery/run", response_model=AutomationRunSummary)
def run_recovery_automation(limit: int = 50) -> AutomationRunSummary:
    queued_event_ids = process_callback_recovery_automation(limit=limit)
    return AutomationRunSummary(processed_tasks=len(queued_event_ids), queued_event_ids=queued_event_ids)


@router.get("/platform/checklist", response_model=BuildChecklistRead)
def platform_checklist() -> BuildChecklistRead:
    return _build_platform_checklist()


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
