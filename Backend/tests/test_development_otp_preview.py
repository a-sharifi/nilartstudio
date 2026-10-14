import pytest
from test_identity_otp_postgres import flow as flow

from nilart.bootstrap.settings import Settings, settings


@pytest.mark.parametrize("dev_mode,sms_mode,environment,visible", [
    (True, "sandbox", "development", True),
    (False, "sandbox", "development", False),
    (True, "disabled", "development", False),
    (True, "sandbox", "production", False),
])
def test_preview_requires_all_gates_and_is_the_verifiable_code(flow, monkeypatch, dev_mode, sms_mode, environment, visible):
    client, _, sender = flow
    monkeypatch.setattr(settings, "dev_mode", dev_mode)
    monkeypatch.setattr(settings, "sms_mode", sms_mode)
    monkeypatch.setattr(settings, "environment", environment)
    response = client.post("/api/v1/auth/otp/request", json={"phone": "09123456789", "purpose": "register"})
    assert response.status_code == 202
    assert response.headers["cache-control"] == "no-store"
    body = response.json()
    assert ("development_code" in body) == visible
    if visible:
        assert body["development_code"] == sender.codes[-1][1]
        result = client.post("/api/v1/auth/otp/verify", json={"challenge_id": body["challenge_id"], "purpose": "register", "code": body["development_code"]})
        assert result.status_code == 200
        assert "development_code" not in result.json()


def test_flags_default_off_and_production_rejects_fake_sms_or_development():
    config = Settings()
    assert not config.dev_mode and not config.fake_sms
    assert Settings(fake_sms=True).sms_mode == "sandbox"
    for flags in [{"fake_sms": True}, {"dev_mode": True}]:
        with pytest.raises(ValueError):
            Settings(environment="production", public_origin="https://example.test", **flags)


def test_delivery_failure_never_returns_preview(flow, monkeypatch):
    from nilart.contexts.identity.infrastructure.otp import SmsUnavailable

    client, _, sender = flow
    monkeypatch.setattr(settings, "dev_mode", True)
    monkeypatch.setattr(settings, "sms_mode", "sandbox")

    def fail(*args):
        raise SmsUnavailable("Fake delivery unavailable")

    monkeypatch.setattr(sender, "send_code", fail)
    response = client.post("/api/v1/auth/otp/request", json={"phone": "09123456789", "purpose": "register"})
    assert response.status_code == 503
    assert "development_code" not in response.json()
