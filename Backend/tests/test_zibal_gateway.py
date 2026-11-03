import pytest

from nilart.bootstrap.settings import Settings
from nilart.contexts.payments.gateway import (
    GatewayRejected,
    GatewayUnknown,
    ZibalSandbox,
    payment_provider,
    start_url,
)


def test_test_merchant_is_required_even_on_production_host():
    assert (
        Settings(
            environment="production",
            public_origin="https://nilartstudio.ir",
            payment_mode="zibal_sandbox",
        ).zibal_merchant_id
        == "zibal"
    )
    with pytest.raises(ValueError):
        Settings(payment_mode="zibal_sandbox", zibal_merchant_id="live-merchant")


def test_request_contract(monkeypatch):
    provider = ZibalSandbox()

    def post(action, body):
        assert action == "request"
        assert body["amount"] == 25000
        assert body["orderId"] == "order-id"
        assert body["callbackUrl"] == "https://nilartstudio.ir/callback/order-id"
        return {"result": 100, "trackId": 1234567}

    monkeypatch.setattr(provider, "post", post)
    assert provider.request(25000, "https://nilartstudio.ir/callback/order-id") == "1234567"


def test_verified_amount_and_order_identity(monkeypatch):
    p = ZibalSandbox(order_id="order-id")
    response = {
        "result": 100,
        "status": 1,
        "amount": 25000,
        "refNumber": 12345,
        "orderId": "order-id",
    }
    monkeypatch.setattr(p, "post", lambda *args: response)
    assert p.verify(25000, "1234567") == "12345"
    for patch in [
        {"amount": 25001},
        {"amount": "25000"},
        {"orderId": "other"},
        {"refNumber": "invalid"},
        {"status": 2},
    ]:
        monkeypatch.setattr(p, "post", lambda *args: {**response, **patch})
        with pytest.raises(GatewayUnknown):
            p.verify(25000, "1234567")


@pytest.mark.parametrize("result", [201, 202])
def test_already_verified_and_unpaid_inquire_before_deciding(monkeypatch, result):
    p = ZibalSandbox()
    calls = []

    def post(action, body):
        calls.append(action)
        return (
            {"result": result}
            if action == "verify"
            else {"result": 100, "amount": 25000, "status": 1, "refNumber": 12345}
        )

    monkeypatch.setattr(p, "post", post)
    assert p.verify(25000, "1234567") == "12345"
    assert calls == ["verify", "inquiry"]


@pytest.mark.parametrize(
    "status,exception",
    [
        (-1, GatewayUnknown),
        (-2, GatewayUnknown),
        (2, GatewayUnknown),
        (3, GatewayRejected),
        (6, GatewayRejected),
        (16, GatewayUnknown),
    ],
)
def test_pending_and_confirmed_failure_are_distinct(monkeypatch, status, exception):
    p = ZibalSandbox()
    monkeypatch.setattr(
        p,
        "post",
        lambda action, body: (
            {"result": 202}
            if action == "verify"
            else {"result": 100, "amount": 25000, "status": status}
        ),
    )
    with pytest.raises(exception):
        p.verify(25000, "1234567")


def test_network_and_malformed_responses_are_unknown(monkeypatch):
    from nilart.contexts.payments import gateway

    monkeypatch.setattr(
        gateway, "urlopen", lambda *args, **kwargs: (_ for _ in ()).throw(TimeoutError())
    )
    with pytest.raises(GatewayUnknown):
        ZibalSandbox().verify(25000, "1234567")


def test_provider_frozen_on_attempt_and_legacy_preserved():
    old = {"authority": "A" * 36, "intent": {}}
    new = {"authority": "1234567", "intent": {"_gateway_provider": "zibal_sandbox"}}
    assert payment_provider(old) == "zarinpal_sandbox"
    assert start_url(old).startswith("https://sandbox.zarinpal.com/")
    assert start_url(new) == "https://gateway.zibal.ir/start/1234567"


def test_official_sandbox_null_bank_reference_has_labeled_test_receipt(monkeypatch):
    p = ZibalSandbox()
    monkeypatch.setattr(
        p, "post", lambda *args: {"result": 100, "status": 1, "amount": 25000, "refNumber": None}
    )
    assert p.verify(25000, "1234567") == "zibal-sandbox-1234567"
