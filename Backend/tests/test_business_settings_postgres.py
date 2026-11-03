import importlib.util
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from test_identity_otp_postgres import flow as flow
from test_identity_otp_postgres import register

from nilart.contexts.business.router import Settings, missing
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.shared.outbox import consume_event


def prepare(flow, staff=True):
    client, db, sms = flow
    spec = importlib.util.spec_from_file_location("business_settings_migration", Path(__file__).parents[1]/"migrations/versions/0034_business_settings.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(db.connection())):
        module.upgrade()
    _, login = register(client,sms)
    owner = login.json()["account_id"]
    client.headers["X-CSRF-Token"] = login.json()["csrf_token"]
    if staff:
        SqlAccountManagement(db).bootstrap(owner,"Isolated settings test")
        db.commit()
    return client,db,owner


def save(client, content=None, version=0, key=None, reason="Reviewed configuration"):
    return client.put(f"/api/v1/admin/settings/versions/{key or uuid4()}",json={"content":{} if content is None else content,"expected_version":version,"reason":reason})


def test_unconfigured_values_are_not_zero_or_business_data(flow):
    client,db,_ = prepare(flow)
    current = client.get("/api/v1/admin/settings").json()
    assert current["version"] == 0
    assert current["content"]["tax_percent"] is None
    assert current["content"]["reservation_minutes"] is None
    assert "tax_percent" in current["missing"]
    assert db.scalar(text("SELECT count(*) FROM business_settings")) == 0
    result = save(client,{"tax_percent":"0","return_days":0,"commission_revision_limit":0})
    assert result.status_code == 200,result.text
    current = client.get("/api/v1/admin/settings").json()
    assert "tax_percent" not in current["missing"] and "return_days" not in current["missing"]
    assert "commission_revision_limit" not in current["missing"]
    assert "reservation_minutes" in current["missing"]


def test_history_exact_replay_conflict_and_worker_dedup(flow):
    client,db,_ = prepare(flow)
    key=uuid4()
    first=save(client,{"title_fa":"نیل‌آرت","tax_percent":"9.5"},key=key)
    assert first.status_code==200,first.text
    assert save(client,{"title_fa":"نیل‌آرت","tax_percent":"9.5"},key=key).json()==first.json()
    assert save(client,{"title_fa":"Other"},key=key).status_code==409
    assert save(client,version=0).status_code==409
    assert save(client,{"tax_percent":"0"},version=1).status_code==200
    assert client.get(f"/api/v1/admin/settings/versions/{key}").json()==first.json()
    page=client.get("/api/v1/admin/settings/versions?limit=1").json()
    assert page["items"][0]["version"]==2 and page["next_before_version"]==2
    assert client.get("/api/v1/admin/settings/versions?before=2").json()["items"]==[first.json()]
    assert db.scalar(text("SELECT count(*) FROM identity_audits WHERE action='business.settings_saved'"))==2
    event=db.execute(text("SELECT id,event_type,payload FROM outbox_events WHERE event_type='business.settings_saved' LIMIT 1")).mappings().one()
    assert consume_event(db,dict(event)) is True
    assert consume_event(db,dict(event)) is False
    db.commit()


@pytest.mark.parametrize("change",[{"tax_percent":"100.0001"},{"tax_percent":"-1"},{"reservation_minutes":0},{"reservation_minutes":True},{"return_days":366},{"currency":"IRR"},{"contact_email":"invalid"},{"title_en":"bad\x00value"},{"commission_base_amount":"1e3"},{"unknown":True}])
def test_invalid_configuration_rolls_back(flow,change):
    client,db,_=prepare(flow)
    assert save(client,change).status_code==422
    assert db.scalar(text("SELECT count(*) FROM business_settings"))==0


def test_shipping_validation_and_immutable_settings(flow):
    client,db,_=prepare(flow)
    method={"id":str(uuid4()),"title_fa":"پست","title_en":"Post","provinces":["تهران"],"base_amount":"30000","per_kg_amount":"1000.25","maximum_weight_grams":20000,"active":True}
    assert save(client,{"shipping_methods":[method,method]}).status_code==422
    result=save(client,{"shipping_methods":[method]})
    assert result.status_code==200,result.text
    assert "shipping_methods" not in client.get("/api/v1/admin/settings").json()["missing"]
    assert save(client,{"shipping_methods":[]},version=1).status_code==200
    assert client.get(f"/api/v1/admin/settings/versions/{result.json()['revision_id']}").json()["content"]["shipping_methods"]==[{**method,"free_above_amount":None,"carrier":"manual","packaging_weight_grams":None,"padding_cm":None}]


def test_permissions_origin_csrf_and_atomic_outbox(flow,monkeypatch):
    client,db,owner=prepare(flow,False)
    assert client.get("/api/v1/admin/settings").status_code==403
    assert save(client).status_code==403
    SqlAccountManagement(db).bootstrap(owner,"Test access")
    db.commit()
    assert client.put(f"/api/v1/admin/settings/versions/{uuid4()}",headers={"Origin":"https://other.example"},json={"content":{},"expected_version":0,"reason":"Reviewed"}).status_code==403
    csrf=client.headers.pop("X-CSRF-Token")
    assert save(client).status_code==403
    client.headers["X-CSRF-Token"]=csrf
    import nilart.contexts.business.router as module
    def broken(*args,**kwargs):
        raise RuntimeError("Outbox unavailable")
    monkeypatch.setattr(module,"enqueue",broken)
    with pytest.raises(RuntimeError,match="Outbox unavailable"):
        save(client)
    assert db.scalar(text("SELECT count(*) FROM business_settings"))==0
    assert db.scalar(text("SELECT count(*) FROM business_setting_versions"))==0
    assert db.scalar(text("SELECT count(*) FROM identity_audits WHERE action='business.settings_saved'"))==0


def test_missing_explicit_zero_commission_values():
    value=Settings(commission_base_amount="0",commission_complexity_amount="0",commission_digital_amount="0",commission_physical_amount="0",commission_revision_limit=0)
    assert not any(k.startswith("commission_") and not k.startswith("commission_terms") for k in missing(value))


@pytest.mark.parametrize("change,status", [("rotate", 403), ("revoke", 401), ("permission", 403)])
def test_settings_write_rechecks_live_session_and_permission(flow, monkeypatch, change, status):
    from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository

    client, db, owner = prepare(flow)
    original = SqlIdentityRepository.session_account
    original_roles = SqlIdentityRepository.roles

    def session(self, digest, now, *, lock=False):
        result = original(self, digest, now, lock=lock)
        if not lock:
            if change == "revoke":
                self.session.execute(
                    text("DELETE FROM identity_sessions WHERE token_hash=:token"), {"token": digest}
                )
            elif change == "rotate":
                self.rotate_csrf(digest, "changed-nonce", now)
        return result

    def roles(self, account_id, lock=False):
        if lock and change == "permission":
            self.session.execute(text("DELETE FROM identity_account_roles WHERE role='admin'"))
        return original_roles(self, account_id, lock=lock)

    monkeypatch.setattr(SqlIdentityRepository, "session_account", session)
    monkeypatch.setattr(SqlIdentityRepository, "roles", roles)
    assert save(client).status_code == status
    assert db.scalar(text("SELECT count(*) FROM business_settings")) == 0
