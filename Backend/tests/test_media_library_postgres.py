import base64
import importlib.util
from io import BytesIO
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from PIL import Image
from sqlalchemy import text
from test_content_pages_postgres import prepare as prepare_content
from test_identity_otp_postgres import flow as flow


def prepare(flow,staff=True):
    client,db,_=prepare_content(flow,staff)
    directory=Path(__file__).parents[1]/"migrations/versions"
    with Operations.context(MigrationContext.configure(db.connection())):
        for file in ["0002_catalog.py","0003_catalog_foundation.py","0037_media_library.py"]:
            spec=importlib.util.spec_from_file_location(file,directory/file)
            module=importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            module.upgrade()
    product,sku=uuid4(),uuid4()
    db.execute(text("INSERT INTO catalog_products(id,slug,title_fa,title_en) VALUES(:id,'demo-product','محصول آزمایش','Test product')"),{"id":product})
    db.execute(text("INSERT INTO catalog_skus(id,product_id,code) VALUES(:id,:product,'DEMO-SKU')"),{"id":sku,"product":product})
    db.commit()
    return client,db,sku


def image(color="red"):
    buffer=BytesIO()
    Image.new("RGB",(2,2),color).save(buffer,format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()


def metadata(**changes):
    return {"title_fa":"تصویر تأییدشده","title_en":"Reviewed image","alt_fa":"نمونه کاغذ","alt_en":"Paper sample","sku_id":None,"print_size":"","notes":"Private staff note",**changes}


def save(client,id=None,key=None,version=0,**changes):
    return client.put(f"/api/v1/admin/media/{id or uuid4()}/versions/{key or uuid4()}",json={"expected_version":version,"action":"draft","purpose":"public_image","metadata":metadata(),"file_name":"sample.png","content_base64":image(),"reason":"Reviewed media file",**changes})


def test_media_versions_publication_draft_isolation_and_immutable_files(flow):
    client,db,sku=prepare(flow)
    id,key=uuid4(),uuid4()
    first=save(client,id,key)
    assert first.status_code==200,first.text
    assert save(client,id,key).json()==first.json()
    assert save(client,id,key,content_base64=image("blue")).status_code==409
    assert client.get(f"/api/v1/media/{id}/content").status_code==404
    published=save(client,id,version=1,action="publish",content_base64=None)
    assert published.status_code==200,published.text
    binary=client.get(f"/api/v1/media/{id}/content")
    assert binary.status_code==200 and binary.content==base64.b64decode(image())
    assert binary.headers["content-type"]=="image/png"
    assert binary.headers["x-content-type-options"]=="nosniff"
    changed=save(client,id,version=2,content_base64=image("blue"))
    assert changed.status_code==200,changed.text
    assert client.get(f"/api/v1/media/{id}/content").content==binary.content
    assert client.get(f"/api/v1/admin/media/{id}/versions/{key}/content").content==binary.content
    assert client.get(f"/api/v1/admin/media/{id}/versions?limit=1").json()["next_before_version"]==3
    assert save(client,id,version=3,action="unpublish",content_base64=None).status_code==200
    assert client.get(f"/api/v1/media/{id}/content").status_code==404
    assert db.scalar(text("SELECT count(*) FROM media_blobs"))==2


def test_private_print_binding_cannot_be_published_or_changed_into_public(flow):
    client,db,sku=prepare(flow)
    id,key=uuid4(),uuid4()
    first=save(client,id,key,purpose="print_file",metadata=metadata(sku_id=str(sku),print_size="A5, reviewed portrait orientation"))
    assert first.status_code==200,first.text
    assert client.get(f"/api/v1/media/{id}/content").status_code==404
    assert save(client,id,version=1,purpose="print_file",action="publish",metadata=metadata(sku_id=str(sku),print_size="A5")).status_code==422
    assert save(client,id,version=1,purpose="public_image",action="publish").json()["code"]=="media_purpose_immutable"
    assert save(client,metadata=metadata(sku_id=str(uuid4()))).json()["code"]=="media_sku_not_found"
    assert client.get(f"/api/v1/admin/media/{id}/versions/{key}/content").status_code==200


@pytest.mark.parametrize("change",[{"file_name":"../secret.png"},{"file_name":"sample.jpg"},{"content_base64":"not-base64!"},{"content_base64":base64.b64encode(b"not an image").decode()},{"purpose":"print_file"},{"action":"publish","metadata":metadata(alt_fa="")},{"file_name":"public.pdf"},{"metadata":metadata(notes="bad\x00notes")}])
def test_invalid_media_never_writes_blob_or_publication(flow,change):
    client,db,sku=prepare(flow)
    response=save(client,**change)
    assert response.status_code==422,response.text
    assert db.scalar(text("SELECT count(*) FROM media_assets"))==0
    assert db.scalar(text("SELECT count(*) FROM media_blobs"))==0


def test_media_search_receipt_scope_no_implicit_rename_and_exact_replay(flow):
    client,db,sku=prepare(flow)
    id,key=uuid4(),uuid4()
    first=save(client,id,key)
    second_key=uuid4()
    second=save(client,id,second_key,version=1,content_base64=None,metadata=metadata(title_en="Revised image"))
    assert second.status_code==200,second.text
    assert save(client,id,version=2,file_name="renamed.png",content_base64=None).status_code==422
    assert save(client,id,version=2,content_base64=image("blue")).status_code==200
    assert save(client,id,second_key,version=1,content_base64=None,metadata=metadata(title_en="Revised image")).json()==second.json()
    assert client.get("/api/v1/admin/media?q=%").json()["items"]==[]
    assert client.get("/api/v1/admin/media?q=Revised").json()["items"]==[]
    assert client.get("/api/v1/admin/media?q=sample&purpose=public_image").json()["items"][0]["id"]==str(id)
    assert client.get(f"/api/v1/admin/media/{uuid4()}/versions/{key}").status_code==404
    assert client.get("/api/v1/admin/media/choices/skus?q=DEMO").json()["items"][0]["id"]==str(sku)
    assert client.get(f"/api/v1/admin/media/{id}/versions/{key}").json()==first.json()


def test_media_outbox_failure_is_atomic_and_corrupt_blob_is_not_served(flow,monkeypatch):
    client,db,sku=prepare(flow)
    import nilart.contexts.media.router as module
    original=module.enqueue
    def broken(*args,**kwargs):
        raise RuntimeError("No outbox")
    monkeypatch.setattr(module,"enqueue",broken)
    with pytest.raises(RuntimeError,match="No outbox"):
        save(client,action="publish")
    assert db.scalar(text("SELECT count(*) FROM media_assets"))==0
    assert db.scalar(text("SELECT count(*) FROM media_blobs"))==0
    monkeypatch.setattr(module,"enqueue",original)
    id=uuid4()
    saved=save(client,id,action="publish")
    assert saved.status_code==200
    db.execute(text("UPDATE media_blobs SET content=decode(repeat('00',size),'hex')"))
    db.commit()
    assert client.get(f"/api/v1/media/{id}/content").status_code==503


def test_media_permissions_and_private_content_require_fresh_session(flow):
    client,db,sku=prepare(flow,False)
    assert client.get("/api/v1/admin/media").status_code==403
    assert save(client).status_code==403
    assert client.get(f"/api/v1/admin/media/{uuid4()}/versions/{uuid4()}/content").status_code==403
    assert client.get(f"/api/v1/media/{uuid4()}/content").status_code==404


@pytest.mark.parametrize("change,status", [("rotate", 403), ("revoke", 401), ("permission", 403)])
def test_media_write_rechecks_live_session_and_permission(flow, monkeypatch, change, status):
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
    assert db.scalar(text("SELECT count(*) FROM media_assets")) == 0


def test_public_thumbnail_is_small_webp_and_revocation_is_enforced(flow):
    client,db,sku=prepare(flow)
    id=uuid4();key=uuid4()
    payload=BytesIO();Image.new('RGB',(1600,1200),'#a06238').save(payload,'JPEG',quality=95)
    r=save(client,id,key,action='publish',file_name='cover.jpg',content_base64=base64.b64encode(payload.getvalue()).decode())
    assert r.status_code==200,r.text
    original=client.get(f'/api/v1/media/{id}/versions/{key}/content')
    thumbnail=client.get(f'/api/v1/media/{id}/versions/{key}/content?thumbnail=true')
    assert thumbnail.status_code==200 and thumbnail.headers['content-type']=='image/webp'
    with Image.open(BytesIO(thumbnail.content)) as preview:assert preview.size==(480,360)
    assert len(thumbnail.content)<len(original.content)
    assert save(client,id,version=1,action='unpublish',content_base64=None,file_name='cover.jpg').status_code==200
    assert client.get(f'/api/v1/media/{id}/versions/{key}/content?thumbnail=true').status_code==404
