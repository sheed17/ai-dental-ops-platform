from fastapi import APIRouter, Depends, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db import get_db
from app.models import CallbackTask, Incident, Practice


router = APIRouter()


@router.get("/", response_class=HTMLResponse)
def dashboard() -> RedirectResponse:
    return RedirectResponse(url=f"{settings.frontend_base_url.rstrip('/')}/callbacks", status_code=307)


@router.get("/calls/{call_id}", response_class=HTMLResponse)
def call_detail(call_id: str) -> RedirectResponse:
    return RedirectResponse(url=f"{settings.frontend_base_url.rstrip('/')}/calls/{call_id}", status_code=307)


@router.post("/dashboard/callback-tasks/{task_id}/status")
def update_callback_task_status(
    task_id: str,
    status: str = Form(...),
    assigned_to: str | None = Form(default=None),
    internal_notes: str | None = Form(default=None),
    outcome: str | None = Form(default=None),
    db: Session = Depends(get_db),
) -> RedirectResponse:
    task = db.get(CallbackTask, task_id)
    if task:
        task.status = status
        task.assigned_to = assigned_to or None
        task.internal_notes = internal_notes or None
        task.outcome = outcome or None
        if status == "completed" and not task.completed_at:
            from datetime import datetime, timezone

            task.completed_at = datetime.now(timezone.utc)
        db.commit()
    return RedirectResponse(url="/", status_code=303)


@router.post("/dashboard/incidents/{incident_id}/resolve")
def resolve_incident(incident_id: str, db: Session = Depends(get_db)) -> RedirectResponse:
    from datetime import datetime, timezone

    incident = db.get(Incident, incident_id)
    if incident:
        incident.status = "resolved"
        incident.resolved_at = datetime.now(timezone.utc)
        db.commit()
    return RedirectResponse(url="/", status_code=303)


@router.post("/dashboard/practice-settings/{practice_id}")
def update_practice_settings(
    practice_id: str,
    scheduling_mode: str = Form(...),
    insurance_mode: str = Form(...),
    missed_call_recovery_enabled: str | None = Form(default=None),
    missed_call_recovery_message: str | None = Form(default=None),
    callback_sla_minutes: int = Form(...),
    db: Session = Depends(get_db),
) -> RedirectResponse:
    practice = db.get(Practice, practice_id)
    if practice:
        practice.scheduling_mode = scheduling_mode
        practice.insurance_mode = insurance_mode
        practice.missed_call_recovery_enabled = missed_call_recovery_enabled == "on"
        practice.missed_call_recovery_message = missed_call_recovery_message or None
        practice.callback_sla_minutes = callback_sla_minutes
        db.commit()
    return RedirectResponse(url="/", status_code=303)
