import json
from uuid import uuid4

from pydantic import SecretStr
from sqlalchemy import text
from test_basket import basket as basket
from test_basket import migrate
from test_checkout_terms_postgres import review as review_terms
from test_checkout_terms_postgres import update_settings
from test_identity_otp_postgres import flow as flow
from test_sandbox_payments import checkout as checkout

from nilart.bootstrap.settings import settings


def review(client, body):
    response = review_terms(client, body)
    if response.status_code == 200 and "shipping_quote_required" in response.json()["issues"]:
        csrf = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
        quoted = client.post(
            "/api/v1/payments/shipping-quote",
            headers={"X-CSRF-Token": csrf},
            json={k: body[k] for k in ("basket_version", "address_id", "shipping_method_id")},
        )
        assert quoted.status_code == 200, quoted.text
        if quoted.json()["issue"]:

            class Result:
                status_code = 200
                text = quoted.text

                def json(self):
                    return dict(issues=[quoted.json()["issue"]])

            return Result()
        return review_terms(client, body)
    return response


def prepare(checkout, monkeypatch):
    client, db, body = checkout
    migrate(db, "0059_carrier_quotes.py")
    methods = db.scalar(text("SELECT content->'shipping_methods' FROM business_settings"))
    methods[0].update(
        carrier="tapin",
        base_amount="150000",
        per_kg_amount="0",
        padding_cm=1,
        packaging_weight_grams=100,
    )
    update_settings(db, shipping_methods=methods)
    db.execute(
        text(
            "UPDATE catalog_profile_revisions SET intent=jsonb_set(intent,'{content}',(intent->'content') || :fields::jsonb)".replace(
                ":fields::jsonb", "CAST(:fields AS jsonb)"
            )
        ),
        dict(
            fields=json.dumps(dict(length_cm=10, width_cm=5, height_cm=0.3, weight_estimated=True))
        ),
    )
    db.execute(
        text(
            "UPDATE customer_records SET data=data || '{\"phone\":\"9123456789\"}'::jsonb WHERE kind='address'"
        )
    )
    db.commit()
    monkeypatch.setattr(settings, "tapin_shop_id", str(uuid4()))
    monkeypatch.setattr(settings, "tapin_token", SecretStr("private-test-token"))
    body = {**body, "shipping_method_id": methods[0]["id"]}
    return client, db, body


def test_inactive_carrier_has_no_flat_price_fallback(checkout, monkeypatch):
    client, db, body = prepare(checkout, monkeypatch)
    monkeypatch.setattr(settings, "tapin_enabled", False)
    monkeypatch.setattr(
        "nilart.contexts.shipping.tapin.Tapin.call",
        lambda *_: (_ for _ in ()).throw(AssertionError("No outbound request allowed")),
    )
    response = review(client, body)
    assert response.status_code == 200, response.text
    value = response.json()
    assert value["shipping_amount"] is None and value["total"] is None and not value["ready"]
    assert value["issues"] == ["tapin_unavailable"]
    assert db.scalar(text("SELECT count(*) FROM checkout_carrier_quotes")) == 0


def test_carrier_rate_is_bound_cached_expires_and_uses_parcel_geometry(checkout, monkeypatch):
    client, db, body = prepare(checkout, monkeypatch)
    monkeypatch.setattr(settings, "tapin_enabled", True)
    calls = []
    price = [250000]
    monkeypatch.setattr("nilart.contexts.shipping.tapin.Tapin.shop", lambda *_: dict(active=True))

    def call(_self, path, payload):
        calls.append((path, payload))
        if path == "state/tree/":
            return [dict(code=1, title="Test", cities=[dict(code=2, title="Test")])]
        if path == "order/post/packing-box/":
            return dict(
                list=[
                    dict(pk=1, length=10, width=5, height=1),
                    dict(pk=2, length=15, width=10, height=5),
                    dict(pk=3, length=40, width=30, height=20),
                ]
            )
        assert path == "order/post/check-price/"
        assert payload["box_id"] == 2 and payload["products"][0]["price"] == 1001
        assert payload["products"][0]["count"] == 2 and payload["products"][0]["weight"] == 100
        assert payload["package_weight"] == 100 and payload["city_code"] == 2
        return dict(total_price=price[0], total_weight=300)

    monkeypatch.setattr("nilart.contexts.shipping.tapin.Tapin.call", call)
    first = review(client, body).json()
    assert first["ready"] and first["shipping_amount"] == "25000.00", first
    assert first["policy"]["carrier_quote"]["estimated"]
    assert first["policy"]["carrier_quote"]["parcel_cm"] == [15, 10, 5]
    second = review(client, body).json()
    assert second["fingerprint"] == first["fingerprint"] and len(calls) == 3
    db.execute(text("UPDATE checkout_carrier_quotes SET expires_at=now()-interval '1 second'"))
    db.commit()
    price[0] = 300000
    third = review(client, body).json()
    assert (
        third["shipping_amount"] == "30000.00"
        and third["fingerprint"] != first["fingerprint"]
        and len(calls) == 6
    )
    # An altered address cannot reuse the cached recipient-bound rate.
    db.execute(
        text(
            "UPDATE customer_records SET data=jsonb_set(data,'{city}','\"Unknown\"'::jsonb) WHERE kind='address'"
        )
    )
    db.commit()
    assert "shipping_destination_unavailable" in review(client, body).json()["issues"]


def test_notebook_request_pins_catalog_identity_and_rejects_other_products(checkout):
    client, db, _ = checkout
    migrate(db, "0011_commissions.py")
    sku = (
        db.execute(text("SELECT id,product_id FROM catalog_skus ORDER BY id LIMIT 1"))
        .mappings()
        .one()
    )
    db.execute(
        text(
            'INSERT INTO catalog_product_presentations(product_id,document,published) VALUES(:id,\'{"kind":"book"}\'::jsonb,true) ON CONFLICT(product_id) DO UPDATE SET document=excluded.document,published=true'
        ),
        dict(id=sku["product_id"]),
    )
    db.commit()
    csrf = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    client.headers["X-CSRF-Token"] = csrf
    body = dict(
        submission_id=str(uuid4()),
        idea="A custom cover with flowers",
        changes="",
        style="Digital cover",
        size="A5",
        execution="digital",
        notebook_sku_id=str(sku["id"]),
        notebook_design="custom_cover",
    )
    response = client.post("/api/v1/account/commissions", json=body)
    assert response.status_code == 200, response.text
    brief = db.scalar(text("SELECT brief FROM commission_requests"))
    assert (
        brief["notebook"]["sku_id"] == str(sku["id"])
        and brief["notebook"]["pricing"] == "awaiting_quote"
    )
    db.execute(text("UPDATE catalog_skus SET price_amount=9999 WHERE id=:id"), dict(id=sku["id"]))
    db.commit()
    assert client.post("/api/v1/account/commissions", json=body).json() == response.json()
    assert (
        client.post("/api/v1/account/commissions", json={**body, "idea": "Changed"}).status_code
        == 409
    )
    assert (
        client.post(
            "/api/v1/account/commissions",
            json={**body, "submission_id": str(uuid4()), "notebook_sku_id": str(uuid4())},
        ).status_code
        == 409
    )
    assert (
        client.post(
            "/api/v1/account/commissions", json={**body, "notebook_design": None}
        ).status_code
        == 422
    )
