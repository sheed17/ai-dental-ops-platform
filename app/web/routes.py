from fastapi import APIRouter, Depends, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.models import Call, CallbackTask, Incident, Practice


router = APIRouter()
templates = Jinja2Templates(directory="app/templates")


@router.get("/", response_class=HTMLResponse)
def dashboard(request: Request, db: Session = Depends(get_db)) -> HTMLResponse:
    recent_calls = db.scalars(
        select(Call)
        .options(selectinload(Call.callback_tasks), selectinload(Call.incidents))
        .order_by(desc(Call.created_at))
        .limit(15)
    ).all()
    urgent_incidents = db.scalars(
        select(Incident).where(Incident.status == "open").order_by(desc(Incident.created_at)).limit(10)
    ).all()
    callback_tasks = db.scalars(
        select(CallbackTask).where(CallbackTask.status != "completed").order_by(desc(CallbackTask.created_at)).limit(10)
    ).all()
    missed_calls = db.scalars(
        select(Call).where(Call.disposition == "missed_call").order_by(desc(Call.created_at)).limit(10)
    ).all()
    practices = db.scalars(select(Practice).order_by(Practice.practice_name)).all()
    return templates.TemplateResponse(
        request,
        "dashboard.html",
        {
            "recent_calls": recent_calls,
            "urgent_incidents": urgent_incidents,
            "callback_tasks": callback_tasks,
            "missed_calls": missed_calls,
            "practices": practices,
        },
    )


@router.get("/calls/{call_id}", response_class=HTMLResponse)
def call_detail(call_id: str, request: Request, db: Session = Depends(get_db)) -> HTMLResponse:
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
    return templates.TemplateResponse(request, "call_detail.html", {"call": call})


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
