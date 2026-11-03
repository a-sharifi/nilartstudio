import base64
import json
from uuid import uuid4

from sqlalchemy import text
from test_basket import basket as basket
from test_basket import migrate, mutate
from test_identity_otp_postgres import flow as flow
from test_order_stock_postgres import callback, staff
from test_sandbox_payments import checkout as checkout
from test_sandbox_payments import start


def review(client, body):
    csrf = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    return client.post(
        "/api/v1/payments/checkout-review",
        headers={"X-CSRF-Token": csrf},
        json={
            k: body[k]
            for k in [
                "basket_version",
                "address_id",
                "shipping_method_id",
                "discount_code",
                "discount_version",
            ]
            if k in body
        },
    )


def update_settings(db, **changes):
    current = db.scalar(text("SELECT content FROM business_settings"))
    db.execute(
        text("UPDATE business_settings SET version=version+1,content=CAST(:content AS jsonb)"),
        {"content": json.dumps({**current, **changes})},
    )
    db.commit()


def digital(db, sku):
    db.execute(
        text(
            "UPDATE catalog_profile_revisions SET intent=jsonb_set(intent,'{content}',CAST(:content AS jsonb)) WHERE kind='skus' AND entity_id=:id"
        ),
        {
            "id": sku,
            "content": json.dumps(
                dict(
                    specifications=[],
                    gallery=[],
                    delivery="digital",
                    weight_grams=None,
                    returnable=False,
                )
            ),
        },
    )
    db.commit()


def test_shipping_tax_review_and_accepted_policy_are_frozen(checkout):
    client, db, body = checkout
    methods = db.scalar(text("SELECT content->'shipping_methods' FROM business_settings"))
    methods[0].update(
        base_amount="10", per_kg_amount="25", maximum_weight_grams=500, provinces=["Test"]
    )
    update_settings(db, tax_percent="10", tax_basis="items_and_shipping", shipping_methods=methods)
    body = {**body, "shipping_method_id": methods[0]["id"]}
    r = review(client, body)
    assert r.status_code == 200, r.text
    terms = r.json()
    assert (
        terms["weight_grams"] == 200
        and terms["shipping_amount"] == "15.00"
        and terms["tax_amount"] == "21.52"
        and terms["total"] == "236.72"
    )
    # The sandbox gateway cannot represent fractional rials: use explicitly configured rounding.
    update_settings(db, tax_rounding="ceil_toman")
    terms = review(client, body).json()
    assert terms["tax_amount"] == "22.00"
    body = {**body, "expected_total": terms["total"], "checkout_fingerprint": terms["fingerprint"]}
    r = start(client, body)
    assert r.status_code == 200, r.text
    snap = db.scalar(text("SELECT snapshot FROM customer_orders"))
    assert snap["shipping_amount"] == "15.00" and snap["tax_amount"] == "22.00"
    assert snap["checkout_terms"]["weight_grams"] == 200 and snap["items"][0]["returnable"] is True
    update_settings(db, return_days=99, return_policy_en="Changed future policy")
    assert db.scalar(text("SELECT snapshot FROM customer_orders")) == snap
    assert (
        start(client, db.scalar(text("SELECT intent FROM sandbox_payments"))).json()["id"]
        == r.json()["id"]
    )


def test_changed_profiles_address_and_settings_require_new_customer_acceptance(checkout):
    client, db, body = checkout
    body = {**body, "shipping_method_id": "11111111-1111-4111-8111-111111111111"}
    accepted = review(client, body).json()
    db.execute(
        text(
            "UPDATE customer_records SET data=jsonb_set(data,'{street}','\"Changed address\"') WHERE id=:id"
        ),
        {"id": body["address_id"]},
    )
    db.commit()
    r = start(client, {**body, "checkout_fingerprint": accepted["fingerprint"]})
    assert r.status_code == 409 and r.json()["code"] == "checkout_review_required"
    assert db.scalar(text("SELECT count(*) FROM customer_orders")) == 0
    update_settings(db, tax_basis=None)
    assert review(client, body).json()["code"] == "checkout_business_configuration_missing"


