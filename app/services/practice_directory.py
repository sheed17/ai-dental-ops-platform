from dataclasses import dataclass
from datetime import datetime
import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Practice, PracticePhoneNumber, RoutingRule
from app.services.platform import ensure_practice_modules


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
        db.flush()
        ensure_practice_modules(db, practice, commit=False)

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


def parse_debug_time(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        normalized = value.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
        return parsed.astimezone() if parsed.tzinfo else parsed.astimezone()
    except ValueError:
        return None


def is_practice_open(office_hours: str, current_time: datetime | None = None) -> bool | None:
    if not office_hours:
        return None

    now = current_time.astimezone() if current_time else datetime.now().astimezone()
    office_hours_normalized = office_hours.strip().lower()
    parts = [part.strip() for part in office_hours_normalized.split(",", 1)]
    if len(parts) != 2:
        return None

    day_part, time_part = parts
    day_part = (
        day_part.replace("monday", "mon")
        .replace("tuesday", "tue")
        .replace("wednesday", "wed")
        .replace("thursday", "thu")
        .replace("friday", "fri")
        .replace("saturday", "sat")
        .replace("sunday", "sun")
        .replace("through", "-")
        .replace("to", "-")
        .replace(" ", "")
    )

    day_order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    active_days: set[int] = set()
    for chunk in day_part.split("/"):
        if "-" in chunk:
            start_day, end_day = chunk.split("-", 1)
            if start_day not in day_order or end_day not in day_order:
                return None
            start_index = day_order.index(start_day)
            end_index = day_order.index(end_day)
            if start_index <= end_index:
                active_days.update(range(start_index, end_index + 1))
            else:
                active_days.update(list(range(start_index, 7)) + list(range(0, end_index + 1)))
        elif chunk in day_order:
            active_days.add(day_order.index(chunk))

    if now.weekday() not in active_days:
        return False

    match = re.search(
        r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*(?:-|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)",
        time_part,
    )
    if not match:
        return None

    start_hour, start_minute, start_period, end_hour, end_minute, end_period = match.groups()

    def to_minutes(hour_text: str, minute_text: str | None, period_text: str) -> int:
        hour = int(hour_text) % 12
        if period_text == "pm":
            hour += 12
        minute = int(minute_text or "0")
        return hour * 60 + minute

    open_minutes = to_minutes(start_hour, start_minute, start_period)
    close_minutes = to_minutes(end_hour, end_minute, end_period)
    now_minutes = now.hour * 60 + now.minute

    if close_minutes <= open_minutes:
        return now_minutes >= open_minutes or now_minutes < close_minutes
    return open_minutes <= now_minutes < close_minutes


def evaluate_phone_number_routing(
    phone_number: PracticePhoneNumber,
    practice: Practice,
    current_time: datetime | None = None,
) -> tuple[bool, str]:
    if not phone_number.voice_enabled:
        return False, "Voice is disabled for this number."

    routing_mode = phone_number.routing_mode or "always_forward"
    if routing_mode == "always_forward":
        return True, "This number is configured to answer all calls."

    open_now = is_practice_open(practice.office_hours, current_time=current_time)
    if open_now is None:
        return True, "Office hours could not be parsed, so voice routing stays available."

    if routing_mode == "after_hours_only":
        return (not open_now, "Routing is active because the practice is currently closed." if not open_now else "Routing will wait until the practice is closed.")

    if routing_mode == "business_hours_only":
        return (open_now, "Routing is active because the practice is currently open." if open_now else "Routing will wait until business hours.")

    return True, "This number is configured to answer calls."


def get_active_practice_by_phone(
    db: Session,
    phone: str | None,
    current_time: datetime | None = None,
) -> tuple[str, Practice | None, str]:
    normalized_phone = normalize_phone_number(phone)
    if not normalized_phone:
        return "", None, "No called number was provided."

    number = db.scalar(select(PracticePhoneNumber).where(PracticePhoneNumber.phone_number == normalized_phone))
    if not number:
        return normalized_phone, None, "No practice number matched the called number."

    practice = db.get(Practice, number.practice_id)
    if not practice:
        return normalized_phone, None, "The matched number is not attached to an active practice."

    is_active, reason = evaluate_phone_number_routing(number, practice, current_time=current_time)
    return normalized_phone, practice if is_active else None, reason


def get_default_practice(db: Session) -> Practice | None:
    return db.scalar(select(Practice).limit(1))
