from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import text
from test_basket import basket as basket
from test_basket import migrate
from test_discounts_postgres import prepare, quote, rule, save
from test_identity_otp_postgres import flow as flow
from test_sandbox_payments import checkout as checkout

from nilart.contexts.basket.catalog import product_quote, sku
from nilart.contexts.marketing.service import effective_sale


def setup(checkout):
    client, db, body, owner = prepare(checkout)
    migrate(db, "0037_media_library.py")
    migrate(db, "0061_marketing.py")
    db.commit()
    csrf = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    client.headers.update({"X-CSRF-Token": csrf})
    return client, db, owner


def test_scheduled_sale_matches_catalog_and_basket_and_preserves_base(checkout):
    client, db, owner = setup(checkout)
    row = (
        db.execute(
            text(
                "SELECT id,code,price_amount,currency FROM catalog_skus WHERE published AND price_amount>2 LIMIT 1"
            )
        )
        .mappings()
        .one()
    )
    assert row["currency"] == "IRT"
    assert all(
        item["amount"] is None or isinstance(item["amount"], str)
        for item in client.get("/api/v1/admin/promotions/choices").json()
    )
    now = datetime.now(UTC)
    price = str(int(row["price_amount"] / 2))
    key = uuid4()
    content = {
        "banner": {"text_fa": "فروش ویژه", "active": True},
        "sales": [
            {
                "kind": "sku",
                "target_id": str(row["id"]),
                "title": "دفتر",
                "sale_amount": price,
                "active": True,
                "starts_at": (now - timedelta(minutes=1)).isoformat(),
                "ends_at": (now + timedelta(days=1)).isoformat(),
            }
        ],
    }
    body = {"expected_version": 0, "content": content, "reason": "Owner-reviewed scheduled sale"}
    r = client.put(f"/api/v1/admin/promotions/{key}", json=body)
    assert r.status_code == 200, r.text
    assert client.put(f"/api/v1/admin/promotions/{key}", json=body).json() == r.json()
    public = client.get("/api/v1/catalog/skus/" + row["code"]).json()
    assert Decimal(public["price"]["amount"]) == Decimal(price)
    assert Decimal(public["original_price"]["amount"]) == row["price_amount"]
    assert Decimal(product_quote(db, sku(db, row["id"]))["unit"]) == Decimal(price)
    assert (
        db.scalar(text("SELECT price_amount FROM catalog_skus WHERE id=:id"), dict(id=row["id"]))
        == row["price_amount"]
    )
    assert (
        effective_sale(db, "sku", row["id"], row["price_amount"], on=now + timedelta(days=2))
        == row["price_amount"]
    )
    assert client.get("/api/v1/promotions").json()["banner"]["text_fa"] == "فروش ویژه"
    assert len(client.get("/api/v1/promotions/sales").json()) == 1
    assert client.put(f"/api/v1/admin/promotions/{uuid4()}", json=body).status_code == 409


def test_first_purchase_code_rejects_prior_paid_order_and_hides_inactive_banner(checkout):
    client, db, owner = setup(checkout)
    r = save(
        client,
        content=rule(
            code="WELCOME-NIL-100",
            kind="fixed",
            value="100",
            customer_limit=1,
            first_purchase_only=True,
        ),
    )
    assert r.status_code == 200, r.text
    assert quote(client, "WELCOME-NIL-100").status_code == 200
    db.execute(
        text(
            "INSERT INTO customer_orders(id,account_id,source_id,snapshot,state) VALUES(:id,:owner,:source,'{}',CAST(:state AS jsonb))"
        ),
        dict(id=uuid4(), owner=owner, source=uuid4(), state='{"payment": "paid"}'),
    )
    db.commit()
    rejected = quote(client, "WELCOME-NIL-100")
    assert rejected.status_code == 409, rejected.text
    assert "discount_first_purchase_only" in rejected.text
    client.headers["X-CSRF-Token"] = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    content = {"banner": {"text_fa": "کد منقضی", "active": True, "code": "NOT-ACTIVE"}, "sales": []}
    assert (
        client.put(
            f"/api/v1/admin/promotions/{uuid4()}",
            json={
                "expected_version": 0,
                "content": content,
                "reason": "Reviewed inactive coupon banner",
            },
        ).status_code
        == 200
    )
    assert client.get("/api/v1/promotions").json()["banner"] is None
    client.cookies.clear()
    client.headers.pop("X-CSRF-Token", None)
    assert client.get("/api/v1/admin/promotions").status_code in (401, 403)


