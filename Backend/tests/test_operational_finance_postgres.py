import importlib.util
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from test_identity_otp_postgres import flow as flow
from test_purchases_postgres import command as purchase_command
from test_purchases_postgres import draft_post
from test_purchases_postgres import setup as purchase_setup


def setup(flow):
    client, db, supplier, material = purchase_setup(flow)
    path = Path(__file__).parents[1] / "migrations/versions/0040_operational_finance.py"
    spec = importlib.util.spec_from_file_location(path.stem, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(db.connection())):
        module.upgrade()
    path = Path(__file__).parents[1] / "migrations/versions/0050_supplier_openings.py"
    spec = importlib.util.spec_from_file_location(path.stem, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(db.connection())):
        module.upgrade()
    path = Path(__file__).parents[1] / "migrations/versions/0051_opening_settlements.py"
    spec = importlib.util.spec_from_file_location(path.stem, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(db.connection())):
        module.upgrade()
    db.commit()
    return client, db, supplier, material


def create(client, amount="500", id=None, code=None):
    id = id or uuid4()
    code = code or f"C-{str(id)[:8].upper()}"
    response = client.put(
        f"/api/v1/admin/finance/accounts/{id}/commands/{uuid4()}",
        json=dict(
            expected_version=0,
            content=dict(
                code=code, title_fa="حساب آزمایش", title_en="Test account", kind="cash", active=True
            ),
            opening_amount=amount,
            opening_date="2026-10-19",
            reason="Counted opening balance",
        ),
    )
    assert response.status_code == 200, response.text
    return response.json()["result"]["accounts"][0]


def post(client, kind, accounts, amount="10", key=None, **changes):
    body = dict(
        kind=kind,
        document_number="F-001",
        document_date="2026-10-19",
        amount=amount,
        expected_versions={a["id"]: a["version"] for a in accounts},
        description="Recorded sandbox cash operation",
        supporting_reference="Proof-001",
        reason="Reviewed actual record",
    )
    if kind in {"payment", "expense", "supplier_payment", "supplier_opening_payment", "transfer"}:
        body["source_account_id"] = accounts[0]["id"]
    if kind in {"receipt", "supplier_refund", "supplier_opening_refund", "transfer"}:
        body["target_account_id"] = accounts[-1]["id"]
    body.update(changes)
    return client.put(f"/api/v1/admin/finance/documents/{key or uuid4()}", json=body)


def current(client, id):
    return next(
        a for a in client.get("/api/v1/admin/finance/accounts").json()["items"] if a["id"] == id
    )


def test_cash_transfer_and_exact_retry_never_create_revenue_or_duplicate_cash(flow):
    client, db, supplier, material = setup(flow)
    cash = create(client)
    bank = create(client, "0")
    key = uuid4()
    first = post(client, "transfer", [cash, bank], "30", key)
    assert first.status_code == 200, first.text
    assert post(client, "transfer", [cash, bank], "30", key).json() == first.json()
    assert post(client, "transfer", [cash, bank], "31", key).status_code == 409
    assert current(client, cash["id"])["balance"] == "470.000000"
    assert current(client, bank["id"])["balance"] == "30.000000"
    report = client.get(
        "/api/v1/admin/finance/cashflow", params=dict(from_date="2026-10-19", to_date="2026-10-19")
    ).json()
    assert report["inflow"] == "0" and report["outflow"] == "0"
    assert db.scalar(text("SELECT count(*) FROM finance_documents")) == 3
    assert client.get(f"/api/v1/admin/finance/commands/{key}").json() == first.json()


