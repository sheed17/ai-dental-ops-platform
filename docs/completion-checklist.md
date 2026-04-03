# Dental Ops Platform Completion Checklist

This file tracks where the product stands based on the current repo state, not just the original plan.

Status key:

- `[x]` Built in code
- `[-]` Partially complete or needs production hardening
- `[ ]` Not complete yet

## Current Snapshot

### Core Backend

- `[x]` FastAPI app, database models, and API routing are in place
- `[x]` Vapi assistant selection endpoint exists
- `[x]` End-of-call ingestion stores calls, transcripts, structured outputs, incidents, and callback tasks
- `[x]` Missed-call intake exists and can create callback plus SMS follow-up work
- `[x]` Operations feed, communications timeline, and dashboard summary endpoints exist
- `[x]` Practice settings, practice modules, onboarding overview, integrations, and routing-rules APIs exist
- `[x]` Operator call actions exist for `mark_handled`, `send_sms`, and `schedule_callback`
- `[-]` Operator action set is still narrower than the original plan

### Worker And Automation

- `[x]` Dedicated worker exists at `python3 -m app.worker`
- `[x]` Worker runs integration-event processing and overdue callback recovery loops
- `[x]` Automation endpoints exist for manual processing and recovery runs
- `[-]` Production worker deployment and continuous runtime still need confirmation

### Integrations And Messaging

- `[x]` Integration catalog and per-practice integration settings model exist
- `[x]` Twilio-managed outbound SMS adapter exists
- `[x]` Twilio inbound SMS reply handling exists
- `[x]` Slack webhook alert adapter exists
- `[x]` Email alert adapter exists
- `[-]` HubSpot and GoHighLevel are selectable providers, but current adapters are still placeholder implementations
- `[-]` Twilio and email support simulation and tested flows, but real production delivery still needs end-to-end verification
- `[ ]` Twilio delivery status lifecycle is not implemented
- `[ ]` Full outbound and inbound phone identity management is not implemented

### Frontend Product Surfaces

- `[x]` Callback console exists at `/callbacks`
- `[x]` Calls workspace exists at `/calls`
- `[x]` Call detail workspace exists at `/calls/[callId]`
- `[x]` Setup workspace exists at `/setup`
- `[x]` Setup surface includes overview, integrations, and routing-rules tabs
- `[x]` Onboarding route currently redirects into setup
- `[-]` Product surface structure is in place, but UX polish and consistency are still in progress based on the UI reset notes

## What Is Meaningfully Done

- `[x]` Practice-level operational data model is established
- `[x]` Call-to-callback and call-to-incident workflow works end to end
- `[x]` Repeat caller and overdue callback logic exists
- `[x]` Operations feed foundation is implemented
- `[x]` Practice module foundation is implemented
- `[x]` Practice onboarding checklist foundation is implemented
- `[x]` Routing-rule CRUD surface exists
- `[x]` Integration settings surface exists

## Partially Done

### Routing And Setup

- `[-]` Routing rules can be listed and updated, but coverage is still shallow
- `[-]` Setup workspace exists, but true setup-to-live automation is not complete
- `[-]` Onboarding checklist exists, but it does not yet guarantee a customer-ready go-live path

### Messaging And Alerts

- `[-]` Twilio outbound and inbound paths exist, but production validation is still outstanding
- `[-]` Email alerts exist, but production SMTP validation is still outstanding
- `[-]` Slack alerts exist, but production rollout details still need confirmation

### Call Workspace Reliability

- `[-]` Recording capture path exists
- `[-]` Transcript and linked callback or incident context exist
- `[-]` Reliability still depends on real-world validation of Vapi payloads, recording availability, and linkage consistency

## Not Done Yet

- `[ ]` First-class phone-number ownership per practice and location
- `[ ]` One-to-many number support per practice
- `[ ]` Primary number selection model
- `[ ]` Multi-location routing model
- `[ ]` Practice-number-aware inbound SMS and call routing
- `[ ]` Real CRM sync implementation
- `[ ]` Real scheduling or PMS connector
- `[ ]` Message template system with variables
- `[ ]` Booking-link flows
- `[ ]` Full production-grade number routing model
- `[ ]` Hidden manual go-live steps removed

## Priority Checklist

### P0 Before Real Customer Use

- `[ ]` Confirm Railway or production worker is continuously running
- `[ ]` Verify real Twilio outbound sends
- `[ ]` Verify real Twilio inbound replies
- `[ ]` Verify Twilio failure behavior and delivery visibility
- `[ ]` Verify correct practice-number context in production
- `[ ]` Verify real email alert delivery
- `[ ]` Ensure operator actions fully cover assign, resolve, send SMS, schedule callback, and open-call workflows
- `[ ]` Add first-class practice and location phone-number model

### P1 For Dependability

- `[ ]` Add message templates for missed calls, booking follow-up, and overdue follow-up
- `[ ]` Implement one real CRM connector end to end
- `[ ]` Expand routing rules for emergency alerts, booking routing, overdue escalation, and practice-specific conditions
- `[ ]` Harden call detail reliability for transcript, recording, and related work links

### P2 For Scale

- `[ ]` Finish true setup-to-live workflow
- `[ ]` Support multi-location phone ownership and routing
- `[ ]` Strengthen phone identity and messaging lifecycle management

## Evidence In Repo

- Backend routes cover dashboard, operations feed, onboarding, integrations, routing rules, and call actions
- Worker loop exists in `app/worker.py`
- Adapters exist for Twilio SMS, Slack webhook, and email alerts in `app/services/integrations.py`
- Tests cover onboarding, routing rules, operations feed, Twilio inbound SMS, recovery automation, alert adapters, and call actions in `tests/test_app.py`
- Frontend routes exist for callbacks, calls, setup, integrations, and settings under `frontend/src/app/`

## Bottom Line

The platform is past the “foundation only” stage. It already has real backend workflows, automation, operator surfaces, onboarding/setup scaffolding, and tested adapter paths.

The biggest remaining work is not basic app structure. It is production hardening:

- `[ ]` real connector behavior
- `[ ]` real phone-number ownership and routing
- `[ ]` real deployment verification for worker and messaging
- `[ ]` setup-to-live completeness
