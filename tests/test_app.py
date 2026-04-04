def test_assistant_selector_returns_resolved_assistant_overrides(client):
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
    assert payload["assistantOverrides"]["firstMessage"] == "Hi, thank you for calling Bright Smile Dental. This is Clara. The office is currently closed. How can I help you?"
    system_prompt = payload["assistantOverrides"]["model"]["messages"][0]["content"]
    assert "{{practiceName}}" not in system_prompt
    assert "Bright Smile Dental" in system_prompt
    assert "general dentistry" in system_prompt


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


def test_extract_duration_seconds_ignores_unreliable_long_values():
    from app.services.normalization import extract_duration_seconds

    assert extract_duration_seconds({"message": {"call": {"durationSeconds": 3600}}}) is None
    assert extract_duration_seconds({"call": {"durationMs": 5_840_000}}) is None


def test_extract_duration_seconds_accepts_explicit_short_values():
    from app.services.normalization import extract_duration_seconds

    assert extract_duration_seconds({"message": {"call": {"durationSeconds": 271}}}) == 271
    assert extract_duration_seconds({"call": {"durationMs": 91_000}}) == 91


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
            "practice_name": "Sunrise Dental Studio",
            "office_hours": "Mon-Thu 8am-6pm, Fri 8am-2pm",
            "address": "123 Main St, San Jose, CA",
            "website": "https://sunrisedental.example.com",
            "emergency_number": "+14085550199",
            "services_summary": "General dentistry, implants, emergency visits",
            "insurance_summary": "We accept most PPO plans and confirm details with the office.",
            "same_day_emergency_policy": "Urgent pain or swelling should be escalated for same-day review.",
            "languages": "English, Spanish",
            "scheduling_mode": "availability_assist",
            "insurance_mode": "plan_lookup",
            "missed_call_recovery_enabled": True,
            "missed_call_recovery_message": "We saw your missed call.",
            "callback_sla_minutes": 30,
        },
    )

    assert response.status_code == 200
    updated = response.json()
    assert updated["practice_name"] == "Sunrise Dental Studio"
    assert updated["office_hours"] == "Mon-Thu 8am-6pm, Fri 8am-2pm"
    assert updated["website"] == "https://sunrisedental.example.com"
    assert updated["scheduling_mode"] == "availability_assist"
    assert updated["insurance_mode"] == "plan_lookup"
    assert updated["callback_sla_minutes"] == 30


def test_practice_assistant_context_returns_live_variable_values(client):
    practice_id = client.get("/api/v1/practice-settings").json()[0]["id"]

    response = client.get(f"/api/v1/practice-settings/{practice_id}/assistant-context")

    assert response.status_code == 200
    payload = response.json()
    assert payload["practice_id"] == practice_id
    assert payload["routing_number"] == "+12282832484"
    assert payload["routing_mode"] == "always_forward"
    assert payload["routing_active"] is True
    assert payload["variable_values"]["practiceName"] == "Bright Smile Dental"
    assert payload["variable_values"]["officeHours"]


def test_assistant_request_respects_after_hours_only_routing(client):
    practice_id = client.get("/api/v1/practice-settings").json()[0]["id"]
    phone_numbers = client.get(f"/api/v1/practices/{practice_id}/phone-numbers").json()
    primary_number = phone_numbers[0]

    update_response = client.put(
        f"/api/v1/practices/{practice_id}/phone-numbers/{primary_number['id']}",
        json={
            "label": primary_number["label"],
            "is_primary": True,
            "routing_mode": "after_hours_only",
            "forward_to_number": primary_number["forward_to_number"],
            "voice_enabled": True,
            "sms_enabled": True,
        },
    )
    assert update_response.status_code == 200

    business_hours_response = client.post(
        "/api/v1/vapi/assistant-request",
        json={
            "message": {
                "type": "assistant-request",
                "call": {"phoneNumber": {"number": "+12282832484"}},
            },
            "debug": {"currentTime": "2026-04-03T14:00:00-07:00"},
        },
    )
    assert business_hours_response.status_code == 200
    business_hours_payload = business_hours_response.json()
    assert business_hours_payload["assistantOverrides"]["variableValues"] == {}
    assert "wait until the practice is closed" in business_hours_payload["debug"]["routingReason"]

    after_hours_response = client.post(
        "/api/v1/vapi/assistant-request",
        json={
            "message": {
                "type": "assistant-request",
                "call": {"phoneNumber": {"number": "+12282832484"}},
            },
            "debug": {"currentTime": "2026-04-03T21:00:00-07:00"},
        },
    )
    assert after_hours_response.status_code == 200
    after_hours_payload = after_hours_response.json()
    assert after_hours_payload["assistantOverrides"]["variableValues"]["practiceName"] == "Bright Smile Dental"
    assert "Bright Smile Dental" in after_hours_payload["assistantOverrides"]["firstMessage"]