def test_partial_supplier_payments_returns_refunds_and_credit_are_separate(flow):
    client, db, supplier, material = setup(flow)
    cash = create(client)
    id, line = draft_post(client, supplier, material)
    first = post(
        client, "supplier_payment", [cash], "40", purchase_id=str(id), expected_purchase_version=2
    )
    assert first.status_code == 200, first.text
    assert db.scalar(text("SELECT count(*) FROM inventory_movements")) == 0
    cash = current(client, cash["id"])
    assert (
        post(
            client,
            "supplier_payment",
            [cash],
            "70",
            purchase_id=str(id),
            expected_purchase_version=2,
        ).status_code
        == 409
    )
    assert (
        post(
            client,
            "supplier_payment",
            [cash],
            "60",
            purchase_id=str(id),
            expected_purchase_version=2,
        ).status_code
        == 200
    )
    received = purchase_command(client, id, 2, "receive", lines=[dict(line_id=line, quantity="5")])
    assert received.status_code == 200, received.text
    returned = purchase_command(
        client,
        id,
        3,
        "return",
        receipt_id=received.json()["id"],
        lines=[dict(line_id=line, quantity="2")],
    )
    assert returned.status_code == 200, returned.text
    balance = client.get("/api/v1/admin/finance/balances").json()["items"][0]
    assert (
        balance["liability"] == "80.000000"
        and balance["paid_net"] == "100.000000"
        and balance["outstanding"] == "-20.000000"
    )
    cash = current(client, cash["id"])
    assert (
        post(
            client,
            "supplier_refund",
            [cash],
            "21",
            purchase_id=str(id),
            expected_purchase_version=4,
        ).status_code
        == 409
    )
    result = post(
        client, "supplier_refund", [cash], "20", purchase_id=str(id), expected_purchase_version=4
    )
    assert result.status_code == 200, result.text
    assert (
        client.get("/api/v1/admin/finance/balances").json()["items"][0]["outstanding"] == "0.000000"
    )
    assert current(client, cash["id"])["balance"] == "420.000000"
    assert db.scalar(text("SELECT quantity FROM inventory_positions")) == 3


def test_reversal_is_linked_and_bounded_by_dependent_supplier_refunds(flow):
    client, db, supplier, material = setup(flow)
    cash = create(client)
    id, line = draft_post(client, supplier, material)
    payment = post(
        client, "supplier_payment", [cash], "100", purchase_id=str(id), expected_purchase_version=2
    )
    assert payment.status_code == 200
    assert purchase_command(client, id, 2, "cancel").status_code == 200
    cash = current(client, cash["id"])
    refund = post(
        client, "supplier_refund", [cash], "100", purchase_id=str(id), expected_purchase_version=3
    )
    assert refund.status_code == 200, refund.text
    cash = current(client, cash["id"])
    assert (
        post(client, "reversal", [cash], None, reverses_id=payment.json()["target_id"]).status_code
        == 409
    )
    reversed_refund = post(client, "reversal", [cash], None, reverses_id=refund.json()["target_id"])
    assert reversed_refund.status_code == 200, reversed_refund.text
    cash = current(client, cash["id"])
    reverse = post(client, "reversal", [cash], None, reverses_id=payment.json()["target_id"])
    assert reverse.status_code == 200, reverse.text
    cash = current(client, cash["id"])
    assert (
        post(client, "reversal", [cash], None, reverses_id=payment.json()["target_id"]).status_code
        == 409
    )
    assert cash["balance"] == "500.000000"
    assert (
        client.get(f"/api/v1/admin/finance/documents/{payment.json()['target_id']}").json()[
            "reversed_by"
        ]
        == reverse.json()["target_id"]
    )


def test_failed_transfer_rolls_back_first_account_and_document(flow):
    client, db, supplier, material = setup(flow)
    cash = create(client, id=__import__("uuid").UUID("10000000-0000-4000-8000-000000000001"))
    bank = create(client, "0", id=__import__("uuid").UUID("20000000-0000-4000-8000-000000000001"))
    result = client.put(
        f"/api/v1/admin/finance/accounts/{bank['id']}/commands/{uuid4()}",
        json=dict(
            expected_version=1,
            content=dict(
                code=bank["code"],
                title_fa=bank["title_fa"],
                title_en=bank["title_en"],
                kind="cash",
                active=False,
            ),
            reason="Archive empty account",
        ),
    )
    assert result.status_code == 200, result.text
    bank = current(client, bank["id"])
    assert post(client, "transfer", [cash, bank], "20").status_code == 409
    assert (
        current(client, cash["id"])["balance"] == "500.000000"
        and current(client, cash["id"])["version"] == 1
    )
    assert db.scalar(text("SELECT count(*) FROM finance_documents")) == 2
    assert post(client, "payment", [cash], "501").status_code == 409


