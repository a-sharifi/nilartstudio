import json
from uuid import uuid4

import pytest
from sqlalchemy import text
from test_basket import basket as basket
from test_basket import migrate
from test_identity_otp_postgres import flow as flow
from test_return_inspections_postgres import inspect, returned
from test_sandbox_payments import checkout as checkout


def setup_refund(checkout, healthy=1, damaged=1):
    client, db, request, shipment, line = returned(checkout)
    migrate(db, "0046_refunds.py")
    assert (
        inspect(client, request, shipment, line, healthy=healthy, damaged=damaged).status_code
        == 200
    )
    db.execute(
        text(
            "INSERT INTO identity_account_roles(account_id,role) SELECT account_id,'admin' FROM customer_orders ON CONFLICT DO NOTHING"
        )
    )
    db.commit()
    return client, db, request, shipment, line


def selection(request, line, quantity=1, **extra):
    return dict(
        request_id=request,
        items=[dict(line_id=line, component=0, quantity=quantity)],
        include_shipping=False,
        include_tax=False,
        close_request=False,
        **extra,
    )


def preview(client, body):
    return client.post("/api/v1/admin/refunds/quotes", json=body)


def command(client, q, key=None, **changes):
    csrf = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    data = {
        **q["selection"],
        "expected_version": q["expected_version"],
        "request_version": q["request_version"],
        "expected_amount": q["amount"],
        "quote_fingerprint": q["quote_fingerprint"],
        "reason": "Explicit simulated refund acceptance",
        "sandbox_confirmed": True,
        **changes,
    }
    return client.put(
        "/api/v1/admin/refunds/commands/" + str(key or uuid4()),
        json=data,
        headers={"X-CSRF-Token": csrf},
    )


def test_partial_full_replay_original_paid_and_no_stock_side_effect(checkout):
    client, db, request, shipment, line = setup_refund(checkout)
    before = list(
        db.execute(text("SELECT quantity,value,version FROM inventory_positions ORDER BY id"))
    )
    q = preview(client, selection(request, line)).json()
    assert q["amount"] == "100.10"
    key = uuid4()
    r = command(client, q, key)
    assert r.status_code == 200, r.text
    assert r.json()["result"]["payment_status"] == "partially_refunded"
    assert command(client, q, key).json() == r.json()
    assert command(client, q, key, reason="Changed intent must conflict").status_code == 409
    assert command(client, q).status_code == 409
    # Changing catalogue prices cannot change the original paid share.
    db.execute(text("UPDATE catalog_skus SET price_amount=999999"))
    db.commit()
    q2 = preview(client, {**selection(request, line), "close_request": True}).json()
    assert q2["amount"] == "100.10"
    final = command(client, q2)
    assert final.status_code == 200, final.text
    assert final.json()["result"]["payment_status"] == "refunded"
    assert final.json()["result"]["request_completed"]
    state = db.scalar(text("SELECT state FROM customer_orders"))
    assert state["refunded_amount"] == "200.20"
    assert state["fulfillment"] == "delivered"
    assert db.scalar(text("SELECT status FROM customer_order_requests")) == "completed"
    assert (
        list(db.execute(text("SELECT quantity,value,version FROM inventory_positions ORDER BY id")))
        == before
    )
    assert db.scalar(text("SELECT count(*) FROM order_refunds")) == 2
    assert preview(client, selection(request, line)).status_code == 409
    public = client.get("/api/v1/account/orders/" + str(final.json()["order_id"]) + "/refunds")
    assert public.status_code == 200
    for secret in [
        "actor_id",
        "reason",
        "quote_fingerprint",
        "source_movement_id",
        "original_payment_reference",
    ]:
        assert secret not in public.text


def test_uninspected_quantity_quote_staleness_and_wrong_amount(checkout):
    client, db, request, shipment, line = setup_refund(checkout)
    assert preview(client, selection(request, line, 3)).status_code == 409
    assert preview(client, selection(request, str(uuid4()))).status_code == 409
    q = preview(client, selection(request, line)).json()
    assert command(client, q, expected_amount="1").status_code == 409
    assert command(client, q, quote_fingerprint="0" * 64).status_code == 409
    db.execute(text("UPDATE customer_order_requests SET version=version+1"))
    db.commit()
    assert command(client, q).status_code == 409
    assert db.scalar(text("SELECT count(*) FROM order_refunds")) == 0


