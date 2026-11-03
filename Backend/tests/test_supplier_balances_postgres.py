import csv
import io
from decimal import Decimal
from zipfile import ZipFile

from sqlalchemy import text
from test_identity_otp_postgres import flow as flow
from test_opening_settlements_postgres import settle
from test_operational_finance_postgres import create, current, post, setup
from test_purchases_postgres import command, draft_post
from test_supplier_openings_postgres import save as opening

BASE = "/api/v1/admin/finance/supplier-balances"


def report(client, **params):
    return client.get(BASE, params=params)


def test_combines_distinct_cash_allocations_and_matches_statement(flow):
    client, db, supplier, material = setup(flow)
    purchase, _ = draft_post(client, supplier, material)
    cash = create(client)
    assert opening(client, supplier)[0].status_code == 200
    assert (
        post(
            client,
            "supplier_payment",
            [cash],
            "40",
            purchase_id=str(purchase),
            expected_purchase_version=2,
        ).status_code
        == 200
    )
    assert settle(client, supplier, current(client, cash["id"]), "25").status_code == 200
    before = list(db.execute(text("SELECT * FROM finance_documents ORDER BY id")))
    r = report(client)
    assert r.status_code == 200, r.text
    data = r.json()
    row = data["items"][0]
    assert Decimal(row["balance"]) == 135
    assert Decimal(row["purchase_paid"]) == 40 and Decimal(row["opening_paid"]) == 25
    assert Decimal(data["payable"]) == 135 and data["unconfigured_suppliers"] == 0
    s = client.get(
        f"/api/v1/admin/finance/suppliers/{supplier}/statement",
        params={"from_date": "1970-01-01", "to_date": "2099-12-31"},
    ).json()
    assert Decimal(s["closing_recorded_balance"]) == Decimal(row["balance"])
    assert report(client, status="credit").json()["items"] == []
    assert (
        report(client, q=row["supplier_code"].lower(), status="debt").json()["items"]
        == data["items"]
    )
    assert list(db.execute(text("SELECT * FROM finance_documents ORDER BY id"))) == before


def test_unconfigured_never_counts_as_known_debt_and_zero_credit_are_distinct(flow):
    client, db, supplier, material = setup(flow)
    purchase, _ = draft_post(client, supplier, material)
    data = report(client).json()
    row = data["items"][0]
    assert row["balance"] is None and row["opening_amount"] is None
    assert Decimal(row["recorded_balance"]) == 100 and Decimal(data["payable"]) == 0
    assert data["unconfigured_suppliers"] == 1 and row["status"] == "unconfigured"
    first = opening(client, supplier, amount="-150")[0]
    assert first.status_code == 200, first.text
    data = report(client, status="credit").json()
    assert Decimal(data["receivable"]) == 50 and data["items"][0]["status"] == "credit"
    assert command(client, purchase, 2, "cancel").status_code == 200
    assert opening(client, supplier, 1, "0", first.json()["id"])[0].status_code == 200
    assert Decimal(report(client, status="settled").json()["items"][0]["balance"]) == 0


def test_exports_fingerprint_and_independent_permissions(flow):
    client, db, supplier, _ = setup(flow)
    assert opening(client, supplier, amount="-25")[0].status_code == 200
    # User-controlled text must not become a spreadsheet formula.
    db.execute(
        text(
            "UPDATE procurement_suppliers SET content=jsonb_set(content,'{title_en}','\"=UNTRUSTED\"'::jsonb) WHERE id=:id"
        ),
        {"id": supplier},
    )
    db.commit()
    data = report(client).json()
    params = {"fingerprint": data["fingerprint"]}
    csvfile = client.get(BASE + "/export", params=params)
    assert csvfile.status_code == 200, csvfile.text
    row = list(csv.DictReader(io.StringIO(csvfile.content.decode("utf-8-sig"))))[0]
    assert row["title_en"] == "'=UNTRUSTED" and row["balance"] == "-25.000000"
    assert (
        row["supplier_id"] == str(supplier) and row["snapshot_fingerprint"] == data["fingerprint"]
    )
    excel = client.get(BASE + "/export", params={**params, "format": "xlsx"})
    assert excel.status_code == 200
    with ZipFile(io.BytesIO(excel.content)) as z:
        assert "supplier_id" in z.read("xl/worksheets/sheet1.xml").decode()
    assert report(client, offset=1).status_code == 409
    assert report(client, fingerprint="0" * 64).status_code == 409
    assert client.get(BASE + "/export", params={**params, "status": "credit"}).status_code == 409
    owner = db.scalar(text("SELECT id FROM identity_accounts LIMIT 1"))
    db.execute(
        text(
            "INSERT INTO identity_permission_overrides(account_id,permission,allowed) VALUES(:id,'finance.export',false)"
        ),
        {"id": owner},
    )
    db.commit()
    assert report(client).status_code == 200
    assert client.get(BASE + "/export", params=params).status_code == 403
    db.execute(
        text(
            "UPDATE identity_permission_overrides SET permission='finance.read' WHERE account_id=:id"
        ),
        {"id": owner},
    )
    db.commit()
    assert report(client).status_code == 403
    assert client.get(BASE + "/export", params=params).status_code == 403


