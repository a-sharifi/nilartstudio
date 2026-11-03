from uuid import uuid4

from sqlalchemy import text
from test_catalog_management import body, migration
from test_catalog_management import management_flow as management_flow
from test_identity_otp_postgres import flow as flow

BASE = "/api/v1/admin/catalog"


def setup(management_flow):
    client, db, actor, headers = management_flow
    migration(db.connection(), "0053_catalog_profiles.py")
    client.headers.update(headers)
    return client, db, actor


def create(client, slug):
    response = client.post(BASE + "/entries/products", json=body(slug))
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_workspace_exact_prices_and_missing_configuration(management_flow):
    client, db, _ = setup(management_flow)
    product = create(client, "paper-one")
    create(client, "empty-product")
    for code, amount, currency in [("A4", "9007199254740993.123456", "IRT"), ("A5", "10.125", "IRT"), ("IRR", "100", "IRR"), ("MISSING", None, None)]:
        db.execute(text("INSERT INTO catalog_skus(id,product_id,code,published,price_amount,currency) VALUES(:id,:product,:code,false,:amount,:currency)"), dict(id=uuid4(), product=product, code=code, amount=amount, currency=currency))
    response = client.get(BASE + "/product-workspace")
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["counts"] == dict(total=2, published=0, draft=2, attention=2)
    row = next(row for row in result["items"] if row["id"] == product)
    assert row["sku_count"] == 4 and row["unpriced_sku_count"] == 1
    assert row["thumbnail_url"] is None
    prices = {price["currency"]: price for price in row["prices"]}
    assert prices["IRT"]["maximum"] == "9007199254740993.123456"
    assert prices["IRR"]["minimum"] == "100.000000"


def test_workspace_searches_variant_codes_and_filters_collection(management_flow):
    client, db, _ = setup(management_flow)
    product = create(client, "matching-product")
    create(client, "other-product")
    collection = client.post(BASE + "/entries/collections", json=body("collection-one")).json()["id"]
    db.execute(text("INSERT INTO catalog_product_collections(product_id,collection_id) VALUES(:p,:c)"), dict(p=product, c=collection))
    db.execute(text("INSERT INTO catalog_skus(id,product_id,code,published,price_amount,currency) VALUES(:id,:product,'SPECIAL-A3',true,15,'IRT')"), dict(id=uuid4(), product=product))
    result = client.get(BASE + "/product-workspace", params=dict(q="special-a3", collection=collection)).json()
    assert result["total"] == 1 and result["items"][0]["id"] == product
    assert result["items"][0]["collections"][0]["id"] == collection
    assert result["items"][0]["published_sku_count"] == 1
    assert client.get(BASE + "/product-workspace", params=dict(attention="true", q="special-a3")).json()["total"] == 0


def test_workspace_status_pagination_and_fresh_permission(management_flow):
    client, db, actor = setup(management_flow)
    one = create(client, "alpha")
    create(client, "beta")
    db.execute(text("UPDATE catalog_products SET published=true WHERE id=:id"), dict(id=one))
    result = client.get(BASE + "/product-workspace", params=dict(status="published", page_size=1)).json()
    assert result["total"] == 1 and result["counts"]["draft"] == 1
    assert client.get(BASE + "/product-workspace", params=dict(page=2, page_size=1)).json()["items"]
    db.execute(text("INSERT INTO identity_permission_overrides(account_id,permission,allowed) VALUES(:id,'catalog.manage',false)"), {"id": actor})
    assert client.get(BASE + "/product-workspace").status_code == 403