def test_explicit_charge_refunds_and_completion(checkout):
    client, db, request, shipment, line = setup_refund(checkout)
    # Explicit historical fixture charges plus matched original sandbox payment/receipt.
    snapshot = db.scalar(text("SELECT snapshot FROM customer_orders"))
    snapshot.pop("checkout_terms", None)  # Explicit legacy historical-charge fixture.
    snapshot.update(shipping_amount="10.00", tax_amount="5.00", total_amount="215.20")
    snapshot["receipt"]["paid_amount"] = "215.20"
    db.execute(
        text("UPDATE customer_orders SET snapshot=CAST(:s AS jsonb)"), {"s": json.dumps(snapshot)}
    )
    db.execute(text("UPDATE sandbox_payments SET amount_rial=2152"))
    db.commit()
    too_early = preview(client, {**selection(request, line), "close_request": True}).json()
    assert command(client, too_early).status_code == 409
    q = preview(client, selection(request, line, 2)).json()
    assert q["amount"] == "200.20"
    assert command(client, q).status_code == 200
    charge = preview(
        client,
        dict(
            request_id=request,
            items=[],
            include_shipping=True,
            include_tax=True,
            close_request=True,
        ),
    ).json()
    assert charge["amount"] == "15.00"
    final = command(client, charge)
    assert final.status_code == 200, final.text
    assert final.json()["result"]["payment_status"] == "refunded"
    assert command(client, charge).status_code == 409


def test_permission_revocation_rollback_and_customer_ownership(checkout, monkeypatch):
    client, db, request, shipment, line = setup_refund(checkout)
    q = preview(client, selection(request, line)).json()
    from nilart.contexts.payments import refunds

    def crash(*args, **kwargs):
        raise RuntimeError("atomic refund failure")

    monkeypatch.setattr(refunds, "enqueue", crash)
    with pytest.raises(RuntimeError, match="atomic refund failure"):
        command(client, q)
    assert db.scalar(text("SELECT count(*) FROM order_refunds")) == 0
    assert db.scalar(text("SELECT state->>'payment' FROM customer_orders")) == "paid"
    db.execute(text("DELETE FROM identity_account_roles WHERE role='admin'"))
    db.commit()
    assert command(client, q).status_code == 403
    assert client.get("/api/v1/admin/refunds").status_code == 403
    assert client.get("/api/v1/account/orders/" + str(uuid4()) + "/refunds").status_code == 404


def test_inspection_bound_and_independent_refund_permission(checkout):
    client, db, request, shipment, line = setup_refund(checkout, healthy=1, damaged=0)
    assert preview(client, selection(request, line, 2)).status_code == 409
    q = preview(client, selection(request, line)).json()
    db.execute(text("DELETE FROM identity_account_roles WHERE role='admin'"))
    db.execute(
        text(
            "INSERT INTO identity_account_roles(account_id,role) SELECT account_id,'finance' FROM customer_orders ON CONFLICT DO NOTHING"
        )
    )
    db.commit()
    assert client.get("/api/v1/admin/refunds").status_code == 200
    assert command(client, q).status_code == 403
    db.execute(
        text(
            "INSERT INTO identity_permission_overrides(account_id,permission,allowed) SELECT account_id,'payments.refund',true FROM customer_orders"
        )
    )
    db.commit()
    assert command(client, q).status_code == 200


def test_duplicate_callback_preserves_refund(checkout):
    client, db, request, shipment, line = setup_refund(checkout)
    q = preview(client, selection(request, line)).json()
    assert command(client, q).status_code == 200
    payment = db.execute(text("SELECT * FROM sandbox_payments")).mappings().one()
    result = client.get(
        f"/api/v1/payments/sandbox/callback/{payment['id']}?Authority={payment['authority']}&Status=OK",
        follow_redirects=False,
    )
    assert result.status_code == 303
    assert db.scalar(text("SELECT state->>'payment' FROM customer_orders")) == "partially_refunded"
    assert db.scalar(text("SELECT count(*) FROM order_refunds")) == 1


