import base64
from datetime import UTC, datetime, timedelta
from io import BytesIO
from uuid import uuid4

import pytest
from PIL import Image
from pydantic import SecretStr
from sqlalchemy import text
from test_basket import basket as basket
from test_basket import migrate
from test_fulfillment_postgres import setup as setup_fulfillment
from test_identity_otp_postgres import flow as flow
from test_sandbox_payments import checkout as checkout

from nilart.bootstrap.settings import settings
from nilart.contexts.channels import service
from nilart.contexts.channels.adapters import ChannelError
from nilart.contexts.channels.models import Config
from nilart.contexts.channels.orders import ingest

BASE = "/api/v1/admin/channels"


def prepare(checkout, monkeypatch):
    client, db, order, line = setup_fulfillment(checkout)
    migrate(db, "0037_media_library.py")
    migrate(db, "0060_sales_channels.py")
    owner = db.scalar(text("SELECT id FROM identity_accounts LIMIT 1"))
    db.execute(
        text(
            "INSERT INTO identity_account_roles(account_id,role) VALUES(:id,'admin') ON CONFLICT DO NOTHING"
        ),
        dict(id=owner),
    )
    db.commit()
    monkeypatch.setattr(settings, "basalam_enabled", True)
    monkeypatch.setattr(settings, "basalam_token", SecretStr("private-test-token"))
    monkeypatch.setattr(settings, "basalam_webhook_secret", SecretStr("private-webhook-secret"))

    class Fake:
        record = None
        writes = 0
        uploads = 0
        uncertain = False

        def me(self):
            return {"vendor": {"id": 101, "identifier": "test-store", "title": "Test store"}}

        def upload(self, *_):
            self.uploads += 1
            return {"id": 55}

        def create(self, vendor, body):
            self.writes += 1
            self.record = {**body, "id": 501, "inventory": body["stock"], "vendor": {"id": vendor}}
            if self.uncertain:
                raise ChannelError("channel_result_unknown", uncertain=True)
            return {"id": 501}

        def product(self, id):
            return self.record

        def update(self, id, body, variation=None):
            self.writes += 1
            self.record.update(body)
            self.record["inventory"] = body.get("stock", self.record["inventory"])
            return {"id": id}

    fake = Fake()
    monkeypatch.setattr(service, "adapter", lambda _: fake)
    monkeypatch.setattr("nilart.contexts.channels.router.adapter", lambda _: fake)
    config = Config(mode="live", vendor_id=101, preparation_days=2, packaging_weight_grams=100)
    csrf = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    client.headers["X-CSRF-Token"] = csrf
    configbody = dict(
        expected_version=0,
        content=config.model_dump(mode="json"),
        reason="Owner approved channel test",
    )
    saved = client.put(BASE + "/basalam/settings/" + str(uuid4()), json=configbody)
    assert saved.status_code == 200, saved.text
    sku = db.scalar(text("SELECT id FROM catalog_skus ORDER BY id LIMIT 1"))
    db.execute(
        text(
            "UPDATE catalog_profile_revisions SET intent=jsonb_set(intent,'{content}',(intent->'content') || '{\"length_cm\": 21,\"width_cm\": 14.8,\"height_cm\": 1.5}'::jsonb) WHERE entity_id=:id"
        ),
        dict(id=sku),
    )
    db.commit()
    image = BytesIO()
    Image.new("RGB", (800, 800), "white").save(image, format="JPEG")
    media = client.put(
        f"/api/v1/admin/media/{uuid4()}/versions/{uuid4()}",
        json=dict(
            expected_version=0,
            action="publish",
            purpose="public_image",
            metadata=dict(title_fa="دفتر", title_en="Notebook", alt_fa="دفتر", alt_en="Notebook"),
            file_name="notebook.jpg",
            content_base64=base64.b64encode(image.getvalue()).decode(),
            reason="Reviewed product photo",
        ),
    )
    assert media.status_code == 200, media.text
    m = media.json()
    id = uuid4()
    content = dict(
        sku_id=str(sku),
        active=True,
        title="Handmade notebook",
        description="A real notebook with paper specifications.",
        category_id=1,
        brand="Nilart",
        images_reviewed=True,
        gallery=[
            dict(
                asset_id=m["asset_id"],
                revision_id=m["revision_id"],
                alt_fa="دفتر",
                alt_en="Notebook",
            )
        ],
    )
    saved = client.put(
        f"{BASE}/basalam/listings/{id}/commands/{uuid4()}",
        json=dict(expected_version=0, content=content, reason="Reviewed channel mapping"),
    )
    assert saved.status_code == 200, saved.text
    return client, db, owner, id, sku, content, fake


