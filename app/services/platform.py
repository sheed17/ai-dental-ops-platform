from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import OperationalEvent, Practice, PracticeModule

DEFAULT_MODULES: tuple[tuple[str, dict], ...] = (
    ("after_hours", {"label": "After-Hours Assistant"}),
    ("missed_calls", {"label": "Missed Call Recovery"}),
    ("callback_manager", {"label": "Callback Manager"}),
    ("emergency_routing", {"label": "Emergency Routing"}),
    ("booking", {"label": "Booking Assistant"}),
)


def ensure_practice_modules(db: Session, practice: Practice, *, commit: bool = True) -> list[PracticeModule]:
    existing = {
        module.module_key: module
        for module in db.scalars(select(PracticeModule).where(PracticeModule.practice_id == practice.id)).all()
    }
    created = False
    for module_key, config in DEFAULT_MODULES:
        if module_key in existing:
            continue
        module = PracticeModule(
            practice_id=practice.id,
            module_key=module_key,
            is_enabled=True,
            config_json=config,
        )
        db.add(module)
        existing[module_key] = module
        created = True

    if created and commit:
        db.commit()
        for module in existing.values():
            db.refresh(module)

    return [existing[module_key] for module_key, _ in DEFAULT_MODULES]


def upsert_practice_module(
    db: Session,
    practice: Practice,
    module_key: str,
    *,
    is_enabled: bool,
    config_json: dict | None = None,
) -> PracticeModule:
    module = db.scalar(
        select(PracticeModule).where(
            PracticeModule.practice_id == practice.id,
            PracticeModule.module_key == module_key,
        )
    )
    merged_config = {
        **next((config for key, config in DEFAULT_MODULES if key == module_key), {}),
        **(module.config_json or {} if module and module.config_json else {}),
        **(config_json or {}),
    }
    if not module:
        module = PracticeModule(
            practice_id=practice.id,
            module_key=module_key,
            is_enabled=is_enabled,
            config_json=merged_config,
        )
        db.add(module)
    else:
        module.is_enabled = is_enabled
        module.config_json = merged_config

    db.commit()
    db.refresh(module)
    return module


def emit_operational_event(
    db: Session,
    *,
    practice_id: str,
    event_name: str,
    source: str,
    title: str,
    detail: str | None = None,
    status: str | None = None,
    severity: str | None = None,
    call_id: str | None = None,
    incident_id: str | None = None,
    callback_task_id: str | None = None,
    communication_event_id: str | None = None,
    integration_event_id: str | None = None,
    payload: dict | None = None,
) -> OperationalEvent:
    event = OperationalEvent(
        practice_id=practice_id,
        event_name=event_name,
        source=source,
        title=title,
        detail=detail,
        status=status,
        severity=severity,
        call_id=call_id,
        incident_id=incident_id,
        callback_task_id=callback_task_id,
        communication_event_id=communication_event_id,
        integration_event_id=integration_event_id,
        payload=payload,
    )
    db.add(event)
    db.flush()
    return event
