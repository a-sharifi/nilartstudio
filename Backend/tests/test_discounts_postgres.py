import json
from datetime import date
from uuid import uuid4

import pytest
from sqlalchemy import text
from test_basket import basket as basket
from test_identity_otp_postgres import flow as flow
from test_sandbox_payments import checkout as checkout
from test_sandbox_payments import start

from nilart.contexts.discounts.engine import DiscountError, allocate, evaluate
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.payments.gateway import GatewayRejected, GatewayUnknown, ZarinpalSandbox


def prepare(checkout):
    client, db, body = checkout
    owner = db.scalar(text("SELECT id FROM identity_accounts"))
    SqlAccountManagement(db).bootstrap(str(owner), "Isolated discount admin")
    db.commit()
    return client, db, body, owner


def rule(**changes):
    return {
        "kind": "percent",
        "code": "SAVE10",
        "title_fa": "تخفیف آزمایش",
        "title_en": "Test discount",
        "value": "10",
        "minimum": "0",
        "maximum": None,
        "valid_from": "2020-01-01",
        "valid_to": "2099-12-31",
        "total_limit": None,
        "customer_limit": None,
        "product_ids": [],
        "collection_ids": [],
        "category_ids": [],
        "customer_phones": [],
        "allow_bundle_stacking": False,
        "active": True,
        **changes,
    }


def save(client, id=None, key=None, version=0, content=None, reason="Reviewed discount rule"):
    csrf = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    return client.put(
        f"/api/v1/admin/discounts/rules/{id or uuid4()}/versions/{key or uuid4()}",
        headers={"X-CSRF-Token": csrf},
        json={"expected_version": version, "content": content or rule(), "reason": reason},
    )


def quote(client, code="SAVE10"):
    csrf = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    return client.post(
        "/api/v1/discounts/quote",
        headers={"X-CSRF-Token": csrf},
        json={"code": code, "basket_version": 1},
    )


def test_versioned_rules_scopes_replay_and_validation(checkout):
    client, db, body, owner = prepare(checkout)
    id, key = uuid4(), uuid4()
    first = save(client, id, key)
    assert first.status_code == 200, first.text
    assert save(client, id, key).json() == first.json()
    assert save(client, id, key, reason="Other intent").status_code == 409
    assert save(client, id, version=0).status_code == 409
    assert save(client, content=rule()).status_code == 409
    assert (
        save(
            client, id, version=1, content=rule(active=False, kind="fixed", value="25")
        ).status_code
        == 200
    )
    assert save(client, id, key).json() == first.json()
    root = f"/api/v1/admin/discounts/rules/{id}"
    assert client.get(root + "/versions?limit=1").json()["next_before_version"] == 2
    assert client.get(root + "/versions?before=2").json()["items"] == [first.json()]
    assert client.get(f"/api/v1/admin/discounts/rules/{uuid4()}/versions/{key}").status_code == 404
    assert client.get("/api/v1/admin/discounts/rules?active=false&q=SAVE").json()["items"][0][
        "id"
    ] == str(id)
    assert client.get("/api/v1/admin/discounts/rules?q=%").json()["items"] == []
    assert (
        db.scalar(text("SELECT count(*) FROM identity_audits WHERE action='discount.rule_saved'"))
        == 2
    )
    assert (
        db.scalar(text("SELECT count(*) FROM outbox_events WHERE event_type='discount.rule_saved'"))
        == 2
    )


@pytest.mark.parametrize(
    "changes",
    [
        {"value": "0"},
        {"value": "100.000001"},
        {"value": "NaN"},
        {"kind": "fixed", "value": "1.5"},
        {"valid_to": "2010-01-01"},
        {"total_limit": 0},
        {"customer_limit": True},
        {"customer_phones": ["invalid"]},
        {"product_ids": [str(uuid4())]},
        {"active": 1},
    ],
)
def test_invalid_rules_never_write(checkout, changes):
    client, db, body, owner = prepare(checkout)
    assert save(client, content=rule(**changes)).status_code == 422
    assert db.scalar(text("SELECT count(*) FROM discount_rules")) == 0