def test_digital_only_needs_no_address_or_stock_and_releases_protected_file(checkout):
    client, db, body = checkout
    sku = db.scalar(
        text(
            "SELECT item_id FROM (SELECT (lines->0->'item'->>'item_id')::uuid AS item_id FROM shopping_baskets WHERE account_id IS NOT NULL) t"
        )
    )
    digital(db, sku)
    db.execute(text("DELETE FROM inventory_positions"))
    db.commit()
    body = {**body, "address_id": None, "shipping_method_id": None}
    reviewed = review(client, body)
    assert reviewed.status_code == 200, reviewed.text
    assert (
        reviewed.json()["requires_address"] is False
        and reviewed.json()["shipping_amount"] == "0.00"
    )
    p = start(client, body)
    assert p.status_code == 200, p.text
    assert p.json()["stock_managed"] is False
    assert callback(client, p.json()).status_code == 303
    assert db.scalar(text("SELECT state FROM order_stock_allocations")) == "committed"
    assert db.scalar(text("SELECT count(*) FROM inventory_positions")) == 0
    snap = db.scalar(text("SELECT snapshot FROM customer_orders"))
    line = snap["items"][0]
    assert line["delivery"] == "digital" and snap["address"] == ""
    for name in [
        "0011_commissions.py",
        "0024_commission_reviews.py",
        "0025_private_downloads.py",
        "0044_fulfillment.py",
    ]:
        migrate(db, name)
    staff(client, db)
    owner = db.scalar(text("SELECT id FROM identity_accounts LIMIT 1"))
    db.execute(
        text(
            "INSERT INTO identity_permission_overrides(account_id,permission,allowed) VALUES(:id,'orders.read_all',true),(:id,'fulfillment.manage',true) ON CONFLICT(account_id,permission) DO UPDATE SET allowed=true"
        ),
        {"id": owner},
    )
    db.commit()
    csrf = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    file = uuid4()
    payload = dict(
        order_id=p.json()["order_id"],
        line_id=line["id"],
        file_name="licensed.pdf",
        description="Personal licensed edition",
        content_base64=base64.b64encode(b"licensed sandbox file").decode(),
    )
    r = client.put(f"/api/v1/admin/downloads/{file}", json=payload, headers={"X-CSRF-Token": csrf})
    assert r.status_code == 200, r.text
    version = db.scalar(text("SELECT version FROM customer_orders"))
    assert (
        client.put(
            f"/api/v1/admin/downloads/{file}", json=payload, headers={"X-CSRF-Token": csrf}
        ).status_code
        == 200
    )
    assert db.scalar(text("SELECT version FROM customer_orders")) == version
    assert db.scalar(text("SELECT state->>'fulfillment' FROM customer_orders")) == "delivered"
    assert (
        client.get(f"/api/v1/account/downloads/{file}/content").content == b"licensed sandbox file"
    )


