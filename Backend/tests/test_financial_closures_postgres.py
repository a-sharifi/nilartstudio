import json
from uuid import uuid4

import pytest
from sqlalchemy import text
from test_basket import basket as basket
from test_basket import migrate
from test_cancellations_postgres import cancel, prepare
from test_identity_otp_postgres import flow as flow
from test_sandbox_payments import checkout as checkout


def setup(checkout, monkeypatch):
    client, db, request, order, line, _ = prepare(checkout)
    migrate(db, "0042_payment_inquiries.py")
    migrate(db, "0049_unpaid_cancellation_closures.py")
    db.execute(
        text(
            "INSERT INTO identity_account_roles(account_id,role) SELECT account_id,'admin' FROM customer_orders ON CONFLICT DO NOTHING"
        )
    )
    snapshot = db.scalar(text("SELECT snapshot FROM customer_orders"))
    snapshot.pop("receipt", None)
    db.execute(
        text(
            "UPDATE customer_orders SET snapshot=CAST(:s AS jsonb),state=jsonb_set(state,'{payment}','\"pending\"'::jsonb)"
        ),
        {"s": json.dumps(snapshot)},
    )
    db.execute(text("UPDATE sandbox_payments SET status='pending',reference=NULL"))
    db.commit()
    assert cancel(client, request)[0].status_code == 200
    return client, db, request, order, line


def rejected_inquiry(client, db, monkeypatch):
    from nilart.contexts.payments.gateway import GatewayRejected, ZarinpalSandbox

    def rejected(*args):
        raise GatewayRejected()

    with monkeypatch.context() as patch:
        patch.setattr(ZarinpalSandbox, "verify", rejected)
        payment = db.execute(text("SELECT * FROM sandbox_payments")).mappings().one()
        token = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
        r = client.put(
            f"/api/v1/admin/payments/{payment['id']}/inquiries/{uuid4()}",
            headers={"X-CSRF-Token": token},
            json=dict(
                expected_version=payment["version"],
                reason="Verify actual gateway rejection before closure",
            ),
        )
        assert r.status_code == 200, r.text
        return r.json()


def close(client, request, key=None, body=None):
    p = client.get(f"/api/v1/admin/order-requests/{request}/financial-closure-plan").json()
    body = body or dict(
        expected_version=p["expected_version"],
        request_version=p["request_version"],
        payment_version=p["payment_version"],
        inquiry_id=p["inquiry_id"],
        reason="Close cancelled order after authoritative rejected inquiry",
    )
    token = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    return client.put(
        f"/api/v1/admin/order-requests/{request}/financial-closures/{key or uuid4()}",
        headers={"X-CSRF-Token": token},
        json=body,
    ), body


def test_closure_requires_fresh_rejection_and_late_success_reopens_refund(checkout, monkeypatch):
    from test_order_stock_postgres import callback
    from test_refunds_postgres import command as refund
    from test_refunds_postgres import preview, selection

    client, db, request, order, line = setup(checkout, monkeypatch)
    p = client.get(f"/api/v1/admin/order-requests/{request}/financial-closure-plan").json()
    assert not p["eligible"] and p["issue"] == "confirmed_rejection_required"
    inquiry = rejected_inquiry(client, db, monkeypatch)
    before = list(
        db.execute(
            text("SELECT quantity,value,reserved,version FROM inventory_positions ORDER BY id")
        )
    )
    assert client.get(f"/api/v1/admin/order-requests/{request}/financial-closure-plan").json()[
        "eligible"
    ]
    key = uuid4()
    r, body = close(client, request, key)
    assert r.status_code == 200, r.text
    assert r.json()["inquiry_id"] == inquiry["id"]
    assert not r.json()["result"]["refund_issued"]
    assert db.scalar(text("SELECT status FROM customer_order_requests")) == "completed"
    assert client.get(f"/api/v1/admin/order-requests/{request}/cancellation-plan").json()["financial_closed"]
    assert close(client, request, key, body)[0].json() == r.json()
    assert close(client, request)[0].status_code == 409
    payment = db.execute(text("SELECT * FROM sandbox_payments")).mappings().one()
    assert callback(client, payment).status_code == 303
    assert db.scalar(text("SELECT status FROM customer_order_requests")) == "approved"
    assert db.scalar(text("SELECT state->>'fulfillment' FROM customer_orders")) == "cancelled"
    assert db.scalar(text("SELECT state FROM order_stock_allocations")) == "released"
    assert callback(client, payment).status_code == 303
    assert (
        db.scalar(
            text(
                "SELECT count(*) FROM identity_audits WHERE action='orders.cancellation_finance_reopened'"
            )
        )
        == 1
    )
    q = preview(client, {**selection(request, line, 2), "close_request": True})
    assert q.status_code == 200, q.text
    assert refund(client, q.json()).status_code == 200
    assert callback(client, payment).status_code == 303
    assert db.scalar(text("SELECT status FROM customer_order_requests")) == "completed"
    assert db.scalar(text("SELECT state->>'payment' FROM customer_orders")) == "refunded"
    assert close(client, request, key, body)[0].json() == r.json()
    assert (
        list(
            db.execute(
                text("SELECT quantity,value,reserved,version FROM inventory_positions ORDER BY id")
            )
        )
        == before
    )
    from nilart.shared.outbox import consume_event

    for row in db.execute(
        text("SELECT * FROM outbox_events WHERE event_type='orders.cancellation_finance_changed'")
    ).mappings():
        envelope = {
            "id": str(row["id"]),
            "event_type": row["event_type"],
            "payload": row["payload"],
        }
        assert consume_event(db, envelope)
        assert not consume_event(db, envelope)


