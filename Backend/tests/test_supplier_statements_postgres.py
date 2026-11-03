import csv
import io
from decimal import Decimal
from uuid import uuid4
from zipfile import ZipFile

from sqlalchemy import text
from test_identity_otp_postgres import flow as flow
from test_operational_finance_postgres import create, current, post, setup
from test_purchases_postgres import command, content, draft_post


def get(client, supplier, **params):
    return client.get(
        f"/api/v1/admin/finance/suppliers/{supplier}/statement",
        params={"from_date": "1970-01-01", "to_date": "2099-12-31", **params},
    )


def test_purchase_receipts_returns_payments_and_reversals_preserve_exact_balance(flow):
    client, db, supplier, material = setup(flow)
    account = create(client)
    purchase, line = draft_post(client, supplier, material)
    payment = post(
        client,
        "supplier_payment",
        [account],
        "40",
        purchase_id=str(purchase),
        expected_purchase_version=2,
    )
    assert payment.status_code == 200, payment.text
    receipt = command(client, purchase, 2, "receive", lines=[dict(line_id=line, quantity="5")])
    assert receipt.status_code == 200
    assert (
        command(
            client,
            purchase,
            3,
            "return",
            receipt_id=receipt.json()["id"],
            lines=[dict(line_id=line, quantity="2")],
        ).status_code
        == 200
    )
    account = current(client, account["id"])
    reversal = post(client, "reversal", [account], None, reverses_id=payment.json()["target_id"])
    assert reversal.status_code == 200, reversal.text
    before = list(db.execute(text("SELECT quantity,value,version FROM inventory_positions")))
    r = get(client, supplier)
    assert r.status_code == 200, r.text
    s = r.json()
    assert s["opening_balance_configured"] is False
    assert Decimal(s["liability_change"]) == 80 and Decimal(s["paid_net"]) == 0
    assert Decimal(s["closing_recorded_balance"]) == 80
    assert len(s["items"]) == 4
    assert {r["kind"] for r in s["items"]} == {"post", "return", "supplier_payment", "reversal"}
    assert (
        next(r for r in s["items"] if r["kind"] == "return")["corrects_id"] == receipt.json()["id"]
    )
    assert (
        next(r for r in s["items"] if r["kind"] == "reversal")["corrects_id"]
        == payment.json()["target_id"]
    )
    assert Decimal(s["items"][-1]["balance"]) == 80
    assert (
        list(db.execute(text("SELECT quantity,value,version FROM inventory_positions"))) == before
    )
    assert (
        Decimal(client.get("/api/v1/admin/finance/balances").json()["items"][0]["outstanding"])
        == 80
    )


def test_pagination_rejects_changed_ledger_and_missing_fingerprint(flow):
    client, db, supplier, material = setup(flow)
    purchase, _ = draft_post(client, supplier, material)
    account = create(client)
    assert (
        post(
            client,
            "supplier_payment",
            [account],
            "40",
            purchase_id=str(purchase),
            expected_purchase_version=2,
        ).status_code
        == 200
    )
    first = get(client, supplier, limit=1).json()
    assert first["next_offset"] == 1
    assert get(client, supplier, offset=1, limit=1).status_code == 409
    second = get(client, supplier, offset=1, limit=1, fingerprint=first["fingerprint"])
    assert second.status_code == 200, second.text
    assert len(second.json()["items"]) == 1 and second.json()["next_offset"] is None
    assert command(client, purchase, 2, "cancel").status_code == 200
    assert get(client, supplier, offset=1, fingerprint=first["fingerprint"]).status_code == 409
    fresh = get(client, supplier).json()
    assert Decimal(fresh["closing_recorded_balance"]) == -40
    assert fresh["fingerprint"] != first["fingerprint"]


def test_recording_dates_use_tehran_and_include_prior_recorded_balance(flow):
    client, db, supplier, material = setup(flow)
    purchase, _ = draft_post(client, supplier, material)
    # 21:00 UTC is already the next recording day in Tehran.
    db.execute(
        text(
            "UPDATE procurement_purchase_events SET created_at='2026-10-18T21:00:00+00:00' WHERE purchase_id=:id"
        ),
        {"id": purchase},
    )
    db.commit()
    before = get(client, supplier, from_date="2026-10-18", to_date="2026-10-18").json()
    assert not before["items"] and Decimal(before["closing_recorded_balance"]) == 0
    day = get(client, supplier, from_date="2026-10-19", to_date="2026-10-19").json()
    assert len(day["items"]) == 1 and day["items"][0]["document_date"] == "2026-10-18"
    later = get(client, supplier, from_date="2026-10-20", to_date="2026-10-20").json()
    assert (
        not later["items"]
        and Decimal(later["opening_recorded_balance"]) == 100
        and Decimal(later["closing_recorded_balance"]) == 100
    )
    assert get(client, supplier, from_date="2026-10-20", to_date="2026-10-19").status_code == 409


def test_exports_permissions_formula_safety_and_incomplete_history(flow):
    client, db, supplier, material = setup(flow)
    purchase = uuid4()
    body = content(supplier, material)
    body["document_number"] = "=FORMULA-SAFETY"
    assert command(client, purchase, 0, "draft", content=body).status_code == 200
    assert command(client, purchase, 1, "post").status_code == 200
    s = get(client, supplier).json()
    base = f"/api/v1/admin/finance/suppliers/{supplier}/statement/export"
    params = dict(from_date="1970-01-01", to_date="2099-12-31", fingerprint=s["fingerprint"])
    csvfile = client.get(base, params=params)
    assert csvfile.status_code == 200, csvfile.text
    row = list(csv.DictReader(io.StringIO(csvfile.content.decode("utf-8-sig"))))[0]
    assert (
        row["supplier_id"] == str(supplier)
        and row["currency"] == "IRT"
        and row["opening_balance_configured"] == "False"
    )
    excel = client.get(base, params={**params, "format": "xlsx"})
    assert excel.status_code == 200
    with ZipFile(io.BytesIO(excel.content)) as archive:
        assert "filter_recorded_from" in archive.read("xl/worksheets/sheet1.xml").decode()
    assert client.get(base, params={**params, "fingerprint": "0" * 64}).status_code == 409
    owner = db.scalar(text("SELECT id FROM identity_accounts LIMIT 1"))
    db.execute(
        text(
            "INSERT INTO identity_permission_overrides(account_id,permission,allowed) VALUES(:id,'finance.export',false)"
        ),
        {"id": owner},
    )
    db.commit()
    assert get(client, supplier).status_code == 200
    assert client.get(base, params=params).status_code == 403
    db.execute(
        text(
            "INSERT INTO identity_permission_overrides(account_id,permission,allowed) VALUES(:id,'finance.read',false)"
        ),
        {"id": owner},
    )
    db.commit()
    assert get(client, supplier).status_code == 403
    db.execute(text("DELETE FROM identity_permission_overrides"))
    db.execute(
        text("DELETE FROM procurement_purchase_events WHERE purchase_id=:id AND version=1"),
        {"id": purchase},
    )
    db.commit()
    r = get(client, supplier)
    assert r.status_code == 409 and "history_incomplete" in r.text
    assert get(client, uuid4()).status_code == 404
