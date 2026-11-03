import importlib.util
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from test_identity_otp_postgres import flow as flow
from test_media_library_postgres import prepare
from test_media_library_postgres import save as media_save

BASE = "/api/v1/admin/catalog/profiles"


def setup(flow):
    client, db, sku = prepare(flow)
    path = Path(__file__).parents[1] / "migrations/versions/0053_catalog_profiles.py"
    spec = importlib.util.spec_from_file_location(path.stem, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(db.connection())):
        module.upgrade()
    db.execute(text("UPDATE catalog_products SET published=true"))
    db.execute(text("UPDATE catalog_skus SET published=true"))
    db.commit()
    asset = uuid4()
    media = media_save(client, asset, action="publish").json()
    content = dict(
        specifications=[
            dict(label_fa="جنس", label_en="Material", value_fa="کاغذ", value_en="Paper")
        ],
        gallery=[
            dict(
                asset_id=str(asset),
                revision_id=media["revision_id"],
                alt_fa="تصویر",
                alt_en="Photograph",
            )
        ],
        delivery="physical",
        weight_grams=125, length_cm=None, width_cm=None, height_cm=None, weight_estimated=False,
        returnable=True,
    )
    return client, db, sku, asset, content


def save(client, sku, content, version=0, action="draft", key=None, kind="skus"):
    return client.put(
        f"{BASE}/{kind}/{sku}/commands/{key or uuid4()}",
        json=dict(
            expected_version=version,
            action=action,
            content=content,
            reason="Reviewed profile configuration",
        ),
    )


def test_profile_publication_draft_isolation_and_exact_receipts(flow):
    client, db, sku, asset, content = setup(flow)
    public = f"/api/v1/catalog/profiles/skus/{sku}"
    assert client.get(f"{BASE}/skus/{sku}").json()["content"] is None
    key = uuid4()
    first = save(client, sku, content, key=key)
    assert first.status_code == 200, first.text
    assert save(client, sku, content, key=key).json() == first.json()
    assert client.get(public).status_code == 404
    assert save(client, sku, content, 1, "publish").status_code == 200
    assert client.get(public).json() == content
    assert save(client, sku, {**content, "weight_grams": 200}, 2).status_code == 200
    assert client.get(public).json()["weight_grams"] == 125
    assert save(client, sku, content, 1).status_code == 409
    assert save(client, sku, {**content, "weight_grams": 200}, key=key).status_code == 409
    assert len(client.get(f"{BASE}/skus/{sku}/history").json()) == 3
    assert len(client.get(f"{BASE}/skus/{sku}/history?before=3").json()) == 2
    assert client.get(f"{BASE}/skus/{sku}/commands/{key}").json() == first.json()
    assert save(client, sku, content, 3, "unpublish").status_code == 200
    assert client.get(public).status_code == 404
    assert db.scalar(text("SELECT count(*) FROM catalog_profile_revisions")) == 4


def test_configuration_media_revocation_and_distinct_parent_visibility(flow):
    client, db, sku, asset, content = setup(flow)
    assert (
        save(client, sku, {**content, "weight_grams": None}, action="publish").json()["code"]
        == "profile_configuration_incomplete"
    )
    assert (
        save(client, sku, {**content, "delivery": "digital"}, action="publish").status_code == 422
    )
    assert (
        save(
            client, sku, {**content, "delivery": "digital", "weight_grams": None}, action="publish"
        ).status_code
        == 200
    )
    assert client.get(f"/api/v1/catalog/profiles/skus/{sku}").json()["weight_grams"] is None
    # Profiles never alter catalogue visibility, price, inventory or policies.
    assert (
        db.scalar(text("SELECT price_amount FROM catalog_skus WHERE id=:id"), {"id": sku}) is None
    )
    db.execute(text("UPDATE catalog_products SET published=false"))
    db.commit()
    assert client.get(f"/api/v1/catalog/profiles/skus/{sku}").status_code == 404
    db.execute(text("UPDATE catalog_products SET published=true"))
    db.commit()
    assert (
        media_save(client, asset, version=1, action="unpublish", content_base64=None).status_code
        == 200
    )
    assert client.get(f"/api/v1/catalog/profiles/skus/{sku}").json()["gallery"] == []
    assert save(client, sku, content, 1, "publish").status_code == 409


def test_profile_kind_permissions_and_atomic_rollback(flow, monkeypatch):
    client, db, sku, asset, content = setup(flow)
    product = db.scalar(text("SELECT product_id FROM catalog_skus WHERE id=:id"), {"id": sku})
    assert save(client, product, content, kind="products").status_code == 409
    product_content = {**content, "delivery": None, "weight_grams": None, "returnable": None}
    assert (
        save(client, product, product_content, kind="products", action="publish").status_code == 200
    )
    assert client.get(f"/api/v1/catalog/profiles/products/{product}").status_code == 200
    import nilart.contexts.catalog.presentation.profiles as module

    monkeypatch.setattr(
        module, "enqueue", lambda *a, **kw: (_ for _ in ()).throw(RuntimeError("rollback"))
    )
    with pytest.raises(RuntimeError, match="rollback"):
        save(client, sku, content, action="publish")
    assert db.scalar(text("SELECT count(*) FROM catalog_profiles WHERE kind='skus'")) == 0
    actor = db.scalar(text("SELECT id FROM identity_accounts LIMIT 1"))
    db.execute(
        text(
            "INSERT INTO identity_permission_overrides(account_id,permission,allowed) VALUES(:id,'catalog.manage',false)"
        ),
        {"id": actor},
    )
    db.commit()
    assert save(client, sku, content).status_code == 403
    assert client.get(f"{BASE}/skus/{sku}").status_code == 403


def test_gallery_rejects_private_draft_and_duplicate_bindings(flow):
    client, db, sku, asset, content = setup(flow)
    draft = uuid4()
    revision = media_save(client, draft).json()["revision_id"]
    bad = {
        **content,
        "gallery": [{**content["gallery"][0], "asset_id": str(draft), "revision_id": revision}],
    }
    assert save(client, sku, bad).status_code == 409
    assert save(client, sku, {**content, "gallery": content["gallery"] * 2}).status_code == 422
    assert save(client, uuid4(), content).status_code == 404
    assert client.get(f"{BASE}/injected/{sku}").status_code == 422
    assert db.scalar(text("SELECT count(*) FROM catalog_profiles")) == 0


def test_physical_commerce_profile_without_gallery_or_weight_requires_flat_shipping(flow):
    import json
    client, db, sku, _, content = setup(flow)
    commerce = {**content, "gallery": [], "weight_grams": None, "delivery": "physical", "returnable": True}
    assert save(client, sku, commerce, action="publish").status_code == 409
    settings = {"shipping_methods": [{"id":str(uuid4()),"title_fa":"ارسال ثابت","title_en":"Flat shipping","base_amount":"150000","per_kg_amount":"0","active":True}]}
    db.execute(text("INSERT INTO business_settings(key,version,content) VALUES('business',1,CAST(:content AS jsonb))"), {"content":json.dumps(settings)})
    db.commit()
    result = save(client, sku, commerce, action="publish")
    assert result.status_code == 200, result.text