def test_quote_checkout_allocation_reservation_and_callback_are_idempotent(checkout):
    client, db, body, owner = prepare(checkout)
    saved = save(client, content=rule(total_limit=1, customer_limit=1)).json()
    quoted = quote(client)
    assert quoted.status_code == 200, quoted.text
    assert quoted.json()["amount"] == "20.00" and quoted.json()["total"] == "180.2"
    assert sum(int(v) for v in quoted.json()["allocations"].values()) == 2000
    assert db.scalar(text("SELECT count(*) FROM discount_usage")) == 0
    payload = {**body, "expected_total": "180.2", "discount_code": "SAVE10", "discount_version": 1}
    assert start(client, {**payload, "discount_version": 99}).status_code == 409
    payment = start(client, payload)
    assert payment.status_code == 200, payment.text
    data = payment.json()
    assert data["amount_rial"] == "1802"
    assert start(client, payload).json()["id"] == data["id"]
    assert db.scalar(text("SELECT count(*) FROM discount_usage")) == 1
    assert db.scalar(text("SELECT state FROM discount_usage")) == "reserved"
    assert quote(client).status_code == 409
    snapshot = db.scalar(text("SELECT snapshot FROM customer_orders"))
    assert snapshot["items"][0]["discount_amount"] == "20"
    assert snapshot["total_amount"] == "180.20"
    assert (
        save(client, saved["discount_id"], version=1, content=rule(active=False)).status_code == 200
    )
    callback = (
        f"/api/v1/payments/sandbox/callback/{data['id']}?Authority={'A' + '1' * 35}&Status=OK"
    )
    assert client.get(callback, follow_redirects=False).status_code == 303
    assert client.get(callback, follow_redirects=False).status_code == 303
    assert db.scalar(text("SELECT state FROM discount_usage")) == "redeemed"
    assert db.scalar(text("SELECT snapshot FROM discount_usage"))["active"] is True
    usage = client.get(f"/api/v1/admin/discounts/rules/{saved['discount_id']}/usage").json()
    assert usage == {"redeemed": 1, "reserved": 0}


@pytest.mark.parametrize("outcome", ["rejected", "unknown"])
def test_gateway_failure_does_not_redeem_code(checkout, monkeypatch, outcome):
    client, db, body, owner = prepare(checkout)
    save(client)

    def fail(*args):
        raise GatewayRejected() if outcome == "rejected" else GatewayUnknown()

    monkeypatch.setattr(ZarinpalSandbox, "request", fail)
    response = start(
        client,
        {**body, "expected_total": "180.2", "discount_code": "SAVE10", "discount_version": 1},
    )
    assert response.status_code == 200, response.text
    assert db.scalar(text("SELECT state FROM discount_usage")) == (
        "released" if outcome == "rejected" else "reserved"
    )


def test_exact_engine_minimum_cap_bundle_stacking_and_scopes(checkout):
    client, db, body, owner = prepare(checkout)
    saved = save(client).json()
    row = {"id": saved["discount_id"], "version": 1, "content": saved["content"]}
    sku = str(db.scalar(text("SELECT id FROM catalog_skus ORDER BY code LIMIT 1")))
    line = {
        "id": "b",
        "issue": None,
        "item": {"kind": "bundle", "quantity": 1},
        "quote": {
            "unit": "90",
            "base": "100",
            "saving": "10",
            "parts": [{"sku_id": sku, "unit": "100", "quantity": 1}],
        },
    }
    product = {
        "id": "a",
        "issue": None,
        "item": {"kind": "product", "item_id": sku, "quantity": 1},
        "quote": {"unit": "100.99"},
    }
    current = {"version": 1, "lines": [line, product], "totals": {"total": "190.99"}}
    assert evaluate(db, row, current, owner, "+989123456789")["amount"] == "10.00"
    row["content"] = rule(allow_bundle_stacking=True, maximum="15")
    result = evaluate(db, row, current, owner, "+989123456789")
    assert result["amount"] == "15.00" and sum(result["allocations"].values()) == 1500
    assert result["allocations"]["a"] + result["allocations"]["b"] == 1500
    row["content"] = rule(kind="fixed", value="99999", allow_bundle_stacking=True)
    assert evaluate(db, row, current, owner, "+989123456789")["amount"] == "190.00"
    row["content"] = rule(minimum="101")
    with pytest.raises(DiscountError, match="minimum"):
        evaluate(db, row, current, owner, "+989123456789")
    row["content"] = rule(customer_phones=["09120000000"])
    with pytest.raises(DiscountError, match="customer"):
        evaluate(db, row, current, owner, "+989123456789")
    row["content"] = rule(valid_to="2020-01-02")
    with pytest.raises(DiscountError, match="valid"):
        evaluate(db, row, current, owner, "+989123456789", date(2026, 10, 18))
    other = db.scalar(
        text(
            "SELECT product_id FROM catalog_skus WHERE product_id<>(SELECT product_id FROM catalog_skus WHERE id=:id) LIMIT 1"
        ),
        {"id": sku},
    )
    row["content"] = rule(product_ids=[str(other)])
    with pytest.raises(DiscountError, match="minimum"):
        evaluate(db, row, current, owner, "+989123456789")