def test_channel_preview_price_and_frozen_job_replay(checkout, monkeypatch):
    client, db, owner, id, sku, content, fake = prepare(checkout, monkeypatch)
    plan = client.get(f"{BASE}/basalam/listings/{id}/preview").json()
    assert plan["ready"], plan
    site = db.scalar(text("SELECT price_amount FROM catalog_skus WHERE id=:id"), dict(id=sku))
    assert (
        plan["payload"]["primary_price"]
        == int((site * 11 / 10).to_integral_value(rounding="ROUND_CEILING")) * 10
    )
    assert plan["payload"]["package_weight"] == 200
    key = uuid4()
    body = dict(fingerprint=plan["fingerprint"], confirmed=True)
    first = client.put(f"{BASE}/basalam/listings/{id}/sync/{key}", json=body)
    assert first.status_code == 200, first.text
    replay = client.put(f"{BASE}/basalam/listings/{id}/sync/{key}", json=body)
    assert replay.status_code == 200, replay.text
    assert replay.json()["id"] == str(key)
    assert db.scalar(text("SELECT count(*) FROM channel_operations")) == 1
    service.run_operation(db, key)
    assert db.scalar(text("SELECT state FROM channel_operations")) == "succeeded"
    assert fake.writes == 1 and fake.uploads == 1
    service.run_operation(db, key)
    assert fake.writes == 1
    assert (
        db.scalar(
            text("SELECT external_product_id FROM channel_listings WHERE id=:id"), dict(id=id)
        )
        == 501
    )
    # A later stock-only difference reuses the uploaded immutable photo.
    plan = client.get(f"{BASE}/basalam/listings/{id}/preview").json()
    key2 = uuid4()
    assert (
        client.put(
            f"{BASE}/basalam/listings/{id}/sync/{key2}",
            json={**body, "fingerprint": plan["fingerprint"]},
        ).status_code
        == 200
    )
    service.run_operation(db, key2)
    assert fake.writes == 2 and fake.uploads == 1


def test_unknown_create_is_not_retried_and_webhook_is_authenticated(checkout, monkeypatch):
    client, db, owner, id, sku, content, fake = prepare(checkout, monkeypatch)
    fake.uncertain = True
    plan = client.get(f"{BASE}/basalam/listings/{id}/preview").json()
    key = uuid4()
    client.put(
        f"{BASE}/basalam/listings/{id}/sync/{key}",
        json=dict(fingerprint=plan["fingerprint"], confirmed=True),
    )
    service.run_operation(db, key)
    service.run_operation(db, key)
    assert fake.writes == 1 and db.scalar(text("SELECT state FROM channel_operations")) == "unknown"
    assert (
        client.put(
            f"{BASE}/basalam/listings/{id}/sync/{uuid4()}",
            json=dict(fingerprint=plan["fingerprint"], confirmed=True),
        ).status_code
        == 409
    )
    path = "/api/v1/integrations/basalam/webhook"
    payload = {"event_id": 5, "data": {"id": 123}}
    assert client.post(path, json=payload).status_code == 401
    headers = {"Authorization": "Bearer private-webhook-secret"}
    assert client.post(path, json=payload, headers=headers).status_code == 200
    assert client.post(path, json=payload, headers=headers).status_code == 200
    assert db.scalar(text("SELECT count(*) FROM channel_inbox")) == 1
    assert db.scalar(text("SELECT count(*) FROM channel_orders")) == 0
    recovered = client.post(
        f"{BASE}/basalam/operations/{key}/reconcile",
        json=dict(external_product_id=501, reason="Matched existing product in provider panel"),
    )
    assert recovered.status_code == 200, recovered.text
    assert fake.writes == 1