def test_multiple_banners_keep_legacy_response_and_filter_each_slide(checkout):
    client, db, _ = setup(checkout)
    now = datetime.now(UTC)
    first, second, hidden = str(uuid4()), str(uuid4()), str(uuid4())
    content = {
        "banner": {"text_fa": "خوش آمدی", "active": True},
        "banners": [
            {
                "id": first,
                "text_fa": "دفتر اختصاصی",
                "active": True,
                "tone": "sage",
                "link": "/fa/commissions/notebook#notebook-request",
            },
            {
                "id": second,
                "text_fa": "تمام شده",
                "active": True,
                "ends_at": (now - timedelta(seconds=1)).isoformat(),
            },
            {"id": hidden, "text_fa": "کد غیرفعال", "active": True, "code": "NOT-ACTIVE"},
        ],
        "sales": [],
    }
    body = {"expected_version": 0, "content": content, "reason": "Reviewed ordered banner carousel"}
    key = uuid4()
    saved = client.put(f"/api/v1/admin/promotions/{key}", json=body)
    assert saved.status_code == 200, saved.text
    assert client.put(f"/api/v1/admin/promotions/{key}", json=body).json() == saved.json()
    public = client.get("/api/v1/promotions")
    assert public.headers["cache-control"] == "no-store"
    assert public.json()["banner"]["text_fa"] == "خوش آمدی"
    assert [b["id"] for b in public.json()["banners"]] == ["primary", first]
    assert public.json()["banners"][1]["tone"] == "sage"
    duplicate = {**content, "banners": [content["banners"][0], content["banners"][0]]}
    assert (
        client.put(
            f"/api/v1/admin/promotions/{uuid4()}",
            json={**body, "expected_version": 1, "content": duplicate},
        ).status_code
        == 422
    )
    unsafe = {**content, "banners": [{**content["banners"][0], "link": "//example.com"}]}
    assert (
        client.put(
            f"/api/v1/admin/promotions/{uuid4()}",
            json={**body, "expected_version": 1, "content": unsafe},
        ).status_code
        == 422
    )


def test_home_offers_use_published_available_variant_and_expire(checkout):
    client, db, _ = setup(checkout)
    row = (
        db.execute(
            text(
                "SELECT s.id,s.product_id,s.price_amount FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id WHERE s.published AND p.published AND s.price_amount>2 LIMIT 1"
            )
        )
        .mappings()
        .one()
    )
    now = datetime.now(UTC)
    content = {
        "banner": {},
        "sales": [
            {
                "kind": "sku",
                "target_id": str(row["id"]),
                "title": "دفتر ویژه",
                "sale_amount": str(int(row["price_amount"] / 2)),
                "active": True,
                "starts_at": (now - timedelta(minutes=1)).isoformat(),
                "ends_at": (now + timedelta(days=1)).isoformat(),
            }
        ],
    }
    db.execute(
        text(
            "UPDATE inventory_positions SET quantity=2,reserved=0 WHERE kind='sku' AND reference_id=:id"
        ),
        dict(id=row["id"]),
    )
    db.commit()
    response = client.put(
        f"/api/v1/admin/promotions/{uuid4()}",
        json={
            "expected_version": 0,
            "content": content,
            "reason": "Reviewed available homepage special offer",
        },
    )
    assert response.status_code == 200, response.text
    home = client.get("/api/v1/promotions/home-offers")
    assert home.status_code == 200, home.text
    assert len(home.json()) == 1
    offer = home.json()[0]
    assert offer["target_id"] == str(row["id"])
    assert Decimal(offer["sale_amount"]) == Decimal(content["sales"][0]["sale_amount"])
    assert not any(key in offer for key in ["unit_cost", "account_id", "value", "reserved"])
    db.execute(
        text(
            "UPDATE inventory_positions SET reserved=quantity WHERE kind='sku' AND reference_id=:id"
        ),
        dict(id=row["id"]),
    )
    db.commit()
    assert client.get("/api/v1/promotions/home-offers").json() == []
    db.execute(
        text("UPDATE inventory_positions SET reserved=0 WHERE kind='sku' AND reference_id=:id"),
        dict(id=row["id"]),
    )
    db.execute(
        text("UPDATE catalog_products SET published=false WHERE id=:id"), dict(id=row["product_id"])
    )
    db.commit()
    assert client.get("/api/v1/promotions/home-offers").json() == []
    assert client.get("/api/v1/promotions/sales").json() == []
