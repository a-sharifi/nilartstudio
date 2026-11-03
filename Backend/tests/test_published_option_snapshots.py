import json
from uuid import uuid4

from sqlalchemy import text
from test_basket import basket as basket
from test_basket import boot, mutate
from test_identity_otp_postgres import flow as flow
from test_identity_otp_postgres import register
from test_order_stock_postgres import callback
from test_sandbox_payments import checkout as checkout
from test_sandbox_payments import start

from nilart.contexts.catalog.infrastructure.options import SqlOptionDraftRepository


def pin(db, sku):
    row = db.execute(text("SELECT product_id,code FROM catalog_skus WHERE id=:id"), {"id": sku}).mappings().one()
    actor = db.scalar(text("SELECT id FROM identity_accounts LIMIT 1"))
    option, value = str(uuid4()), str(uuid4())
    document = {"options": [{"id": option, "title_fa": "اندازه", "title_en": "Size", "order": 0,
                             "values": [{"id": value, "title_fa": "کوچک", "title_en": "Small", "order": 0}]}],
                "combinations": [{"code": row["code"], "selections": [{"option_id": option, "value_id": value}]}]}
    draft = SqlOptionDraftRepository(db).save(row["product_id"], actor, 0, document)
    snapshot = {"options": document["options"], "combination": document["combinations"][0]}
    db.execute(text("INSERT INTO catalog_sku_option_mappings(sku_id,configuration_id,configuration_version,combination_code,snapshot) VALUES(:sku,:config,1,:code,CAST(:snapshot AS jsonb))"),
               {"sku": sku, "config": draft["configuration_id"], "code": row["code"], "snapshot": json.dumps(snapshot)})
    db.commit()
    return row["product_id"], snapshot, {option: value}


def rename(db, sku, snapshot):
    changed = json.loads(json.dumps(snapshot))
    changed["options"][0]["values"][0]["title_en"] = "Renamed"
    db.execute(text("UPDATE catalog_sku_option_mappings SET snapshot=CAST(:snapshot AS jsonb),configuration_version=2 WHERE sku_id=:sku"), {"snapshot": json.dumps(changed), "sku": sku})
    db.commit()


def test_basket_uses_pinned_labels_and_ignores_editable_drafts(basket):
    client, db, sms, ids = basket
    register(client, sms)
    product, snapshot, selection = pin(db, ids["sku"])
    initial = boot(client)
    csrf = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    response = mutate(client, initial["version"], csrf, item={"kind": "product", "item_id": ids["sku"], "quantity": 3})
    assert response.status_code == 200, response.text
    quoted = response.json()["lines"][0]["quote"]
    assert quoted["options"] == [["اندازه: کوچک", "Size: Small"]]
    assert quoted["selection"] == selection
    db.execute(text("UPDATE catalog_option_drafts SET document=jsonb_set(document,'{options,0,values,0,title_en}','\"Unreviewed\"'),version=version+1 WHERE product_id=:id"), {"id": product})
    db.commit()
    assert client.get("/api/v1/basket").json()["lines"][0]["quote"] == quoted
    snapshot["combination"]["code"] = "FOREIGN"
    db.execute(text("UPDATE catalog_sku_option_mappings SET snapshot=CAST(:snapshot AS jsonb) WHERE sku_id=:sku"), {"snapshot": json.dumps(snapshot), "sku": ids["sku"]})
    db.commit()
    unavailable = client.get("/api/v1/basket").json()["lines"][0]
    assert unavailable["issue"] == "unavailable"
    assert unavailable["quote"]["options"] == quoted["options"]


def test_order_labels_stay_frozen_after_mapping_changes(checkout):
    client, db, body = checkout
    sku = client.get("/api/v1/basket").json()["lines"][0]["item"]["item_id"]
    _, snapshot, _ = pin(db, sku)
    payment = start(client, body)
    assert payment.status_code == 200, payment.text
    payment = payment.json()
    assert callback(client, payment).status_code == 303
    before = client.get(f"/api/v1/account/orders/{payment['order_id']}")
    assert before.status_code == 200, before.text
    frozen = before.json()["snapshot"]
    assert frozen["items"][0]["options_en"] == "Size: Small"
    assert frozen["items"][0]["options_fa"] == "اندازه: کوچک"
    rename(db, sku, snapshot)
    assert client.get(f"/api/v1/account/orders/{payment['order_id']}").json()["snapshot"] == frozen


def test_changed_option_labels_require_new_checkout_acceptance(checkout):
    client, db, body = checkout
    sku = client.get("/api/v1/basket").json()["lines"][0]["item"]["item_id"]
    _, snapshot, _ = pin(db, sku)
    shipping = "11111111-1111-4111-8111-111111111111"
    csrf = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    accepted = client.post("/api/v1/payments/checkout-review", headers={"X-CSRF-Token": csrf}, json={"basket_version": body["basket_version"], "address_id": body["address_id"], "shipping_method_id": shipping})
    assert accepted.status_code == 200, accepted.text
    rename(db, sku, snapshot)
    rejected = start(client, {**body, "shipping_method_id": shipping, "checkout_fingerprint": accepted.json()["fingerprint"]})
    assert rejected.status_code == 409, rejected.text
    assert rejected.json()["detail"]["code"] == "checkout_review_required"
    assert db.scalar(text("SELECT count(*) FROM customer_orders")) == 0
