from __future__ import annotations

from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class IntegrationCapability:
    key: str
    label: str
    ownership: str
    description: str
    supported_providers: list[str]
    default_provider: str
    onboarding_fields: list[str]


CATALOG: dict[str, IntegrationCapability] = {
    "sms": IntegrationCapability(
        key="sms",
        label="Messaging",
        ownership="platform",
        description="Platform-owned Twilio messaging for missed-call recovery, callback notifications, and follow-up texts.",
        supported_providers=["twilio_managed"],
        default_provider="twilio_managed",
        onboarding_fields=["sender_number", "brand_name", "reply_to_phone"],
    ),
    "crm": IntegrationCapability(
        key="crm",
        label="CRM",
        ownership="practice",
        description="Push callback tasks and leads into the practice's CRM or pipeline tool.",
        supported_providers=["hubspot", "go_high_level", "salesforce", "generic_crm_stub"],
        default_provider="generic_crm_stub",
        onboarding_fields=["api_key", "location_id", "pipeline_id", "owner_mapping"],
    ),
    "scheduling": IntegrationCapability(
        key="scheduling",
        label="Scheduling",
        ownership="practice",
        description="Read availability or capture scheduling requests depending on the office's stack.",
        supported_providers=["manual_capture", "api_calendar", "pms_bridge"],
        default_provider="manual_capture",
        onboarding_fields=["mode", "read_only", "calendar_id", "location_id"],
    ),
    "insurance": IntegrationCapability(
        key="insurance",
        label="Insurance",
        ownership="practice",
        description="Control how insurance questions are answered, from generic PPO messaging to payer lookup.",
        supported_providers=["generic_capture", "plan_lookup", "eligibility_bridge"],
        default_provider="generic_capture",
        onboarding_fields=["mode", "accepted_plan_list_url", "payer_group"],
    ),
    "internal_alert": IntegrationCapability(
        key="internal_alert",
        label="Staff Alerts",
        ownership="platform",
        description="Platform-managed internal alerts for urgent calls, missed callbacks, and queue escalations.",
        supported_providers=["platform_internal_alerts", "slack_webhook", "email_digest"],
        default_provider="email_digest",
        onboarding_fields=["alert_email", "urgent_sms_number", "morning_digest_recipients", "slack_webhook_url"],
    ),
}


def list_integration_capabilities() -> list[dict]:
    return [asdict(item) for item in CATALOG.values()]


def get_integration_capability(key: str) -> IntegrationCapability | None:
    return CATALOG.get(key)
