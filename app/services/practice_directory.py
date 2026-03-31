from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Practice, PracticePhoneNumber, RoutingRule


@dataclass(frozen=True)
class SeedPracticeConfig:
    phone_number: str
    practice_name: str
    office_hours: str
    address: str
    website: str
    emergency_number: str
    services_summary: str
    insurance_summary: str
    same_day_emergency_policy: str
    languages: str
    scheduling_mode: str = "message_only"
    insurance_mode: str = "generic"
    missed_call_recovery_enabled: bool = True
    missed_call_recovery_message: str = "Thanks for calling {{practiceName}}. We missed your call and will follow up when the office opens."
    callback_sla_minutes: int = 60


SEED_PRACTICES: tuple[SeedPracticeConfig, ...] = (
    SeedPracticeConfig(
        phone_number="+12282832484",
        practice_name="Bright Smile Dental",
        office_hours="Monday through Friday, 8:00 AM to 5:00 PM",
        address="123 Main St, Austin, TX 78701",
        website="https://www.brightsmiledental.com",
        emergency_number="+12282832484",
        services_summary="general dentistry, cleanings, crowns, implants, and emergency care",
        insurance_summary="We accept most major PPO plans. Coverage details must be confirmed by the office.",
        same_day_emergency_policy="Same-day emergency appointments may be available depending on clinical review.",
        languages="English and Spanish",
        scheduling_mode="message_only",
        insurance_mode="generic",
        missed_call_recovery_enabled=True,
        missed_call_recovery_message="Thanks for calling {{practiceName}}. We missed your call and will follow up when the office opens.",
        callback_sla_minutes=60,
    ),
)


def normalize_phone_number(phone: str | None) -> str:
    if not phone:
        return ""

    digits = "".join(character for character in str(phone) if character.isdigit())
    if not digits:
        return ""
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    if len(digits) == 10:
        return f"+1{digits}"
    if str(phone).startswith("+"):
        return str(phone)
    return f"+{digits}"


def seed_practices(db: Session) -> None:
    for seed in SEED_PRACTICES:
        existing_phone = db.scalar(select(PracticePhoneNumber).where(PracticePhoneNumber.phone_number == seed.phone_number))
        if existing_phone:
            continue

        practice = Practice(
            practice_name=seed.practice_name,
            office_hours=seed.office_hours,
            address=seed.address,
            website=seed.website,
            emergency_number=seed.emergency_number,
            services_summary=seed.services_summary,
            insurance_summary=seed.insurance_summary,
            same_day_emergency_policy=seed.same_day_emergency_policy,
            languages=seed.languages,
            scheduling_mode=seed.scheduling_mode,
            insurance_mode=seed.insurance_mode,
            missed_call_recovery_enabled=seed.missed_call_recovery_enabled,
            missed_call_recovery_message=seed.missed_call_recovery_message,
            callback_sla_minutes=seed.callback_sla_minutes,
        )
        db.add(practice)
        db.flush()
        db.add(
            PracticePhoneNumber(
                practice_id=practice.id,
                phone_number=seed.phone_number,
                label="primary",
                is_primary=True,
            )
        )
        db.flush()
        db.add_all(
            [
                RoutingRule(
                    practice_id=practice.id,
                    name="Urgent after-hours alert",
                    trigger_event="call.completed",
                    condition_json={"urgency": "urgent"},
                    action_json={"channel": "internal_alert", "event_type": "urgent_call_alert"},
                    is_enabled=True,
                ),
                RoutingRule(
                    practice_id=practice.id,
                    name="Booking request follow-up",
                    trigger_event="call.completed",
                    condition_json={"disposition": "appointment_request"},
                    action_json={"channel": "crm", "event_type": "lead_or_callback_sync"},
                    is_enabled=True,
                ),
                RoutingRule(
                    practice_id=practice.id,
                    name="Overdue callback manager ping",
                    trigger_event="callback.overdue",
                    condition_json={"minutes_overdue": 60},
                    action_json={"channel": "sms", "event_type": "staff_callback_notification"},
                    is_enabled=False,
                ),
                RoutingRule(
                    practice_id=practice.id,
                    name="Patient replied after hours",
                    trigger_event="messaging.inbound_reply",
                    condition_json=None,
                    action_json={"channel": "internal_alert", "event_type": "patient_reply_alert"},
                    is_enabled=True,
                ),
            ]
        )

    db.commit()


def get_practice_by_phone(db: Session, phone: str | None) -> tuple[str, Practice | None]:
    normalized_phone = normalize_phone_number(phone)
    if not normalized_phone:
        return "", None

    stmt = (
        select(Practice)
        .join(PracticePhoneNumber, PracticePhoneNumber.practice_id == Practice.id)
        .where(PracticePhoneNumber.phone_number == normalized_phone)
    )
    practice = db.scalar(stmt)
    return normalized_phone, practice


def get_default_practice(db: Session) -> Practice | None:
    return db.scalar(select(Practice).limit(1))