def test_external_orders_hold_release_and_consume_stock_once(checkout, monkeypatch):
    client, db, owner, id, sku, content, fake = prepare(checkout, monkeypatch)
    db.execute(
        text("UPDATE channel_listings SET external_product_id=501 WHERE id=:id"), dict(id=id)
    )
    db.commit()
    c = service.channel(db, "basalam")
    now = datetime.now(UTC) + timedelta(seconds=2)
    parcel = dict(
        id=700,
        vendor={"id": 101},
        updated_at=now.isoformat(),
        order={"paid_at": now.isoformat()},
        status={"value": 3739},
        items=[
            dict(
                id=800,
                title="Notebook",
                quantity=2,
                price=100000,
                product={"id": 501},
                variation=None,
            )
        ],
    )
    position = (
        db.execute(
            text("SELECT * FROM inventory_positions WHERE reference_id=:id AND kind='sku'"),
            dict(id=sku),
        )
        .mappings()
        .one()
    )
    initial = position["quantity"]
    reserved = position["reserved"]
    ingest(db, c, parcel)
    db.commit()
    ingest(db, c, parcel)
    db.commit()
    assert (
        db.scalar(
            text("SELECT reserved FROM inventory_positions WHERE id=:id"), dict(id=position["id"])
        )
        == reserved + 2
    )
    parcel = {
        **parcel,
        "updated_at": (now + timedelta(seconds=1)).isoformat(),
        "status": {"value": 3238},
    }
    ingest(db, c, parcel)
    db.commit()
    ingest(db, c, parcel)
    db.commit()
    assert (
        db.scalar(
            text("SELECT quantity FROM inventory_positions WHERE id=:id"), dict(id=position["id"])
        )
        == initial - 2
    )
    assert (
        db.scalar(
            text(
                "SELECT count(*) FROM inventory_movements WHERE source_document_kind='marketplace'"
            )
        )
        == 1
    )
    parcel = {
        **parcel,
        "updated_at": (now + timedelta(seconds=2)).isoformat(),
        "status": {"value": 3067},
    }
    ingest(db, c, parcel)
    db.commit()
    assert db.scalar(text("SELECT issue FROM channel_orders")) == "return_requires_inspection"
    assert (
        db.scalar(
            text("SELECT quantity FROM inventory_positions WHERE id=:id"), dict(id=position["id"])
        )
        == initial - 2
    )


def test_stale_preview_and_foreign_vendor_are_rejected(checkout, monkeypatch):
    client, db, owner, id, sku, content, fake = prepare(checkout, monkeypatch)
    plan = client.get(f"{BASE}/basalam/listings/{id}/preview").json()
    db.execute(
        text("UPDATE inventory_positions SET reserved=reserved+1 WHERE reference_id=:id"),
        dict(id=sku),
    )
    db.commit()
    assert (
        client.put(
            f"{BASE}/basalam/listings/{id}/sync/{uuid4()}",
            json=dict(fingerprint=plan["fingerprint"], confirmed=True),
        ).status_code
        == 409
    )
    c = service.channel(db, "basalam")
    now = datetime.now(UTC) + timedelta(seconds=2)
    with pytest.raises(ChannelError):
        ingest(
            db,
            c,
            dict(
                id=1,
                vendor={"id": 999},
                updated_at=now.isoformat(),
                order={"paid_at": now.isoformat()},
                status={"value": 3739},
                items=[],
            ),
        )


def test_polling_resumes_cursor_and_cycles_to_new_orders(checkout, monkeypatch):
    client, db, owner, id, sku, content, fake = prepare(checkout, monkeypatch)
    seen = []

    def parcels(vendor_id, cursor=None):
        seen.append(cursor)
        return {"data": [], "next_cursor": "second-page" if cursor is None else None}

    monkeypatch.setattr(fake, "parcels", parcels, raising=False)
    service.tick(db)
    assert (
        db.scalar(text("SELECT poll_cursor FROM sales_channels WHERE code='basalam'"))
        == "second-page"
    )
    service.tick(db)
    assert seen == [None, "second-page"]
    assert db.scalar(text("SELECT poll_cursor FROM sales_channels WHERE code='basalam'")) is None