def test_changed_purchase_history_invalidates_paging_and_rejects_incomplete_history(flow):
    client, db, supplier, material = setup(flow)
    purchase, _ = draft_post(client, supplier, material)
    first = report(client).json()
    assert command(client, purchase, 2, "cancel").status_code == 200
    assert report(client, fingerprint=first["fingerprint"]).status_code == 409
    db.execute(
        text("DELETE FROM procurement_purchase_events WHERE purchase_id=:id AND version=1"),
        {"id": purchase},
    )
    db.commit()
    r = report(client)
    assert r.status_code == 409 and "history_incomplete" in r.text


def test_historical_tehran_cutoffs_preserve_openings_cash_and_reversals(flow):
    from test_opening_settlements_postgres import settle

    client, db, supplier, material = setup(flow)
    cash = create(client)
    first = opening(client, supplier)[0].json()
    purchase, _ = draft_post(client, supplier, material)
    payment = post(
        client,
        "supplier_payment",
        [cash],
        "40",
        purchase_id=str(purchase),
        expected_purchase_version=2,
    ).json()
    opening_payment = settle(client, supplier, current(client, cash["id"]), "25").json()
    reversal = post(
        client, "reversal", [current(client, cash["id"])], None, reverses_id=payment["target_id"]
    ).json()
    assert command(client, purchase, 2, "cancel").status_code == 200
    correction = opening(client, supplier, 1, "50", first["id"])[0].json()
    for id, day in [
        (first["id"], "2026-10-15T00:00:00Z"),
        (correction["id"], "2026-10-19T00:00:00Z"),
    ]:
        db.execute(
            text("UPDATE supplier_opening_events SET created_at=:day WHERE id=:id"),
            {"id": id, "day": day},
        )
    for version, day in [
        (1, "2026-10-15T00:00:00Z"),
        (2, "2026-10-16T20:29:59.999999Z"),
        (3, "2026-10-18T12:00:00Z"),
    ]:
        db.execute(
            text(
                "UPDATE procurement_purchase_events SET created_at=:day WHERE purchase_id=:id AND version=:version"
            ),
            {"id": purchase, "version": version, "day": day},
        )
    for id, day in [
        (payment["target_id"], "2026-10-16T20:30:00Z"),
        (opening_payment["target_id"], "2026-10-17T20:29:59.999999Z"),
        (reversal["target_id"], "2026-10-17T20:30:00Z"),
    ]:
        db.execute(
            text("UPDATE finance_documents SET created_at=:day WHERE id=:id"),
            {"id": id, "day": day},
        )
    db.commit()
    for day, expected in [
        ("2026-10-16", 200),
        ("2026-10-17", 135),
        ("2026-10-18", 75),
        ("2026-10-19", 25),
    ]:
        r = report(client, as_of_date=day)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["as_of_date"] == day
        assert Decimal(data["items"][0]["balance"]) == expected
        statement = client.get(
            f"/api/v1/admin/finance/suppliers/{supplier}/statement",
            params={"from_date": "1970-01-01", "to_date": day},
        ).json()
        assert Decimal(statement["closing_recorded_balance"]) == expected
        assert statement["opening_balance_configured"] is True
    old = report(client, as_of_date="2026-10-14").json()["items"][0]
    assert old["balance"] is None and old["opening_event_id"] is None
    assert Decimal(old["recorded_balance"]) == 0
    statement = client.get(
        f"/api/v1/admin/finance/suppliers/{supplier}/statement",
        params={"from_date": "1970-01-01", "to_date": "2026-10-14"},
    ).json()
    assert statement["opening_balance_configured"] is False


def test_date_is_bound_to_exports_and_later_activity_does_not_rewrite_past(flow):
    client, db, supplier, material = setup(flow)
    first = opening(client, supplier)[0].json()
    purchase, _ = draft_post(client, supplier, material)
    db.execute(
        text("UPDATE supplier_opening_events SET created_at='2026-10-16T00:00:00Z' WHERE id=:id"),
        {"id": first["id"]},
    )
    db.execute(
        text(
            "UPDATE procurement_purchase_events SET created_at='2026-10-17T00:00:00Z' WHERE purchase_id=:id"
        ),
        {"id": purchase},
    )
    db.commit()
    initial = report(client, as_of_date="2026-10-18").json()
    assert command(client, purchase, 2, "cancel").status_code == 200
    later = report(client, as_of_date="2026-10-18").json()
    assert (
        later["fingerprint"] == initial["fingerprint"]
        and Decimal(later["items"][0]["balance"]) == 200
    )
    assert Decimal(report(client).json()["items"][0]["balance"]) == 100
    params = {"fingerprint": initial["fingerprint"], "as_of_date": "2026-10-18"}
    exported = client.get(BASE + "/export", params=params)
    assert exported.status_code == 200, exported.text
    row = list(csv.DictReader(io.StringIO(exported.content.decode("utf-8-sig"))))[0]
    assert row["recorded_through_tehran"] == "2026-10-18"
    assert (
        client.get(BASE + "/export", params={**params, "as_of_date": "2026-10-19"}).status_code
        == 409
    )
    assert report(client, as_of_date="2999-01-01").status_code == 409
    assert report(client, as_of_date="invalid").status_code == 422
