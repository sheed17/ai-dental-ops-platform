from __future__ import annotations

from typing import Any

import httpx

from app.core.config import settings


def fetch_call_details(call_id: str | None) -> dict[str, Any] | None:
    if not call_id or not settings.vapi_api_token:
        return None

    headers = {
        "Authorization": f"Bearer {settings.vapi_api_token}",
        "Content-Type": "application/json",
    }

    url = f"{settings.vapi_api_base_url.rstrip('/')}/call/{call_id}"
    try:
        response = httpx.get(url, headers=headers, timeout=10.0)
        response.raise_for_status()
        payload = response.json()
        return payload if isinstance(payload, dict) else None
    except httpx.HTTPError:
        return None


def fetch_assistant_details(assistant_id: str | None) -> dict[str, Any] | None:
    if not assistant_id or not settings.vapi_api_token:
        return None

    headers = {
        "Authorization": f"Bearer {settings.vapi_api_token}",
        "Content-Type": "application/json",
    }

    url = f"{settings.vapi_api_base_url.rstrip('/')}/assistant/{assistant_id}"
    try:
        response = httpx.get(url, headers=headers, timeout=10.0)
        response.raise_for_status()
        payload = response.json()
        return payload if isinstance(payload, dict) else None
    except httpx.HTTPError:
        return None


def update_assistant(assistant_id: str | None, payload: dict[str, Any]) -> dict[str, Any] | None:
    if not assistant_id or not settings.vapi_api_token:
        return None

    headers = {
        "Authorization": f"Bearer {settings.vapi_api_token}",
        "Content-Type": "application/json",
    }

    url = f"{settings.vapi_api_base_url.rstrip('/')}/assistant/{assistant_id}"
    try:
        response = httpx.patch(url, headers=headers, json=payload, timeout=10.0)
        response.raise_for_status()
        body = response.json()
        return body if isinstance(body, dict) else None
    except httpx.HTTPError:
        return None
