from datetime import datetime, timedelta, timezone
from decimal import Decimal
from io import BytesIO
from uuid import uuid4
from xml.etree import ElementTree as ET
from zipfile import ZipFile

from sqlalchemy import text
from test_identity_otp_postgres import flow as flow
from test_operational_finance_postgres import create
from test_operational_finance_postgres import setup as finance_setup
from test_production_postgres import command, running, setup


def at(db):
    # The integration fixture nests requests in one outer transaction, so now()
    # otherwise gives all events the same timestamp. Assign distinct record times.
    for table in ("inventory_movements", "production_events"):
        known = db.info.setdefault("report_seen_" + table, set())
        rows = db.execute(text(f"SELECT id FROM {table}")).scalars().all()
        unseen = set(rows) - known
        if unseen:
            db.execute(
                text(
                    f"UPDATE {table} SET created_at=clock_timestamp() WHERE id=ANY(CAST(:ids AS uuid[]))"
                ),
                dict(ids=list(unseen)),
            )
            known.update(unseen)
    value = db.scalar(text("SELECT clock_timestamp()"))
    db.commit()
    return value.isoformat()


def read(client, report, as_of, **params):
    result = client.get("/api/v1/admin/reports/" + report, params=dict(as_of=as_of, **params))
    assert result.status_code == 200, result.text
    return result.json()


def test_asof_inventory_valuation_preserves_cost_threshold_and_full_totals_across_pages(flow):
    client, db, sku, line, rid, key = setup(flow)
    before = at(db)
    report = read(client, "inventory", before)
    assert report["totals"]["value"] == "1000.000000"
    position = report["items"][0]
    assert position["average_cost"] == "10.000000" and position["threshold"] is None
    threshold = client.put(
        f"/api/v1/admin/inventory/commands/{uuid4()}",
        json=dict(
            kind="material",
            reference_id=line["resource_id"],
            expected_version=1,
            action="threshold",
            threshold="100",
            reason="Counted replenishment threshold",
        ),
    )
    assert threshold.status_code == 200
    after = at(db)
    assert read(client, "inventory", before, low=True)["items"] == []
    assert len(read(client, "inventory", after, low=True)["items"]) == 1
    assert (
        read(client, "inventory", after, cursor=position["id"])["totals"]["value"] == "1000.000000"
    )
    assert read(client, "inventory", after, cursor=position["id"])["items"] == []
    assert read(client, "inventory", after, q="unmatched")["totals"]["count"] == 0
    assert read(client, "inventory", before)["items"][0]["movement_id"] == position["movement_id"]


def test_movements_and_waste_preserve_originals_linked_reversals_and_time_boundaries(flow):
    client, db, sku, line, rid, key = setup(flow)
    start = at(db)
    key = uuid4()
    lost = client.put(
        f"/api/v1/admin/inventory/commands/{key}",
        json=dict(
            kind="material",
            reference_id=line["resource_id"],
            expected_version=1,
            action="waste",
            quantity="2",
            reason="Counted damaged sheets",
        ),
    )
    assert lost.status_code == 200
    boundary = at(db)
    restored = client.put(
        f"/api/v1/admin/inventory/commands/{uuid4()}",
        json=dict(
            kind="material",
            reference_id=line["resource_id"],
            expected_version=2,
            action="reverse",
            reverses_id=str(key),
            reason="Linked inspection correction",
        ),
    )
    assert restored.status_code == 200
    end = at(db)
    historical = read(client, "waste", boundary, from_time=start)
    assert (
        historical["totals"]["value"] == "-20.000000"
        and historical["items"][0]["reversed_by"] is None
    )
    current = read(client, "waste", end, from_time=start)
    assert (
        current["totals"]["value"] == "0.000000"
        and current["totals"]["groups"][0]["quantity"] == "0.000000"
    )
    assert current["totals"]["count"] == 2
    assert (
        next(r for r in current["items"] if r["id"] == str(key))["reversed_by"]
        == restored.json()["id"]
    )
    assert read(client, "movements", end, from_time=start, kind="sku")["items"] == []
    assert read(client, "inventory", boundary)["totals"]["value"] == "980.000000"
    assert read(client, "inventory", end)["totals"]["value"] == "1000.000000"


