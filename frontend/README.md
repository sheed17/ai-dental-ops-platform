# Dental Ops Frontend

Next.js operator-facing frontend for the Dental Ops Platform.

## What this includes

- Morning dashboard for recent calls and urgent incidents
- Callback queue view for staff workflow
- Call detail page with transcript, recording, tasks, incidents, and structured outputs

## Local setup

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

By default the frontend expects the FastAPI backend at:

```text
http://127.0.0.1:8000/api/v1
```

If your backend is running somewhere else, update `API_BASE_URL` in `.env.local`.

## Current routes

- `/`
- `/callbacks`
- `/calls/[callId]`
