import io
import json
from urllib.parse import parse_qs

import pytest

from nilart.contexts.identity.domain.rules import OtpPurpose
from nilart.contexts.identity.infrastructure.kavenegar import KavenegarSmsSender
from nilart.contexts.identity.infrastructure.otp import SmsUnavailable

KEY = "test-only-" + "a" * 50
KEY = KEY.replace("-", "")
TEMPLATES = {purpose: "nilart" + purpose.value.replace("_", "") for purpose in OtpPurpose}


def sender(approved=True):
    return KavenegarSmsSender(KEY, TEMPLATES, TEMPLATES.values() if approved else [])


@pytest.mark.parametrize("purpose", list(OtpPurpose))
def test_each_purpose_uses_approved_template_and_post_body(monkeypatch, purpose):
    def send(request, timeout):
        assert request.get_method() == "POST"
        assert request.full_url == f"https://api.kavenegar.com/v1/{KEY}/verify/lookup.json"
        assert "123456" not in request.full_url and "09123456789" not in request.full_url
        assert parse_qs(request.data.decode()) == {
            "receptor": ["09123456789"],
            "token": ["123456"],
            "template": [TEMPLATES[purpose]],
            "type": ["sms"],
        }
        return io.BytesIO(
            json.dumps(
                {
                    "return": {"status": 200},
                    "entries": [{"messageid": 1234, "status": 5, "receptor": "09123456789"}],
                }
            ).encode()
        )

    monkeypatch.setattr("nilart.contexts.identity.infrastructure.kavenegar.urlopen", send)
    sender().send_code("+989123456789", "123456", purpose)


def test_unapproved_template_never_contacts_provider(monkeypatch):
    monkeypatch.setattr(
        "nilart.contexts.identity.infrastructure.kavenegar.urlopen",
        lambda *args, **kwargs: pytest.fail("Must not send before approval"),
    )
    with pytest.raises(SmsUnavailable):
        sender(False).send_code("09123456789", "123456", OtpPurpose.LOGIN)


@pytest.mark.parametrize(
    "response",
    [
        {"return": {"status": 424}, "entries": None},
        {"return": {"status": 418}},
        {"return": {"status": 200}, "entries": []},
        {
            "return": {"status": 200},
            "entries": [{"messageid": 1234, "status": 6, "receptor": "09123456789"}],
        },
        {
            "return": {"status": 200},
            "entries": [{"messageid": 1234, "status": 5, "receptor": "09999999999"}],
        },
        {
            "return": {"status": 200},
            "entries": [{"messageid": None, "status": 5, "receptor": "09123456789"}],
        },
    ],
)
def test_only_authoritative_acceptance_returns_success(monkeypatch, response):
    monkeypatch.setattr(
        "nilart.contexts.identity.infrastructure.kavenegar.urlopen",
        lambda *args, **kwargs: io.BytesIO(json.dumps(response).encode()),
    )
    with pytest.raises(SmsUnavailable):
        sender().send_code("09123456789", "123456", OtpPurpose.LOGIN)


def test_timeout_not_retried_and_exception_does_not_leak_secret(monkeypatch):
    calls = []

    def send(*args, **kwargs):
        calls.append(1)
        raise TimeoutError(KEY + "123456")

    monkeypatch.setattr("nilart.contexts.identity.infrastructure.kavenegar.urlopen", send)
    with pytest.raises(SmsUnavailable) as error:
        sender().send_code("09123456789", "123456", OtpPurpose.LOGIN)
    assert calls == [1]
    assert KEY not in str(error.value) and "123456" not in str(error.value)
    assert error.value.__suppress_context__
