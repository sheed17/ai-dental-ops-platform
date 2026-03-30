# Dental Ops Platform

FastAPI backend for a dental after-hours voice operations platform powered by Vapi.

## What this does

- Serves a Vapi assistant selector endpoint for inbound calls
- Stores completed calls, structured outputs, incidents, and callback tasks
- Exposes JSON APIs for calls, incidents, callback tasks, and integration events
- Renders a simple internal ops dashboard for staff review
- Queues outbound integration events as a phase 2 foundation

## Local setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

## Environment variables

- `APP_ENV`
- `PORT`
- `DATABASE_URL`
- `VAPI_BASE_ASSISTANT_ID`
- `SEED_DEMO_DATA`

## Core routes

- `GET /api/v1/health`
- `POST /api/v1/vapi/assistant-request`
- `POST /api/v1/vapi/end-of-call`
- `GET /api/v1/calls`
- `GET /api/v1/calls/{call_id}`
- `GET /api/v1/callback-tasks`
- `PATCH /api/v1/callback-tasks/{task_id}`
- `GET /api/v1/incidents`
- `POST /api/v1/incidents/{incident_id}/resolve`
- `GET /api/v1/integration-events`

## Dashboard routes

- `GET /`
- `GET /calls/{call_id}`
