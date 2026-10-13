import pytest

from nilart.bootstrap.settings import Settings
from nilart.contexts.identity.infrastructure.otp import RedisSandboxSmsSender, SmsUnavailable


def test_sandbox_sms_is_explicit_and_rejected_outside_development():
    assert Settings().sms_mode == "disabled"
    with pytest.raises(ValueError):
        Settings(environment="production", public_origin="https://example.test", sms_mode="sandbox")
    with pytest.raises(SmsUnavailable):
        RedisSandboxSmsSender("redis://localhost", "production")


def test_sandbox_message_is_expiring_and_has_no_public_delivery_channel(monkeypatch):
    import json

    from nilart.contexts.identity.domain.rules import OtpPurpose
    from nilart.contexts.identity.infrastructure.secrets import token_digest

    calls = []

    class Cache:
        def set(self, key, value, ex):
            calls.append((key, json.loads(value), ex))

        def close(self):
            pass

    monkeypatch.setattr("redis.Redis.from_url", lambda *args, **kwargs: Cache())
    RedisSandboxSmsSender("redis://localhost", "development").send_code("+989123456789", "123456", OtpPurpose.PHONE_CHANGE)
    assert calls == [("sandbox:sms:" + token_digest("+989123456789"), {"code": "123456", "purpose": "phone_change"}, 180)]
