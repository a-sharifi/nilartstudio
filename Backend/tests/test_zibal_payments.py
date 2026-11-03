from sqlalchemy import text
from test_basket import basket as basket
from test_identity_otp_postgres import flow as flow
from test_sandbox_payments import checkout as checkout
from test_sandbox_payments import start

from nilart.bootstrap.settings import settings
from nilart.contexts.payments.gateway import ZibalSandbox


def test_zibal_callbacks_verify_server_side_and_are_idempotent(checkout, monkeypatch):
    client, db, body = checkout
    monkeypatch.setattr(settings, "payment_mode", "zibal_sandbox")
    monkeypatch.setattr(ZibalSandbox, "request", lambda *args: "123456789")
    calls = []

    def post(self, action, payload):
        calls.append(action)
        return {
            "result": 100,
            "status": 1,
            "amount": db.scalar(text("SELECT amount_rial FROM sandbox_payments")),
            "refNumber": 9876543,
            "orderId": self.order_id,
        }

    monkeypatch.setattr(ZibalSandbox, "post", post)
    attempt = start(client, body).json()
    assert attempt["gateway_url"] == "https://gateway.zibal.ir/start/123456789"
    assert (
        db.scalar(text("SELECT intent->>'_gateway_provider' FROM sandbox_payments"))
        == "zibal_sandbox"
    )
    callback = f"/api/v1/payments/sandbox/callback/{attempt['id']}"
    assert (
        client.get(callback + "?trackId=wrong&success=1", follow_redirects=False).status_code == 400
    )
    # Browser success is not authoritative; even success=0 must inquire with provider.
    response = client.get(callback + "?trackId=123456789&success=0", follow_redirects=False)
    assert response.status_code == 303
    assert db.scalar(text("SELECT status FROM sandbox_payments")) == "paid"
    assert db.scalar(text("SELECT reference FROM sandbox_payments")) == "9876543"
    assert (
        client.get(callback + "?trackId=123456789&success=1", follow_redirects=False).status_code
        == 303
    )
    assert calls == ["verify"]
    assert start(client, body).json()["id"] == attempt["id"]
    assert db.scalar(text("SELECT count(*) FROM customer_orders")) == 1


def test_zibal_forged_success_stays_unknown_until_verified(checkout, monkeypatch):
    client, db, body = checkout
    monkeypatch.setattr(settings, "payment_mode", "zibal_sandbox")
    monkeypatch.setattr(ZibalSandbox, "request", lambda *args: "123456789")
    monkeypatch.setattr(
        ZibalSandbox,
        "post",
        lambda self, action, payload: (
            {"result": 202}
            if action == "verify"
            else {
                "result": 100,
                "status": -1,
                "amount": db.scalar(text("SELECT amount_rial FROM sandbox_payments")),
                "orderId": self.order_id,
            }
        ),
    )
    attempt = start(client, body).json()
    assert (
        client.get(
            f"/api/v1/payments/sandbox/callback/{attempt['id']}?trackId=123456789&success=1",
            follow_redirects=False,
        ).status_code
        == 303
    )
    assert db.scalar(text("SELECT status FROM sandbox_payments")) == "unknown"
    assert db.scalar(text("SELECT state->>'payment' FROM customer_orders")) == "verification"
    monkeypatch.setattr(
        ZibalSandbox,
        "post",
        lambda self, action, payload: {
            "result": 100,
            "status": 1,
            "amount": db.scalar(text("SELECT amount_rial FROM sandbox_payments")),
            "orderId": self.order_id,
            "refNumber": 9876543,
        },
    )
    assert (
        client.get(
            f"/api/v1/payments/sandbox/callback/{attempt['id']}?trackId=123456789&success=1",
            follow_redirects=False,
        ).status_code
        == 303
    )
    assert db.scalar(text("SELECT status FROM sandbox_payments")) == "paid"


def test_legacy_attempt_keeps_provider_after_configuration_switch(checkout, monkeypatch):
    from nilart.contexts.payments.gateway import ZarinpalSandbox

    client, db, body = checkout
    attempt = start(client, body).json()
    authority = db.scalar(text("SELECT authority FROM sandbox_payments"))
    monkeypatch.setattr(settings, "payment_mode", "zibal_sandbox")
    monkeypatch.setattr(ZarinpalSandbox, "verify", lambda *args: "55555")
    response = client.get(
        f"/api/v1/payments/sandbox/callback/{attempt['id']}?Authority={authority}&Status=OK",
        follow_redirects=False,
    )
    assert response.status_code == 303
    assert db.scalar(text("SELECT status FROM sandbox_payments")) == "paid"
    assert db.scalar(text("SELECT reference FROM sandbox_payments")) == "55555"
