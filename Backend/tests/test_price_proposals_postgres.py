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
    path = Path(__file__).parents[1] / "migrations/versions/0041_price_proposals.py"
    spec = importlib.util.spec_from_file_location(path.stem, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(db.connection())):
        module.upgrade()
    extra = Path(__file__).parents[1] / "migrations/versions/0013_sku_prices.py"
    spec = importlib.util.spec_from_file_location(extra.stem, extra)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    with Operations.context(MigrationContext.configure(db.connection())):
        m.upgrade()
    extra = Path(__file__).parents[1] / "migrations/versions/0012_bundles.py"
    spec = importlib.util.spec_from_file_location(extra.stem, extra)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    with Operations.context(MigrationContext.configure(db.connection())):
        m.upgrade()
    line = resource(client, rate={"amount": "100000", "currency": "IRT"})
    line.update(quantity="1", cutting_yield=None, cutting_approval="", waste_fraction="0")
    rid, revision = uuid4(), uuid4()
    assert put(client, rid, recipe(sku, [line]), key=revision).status_code == 200
    return client, db, sku, line, rid


def parameters(sku, **changes):
    return dict(
        sku_id=str(sku),
        on="2026-10-19",
        good_output=1,
        margin="0.25",
        fee="0",
        fixed_cost="0",
        round_to="1",
        rounding="half_up",
        custom_price=None,
        discount_fraction="0",
        **changes,
    )


def calculate(client, p):
    result = client.post("/api/v1/admin/pricing/calculate", json=p)
    assert result.status_code == 200, result.text
    return result.json()


def command(client, id, version, action, p=None, snapshot=None, key=None):
    return client.put(
        f"/api/v1/admin/pricing/proposals/{id}/commands/{key or uuid4()}",
        json=dict(
            expected_version=version,
            action=action,
            content=p,
            expected_fingerprint=snapshot["fingerprint"] if snapshot else None,
            reason="Reviewed explicit pricing decision",
        ),
    )


def test_exact_margin_rounding_fixed_fees_and_discount_simulation_never_publish(flow):
    client, db, sku, *_ = setup(flow)
    p = parameters(sku)
    s = calculate(client, p)
    assert s["selected_price"] == "133333.000000" and s["actual_margin"] == "0.249998"
    assert (
        db.scalar(text("SELECT price_amount FROM catalog_skus WHERE id=:id"), dict(id=sku)) is None
    )
    p.update(fee="0.05", fixed_cost="500", round_to="1000", rounding="up", discount_fraction="0.1")
    s = calculate(client, p)
    assert s["selected_price"] == "144000.000000" and s["discounted_price"] == "129600.000000"
    assert Decimal(s["discounted_margin"]) < Decimal(s["actual_margin"])
    p["custom_price"] = "90000"
    s = calculate(client, p)
    assert Decimal(s["actual_margin"]) < 0
    for changes in [
        dict(margin="0.95", fee="0.05"),
        dict(round_to="0"),
        dict(discount_fraction="1"),
    ]:
        assert (
            client.post("/api/v1/admin/pricing/calculate", json={**p, **changes}).status_code == 422
        )


def test_draft_then_explicit_publish_is_audited_idempotent_and_preserves_history(flow):
    client, db, sku, *_ = setup(flow)
    p = parameters(sku)
    s = calculate(client, p)
    id = uuid4()
    drafted = command(client, id, 0, "draft", p, s)
    assert drafted.status_code == 200, drafted.text
    assert (
        db.scalar(text("SELECT price_amount FROM catalog_skus WHERE id=:id"), dict(id=sku)) is None
    )
    key = uuid4()
    published = command(client, id, 1, "publish", key=key)
    assert published.status_code == 200, published.text
    assert command(client, id, 1, "publish", key=key).json() == published.json()
    assert command(client, id, 1, "reject", key=key).status_code == 409
    assert (
        db.scalar(text("SELECT price_amount FROM catalog_skus WHERE id=:id"), dict(id=sku))
        == 133333
    )
    assert db.scalar(text("SELECT count(*) FROM catalog_sku_price_audits")) == 1
    assert (
        client.get(f"/api/v1/admin/pricing/proposals/{id}/commands/{key}").json()
        == published.json()
    )
    assert len(client.get(f"/api/v1/admin/pricing/proposals/{id}/events").json()["items"]) == 2
    assert command(client, id, 2, "revise", p, s).status_code == 409


def test_stale_inputs_are_rejected_on_save_and_publish_without_price_effects(flow):
    client, db, sku, line, rid = setup(flow)
    p = parameters(sku)
    s = calculate(client, p)
    id = uuid4()
    assert command(client, id, 0, "draft", p, s).status_code == 200
    assert (
        save(
            client,
            line["resource_id"],
            version=1,
            resource=content(valid_from="2026-10-17", rate={"amount": "120000", "currency": "IRT"}),
        ).status_code
        == 200
    )
    assert client.get(f"/api/v1/admin/pricing/proposals/{id}").json()["stale"] is True
    assert command(client, id, 1, "publish").status_code == 409
    assert command(client, uuid4(), 0, "draft", p, s).status_code == 409
    assert db.scalar(text("SELECT count(*) FROM catalog_sku_price_audits")) == 0
    assert command(client, id, 1, "reject").status_code == 200


