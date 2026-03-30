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
