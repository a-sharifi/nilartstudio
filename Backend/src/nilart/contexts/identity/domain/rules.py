import re
from datetime import datetime
from enum import StrEnum


class IdentityError(ValueError):
    pass


def normalize_full_name(value: str) -> str:
    if len(value) > 120 or any(ord(char) < 32 or ord(char) == 127 for char in value):
        raise IdentityError("invalid_full_name")
    return value.strip()


class OtpPurpose(StrEnum):
    REGISTER = "register"
    LOGIN = "login"
    RECOVERY = "recovery"


def normalize_digits(value: str) -> str:
    return value.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"))


def normalize_phone(value: str) -> str:
    """Canonical Iranian mobile number; reject rather than silently strip punctuation."""
    digits = normalize_digits(value.strip())
    if re.fullmatch(r"09[0-9]{9}", digits):
        return "+98" + digits[1:]
    if re.fullmatch(r"(?:\+98|0098)9[0-9]{9}", digits):
        return "+98" + digits[-10:]
    raise IdentityError("invalid_phone")


def validate_password(value: str) -> None:
    # Long passphrases are welcome; do not trim or impose arbitrary symbol rules.
    if not 12 <= len(value) <= 128 or len(value.encode("utf-8")) > 512:
        raise IdentityError("invalid_password_length")
    if value.isspace():
        raise IdentityError("invalid_password")


def require_active_challenge(
    *, purpose: OtpPurpose, expected: OtpPurpose, expires_at: datetime,
    now: datetime, attempts: int, consumed: bool, max_attempts: int = 5,
) -> None:
    if now.tzinfo is None or expires_at.tzinfo is None:
        raise IdentityError("timezone_required")
    if consumed or purpose != expected or expires_at <= now or attempts >= max_attempts:
        raise IdentityError("invalid_or_expired_challenge")
