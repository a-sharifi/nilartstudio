"""Monitoring never mixes sandbox revenue, order dates and payment dates."""

import json
from datetime import date
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import text
from test_basket import migrate
from test_identity_otp_postgres import flow as flow
from test_identity_otp_postgres import register

from nilart.contexts.analytics.router import project, router
from nilart.contexts.catalog.infrastructure.repository import Base
from nilart.contexts.identity.domain.permissions import Principal
from nilart.shared.database import session_dependency

BASE = "/api/v1/admin/shop-dashboard"


@pytest.fixture
def dashboard(flow):
    auth, db, sms = flow
    Base.metadata.create_all(db.connection())
    for name in [
        "0023_customer_orders.py",
        "0027_baskets.py",
        "0031_sandbox_payments.py",
        "0035_stock_ledger.py",
        "0053_catalog_profiles.py",
    ]:
        migrate(db, name)
    _, login = register(auth, sms)
    owner = login.json()["account_id"]
    db.execute(
        text("INSERT INTO identity_account_roles(account_id,role) VALUES(:id,'admin')"),
        dict(id=owner),
    )
    db.commit()
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[session_dependency] = lambda: db
    with TestClient(app) as client:
        client.cookies.update(auth.cookies)
        yield client, db, owner


def order(
    db,
    owner,
    *,
    created="2026-11-03T01:00:00+00:00",
    paid="2026-11-03T01:00:00+00:00",
    payment="paid",
    sandbox=False,
    currency="IRT",
    unit="100",
    quantity=1,
    discount="0",
    fulfillment="unshipped",
):
    id = uuid4()
    snapshot = dict(
        reference="ORDER-" + str(id)[:8],
        currency=currency,
        items=[
            dict(
                id=str(uuid4()),
                sku="snapshot-sku",
                title_fa="دفتر تاریخی",
                title_en="Historical notebook",
                quantity=quantity,
                unit_amount=unit,
                discount_amount=discount,
                delivery="physical",
            )
        ],
        total_amount=str(Decimal(unit) * quantity - Decimal(discount) + 30),
        shipping_amount="20",
        tax_amount="10",
    )
    if paid is not None:
        snapshot["receipt"] = dict(issued_at=paid)
    state = dict(payment=payment, fulfillment=fulfillment, refunded_amount="0")
    db.execute(
        text(
            "INSERT INTO customer_orders(id,account_id,source_id,snapshot,state,sandbox,created_at,updated_at) VALUES(:id,:owner,:source,CAST(:snapshot AS jsonb),CAST(:state AS jsonb),:sandbox,CAST(:created AS timestamptz),CAST(:created AS timestamptz))"
        ),
        dict(
            id=id,
            owner=owner,
            source=uuid4(),
            snapshot=json.dumps(snapshot),
            state=json.dumps(state),
            sandbox=sandbox,
            created=created,
        ),
    )
    return id


def test_tehran_payment_dates_irr_and_sandbox_scope(dashboard):
    client, db, owner = dashboard
    a = order(
        db,
        owner,
        created="2026-11-01T23:00:00Z",
        paid="2026-11-02T22:00:00Z",
        currency="IRR",
        unit="1000",
        quantity=2,
        discount="100",
    )
    order(db, owner, paid="2026-11-03T20:30:00Z")  # next Tehran day, excluded from paid trend
    order(db, owner, paid=None, payment="pending")
    order(db, owner, sandbox=True, unit="999")
    db.commit()
    response = client.get(BASE, params=dict(from_date="2026-11-03", to_date="2026-11-03"))
    assert response.status_code == 200, response.text
    assert response.headers["cache-control"] == "no-store"
    r = response.json()
    assert r["summary"] == dict(
        orders=2, paid_orders=1, sales_amount="190.00", average_order="190.00", units=2
    )
    assert r["previous"]["orders"] == 1 and r["previous"]["paid_orders"] == 0
    assert r["trend"] == [dict(date="2026-11-03", orders=2, paid_orders=1, sales_amount="190.00")]
    assert {s["key"]: s["count"] for s in r["status"]} == {"paid": 1, "pending": 1}
    assert r["top_products"][0]["sales_amount"] == "190.00"
    assert r["top_products"][0]["quantity"] == 2
    assert str(a) not in [x["id"] for x in r["recent_orders"]]
    assert len(r["recent_orders"]) == 2
    for scope, count, sales in [("all", 2, "1189.00"), ("sandbox", 1, "999.00")]:
        scoped = client.get(
            BASE, params=dict(from_date="2026-11-03", to_date="2026-11-03", scope=scope)
        ).json()
        assert (
            scoped["summary"]["paid_orders"] == count and scoped["summary"]["sales_amount"] == sales
        )


def test_half_open_midnight_bounds_and_unknown_legacy_receipts(dashboard):
    client, db, owner = dashboard
    for stamp in [
        "2026-11-02T20:29:59Z",
        "2026-11-02T20:30:00Z",
        "2026-11-03T20:29:59Z",
        "2026-11-03T20:30:00Z",
    ]:
        order(db, owner, created=stamp, paid=stamp)
    order(db, owner, paid="2026-99-99T01:00:00Z")
    order(db, owner, paid="2026-11-03T01:00:00")  # no trustworthy timezone
    order(db, owner, paid=None, payment="paid")
    db.commit()
    r = client.get(BASE, params=dict(from_date="2026-11-03", to_date="2026-11-03")).json()
    assert r["summary"]["orders"] == 5
    assert r["summary"]["paid_orders"] == 2
    assert r["summary"]["sales_amount"] == "200.00"
    assert r["previous"]["paid_orders"] == 1


