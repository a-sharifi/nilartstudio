from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import text
from test_identity_otp_postgres import flow as flow
from test_operational_finance_postgres import create, current, post, setup
from test_supplier_openings_postgres import save as opening
from test_supplier_statements_postgres import get as statement


def plan(client, id):
    r = client.get(f"/api/v1/admin/finance/suppliers/{id}/opening/settlement")
    assert r.status_code == 200, r.text
    return r.json()


def settle(
    client,
    supplier,
    account,
    amount="40",
    kind="supplier_opening_payment",
    key=None,
    proof=None,
    **extra,
):
    p = proof or plan(client, supplier)
    return post(
        client,
        kind,
        [account],
        amount,
        key,
        opening_event_id=p["opening_event_id"],
        expected_opening_settlement_version=p["settlement_version"],
        **extra,
    )


def reverse(client, supplier, account, id, proof=None):
    return settle(client, supplier, account, None, "reversal", proof=proof, reverses_id=id)


def test_partial_payments_replay_bounds_and_statement_do_not_touch_purchases(flow):
    client, db, supplier, _ = setup(flow)
    cash = create(client)
    assert not plan(client, supplier)["configured"]
    assert plan(client, supplier)["outstanding"] is None
    assert opening(client, supplier)[0].status_code == 200
    key = uuid4()
    p = plan(client, supplier)
    r = settle(client, supplier, cash, key=key, proof=p)
    assert r.status_code == 200, r.text
    assert settle(client, supplier, cash, key=key, proof=p).json() == r.json()
    doc = r.json()["result"]["document"]
    assert doc["purchase_id"] is None and doc["opening_supplier_id"] == str(supplier)
    assert Decimal(doc["opening_allocation_amount"]) == 40
    assert Decimal(plan(client, supplier)["outstanding"]) == 60
    assert settle(client, supplier, current(client, cash["id"]), "61").status_code == 409
    second = settle(client, supplier, current(client, cash["id"]), "60")
    assert second.status_code == 200, second.text
    assert Decimal(plan(client, supplier)["outstanding"]) == 0
    assert settle(client, supplier, current(client, cash["id"]), "1").status_code == 409
    report = statement(client, supplier).json()
    assert (
        Decimal(report["opening_change"]) == 100
        and Decimal(report["paid_net"]) == 100
        and Decimal(report["closing_recorded_balance"]) == 0
    )
    assert db.scalar(text("SELECT count(*) FROM finance_allocations")) == 0
    assert db.scalar(text("SELECT count(*) FROM inventory_movements")) == 0
    assert db.scalar(text("SELECT count(*) FROM procurement_purchases")) == 0
    assert (
        len(
            client.get(f"/api/v1/admin/finance/suppliers/{supplier}/opening/settlements").json()[
                "items"
            ]
        )
        == 2
    )


def test_credit_receipt_corrections_and_dependent_reversals_are_bounded(flow):
    client, db, supplier, _ = setup(flow)
    cash = create(client, "0")
    first, _ = opening(client, supplier, amount="-100")
    r = settle(client, supplier, cash, "100", "supplier_opening_refund")
    assert r.status_code == 200, r.text
    correction, _ = opening(client, supplier, 1, "-50", first.json()["id"])
    assert correction.status_code == 200
    paid = settle(client, supplier, current(client, cash["id"]), "50")
    assert paid.status_code == 200, paid.text
    assert (
        reverse(client, supplier, current(client, cash["id"]), r.json()["target_id"]).status_code
        == 409
    )
    assert (
        reverse(client, supplier, current(client, cash["id"]), paid.json()["target_id"]).status_code
        == 200
    )
    assert (
        reverse(client, supplier, current(client, cash["id"]), r.json()["target_id"]).status_code
        == 200
    )
    assert Decimal(current(client, cash["id"])["balance"]) == 0
    assert Decimal(plan(client, supplier)["outstanding"]) == -50
    assert db.scalar(text("SELECT count(*) FROM finance_opening_allocations")) == 4


def test_debt_overpayment_refund_reversal_requires_correct_dependency_order(flow):
    client, db, supplier, _ = setup(flow)
    cash = create(client)
    first, _ = opening(client, supplier)
    payment = settle(client, supplier, cash, "100")
    assert payment.status_code == 200
    assert opening(client, supplier, 1, "50", first.json()["id"])[0].status_code == 200
    refund = settle(client, supplier, current(client, cash["id"]), "50", "supplier_opening_refund")
    assert refund.status_code == 200, refund.text
    assert (
        reverse(
            client, supplier, current(client, cash["id"]), payment.json()["target_id"]
        ).status_code
        == 409
    )
    assert (
        reverse(
            client, supplier, current(client, cash["id"]), refund.json()["target_id"]
        ).status_code
        == 200
    )
    assert (
        reverse(
            client, supplier, current(client, cash["id"]), payment.json()["target_id"]
        ).status_code
        == 200
    )
    assert (
        reverse(
            client, supplier, current(client, cash["id"]), payment.json()["target_id"]
        ).status_code
        == 409
    )
    assert Decimal(plan(client, supplier)["paid_net"]) == 0
    assert Decimal(plan(client, supplier)["outstanding"]) == 50


def test_stale_other_account_payment_opening_change_and_cash_rollback(flow, monkeypatch):
    client, db, supplier, _ = setup(flow)
    cash = create(client)
    other = create(client)
    first, _ = opening(client, supplier)
    p = plan(client, supplier)
    assert settle(client, supplier, cash).status_code == 200
    assert settle(client, supplier, other, proof=p).status_code == 409
    assert Decimal(current(client, other["id"])["balance"]) == 500
    assert opening(client, supplier, 1, "80", first.json()["id"])[0].status_code == 200
    assert settle(client, supplier, other, proof={**p, "settlement_version": 1}).status_code == 409
    from nilart.contexts.finance import router

    def crash(*args, **kwargs):
        raise RuntimeError("settlement atomic rollback")

    with monkeypatch.context() as patch:
        patch.setattr(router, "enqueue", crash)
        with pytest.raises(RuntimeError, match="settlement atomic rollback"):
            settle(client, supplier, other)
    assert Decimal(current(client, other["id"])["balance"]) == 500
    assert db.scalar(text("SELECT count(*) FROM finance_opening_allocations")) == 1
    owner = db.scalar(text("SELECT id FROM identity_accounts LIMIT 1"))
    db.execute(
        text(
            "INSERT INTO identity_permission_overrides(account_id,permission,allowed) VALUES(:id,'finance.read',false)"
        ),
        {"id": owner},
    )
    db.commit()
    assert settle(client, supplier, other, proof=plan_payload(p)).status_code == 403


def plan_payload(p):
    return p


def test_ordinary_cash_reversal_cannot_be_attached_to_opening(flow):
    client, db, supplier, _ = setup(flow)
    cash = create(client)
    assert opening(client, supplier)[0].status_code == 200
    receipt = post(client, "payment", [cash], "10")
    assert receipt.status_code == 200, receipt.text
    original = receipt.json()["result"]["document"]["id"]
    before = current(client, cash["id"])
    result = reverse(client, supplier, before, original)
    assert result.status_code == 409, result.text
    assert current(client, cash["id"]) == before
    assert plan(client, supplier)["settlement_version"] == 0
