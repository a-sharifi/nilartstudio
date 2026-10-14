from datetime import UTC, datetime, timedelta

import pytest

from nilart.bootstrap.settings import Settings
from nilart.contexts.identity.domain.rules import (
    IdentityError,
    OtpPurpose,
    normalize_phone,
    require_active_challenge,
    validate_password,
)
from nilart.contexts.identity.infrastructure.secrets import (
    hash_password,
    new_otp,
    new_session_token,
    otp_digest,
    token_digest,
    verify_password,
)


@pytest.mark.parametrize("phone", ["09123456789", "۰۹۱۲۳۴۵۶۷۸۹", "٠٩١٢٣٤٥٦٧٨٩",
                                   "+989123456789", "00989123456789"])
def test_phone_normalization(phone):
    assert normalize_phone(phone) == "+989123456789"


@pytest.mark.parametrize("phone", ["+1 2025550100", "0912", "09123456789x", "09١2345678", ""])
def test_invalid_phone(phone):
    with pytest.raises(IdentityError):
        normalize_phone(phone)


def test_password_hash_salted_and_verified():
    password = "a long secure passphrase"
    encoded = hash_password(password)
    assert encoded != hash_password(password)
    assert password not in encoded
    assert verify_password(password, encoded)
    assert not verify_password("wrong password", encoded)
    assert not verify_password(password, encoded.replace("32768", "1073741824"))
    assert not verify_password(password, "malformed")


@pytest.mark.parametrize("password", ["short", " " * 12, "x" * 129])
def test_invalid_password(password):
    with pytest.raises(IdentityError):
        validate_password(password)


def test_otp_is_bound_to_purpose_and_challenge():
    key = b"x" * 32
    digest = otp_digest(key=key, challenge_id="a", purpose="login", code="123456")
    assert digest != otp_digest(key=key, challenge_id="b", purpose="login", code="123456")
    assert digest != otp_digest(key=key, challenge_id="a", purpose="recovery", code="123456")
    with pytest.raises(ValueError):
        otp_digest(key=b"short", challenge_id="a", purpose="login", code="123456")
    assert len(new_otp()) == 6


@pytest.mark.parametrize("case", ["expired", "consumed", "attempts", "purpose"])
def test_challenge_rejection(case):
    now = datetime.now(UTC)
    with pytest.raises(IdentityError):
        require_active_challenge(purpose=OtpPurpose.LOGIN,
                                 expected=OtpPurpose.RECOVERY if case == "purpose" else OtpPurpose.LOGIN,
                                 expires_at=now if case == "expired" else now + timedelta(minutes=2),
                                 now=now, attempts=5 if case == "attempts" else 0,
                                 consumed=case == "consumed")


def test_session_token_is_random_and_only_digest_persisted():
    token = new_session_token()
    assert token != new_session_token()
    assert len(token) >= 43
    assert len(token_digest(token)) == 64
    assert token_digest(token) != token


@pytest.mark.parametrize("origin", ["http://shop.example", "https://shop.example/path",
                                    "https://user:password@shop.example", "https://shop.example?x=1"])
def test_production_origin_rejected(origin):
    with pytest.raises(ValueError):
        Settings(environment="production", public_origin=origin)


def test_production_https_origin_allowed():
    assert Settings(environment="production", public_origin="https://shop.example").public_origin == "https://shop.example"


def test_eight_character_password_boundary():
    validate_password("12345678")
    with pytest.raises(IdentityError):
        validate_password("1234567")