def test_section_permissions_empty_results_and_access(dashboard):
    client, db, owner = dashboard
    start = end = date(2026, 11, 3)
    financial = Principal(owner, frozenset(), frozenset({"finance.read"}))
    r = project(db, financial, start, end)
    assert r["summary"]["sales_amount"] == "0.00" and r["summary"]["orders"] == 0
    assert r["trend"] == [dict(date="2026-11-03", orders=0, paid_orders=0, sales_amount="0.00")]
    assert (
        r["recent_orders"] == []
        and r["inventory"] is None
        and r["catalog"] is None
        and r["work"] is None
    )
    stock = Principal(owner, frozenset(), frozenset({"inventory.manage"}))
    r = project(db, stock, start, end)
    assert r["summary"] is None and r["previous"] is None and r["trend"] == [] and r["work"] is None
    assert r["inventory"]["published_variants"] == 0
    db.execute(
        text("DELETE FROM identity_account_roles WHERE account_id=:id AND role='admin'"),
        dict(id=owner),
    )
    db.commit()
    assert client.get(BASE).status_code == 403
    client.cookies.clear()
    assert client.get(BASE).status_code == 401


def test_inventory_catalog_and_work_are_current_and_permission_scoped(dashboard):
    client, db, owner = dashboard
    product = uuid4()
    one, two, draft = [uuid4() for _ in range(3)]
    db.execute(
        text(
            "INSERT INTO catalog_products(id,slug,title_fa,title_en,published) VALUES(:id,'real-notebook','دفتر','Notebook',true)"
        ),
        dict(id=product),
    )
    for id, code, published, price in [
        (one, "ONE", True, 100),
        (two, "TWO", True, None),
        (draft, "DRAFT", False, None),
    ]:
        db.execute(
            text(
                "INSERT INTO catalog_skus(id,product_id,code,published,price_amount,currency) VALUES(:id,:product,:code,:published,:price,:currency)"
            ),
            dict(
                id=id,
                product=product,
                code=code,
                published=published,
                price=price,
                currency="IRT" if price is not None else None,
            ),
        )
    for id, quantity, reserved in [(one, 1, 0), (two, 2, 2)]:
        db.execute(
            text(
                "INSERT INTO inventory_positions(id,kind,reference_id,code,title_fa,title_en,unit,quantity,reserved,value,version) VALUES(:id,'sku',:ref,:code,'دفتر','Notebook','unit',:quantity,:reserved,100,1)"
            ),
            dict(id=uuid4(), ref=id, code=str(id), quantity=quantity, reserved=reserved),
        )
    # Latest editable content is complete, but the published revision remains incomplete.
    published = uuid4()
    incomplete = dict(delivery="physical", weight_grams=100, returnable=True)
    complete = {**incomplete, "length_cm": 21, "width_cm": 14.8, "height_cm": 2}
    db.execute(
        text(
            "INSERT INTO catalog_profiles(kind,entity_id,version,content) VALUES('skus',:id,2,CAST(:c AS jsonb))"
        ),
        dict(id=one, c=json.dumps(complete)),
    )
    db.execute(
        text(
            "INSERT INTO catalog_profile_revisions(id,kind,entity_id,actor_id,version,intent,result) VALUES(:r,'skus',:id,:owner,1,CAST(:intent AS jsonb),'{}')"
        ),
        dict(r=published, id=one, owner=owner, intent=json.dumps(dict(content=incomplete))),
    )
    db.execute(
        text(
            "UPDATE catalog_profiles SET published_revision=:r WHERE kind='skus' AND entity_id=:id"
        ),
        dict(r=published, id=one),
    )
    live = order(db, owner, created="2020-01-01T00:00:00Z", paid="2020-01-01T00:00:00Z")
    order(db, owner, sandbox=True)
    order(db, owner, payment="refunded")
    order(db, owner, fulfillment="cancelled")
    order(db, owner, fulfillment="shipped")
    db.execute(
        text(
            "INSERT INTO customer_order_requests(id,account_id,order_id,kind,status,payload) VALUES(:id,:owner,:order,'return','approved','{}')"
        ),
        dict(id=uuid4(), owner=owner, order=live),
    )
    db.commit()
    r = client.get(
        BASE, params=dict(from_date="2026-11-03", to_date="2026-11-03", low_stock=2)
    ).json()
    assert r["inventory"]["published_variants"] == 2
    assert r["inventory"]["low_stock_count"] == 1 and r["inventory"]["out_of_stock_count"] == 1
    assert Decimal(r["inventory"]["reserved_quantity"]) == 2
    assert r["inventory"]["items"][0]["sku_id"] == str(two)
    assert r["catalog"] == dict(
        published_products=1, draft_products=0, missing_prices=1, missing_shipping=2
    )
    assert r["work"] == dict(paid_unshipped=1, open_requests=1)


def test_filter_validation_and_inclusive_maximum(dashboard):
    client, db, owner = dashboard
    for params in [
        dict(from_date="2026-11-04", to_date="2026-11-03"),
        dict(from_date="2026-01-01", to_date="2026-04-04"),
        dict(scope="fake"),
        dict(low_stock=-1),
        dict(low_stock=1001),
        dict(from_date="bad"),
        dict(to_date="0001-01-01"),
        dict(from_date="9999-12-31", to_date="9999-12-31"),
    ]:
        assert client.get(BASE, params=params).status_code == 422
    r = client.get(BASE, params=dict(from_date="2026-01-01", to_date="2026-04-03"))
    assert r.status_code == 200, r.text
    assert len(r.json()["trend"]) == 93
