from uuid import uuid4

from sqlalchemy import text
from test_customer_panel_postgres import setup
from test_identity_otp_postgres import flow as flow

from nilart.contexts.customer.notifications import notify


def emit(db, owner, event="artwork:one", category="artwork"):
    notify(db, owner, event=event, category=category, title_fa="نسخه آماده بررسی", title_en="Artwork ready for review", reference="commission_id", id="00000000-0000-4000-8000-000000000001")


def test_default_notice_is_owned_deduplicated_and_read_state_survives_replay(flow):
    client, db, owner = setup(flow)
    emit(db, owner)
    emit(db, owner)
    db.commit()
    page = client.get("/api/v1/account/panel/notification").json()
    assert len(page["items"]) == 1
    record = page["items"][0]
    assert record["data"]["category"] == "artwork" and record["data"]["read"] is False
    assert record["data"]["commission_id"] == "00000000-0000-4000-8000-000000000001"
    assert client.get("/api/v1/account/panel/summary").json()["unread_notifications"] == 1
    result = client.put(f'/api/v1/account/panel/notification/{record["id"]}', json={"version": 0, "data": {"read": True}})
    assert result.status_code == 200, result.text
    emit(db, owner)
    db.commit()
    assert client.get("/api/v1/account/panel/summary").json()["unread_notifications"] == 0
    assert client.get("/api/v1/account/panel/notification").json()["items"][0]["version"] == 1
    foreign = uuid4()
    db.execute(text("INSERT INTO identity_accounts(id,phone,password_hash,phone_verified,blocked,created_at) SELECT :foreign,'+989123456780',password_hash,true,false,now() FROM identity_accounts WHERE id=:owner"), {"foreign": foreign, "owner": owner})
    db.execute(text("UPDATE customer_records SET account_id=:foreign WHERE id=:id"), {"foreign": foreign, "id": record["id"]})
    db.commit()
    assert client.get("/api/v1/account/panel/notification").json()["items"] == []


def test_disabled_category_suppresses_notice_and_reenable_allows_future_events(flow):
    client, db, owner = setup(flow)
    choices = {key: {"inApp": key != "artwork", "sms": False} for key in ("order", "delivery", "proposal", "artwork", "files", "support")}
    id = uuid4()
    result = client.put(f"/api/v1/account/panel/preferences/{id}", json={"version": 0, "data": {"language": "fa", "choices": choices}})
    assert result.status_code == 200, result.text
    emit(db, owner)
    emit(db, owner, event="order:one", category="order")
    db.commit()
    assert [item["data"]["category"] for item in client.get("/api/v1/account/panel/notification").json()["items"]] == ["order"]
    choices["artwork"]["inApp"] = True
    assert client.put(f"/api/v1/account/panel/preferences/{id}", json={"version": 0, "data": {"language": "fa", "choices": choices}}).status_code == 200
    emit(db, owner, event="artwork:two")
    db.commit()
    assert client.get("/api/v1/account/panel/summary").json()["unread_notifications"] == 2


def test_notice_rolls_back_with_its_business_transaction(flow):
    client, db, owner = setup(flow)
    transaction = db.begin_nested()
    emit(db, owner)
    assert db.execute(text("SELECT count(*) FROM customer_records WHERE kind='notification'")).scalar() == 1
    transaction.rollback()
    assert db.execute(text("SELECT count(*) FROM customer_records WHERE kind='notification'")).scalar() == 0
