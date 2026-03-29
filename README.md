# Dental Ops Platform

FastAPI backend for a dental after-hours voice operations platform powered by Vapi.

## What this does

- Serves a Vapi assistant selector endpoint for inbound calls
- Looks up practice config by called phone number
- Returns assistant overrides with practice-specific variables
- Provides a health check for Railway or local deployment

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
- `VAPI_BASE_ASSISTANT_ID`

## Routes

- `GET /health`
- `POST /api/v1/vapi/assistant-request`

# dental-receptionist