def test_mixed_order_reserves_and_weighs_only_physical_components(checkout):
    client, db, body = checkout
    digital_sku = db.scalar(
        text("SELECT id FROM catalog_skus WHERE id<>:id LIMIT 1"),
        {
            "id": db.scalar(
                text(
                    "SELECT (lines->0->'item'->>'item_id')::uuid FROM shopping_baskets WHERE account_id IS NOT NULL"
                )
            )
        },
    )
    digital(db, digital_sku)
    csrf = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    added = mutate(
        client, 1, csrf, item={"kind": "product", "item_id": str(digital_sku), "quantity": 1}
    )
    assert added.status_code == 200
    body = {
        **body,
        "basket_version": 2,
        "shipping_method_id": "11111111-1111-4111-8111-111111111111",
    }
    terms = review(client, body).json()
    assert terms["weight_grams"] == 200 and terms["requires_address"]
    body["expected_total"] = terms["total"]
    p = start(client, body)
    assert p.status_code == 200, p.text
    positions = list(db.scalars(text("SELECT reserved FROM inventory_positions WHERE reserved>0")))
    assert positions == [2]
    snap = db.scalar(text("SELECT snapshot FROM customer_orders"))
    assert {line["delivery"] for line in snap["items"]} == {"physical", "digital"}

    from datetime import UTC, datetime

    from test_fulfillment_postgres import cmd, dispatch, packed

    from nilart.contexts.orders.domain import OrderSnapshot, OrderState, return_allowed

    for name in [
        "0032_suppliers.py",
        "0038_purchases.py",
        "0039_production.py",
        "0044_fulfillment.py",
    ]:
        migrate(db, name)
    payment = p.json()
    assert callback(client, payment).status_code == 303
    staff(client, db)
    physical = next(line for line in snap["items"] if line["delivery"] == "physical")
    parcel = packed(client, payment["order_id"], physical["id"], physical["quantity"])
    assert dispatch(client, parcel, payment["order_id"]).status_code == 200
    assert cmd(client, parcel, payment["order_id"], 5, "deliver").status_code == 200
    state = OrderState.model_validate(db.scalar(text("SELECT state FROM customer_orders")))
    assert state.fulfillment == "partial"
    assert return_allowed(OrderSnapshot.model_validate(snap), state, datetime.now(UTC))


def test_dispatch_uses_accepted_policy_after_settings_change(checkout):
    from test_fulfillment_postgres import dispatch, packed, setup

    client, db, order, line = setup(checkout)
    accepted = db.scalar(text("SELECT snapshot->'checkout_terms'->'policy' FROM customer_orders"))
    update_settings(db, return_days=99, return_policy_en="Future orders only")
    shipment = packed(client, order, line, 2)
    r = dispatch(client, shipment, order)
    assert r.status_code == 200, r.text
    frozen = db.scalar(text("SELECT state->'policy' FROM fulfillment_shipments"))
    assert frozen["return_days"] == accepted["return_days"] == 7
    assert frozen["return_policy_en"] == accepted["return_policy_en"]


def test_return_tax_is_proportional_and_shipping_is_not_refunded_after_dispatch(checkout):
    from test_refunds_postgres import command, preview, selection, setup_refund

    client, db, body = checkout
    update_settings(db, tax_percent="10", tax_rounding="ceil_toman")
    body["expected_total"] = "221.20"
    client, db, request, shipment, line = setup_refund(checkout)
    bad = preview(client, {**selection(request, line), "include_shipping": True})
    assert bad.status_code == 409 and bad.json()["code"] == "refund_shipping_not_refundable"
    first = preview(client, {**selection(request, line), "include_tax": True}).json()
    assert first["amount"] == "110.60" and first["tax_amount"] == "10.50"
    r = command(client, first)
    assert r.status_code == 200, r.text
    second = preview(
        client, {**selection(request, line), "include_tax": True, "close_request": True}
    ).json()
    assert second["amount"] == "110.60" and second["tax_amount"] == "10.50"
    r = command(client, second)
    assert r.status_code == 200, r.text
    assert r.json()["result"]["payment_status"] == "refunded"
    assert command(client, second).status_code == 409