def test_assistant_context_reports_routing_activity_for_simulated_time(client):
    practice_id = client.get("/api/v1/practice-settings").json()[0]["id"]
    phone_numbers = client.get(f"/api/v1/practices/{practice_id}/phone-numbers").json()
    primary_number = phone_numbers[0]

    client.put(
        f"/api/v1/practices/{practice_id}/phone-numbers/{primary_number['id']}",
        json={
            "label": primary_number["label"],
            "is_primary": True,
            "routing_mode": "after_hours_only",
            "forward_to_number": primary_number["forward_to_number"],
            "voice_enabled": True,
            "sms_enabled": True,
        },
    )

    response = client.get(
        f"/api/v1/practice-settings/{practice_id}/assistant-context",
        params={"current_time": "2026-04-03T14:00:00-07:00"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["routing_active"] is False
    assert payload["routing_mode"] == "after_hours_only"


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


def test_internal_alert_integration_can_be_updated_to_slack(client):
    practice_id = client.get("/api/v1/practice-settings").json()[0]["id"]
    response = client.put(
        f"/api/v1/practices/{practice_id}/integrations/internal_alert",
        json={
            "is_enabled": True,
            "provider": "slack_webhook",
            "config": {"slack_webhook_url": "https://hooks.slack.test/services/123"},
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["provider"] == "slack_webhook"
    assert payload["config"]["slack_webhook_url"] == "https://hooks.slack.test/services/123"


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


def test_slack_alert_provider_processes_internal_alert_event(client, monkeypatch):
    from app.services import integrations

    captured: dict = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

    def fake_post(url, json, timeout):
        captured["url"] = url
        captured["json"] = json
        return FakeResponse()

    monkeypatch.setattr(integrations.httpx, "post", fake_post)

    practice_id = client.get("/api/v1/practice-settings").json()[0]["id"]
    response = client.put(
        f"/api/v1/practices/{practice_id}/integrations/internal_alert",
        json={
            "is_enabled": True,
            "provider": "slack_webhook",
            "config": {"slack_webhook_url": "https://hooks.slack.test/services/123"},
        },
    )
    assert response.status_code == 200

    client.post(
        "/api/v1/vapi/end-of-call",
        json={
            "message": {
                "type": "end-of-call-report",
                "call": {"id": "urgent_slack_alert", "phoneNumber": {"number": "+12282832484"}},
                "customer": {"number": "+12098143953"},
                "endedReason": "assistant ended call",
            },
            "analysis": {
                "a": {"name": "call_disposition", "result": "urgent_dental"},
                "b": {"name": "urgency_level", "result": "urgent"},
                "c": {"name": "flag_urgent", "result": True},
                "d": {"name": "call_summary", "result": "Urgent tooth pain."},
            },
        },
    )

    assert captured["url"] == "https://hooks.slack.test/services/123"
    assert "Urgent" in captured["json"]["text"] or "urgent" in captured["json"]["text"]


def test_email_alert_provider_processes_internal_alert_event(client, monkeypatch):
    from app.services import integrations

    sent_messages: list[dict] = []

    class FakeSMTP:
        def __init__(self, host, port, timeout):
            sent_messages.append({"host": host, "port": port, "timeout": timeout})
        def __enter__(self):
            return self
        def __exit__(self, exc_type, exc, tb):
            return False
        def starttls(self):
            sent_messages.append({"tls": True})
        def login(self, username, password):
            sent_messages.append({"username": username, "password": password})
        def send_message(self, message):
            sent_messages.append({"to": message["To"], "subject": message["Subject"]})

    monkeypatch.setattr(integrations.smtplib, "SMTP", FakeSMTP)
    monkeypatch.setattr(integrations.settings, "smtp_host", "smtp.example.com")
    monkeypatch.setattr(integrations.settings, "smtp_port", 587)
    monkeypatch.setattr(integrations.settings, "smtp_username", "user")
    monkeypatch.setattr(integrations.settings, "smtp_password", "pass")
    monkeypatch.setattr(integrations.settings, "smtp_use_tls", True)
    monkeypatch.setattr(integrations.settings, "smtp_from_email", "support@tryneyma.com")

    practice_id = client.get("/api/v1/practice-settings").json()[0]["id"]
    response = client.put(
        f"/api/v1/practices/{practice_id}/integrations/internal_alert",
        json={
            "is_enabled": True,
            "provider": "email_digest",
            "config": {"alert_email": "frontdesk@example.com"},
        },
    )
    assert response.status_code == 200

    client.post(
        "/api/v1/vapi/end-of-call",
        json={
            "message": {
                "type": "end-of-call-report",
                "call": {"id": "urgent_email_alert", "phoneNumber": {"number": "+12282832484"}},
                "customer": {"number": "+12098143953"},
                "endedReason": "assistant ended call",
            },
            "analysis": {
                "a": {"name": "call_disposition", "result": "urgent_dental"},
                "b": {"name": "urgency_level", "result": "urgent"},
                "c": {"name": "flag_urgent", "result": True},
                "d": {"name": "call_summary", "result": "Urgent swelling and pain."},
            },
        },
    )

    assert any(item.get("to") == "frontdesk@example.com" for item in sent_messages)


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
    assert any(item["key"] == "modules" for item in payload["checklist"])


def test_practice_modules_can_be_listed_and_updated(client):
    practice_id = client.get("/api/v1/practice-settings").json()[0]["id"]
    modules = client.get(f"/api/v1/practices/{practice_id}/modules")
    assert modules.status_code == 200
    assert any(module["module_key"] == "after_hours" for module in modules.json())

    updated = client.put(
        f"/api/v1/practices/{practice_id}/modules/booking",
        json={"is_enabled": False, "config_json": {"label": "Booking Assistant"}},
    )
    assert updated.status_code == 200
    assert updated.json()["module_key"] == "booking"
    assert updated.json()["is_enabled"] is False


def test_practice_phone_numbers_can_be_listed_created_and_promoted(client):
    practice_id = client.get("/api/v1/practice-settings").json()[0]["id"]

    listed = client.get(f"/api/v1/practices/{practice_id}/phone-numbers")
    assert listed.status_code == 200
    assert len(listed.json()) >= 1
    assert any(item["is_primary"] is True for item in listed.json())

    created = client.post(
        f"/api/v1/practices/{practice_id}/phone-numbers",
        json={"phone_number": "(512) 555-9000", "label": "north office", "is_primary": False},
    )
    assert created.status_code == 200
    created_payload = created.json()
    assert created_payload["phone_number"] == "+15125559000"
    assert created_payload["label"] == "north office"
    assert created_payload["is_primary"] is False
    assert created_payload["routing_mode"] == "always_forward"
    assert created_payload["voice_enabled"] is True
    assert created_payload["sms_enabled"] is True

    promoted = client.post(f"/api/v1/practices/{practice_id}/phone-numbers/{created_payload['id']}/make-primary")
    assert promoted.status_code == 200
    assert promoted.json()["is_primary"] is True

    updated = client.put(
        f"/api/v1/practices/{practice_id}/phone-numbers/{created_payload['id']}",
        json={
            "label": "after hours line",
            "is_primary": True,
            "routing_mode": "business_hours_only",
            "forward_to_number": "(408) 555-0102",
            "voice_enabled": True,
            "sms_enabled": False,
        },
    )
    assert updated.status_code == 200
    assert updated.json()["routing_mode"] == "business_hours_only"
    assert updated.json()["forward_to_number"] == "+14085550102"
    assert updated.json()["sms_enabled"] is False

    relisted = client.get(f"/api/v1/practices/{practice_id}/phone-numbers").json()
    assert sum(1 for item in relisted if item["is_primary"]) == 1
    assert any(item["id"] == created_payload["id"] and item["is_primary"] is True for item in relisted)


def test_operations_feed_and_routing_rules_are_available(client):
    practice_id = client.get("/api/v1/practice-settings").json()[0]["id"]
    feed = client.get("/api/v1/operations/feed")
    assert feed.status_code == 200

    rules = client.get(f"/api/v1/practices/{practice_id}/routing-rules")
    assert rules.status_code == 200
    assert len(rules.json()) >= 1

    events = client.get("/api/v1/events")
    assert events.status_code == 200


def test_platform_checklist_surfaces_built_and_pending_items(client):
    response = client.get("/api/v1/platform/checklist")
    assert response.status_code == 200
    payload = response.json()
    assert any(item["key"] == "event_abstraction" for item in payload["built"])
    assert any(item["key"] == "crm_live" for item in payload["pending"])


def test_twilio_inbound_message_creates_communication_and_updates_task(client):
    create = client.post(
        "/api/v1/telephony/missed-call",
        json={
            "calledNumber": "+12282832484",
            "callerPhone": "+15125550123",
            "callerName": "Reply Person",
        },
    )
    assert create.status_code == 200

    inbound = client.post(
        "/api/v1/twilio/inbound-message",
        json={
            "To": "+12282832484",
            "From": "+15125550123",
            "Body": "Call me tomorrow morning please",
            "MessageSid": "SM123",
        },
    )
    assert inbound.status_code == 200
    body = inbound.json()
    assert body["status"] == "stored"

    communications = client.get("/api/v1/communications")
    assert communications.status_code == 200
    assert communications.json()[0]["direction"] == "inbound"

    tasks = client.get("/api/v1/callback-tasks").json()
    assert tasks[0]["status"] == "in_progress"
    assert "Call me tomorrow morning please" in (tasks[0]["internal_notes"] or "")


def test_recovery_automation_queues_follow_up_for_overdue_callback(client):
    create = client.post(
        "/api/v1/telephony/missed-call",
        json={
            "calledNumber": "+12282832484",
            "callerPhone": "+15125550124",
            "callerName": "Overdue Person",
        },
    )
    assert create.status_code == 200

    from app.db import SessionLocal
    from app.models import CallbackTask
    from datetime import datetime, timedelta, timezone

    db = SessionLocal()
    try:
        task = db.query(CallbackTask).first()
        task.created_at = datetime.now(timezone.utc) - timedelta(hours=3)
        db.commit()
    finally:
        db.close()

    response = client.post("/api/v1/automation/recovery/run")
    assert response.status_code == 200
    payload = response.json()
    assert payload["processed_tasks"] >= 1

    events = client.get("/api/v1/integration-events").json()
    assert any(event["event_type"] == "callback_recovery_follow_up" for event in events)


def test_operations_feed_includes_communication_events(client):
    client.post(
        "/api/v1/telephony/missed-call",
        json={
            "calledNumber": "+12282832484",
            "callerPhone": "+15125550125",
            "callerName": "Timeline Person",
        },
    )
    client.post(
        "/api/v1/twilio/inbound-message",
        json={
            "To": "+12282832484",
            "From": "+15125550125",
            "Body": "Need help booking",
        },
    )

    feed = client.get("/api/v1/operations/feed").json()
    assert any(item["item_type"] == "patient.replied" for item in feed)


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
