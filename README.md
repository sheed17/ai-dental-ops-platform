# Dental Ops Platform

FastAPI backend for a dental after-hours voice operations platform powered by Vapi.

## What this does

- Serves a Vapi assistant selector endpoint for inbound calls
- Stores completed calls, structured outputs, incidents, and callback tasks
- Exposes JSON APIs for calls, incidents, callback tasks, and integration events
- Renders a simple internal ops dashboard for staff review
- Queues outbound integration events with retry support
- Provides a per-practice integration abstraction layer for CRM, scheduling, insurance, internal alerts, and platform-owned Twilio messaging

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
- `VAPI_API_TOKEN`
- `VAPI_API_BASE_URL`
- `VAPI_WEBHOOK_SECRET`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_MESSAGING_SERVICE_SID`
- `TWILIO_FROM_NUMBER`
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
- `POST /api/v1/integration-events/process-pending`
- `GET /api/v1/integrations/catalog`
- `GET /api/v1/practices/{practice_id}/integrations`
- `PUT /api/v1/practices/{practice_id}/integrations/{capability_key}`

## Dashboard routes

- `GET /`
- `GET /calls/{call_id}`
