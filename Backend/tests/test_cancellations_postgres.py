import json
from uuid import uuid4

import pytest
from sqlalchemy import text
from test_basket import basket as basket
from test_basket import migrate
from test_fulfillment_postgres import packed, setup
from test_identity_otp_postgres import flow as flow
from test_refunds_postgres import command as refund
from test_refunds_postgres import preview, selection
from test_sandbox_payments import checkout as checkout


def approve(client, db, order):
    id = str(uuid4())
    version = db.scalar(text("SELECT version FROM customer_orders WHERE id=:id"), {"id": order})
    token = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    r = client.put(
        f"/api/v1/account/orders/{order}/requests/{id}",
        json=dict(
            version=version,
            kind="cancellation",
            reason="Customer explicitly requests cancellation",
            quantities={},
        ),
        headers={"X-CSRF-Token": token},
    )
    assert r.status_code == 200, r.text
    for v, status in [(0, "in_review"), (1, "approved")]:
        token = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
        r = client.put(
            f"/api/v1/admin/order-requests/{id}/reviews/{uuid4()}",
            json=dict(version=v, status=status, reply="Explicit cancellation review fixture"),
            headers={"X-CSRF-Token": token},
        )
        assert r.status_code == 200, r.text
    return id


def prepare(checkout, parcel=False):
    client, db, order, line = setup(checkout)
    for file in [
        "0026_order_request_reviews.py",
        "0045_return_inspections.py",
        "0046_refunds.py",
        "0047_order_cancellations.py",
    ]:
        migrate(db, file)
    shipment = packed(client, order, line, 1) if parcel else None
    request = approve(client, db, order)
    return client, db, request, order, line, shipment


def cancel(client, request, key=None, body=None):
    p = client.get(f"/api/v1/admin/order-requests/{request}/cancellation-plan").json()
    payload = body or dict(
        expected_version=p["expected_version"],
        request_version=p["request_version"],
        reason="Approved cancellation explicitly processed",
    )
    token = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    return client.put(
        f"/api/v1/admin/order-requests/{request}/cancellations/{key or uuid4()}",
        json=payload,
        headers={"X-CSRF-Token": token},
    ), payload


def test_cancel_releases_holds_stops_parcels_and_refunds_separately(checkout):
    client, db, request, order, line, parcel = prepare(checkout, True)
    before = list(
        db.execute(text("SELECT quantity,value,version FROM inventory_positions ORDER BY id"))
    )
    key = uuid4()
    r, body = cancel(client, request, key)
    assert r.status_code == 200, r.text
    assert not r.json()["result"]["refund_issued"]
    assert r.json()["result"]["cancelled_shipments"] == [parcel]
    assert cancel(client, request, key, body)[0].json() == r.json()
    assert cancel(client, request)[0].status_code == 409
    state = db.scalar(text("SELECT state FROM customer_orders"))
    assert state["fulfillment"] == "cancelled" and state["payment"] == "paid"
    assert db.scalar(text("SELECT sum(reserved) FROM inventory_positions")) == 0
    assert (
        list(db.execute(text("SELECT quantity,value,version FROM inventory_positions ORDER BY id")))
        == before
    )
    assert db.scalar(text("SELECT status FROM fulfillment_shipments")) == "cancelled"
    assert db.scalar(text("SELECT count(*) FROM order_refunds")) == 0
    from nilart.shared.outbox import consume_event

    for row in db.execute(
        text(
            "SELECT * FROM outbox_events WHERE event_type='orders.cancelled' OR (event_type='inventory.reservation_changed' AND payload->>'action'='cancel')"
        )
    ).mappings():
        envelope = {
            "id": str(row["id"]),
            "event_type": row["event_type"],
            "payload": row["payload"],
        }
        assert consume_event(db, envelope)
        assert not consume_event(db, envelope)

    db.execute(
        text(
            "INSERT INTO identity_account_roles(account_id,role) SELECT account_id,'admin' FROM customer_orders ON CONFLICT DO NOTHING"
        )
    )
    db.commit()
    p = client.get(f"/api/v1/admin/refunds/requests/{request}")
    assert p.status_code == 200, p.text
    assert p.json()["kind"] == "cancellation" and p.json()["items"][0]["remaining"] == 2
    q = preview(client, {**selection(request, line, 2), "close_request": True}).json()
    paid = refund(client, q)
    assert paid.status_code == 200, paid.text
    assert paid.json()["result"]["payment_status"] == "refunded"
    assert db.scalar(text("SELECT status FROM customer_order_requests")) == "completed"
    assert (
        list(db.execute(text("SELECT quantity,value,version FROM inventory_positions ORDER BY id")))
        == before
    )


