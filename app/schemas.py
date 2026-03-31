from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class CallbackTaskUpdate(BaseModel):
    status: str
    assigned_to: str | None = None
    internal_notes: str | None = None
    outcome: str | None = None


class PracticeSettingsUpdate(BaseModel):
    scheduling_mode: str
    insurance_mode: str
    missed_call_recovery_enabled: bool
    missed_call_recovery_message: str | None = None
    callback_sla_minutes: int


class PracticeRead(BaseModel):
    id: str
    practice_name: str
    office_hours: str
    address: str
    website: str
    emergency_number: str
    services_summary: str
    insurance_summary: str
    same_day_emergency_policy: str
    languages: str
    scheduling_mode: str
    insurance_mode: str
    missed_call_recovery_enabled: bool
    missed_call_recovery_message: str | None
    callback_sla_minutes: int


class CallArtifactRead(BaseModel):
    id: str
    artifact_type: str
    url: str | None
    metadata_json: dict[str, Any] | None


class CallStructuredOutputRead(BaseModel):
    id: str
    field_name: str
    value_text: str | None
    value_bool: bool | None
    value_json: dict[str, Any] | None


class IncidentRead(BaseModel):
    id: str
    incident_type: str
    severity: str
    status: str
    summary: str
    details: str | None
    created_at: datetime
    resolved_at: datetime | None


class CallbackTaskRead(BaseModel):
    id: str
    status: str
    priority: str
    callback_name: str | None
    callback_phone: str | None
    reason: str
    due_note: str | None
    assigned_to: str | None
    internal_notes: str | None
    outcome: str | None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None


class CallRead(BaseModel):
    id: str
    practice_id: str
    vapi_call_id: str | None
    caller_name: str | None
    caller_phone: str | None
    disposition: str
    urgency: str
    reason_for_call: str | None
    message_for_staff: str | None
    call_summary: str | None
    needs_callback: bool
    needs_incident: bool
    review_status: str
    transcript: str | None
    recording_url: str | None
    duration_seconds: int | None
    ended_reason: str | None
    created_at: datetime
    incidents: list[IncidentRead]
    callback_tasks: list[CallbackTaskRead]
    artifacts: list[CallArtifactRead]
    structured_outputs: list[CallStructuredOutputRead]
    repeat_caller_count: int = 0
    recent_related_calls: list["CallListItemRead"] = []


class CallListItemRead(BaseModel):
    id: str
    caller_name: str | None
    caller_phone: str | None
    disposition: str
    urgency: str
    call_summary: str | None
    created_at: datetime


class IntegrationEventRead(BaseModel):
    id: str
    channel: str
    event_type: str
    status: str
    attempts: int
    max_attempts: int
    last_error: str | None
    next_attempt_at: datetime | None
    processed_at: datetime | None


class CommunicationEventRead(BaseModel):
    id: str
    channel: str
    direction: str
    event_type: str
    counterpart: str | None
    body: str | None
    status: str | None
    external_id: str | None
    created_at: datetime


class DashboardSummary(BaseModel):
    recent_calls: list[CallRead]
    urgent_incidents: list[IncidentRead]
    open_callback_tasks: list[CallbackTaskRead]
    overdue_callback_tasks: list[CallbackTaskRead]
    repeat_callers: list[CallListItemRead]
    practices: list[PracticeRead]


class OnboardingChecklistItemRead(BaseModel):
    key: str
    label: str
    completed: bool
    detail: str


class OnboardingOverviewRead(BaseModel):
    practice_id: str
    practice_name: str
    completed_steps: int
    total_steps: int
    checklist: list[OnboardingChecklistItemRead]


class IntegrationCatalogItemRead(BaseModel):
    key: str
    label: str
    ownership: str
    description: str
    supported_providers: list[str]
    default_provider: str
    onboarding_fields: list[str]


class PracticeIntegrationSettingRead(BaseModel):
    id: str
    practice_id: str
    capability_key: str
    is_enabled: bool
    provider: str
    config: dict[str, Any]


class PracticeIntegrationSettingUpdate(BaseModel):
    is_enabled: bool
    provider: str
    config: dict[str, Any] | None = None


class RoutingRuleRead(BaseModel):
    id: str
    practice_id: str
    name: str
    trigger_event: str
    condition_json: dict[str, Any] | None
    action_json: dict[str, Any]
    is_enabled: bool
    created_at: datetime


class RoutingRuleUpdate(BaseModel):
    name: str
    trigger_event: str
    condition_json: dict[str, Any] | None = None
    action_json: dict[str, Any]
    is_enabled: bool = True


class OperationFeedItemRead(BaseModel):
    id: str
    occurred_at: datetime
    item_type: str
    title: str
    detail: str | None
    status: str | None
    severity: str | None
    related_call_id: str | None = None


class CallActionRequest(BaseModel):
    action: str
    note: str | None = None


class AutomationRunSummary(BaseModel):
    processed_tasks: int
    queued_event_ids: list[str]


class TwilioInboundMessageRead(BaseModel):
    status: str
    communication_event_id: str
    callback_task_id: str | None = None
