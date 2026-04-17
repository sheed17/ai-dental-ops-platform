# Dental Ops Platform

An AI-powered operations platform for dental practices that handles after-hours voice intake, missed-call recovery, callback workflows, operational alerts, and integration routing.

This project sits at the intersection of healthcare operations, voice AI, workflow automation, and internal tooling. It is designed to help a dental office stay responsive when the front desk is closed, while giving staff a clear operational system for what happens next.

## What This Platform Does

The platform turns inbound after-hours communication into structured operational work.

- Routes after-hours calls into a Vapi-powered virtual receptionist
- Injects live practice context into the assistant, including hours, services, insurance guidance, and emergency contact details
- Normalizes end-of-call data into calls, incidents, callback tasks, and communication records
- Queues downstream integration events for CRM sync, internal alerts, and SMS follow-up
- Supports missed-call recovery and inbound Twilio message handling
- Gives staff a dashboard and setup workspace for reviewing calls, callbacks, incidents, numbers, modules, and routing rules

## Why It’s Interesting

This is more than a chatbot wrapper or a generic admin panel. The product combines:

- Voice AI orchestration for a real service business workflow
- Rule-based operational automation after a call is completed
- Practice-specific configuration for routing, modules, numbers, and integrations
- A backend worker that processes integration events and recovery automation outside the request cycle
- A product-facing frontend for call review, setup, operations visibility, and messaging follow-up

For someone visiting the repo, the point is simple: this is a full-stack operational system for dental offices, not just a demo API.

## Core Product Flows

### 1. After-hours call intake

When a call hits a configured number, the backend selects the right practice context and prepares assistant variables for the live voice experience. The assistant is instructed to behave like an after-hours dental receptionist, answer simple office questions, triage urgent situations safely, and capture callback details.

### 2. End-of-call normalization

Completed voice calls are converted into structured records such as:

- call summaries
- callback tasks
- urgent incidents
- operational timeline events
- queued integration events

That gives the office a real post-call workflow instead of a transcript graveyard.

### 3. Missed-call recovery and messaging

The platform can create recovery actions for missed calls, track inbound Twilio replies, and update communication state so patient follow-up becomes part of the operating system rather than manual cleanup.

### 4. Staff operations dashboard

The frontend surfaces:

- active calls and call detail views
- callback queue and overdue follow-up work
- urgent incident review
- integration status
- practice setup and onboarding state
- modules, phone numbers, routing rules, and assistant context preview

## Tech Stack

### Backend

- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL-ready data layer with local SQLite/test support
- Jinja templates for internal server-rendered views
- Background worker process for automation and queued integration events

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- TanStack Query
- TanStack Table
- Recharts

### Integrations and external services

- Vapi for voice assistant workflows
- Twilio for messaging and recovery flows
- CRM and internal alert routing through provider abstraction

## Architecture Overview

```text
Inbound call/message
        |
        v
FastAPI API layer
        |
        +--> Practice context + routing logic
        +--> Call normalization
        +--> Incidents / callback tasks / operational events
        +--> Integration events queue
        |
        +--> Worker process
                |
                +--> CRM sync
                +--> internal alerts
                +--> SMS follow-up
                +--> callback recovery automation
```

At a high level:

- the API accepts inbound voice and messaging events
- normalization logic decides what operational work should be created
- integration events are queued rather than handled synchronously
- a worker processes retries and automation tasks in the background
- the frontend reads that system state as an internal operating console

## Repository Structure

```text
.
├── app/
│   ├── api/                # JSON API routes
│   ├── core/               # configuration
│   ├── services/           # workflow, integrations, normalization, practice logic
│   ├── templates/          # internal dashboard templates
│   ├── web/                # server-rendered routes
│   ├── main.py             # FastAPI entrypoint
│   └── worker.py           # automation and event worker
├── frontend/               # Next.js operations UI
├── docs/                   # legal pages and assistant documentation
└── tests/                  # API and workflow coverage
```

## Notable Capabilities

- Per-practice onboarding and configuration
- Live assistant context generation from practice data
- Practice phone number management and routing modes
- Module toggles for after-hours assistant, missed calls, callback manager, emergency routing, and booking
- Routing rules that trigger follow-up actions based on call outcomes or overdue callbacks
- Operational event feed for incidents, callbacks, and communications
- Retryable integration queue for downstream systems

## API Highlights

### Health and voice

- `GET /api/v1/health`
- `POST /api/v1/vapi/assistant-request`
- `POST /api/v1/vapi/end-of-call`

### Calls, callbacks, incidents, communications

- `GET /api/v1/calls`
- `GET /api/v1/calls/{call_id}`
- `GET /api/v1/callback-tasks`
- `PATCH /api/v1/callback-tasks/{task_id}`
- `GET /api/v1/incidents`
- `POST /api/v1/incidents/{incident_id}/resolve`
- `POST /api/v1/twilio/inbound-message`

### Integrations and automation

- `GET /api/v1/integration-events`
- `POST /api/v1/integration-events/process-pending`
- `POST /api/v1/automation/recovery/run`
- `GET /api/v1/integrations/catalog`
- `GET /api/v1/practices/{practice_id}/integrations`
- `PUT /api/v1/practices/{practice_id}/integrations/{capability_key}`

### Practice setup

- `GET /api/v1/practice-settings`
- `PATCH /api/v1/practice-settings/{practice_id}`
- `GET /api/v1/practice-settings/{practice_id}/assistant-context`
- `GET /api/v1/practices/{practice_id}/onboarding`
- `GET /api/v1/practices/{practice_id}/modules`
- `PUT /api/v1/practices/{practice_id}/modules/{module_key}`
- `GET /api/v1/practices/{practice_id}/phone-numbers`
- `POST /api/v1/practices/{practice_id}/phone-numbers`
- `GET /api/v1/practices/{practice_id}/routing-rules`

## Legal Pages

This repo includes public legal pages in [`docs/`](/Users/sammyfammy/Downloads/dental-ops-platform/docs):

- [privacy.html](/Users/sammyfammy/Downloads/dental-ops-platform/docs/privacy.html)
- [terms.html](/Users/sammyfammy/Downloads/dental-ops-platform/docs/terms.html)

If GitHub Pages is enabled from `docs/` on `main`, the public URLs will be:

- `https://sheed17.github.io/dental-receptionist/privacy.html`
- `https://sheed17.github.io/dental-receptionist/terms.html`

## Positioning

If someone lands on this repository from a GitHub profile, the best way to think about it is:

This is an AI-powered dental operations system for after-hours patient communication, callback management, and internal workflow automation.
