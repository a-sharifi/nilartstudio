import importlib.util
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from test_business_settings_postgres import prepare as prepare_settings
from test_identity_otp_postgres import flow as flow


def prepare(flow,staff=True):
    client,db,owner=prepare_settings(flow,staff)
    path=Path(__file__).parents[1]/"migrations/versions/0036_content_pages.py"
    spec=importlib.util.spec_from_file_location("content_migration",path)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(db.connection())):
        module.upgrade()
    db.commit()
    return client,db,owner


def content(**changes):
    return {"title_fa":"قوانین تأییدشده","title_en":"Approved terms","body_fa":"متن تأییدشده","body_en":"Reviewed copy <script>plain text</script>","description_fa":"","description_en":"",**changes}


def save(client,version=0,action="draft",key=None,slug="terms",copy=None,reason="Reviewed policy"):
    return client.put(f"/api/v1/admin/content/{slug}/versions/{key or uuid4()}",json={"expected_version":version,"action":action,"content":content() if copy is None else copy,"reason":reason})


def test_draft_publication_edit_and_unpublish_preserve_approved_snapshot(flow):
    client,db,_=prepare(flow)
    assert client.get("/api/v1/content/terms").status_code==404
    assert client.get("/api/v1/admin/content/terms").json()["version"]==0
    assert len(client.get("/api/v1/admin/content").json())==7
    assert save(client).status_code==200
    assert client.get("/api/v1/content/terms").status_code==404
    first=save(client,version=1,action="publish")
    assert first.status_code==200,first.text
    assert client.get("/api/v1/content/terms").json()["revision_id"]==first.json()["revision_id"]
    assert save(client,version=2,copy=content(body_en="Private draft change")).status_code==200
    assert client.get("/api/v1/content/terms").json()["content"]["body_en"]==content()["body_en"]
    assert save(client,version=3,action="unpublish",copy=content(body_en="Private draft change")).status_code==200
    assert client.get("/api/v1/content/terms").status_code==404
    assert client.get(f"/api/v1/admin/content/terms/versions/{first.json()['revision_id']}").json()["content"]==content()
    assert db.scalar(text("SELECT count(*) FROM identity_audits WHERE action='content.page_saved'"))==4


def test_exact_receipt_replay_conflict_scope_and_history(flow):
    client,db,_=prepare(flow)
    key=uuid4()
    first=save(client,key=key)
    assert first.status_code==200
    assert save(client,key=key).json()==first.json()
    assert save(client,key=key,slug="privacy").status_code==409
    assert save(client,key=key,action="publish").status_code==409
    assert save(client,version=0).status_code==409
    assert save(client,version=1,action="publish").status_code==200
    page=client.get("/api/v1/admin/content/terms/versions?limit=1").json()
    assert page["items"][0]["version"]==2 and page["next_before_version"]==2
    assert client.get("/api/v1/admin/content/terms/versions?before=2").json()["items"]==[first.json()]
    assert client.get(f"/api/v1/admin/content/privacy/versions/{key}").status_code==404


@pytest.mark.parametrize("change",[{"title_fa":""},{"title_en":""},{"body_fa":""},{"body_en":""},{"body_en":"bad\x00copy"}])
def test_publication_rejects_incomplete_or_invalid_copy(flow,change):
    client,db,_=prepare(flow)
    assert save(client,action="publish",copy=content(**change)).status_code==422
    assert db.scalar(text("SELECT count(*) FROM content_pages"))==0


def test_permissions_csrf_atomic_publication_and_no_private_public_leak(flow,monkeypatch):
    client,db,_=prepare(flow,False)
    assert client.get("/api/v1/admin/content").status_code==403
    assert save(client,action="publish").status_code==403
    assert client.get("/api/v1/content/terms").status_code==404


def test_publication_outbox_failure_is_atomic(flow,monkeypatch):
    client,db,_=prepare(flow)
    import nilart.contexts.content.router as router
    def broken(*args,**kwargs):
        raise RuntimeError("Outbox failed")
    monkeypatch.setattr(router,"enqueue",broken)
    with pytest.raises(RuntimeError,match="Outbox failed"):
        save(client,action="publish")
    assert db.scalar(text("SELECT count(*) FROM content_pages"))==0
    assert db.scalar(text("SELECT count(*) FROM content_page_versions"))==0
    assert client.get("/api/v1/content/terms").status_code==404


@pytest.mark.parametrize("change,status", [("rotate", 403), ("revoke", 401), ("permission", 403)])
def test_content_write_rechecks_live_session_and_permission(flow, monkeypatch, change, status):
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
    assert db.scalar(text("SELECT count(*) FROM content_pages")) == 0