def test_unknown_browser_cancel_and_stale_inquiry_cannot_close(checkout, monkeypatch):
    client, db, request, _, _ = setup(checkout, monkeypatch)
    db.execute(text("UPDATE sandbox_payments SET status='cancelled'"))
    db.commit()
    assert not client.get(f"/api/v1/admin/order-requests/{request}/financial-closure-plan").json()[
        "eligible"
    ]
    rejected_inquiry(client, db, monkeypatch)
    p = client.get(f"/api/v1/admin/order-requests/{request}/financial-closure-plan").json()
    db.execute(text("UPDATE sandbox_payments SET status='failed'"))
    db.commit()
    r, _ = close(
        client,
        request,
        body=dict(
            expected_version=p["expected_version"],
            request_version=p["request_version"],
            payment_version=p["payment_version"],
            inquiry_id=p["inquiry_id"],
            reason="Stale proposal must be rejected",
        ),
    )
    assert r.status_code == 409
    assert (
        client.get(f"/api/v1/admin/order-requests/{request}/financial-closure-plan").json()["issue"]
        == "fresh_rejected_inquiry_required"
    )
    assert db.scalar(text("SELECT count(*) FROM unpaid_cancellation_closures")) == 0


def test_closure_rolls_back_and_checks_independent_permissions(checkout, monkeypatch):
    client, db, request, _, _ = setup(checkout, monkeypatch)
    rejected_inquiry(client, db, monkeypatch)
    from nilart.contexts.orders import financial_closures

    def crash(*args):
        raise RuntimeError("closure atomic rollback")

    with monkeypatch.context() as patch:
        patch.setattr(financial_closures, "enqueue", crash)
        with pytest.raises(RuntimeError, match="closure atomic rollback"):
            close(client, request)
    assert db.scalar(text("SELECT count(*) FROM unpaid_cancellation_closures")) == 0
    assert db.scalar(text("SELECT status FROM customer_order_requests")) == "approved"
    account = db.scalar(text("SELECT account_id FROM customer_orders"))
    db.execute(
        text(
            "INSERT INTO identity_permission_overrides(account_id,permission,allowed) VALUES(:id,'finance.write',false)"
        ),
        {"id": account},
    )
    db.commit()
    assert close(client, request)[0].status_code == 403


def test_later_unknown_reopens_and_new_rejection_can_be_closed(checkout, monkeypatch):
    from test_order_stock_postgres import callback

    from nilart.contexts.payments.gateway import GatewayUnknown, ZarinpalSandbox

    client, db, request, _, _ = setup(checkout, monkeypatch)
    rejected_inquiry(client, db, monkeypatch)
    assert close(client, request)[0].status_code == 200
    payment = db.execute(text("SELECT * FROM sandbox_payments")).mappings().one()

    def uncertain(*args):
        raise GatewayUnknown()

    with monkeypatch.context() as patch:
        patch.setattr(ZarinpalSandbox, "verify", uncertain)
        assert callback(client, payment).status_code == 303
    assert db.scalar(text("SELECT status FROM customer_order_requests")) == "approved"
    assert db.scalar(text("SELECT state->>'payment' FROM customer_orders")) == "verification"
    assert not client.get(f"/api/v1/admin/order-requests/{request}/financial-closure-plan").json()[
        "eligible"
    ]
    rejected_inquiry(client, db, monkeypatch)
    assert close(client, request)[0].status_code == 200
    assert db.scalar(text("SELECT count(*) FROM unpaid_cancellation_closures")) == 2
    assert db.scalar(text("SELECT sum(reserved) FROM inventory_positions")) == 0
