import importlib.util
import json
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from test_identity_otp_postgres import flow as flow
from test_media_library_postgres import prepare as media_prepare
from test_media_library_postgres import save as media_save

BASE = "/api/v1/admin/catalog/bundles"


def setup(flow):
    client, db, sku = media_prepare(flow)
    for file in [
        "0009_catalog_options.py",
        "0015_sku_option_mappings.py",
        "0016_product_presentations.py",
        "0012_bundles.py",
        "0020_bundle_presentations.py",
        "0035_stock_ledger.py",
        "0052_bundle_authoring.py",
        "0053_catalog_profiles.py",
    ]:
        path = Path(__file__).parents[1] / "migrations/versions" / file
        spec = importlib.util.spec_from_file_location(path.stem, path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with Operations.context(MigrationContext.configure(db.connection())):
            module.upgrade()
    collection = uuid4()
    db.execute(
        text(
            "INSERT INTO catalog_collections(id,slug,title_fa,title_en,published) VALUES(:id,'bundle-collection','کالکشن','Collection',true)"
        ),
        {"id": collection},
    )
    db.execute(text("UPDATE catalog_products SET published=true"))
    db.execute(text("UPDATE catalog_skus SET published=true,price_amount=100,currency='IRT'"))
    db.commit()
    asset = uuid4()
    media = media_save(client, asset, action="publish").json()
    content = dict(
        slug="managed-bundle",
        title_fa="پکیج",
        title_en="Managed bundle",
        description_fa="شرح",
        description_en="Description",
        collection_ids=[str(collection)],
        components=[dict(sku_id=str(sku), quantity=2, allowed_sku_ids=[str(sku)])],
        gallery=[
            dict(
                asset_id=str(asset),
                revision_id=media["revision_id"],
                alt_fa="تصویر پکیج",
                alt_en="Bundle photograph",
            )
        ],
        discount_kind="percent",
        discount_amount="10",
        packaging_cost="0",
        service_cost="0",
        allow_discount_stacking=False,
    )
    return client, db, sku, asset, content


def save(client, id, content, version=0, action="draft", key=None):
    return client.put(
        f"{BASE}/{id}/commands/{key or uuid4()}",
        json=dict(
            expected_version=version,
            action=action,
            content=content,
            reason="Reviewed managed bundle definition",
        ),
    )


def test_drafts_publication_immutable_gallery_and_duplicate_components(flow):
    client, db, sku, asset, content = setup(flow)
    id, key = uuid4(), uuid4()
    content["components"] *= 2
    r = save(client, id, content, key=key)
    assert r.status_code == 200, r.text
    assert save(client, id, content, key=key).json() == r.json()
    assert client.get("/api/v1/catalog/bundles/managed-bundle").status_code == 404
    published = save(client, id, content, 1, "publish")
    assert published.status_code == 200, published.text
    public = client.get("/api/v1/catalog/bundles/managed-bundle").json()
    assert public["components"][0]["quantity"] == 4
    assert (
        client.get("/api/v1/catalog/bundles/managed-bundle/presentation").json()["discount"]["kind"]
        == "percent"
    )
    gallery = client.get("/api/v1/catalog/bundles/managed-bundle/gallery").json()
    assert len(gallery) == 1 and client.get(gallery[0]["url"]).status_code == 200
    changed = {**content, "title_en": "Unpublished change"}
    assert save(client, id, changed, 2).status_code == 200
    assert (
        client.get("/api/v1/catalog/bundles/managed-bundle").json()["title_en"] == "Managed bundle"
    )
    assert save(client, id, changed, 1).status_code == 409
    assert len(client.get(f"{BASE}/{id}/history").json()) == 3
    assert save(client, id, changed, 3, "unpublish").status_code == 200
    assert client.get("/api/v1/catalog/bundles/managed-bundle").status_code == 404
    assert db.scalar(text("SELECT count(*) FROM catalog_bundle_revisions")) == 4


def test_publication_requires_approved_media_configuration_and_available_skus(flow):
    client, db, sku, asset, content = setup(flow)
    id = uuid4()
    for patch in [
        dict(gallery=[]),
        dict(packaging_cost=None),
        dict(service_cost=None),
        dict(collection_ids=[]),
        dict(components=[]),
    ]:
        r = save(client, id, {**content, **patch}, action="publish")
        assert r.status_code == 409, r.text
    assert save(client, id, {**content, "discount_amount": "101"}).status_code == 422
    private = media_save(
        client,
        purpose="print_file",
        metadata={
            **__import__("test_media_library_postgres").metadata(),
            "sku_id": str(sku),
            "print_size": "A4",
        },
    ).json()
    bad = {
        **content,
        "gallery": [
            {
                **content["gallery"][0],
                "asset_id": private["asset_id"],
                "revision_id": private["revision_id"],
            }
        ],
    }
    assert save(client, id, bad, action="publish").status_code == 409
    db.execute(text("UPDATE catalog_skus SET published=false WHERE id=:id"), {"id": sku})
    db.commit()
    assert save(client, id, content, action="publish").status_code == 409
    assert db.scalar(text("SELECT count(*) FROM catalog_bundle_revisions")) == 0


def test_permission_revocation_and_outbox_rollback_preserve_catalogue(flow, monkeypatch):
    client, db, sku, asset, content = setup(flow)
    id = uuid4()
    import nilart.contexts.catalog.presentation.bundle_authoring as module

    monkeypatch.setattr(
        module, "enqueue", lambda *a, **kw: (_ for _ in ()).throw(RuntimeError("rollback"))
    )
    with pytest.raises(RuntimeError, match="rollback"):
        save(client, id, content, action="publish")
    assert db.scalar(text("SELECT count(*) FROM catalog_bundles")) == 0
    owner = db.scalar(text("SELECT id FROM identity_accounts LIMIT 1"))
    db.execute(
        text(
            "INSERT INTO identity_permission_overrides(account_id,permission,allowed) VALUES(:id,'catalog.manage',false)"
        ),
        {"id": owner},
    )
    db.commit()
    assert save(client, id, content).status_code == 403


def test_percentage_quote_uses_aggregated_components_and_never_exposes_costs(flow):
    from nilart.contexts.basket.catalog import quote
    from nilart.contexts.basket.domain import Item

    client, db, sku, asset, content = setup(flow)
    id = uuid4()
    r = save(client, id, content, action="publish")
    assert r.status_code == 200, r.text
    result = quote(db, Item(kind="bundle", item_id=id, quantity=1, choices={str(sku): str(sku)}))
    assert (
        Decimal(result["base"]) == 200
        and Decimal(result["saving"]) == 20
        and Decimal(result["unit"]) == 180
    )
    public = client.get("/api/v1/catalog/bundles/managed-bundle/presentation").json()
    assert "packaging_cost" not in public and "service_cost" not in public
    url = client.get("/api/v1/catalog/bundles/managed-bundle/gallery").json()[0]["url"]
    before = client.get(url).content
    assert (
        media_save(
            client,
            asset,
            version=1,
            action="publish",
            content_base64=__import__("test_media_library_postgres").image("blue"),
        ).status_code
        == 200
    )
    assert client.get(url).content == before
    assert (
        media_save(client, asset, version=2, action="unpublish", content_base64=None).status_code
        == 200
    )
    assert client.get(url).status_code == 404


def test_capacity_is_ledger_backed_aggregates_repeated_demand_and_respects_holds(flow):
    client, db, sku, asset, content = setup(flow)
    content["components"] *= 2
    assert save(client, uuid4(), content, action="publish").status_code == 200
    params = {"choices": __import__("json").dumps({str(sku): str(sku)})}
    path = "/api/v1/catalog/bundles/managed-bundle/availability"
    missing = client.get(path, params=params)
    assert missing.status_code == 200, missing.text
    assert missing.json() == {"configured": False, "capacity": None}
    db.execute(
        text(
            "INSERT INTO inventory_positions(id,kind,reference_id,code,title_fa,title_en,unit,quantity,reserved,value,version) VALUES(:id,'sku',:sku,'STOCK','موجودی','Stock','piece',11,3,100,1)"
        ),
        {"id": uuid4(), "sku": sku},
    )
    db.commit()
    result = client.get(path, params=params)
    assert result.status_code == 200, result.text
    assert result.json()["capacity"] == "2"
    assert client.get(path, params={"choices": "{}"}).status_code == 409


def test_bundle_publication_requires_the_independent_price_permission(flow):
    client, db, sku, asset, content = setup(flow)
    owner = db.scalar(text("SELECT id FROM identity_accounts LIMIT 1"))
    db.execute(
        text(
            "INSERT INTO identity_permission_overrides(account_id,permission,allowed) VALUES(:id,'pricing.publish',false)"
        ),
        {"id": owner},
    )
    db.commit()
    id = uuid4()
    assert save(client, id, content).status_code == 200
    assert save(client, id, content, 1, "publish").status_code == 403
    assert client.get("/api/v1/catalog/bundles/managed-bundle").status_code == 404


def test_unmanaged_legacy_definition_stays_readable_without_inventing_metadata(flow):
    client, db, sku, asset, content = setup(flow)
    id = uuid4()
    db.execute(
        text(
            "INSERT INTO catalog_bundles(id,slug,title_fa,title_en,published) VALUES(:id,'پکیج قدیمی','قدیمی','Legacy',false)"
        ),
        {"id": id},
    )
    db.commit()
    result = client.get(f"{BASE}/{id}")
    assert result.status_code == 200, result.text
    assert result.json()["legacy"] is True and result.json()["content"] is None
    assert db.scalar(text("SELECT count(*) FROM catalog_bundle_documents")) == 0


def test_digital_bundle_has_no_physical_stock_requirement_or_invented_capacity(flow):
    client, db, sku, asset, content = setup(flow)
    profile = dict(
        gallery=content["gallery"],
        specifications=[],
        delivery="digital",
        weight_grams=None,
        returnable=False,
    )
    r = client.put(
        f"/api/v1/admin/catalog/profiles/skus/{sku}/commands/{uuid4()}",
        json=dict(
            expected_version=0,
            action="publish",
            content=profile,
            reason="Approve digital bundle component",
        ),
    )
    assert r.status_code == 200, r.text
    assert save(client, uuid4(), content, action="publish").status_code == 200
    r = client.get(
        "/api/v1/catalog/bundles/managed-bundle/availability",
        params={"choices": json.dumps({str(sku): str(sku)})},
    )
    assert r.status_code == 200, r.text
    assert r.json() == {"configured": True, "capacity": None, "unlimited": True}
    assert db.scalar(text("SELECT count(*) FROM inventory_positions")) == 0


def test_mixed_bundle_public_capacity_ignores_digital_stock(flow):
    client, db, sku, asset, content = setup(flow)
    digital = uuid4()
    product = db.scalar(text("SELECT product_id FROM catalog_skus WHERE id=:id"), {"id": sku})
    db.execute(
        text(
            "INSERT INTO catalog_skus(id,product_id,code,published,price_amount,currency) VALUES(:id,:product,'DIGITAL-COMPONENT',true,20,'IRT')"
        ),
        {"id": digital, "product": product},
    )
    db.commit()
    profile = dict(
        gallery=content["gallery"],
        specifications=[],
        delivery="digital",
        weight_grams=None,
        returnable=False,
    )
    r = client.put(
        f"/api/v1/admin/catalog/profiles/skus/{digital}/commands/{uuid4()}",
        json=dict(
            expected_version=0,
            action="publish",
            content=profile,
            reason="Approve digital mixed component",
        ),
    )
    assert r.status_code == 200, r.text
    content["components"].append(
        dict(sku_id=str(digital), quantity=1, allowed_sku_ids=[str(digital)])
    )
    assert save(client, uuid4(), content, action="publish").status_code == 200
    r = client.put(
        f"/api/v1/admin/inventory/commands/{uuid4()}",
        json=dict(
            kind="sku",
            reference_id=str(sku),
            expected_version=0,
            action="opening",
            quantity="5",
            value="250",
            reason="Explicit physical bundle stock",
        ),
    )
    assert r.status_code == 200, r.text
    r = client.get(
        "/api/v1/catalog/bundles/managed-bundle/availability",
        params={"choices": json.dumps({str(sku): str(sku), str(digital): str(digital)})},
    )
    assert r.status_code == 200, r.text
    assert r.json() == {"configured": True, "capacity": "2"}
