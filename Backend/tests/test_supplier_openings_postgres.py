from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import text
from test_identity_otp_postgres import flow as flow
from test_operational_finance_postgres import setup
from test_purchases_postgres import draft_post
from test_supplier_statements_postgres import get as statement


def save(client, supplier, version=0, amount="100", corrects=None, key=None, **changes):
    body = {
        **dict(
            currency="IRT",
            expected_version=version,
            amount=amount,
            corrects_id=corrects,
            as_of_date="2020-01-01",
            source_reference="External supplier statement before system activity",
            excludes_recorded_activity=True,
            reason="Explicit imported supplier opening review",
        ),
        **changes,
    }
    return client.put(
        f"/api/v1/admin/finance/suppliers/{supplier}/opening/commands/{key or uuid4()}", json=body
    ), body


def test_explicit_zero_credit_and_linked_replacement_do_not_move_money_or_stock(flow):
    client, db, supplier, material = setup(flow)
    assert client.get(f"/api/v1/admin/finance/suppliers/{supplier}/opening").json() is None
    purchase, _ = draft_post(client, supplier, material)
    before = list(db.execute(text("SELECT * FROM finance_accounts")))
    key = uuid4()
    first, body = save(client, supplier, key=key)
    assert first.status_code == 200, first.text
    assert first.json()["result"]["cash_moved"] is False
    assert save(client, supplier, key=key)[0].json() == first.json()
    old_hash = statement(client, supplier).json()["fingerprint"]
    corrected, _ = save(client, supplier, 1, "-25", str(key))
    assert corrected.status_code == 200, corrected.text
    assert Decimal(corrected.json()["result"]["delta"]) == -125
    s = statement(client, supplier).json()
    assert s["opening_balance_configured"] is True
    assert Decimal(s["opening_change"]) == -25
    assert Decimal(s["paid_net"]) == 0 and Decimal(s["liability_change"]) == 100
    assert Decimal(s["closing_recorded_balance"]) == 75
    assert len([r for r in s["items"] if r["source"] == "opening"]) == 2
    assert all(r["purchase_id"] is None for r in s["items"] if r["source"] == "opening")
    assert statement(client, supplier, fingerprint=old_hash).status_code == 409
    assert list(db.execute(text("SELECT * FROM finance_accounts"))) == before
    assert db.scalar(text("SELECT count(*) FROM inventory_movements")) == 0
    assert db.scalar(text("SELECT count(*) FROM finance_documents")) == 0
    assert db.scalar(text("SELECT count(*) FROM finance_allocations")) == 0
    assert save(client, supplier, key=key)[0].json() == first.json()
    zero, _ = save(client, supplier, 2, "0", corrected.json()["id"])
    assert zero.status_code == 200, zero.text
    assert Decimal(statement(client, supplier).json()["closing_recorded_balance"]) == 100
    history = client.get(f"/api/v1/admin/finance/suppliers/{supplier}/opening/history").json()
    assert [r["version"] for r in history["items"]] == [3, 2, 1]
    from nilart.shared.outbox import consume_event

    for r in db.execute(
        text("SELECT * FROM outbox_events WHERE event_type='finance.supplier_opening_recorded'")
    ).mappings():
        event = dict(id=str(r["id"]), event_type=r["event_type"], payload=r["payload"])
        assert consume_event(db, event)
        assert not consume_event(db, event)


def test_stale_link_overlap_validation_and_exact_receipt_scope(flow):
    client, db, supplier, material = setup(flow)
    bad, _ = save(client, supplier, as_of_date="2099-01-01")
    assert bad.status_code == 409
    assert save(client, supplier, excludes_recorded_activity=False)[0].status_code == 422
    assert save(client, supplier, amount="-0")[0].status_code == 422
    assert save(client, supplier, amount="1.0000001")[0].status_code == 422
    purchase, _ = draft_post(client, supplier, material)
    db.execute(
        text(
            "UPDATE procurement_purchase_events SET created_at='2019-01-01T00:00:00Z' WHERE purchase_id=:id"
        ),
        {"id": purchase},
    )
    db.commit()
    assert save(client, supplier)[0].status_code == 409
    first, _ = save(client, supplier, as_of_date="2018-12-31")
    assert first.status_code == 200, first.text
    assert save(client, supplier, as_of_date="2018-12-31")[0].status_code == 409
    assert (
        save(client, supplier, 1, "50", str(uuid4()), as_of_date="2018-12-31")[0].status_code == 409
    )
    assert (
        save(client, supplier, 1, "50", first.json()["id"], as_of_date="2018-12-30")[0].status_code
        == 409
    )
    assert (
        save(client, supplier, key=first.json()["id"], as_of_date="2018-12-31", amount="101")[
            0
        ].status_code
        == 409
    )
    assert (
        save(client, uuid4(), key=first.json()["id"], as_of_date="2018-12-31")[0].status_code == 409
    )


def test_opening_atomic_rollback_and_independent_permission_recheck(flow, monkeypatch):
    client, db, supplier, _ = setup(flow)
    from nilart.contexts.finance import supplier_openings

    def crash(*args):
        raise RuntimeError("supplier opening rollback")

    with monkeypatch.context() as patch:
        patch.setattr(supplier_openings, "enqueue", crash)
        with pytest.raises(RuntimeError, match="supplier opening rollback"):
            save(client, supplier)
    assert db.scalar(text("SELECT count(*) FROM supplier_opening_events")) == 0
    assert (
        db.scalar(
            text(
                "SELECT count(*) FROM identity_audits WHERE action='finance.supplier_opening_recorded'"
            )
        )
        == 0
    )
    actor = db.scalar(text("SELECT id FROM identity_accounts LIMIT 1"))
    db.execute(
        text(
            "INSERT INTO identity_permission_overrides(account_id,permission,allowed) VALUES(:id,'finance.write',false)"
        ),
        {"id": actor},
    )
    db.commit()
    assert client.get(f"/api/v1/admin/finance/suppliers/{supplier}/opening").status_code == 200
    assert save(client, supplier)[0].status_code == 403
    db.execute(
        text(
            "UPDATE identity_permission_overrides SET permission='finance.read' WHERE account_id=:id"
        ),
        {"id": actor},
    )
    db.commit()
    assert save(client, supplier)[0].status_code == 403
    assert (
        client.get(f"/api/v1/admin/finance/suppliers/{supplier}/opening/history").status_code == 403
    )
