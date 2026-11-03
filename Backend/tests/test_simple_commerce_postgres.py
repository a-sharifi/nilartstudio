import importlib.util
from pathlib import Path
from uuid import uuid4

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from test_identity_otp_postgres import flow as flow
from test_identity_otp_postgres import register

from nilart.contexts.identity.infrastructure.management import SqlAccountManagement


def setup(flow):
    client, db, sms = flow
    done = {"0001", "0004", "0005", "0006", "0007", "0008", "0017", "0018", "0019"}
    directory = Path(__file__).parents[1] / "migrations/versions"
    with Operations.context(MigrationContext.configure(db.connection())):
        for path in sorted(directory.glob("*.py")):
            if path.name[:4] in done:
                continue
            spec = importlib.util.spec_from_file_location(path.stem, path)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            mod.upgrade()
    _, login = register(client, sms)
    client.headers["X-CSRF-Token"] = login.json()["csrf_token"]
    SqlAccountManagement(db).bootstrap(login.json()["account_id"], "Simple accounting regression")
    product, sku = uuid4(), uuid4()
    db.execute(
        text(
            "INSERT INTO catalog_products(id,slug,title_fa,title_en) VALUES(:id,'simple-test','دفتر','Notebook')"
        ),
        dict(id=product),
    )
    db.execute(
        text("INSERT INTO catalog_skus(id,product_id,code) VALUES(:id,:p,'SIMPLE-A5')"),
        dict(id=sku, p=product),
    )
    db.commit()
    return client, db, sku, login.json()["account_id"]


def post(client, sku, key=None, **changes):
    row = client.get("/api/v1/admin/simple/variants").json()["items"][0]
    body = dict(
        sku_id=str(sku),
        kind="variant",
        cost_version=row["cost_version"],
        stock_version=row["stock_version"],
        price_version=row["price_version"],
        unit_cost="100",
        sale_price="200",
        quantity=10,
        supplier="",
        document_date="2026-10-31",
        reason="Physical count and owner cost",
        **{},
    )
    body.update(changes)
    return client.put(f"/api/v1/admin/simple/commands/{key or uuid4()}", json=body), body


def test_simple_cost_stock_purchase_retry_and_historical_cost(flow):
    client, db, sku, owner = setup(flow)
    key = uuid4()
    r, body = post(client, sku, key)
    assert r.status_code == 200, r.text
    assert client.put(f"/api/v1/admin/simple/commands/{key}", json=body).json() == r.json()
    row = client.get("/api/v1/admin/simple/variants").json()["items"][0]
    assert row["quantity"] == "10.000000" and row["unit_cost"] == "100.000000"
    purchase, p = post(
        client, sku, kind="purchase", quantity=2, unit_cost="160", supplier="Paper supplier"
    )
    assert purchase.status_code == 200, purchase.text
    row = client.get("/api/v1/admin/simple/variants").json()["items"][0]
    assert row["quantity"] == "12.000000" and row["average_cost"] == "110.000000"
    assert (
        client.get("/api/v1/admin/simple/purchases").json()["items"][0]["result"]["total_cost"]
        == "320"
    )
    # Existing outgoing valuation remains immutable after owner edits current stock cost.
    position = db.scalar(
        text("SELECT id FROM inventory_positions WHERE reference_id=:id"), dict(id=sku)
    )
    history_before = list(
        db.execute(
            text("SELECT id,value_delta FROM inventory_movements WHERE position_id=:id"),
            dict(id=position),
        ).all()
    )
    r, _ = post(client, sku, quantity=12, unit_cost="125")
    assert r.status_code == 200, r.text
    assert all(
        db.scalar(text("SELECT value_delta FROM inventory_movements WHERE id=:id"), dict(id=id))
        == cost
        for id, cost in history_before
    )
    assert client.put(f"/api/v1/admin/simple/commands/{uuid4()}", json=body).status_code == 409
    db.execute(text("UPDATE inventory_positions SET reserved=5 WHERE id=:id"), dict(id=position))
    db.commit()
    rejected, _ = post(client, sku, quantity=4, unit_cost="1")
    assert rejected.status_code == 409
    assert (
        db.scalar(text("SELECT unit_cost FROM simple_variant_costs WHERE sku_id=:id"), dict(id=sku))
        == 125
    )
    report = client.get("/api/v1/admin/simple/profit")
    assert report.status_code == 200, report.text
    assert report.json()["profit"] == "0.00" and report.json()["purchases"] == "320.00"
    db.execute(
        text("DELETE FROM identity_account_roles WHERE account_id=:id AND role='admin'"),
        dict(id=owner),
    )
    db.commit()
    assert client.put(f"/api/v1/admin/simple/commands/{key}", json=body).status_code == 403


