from fastapi import APIRouter, Depends, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.models import Call, CallbackTask, Incident


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
    return templates.TemplateResponse(
        request,
        "dashboard.html",
        {
            "recent_calls": recent_calls,
            "urgent_incidents": urgent_incidents,
            "callback_tasks": callback_tasks,
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
def update_callback_task_status(task_id: str, status: str = Form(...), db: Session = Depends(get_db)) -> RedirectResponse:
    task = db.get(CallbackTask, task_id)
    if task:
        task.status = status
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