def test_print_artwork_and_standalone_sku_share_authoritative_stock(checkout):
    from test_artwork_authoring_postgres import save as artwork_save
    from test_media_library_postgres import save as media_save

    client, db, body = checkout
    for f in ["0037_media_library.py", "0054_artwork_authoring.py"]:
        migrate(db, f)
    owner = db.scalar(text("SELECT id FROM identity_accounts LIMIT 1"))
    db.execute(
        text(
            "INSERT INTO identity_account_roles(account_id,role) VALUES(:id,'admin') ON CONFLICT DO NOTHING"
        ),
        {"id": owner},
    )
    db.commit()
    token = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    client.headers["X-CSRF-Token"] = token
    asset = uuid4()
    image = media_save(client, asset, action="publish").json()
    sku = db.scalar(
        text(
            "SELECT (lines->0->'item'->>'item_id')::uuid FROM shopping_baskets WHERE account_id IS NOT NULL"
        )
    )
    art = uuid4()
    content = dict(
        slug="checkout-print",
        title_fa="چاپ اثر",
        title_en="Artwork print",
        description_fa="",
        description_en="",
        artist_fa="هنرمند",
        artist_en="Artist",
        medium="oil",
        style="landscape",
        width_cm=20,
        height_cm=30,
        edition="print",
        linked_sku_id=str(sku),
        price_amount=None,
        weight_grams=None,
        returnable=True,
        license_fa="",
        license_en="",
        image_credit="Studio",
        gallery=[
            dict(
                asset_id=str(asset), revision_id=image["revision_id"], alt_fa="چاپ", alt_en="Print"
            )
        ],
    )
    r = artwork_save(client, art, content, action="publish")
    assert r.status_code == 200, r.text
    added = mutate(client, 1, token, item={"kind": "artwork", "item_id": str(art), "quantity": 1})
    assert added.status_code == 200, added.text
    p = start(client, {**body, "basket_version": 2, "expected_total": "300.30"})
    assert p.status_code == 200, p.text
    snap = db.scalar(text("SELECT snapshot FROM customer_orders"))
    part = next(line for line in snap["items"] if line["sku"] == str(art))["stock_components"][0]
    assert part["kind"] == "sku" and part["reference_id"] == str(sku)
    assert list(db.scalars(text("SELECT reserved FROM inventory_positions WHERE reserved>0"))) == [
        3
    ]


def test_mixed_bundle_allocates_digital_value_but_reserves_only_aggregated_physical_demand(
    checkout,
):
    client, db, body = checkout
    sku = db.scalar(
        text(
            "SELECT (lines->0->'item'->>'item_id')::uuid FROM shopping_baskets WHERE account_id IS NOT NULL"
        )
    )
    alternative = db.scalar(
        text(
            "SELECT id FROM catalog_skus WHERE product_id=(SELECT product_id FROM catalog_skus WHERE id=:id) AND id<>:id"
        ),
        {"id": sku},
    )
    digital(db, alternative)
    bundle = db.scalar(text("SELECT id FROM catalog_bundles"))
    db.execute(
        text(
            "INSERT INTO catalog_bundle_components(bundle_id,sku_id,quantity) VALUES(:bundle,:id,1)"
        ),
        {"bundle": bundle, "id": alternative},
    )
    db.commit()
    token = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    added = mutate(
        client,
        1,
        token,
        item={
            "kind": "bundle",
            "item_id": str(bundle),
            "quantity": 1,
            "choices": {str(sku): str(sku)},
        },
    )
    assert added.status_code == 200, added.text
    selected = {
        **body,
        "basket_version": 2,
        "shipping_method_id": "11111111-1111-4111-8111-111111111111",
        "expected_total": added.json()["totals"]["total"],
    }
    reviewed = review(client, selected).json()
    assert reviewed["weight_grams"] == 400
    p = start(client, selected)
    assert p.status_code == 200, p.text
    assert list(db.scalars(text("SELECT reserved FROM inventory_positions WHERE reserved>0"))) == [
        4
    ]
    snap = db.scalar(text("SELECT snapshot FROM customer_orders"))
    line = next(item for item in snap["items"] if item["sku"] == str(bundle))
    assert line["delivery"] == "physical" and {c["delivery"] for c in line["stock_components"]} == {
        "physical",
        "digital",
    }
    from decimal import Decimal

    assert sum(Decimal(c["paid_amount"]) for c in line["stock_components"]) == Decimal(
        line["unit_amount"]
    )