def test_refund_before_cancellation_and_unknown_payment_are_blocked(checkout):
    client, db, request, order, line, _ = prepare(checkout)
    db.execute(
        text(
            "INSERT INTO identity_account_roles(account_id,role) SELECT account_id,'admin' FROM customer_orders ON CONFLICT DO NOTHING"
        )
    )
    db.commit()
    assert preview(client, selection(request, line, 2)).status_code == 409
    db.execute(text("UPDATE sandbox_payments SET status='unknown'"))
    db.commit()
    assert cancel(client, request)[0].status_code == 409
    assert db.scalar(text("SELECT count(*) FROM order_cancellations")) == 0
    assert db.scalar(text("SELECT sum(reserved) FROM inventory_positions")) == 2


def test_cancellation_failure_rolls_back_children_and_stock(checkout, monkeypatch):
    client, db, request, order, line, parcel = prepare(checkout, True)
    from nilart.contexts.orders import cancellations

    def crash(*args, **kwargs):
        raise RuntimeError("atomic cancellation failure")

    monkeypatch.setattr(cancellations, "enqueue", crash)
    with pytest.raises(RuntimeError, match="atomic cancellation failure"):
        cancel(client, request)
    assert db.scalar(text("SELECT sum(reserved) FROM inventory_positions")) == 2
    assert db.scalar(text("SELECT status FROM fulfillment_shipments")) == "packed"
    assert db.scalar(text("SELECT count(*) FROM order_cancellations")) == 0
    assert db.scalar(text("SELECT state->>'fulfillment' FROM customer_orders")) == "on_hold"
    db.execute(text("DELETE FROM identity_account_roles WHERE role='operations'"))
    db.commit()
    assert (
        cancel(
            client,
            request,
            body=dict(
                expected_version=0, request_version=2, reason="Permission must be checked first"
            ),
        )[0].status_code
        == 403
    )


def test_stale_intent_and_dispatched_order_cannot_cancel(checkout):
    client, db, request, order, line, _ = prepare(checkout)
    p = client.get(f"/api/v1/admin/order-requests/{request}/cancellation-plan").json()
    bad = dict(
        expected_version=p["expected_version"] + 1,
        request_version=p["request_version"],
        reason="Must reject stale cancellation",
    )
    assert cancel(client, request, body=bad)[0].status_code == 409
    # An inconsistent legacy delivered marker must never be treated as cancellable.
    state = db.scalar(text("SELECT state FROM customer_orders"))
    state["fulfillment"] = "shipped"
    db.execute(text("UPDATE customer_orders SET state=CAST(:s AS jsonb)"), {"s": json.dumps(state)})
    db.commit()
    assert cancel(client, request)[0].status_code == 409