def test_discount_write_rollback_and_permissions(checkout, monkeypatch):
    client, db, body = checkout
    assert client.get("/api/v1/admin/discounts/rules").status_code == 403
    assert save(client).status_code == 403
    client, db, body, owner = prepare(checkout)

    def fail(*args, **kwargs):
        raise RuntimeError("isolated outbox failure")

    monkeypatch.setattr("nilart.contexts.discounts.router.enqueue", fail)
    with pytest.raises(RuntimeError):
        save(client)
    assert db.scalar(text("SELECT count(*) FROM discount_rules")) == 0
    assert db.scalar(text("SELECT count(*) FROM discount_rule_versions")) == 0
    assert (
        db.scalar(text("SELECT count(*) FROM identity_audits WHERE action='discount.rule_saved'"))
        == 0
    )


def test_allocation_conserves_amount_and_stable_ties():
    for weights in [{"a": 1, "b": 1, "c": 1}, {"z": 7, "a": 10, "b": 3}]:
        for value in range(sum(weights.values()) + 1):
            result = allocate(value, weights)
            assert sum(result.values()) == value
            assert all(0 <= result[key] <= weights[key] for key in weights)
            assert allocate(value, dict(reversed(list(weights.items())))) == result


def test_zero_payable_order_never_calls_gateway(checkout, monkeypatch):
    client, db, body, owner = prepare(checkout)
    # Whole-toman prices produce an exactly zero payable amount with 100% off.
    db.execute(text("UPDATE catalog_skus SET price_amount=100 WHERE code='SKU'"))
    # Use actual SKU referenced by this basket, independent of fixture naming.
    current = db.scalar(
        text("SELECT lines FROM shopping_baskets WHERE account_id=:id"), {"id": owner}
    )
    db.execute(
        text("UPDATE catalog_skus SET price_amount=100 WHERE id=:id"),
        {"id": current[0]["item"]["item_id"]},
    )
    current[0]["accepted_unit"] = "100"
    db.execute(
        text("UPDATE shopping_baskets SET lines=CAST(:lines AS jsonb) WHERE account_id=:id"),
        {"id": owner, "lines": json.dumps(current)},
    )
    db.commit()
    save(client, content=rule(value="100"))

    def forbidden(*args):
        raise AssertionError("Zero payable must not call gateway")

    monkeypatch.setattr(ZarinpalSandbox, "request", forbidden)
    payment = start(
        client, {**body, "discount_code": "SAVE10", "discount_version": 1, "expected_total": "0"}
    )
    assert payment.status_code == 200, payment.text
    assert (
        payment.json()["status"] == "paid"
        and payment.json()["amount_rial"] == "0"
        and payment.json()["gateway_url"] is None
    )
    assert db.scalar(text("SELECT state FROM discount_usage")) == "redeemed"
    assert (
        db.scalar(text("SELECT reason FROM stock_reservation_events WHERE action='commit'"))
        == "Zero-payment checkout completed"
    )
    snapshot = db.scalar(text("SELECT snapshot FROM customer_orders"))
    assert (
        snapshot["total_amount"] in ("0", "0.00")
        and snapshot["receipt"]["paid_amount"] == snapshot["total_amount"]
    )


def test_changed_payment_intents_cannot_reuse_a_coupon_charge(checkout):
    client, db, body, owner = prepare(checkout)
    save(client)
    payload = {**body, "discount_code": "SAVE10", "discount_version": 1, "expected_total": "180.2"}
    assert start(client, payload).status_code == 200
    assert start(client, {**payload, "expected_total": "1"}).status_code == 409
    assert start(client, {**body, "command_id": str(uuid4())}).status_code == 409
    assert db.scalar(text("SELECT count(*) FROM sandbox_payments")) == 1
    assert db.scalar(text("SELECT count(*) FROM discount_usage")) == 1


