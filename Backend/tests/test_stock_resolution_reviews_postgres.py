from uuid import uuid4

import pytest
from sqlalchemy import text
from test_basket import basket as basket
from test_basket import migrate
from test_cancellations_postgres import cancel, prepare
from test_identity_otp_postgres import flow as flow
from test_sandbox_payments import checkout as checkout


def shortage(checkout):
    client, db, request, order, line, _ = prepare(checkout)
    migrate(db, "0048_stock_resolution_reviews.py")
    # Synthetic shortage position fixture; complete late-payment expiry is already covered separately.
    db.execute(
        text("UPDATE customer_order_requests SET status='rejected' WHERE id=:id"), {"id": request}
    )
    db.execute(text("UPDATE inventory_positions SET reserved=0"))
    db.execute(text("UPDATE order_stock_allocations SET state='shortage',version=version+1"))
    db.commit()
    return client, db, order, line


def open_review(client, order, key=None, body=None):
    p = client.get(f"/api/v1/admin/order-stock/{order}/resolution-plan").json()
    data = body or dict(
        expected_version=p["stock_version"],
        order_version=p["order_version"],
        reason="Staff cannot supply stock; open explicit cancellation review",
    )
    token = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    return client.put(
        f"/api/v1/admin/order-stock/{order}/resolution-reviews/{key or uuid4()}",
        json=data,
        headers={"X-CSRF-Token": token},
    ), data


def test_staff_initiation_is_audited_owned_and_does_not_cancel_or_refund(checkout):
    client, db, order, line = shortage(checkout)
    before = list(
        db.execute(
            text("SELECT quantity,value,reserved,version FROM inventory_positions ORDER BY id")
        )
    )
    key = uuid4()
    r, body = open_review(client, order, key)
    assert r.status_code == 200, r.text
    assert r.json()["result"]["status"] == "submitted"
    assert r.json()["result"]["initiated_by_staff"]
    assert open_review(client, order, key, body)[0].json() == r.json()
    assert (
        open_review(client, order, key, {**body, "reason": "Other intent must conflict"})[
            0
        ].status_code
        == 409
    )
    assert open_review(client, order)[0].status_code == 409
    assert db.scalar(text("SELECT count(*) FROM stock_resolution_reviews")) == 1
    assert db.scalar(text("SELECT count(*) FROM order_cancellations")) == 0
    assert db.scalar(text("SELECT count(*) FROM order_refunds")) == 0
    assert (
        list(
            db.execute(
                text("SELECT quantity,value,reserved,version FROM inventory_positions ORDER BY id")
            )
        )
        == before
    )
    public = client.get(f"/api/v1/account/requests/{key}")
    assert public.status_code == 200 and public.json()["initiated_by_staff"]
    assert 'initiated_by"' not in public.text and "actor_id" not in public.text
    # Approval has not been granted, so neither operational cancellation nor stock recommit is allowed.
    assert cancel(client, str(key))[0].status_code == 409
    token = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    stock = db.execute(text("SELECT * FROM order_stock_allocations")).mappings().one()
    blocked = client.put(
        f"/api/v1/admin/order-stock/{order}/commands/{uuid4()}",
        headers={"X-CSRF-Token": token},
        json=dict(
            expected_version=stock["version"],
            reason="Competing recommit must wait for cancellation review",
        ),
    )
    assert (
        blocked.status_code == 409 and blocked.json()["code"] == "order_stock_cancellation_pending"
    )
    from nilart.shared.outbox import consume_event

    row = (
        db.execute(
            text("SELECT * FROM outbox_events WHERE event_type='orders.stock_resolution_opened'")
        )
        .mappings()
        .one()
    )
    envelope = {"id": str(row["id"]), "event_type": row["event_type"], "payload": row["payload"]}
    assert consume_event(db, envelope) and not consume_event(db, envelope)


def test_review_origin_survives_approval_and_normal_cancellation(checkout):
    client, db, order, line = shortage(checkout)
    r, _ = open_review(client, order)
    key = r.json()["request_id"]
    for v, status in [(0, "in_review"), (1, "approved")]:
        token = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
        response = client.put(
            f"/api/v1/admin/order-requests/{key}/reviews/{uuid4()}",
            headers={"X-CSRF-Token": token},
            json=dict(
                version=v, status=status, reply="Staff explicitly reviews the shortage resolution"
            ),
        )
        assert response.status_code == 200, response.text
        assert response.json()["initiated_by_staff"]
    processed, _ = cancel(client, key)
    assert processed.status_code == 200, processed.text
    assert processed.json()["result"]["previous_stock_state"] == "shortage"
    tracking = client.get(f"/api/v1/account/requests/{key}/tracking").json()
    assert "Staff initiated" in tracking["history"][0]["reply"]


def test_stale_permissions_and_rollback_leave_no_request(checkout, monkeypatch):
    client, db, order, line = shortage(checkout)
    p = client.get(f"/api/v1/admin/order-stock/{order}/resolution-plan").json()
    body = dict(
        expected_version=p["stock_version"],
        order_version=p["order_version"] + 1,
        reason="Stale order version must not create a request",
    )
    assert open_review(client, order, body=body)[0].status_code == 409
    existing = db.scalar(
        text("SELECT id FROM customer_order_requests WHERE order_id=:id"), {"id": order}
    )
    assert open_review(client, order, key=existing)[0].status_code == 409
    from nilart.contexts.inventory import resolution_reviews

    def crash(*args, **kwargs):
        raise RuntimeError("Atomic initiation failed")

    monkeypatch.setattr(resolution_reviews, "enqueue", crash)
    with pytest.raises(RuntimeError, match="Atomic initiation failed"):
        open_review(client, order)
    assert db.scalar(text("SELECT count(*) FROM stock_resolution_reviews")) == 0
    assert (
        db.scalar(text("SELECT count(*) FROM customer_order_requests WHERE status='submitted'"))
        == 0
    )
    db.execute(text("DELETE FROM identity_account_roles WHERE role='operations'"))
    db.commit()
    assert open_review(client, order, body=body)[0].status_code == 403