def test_late_paid_shortage_can_be_cancelled_and_refunded_without_stock(checkout):
    from datetime import UTC, datetime, timedelta

    from test_order_stock_postgres import callback, staff
    from test_sandbox_payments import start

    from nilart.contexts.inventory.reservations import expire

    client, db, body = checkout
    for file in [
        "0032_suppliers.py",
        "0038_purchases.py",
        "0039_production.py",
        "0044_fulfillment.py",
        "0026_order_request_reviews.py",
        "0045_return_inspections.py",
        "0046_refunds.py",
        "0047_order_cancellations.py",
    ]:
        migrate(db, file)
    payment = start(client, body).json()
    assert expire(db, now=datetime.now(UTC) + timedelta(hours=1)) == 1
    db.execute(text("UPDATE inventory_positions SET quantity=0,value=0"))
    db.commit()
    assert callback(client, payment).status_code == 303
    staff(client, db)
    request = approve(client, db, payment["order_id"])
    assert db.scalar(text("SELECT state FROM order_stock_allocations")) == "shortage"
    result, _ = cancel(client, request)
    assert result.status_code == 200, result.text
    assert result.json()["result"]["previous_stock_state"] == "shortage"
    assert db.scalar(text("SELECT sum(reserved+quantity) FROM inventory_positions")) == 0
    db.execute(
        text(
            "INSERT INTO identity_account_roles(account_id,role) SELECT account_id,'admin' FROM customer_orders ON CONFLICT DO NOTHING"
        )
    )
    db.commit()
    line = db.scalar(text("SELECT snapshot FROM customer_orders"))["items"][0]["id"]
    q = preview(client, {**selection(request, line, 2), "close_request": True}).json()
    paid = refund(client, q)
    assert paid.status_code == 200, paid.text
    assert paid.json()["result"]["amount"] == "200.20"
    # Original callback replay cannot reacquire cancelled stock or erase the refund.
    assert callback(client, payment).status_code == 303
    assert db.scalar(text("SELECT state->>'payment' FROM customer_orders")) == "refunded"
    assert db.scalar(text("SELECT state FROM order_stock_allocations")) == "released"


def test_repeated_bundle_sku_cancellation_releases_once_and_refunds_frozen_shares(checkout):
    from test_order_stock_postgres import (
        callback,
        staff,
        test_repeated_bundle_sku_aggregates_with_standalone,
    )

    client, db, _ = checkout
    for file in [
        "0032_suppliers.py",
        "0038_purchases.py",
        "0039_production.py",
        "0044_fulfillment.py",
        "0026_order_request_reviews.py",
        "0045_return_inspections.py",
        "0046_refunds.py",
        "0047_order_cancellations.py",
    ]:
        migrate(db, file)
    test_repeated_bundle_sku_aggregates_with_standalone(checkout)
    payment = db.execute(text("SELECT * FROM sandbox_payments")).mappings().one()
    assert callback(client, payment).status_code == 303
    staff(client, db)
    request = approve(client, db, str(payment["order_id"]))
    before = list(db.execute(text("SELECT quantity,value FROM inventory_positions ORDER BY id")))
    assert db.scalar(text("SELECT sum(reserved) FROM inventory_positions")) == 9
    r, _ = cancel(client, request)
    assert r.status_code == 200, r.text
    assert db.scalar(text("SELECT sum(reserved) FROM inventory_positions")) == 0
    assert (
        list(db.execute(text("SELECT quantity,value FROM inventory_positions ORDER BY id")))
        == before
    )
    db.execute(
        text(
            "INSERT INTO identity_account_roles(account_id,role) SELECT account_id,'admin' FROM customer_orders ON CONFLICT DO NOTHING"
        )
    )
    db.commit()
    p = client.get(f"/api/v1/admin/refunds/requests/{request}").json()
    items = [
        dict(line_id=i["line_id"], component=i["component"], quantity=i["remaining"])
        for i in p["items"]
    ]
    assert sum(i["quantity"] for i in items) == 9
    q = preview(
        client,
        dict(
            request_id=request,
            items=items,
            include_shipping=False,
            include_tax=False,
            close_request=True,
        ),
    ).json()
    r = refund(client, q)
    assert r.status_code == 200, r.text
    assert r.json()["result"]["payment_status"] == "refunded"


