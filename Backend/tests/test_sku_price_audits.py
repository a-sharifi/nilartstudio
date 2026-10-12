import json
from uuid import uuid4

import pytest
from sqlalchemy import text
from test_catalog_options import admin
from test_identity_otp_postgres import flow as flow
from test_sku_prices import price_flow as price_flow


def test_price_history_scope_cursor_permissions_and_exact_snapshots(price_flow):
    client, db, actor, product, sku, csrf = price_flow
    path = f"/api/v1/admin/catalog/skus/{sku}/price"
    audits = path + "/audits"
    assert client.get(audits).status_code == 403
    admin(db, actor)
    assert client.get(audits).json() == {"items": [], "next_before_version": None}
    values = [{"amount": "123456789012345678.123456", "currency": "IRT"},
              {"amount": "0.000001", "currency": "IRR"}, None]
    for version, price in enumerate(values):
        assert client.put(path, json={"version": version, "price": price},
                          headers={"X-CSRF-Token": csrf}).status_code == 200
    first = client.get(audits, params={"limit": 2})
    assert first.status_code == 200
    assert first.headers["cache-control"] == "no-store"
    page = first.json()
    assert [a["version"] for a in page["items"]] == [3, 2]
    assert page["next_before_version"] == 2
    latest = page["items"][0]
    assert latest["actor_id"] == actor and latest["product_id"] == str(product)
    assert latest["sku_id"] == str(sku) and latest["previous_version"] == 2
    assert latest["created_at"]
    assert latest["before"] == {"price": values[1]} and latest["after"] == {"price": None}
    # A newer write between pages cannot shift the older-version cursor.
    assert client.put(path, json={"version": 3, "price": values[0]},
                      headers={"X-CSRF-Token": csrf}).status_code == 200
    older = client.get(audits, params={"limit": 2, "before_version": 2}).json()
    assert [a["version"] for a in older["items"]] == [1]
    assert older["next_before_version"] is None
    assert older["items"][0]["before"] == {"price": None}
    assert older["items"][0]["after"] == {"price": values[0]}
    assert not any(secret in json.dumps(page) for secret in [csrf, "csrf_hash", "session_token"])
    other = uuid4()
    db.execute(text("INSERT INTO catalog_skus (id,product_id,code,published) "
                    "VALUES (:id,:product,'OTHER-PRICE-AUDIT',false)"),
               {"id": other, "product": product})
    db.commit()
    assert client.get(f"/api/v1/admin/catalog/skus/{other}/price/audits").json()["items"] == []
    assert client.get(f"/api/v1/admin/catalog/skus/{uuid4()}/price/audits").status_code == 404
    assert client.get(audits, params={"before_version": 1}).json()["items"] == []
    assert client.get("/api/v1/catalog/skus/PRICE-TEST").json()["price"] == values[0]
    db.execute(text("DELETE FROM identity_account_roles WHERE account_id=:actor"), {"actor": actor})
    db.commit()
    assert client.get(audits).status_code == 403
    client.cookies.clear()
    assert client.get(audits).status_code == 401


@pytest.mark.parametrize("params", [{"limit": 0}, {"limit": 101}, {"limit": "bad"},
                                    {"before_version": 0}, {"before_version": 2147483648},
                                    {"before_version": "bad"}])
def test_price_history_rejects_invalid_pagination(price_flow, params):
    client, db, actor, _, sku, _ = price_flow
    admin(db, actor)
    assert client.get(f"/api/v1/admin/catalog/skus/{sku}/price/audits", params=params).status_code == 422