def test_returned_items_do_not_refund_tax_allocated_to_nonrefundable_shipping(checkout):
    from test_refunds_postgres import command, preview, selection, setup_refund

    client, db, body = checkout
    methods = db.scalar(text("SELECT content->'shipping_methods' FROM business_settings"))
    methods[0]["base_amount"] = "10"
    update_settings(
        db,
        tax_percent="10",
        tax_basis="items_and_shipping",
        tax_rounding="ceil_toman",
        shipping_methods=methods,
    )
    body["expected_total"] = "232.20"
    client, db, request, shipment, line = setup_refund(checkout)
    first = preview(client, {**selection(request, line), "include_tax": True}).json()
    assert first["tax_amount"] == "10.48"
    assert command(client, first).status_code == 200
    second = preview(
        client, {**selection(request, line), "include_tax": True, "close_request": True}
    ).json()
    assert second["tax_amount"] == "10.47"
    r = command(client, second)
    assert r.status_code == 200, r.text
    assert r.json()["result"]["payment_status"] == "partially_refunded"
    assert r.json()["result"]["refunded_amount"] == "221.15"


def test_inclusive_tax_and_free_shipping_threshold_do_not_add_tax_twice(checkout):
    client, db, body = checkout
    methods = db.scalar(text("SELECT content->'shipping_methods' FROM business_settings"))
    methods[0].update(base_amount="150000", per_kg_amount="0", free_above_amount="2000000")
    update_settings(db, tax_included=True, tax_percent="10", tax_basis="items", shipping_methods=methods)
    result = review(client, {**body, "shipping_method_id": methods[0]["id"]})
    assert result.status_code == 200, result.text
    terms = result.json()
    assert terms["subtotal"] == "200.20"
    assert terms["shipping_amount"] == "150000.00"
    assert terms["tax_amount"] == "0.00"
    assert terms["policy"]["included_tax_amount"] == "18.20"
    assert terms["total"] == "150200.20"
    # Boundary is strictly above the discounted item subtotal, excluding shipping.
    methods[0]["free_above_amount"] = "200.20"
    update_settings(db, shipping_methods=methods)
    assert review(client, {**body, "shipping_method_id": methods[0]["id"]}).json()["shipping_amount"] == "150000.00"
    methods[0]["free_above_amount"] = "200.19"
    update_settings(db, shipping_methods=methods)
    terms = review(client, {**body, "shipping_method_id": methods[0]["id"]}).json()
    assert terms["shipping_amount"] == "0.00" and terms["total"] == "200.20"
    result = start(client, {**body, "shipping_method_id": methods[0]["id"], "expected_total":terms["total"], "checkout_fingerprint":terms["fingerprint"]})
    assert result.status_code == 200, result.text
    saved = db.scalar(text("SELECT snapshot FROM customer_orders WHERE id=:id"), {"id":result.json()["order_id"]})
    assert saved["tax_amount"] == "0.00" and saved["checkout_terms"]["policy"]["tax_included"]
    assert saved["total_amount"] == "200.20"


def test_flat_shipping_stock_review_does_not_require_invented_weights(checkout):
    client, db, body = checkout
    methods = db.scalar(text("SELECT content->'shipping_methods' FROM business_settings"))
    methods[0].update(per_kg_amount="0", maximum_weight_grams=None)
    update_settings(db, shipping_methods=methods)
    db.execute(text("UPDATE catalog_profile_revisions SET intent=jsonb_set(intent,'{content,weight_grams}','null'::jsonb) WHERE kind='skus'"))
    db.commit()
    stock = client.get(f"/api/v1/payments/stock-review?basket_version={body['basket_version']}")
    assert stock.status_code == 200 and stock.json()["ready"], stock.text
    assert review(client, {**body, "shipping_method_id": methods[0]["id"]}).json()["ready"]
    methods[0]["per_kg_amount"] = "100"
    update_settings(db, shipping_methods=methods)
    assert client.get(f"/api/v1/payments/stock-review?basket_version={body['basket_version']}").status_code == 409