def test_expense_correction_and_cashflow_exclude_internal_transfers_and_opening(flow):
    client, db, supplier, material = setup(flow)
    cash = create(client, "1000")
    bank = create(client, "0")
    assert post(client, "receipt", [cash], "100").status_code == 200
    cash = current(client, cash["id"])
    expense = post(client, "expense", [cash], "30", category="Rent")
    assert expense.status_code == 200
    cash = current(client, cash["id"])
    assert post(client, "payment", [cash], "20").status_code == 200
    cash = current(client, cash["id"])
    transfer = post(client, "transfer", [cash, bank], "40")
    assert transfer.status_code == 200
    cash = current(client, cash["id"])
    assert (
        post(client, "reversal", [cash], None, reverses_id=expense.json()["target_id"]).status_code
        == 200
    )
    report = client.get(
        "/api/v1/admin/finance/cashflow", params=dict(from_date="2026-10-19", to_date="2026-10-19")
    )
    assert report.status_code == 200, report.text
    assert report.json() == dict(
        from_date="2026-10-19",
        to_date="2026-10-19",
        currency="IRT",
        inflow="130.000000",
        outflow="50.000000",
        net="80.000000",
        operating_expenses="0.000000",
    )
    assert current(client, cash["id"])["balance"] == "1040.000000"


def test_finance_permissions_csrf_and_export_are_independent(flow):
    client, db, supplier, material = setup(flow)
    cash = create(client)
    owner = db.scalar(text("SELECT account_id FROM identity_account_roles WHERE role='admin'"))
    db.execute(
        text(
            "INSERT INTO identity_permission_overrides(account_id,permission,allowed) VALUES(:id,'finance.write',false),(:id,'finance.export',false)"
        ),
        dict(id=owner),
    )
    db.commit()
    assert client.get("/api/v1/admin/finance/accounts").status_code == 200
    assert post(client, "payment", [cash], "1").status_code == 403
    assert (
        client.get(
            "/api/v1/admin/finance/export",
            params=dict(from_date="2026-10-19", to_date="2026-10-19"),
        ).status_code
        == 403
    )
    db.execute(
        text(
            "UPDATE identity_permission_overrides SET allowed=true WHERE account_id=:id AND permission='finance.write'"
        ),
        dict(id=owner),
    )
    db.execute(
        text(
            "INSERT INTO identity_permission_overrides(account_id,permission,allowed) VALUES(:id,'finance.read',false)"
        ),
        dict(id=owner),
    )
    db.commit()
    assert client.get("/api/v1/admin/finance/accounts").status_code == 403
    result = post(client, "payment", [cash], "1")
    assert result.status_code == 200, result.text
    assert client.get(f"/api/v1/admin/finance/commands/{result.json()['id']}").status_code == 200
    client.headers["X-CSRF-Token"] = "wrong"
    assert post(client, "payment", [cash], "1").status_code == 403


def test_csv_exports_source_ids_currency_filters_and_formula_safe_text(flow):
    client, db, supplier, material = setup(flow)
    cash = create(client, "0")
    result = post(
        client, "receipt", [cash], "0.1", description="=unsafe", supporting_reference="+reference"
    )
    assert result.status_code == 200
    cash = current(client, cash["id"])
    assert post(client, "receipt", [cash], "0.2").status_code == 200
    assert current(client, cash["id"])["balance"] == "0.300000"
    export = client.get(
        "/api/v1/admin/finance/export", params=dict(from_date="2026-10-19", to_date="2026-10-19")
    )
    assert export.status_code == 200 and "no-store" in export.headers["cache-control"]
    assert (
        "'=unsafe" in export.text
        and "'+reference" in export.text
        and str(result.json()["target_id"]) in export.text
    )
    assert "IRT" in export.text and "filter_from" in export.text
    assert db.scalar(text("SELECT sum(delta) FROM finance_lines")) == Decimal("0.3")
