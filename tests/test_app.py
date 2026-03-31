def test_assistant_selector_returns_assistant_and_variables(client):
    response = client.post(
        "/api/v1/vapi/assistant-request",
        json={
            "message": {
                "type": "assistant-request",
                "call": {"phoneNumber": {"number": "+12282832484"}},
            }
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["assistantId"] == "41e7309e-a78e-48e7-8905-ed0d3e220c6d"
    assert payload["assistantOverrides"]["variableValues"]["practiceName"] == "Bright Smile Dental"


def test_assistant_selector_tolerates_non_selector_events(client):
    response = client.post("/api/v1/vapi/assistant-request", json={"message": {"type": "status-update"}})
    assert response.status_code == 200
    assert response.json()["ok"] is True


def test_end_of_call_creates_call_incident_and_callback(client):
    payload = {
        "message": {
            "type": "end-of-call-report",
            "call": {"id": "call_123", "phoneNumber": {"number": "+12282832484"}},
        },
        "messages": [
            {"role": "assistant", "message": "Hello"},
            {"role": "user", "message": "My tooth hurts and I want a cleaning"},
        ],
        "analysis": {
            "a": {"name": "flag_urgent", "result": True},
            "b": {"name": "urgency_level", "result": "urgent"},
            "c": {"name": "call_disposition", "result": "appointment_request"},
            "d": {"name": "reason_for_call", "result": "Caller wants a cleaning and mentioned tooth pain."},
            "e": {"name": "message_for_staff", "result": "Please call back in the morning about cleaning and pain."},
            "f": {"name": "call_summary", "result": "Mixed cleaning request and urgent tooth pain."},
            "g": {"name": "caller_name", "result": "Jane Doe"},
            "h": {"name": "caller_phone", "result": "+15125551212"},
        },
    }

    response = client.post("/api/v1/vapi/end-of-call", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "stored"
    assert body["incidentCount"] == 1
    assert body["callbackTaskCount"] == 1

    calls = client.get("/api/v1/calls").json()
    assert len(calls) == 1
    assert calls[0]["disposition"] == "appointment_request"
    assert calls[0]["urgency"] == "urgent"
    assert calls[0]["callback_tasks"][0]["status"] == "open"
    assert calls[0]["incidents"][0]["status"] == "open"


def test_missed_call_recovery_creates_callback_and_sms_event(client):
    response = client.post(
        "/api/v1/telephony/missed-call",
        json={
            "calledNumber": "+12282832484",
            "callerPhone": "+15125550000",
            "callerName": "Missed Caller",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "stored"

    tasks = client.get("/api/v1/callback-tasks").json()
    assert len(tasks) == 1
    assert tasks[0]["reason"] == "Missed call recovery"

    events = client.get("/api/v1/integration-events").json()
    assert len(events) >= 1
    assert events[0]["channel"] == "sms"


def test_practice_settings_can_be_updated(client):
    practices = client.get("/api/v1/practice-settings").json()
    practice_id = practices[0]["id"]

    response = client.patch(
        f"/api/v1/practice-settings/{practice_id}",
        json={
            "scheduling_mode": "availability_assist",
            "insurance_mode": "plan_lookup",
            "missed_call_recovery_enabled": True,
            "missed_call_recovery_message": "We saw your missed call.",
            "callback_sla_minutes": 30,
        },
    )

    assert response.status_code == 200
    updated = response.json()
    assert updated["scheduling_mode"] == "availability_assist"
    assert updated["insurance_mode"] == "plan_lookup"
    assert updated["callback_sla_minutes"] == 30


def test_integration_catalog_and_practice_settings_surface_connectors(client):
    catalog = client.get("/api/v1/integrations/catalog")
    assert catalog.status_code == 200
    items = {item["key"]: item for item in catalog.json()}
    assert items["sms"]["default_provider"] == "twilio_managed"
    assert items["crm"]["supported_providers"][0] == "hubspot"

    practice_id = client.get("/api/v1/practice-settings").json()[0]["id"]
    settings_response = client.get(f"/api/v1/practices/{practice_id}/integrations")
    assert settings_response.status_code == 200
    settings = {item["capability_key"]: item for item in settings_response.json()}
    assert settings["sms"]["provider"] == "twilio_managed"
    assert settings["sms"]["is_enabled"] is True
    assert settings["crm"]["provider"] == "generic_crm_stub"


def test_practice_integration_can_be_updated_to_hubspot(client):
    practice_id = client.get("/api/v1/practice-settings").json()[0]["id"]
    response = client.put(
        f"/api/v1/practices/{practice_id}/integrations/crm",
        json={
            "is_enabled": True,
            "provider": "hubspot",
            "config": {"pipeline_id": "pipeline_123", "location_id": "loc_001"},
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["provider"] == "hubspot"
    assert payload["config"]["pipeline_id"] == "pipeline_123"


def test_end_of_call_uses_vapi_enrichment_for_recording(client, monkeypatch):
    from app.api import routes

    monkeypatch.setattr(
        routes,
        "fetch_call_details",
        lambda call_id: {"id": call_id, "recordingUrl": "https://example.com/recording.wav"},
    )

    response = client.post(
        "/api/v1/vapi/end-of-call",
        json={
            "message": {
                "type": "end-of-call-report",
                "call": {"id": "call_with_recording", "phoneNumber": {"number": "+12282832484"}},
            },
            "analysis": {
                "a": {"name": "call_disposition", "result": "general_message"},
                "b": {"name": "urgency_level", "result": "routine"},
            },
        },
    )

    assert response.status_code == 200
    calls = client.get("/api/v1/calls").json()
    assert calls[0]["recording_url"] == "https://example.com/recording.wav"


def test_sms_integration_event_uses_twilio_managed_provider(client):
    response = client.post(
        "/api/v1/telephony/missed-call",
        json={
            "calledNumber": "+12282832484",
            "callerPhone": "+15125550000",
            "callerName": "Missed Caller",
        },
    )

    assert response.status_code == 200
    events = client.get("/api/v1/integration-events").json()
    sms_event = next(event for event in events if event["channel"] == "sms")
    assert sms_event["status"] == "processed"
    assert sms_event["max_attempts"] == 3


def test_end_of_call_falls_back_to_vapi_customer_phone(client):
    response = client.post(
        "/api/v1/vapi/end-of-call",
        json={
            "message": {
                "type": "end-of-call-report",
                "call": {
                    "id": "call_with_customer_number",
                    "phoneNumber": {"number": "+12282832484"},
                },
                "customer": {"number": "+12098143953"},
                "endedReason": "assistant ended call",
            },
            "analysis": {
                "a": {"name": "call_disposition", "result": "appointment_request"},
                "b": {"name": "urgency_level", "result": "routine"},
                "c": {"name": "caller_name", "result": "Rashid Samadhi"},
                "d": {"name": "call_summary", "result": "Caller requested an implant consult."},
            },
        },
    )

    assert response.status_code == 200
    calls = client.get("/api/v1/calls").json()
    assert calls[0]["caller_phone"] == "+12098143953"
    assert calls[0]["callback_tasks"][0]["callback_phone"] == "+12098143953"


def test_non_final_vapi_event_is_ignored(client):
    response = client.post(
        "/api/v1/vapi/end-of-call",
        json={
            "message": {
                "type": "status-update",
                "call": {"id": "call_in_progress", "phoneNumber": {"number": "+12282832484"}},
                "status": "in-progress",
            }
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "ignored"

    calls = client.get("/api/v1/calls").json()
    assert calls == []


def test_endcall_success_without_real_call_data_is_ignored(client):
    response = client.post(
        "/api/v1/vapi/end-of-call",
        json={
            "message": {
                "type": "end-of-call-report",
                "call": {"id": "call_placeholder", "phoneNumber": {"number": "+12282832484"}},
                "status": "in-progress",
            },
            "analysis": {
                "a": {"name": "endCall", "result": "Success."},
            },
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "ignored"


def test_vapi_webhook_secret_is_enforced(client, monkeypatch):
    from app.api import routes

    monkeypatch.setattr(routes.settings, "vapi_webhook_secret", "super-secret")

    unauthorized = client.post(
        "/api/v1/vapi/assistant-request",
        json={"message": {"type": "assistant-request", "call": {"phoneNumber": {"number": "+12282832484"}}}},
    )
    assert unauthorized.status_code == 401

    authorized = client.post(
        "/api/v1/vapi/assistant-request",
        headers={"Authorization": "Bearer super-secret"},
        json={"message": {"type": "assistant-request", "call": {"phoneNumber": {"number": "+12282832484"}}}},
    )
    assert authorized.status_code == 200


def test_failed_integration_event_is_marked_for_retry(client, monkeypatch):
    from app.services import integrations

    class AlwaysFailAdapter:
        provider = "always_fail"

        def process(self, db, event):
            raise RuntimeError("simulated delivery failure")

    monkeypatch.setitem(integrations.ADAPTERS, "always_fail", AlwaysFailAdapter())

    practice_id = client.get("/api/v1/practice-settings").json()[0]["id"]
    update_response = client.put(
        f"/api/v1/practices/{practice_id}/integrations/sms",
        json={
            "is_enabled": True,
            "provider": "twilio_managed",
            "config": {"provider": "twilio_managed"},
        },
    )
    assert update_response.status_code == 200

    monkeypatch.setattr(integrations, "resolve_provider", lambda db, event: "always_fail")

    client.post(
        "/api/v1/telephony/missed-call",
        json={
            "calledNumber": "+12282832484",
            "callerPhone": "+15125550001",
            "callerName": "Retry Me",
        },
    )

    events = client.get("/api/v1/integration-events").json()
    sms_event = next(event for event in events if event["channel"] == "sms")
    assert sms_event["status"] == "retry"
    assert sms_event["attempts"] == 1
    assert sms_event["next_attempt_at"] is not None


def test_process_pending_endpoint_processes_queued_events(client):
    response = client.post("/api/v1/integration-events/process-pending")
    assert response.status_code == 200
    assert "processed" in response.json()


def test_dashboard_summary_includes_repeat_callers_and_overdue_tasks(client):
    client.post(
        "/api/v1/vapi/end-of-call",
        json={
            "message": {
                "type": "end-of-call-report",
                "call": {"id": "repeat_1", "phoneNumber": {"number": "+12282832484"}},
                "customer": {"number": "+12098143953"},
                "endedReason": "assistant ended call",
            },
            "analysis": {
                "a": {"name": "call_disposition", "result": "appointment_request"},
                "b": {"name": "urgency_level", "result": "routine"},
                "c": {"name": "caller_name", "result": "Repeat Caller"},
                "d": {"name": "call_summary", "result": "First call."},
            },
        },
    )
    client.post(
        "/api/v1/vapi/end-of-call",
        json={
            "message": {
                "type": "end-of-call-report",
                "call": {"id": "repeat_2", "phoneNumber": {"number": "+12282832484"}},
                "customer": {"number": "+12098143953"},
                "endedReason": "assistant ended call",
            },
            "analysis": {
                "a": {"name": "call_disposition", "result": "general_message"},
                "b": {"name": "urgency_level", "result": "routine"},
                "c": {"name": "caller_name", "result": "Repeat Caller"},
                "d": {"name": "call_summary", "result": "Second call."},
            },
        },
    )

    from app.db import SessionLocal
    from app.models import CallbackTask
    from datetime import datetime, timedelta, timezone

    db = SessionLocal()
    try:
        task = db.query(CallbackTask).first()
        task.created_at = datetime.now(timezone.utc) - timedelta(hours=2)
        db.commit()
    finally:
        db.close()

    response = client.get("/api/v1/dashboard/summary")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["repeat_callers"]) >= 1
    assert len(payload["overdue_callback_tasks"]) >= 1


def test_onboarding_overview_returns_checklist(client):
    practice_id = client.get("/api/v1/practice-settings").json()[0]["id"]
    response = client.get(f"/api/v1/practices/{practice_id}/onboarding")
    assert response.status_code == 200
    payload = response.json()
    assert payload["practice_id"] == practice_id
    assert payload["total_steps"] >= 1
    assert len(payload["checklist"]) == payload["total_steps"]


def test_operations_feed_and_routing_rules_are_available(client):
    practice_id = client.get("/api/v1/practice-settings").json()[0]["id"]
    feed = client.get("/api/v1/operations/feed")
    assert feed.status_code == 200

    rules = client.get(f"/api/v1/practices/{practice_id}/routing-rules")
    assert rules.status_code == 200
    assert len(rules.json()) >= 1


def test_call_actions_mark_handled_and_schedule_callback(client):
    create = client.post(
        "/api/v1/vapi/end-of-call",
        json={
            "message": {
                "type": "end-of-call-report",
                "call": {"id": "action_call", "phoneNumber": {"number": "+12282832484"}},
                "customer": {"number": "+12098143953"},
                "endedReason": "assistant ended call",
            },
            "analysis": {
                "a": {"name": "call_disposition", "result": "general_message"},
                "b": {"name": "urgency_level", "result": "routine"},
                "c": {"name": "call_summary", "result": "Manual action test call."},
            },
        },
    )
    assert create.status_code == 200
    call_id = create.json()["callId"]

    mark = client.post(f"/api/v1/calls/{call_id}/actions", json={"action": "mark_handled"})
    assert mark.status_code == 200
    assert mark.json()["reviewStatus"] == "handled"

    schedule = client.post(
        f"/api/v1/calls/{call_id}/actions",
        json={"action": "schedule_callback", "note": "Call tomorrow morning"},
    )
    assert schedule.status_code == 200
    assert schedule.json()["callbackTaskId"]