def test_initial_checkout_event_failure_rolls_back_order_payment_and_usage(checkout, monkeypatch):
    client, db, body, owner = prepare(checkout)
    save(client)

    def fail(*args, **kwargs):
        raise RuntimeError("isolated checkout outbox failure")

    monkeypatch.setattr("nilart.contexts.payments.router.enqueue", fail)
    with pytest.raises(RuntimeError):
        start(
            client,
            {**body, "discount_code": "SAVE10", "discount_version": 1, "expected_total": "180.2"},
        )
    for table in ["discount_usage", "customer_orders", "sandbox_payments"]:
        assert db.scalar(text(f"SELECT count(*) FROM {table}")) == 0


def test_discount_and_sandbox_events_are_validated_and_deduplicated(checkout):
    from nilart.shared.outbox import consume_event

    client, db, body, owner = prepare(checkout)
    save(client)
    payment = start(
        client,
        {**body, "expected_total": "180.2", "discount_code": "SAVE10", "discount_version": 1},
    )
    assert payment.status_code == 200
    for row in db.execute(text("SELECT id,event_type,payload FROM outbox_events")).mappings():
        envelope = {
            "id": str(row["id"]),
            "event_type": row["event_type"],
            "payload": row["payload"],
        }
        assert consume_event(db, envelope)
        assert not consume_event(db, envelope)
    with pytest.raises(ValueError):
        consume_event(
            db,
            {
                "id": str(uuid4()),
                "event_type": "sandbox.payment.paid",
                "payload": {
                    "payment_id": str(uuid4()),
                    "order_id": str(uuid4()),
                    "account_id": str(owner),
                    "amount_rial": "1e3",
                    "sandbox": True,
                    "status": "paid",
                },
            },
        )


