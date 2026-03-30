from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import IntegrationSetting, Practice
from app.services.integration_catalog import CATALOG, get_integration_capability


def _default_config(practice: Practice, capability_key: str) -> dict:
    capability = get_integration_capability(capability_key)
    default_provider = capability.default_provider if capability else capability_key

    if capability_key == "sms":
        return {
            "provider": default_provider,
            "brand_name": practice.practice_name,
            "reply_to_phone": practice.emergency_number,
            "sender_number": None,
        }
    if capability_key == "crm":
        return {
            "provider": default_provider,
            "pipeline_id": None,
            "location_id": None,
            "owner_mapping": {},
        }
    if capability_key == "scheduling":
        return {
            "provider": default_provider,
            "mode": practice.scheduling_mode,
            "read_only": True,
        }
    if capability_key == "insurance":
        return {
            "provider": default_provider,
            "mode": practice.insurance_mode,
            "accepted_plan_list_url": None,
        }
    if capability_key == "internal_alert":
        return {
            "provider": default_provider,
            "alert_email": None,
            "urgent_sms_number": practice.emergency_number,
            "morning_digest_recipients": [],
        }
    return {"provider": default_provider}


def ensure_practice_integration_settings(db: Session, practice: Practice) -> list[IntegrationSetting]:
    existing = {
        setting.channel: setting
        for setting in db.scalars(
            select(IntegrationSetting).where(IntegrationSetting.practice_id == practice.id)
        ).all()
    }

    created = False
    for capability_key in CATALOG:
        if capability_key in existing:
            continue
        setting = IntegrationSetting(
            practice_id=practice.id,
            channel=capability_key,
            is_enabled=capability_key in {"sms", "internal_alert"},
            config_json=_default_config(practice, capability_key),
        )
        db.add(setting)
        existing[capability_key] = setting
        created = True

    if created:
        db.commit()
        for setting in existing.values():
            db.refresh(setting)

    return [existing[key] for key in CATALOG]


def upsert_practice_integration_setting(
    db: Session,
    practice: Practice,
    capability_key: str,
    *,
    is_enabled: bool,
    provider: str,
    config: dict | None,
) -> IntegrationSetting:
    capability = get_integration_capability(capability_key)
    if not capability:
        raise ValueError(f"Unsupported integration capability: {capability_key}")
    if provider not in capability.supported_providers:
        raise ValueError(f"Provider {provider} is not supported for {capability_key}")

    setting = db.scalar(
        select(IntegrationSetting).where(
            IntegrationSetting.practice_id == practice.id,
            IntegrationSetting.channel == capability_key,
        )
    )
    merged_config = {
        **_default_config(practice, capability_key),
        **(setting.config_json or {} if setting and setting.config_json else {}),
        **(config or {}),
        "provider": provider,
    }
    if not setting:
        setting = IntegrationSetting(
            practice_id=practice.id,
            channel=capability_key,
            is_enabled=is_enabled,
            config_json=merged_config,
        )
        db.add(setting)
    else:
        setting.is_enabled = is_enabled
        setting.config_json = merged_config

    db.commit()
    db.refresh(setting)
    return setting