def test_profit_uses_frozen_dispatched_cost_and_flags_unfulfilled_sales(flow):
    client, db, sku, owner = setup(flow)
    post(client, sku)
    order = uuid4()
    line = str(uuid4())
    shipment = uuid4()
    snapshot = {
        "currency": "IRT",
        "items": [{"id": line, "quantity": 2, "unit_amount": "200", "discount_amount": "20"}],
    }
    import json

    db.execute(
        text(
            'INSERT INTO customer_orders(id,account_id,source_id,snapshot,state) VALUES(:id,:owner,:source,CAST(:s AS jsonb),\'{"payment":"paid"}\')'
        ),
        dict(id=order, owner=owner, source=uuid4(), s=json.dumps(snapshot)),
    )
    db.commit()
    assert client.get("/api/v1/admin/simple/profit").json()["profit"] is None
    db.execute(
        text(
            "INSERT INTO fulfillment_shipments(id,order_id,version,status,content,state) VALUES(:id,:order,1,'dispatched',CAST(:c AS jsonb),CAST(:s AS jsonb))"
        ),
        dict(
            id=shipment,
            order=order,
            c=json.dumps({"quantities": {line: 2}}),
            s=json.dumps({"costs": [{"line_id": line, "value_delta": "-200"}]}),
        ),
    )
    # Dispatch stock through the existing stock ledger, exactly as fulfillment records it.
    row = (
        db.execute(text("SELECT * FROM inventory_positions WHERE reference_id=:id"), dict(id=sku))
        .mappings()
        .one()
    )
    db.execute(
        text(
            "INSERT INTO inventory_movements(id,position_id,actor_id,kind,expected_version,version,quantity_delta,value_delta,quantity_after,value_after,reason,intent) VALUES(:id,:position,:owner,'fulfillment_dispatch',:v,:next,-2,-200,8,800,'Dispatched cost','{}')"
        ),
        dict(
            id=uuid4(), position=row["id"], owner=owner, v=row["version"], next=row["version"] + 1
        ),
    )
    db.execute(
        text("UPDATE inventory_positions SET quantity=8,value=800,version=version+1 WHERE id=:id"),
        dict(id=row["id"]),
    )
    db.commit()
    report = client.get("/api/v1/admin/simple/profit").json()
    assert report["net_sales"] == "380.00" and report["profit"] == "180.00"
    post(client, sku, quantity=8, unit_cost="175")
    assert client.get("/api/v1/admin/simple/profit").json()["profit"] == "180.00"


def test_exact_variant_detail_uses_id_and_preserves_access(flow):
    client, db, sku, owner = setup(flow)
    other = uuid4()
    product = db.scalar(text("SELECT product_id FROM catalog_skus WHERE id=:id"), dict(id=sku))
    db.execute(text("INSERT INTO catalog_skus(id,product_id,code) VALUES(:id,:p,'SIMPLE-A5-OTHER')"), dict(id=other,p=product))
    db.commit()
    response = client.get(f"/api/v1/admin/simple/variants/{other}")
    assert response.status_code == 200
    assert response.json()["id"] == str(other)
    assert response.json()["product_id"] == str(product)
    assert response.json()["code"] == 'SIMPLE-A5-OTHER'
    assert client.get(f"/api/v1/admin/simple/variants/{uuid4()}").status_code == 404
    client.cookies.clear()
    assert client.get(f"/api/v1/admin/simple/variants/{sku}").status_code == 401