def test_edited_proposal_rechecks_exact_preview_and_prior_public_price_version(flow):
    client, db, sku, *_ = setup(flow)
    p = parameters(sku)
    s = calculate(client, p)
    id = uuid4()
    assert command(client, id, 0, "draft", p, s).status_code == 200
    p["custom_price"] = "150000"
    fresh = calculate(client, p)
    assert command(client, id, 1, "revise", p, s).status_code == 409
    assert command(client, id, 1, "revise", p, fresh).status_code == 200
    assert (
        client.put(
            f"/api/v1/admin/catalog/skus/{sku}/price",
            json=dict(version=0, price=dict(amount="100", currency="IRT")),
        ).status_code
        == 200
    )
    assert command(client, id, 2, "publish").status_code == 409
    fresh = calculate(client, p)
    assert command(client, id, 2, "revise", p, fresh).status_code == 200
    assert command(client, id, 3, "publish").status_code == 200
    assert db.scalar(text("SELECT count(*) FROM catalog_sku_price_audits")) == 2


def test_permission_and_csrf_checks_are_independent_from_catalog_management(flow):
    client, db, sku, *_ = setup(flow)
    p = parameters(sku)
    s = calculate(client, p)
    owner = db.scalar(text("SELECT account_id FROM identity_account_roles WHERE role='admin'"))
    db.execute(
        text(
            "INSERT INTO identity_permission_overrides(account_id,permission,allowed) VALUES(:id,'catalog.manage',false)"
        ),
        dict(id=owner),
    )
    db.commit()
    previous_csrf = client.headers["X-CSRF-Token"]
    client.headers["X-CSRF-Token"] = "wrong"
    assert command(client, uuid4(), 0, "draft", p, s).status_code == 403
    client.headers["X-CSRF-Token"] = previous_csrf
    id = uuid4()
    assert command(client, id, 0, "draft", p, s).status_code == 200
    assert command(client, id, 1, "publish").status_code == 200
    db.execute(
        text(
            "INSERT INTO identity_permission_overrides(account_id,permission,allowed) VALUES(:id,'pricing.publish',false)"
        ),
        dict(id=owner),
    )
    db.commit()
    db.execute(
        text(
            "UPDATE identity_permission_overrides SET allowed=true WHERE account_id=:id AND permission='catalog.manage'"
        ),
        dict(id=owner),
    )
    db.commit()
    assert (
        client.put(
            f"/api/v1/admin/catalog/skus/{sku}/price",
            json=dict(version=1, price=dict(amount="100", currency="IRT")),
        ).status_code
        == 403
    )
    assert client.get("/api/v1/admin/pricing/proposals").status_code == 403
    assert command(client, uuid4(), 0, "draft", p, s).status_code == 403


def test_bundle_impact_changes_block_publication_and_commands_enqueue_deduplicated_events(flow):
    from nilart.shared.outbox import consume_event

    client, db, sku, *_ = setup(flow)
    bundle = uuid4()
    db.execute(
        text(
            "INSERT INTO catalog_bundles(id,slug,title_fa,title_en) VALUES(:id,'test-bundle','پکیج','Test bundle')"
        ),
        dict(id=bundle),
    )
    db.execute(
        text("INSERT INTO catalog_bundle_components(bundle_id,sku_id,quantity) VALUES(:id,:sku,1)"),
        dict(id=bundle, sku=sku),
    )
    db.commit()
    p = parameters(sku)
    snapshot = calculate(client, p)
    assert snapshot["affected_bundles"][0]["id"] == str(bundle)
    id = uuid4()
    draft = command(client, id, 0, "draft", p, snapshot)
    assert draft.status_code == 200
    event = draft.json()
    envelope = dict(
        id=str(uuid4()),
        event_type="pricing.proposal_changed",
        payload=dict(proposal_id=str(id), event_id=event["id"], version=1, action="draft"),
    )
    assert consume_event(db, envelope) is True
    assert consume_event(db, envelope) is False
    db.execute(
        text("UPDATE catalog_bundle_components SET quantity=2 WHERE bundle_id=:id"), dict(id=bundle)
    )
    db.commit()
    assert command(client, id, 1, "publish").status_code == 409
    fresh = calculate(client, p)
    assert fresh["affected_bundles"][0]["quantity"] == 2
    assert command(client, id, 1, "revise", p, fresh).status_code == 200
    assert command(client, id, 2, "publish").status_code == 200
