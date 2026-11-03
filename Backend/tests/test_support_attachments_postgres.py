import base64
import importlib.util
from pathlib import Path
from uuid import UUID, uuid4

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from test_commission_reviews_postgres import png
from test_customer_panel_postgres import setup
from test_identity_otp_postgres import flow as flow


def prepare(flow):
    client, db, owner = setup(flow)
    path = Path(__file__).resolve().parents[1] / "migrations/versions/0028_support_attachments.py"
    with Operations.context(MigrationContext.configure(db.connection())):
        spec = importlib.util.spec_from_file_location("attachments_migration", path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        module.upgrade()
    ticket = uuid4()
    result = client.put(f"/api/v1/account/panel/ticket/{ticket}", json={"version": 0, "data": {"topic": "technical", "subject": "Private screenshot issue", "body": "Please review this screenshot", "request_id": str(uuid4())}})
    assert result.status_code == 200, result.text
    return client, db, owner, ticket


def payload():
    return {"file_name": "تصویر.png", "png_base64": base64.b64encode(png()).decode()}


def test_private_upload_replay_download_and_staff_access(flow):
    client, db, owner, ticket = prepare(flow)
    id = uuid4()
    base = f"/api/v1/account/support/{ticket}/attachments"
    saved = client.put(f"{base}/{id}", json=payload())
    assert saved.status_code == 200, saved.text
    assert client.put(f"{base}/{id}", json=payload()).json() == saved.json()
    assert client.put(f"{base}/{id}", json={**payload(), "file_name": "other.png"}).status_code == 409
    assert len(client.get(base).json()) == 1
    ticket_record = client.get(f"/api/v1/account/panel/ticket/{ticket}").json()
    assert ticket_record["version"] == 1 and ticket_record["data"]["status"] == "awaiting_reply"
    response = client.get(f"{base}/{id}/content")
    assert response.status_code == 200 and response.content == png()
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["content-type"] == "image/png"
    assert "filename*=UTF-8''" in response.headers["content-disposition"]
    assert "content" not in saved.json() and "account_id" not in saved.json()
    staff = f"/api/v1/admin/support/{ticket}/attachments"
    assert client.get(staff).status_code == 403
    db.execute(text("INSERT INTO identity_account_roles(account_id,role) VALUES(:id,'admin')"), {"id": owner})
    db.commit()
    assert client.get(staff).json()[0]["id"] == str(id)
    assert client.get(f"{staff}/{id}/content").content == png()
    db.execute(text("DELETE FROM identity_account_roles WHERE account_id=:id AND role='admin'"), {"id": owner})
    db.commit()
    assert client.get(f"{staff}/{id}/content").status_code == 403
    assert db.execute(text("SELECT count(*) FROM outbox_events WHERE event_type='support.attachment_added'")).scalar() == 1
    assert "تصویر" not in str(db.execute(text("SELECT changes FROM identity_audits WHERE action='support.attachment_added'")).scalars().all())
    client.headers.pop("X-CSRF-Token")
    assert client.put(f"{base}/{id}", json=payload()).status_code == 403
    client.cookies.clear()
    assert client.get(base).status_code == 401


def test_attachment_limits_closed_tickets_and_invalid_content(flow):
    client, db, owner, ticket = prepare(flow)
    base = f"/api/v1/account/support/{ticket}/attachments"
    for body in ({**payload(), "png_base64": "bad"}, {**payload(), "png_base64": base64.b64encode(b"<svg onload='evil'/>").decode()}, {**payload(), "file_name": "../file.png"}, {**payload(), "file_name": "file.pdf"}):
        assert client.put(f"{base}/{uuid4()}", json=body).status_code == 422
    ids = [uuid4() for _ in range(5)]
    for id in ids:
        assert client.put(f"{base}/{id}", json=payload()).status_code == 200
    assert client.put(f"{base}/{uuid4()}", json=payload()).status_code == 409
    db.execute(text("UPDATE customer_records SET data=jsonb_set(data,'{status}','\"closed\"') WHERE id=:id"), {"id": ticket})
    db.commit()
    assert client.put(f"{base}/{ids[0]}", json=payload()).status_code == 200
    assert client.put(f"{base}/{uuid4()}", json=payload()).status_code == 409
    assert client.get(f"{base}/{ids[0]}/content").status_code == 200


def test_foreign_ticket_and_corruption_are_not_exposed(flow):
    client, db, owner, ticket = prepare(flow)
    id = uuid4()
    base = f"/api/v1/account/support/{ticket}/attachments"
    assert client.put(f"{base}/{id}", json=payload()).status_code == 200
    db.execute(text("UPDATE support_attachments SET sha256=:hash WHERE id=:id"), {"id": id, "hash": "0" * 64})
    db.commit()
    assert client.get(f"{base}/{id}/content").status_code == 503
    foreign = uuid4()
    db.execute(text("INSERT INTO identity_accounts(id,phone,password_hash,phone_verified,blocked,created_at) SELECT :foreign,'+989123456780',password_hash,true,false,now() FROM identity_accounts WHERE id=:owner"), {"foreign": foreign, "owner": owner})
    db.execute(text("UPDATE customer_records SET account_id=:foreign WHERE id=:id"), {"id": ticket, "foreign": foreign})
    db.commit()
    assert client.get(base).status_code == 404
    assert client.get(f"{base}/{id}/content").status_code == 404
    assert client.put(f"{base}/{uuid4()}", json=payload()).status_code == 404


def test_current_read_only_permissions_deny_upload_without_changing_ticket(flow):
    client, db, owner, ticket = prepare(flow)
    base = f"/api/v1/account/support/{ticket}/attachments"
    db.execute(text("INSERT INTO identity_permission_overrides(account_id,permission,allowed) VALUES(:id,'account.write_self',false)"), {"id": owner})
    db.commit()
    assert client.get(base).status_code == 200
    assert client.put(f"{base}/{uuid4()}", json=payload()).status_code == 403
    assert client.get(f"/api/v1/account/panel/ticket/{ticket}").json()["version"] == 0
    assert db.execute(text("SELECT count(*) FROM support_attachments")).scalar() == 0


def test_private_jpeg_pdf_upload_replay_content_and_legacy_png(flow):
    from test_support_attachment_formats import jpeg, pdf
    client, db, owner, ticket = prepare(flow)
    base = f"/api/v1/account/support/{ticket}/attachments"
    for name, content, mime in [("تصویر.jpg", jpeg(), "image/jpeg"), ("مدرک.pdf", pdf(), "application/pdf")]:
        key = uuid4()
        body = {"file_name": name, "content_base64": base64.b64encode(content).decode()}
        saved = client.put(f"{base}/{key}", json=body)
        assert saved.status_code == 200, saved.text
        assert saved.json()["media_type"] == mime
        assert client.put(f"{base}/{key}", json=body).json() == saved.json()
        result = client.get(f"{base}/{key}/content")
        assert result.status_code == 200 and result.content == content
        assert result.headers["content-type"] == mime
        assert result.headers["cache-control"] == "no-store"
        assert result.headers["x-content-type-options"] == "nosniff"
        assert "attachment;" in result.headers["content-disposition"]
    key = uuid4()
    assert client.put(f"{base}/{key}", json=payload()).status_code == 200
    assert len(client.get(base).json()) == 3
    assert client.put(f"{base}/{uuid4()}", json={"file_name":"fake.pdf","content_base64":base64.b64encode(png()).decode()}).status_code == 422


def test_staff_upload_notifies_customer_once_and_preserves_ownership(flow):
    from test_support_attachment_formats import pdf
    client, db, owner, ticket = prepare(flow)
    key = uuid4()
    staff = f"/api/v1/admin/support/{ticket}/attachments/{key}"
    body = {"file_name": "support-guide.pdf", "content_base64": base64.b64encode(pdf()).decode()}
    assert client.put(staff, json=body).status_code == 403
    db.execute(text("INSERT INTO identity_account_roles(account_id,role) VALUES(:id,'admin')"), {"id": owner})
    db.commit()
    first = client.put(staff, json=body)
    assert first.status_code == 200, first.text
    assert client.put(staff, json=body).json() == first.json()
    row = client.get(f"/api/v1/account/panel/ticket/{ticket}").json()
    assert row["version"] == 1 and row["data"]["status"] == "awaiting_customer"
    notices = db.execute(text("SELECT data FROM customer_records WHERE kind='notification' AND data->>'title_en'='New support attachment'")).scalars().all()
    assert len(notices) == 1 and notices[0]["ticket_id"] == str(ticket)
    assert db.execute(text("SELECT account_id FROM support_attachments WHERE id=:id"), {"id": key}).scalar() == UUID(owner)
    assert client.get(f"/api/v1/account/support/{ticket}/attachments/{key}/content").content == pdf()
    db.execute(text("DELETE FROM identity_account_roles WHERE account_id=:id AND role='admin'"), {"id": owner})
    db.commit()
    assert client.put(staff, json=body).status_code == 403


def test_staff_upload_respects_notification_preference_and_closed_ticket(flow):
    client, db, owner, ticket = prepare(flow)
    db.execute(text("INSERT INTO identity_account_roles(account_id,role) VALUES(:id,'admin')"), {"id": owner})
    db.execute(text("INSERT INTO customer_records(id,account_id,kind,data) VALUES(:id,:owner,'preferences',CAST(:data AS jsonb))"), {"id": uuid4(), "owner": owner, "data": '{"choices":{"support":{"inApp":false}}}'})
    db.commit()
    base = f"/api/v1/admin/support/{ticket}/attachments"
    assert client.put(f"{base}/{uuid4()}", json=payload()).status_code == 200
    assert db.execute(text("SELECT count(*) FROM customer_records WHERE kind='notification' AND data->>'title_en'='New support attachment'")).scalar() == 0
    db.execute(text("UPDATE customer_records SET data=jsonb_set(data,'{status}','\"closed\"') WHERE id=:id"), {"id": ticket})
    db.commit()
    assert client.put(f"{base}/{uuid4()}", json=payload()).status_code == 409


def test_staff_file_for_another_customer_stays_owned_by_that_customer(flow):
    client, db, actor, ticket = prepare(flow)
    owner = uuid4()
    db.execute(text("INSERT INTO identity_accounts(id,phone,password_hash,phone_verified,blocked,created_at) SELECT :id,'+989123456780',password_hash,true,false,now() FROM identity_accounts WHERE id=:actor"), {"id": owner, "actor": actor})
    db.execute(text("UPDATE customer_records SET account_id=:owner WHERE id=:id"), {"owner": owner, "id": ticket})
    db.execute(text("INSERT INTO identity_account_roles(account_id,role) VALUES(:id,'admin')"), {"id": actor})
    db.commit()
    key = uuid4()
    url = f"/api/v1/admin/support/{ticket}/attachments/{key}"
    assert client.put(url, json=payload()).status_code == 200
    assert db.execute(text("SELECT account_id FROM support_attachments WHERE id=:id"), {"id": key}).scalar() == owner
    assert client.get(f"/api/v1/account/support/{ticket}/attachments/{key}/content").status_code == 404
    assert client.get(url + "/content").status_code == 200
    client.headers.pop("X-CSRF-Token")
    assert client.put(f"/api/v1/admin/support/{ticket}/attachments/{uuid4()}", json=payload()).status_code == 403