@pytest.mark.parametrize("limited_stock", [False, True])
def test_last_discount_use_has_one_concurrent_checkout_winner(monkeypatch, limited_stock):
    import importlib.util
    import os
    from concurrent.futures import ThreadPoolExecutor
    from pathlib import Path
    from threading import Barrier
    from types import SimpleNamespace

    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    from fastapi import HTTPException, Request, Response
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from nilart.contexts.payments.router import PaymentStart
    from nilart.contexts.payments.router import checkout as pay
    from nilart.shared.outbox import metadata

    url = os.environ.get("NILART_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Isolated PostgreSQL required")
    engine = create_engine(url)
    schema = "discount_concurrency_" + uuid4().hex
    owners = [uuid4(), uuid4()]
    addresses = {str(owner): uuid4() for owner in owners}
    modules = []
    for filename in [
        "0031_sandbox_payments.py",
        "0033_discounts.py",
        "0034_business_settings.py",
        "0035_stock_ledger.py",
        "0043_order_stock_reservations.py",
        "0053_catalog_profiles.py",
    ]:
        path = Path(__file__).parents[1] / "migrations/versions" / filename
        spec = importlib.util.spec_from_file_location(path.stem, path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        modules.append(module)
    monkeypatch.setattr(
        "nilart.contexts.payments.router.actor",
        lambda request, db: SimpleNamespace(id=request.headers["x-test-account"]),
    )
    monkeypatch.setattr(
        "nilart.contexts.payments.router.owned",
        lambda request, db, account, lock: dict(
            db.execute(
                text("SELECT * FROM shopping_baskets WHERE account_id=:id"), {"id": account.id}
            )
            .mappings()
            .one()
        ),
    )
    line = {
        "id": uuid4().hex,
        "issue": None,
        "item": {"kind": "product", "item_id": str(uuid4()), "quantity": 1},
        "quote": {"name": ["آزمایش", "Test"], "unit": "200"},
    }
    monkeypatch.setattr(
        "nilart.contexts.payments.router.output",
        lambda *args: {"version": 1, "lines": [line], "totals": {"total": "200"}},
    )
    monkeypatch.setattr(
        "nilart.contexts.payments.router.gateway",
        lambda: SimpleNamespace(request=lambda *args: "A" + uuid4().hex),
    )
    try:
        with engine.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            metadata.create_all(connection)
            connection.execute(
                text("CREATE TABLE identity_accounts(id uuid PRIMARY KEY,phone text)")
            )
            connection.execute(
                text(
                    "CREATE TABLE shopping_baskets(id uuid PRIMARY KEY,account_id uuid,version int,lines jsonb,updated_at timestamptz DEFAULT now())"
                )
            )
            connection.execute(
                text(
                    "CREATE TABLE customer_records(id uuid PRIMARY KEY,account_id uuid,kind text,data jsonb)"
                )
            )
            connection.execute(
                text(
                    "CREATE TABLE customer_orders(id uuid PRIMARY KEY,account_id uuid,source_id uuid,snapshot jsonb,state jsonb,version int DEFAULT 1,updated_at timestamptz DEFAULT now())"
                )
            )
            with Operations.context(MigrationContext.configure(connection)):
                for module in modules:
                    module.upgrade()
            from uuid import uuid5

            from nilart.contexts.inventory.router import NAMESPACE

            connection.execute(
                text(
                    "INSERT INTO business_settings(key,version,content) VALUES('business',1,CAST(:content AS jsonb))"
                ),
                {
                    "content": json.dumps(
                        {
                            "reservation_minutes": 15,
                            "tax_percent": "0",
                            "tax_basis": "items",
                            "tax_rounding": "half_up_cent",
                            "shipping_calculation": "actual_weight",
                            "shipping_rounding": "half_up_cent",
                            "refund_policy": "items_and_proportional_tax_shipping_if_unshipped",
                            "return_days": 7,
                            "return_policy_fa": "سیاست",
                            "return_policy_en": "Policy",
                            "shipping_methods": [
                                {
                                    "id": "11111111-1111-4111-8111-111111111111",
                                    "title_fa": "پست",
                                    "title_en": "Post",
                                    "base_amount": "0",
                                    "per_kg_amount": "0",
                                    "active": True,
                                }
                            ],
                        }
                    )
                },
            )
            connection.execute(
                text(
                    "INSERT INTO inventory_positions(id,kind,reference_id,code,title_fa,title_en,unit,quantity,reserved,value,version) VALUES(:id,'sku',:sku,'TEST','آزمایش','Test','piece',:quantity,0,100,1)"
                ),
                {
                    "id": uuid5(NAMESPACE, f"sku:{line['item']['item_id']}"),
                    "sku": line["item"]["item_id"],
                    "quantity": 1 if limited_stock else 100,
                },
            )
            for owner in owners:
                connection.execute(
                    text("INSERT INTO identity_accounts VALUES(:id,'+989123456789')"), {"id": owner}
                )
                connection.execute(
                    text(
                        "INSERT INTO shopping_baskets(id,account_id,version,lines) VALUES(:id,:owner,1,'[]')"
                    ),
                    {"id": uuid4(), "owner": owner},
                )
                connection.execute(
                    text(
                        "INSERT INTO customer_records VALUES(:id,:owner,'address',CAST(:data AS jsonb))"
                    ),
                    {
                        "id": addresses[str(owner)],
                        "owner": owner,
                        "data": json.dumps(
                            {
                                "name": "Test",
                                "province": "Test",
                                "city": "Test",
                                "street": "Test",
                                "postal": "1234567890",
                            }
                        ),
                    },
                )
            connection.execute(
                text(
                    "INSERT INTO discount_rules(id,kind,code,version,content) VALUES(:id,'percent','SAVE10',1,CAST(:data AS jsonb))"
                ),
                {"id": uuid4(), "data": json.dumps(rule(total_limit=None if limited_stock else 1))},
            )
            profile = {
                "gallery": [],
                "specifications": [],
                "delivery": "physical",
                "weight_grams": 100,
                "returnable": True,
            }
            revision = uuid4()
            connection.execute(
                text(
                    "INSERT INTO catalog_profiles(kind,entity_id,version,content) VALUES('skus',:id,1,CAST(:content AS jsonb))"
                ),
                {"id": line["item"]["item_id"], "content": json.dumps(profile)},
            )
            connection.execute(
                text(
                    "INSERT INTO catalog_profile_revisions(id,kind,entity_id,actor_id,version,intent,result) VALUES(:key,'skus',:id,:actor,1,CAST(:intent AS jsonb),'{}'::jsonb)"
                ),
                {
                    "key": revision,
                    "id": line["item"]["item_id"],
                    "actor": owners[0],
                    "intent": json.dumps({"content": profile}),
                },
            )
            connection.execute(
                text(
                    "UPDATE catalog_profiles SET published_revision=:key WHERE kind='skus' AND entity_id=:id"
                ),
                {"key": revision, "id": line["item"]["item_id"]},
            )
        barrier = Barrier(2)

        def submit(owner):
            request = Request(
                {
                    "type": "http",
                    "headers": [(b"x-test-account", str(owner).encode())],
                    "method": "POST",
                    "path": "/",
                }
            )
            with engine.connect() as connection:
                connection.execute(text(f'SET search_path TO "{schema}"'))
                connection.commit()
                with Session(bind=connection) as db:
                    from nilart.contexts.inventory.reservations import review
                    from nilart.contexts.payments.checkout_review import (
                        build,
                        Selection,
                        line_terms,
                    )

                    current = {"version": 1, "lines": [line], "totals": {"total": "200"}}
                    accepted, _, _ = build(
                        db,
                        {"version": 1},
                        current,
                        SimpleNamespace(id=str(owner)),
                        Selection(
                            basket_version=1,
                            address_id=addresses[str(owner)],
                            shipping_method_id="11111111-1111-4111-8111-111111111111",
                            discount_code="SAVE10",
                            discount_version=1,
                        ),
                    )
                    reviewed = review(db, {"version": 1}, current, terms=[line_terms(db, line)])
                    db.commit()
                    barrier.wait(timeout=10)
                    try:
                        pay(
                            PaymentStart(
                                command_id=uuid4(),
                                basket_version=1,
                                address_id=addresses[str(owner)],
                                sandbox_confirmed=True,
                                expected_total="180",
                                stock_fingerprint=reviewed["fingerprint"],
                                checkout_fingerprint=accepted["fingerprint"],
                                shipping_method_id="11111111-1111-4111-8111-111111111111",
                                discount_code="SAVE10",
                                discount_version=1,
                            ),
                            request,
                            Response(),
                            db,
                        )
                        return 200
                    except HTTPException as error:
                        return error.status_code

        with ThreadPoolExecutor(max_workers=2) as pool:
            assert sorted(pool.map(submit, owners)) == [200, 409]
        with engine.begin() as connection:
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            assert connection.scalar(text("SELECT count(*) FROM discount_usage")) == 1
            assert connection.scalar(text("SELECT count(*) FROM customer_orders")) == 1
            assert connection.scalar(text("SELECT count(*) FROM sandbox_payments")) == 1
            with Operations.context(MigrationContext.configure(connection)):
                modules[1].downgrade()
            assert connection.scalar(text("SELECT to_regclass('discount_rules')")) is None
            assert connection.scalar(text("SELECT count(*) FROM sandbox_payments")) == 1
    finally:
        with engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        engine.dispose()


def test_collection_category_scopes_and_bundle_component_union(checkout):
    client, db, body, owner = prepare(checkout)
    sku = db.scalar(text("SELECT id FROM catalog_skus ORDER BY code LIMIT 1"))
    product = db.scalar(text("SELECT product_id FROM catalog_skus WHERE id=:id"), {"id": sku})
    other = (
        db.execute(
            text("SELECT id,product_id FROM catalog_skus WHERE product_id<>:id LIMIT 1"),
            {"id": product},
        )
        .mappings()
        .one()
    )
    collection, category = uuid4(), uuid4()
    db.execute(
        text(
            "INSERT INTO catalog_collections(id,slug,title_fa,title_en,published) VALUES(:id,'discount-test','کالکشن','Collection',false)"
        ),
        {"id": collection},
    )
    db.execute(
        text(
            "INSERT INTO catalog_categories(id,slug,title_fa,title_en,published) VALUES(:id,'discount-test','دسته','Category',false)"
        ),
        {"id": category},
    )
    db.execute(
        text("INSERT INTO catalog_product_collections VALUES(:product,:collection)"),
        {"product": product, "collection": collection},
    )
    db.execute(
        text("INSERT INTO catalog_product_categories VALUES(:product,:category)"),
        {"product": other["product_id"], "category": category},
    )
    db.commit()
    saved = save(client, content=rule(collection_ids=[str(collection)], allow_bundle_stacking=True))
    assert saved.status_code == 200, saved.text
    row = {"id": saved.json()["discount_id"], "version": 1, "content": saved.json()["content"]}
    current = {
        "version": 1,
        "totals": {"total": "280.99"},
        "lines": [
            {
                "id": "a",
                "issue": None,
                "item": {"kind": "product", "item_id": str(sku), "quantity": 1},
                "quote": {"unit": "100.99"},
            },
            {
                "id": "b",
                "issue": None,
                "item": {"kind": "bundle", "quantity": 1},
                "quote": {
                    "unit": "180",
                    "base": "200",
                    "saving": "20",
                    "parts": [
                        {"sku_id": str(sku), "unit": "100", "quantity": 1},
                        {"sku_id": str(other["id"]), "unit": "100", "quantity": 1},
                    ],
                },
            },
        ],
    }
    result = evaluate(db, row, current, owner, "+989123456789")
    assert result["eligible"] == "190.99" and result["amount"] == "19.00"
    row["content"] = rule(category_ids=[str(category)], allow_bundle_stacking=True)
    assert evaluate(db, row, current, owner, "+989123456789")["eligible"] == "90.00"
    row["content"] = rule(
        collection_ids=[str(collection)], category_ids=[str(category)], allow_bundle_stacking=True
    )
    assert evaluate(db, row, current, owner, "+989123456789")["eligible"] == "280.99"
    choices = client.get(
        "/api/v1/admin/discounts/choices/collections", params=[("ids", str(collection))]
    ).json()
    assert choices["items"][0]["id"] == str(collection)
    assert client.get("/api/v1/admin/discounts/choices/collections?q=%").json()["items"] == []


@pytest.mark.parametrize("change,status", [("rotate", 403), ("revoke", 401), ("permission", 403)])
def test_discount_writes_recheck_live_authorization(checkout, monkeypatch, change, status):
    from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository

    client, db, body, owner = prepare(checkout)
    csrf = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
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
    response = client.put(
        f"/api/v1/admin/discounts/rules/{uuid4()}/versions/{uuid4()}",
        headers={"X-CSRF-Token": csrf},
        json={"expected_version": 0, "content": rule(), "reason": "Protected discount"},
    )
    assert response.status_code == status
    assert db.scalar(text("SELECT count(*) FROM discount_rules")) == 0


def test_checkout_freezes_bundle_component_prices_and_both_discounts(checkout):
    from decimal import Decimal

    client, db, body, owner = prepare(checkout)
    bundle = db.scalar(text("SELECT id FROM catalog_bundles LIMIT 1"))
    sku = db.scalar(
        text("SELECT sku_id FROM catalog_bundle_components WHERE bundle_id=:id"), {"id": bundle}
    )
    csrf = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    added = client.post(
        "/api/v1/basket/commands",
        headers={"X-CSRF-Token": csrf},
        json={
            "command_id": str(uuid4()),
            "version": 1,
            "action": "add",
            "item": {
                "kind": "bundle",
                "item_id": str(bundle),
                "quantity": 1,
                "choices": {str(sku): str(sku)},
            },
        },
    )
    assert added.status_code == 200, added.text
    save(client, content=rule(allow_bundle_stacking=True))
    current = client.get("/api/v1/basket").json()
    csrf = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    quoted = client.post(
        "/api/v1/discounts/quote",
        headers={"X-CSRF-Token": csrf},
        json={"code": "SAVE10", "basket_version": current["version"]},
    )
    assert quoted.status_code == 200, quoted.text
    payment = start(
        client,
        {
            **body,
            "basket_version": current["version"],
            "expected_total": quoted.json()["total"],
            "discount_code": "SAVE10",
            "discount_version": 1,
        },
    )
    assert payment.status_code == 200, payment.text
    frozen = db.scalar(text("SELECT snapshot FROM discount_usage"))
    details = next(iter(frozen["calculation"]["components"].values()))
    assert sum(Decimal(row["base_amount"]) for row in details) == Decimal("200.2")
    assert sum(Decimal(row["bundle_discount_amount"]) for row in details) == Decimal("10")
    assert sum(Decimal(row["before_code_amount"]) for row in details) == Decimal("190.2")
    for row in details:
        assert Decimal(row["total_amount"]) == Decimal(row["base_amount"]) - Decimal(
            row["bundle_discount_amount"]
        ) - Decimal(row["code_discount_amount"])
    db.execute(text("UPDATE catalog_skus SET price_amount=999 WHERE id=:id"), {"id": sku})
    db.commit()
    assert db.scalar(text("SELECT snapshot FROM discount_usage")) == frozen