@pytest.mark.parametrize("payment_status", ["pending", "unknown", "failed", "cancelled"])
def test_unpaid_cancellation_preserves_late_payment_refund_obligation(
    checkout, payment_status, monkeypatch
):
    from test_discounts_postgres import prepare as discount_prepare
    from test_discounts_postgres import save as discount_save
    from test_order_stock_postgres import callback, staff
    from test_sandbox_payments import start

    client, db, body, _ = discount_prepare(checkout)
    assert discount_save(client).status_code == 200
    body = {**body, "expected_total": "180.2", "discount_code": "SAVE10", "discount_version": 1}
    for file in [
        "0032_suppliers.py",
        "0038_purchases.py",
        "0039_production.py",
        "0044_fulfillment.py",
        "0026_order_request_reviews.py",
        "0045_return_inspections.py",
        "0046_refunds.py",
        "0047_order_cancellations.py",
    ]:
        migrate(db, file)
    payment = start(client, body).json()
    db.execute(text("UPDATE sandbox_payments SET status=:s"), {"s": payment_status})
    order_payment = (
        "verification"
        if payment_status == "unknown"
        else "failed"
        if payment_status in {"failed", "cancelled"}
        else "pending"
    )
    db.execute(
        text(
            "UPDATE customer_orders SET state=jsonb_set(state,'{payment}',to_jsonb(CAST(:s AS text)))"
        ),
        {"s": order_payment},
    )
    db.commit()
    staff(client, db)
    request = approve(client, db, payment["order_id"])
    before = list(
        db.execute(text("SELECT quantity,value,version FROM inventory_positions ORDER BY id"))
    )
    assert db.scalar(text("SELECT state FROM discount_usage")) == "reserved"
    key = uuid4()
    r, intent = cancel(client, request, key)
    assert r.status_code == 200, r.text
    assert db.scalar(text("SELECT state FROM discount_usage")) == "released"
    assert not client.get("/api/v1/admin/refunds/requests").json()["items"]
    assert db.scalar(text("SELECT state->>'payment' FROM customer_orders")) == order_payment
    assert db.scalar(text("SELECT sum(reserved) FROM inventory_positions")) == 0
    assert db.scalar(text("SELECT status FROM customer_order_requests")) == "approved"
    if payment_status == "unknown":
        from nilart.contexts.payments.gateway import GatewayUnknown, ZarinpalSandbox

        def uncertain(*args):
            raise GatewayUnknown()

        with monkeypatch.context() as patch:
            patch.setattr(ZarinpalSandbox, "verify", uncertain)
            response = client.get(
                f"/api/v1/payments/sandbox/callback/{payment['id']}?Authority={'A' + '1' * 35}&Status=NOK",
                follow_redirects=False,
            )
            assert response.status_code == 303
            assert db.scalar(text("SELECT status FROM sandbox_payments")) == "unknown"
            assert (
                db.scalar(text("SELECT state->>'payment' FROM customer_orders")) == "verification"
            )
            assert db.scalar(text("SELECT sum(reserved) FROM inventory_positions")) == 0
    # A later authoritative success must retain the cancellation and expose the
    # original paid allocations to finance, without re-reserving even plentiful stock.
    assert callback(client, payment).status_code == 303
    assert db.scalar(text("SELECT state FROM discount_usage")) == "redeemed"
    assert client.get("/api/v1/admin/refunds/requests").json()["items"][0]["id"] == request
    assert db.scalar(text("SELECT state->>'fulfillment' FROM customer_orders")) == "cancelled"
    assert db.scalar(text("SELECT state->>'payment' FROM customer_orders")) == "paid"
    assert db.scalar(text("SELECT state FROM order_stock_allocations")) == "released"
    assert db.scalar(text("SELECT sum(reserved) FROM inventory_positions")) == 0
    assert cancel(client, request, key, intent)[0].json() == r.json()
    db.execute(
        text(
            "INSERT INTO identity_account_roles(account_id,role) SELECT account_id,'admin' FROM customer_orders ON CONFLICT DO NOTHING"
        )
    )
    db.commit()
    line = db.scalar(text("SELECT snapshot FROM customer_orders"))["items"][0]["id"]
    q = preview(client, {**selection(request, line, 2), "close_request": True})
    assert q.status_code == 200, q.text
    refunded = refund(client, q.json())
    assert refunded.status_code == 200, refunded.text
    assert callback(client, payment).status_code == 303
    assert db.scalar(text("SELECT state->>'payment' FROM customer_orders")) == "refunded"
    assert (
        list(db.execute(text("SELECT quantity,value,version FROM inventory_positions ORDER BY id")))
        == before
    )
