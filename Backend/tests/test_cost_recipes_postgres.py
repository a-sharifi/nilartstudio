import importlib.util
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from test_cost_resources_postgres import content, prepare, save
from test_identity_otp_postgres import flow as flow


def setup(flow, staff=True):
    client, db, owner = prepare(flow, staff)
    directory = Path(__file__).parents[1] / "migrations/versions"
    with Operations.context(MigrationContext.configure(db.connection())):
        for pattern in ["0002_*", "0003_*", "0030_*"]:
            path = next(directory.glob(pattern))
            spec = importlib.util.spec_from_file_location(path.stem, path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            module.upgrade()
    product, sku = uuid4(), uuid4()
    db.execute(
        text(
            "INSERT INTO catalog_products(id,slug,title_fa,title_en) VALUES(:id,'test','محصول','Product')"
        ),
        {"id": product},
    )
    db.execute(
        text("INSERT INTO catalog_skus(id,product_id,code) VALUES(:id,:product,'SKU-A')"),
        {"id": sku, "product": product},
    )
    db.commit()
    return client, db, sku


def resource(client, **changes):
    id, key = uuid4(), uuid4()
    response = save(client, id, key, resource=content(valid_from="2026-10-17", **changes))
    assert response.status_code == 200, response.text
    return {
        "id": str(uuid4()),
        "label": "Inside paper",
        "resource_id": str(id),
        "resource_revision_id": str(key),
        "quantity": "50",
        "unit": "base",
        "basis": "output",
        "cutting_yield": 4,
        "waste_fraction": "0.1",
        "cutting_approval": "Workshop approved four cuts, grain preserved",
    }


def recipe(sku, lines, **changes):
    return {
        "sku_id": str(sku),
        "title_fa": "فرمول آزمایش",
        "title_en": "Test recipe",
        "valid_from": "2026-10-17",
        "lines": lines,
        **changes,
    }


def put(client, id, content, version=0, key=None, reason="Reviewed recipe"):
    return client.put(
        f"/api/v1/admin/costing/recipes/{id}/versions/{key or uuid4()}",
        json={"expected_version": version, "content": content, "reason": reason},
    )


def estimate(client, id, key, **changes):
    return client.get(
        f"/api/v1/admin/costing/recipes/{id}/estimate",
        params={
            "revision": str(key),
            "on": "2026-10-17",
            "good_output": 3,
            "places": 6,
            "rounding": "half_up",
            **changes,
        },
    )


def test_recipe_versions_exact_calculation_and_batch_allocation(flow):
    client, db, sku = setup(flow)
    line = resource(client)
    service = resource(
        client,
        kind="service",
        code="PRINT",
        base_unit="printed_side",
        purchase_unit=None,
        purchase_to_base=None,
        rate={"amount": "2", "currency": "IRT"},
    )
    service.update(
        quantity="100",
        cutting_yield=None,
        cutting_approval="",
        waste_fraction=None,
        label="Double-sided: 100 sides, no implicit doubling",
    )
    batch = {
        **service,
        "id": str(uuid4()),
        "quantity": "9",
        "basis": "batch",
        "label": "Batch service",
    }
    body = recipe(sku, [line, service, batch])
    id, key = uuid4(), uuid4()
    saved = put(client, id, body, key=key)
    assert saved.status_code == 200, saved.text
    assert saved.json()["snapshots"][0]["content"]["rate"]["amount"] == "12.000001"
    assert put(client, id, body, key=key).json() == saved.json()
    assert put(client, id, body, key=key, reason="Altered").status_code == 409
    result = estimate(client, id, key).json()
    # 50*12.000001/4/.9*3 + 100*2*3 + 9*2 = 1118.000041666...
    assert result["complete"] and result["total"] == "1118.000042"
    assert result["per_output"] == "372.666681"
    assert result["exact_numerator"] == "26832001" and result["exact_denominator"] == "24000"
    assert estimate(client, id, key, places=0, rounding="up").json()["total"] == "1119"
    assert put(client, id, body, version=0).status_code == 409
    assert put(client, uuid4(), body).status_code == 409
    changed = put(client, id, recipe(sku, [line], title_en="Changed recipe"), version=1)
    assert changed.status_code == 200
    assert put(client, id, body, key=key).json() == saved.json()
    assert "recipe_version_changed" in estimate(client, id, key).json()["missing"]
    root = f"/api/v1/admin/costing/recipes/{id}"
    page = client.get(root + "/versions?limit=1").json()
    assert page["items"][0]["version"] == 2 and page["next_before_version"] == 2
    assert client.get(root + "/versions?before=2").json()["items"][0] == saved.json()
    assert client.get(f"/api/v1/admin/costing/recipes/{uuid4()}/versions/{key}").status_code == 404
    assert (
        client.get("/api/v1/admin/costing/recipes?q=Changed&active=true").json()["items"][0][
            "sku_code"
        ]
        == "SKU-A"
    )
    assert client.get("/api/v1/admin/costing/recipes?q=%").json()["items"] == []
    assert client.get("/api/v1/admin/costing/recipe-skus?q=SKU-A").json()["items"][0][
        "recipe_id"
    ] == str(id)
    assert db.scalar(text("SELECT count(*) FROM cost_recipe_versions")) == 2
    assert (
        db.scalar(text("SELECT count(*) FROM identity_audits WHERE action='costing.recipe_saved'"))
        == 2
    )
    assert (
        db.scalar(
            text("SELECT count(*) FROM outbox_events WHERE event_type='costing.recipe_saved'")
        )
        == 2
    )


@pytest.mark.parametrize(
    "change",
    [
        {"quantity": "0"},
        {"quantity": "1e5"},
        {"waste_fraction": "1"},
        {"cutting_yield": 0},
        {"cutting_yield": True},
        {"cutting_approval": ""},
        {"label": "\n"},
    ],
)
def test_recipe_rejects_invalid_or_unapproved_inputs(flow, change):
    client, db, sku = setup(flow)
    line = resource(client)
    line.update(change)
    assert put(client, uuid4(), recipe(sku, [line])).status_code == 422
    assert db.scalar(text("SELECT count(*) FROM cost_recipes")) == 0


def test_missing_data_stays_incomplete_and_mixed_currency_never_converts(flow):
    client, db, sku = setup(flow)
    a = resource(client, rate=None)
    a.update(quantity=None, waste_fraction=None)
    id, key = uuid4(), uuid4()
    assert put(client, id, recipe(sku, [a]), key=key).status_code == 200
    result = estimate(client, id, key).json()
    assert not result["complete"] and result["total"] is None
    assert set(result["lines"][0]["missing"]) == {
        "rate_unknown",
        "quantity_unknown",
        "waste_unknown",
    }
    b = resource(client, code="OTHER", rate={"amount": "2", "currency": "IRR"})
    c = resource(client, code="THIRD")
    key2 = uuid4()
    assert put(client, id, recipe(sku, [b, c]), version=1, key=key2).status_code == 200
    result = estimate(client, id, key2).json()
    assert (
        "mixed_currencies" in result["missing"]
        and result["total"] is None
        and result["currency"] is None
    )
    assert estimate(client, id, key2, good_output=0).status_code == 422


def test_changed_rates_preserve_snapshots_but_block_current_estimate(flow):
    client, db, sku = setup(flow)
    line = resource(client)
    id, key = uuid4(), uuid4()
    body = recipe(sku, [line])
    assert put(client, id, body, key=key).status_code == 200
    assert (
        save(
            client,
            line["resource_id"],
            version=1,
            resource=content(valid_from="2026-10-17", rate={"amount": "25", "currency": "IRT"}),
        ).status_code
        == 200
    )
    result = estimate(client, id, key).json()
    assert result["total"] is None and result["lines"][0]["missing"] == ["resource_version_changed"]
    assert put(client, id, body, version=1).status_code == 409
    history = client.get(f"/api/v1/admin/costing/recipes/{id}/versions/{key}").json()
    assert history["snapshots"][0]["content"]["rate"]["amount"] == "12.000001"


def test_recipe_write_security_and_atomic_outbox_failure(flow, monkeypatch):
    client, db, sku = setup(flow)
    line = resource(client)
    id = uuid4()
    body = recipe(sku, [line])
    client.headers["Origin"] = "https://untrusted.example"
    assert put(client, id, body).status_code == 403
    client.headers["Origin"] = "http://localhost:8080"
    token = client.headers.pop("X-CSRF-Token")
    assert put(client, id, body).status_code == 403
    client.headers["X-CSRF-Token"] = token

    def fail(*args, **kwargs):
        raise RuntimeError("outbox failure")

    monkeypatch.setattr("nilart.contexts.costing.recipes.enqueue", fail)
    with pytest.raises(RuntimeError):
        put(client, id, body)
    assert db.scalar(text("SELECT count(*) FROM cost_recipes")) == 0
    assert db.scalar(text("SELECT count(*) FROM cost_recipe_versions")) == 0
    assert (
        db.scalar(text("SELECT count(*) FROM identity_audits WHERE action='costing.recipe_saved'"))
        == 0
    )


def test_recipe_private_reads_and_writes_require_permission(flow):
    client, db, sku = setup(flow, False)
    id, key = uuid4(), uuid4()
    for path in [
        "/recipes",
        "/recipe-skus",
        f"/recipes/{id}",
        f"/recipes/{id}/versions",
        f"/recipes/{id}/versions/{key}",
        f"/recipes/{id}/estimate?revision={key}&on=2026-10-17&good_output=1&places=2&rounding=up",
    ]:
        assert client.get("/api/v1/admin/costing" + path).status_code == 403
    assert (
        put(
            client,
            id,
            recipe(
                sku,
                [
                    {
                        "id": str(uuid4()),
                        "label": "test",
                        "resource_id": str(uuid4()),
                        "resource_revision_id": str(uuid4()),
                        "unit": "base",
                        "basis": "output",
                    }
                ],
            ),
        ).status_code
        == 403
    )


def test_rate_review_queue_filters_before_pagination_and_resolves_with_new_recipe(flow):
    client, db, sku = setup(flow)
    line = resource(client)
    id, key = uuid4(), uuid4()
    assert put(client, id, recipe(sku, [line]), key=key).status_code == 200
    root = "/api/v1/admin/costing/recipe-reviews"
    assert client.get(root, params={"on": "2026-10-17"}).json()["items"] == []
    updated = save(
        client,
        line["resource_id"],
        version=1,
        resource=content(valid_from="2026-10-17", rate={"amount": "14", "currency": "IRT"}),
    )
    assert updated.status_code == 200
    page = client.get(root, params={"on": "2026-10-17", "q": "SKU", "limit": 1}).json()
    assert page["items"][0]["recipe_id"] == str(id)
    assert page["items"][0]["resources"][0]["reasons"] == ["resource_version_changed"]
    assert client.get(root, params={"on": "2026-10-17", "q": "%"}).json()["items"] == []
    line["resource_revision_id"] = updated.json()["revision_id"]
    assert put(client, id, recipe(sku, [line]), version=1).status_code == 200
    assert client.get(root, params={"on": "2026-10-17"}).json()["items"] == []
    assert (
        save(
            client,
            line["resource_id"],
            version=2,
            resource=content(valid_from="2026-10-17", valid_to="2026-10-18"),
        ).status_code
        == 200
    )
    page = client.get(root, params={"on": "2026-10-19"}).json()
    assert set(page["items"][0]["resources"][0]["reasons"]) == {
        "resource_version_changed",
        "rate_not_valid_on_date",
    }
    assert client.get(root, params={"on": "2026-10-19", "cursor": str(id)}).json()["items"] == []
    assert put(client, id, recipe(sku, [line], active=False), version=2).status_code == 200
    assert client.get(root, params={"on": "2026-10-19"}).json()["items"] == []


def test_recipe_dependency_scoping_service_basis_and_missing_conversion(flow):
    client, db, sku = setup(flow)
    line = resource(client)
    wrong = {**line, "resource_id": str(uuid4())}
    assert put(client, uuid4(), recipe(sku, [wrong])).status_code == 422
    assert put(client, uuid4(), recipe(sku, [line, line])).status_code == 422
    service = resource(
        client,
        kind="service",
        code="LABOR",
        base_unit="batch",
        purchase_unit=None,
        purchase_to_base=None,
    )
    assert put(client, uuid4(), recipe(sku, [service])).status_code == 422
    service.update(cutting_yield=None, waste_fraction=None)
    assert (
        put(
            client, uuid4(), recipe(sku, [service], valid_from="2026-10-20", valid_to="2026-10-17")
        ).status_code
        == 422
    )
    material = resource(client, code="UNKNOWN-CONVERSION", purchase_to_base=None)
    material.update(unit="purchase")
    id, key = uuid4(), uuid4()
    assert put(client, id, recipe(sku, [material]), key=key).status_code == 200
    result = estimate(client, id, key).json()
    assert result["total"] is None and result["lines"][0]["missing"] == ["conversion_unknown"]


@pytest.mark.parametrize("change,status", [("rotate", 403), ("revoke", 401), ("permission", 403)])
def test_recipe_writes_recheck_live_authorization(flow, monkeypatch, change, status):
    from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository

    client, db, sku = setup(flow)
    line = resource(client)
    original, original_roles = SqlIdentityRepository.session_account, SqlIdentityRepository.roles

    def session(self, digest, now, *, lock=False):
        result = original(self, digest, now, lock=lock)
        if not lock:
            if change == "revoke":
                self.session.execute(
                    text("DELETE FROM identity_sessions WHERE token_hash=:token"), {"token": digest}
                )
            elif change == "rotate":
                self.rotate_csrf(digest, "changed-token", now)
        return result

    def roles(self, account_id, lock=False):
        if lock and change == "permission":
            self.session.execute(text("DELETE FROM identity_account_roles WHERE role='admin'"))
        return original_roles(self, account_id, lock=lock)

    monkeypatch.setattr(SqlIdentityRepository, "session_account", session)
    monkeypatch.setattr(SqlIdentityRepository, "roles", roles)
    assert put(client, uuid4(), recipe(sku, [line])).status_code == status
    assert db.scalar(text("SELECT count(*) FROM cost_recipes")) == 0


def test_recipe_event_is_validated_and_deduplicated(flow):
    from nilart.shared.outbox import consume_event

    client, db, sku = setup(flow)
    envelope = {
        "id": str(uuid4()),
        "event_type": "costing.recipe_saved",
        "payload": {"recipe_id": str(uuid4()), "revision_id": str(uuid4()), "version": 1},
    }
    assert consume_event(db, envelope)
    assert not consume_event(db, envelope)
    for value in [True, 0, -1, "1"]:
        with pytest.raises(ValueError):
            consume_event(
                db,
                {
                    **envelope,
                    "id": str(uuid4()),
                    "payload": {**envelope["payload"], "version": value},
                },
            )


def test_concurrent_recipe_edits_and_reversible_migration(monkeypatch):
    import os
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    from types import SimpleNamespace

    from fastapi import Request
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from nilart.contexts.costing.recipes import SaveRecipe
    from nilart.contexts.costing.recipes import save as write
    from nilart.contexts.costing.router import Resource
    from nilart.shared.outbox import metadata

    url = os.environ.get("NILART_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Isolated PostgreSQL required")
    engine = create_engine(url)
    schema, actor, sku, resource_id, resource_key, id = (
        "cost_recipes_" + uuid4().hex,
        uuid4(),
        uuid4(),
        uuid4(),
        uuid4(),
        uuid4(),
    )
    modules = []
    for filename in ["0029_cost_resources.py", "0030_cost_recipes.py"]:
        path = Path(__file__).parents[1] / "migrations/versions" / filename
        spec = importlib.util.spec_from_file_location(path.stem, path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        modules.append(module)
    monkeypatch.setattr(
        "nilart.contexts.costing.recipes.write_access",
        lambda *args: (SimpleNamespace(id=str(actor)), None),
    )
    request = Request({"type": "http", "headers": [], "method": "PUT", "path": "/"})
    request.state.request_id = "isolated-recipe-concurrency"
    import json

    try:
        with engine.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            metadata.create_all(connection)
            connection.execute(text("CREATE TABLE identity_accounts(id uuid PRIMARY KEY)"))
            connection.execute(text("CREATE TABLE catalog_skus(id uuid PRIMARY KEY,code text)"))
            connection.execute(
                text(
                    "CREATE TABLE identity_audits(id uuid PRIMARY KEY,actor_id uuid,account_id uuid,action text,changes jsonb,reason text,created_at timestamptz DEFAULT now())"
                )
            )
            connection.execute(text("INSERT INTO identity_accounts VALUES(:id)"), {"id": actor})
            connection.execute(
                text("INSERT INTO catalog_skus VALUES(:id,'SKU-CONCURRENT')"), {"id": sku}
            )
            with Operations.context(MigrationContext.configure(connection)):
                for module in modules:
                    module.upgrade()
            data = json.dumps(
                Resource.model_validate(content(valid_from="2026-10-17")).model_dump(mode="json")
            )
            connection.execute(
                text(
                    "INSERT INTO cost_resources(id,kind,code,content,version) VALUES(:id,'material','PAPER-A',CAST(:data AS jsonb),1)"
                ),
                {"id": resource_id, "data": data},
            )
            connection.execute(
                text(
                    "INSERT INTO cost_resource_versions(revision_id,resource_id,actor_id,expected_version,version,content,reason) VALUES(:key,:id,:actor,0,1,CAST(:data AS jsonb),:reason)"
                ),
                {
                    "key": resource_key,
                    "id": resource_id,
                    "actor": actor,
                    "data": data,
                    "reason": "Isolated fixture",
                },
            )
        line = {
            "id": str(uuid4()),
            "label": "Inside",
            "resource_id": str(resource_id),
            "resource_revision_id": str(resource_key),
            "quantity": "1",
            "unit": "base",
            "basis": "output",
            "waste_fraction": "0",
        }
        body = recipe(sku, [line])
        with engine.connect() as connection:
            connection.execute(text(f'SET search_path TO "{schema}"'))
            connection.commit()
            with Session(bind=connection) as db:
                assert (
                    write(
                        id,
                        uuid4(),
                        SaveRecipe(expected_version=0, content=body, reason="Isolated initial"),
                        request,
                        db,
                        None,
                    )["version"]
                    == 1
                )
        barrier = Barrier(2)

        def edit(index):
            with engine.connect() as connection:
                connection.execute(text(f'SET search_path TO "{schema}"'))
                connection.commit()
                with Session(bind=connection) as db:
                    barrier.wait(timeout=10)
                    result = write(
                        id,
                        uuid4(),
                        SaveRecipe(
                            expected_version=1,
                            content={**body, "title_en": f"Edit {index}"},
                            reason="Concurrent edit",
                        ),
                        request,
                        db,
                        None,
                    )
                    return "saved" if isinstance(result, dict) else "conflict"

        with ThreadPoolExecutor(max_workers=2) as pool:
            assert sorted(pool.map(edit, range(2))) == ["conflict", "saved"]
        with engine.begin() as connection:
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            assert connection.scalar(text("SELECT count(*) FROM cost_recipe_versions")) == 2
            assert connection.scalar(text("SELECT count(*) FROM identity_audits")) == 2
            assert connection.scalar(text("SELECT count(*) FROM outbox_events")) == 2
            with Operations.context(MigrationContext.configure(connection)):
                modules[1].downgrade()
            assert connection.scalar(text("SELECT to_regclass('cost_recipes')")) is None
            assert connection.scalar(text("SELECT count(*) FROM cost_resources")) == 1
    finally:
        with engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        engine.dispose()


def test_cutting_layout_permissions_validation_and_no_recipe_write(flow):
    client, db, sku = setup(flow)
    params = dict(sheet_width="100", sheet_height="60", piece_width="60", piece_height="40",
                  margin="0", gap="0", orientation="fixed")
    response = client.get("/api/v1/admin/costing/cutting-layout", params=params)
    assert response.status_code == 200, response.text
    assert response.json()["yield_count"] == 1
    assert "no-store" in response.headers["cache-control"]
    response = client.get("/api/v1/admin/costing/cutting-layout", params={**params, "piece_width":"0"})
    assert response.status_code == 422
    assert db.execute(text("SELECT count(*) FROM cost_recipes")).scalar_one() == 0


def test_cutting_layout_requires_pricing_permission(flow):
    client, db, sku = setup(flow, staff=False)
    response = client.get("/api/v1/admin/costing/cutting-layout", params=dict(
        sheet_width="100", sheet_height="60", piece_width="30", piece_height="20",
        margin="0", gap="0", orientation="fixed"))
    assert response.status_code == 403