def test_incomplete_history_unconfirmed_payment_and_completion_only(checkout):
    client, db, request, shipment, line = setup_refund(checkout)
    db.execute(text("UPDATE sandbox_payments SET status='unknown'"))
    db.commit()
    assert preview(client, selection(request, line)).status_code == 409
    db.execute(text("UPDATE sandbox_payments SET status='paid'"))
    db.commit()
    q = preview(client, selection(request, line, 2)).json()
    assert command(client, q).status_code == 200
    close = preview(
        client,
        dict(
            request_id=request,
            items=[],
            include_shipping=False,
            include_tax=False,
            close_request=True,
        ),
    ).json()
    assert close["amount"] == "0.00"
    r = command(client, close)
    assert r.status_code == 200, r.text
    assert r.json()["result"]["request_completed"]
    assert r.json()["result"]["payment_status"] == "refunded"


def test_cumulative_component_rounding_exhausts_original_share():
    from types import SimpleNamespace

    from nilart.contexts.payments.refunds import component_amount

    c = SimpleNamespace(paid_amount="100.00", quantity=3)
    assert [str(component_amount(c, n, 1)) for n in range(3)] == ["33.33", "33.34", "33.33"]


def test_refund_notification_outbox_and_zero_paid_resolution(checkout):
    client, db, request, shipment, line = setup_refund(checkout)
    # A newly constructed zero-payment fixture models the supported fully discounted checkout.
    snap = db.scalar(text("SELECT snapshot FROM customer_orders"))
    snap["items"][0]["unit_amount"] = "0"
    snap["items"][0]["discount_amount"] = "0"
    snap["items"][0]["stock_components"][0]["paid_amount"] = "0"
    snap["total_amount"] = "0"
    snap["receipt"]["paid_amount"] = "0"
    db.execute(
        text("UPDATE customer_orders SET snapshot=CAST(:s AS jsonb)"), {"s": json.dumps(snap)}
    )
    # zero-payment support migration already removes the positive-only check in checkout fixture.
    db.execute(text("UPDATE sandbox_payments SET amount_rial=0"))
    db.commit()
    q = preview(client, {**selection(request, line, 2), "close_request": True}).json()
    assert q["amount"] == "0.00"
    r = command(client, q)
    assert r.status_code == 200, r.text
    assert r.json()["result"]["payment_status"] == "paid"
    from nilart.shared.outbox import consume_event

    event = (
        db.execute(text("SELECT * FROM outbox_events WHERE event_type='payments.refund_simulated'"))
        .mappings()
        .one()
    )
    envelope = {
        "id": str(event["id"]),
        "event_type": event["event_type"],
        "payload": event["payload"],
    }
    assert consume_event(db, envelope)
    assert not consume_event(db, envelope)


def test_partial_return_refund_does_not_block_remaining_parcel(checkout):
    from test_fulfillment_postgres import cmd, dispatch, packed, setup

    client, db, order, line = setup(checkout)
    migrate(db, "0026_order_request_reviews.py")
    migrate(db, "0045_return_inspections.py")
    migrate(db, "0046_refunds.py")
    parcel = packed(client, order, line, 1)
    assert dispatch(client, parcel, order).status_code == 200
    assert cmd(client, parcel, order, 5, "deliver").status_code == 200
    request = str(uuid4())
    db.execute(
        text(
            "INSERT INTO customer_order_requests(id,account_id,order_id,kind,status,payload,version,public_reply) SELECT :request,account_id,id,'return','approved',CAST(:p AS jsonb),2,'Approved fixture' FROM customer_orders WHERE id=:order"
        ),
        {
            "request": request,
            "order": order,
            "p": json.dumps({"reason": "Partial parcel fixture", "quantities": {line: 1}}),
        },
    )
    db.execute(
        text(
            "INSERT INTO identity_account_roles(account_id,role) SELECT account_id,'admin' FROM customer_orders ON CONFLICT DO NOTHING"
        )
    )
    db.commit()
    assert inspect(client, request, parcel, line).status_code == 200
    q = preview(client, {**selection(request, line), "close_request": True}).json()
    assert command(client, q).status_code == 200
    assert db.scalar(text("SELECT state->>'payment' FROM customer_orders")) == "partially_refunded"
    second = packed(client, order, line, 1)
    assert dispatch(client, second, order).status_code == 200
