from uuid import uuid4

import pytest
from sqlalchemy import text
from test_basket import migrate
from test_identity_otp_postgres import flow as flow
from test_media_library_postgres import prepare
from test_media_library_postgres import save as media_save

BASE = "/api/v1/admin/catalog/artworks"


def setup(flow):
    client, db, sku = prepare(flow)
    for f in [
        "0010_artworks.py",
        "0022_artwork_details.py",
        "0035_stock_ledger.py",
        "0053_catalog_profiles.py",
        "0054_artwork_authoring.py",
    ]:
        migrate(db, f)
    asset = uuid4()
    image = media_save(client, asset, action="publish").json()
    content = dict(
        slug="managed-artwork",
        title_fa="اثر",
        title_en="Artwork",
        description_fa="",
        description_en="",
        artist_fa="هنرمند",
        artist_en="Artist",
        medium="oil",
        style="landscape",
        width_cm=20,
        height_cm=30,
        edition="original",
        linked_sku_id=None,
        price_amount="100",
        weight_grams=500,
        returnable=True,
        license_fa="",
        license_en="",
        image_credit="Studio photograph",
        gallery=[
            dict(
                asset_id=str(asset),
                revision_id=image["revision_id"],
                alt_fa="اثر",
                alt_en="Artwork photograph",
            )
        ],
    )
    return client, db, sku, asset, content


def save(client, id, content, version=0, action="draft", key=None):
    return client.put(
        f"{BASE}/{id}/commands/{key or uuid4()}",
        json=dict(
            expected_version=version,
            action=action,
            content=content,
            reason="Reviewed artwork definition",
        ),
    )


def test_artwork_drafts_publication_receipts_and_ledger_availability(flow):
    client, db, sku, asset, c = setup(flow)
    id, key = uuid4(), uuid4()
    first = save(client, id, c, key=key)
    assert first.status_code == 200, first.text
    assert save(client, id, c, key=key).json() == first.json()
    assert client.get("/api/v1/catalog/artworks/managed-artwork").status_code == 404
    assert save(client, id, c, 1, "publish").status_code == 200
    public = client.get("/api/v1/catalog/artworks/managed-artwork").json()
    assert public["details"]["stock"] == 0 and public["details"]["sample"] is False
    assert db.scalar(text("SELECT count(*) FROM inventory_positions")) == 0
    stock = client.put(
        f"/api/v1/admin/inventory/commands/{uuid4()}",
        json=dict(
            kind="artwork",
            reference_id=str(id),
            expected_version=0,
            action="opening",
            quantity="1",
            value="50",
            reason="Explicit original stock setup",
        ),
    )
    assert stock.status_code == 200, stock.text
    assert client.get("/api/v1/catalog/artworks/managed-artwork").json()["details"]["stock"] == 1
    assert save(client, id, {**c, "price_amount": "200"}, 2).status_code == 200
    assert (
        client.get("/api/v1/catalog/artworks/managed-artwork").json()["details"]["price_amount"]
        == "100"
    )
    assert save(client, id, c, 1).status_code == 409
    assert len(client.get(f"{BASE}/{id}/history").json()) == 3
    assert save(client, id, c, 3, "unpublish").status_code == 200
    digital = {
        **c,
        "edition": "digital",
        "weight_grams": None,
        "returnable": False,
        "license_fa": "مجوز",
        "license_en": "Personal license",
    }
    assert save(client, id, digital, 4, "publish").json()["code"] == "artwork_edition_immutable"


def test_licensed_digital_and_sku_backed_prints_have_distinct_sources(flow):
    client, db, sku, asset, c = setup(flow)
    digital = {
        **c,
        "edition": "digital",
        "weight_grams": None,
        "returnable": False,
        "license_fa": "مصرف شخصی",
        "license_en": "Personal use only",
    }
    assert save(client, uuid4(), {**digital, "license_en": ""}, action="publish").status_code == 409
    assert save(client, uuid4(), digital, action="publish").status_code == 200
    assert client.get("/api/v1/catalog/artworks/managed-artwork").json()["details"]["stock"] == 1
    assert db.scalar(text("SELECT count(*) FROM inventory_positions")) == 0
    print_c = {
        **c,
        "slug": "managed-print",
        "edition": "print",
        "linked_sku_id": str(sku),
        "price_amount": None,
    }
    assert save(client, uuid4(), print_c, action="publish").status_code == 409
    db.execute(text("UPDATE catalog_products SET published=true"))
    db.execute(text("UPDATE catalog_skus SET published=true,price_amount=250,currency='IRT'"))
    db.commit()
    profile = {
        "specifications": [],
        "gallery": c["gallery"],
        "delivery": "physical",
        "weight_grams": 50,
        "returnable": True,
    }
    r = client.put(
        f"/api/v1/admin/catalog/profiles/skus/{sku}/commands/{uuid4()}",
        json=dict(
            expected_version=0,
            action="publish",
            content=profile,
            reason="Reviewed physical print profile",
        ),
    )
    assert r.status_code == 200, r.text
    assert save(client, uuid4(), print_c, action="publish").status_code == 200
    assert (
        client.get("/api/v1/catalog/artworks/managed-print").json()["details"]["price_amount"]
        == "250"
    )
    db.execute(text("UPDATE catalog_skus SET price_amount=300"))
    db.commit()
    assert (
        client.get("/api/v1/catalog/artworks/managed-print").json()["details"]["price_amount"]
        == "300"
    )


def test_artwork_media_permissions_and_atomic_rollback(flow, monkeypatch):
    client, db, sku, asset, c = setup(flow)
    id = uuid4()
    import nilart.contexts.catalog.presentation.artwork_authoring as module

    monkeypatch.setattr(
        module, "enqueue", lambda *a, **kw: (_ for _ in ()).throw(RuntimeError("rollback"))
    )
    with pytest.raises(RuntimeError, match="rollback"):
        save(client, id, c, action="publish")
    assert db.scalar(text("SELECT count(*) FROM catalog_artworks")) == 0
    owner = db.scalar(text("SELECT id FROM identity_accounts LIMIT 1"))
    db.execute(
        text(
            "INSERT INTO identity_permission_overrides(account_id,permission,allowed) VALUES(:id,'pricing.publish',false)"
        ),
        {"id": owner},
    )
    db.commit()
    assert save(client, id, c, action="publish").status_code == 403
    monkeypatch.undo()
    assert save(client, id, c).status_code == 200
    assert (
        media_save(client, asset, version=1, action="unpublish", content_base64=None).status_code
        == 200
    )
    assert save(client, id, c, 1).status_code == 409


def test_catalogue_revision_events_are_validated_and_consumed_once(flow):
    from nilart.shared.outbox import consume_event, enqueue

    client, db, sku, asset, c = setup(flow)
    for name, field in [
        ("catalog.artwork_saved", "artwork_id"),
        ("catalog.bundle_saved", "bundle_id"),
        ("catalog.profile_saved", "entity_id"),
    ]:
        payload = {
            field: str(uuid4()),
            "revision_id": str(uuid4()),
            "version": 1,
            "action": "publish",
        }
        if name == "catalog.profile_saved":
            payload["kind"] = "skus"
        key = enqueue(db, name, payload)
        envelope = {"id": key, "event_type": name, "payload": payload}
        assert consume_event(db, envelope) is True
        assert consume_event(db, envelope) is False
        with pytest.raises(ValueError):
            consume_event(
                db, {**envelope, "id": uuid4(), "payload": {**payload, "action": "unsupported"}}
            )