def test_pinned_production_estimate_wip_actual_and_abnormal_loss_are_distinct(flow):
    client, db, sku, line, rid, key = setup(flow)
    batch = running(client, rid, key)
    assert (
        command(
            client, batch, 2, "issue", lines=[dict(line_id=line["id"], quantity="10")]
        ).status_code
        == 200
    )
    ongoing = at(db)
    result = read(client, "production", ongoing)["items"][0]
    assert result["status"] == "running" and Decimal(result["wip"]) == 100
    assert result["estimated_total"] == "120.000010" and result["unit_cost"] is None
    assert (
        command(
            client,
            batch,
            3,
            "complete",
            quality=dict(healthy_output=8, normal_waste=1, abnormal_damage=1),
        ).status_code
        == 200
    )
    end = at(db)
    complete = read(client, "production", end)["items"][0]
    assert complete["wip"] == "0" and complete["normal_waste"] == 1
    assert complete["transferred_value"] == "88.888889" and complete["abnormal_loss"] == "11.111111"
    assert (
        complete["actual_recorded_total"] == "100.000000" and complete["variance"] == "-20.000010"
    )
    assert read(client, "production", ongoing)["items"][0]["wip"] == "100.000000"
    inventory = read(client, "inventory", end)
    assert inventory["totals"]["value"] == "988.888889"
    assert {g["kind"] for g in inventory["totals"]["groups"]} == {"material", "sku"}
    assert all(
        g["unit"] == "sheet" if g["kind"] == "material" else g["unit"] == "piece"
        for g in inventory["totals"]["groups"]
    )
    assert complete["event_id"] and complete["recipe_version"] == 1


def test_filters_require_explicit_aware_time_and_reject_ignored_filters(flow):
    client, db, *_ = setup(flow)
    now = at(db)
    for report, params in [
        ("inventory", {}),
        ("inventory", dict(as_of="2026-10-18T00:00:00")),
        ("inventory", dict(as_of=(datetime.now(timezone.utc) + timedelta(days=1)).isoformat())),
        ("movements", dict(as_of=now)),
        ("production", dict(as_of=now, low=True)),
        ("production", dict(as_of=now, from_time=now)),
        ("inventory", dict(as_of=now, from_time=now)),
    ]:
        assert client.get("/api/v1/admin/reports/" + report, params=params).status_code == 422


def test_report_and_export_permissions_are_independent_and_exports_preserve_exact_text(flow):
    client, db, *_ = setup(flow)
    now = at(db)
    owner = db.scalar(text("SELECT account_id FROM identity_account_roles WHERE role='admin'"))
    db.execute(
        text(
            "INSERT INTO identity_permission_overrides(account_id,permission,allowed) VALUES(:id,'finance.read',false)"
        ),
        dict(id=owner),
    )
    db.commit()
    assert client.get("/api/v1/admin/reports/inventory", params=dict(as_of=now)).status_code == 403
    exported = client.get(
        "/api/v1/admin/reports/inventory/export", params=dict(as_of=now, format="xlsx")
    )
    assert exported.status_code == 200 and exported.headers["cache-control"] == "no-store"
    with ZipFile(BytesIO(exported.content)) as archive:
        root = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))
        values = [e.text for e in root.iter() if e.tag.endswith("}t")]
        assert "1000.000000" in values and "IRT" in values and "filter_as_of" in values
        assert not any(e.tag.endswith("}f") for e in root.iter())
    db.execute(
        text("UPDATE identity_permission_overrides SET allowed=true WHERE account_id=:id"),
        dict(id=owner),
    )
    db.execute(
        text(
            "INSERT INTO identity_permission_overrides(account_id,permission,allowed) VALUES(:id,'finance.export',false)"
        ),
        dict(id=owner),
    )
    db.commit()
    assert read(client, "inventory", now)["totals"]["count"] == 1
    assert (
        client.get("/api/v1/admin/reports/inventory/export", params=dict(as_of=now)).status_code
        == 403
    )


def test_financial_xlsx_has_no_formulas_and_keeps_large_exact_values_and_correction_ids(flow):
    client, db, *_ = finance_setup(flow)
    account = create(client, "999999999999.123456", code="XLSX-TEST")
    response = client.get(
        "/api/v1/admin/finance/export",
        params=dict(from_date="2026-10-19", to_date="2026-10-19", format="xlsx"),
    )
    assert response.status_code == 200
    with ZipFile(BytesIO(response.content)) as archive:
        root = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))
        values = [e.text for e in root.iter() if e.tag.endswith("}t")]
        assert account["balance"] in values and "reverses_id" in values and "filter_from" in values
        assert all(e.attrib.get("t") == "inlineStr" for e in root.iter() if e.tag.endswith("}c"))
