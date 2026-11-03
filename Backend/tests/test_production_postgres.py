import importlib.util
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from test_cost_recipes_postgres import put, recipe, resource
from test_cost_recipes_postgres import setup as recipe_setup
from test_cost_resources_postgres import content, save
from test_identity_otp_postgres import flow as flow


def setup(flow):
    client, db, sku = recipe_setup(flow)
    for name in (
        "0032_suppliers.py",
        "0035_stock_ledger.py",
        "0038_purchases.py",
        "0039_production.py",
    ):
        path = Path(__file__).parents[1] / "migrations/versions" / name
        spec = importlib.util.spec_from_file_location(path.stem, path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with Operations.context(MigrationContext.configure(db.connection())):
            module.upgrade()
    line = resource(client)
    line.update(quantity="1", cutting_yield=None, cutting_approval="", waste_fraction="0")
    rid, key = uuid4(), uuid4()
    assert put(client, rid, recipe(sku, [line]), key=key).status_code == 200
    opening = client.put(
        f"/api/v1/admin/inventory/commands/{uuid4()}",
        json=dict(
            kind="material",
            reference_id=line["resource_id"],
            expected_version=0,
            action="opening",
            quantity="100",
            value="1000",
            reason="Synthetic production stock",
        ),
    )
    assert opening.status_code == 200, opening.text
    return client, db, sku, line, rid, key


def command(client, id, version, action, key=None, **changes):
    return client.put(
        f"/api/v1/admin/production/{id}/commands/{key or uuid4()}",
        json=dict(
            expected_version=version,
            action=action,
            reason="Synthetic workshop confirmation",
            **changes,
        ),
    )


def running(client, rid, key):
    id = uuid4()
    result = command(
        client,
        id,
        0,
        "draft",
        content=dict(
            recipe_id=str(rid),
            revision_id=str(key),
            batch_number="B-001",
            production_date="2026-10-18",
            target_output=10,
        ),
    )
    assert result.status_code == 200, result.text
    assert command(client, id, 1, "start").status_code == 200
    return id


def test_production_issues_returns_and_qc_freeze_cost_and_separate_losses(flow):
    client, db, sku, line, rid, key = setup(flow)
    id = running(client, rid, key)
    assert (
        command(client, id, 2, "issue", lines=[dict(line_id=line["id"], quantity="12")]).status_code
        == 200
    )
    returned = command(
        client, id, 3, "material_return", lines=[dict(line_id=line["id"], quantity="2")]
    )
    assert returned.status_code == 200, returned.text
    assert returned.json()["result"]["state"]["wip"] == "100.000000"
    complete = command(
        client, id, 4, "complete", quality=dict(healthy_output=8, normal_waste=1, abnormal_damage=1)
    )
    assert complete.status_code == 200, complete.text
    state = complete.json()["result"]["state"]
    assert (
        state["wip"] == "0"
        and state["transferred_value"] == "88.888889"
        and state["abnormal_loss"] == "11.111111"
    )
    assert db.scalar(text("SELECT quantity FROM inventory_positions WHERE kind='sku'")) == 8
    assert db.scalar(text("SELECT value FROM inventory_positions WHERE kind='sku'")) == Decimal(
        "88.888889"
    )
    assert db.scalar(text("SELECT quantity FROM inventory_positions WHERE kind='material'")) == 90
    movement = complete.json()["result"]["state"]["movements"][0]
    history = client.get(f"/api/v1/admin/inventory/positions/{movement['position_id']}/movements")
    assert history.status_code == 200, history.text
    assert history.json()["items"][0]["source_document_kind"] == "production"
    assert (
        command(
            client,
            id,
            5,
            "complete",
            quality=dict(healthy_output=8, normal_waste=1, abnormal_damage=1),
        ).status_code
        == 409
    )
    assert client.get("/api/v1/admin/production", params=dict(losses="true")).json()["items"][0][
        "id"
    ] == str(id)


def test_issue_retry_stale_command_and_stock_shortage_are_atomic(flow):
    client, db, sku, line, rid, key = setup(flow)
    id = running(client, rid, key)
    operation = uuid4()
    first = command(
        client, id, 2, "issue", key=operation, lines=[dict(line_id=line["id"], quantity="20")]
    )
    assert first.status_code == 200, first.text
    assert (
        command(
            client, id, 2, "issue", key=operation, lines=[dict(line_id=line["id"], quantity="20")]
        ).json()
        == first.json()
    )
    assert (
        command(client, id, 2, "issue", lines=[dict(line_id=line["id"], quantity="20")]).status_code
        == 409
    )
    assert (
        command(client, id, 3, "issue", lines=[dict(line_id=line["id"], quantity="81")]).status_code
        == 409
    )
    assert db.scalar(text("SELECT quantity FROM inventory_positions WHERE kind='material'")) == 80
    assert db.scalar(text("SELECT count(*) FROM production_events")) == 3
    assert client.get(f"/api/v1/admin/production/{id}/commands/{operation}").json() == first.json()


def test_material_return_preserves_issued_cost_after_other_stock_changes(flow):
    client, db, sku, line, rid, key = setup(flow)
    id = running(client, rid, key)
    assert (
        command(client, id, 2, "issue", lines=[dict(line_id=line["id"], quantity="10")]).status_code
        == 200
    )
    increase = client.put(
        f"/api/v1/admin/inventory/commands/{uuid4()}",
        json=dict(
            kind="material",
            reference_id=line["resource_id"],
            expected_version=2,
            action="increase",
            quantity="90",
            value="2700",
            reason="New material at higher cost",
        ),
    )
    assert increase.status_code == 200, increase.text
    returned = command(
        client, id, 3, "material_return", lines=[dict(line_id=line["id"], quantity="10")]
    )
    assert returned.status_code == 200, returned.text
    assert returned.json()["result"]["state"]["wip"] == "0.000000"
    assert db.scalar(text("SELECT value FROM inventory_positions WHERE kind='material'")) == 3700
    assert (
        command(
            client, id, 4, "material_return", lines=[dict(line_id=line["id"], quantity="1")]
        ).status_code
        == 409
    )
    assert command(client, id, 4, "cancel").status_code == 200


def test_cancellation_requires_explicit_wip_write_off(flow):
    client, db, sku, line, rid, key = setup(flow)
    id = running(client, rid, key)
    assert (
        command(client, id, 2, "issue", lines=[dict(line_id=line["id"], quantity="10")]).status_code
        == 200
    )
    assert command(client, id, 3, "cancel").status_code == 409
    result = command(client, id, 3, "cancel", write_off_remaining=True)
    assert result.status_code == 200, result.text
    assert result.json()["result"]["state"]["abnormal_loss"] == "100.000000"
    assert db.scalar(text("SELECT count(*) FROM inventory_positions WHERE kind='sku'")) == 0


def test_service_actuals_are_explicit_and_bom_stays_pinned(flow):
    client, db, sku, line, rid, key = setup(flow)
    service_id, service_key = uuid4(), uuid4()
    saved = save(
        client,
        id=service_id,
        revision=service_key,
        resource=content(
            kind="service",
            code="BINDING",
            base_unit="piece",
            purchase_unit=None,
            purchase_to_base=None,
            rate={"amount": "3", "currency": "IRT"},
            valid_from="2026-10-17",
        ),
    )
    assert saved.status_code == 200, saved.text
    service = dict(
        id=str(uuid4()),
        label="Binding",
        resource_id=str(service_id),
        resource_revision_id=str(service_key),
        quantity="1",
        unit="base",
        basis="output",
    )
    nextkey = uuid4()
    assert put(client, rid, recipe(sku, [line, service]), version=1, key=nextkey).status_code == 200
    id = running(client, rid, nextkey)
    assert (
        command(client, id, 2, "issue", lines=[dict(line_id=line["id"], quantity="10")]).status_code
        == 200
    )
    assert (
        command(
            client,
            id,
            3,
            "complete",
            quality=dict(healthy_output=10, normal_waste=0, abnormal_damage=0),
        ).status_code
        == 409
    )
    assert (
        command(
            client, id, 3, "service", service_line_id=service["id"], service_amount="25"
        ).status_code
        == 200
    )
    assert put(client, rid, recipe(sku, [line]), version=2).status_code == 200
    done = command(
        client,
        id,
        4,
        "complete",
        quality=dict(healthy_output=10, normal_waste=0, abnormal_damage=0),
    )
    assert done.status_code == 200, done.text
    assert done.json()["result"]["content"]["recipe_version"] == 2
    assert done.json()["result"]["state"]["transferred_value"] == "125.000000"


def test_missing_actuals_invalid_qc_permissions_and_csrf(flow):
    client, db, sku, line, rid, key = setup(flow)
    id = running(client, rid, key)
    assert (
        command(
            client,
            id,
            2,
            "complete",
            quality=dict(healthy_output=10, normal_waste=0, abnormal_damage=0),
        ).status_code
        == 409
    )
    assert (
        command(
            client,
            id,
            2,
            "complete",
            quality=dict(healthy_output=0, normal_waste=10, abnormal_damage=0),
        ).status_code
        == 422
    )
    client.headers["X-CSRF-Token"] = "wrong"
    assert (
        command(client, id, 2, "issue", lines=[dict(line_id=line["id"], quantity="1")]).status_code
        == 403
    )
    client.cookies.clear()
    assert client.get("/api/v1/admin/production").status_code == 401


def test_repeated_material_lines_share_stock_and_rollback_together(flow):
    client, db, sku, line, rid, key = setup(flow)
    other = {**line, "id": str(uuid4()), "label": "Second use of same paper"}
    newkey = uuid4()
    assert put(client, rid, recipe(sku, [line, other]), version=1, key=newkey).status_code == 200
    id = running(client, rid, newkey)
    response = command(
        client,
        id,
        2,
        "issue",
        lines=[dict(line_id=line["id"], quantity="60"), dict(line_id=other["id"], quantity="60")],
    )
    assert response.status_code == 409
    assert db.scalar(text("SELECT quantity FROM inventory_positions WHERE kind='material'")) == 100
    assert db.scalar(text("SELECT count(*) FROM inventory_movements")) == 1
    assert db.scalar(text("SELECT version FROM production_batches")) == 2


def test_normal_waste_is_absorbed_and_completion_retries_do_not_duplicate_output(flow):
    client, db, sku, line, rid, key = setup(flow)
    id = running(client, rid, key)
    assert (
        command(client, id, 2, "issue", lines=[dict(line_id=line["id"], quantity="10")]).status_code
        == 200
    )
    operation = uuid4()
    qc = dict(healthy_output=9, normal_waste=1, abnormal_damage=0)
    done = command(client, id, 3, "complete", key=operation, quality=qc)
    assert done.status_code == 200, done.text
    assert command(client, id, 3, "complete", key=operation, quality=qc).json() == done.json()
    assert db.scalar(text("SELECT quantity FROM inventory_positions WHERE kind='sku'")) == 9
    assert db.scalar(text("SELECT value FROM inventory_positions WHERE kind='sku'")) == 100
    assert done.json()["result"]["state"]["abnormal_loss"] == "0.000000"


def test_production_permission_is_independent_of_inventory_and_pricing(flow):
    client, db, sku, line, rid, key = setup(flow)
    owner = db.scalar(text("SELECT account_id FROM identity_account_roles WHERE role='admin'"))
    db.execute(text("DELETE FROM identity_account_roles WHERE account_id=:id"), dict(id=owner))
    db.execute(
        text(
            "INSERT INTO identity_permission_overrides(account_id,permission,allowed) VALUES(:id,'production.manage',true)"
        ),
        dict(id=owner),
    )
    db.commit()
    assert client.get("/api/v1/admin/production/recipe-choices").status_code == 200
    assert client.get("/api/v1/admin/inventory").status_code == 403
    id = running(client, rid, key)
    assert (
        command(client, id, 2, "issue", lines=[dict(line_id=line["id"], quantity="1")]).status_code
        == 200
    )
    db.execute(
        text(
            "UPDATE identity_permission_overrides SET allowed=false WHERE account_id=:id AND permission='production.manage'"
        ),
        dict(id=owner),
    )
    db.commit()
    assert (
        command(client, id, 3, "issue", lines=[dict(line_id=line["id"], quantity="1")]).status_code
        == 403
    )
    assert db.scalar(text("SELECT quantity FROM inventory_positions WHERE kind='material'")) == 99


def test_zero_value_material_write_off_remains_visible_as_physical_loss(flow):
    client, db, sku, line, rid, key = setup(flow)
    db.execute(text("UPDATE inventory_positions SET value=0"))
    db.commit()
    id = running(client, rid, key)
    assert (
        command(client, id, 2, "issue", lines=[dict(line_id=line["id"], quantity="1")]).status_code
        == 200
    )
    result = command(client, id, 3, "cancel", write_off_remaining=True)
    assert result.status_code == 200, result.text
    assert result.json()["result"]["state"]["abnormal_loss"] == "0.000000"
    assert client.get("/api/v1/admin/production", params={"losses": "true"}).json()["items"][0][
        "id"
    ] == str(id)


def test_stock_waste_register_preserves_original_after_linked_reversal(flow):
    client, db, sku, line, rid, key = setup(flow)
    response = client.put(
        f"/api/v1/admin/inventory/commands/{uuid4()}",
        json=dict(
            kind="material",
            reference_id=line["resource_id"],
            expected_version=1,
            action="waste",
            quantity="2",
            reason="Damaged sheets during count",
        ),
    )
    assert response.status_code == 200, response.text
    page = client.get("/api/v1/admin/inventory/waste", params={"q": "Damaged sheets"})
    assert page.status_code == 200, page.text
    assert len(page.json()["items"]) == 1
    assert page.json()["items"][0]["reversed"] is False
    result = client.put(
        f"/api/v1/admin/inventory/commands/{uuid4()}",
        json=dict(
            kind="material",
            reference_id=line["resource_id"],
            expected_version=2,
            action="reverse",
            reverses_id=response.json()["id"],
            reason="Count corrected with linked reversal",
        ),
    )
    assert result.status_code == 200, result.text
    assert client.get("/api/v1/admin/inventory/waste").json()["items"][0]["reversed"] is True
    assert (
        client.get("/api/v1/admin/inventory/waste", params={"q": "unmatched"}).json()["items"] == []
    )
    client.cookies.clear()
    assert client.get("/api/v1/admin/inventory/waste").status_code == 401
