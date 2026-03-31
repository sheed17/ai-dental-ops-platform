from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Practice(Base):
    __tablename__ = "practices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    practice_name: Mapped[str] = mapped_column(String(255))
    office_hours: Mapped[str] = mapped_column(Text)
    address: Mapped[str] = mapped_column(Text)
    website: Mapped[str] = mapped_column(String(255))
    emergency_number: Mapped[str] = mapped_column(String(30))
    services_summary: Mapped[str] = mapped_column(Text)
    insurance_summary: Mapped[str] = mapped_column(Text)
    same_day_emergency_policy: Mapped[str] = mapped_column(Text)
    languages: Mapped[str] = mapped_column(Text)
    scheduling_mode: Mapped[str] = mapped_column(String(50), default="message_only")
    insurance_mode: Mapped[str] = mapped_column(String(50), default="generic")
    missed_call_recovery_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    missed_call_recovery_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        default="Thanks for calling {{practiceName}}. We missed your call and will follow up when the office opens.",
    )
    callback_sla_minutes: Mapped[int] = mapped_column(Integer, default=60)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    phone_numbers: Mapped[list[PracticePhoneNumber]] = relationship(back_populates="practice", cascade="all, delete-orphan")
    calls: Mapped[list[Call]] = relationship(back_populates="practice")


class PracticePhoneNumber(Base):
    __tablename__ = "practice_phone_numbers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    practice_id: Mapped[str] = mapped_column(ForeignKey("practices.id"), index=True)
    phone_number: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    label: Mapped[str] = mapped_column(String(100), default="primary")
    is_primary: Mapped[bool] = mapped_column(Boolean, default=True)

    practice: Mapped[Practice] = relationship(back_populates="phone_numbers")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    practice_id: Mapped[str | None] = mapped_column(ForeignKey("practices.id"), nullable=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), default="staff")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Call(Base):
    __tablename__ = "calls"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    practice_id: Mapped[str] = mapped_column(ForeignKey("practices.id"), index=True)
    vapi_call_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    caller_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    caller_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    disposition: Mapped[str] = mapped_column(String(100), default="other")
    urgency: Mapped[str] = mapped_column(String(50), default="routine")
    reason_for_call: Mapped[str | None] = mapped_column(Text, nullable=True)
    message_for_staff: Mapped[str | None] = mapped_column(Text, nullable=True)
    call_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    needs_callback: Mapped[bool] = mapped_column(Boolean, default=False)
    needs_incident: Mapped[bool] = mapped_column(Boolean, default=False)
    review_status: Mapped[str] = mapped_column(String(50), default="new")
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    recording_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ended_reason: Mapped[str | None] = mapped_column(String(100), nullable=True)
    raw_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    practice: Mapped[Practice] = relationship(back_populates="calls")
    artifacts: Mapped[list[CallArtifact]] = relationship(back_populates="call", cascade="all, delete-orphan")
    structured_outputs: Mapped[list[CallStructuredOutput]] = relationship(back_populates="call", cascade="all, delete-orphan")
    incidents: Mapped[list[Incident]] = relationship(back_populates="call", cascade="all, delete-orphan")
    callback_tasks: Mapped[list[CallbackTask]] = relationship(back_populates="call", cascade="all, delete-orphan")
    communication_events: Mapped[list[CommunicationEvent]] = relationship(back_populates="call", cascade="all, delete-orphan")


class CallArtifact(Base):
    __tablename__ = "call_artifacts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    call_id: Mapped[str] = mapped_column(ForeignKey("calls.id"), index=True)
    artifact_type: Mapped[str] = mapped_column(String(100))
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    call: Mapped[Call] = relationship(back_populates="artifacts")


class CallStructuredOutput(Base):
    __tablename__ = "call_structured_outputs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    call_id: Mapped[str] = mapped_column(ForeignKey("calls.id"), index=True)
    field_name: Mapped[str] = mapped_column(String(255), index=True)
    value_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    value_bool: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    value_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    call: Mapped[Call] = relationship(back_populates="structured_outputs")


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    practice_id: Mapped[str] = mapped_column(ForeignKey("practices.id"), index=True)
    call_id: Mapped[str | None] = mapped_column(ForeignKey("calls.id"), nullable=True, index=True)
    incident_type: Mapped[str] = mapped_column(String(100))
    severity: Mapped[str] = mapped_column(String(50), default="routine")
    status: Mapped[str] = mapped_column(String(50), default="open")
    summary: Mapped[str] = mapped_column(Text)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    call: Mapped[Call | None] = relationship(back_populates="incidents")


class CallbackTask(Base):
    __tablename__ = "callback_tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    practice_id: Mapped[str] = mapped_column(ForeignKey("practices.id"), index=True)
    call_id: Mapped[str | None] = mapped_column(ForeignKey("calls.id"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(50), default="open")
    priority: Mapped[str] = mapped_column(String(50), default="normal")
    callback_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    callback_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    reason: Mapped[str] = mapped_column(Text)
    due_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    assigned_to: Mapped[str | None] = mapped_column(String(255), nullable=True)
    internal_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    outcome: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    call: Mapped[Call | None] = relationship(back_populates="callback_tasks")
    communication_events: Mapped[list[CommunicationEvent]] = relationship(back_populates="callback_task", cascade="all, delete-orphan")


class CommunicationEvent(Base):
    __tablename__ = "communication_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    practice_id: Mapped[str] = mapped_column(ForeignKey("practices.id"), index=True)
    call_id: Mapped[str | None] = mapped_column(ForeignKey("calls.id"), nullable=True, index=True)
    callback_task_id: Mapped[str | None] = mapped_column(ForeignKey("callback_tasks.id"), nullable=True, index=True)
    channel: Mapped[str] = mapped_column(String(50), default="sms")
    direction: Mapped[str] = mapped_column(String(20), default="outbound")
    event_type: Mapped[str] = mapped_column(String(100), default="message")
    counterpart: Mapped[str | None] = mapped_column(String(30), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    call: Mapped[Call | None] = relationship(back_populates="communication_events")
    callback_task: Mapped[CallbackTask | None] = relationship(back_populates="communication_events")


class IntegrationSetting(Base):
    __tablename__ = "integration_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    practice_id: Mapped[str] = mapped_column(ForeignKey("practices.id"), index=True)
    channel: Mapped[str] = mapped_column(String(50), index=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    config_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class IntegrationEvent(Base):
    __tablename__ = "integration_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    practice_id: Mapped[str] = mapped_column(ForeignKey("practices.id"), index=True)
    call_id: Mapped[str | None] = mapped_column(ForeignKey("calls.id"), nullable=True, index=True)
    incident_id: Mapped[str | None] = mapped_column(ForeignKey("incidents.id"), nullable=True, index=True)
    callback_task_id: Mapped[str | None] = mapped_column(ForeignKey("callback_tasks.id"), nullable=True, index=True)
    channel: Mapped[str] = mapped_column(String(50))
    event_type: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(50), default="queued")
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    next_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class RoutingRule(Base):
    __tablename__ = "routing_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    practice_id: Mapped[str] = mapped_column(ForeignKey("practices.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    trigger_event: Mapped[str] = mapped_column(String(100))
    condition_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    action_json: Mapped[dict] = mapped_column(JSON)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
