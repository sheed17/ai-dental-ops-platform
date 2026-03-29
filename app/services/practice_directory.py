from dataclasses import dataclass


@dataclass(frozen=True)
class PracticeConfig:
    practice_name: str
    office_hours: str
    address: str
    website: str
    emergency_number: str
    services_summary: str
    insurance_summary: str
    same_day_emergency_policy: str
    languages: str

    def to_vapi_variables(self) -> dict[str, str]:
        return {
            "practiceName": self.practice_name,
            "officeHours": self.office_hours,
            "address": self.address,
            "website": self.website,
            "emergencyNumber": self.emergency_number,
            "servicesSummary": self.services_summary,
            "insuranceSummary": self.insurance_summary,
            "sameDayEmergencyPolicy": self.same_day_emergency_policy,
            "languages": self.languages,
        }


PRACTICES_BY_PHONE: dict[str, PracticeConfig] = {
    "+12282832484": PracticeConfig(
        practice_name="Bright Smile Dental",
        office_hours="Monday through Friday, 8:00 AM to 5:00 PM",
        address="123 Main St, Austin, TX 78701",
        website="https://www.brightsmiledental.com",
        emergency_number="+12282832484",
        services_summary="general dentistry, cleanings, crowns, implants, and emergency care",
        insurance_summary="We accept most major PPO plans. Coverage details must be confirmed by the office.",
        same_day_emergency_policy="Same-day emergency appointments may be available depending on clinical review.",
        languages="English and Spanish",
    ),
}


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
    if phone.startswith("+"):
        return phone
    return f"+{digits}"


def get_practice_by_phone(phone: str | None) -> tuple[str, PracticeConfig | None]:
    normalized_phone = normalize_phone_number(phone)
    return normalized_phone, PRACTICES_BY_PHONE.get(normalized_phone)
