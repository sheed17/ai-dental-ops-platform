from __future__ import annotations

from dataclasses import dataclass
from typing import Any


def _walk(value: Any):
    if isinstance(value, dict):
        yield value
        for nested in value.values():
            yield from _walk(nested)
    elif isinstance(value, list):
        for item in value:
            yield from _walk(item)


def extract_message_type(payload: dict[str, Any]) -> str | None:
    message = payload.get("message")
    if isinstance(message, dict):
        value = message.get("type")
        if isinstance(value, str):
            return value
    return None


def extract_called_number(payload: dict[str, Any]) -> str | None:
    paths = (
        ("message", "call", "phoneNumber", "number"),
        ("call", "phoneNumber", "number"),
        ("phoneNumber", "number"),
    )
    for path in paths:
        current: Any = payload
        for key in path:
            if isinstance(current, dict):
                current = current.get(key)
            else:
                current = None
                break
        if isinstance(current, str):
            return current
    return None


def extract_structured_outputs(payload: dict[str, Any]) -> dict[str, Any]:
    outputs: dict[str, Any] = {}
    for node in _walk(payload):
        name = node.get("name")
        if isinstance(name, str) and "result" in node:
            outputs[name] = node.get("result")
    return outputs


def extract_transcript(payload: dict[str, Any]) -> str | None:
    transcript_lines: list[str] = []

    for key in ("messages", "transcript"):
        candidate = payload.get(key)
        if isinstance(candidate, list):
            for item in candidate:
                if not isinstance(item, dict):
                    continue
                role = item.get("role") or item.get("speaker") or item.get("name")
                text = item.get("message") or item.get("content") or item.get("text")
                if isinstance(text, list):
                    text = " ".join(str(part) for part in text if part)
                if role and text:
                    transcript_lines.append(f"{role}: {text}")
            if transcript_lines:
                return "\n".join(transcript_lines)

    transcript = payload.get("transcript")
    if isinstance(transcript, str):
        return transcript
    return None


def extract_recording_url(payload: dict[str, Any]) -> str | None:
    for node in _walk(payload):
        if isinstance(node.get("recordingUrl"), str):
            return node["recordingUrl"]
        if isinstance(node.get("stereoRecordingUrl"), str):
            return node["stereoRecordingUrl"]
        if node.get("artifactType") == "recording" and isinstance(node.get("url"), str):
            return node["url"]
    return None


def merge_webhook_with_enrichment(webhook_payload: dict[str, Any], enriched_payload: dict[str, Any] | None) -> dict[str, Any]:
    if not enriched_payload:
        return webhook_payload
    return {
        **enriched_payload,
        "webhook": webhook_payload,
        "analysis": webhook_payload.get("analysis", enriched_payload.get("analysis")),
        "messages": webhook_payload.get("messages", enriched_payload.get("messages")),
        "message": webhook_payload.get("message", enriched_payload.get("message")),
        "call": webhook_payload.get("call", enriched_payload.get("call")),
    }


def extract_vapi_call_id(payload: dict[str, Any]) -> str | None:
    for path in (("message", "call", "id"), ("call", "id"), ("id",)):
        current: Any = payload
        for key in path:
            if isinstance(current, dict):
                current = current.get(key)
            else:
                current = None
                break
        if isinstance(current, str):
            return current
    return None


def extract_duration_seconds(payload: dict[str, Any]) -> int | None:
    for node in _walk(payload):
        for key in ("durationSeconds", "duration"):
            value = node.get(key)
            if isinstance(value, int):
                return value
    return None


def extract_ended_reason(payload: dict[str, Any]) -> str | None:
    for key in ("endedReason", "status", "reason"):
        value = payload.get(key)
        if isinstance(value, str):
            return value
    message = payload.get("message")
    if isinstance(message, dict):
        for key in ("endedReason", "status"):
            value = message.get(key)
            if isinstance(value, str):
                return value
    return None


def is_final_vapi_call_payload(payload: dict[str, Any], enriched_payload: dict[str, Any] | None = None) -> bool:
    candidates: list[str] = []

    for source in (payload, enriched_payload or {}):
        ended_reason = extract_ended_reason(source)
        if ended_reason:
            candidates.append(ended_reason.lower())

        message = source.get("message")
        if isinstance(message, dict):
            message_type = message.get("type")
            if isinstance(message_type, str):
                candidates.append(message_type.lower())

    if any(value in {"assistant ended call", "customer ended call", "assistant-ended-call", "customer-ended-call"} for value in candidates):
        return True

    if any("end-of-call" in value or "completed" in value for value in candidates):
        return True

    if any(value in {"in-progress", "queued", "ringing", "status-update", "assistant-request"} for value in candidates):
        return False

    merged_payload = merge_webhook_with_enrichment(payload, enriched_payload)
    outputs = extract_structured_outputs(merged_payload)
    transcript = extract_transcript(merged_payload)
    recording_url = extract_recording_url(merged_payload)

    return bool(outputs or transcript or recording_url)


@dataclass
class CanonicalCallData:
    vapi_call_id: str | None
    caller_name: str | None
    caller_phone: str | None
    disposition: str
    urgency: str
    reason_for_call: str | None
    message_for_staff: str | None
    call_summary: str | None
    transcript: str | None
    recording_url: str | None
    duration_seconds: int | None
    ended_reason: str | None
    needs_callback: bool
    needs_incident: bool
    structured_outputs: dict[str, Any]
    raw_payload: dict[str, Any]


def normalize_vapi_end_of_call(payload: dict[str, Any]) -> CanonicalCallData:
    outputs = extract_structured_outputs(payload)
    disposition = str(outputs.get("call_disposition") or "other")
    urgency = str(outputs.get("urgency_level") or ("urgent" if outputs.get("flag_urgent") else "routine"))
    caller_name = outputs.get("caller_name")
    caller_phone = outputs.get("caller_phone")
    reason = outputs.get("reason_for_call")
    message_for_staff = outputs.get("message_for_staff")
    call_summary = outputs.get("call_summary")
    flag_urgent = bool(outputs.get("flag_urgent"))

    needs_incident = flag_urgent or urgency in {"urgent", "emergency"}
    needs_callback = (
        needs_incident
        or disposition in {
            "appointment_request",
            "cancellation",
            "reschedule",
            "billing_question",
            "insurance_question",
            "prescription_request",
            "general_message",
            "general_info",
        }
        or not bool(caller_phone)
    )

    return CanonicalCallData(
        vapi_call_id=extract_vapi_call_id(payload),
        caller_name=str(caller_name) if caller_name else None,
        caller_phone=str(caller_phone) if caller_phone else None,
        disposition=disposition,
        urgency=urgency,
        reason_for_call=str(reason) if reason else None,
        message_for_staff=str(message_for_staff) if message_for_staff else None,
        call_summary=str(call_summary) if call_summary else None,
        transcript=extract_transcript(payload),
        recording_url=extract_recording_url(payload),
        duration_seconds=extract_duration_seconds(payload),
        ended_reason=extract_ended_reason(payload),
        needs_callback=needs_callback,
        needs_incident=needs_incident,
        structured_outputs=outputs,
        raw_payload=payload,
    )
