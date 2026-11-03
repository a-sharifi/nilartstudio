import importlib.util
import struct
import zlib
from pathlib import Path
from uuid import UUID, uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from test_identity_otp_postgres import flow as flow
from test_identity_otp_postgres import register

from nilart.contexts.commissions.reviews import publish_review, validate_preview


def png():
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(b"\0\xff\0\0")) + chunk(b"IEND", b"")


def prepare(flow):
    client, db, sms = flow
    directory = Path(__file__).resolve().parents[1] / "migrations/versions"
    with Operations.context(MigrationContext.configure(db.connection())):
        for filename in ("0011_commissions.py", "0024_commission_reviews.py"):
            spec = importlib.util.spec_from_file_location(filename, directory / filename)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            module.upgrade()
    _, login = register(client, sms)
    client.headers["X-CSRF-Token"] = login.json()["csrf_token"]
    body = dict(submission_id=str(uuid4()), idea="Private portrait", changes="", style="Oil", size="40 x 60 cm", execution="handmade")
    saved = client.post("/api/v1/account/commissions", json=body)
    assert saved.status_code == 200, saved.text
    return client, db, UUID(login.json()["account_id"]), UUID(saved.json()["id"])


def publish(db, id, actor, version=0, allowance=1):
    artwork = publish_review(db, id, actor=actor, expected_version=version, preview=png(), note="Artist's private note", agreement="AGREED-TERMS-1", revision_allowance=allowance)
    db.commit()
    return artwork


def decision(version, artwork, action="approve"):
    return dict(version=version, artwork_id=str(artwork), action=action, details="Simplify background" if action == "revise" else "", acknowledged=True)


def test_owned_history_preview_and_idempotent_approval(flow):
    client, db, owner, id = prepare(flow)
    initial = client.get(f"/api/v1/account/commissions/{id}")
    assert initial.status_code == 200, initial.text
    assert initial.json()["status"] == "awaiting_review" and initial.json()["artwork"] == []
    assert client.get("/api/v1/account/commissions?limit=1").json()["items"][0]["id"] == str(id)
    artwork = publish(db, id, owner)
    asset = client.get(f"/api/v1/account/commissions/{id}/artwork/{artwork}/preview")
    assert asset.content == png() and asset.headers["content-type"] == "image/png"
    assert asset.headers["cache-control"] == "no-store"
    detail = client.get(f"/api/v1/account/commissions/{id}").json()
    assert "preview" not in detail["artwork"][0] and "account_id" not in detail
    key = uuid4()
    url = f"/api/v1/account/commissions/{id}/decisions/{key}"
    body = decision(1, artwork)
    approved = client.put(url, json=body)
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "approved"
    assert client.put(url, json=body).json() == approved.json()
    assert client.put(url, json=decision(1, artwork, "revise")).status_code == 409
    assert client.put(url.replace(str(key), str(uuid4())), json=decision(2, artwork)).status_code == 409
    assert db.execute(text("SELECT count(*) FROM commission_artwork_decisions")).scalar_one() == 1
    audit = str(db.execute(text("SELECT changes FROM identity_audits WHERE action LIKE 'commissions.%'")).scalars().all())
    assert "Private portrait" not in audit and "Artist's private note" not in audit
    client.cookies.clear()
    assert client.get(f"/api/v1/account/commissions/{id}/artwork/{artwork}/preview").status_code == 401


def test_revision_limit_and_stale_version_cannot_approve(flow):
    client, db, owner, id = prepare(flow)
    first = publish(db, id, owner)
    assert client.put(f"/api/v1/account/commissions/{id}/decisions/{uuid4()}", json=decision(1, first, "revise")).status_code == 200
    second = publish(db, id, owner, version=2)
    url = f"/api/v1/account/commissions/{id}/decisions/{uuid4()}"
    assert client.put(url, json=decision(3, first)).status_code == 409
    assert client.put(url, json=decision(1, second)).status_code == 409
    assert client.put(url, json=decision(3, second, "revise")).json()["code"] == "revision_allowance_exhausted"
    assert client.put(url, json={**decision(3, second), "acknowledged": False}).status_code == 422
    assert client.put(url, json=decision(3, second)).status_code == 200


def test_foreign_commission_and_preview_are_not_disclosed(flow):
    client, db, owner, id = prepare(flow)
    artwork = publish(db, id, owner)
    foreign = uuid4()
    db.execute(text("INSERT INTO identity_accounts(id,phone,password_hash,phone_verified,blocked,created_at) SELECT :foreign,'+989123456780',password_hash,true,false,now() FROM identity_accounts WHERE id=:owner"), {"foreign": foreign, "owner": owner})
    db.execute(text("UPDATE commission_requests SET account_id=:foreign WHERE id=:id"), {"foreign": foreign, "id": id})
    db.commit()
    assert client.get("/api/v1/account/commissions").json()["items"] == []
    assert client.get(f"/api/v1/account/commissions/{id}").status_code == 404
    assert client.get(f"/api/v1/account/commissions/{id}/artwork/{artwork}/preview").status_code == 404
    assert client.put(f"/api/v1/account/commissions/{id}/decisions/{uuid4()}", json=decision(1, artwork)).status_code == 404


def test_preview_validation_rejects_active_corrupt_and_oversized_content():
    validate_preview(png())
    for content in (b"<svg onload='evil'/>", png()[:-5], png() + b"trailing data", b"x" * (5 * 1024 * 1024 + 1)):
        with pytest.raises(ValueError):
            validate_preview(content)


def test_staff_publication_rechecks_permissions_and_is_idempotent(flow):
    import base64
    client, db, owner, id = prepare(flow)
    artwork = uuid4()
    url = f"/api/v1/admin/commissions/{id}/artwork/{artwork}"
    body = dict(version=0, preview_png=base64.b64encode(png()).decode(), note="Private note", agreement="AGREED-TERMS", revision_allowance=1, accepted_terms_confirmed=True)
    assert client.put(url, json=body).status_code == 403
    db.execute(text("INSERT INTO identity_account_roles(account_id,role) VALUES(:id,'admin')"), {"id": owner})
    db.commit()
    assert client.put(url, json={**body, "accepted_terms_confirmed": False}).status_code == 422
    assert client.put(url, json=body, headers={"Origin": "https://foreign.invalid"}).status_code == 403
    saved = client.put(url, json=body)
    assert saved.status_code == 200, saved.text
    assert saved.json()["status"] == "awaiting_customer"
    assert client.put(url, json=body).json() == saved.json()
    assert client.put(url, json={**body, "note": "Different"}).status_code == 409
    assert db.execute(text("SELECT count(*) FROM commission_artwork_versions")).scalar_one() == 1
    assert db.execute(text("SELECT count(*) FROM customer_records WHERE kind='notification' AND data->>'category'='artwork'")).scalar_one() == 1


def test_history_pagination_is_owned_stable_and_newest_first(flow):
    client, db, owner, id = prepare(flow)
    for index in range(2):
        saved = client.post("/api/v1/account/commissions", json=dict(submission_id=str(uuid4()), idea=f"Another portrait {index}", changes="", style="Oil", size="40 x 60", execution="handmade"))
        assert saved.status_code == 200
    seen, cursor = [], None
    for index in range(3):
        page = client.get("/api/v1/account/commissions?limit=1" + (f"&cursor={cursor}" if cursor else ""))
        assert page.status_code == 200, page.text
        item = page.json()["items"][0]
        seen.append(item["id"])
        cursor = page.json()["next_cursor"]
        if index < 2:
            assert cursor
    assert cursor is None and len(set(seen)) == 3 and seen[-1] == str(id)
    assert client.get(f"/api/v1/account/commissions?cursor={uuid4()}").status_code == 404


def test_staff_queue_detail_and_preview_require_current_management_access(flow):
    client, db, owner, id = prepare(flow)
    artwork = publish(db, id, owner)
    base = "/api/v1/admin/commissions"
    preview_url = f"{base}/{id}/artwork/{artwork}/preview"
    for url in (base, f"{base}/{id}", preview_url):
        assert client.get(url).status_code == 403
    db.execute(text("INSERT INTO identity_account_roles(account_id,role) VALUES(:id,'admin')"), {"id": owner})
    db.commit()
    assert client.get(base).json()["items"][0]["id"] == str(id)
    assert client.get(f"{base}/{id}").json()["agreement"] == "AGREED-TERMS-1"
    response = client.get(preview_url)
    assert response.status_code == 200 and response.content == png()
    assert response.headers["cache-control"] == "no-store"
    assert client.get(f"{base}/{uuid4()}").status_code == 404
    assert client.get(f"{base}?cursor={uuid4()}").status_code == 404
    assert client.get(f"{base}/{uuid4()}/artwork/{artwork}/preview").status_code == 404
    db.execute(text("DELETE FROM identity_account_roles WHERE account_id=:id AND role='admin'"), {"id": owner})
    db.commit()
    assert client.get(preview_url).status_code == 403
    client.cookies.clear()
    assert client.get(base).status_code == 401


def test_customer_review_filter_precedes_pagination(flow):
    client, db, owner, id = prepare(flow)
    publish(db, id, owner)
    another = client.post("/api/v1/account/commissions", json=dict(submission_id=str(uuid4()), idea="Second preview", changes="", style="Oil", size="40 cm", execution="digital"))
    second = UUID(another.json()["id"])
    publish(db, second, owner)
    client.post("/api/v1/account/commissions", json=dict(submission_id=str(uuid4()), idea="Not ready", changes="", style="Oil", size="40 cm", execution="digital"))
    first = client.get("/api/v1/account/commissions?status=awaiting_customer&limit=1")
    assert first.status_code == 200, first.text
    assert first.json()["items"][0]["status"] == "awaiting_customer"
    assert first.json()["next_cursor"]
    cursor = first.json()["next_cursor"]
    remaining = client.get(f"/api/v1/account/commissions?status=awaiting_customer&limit=1&cursor={cursor}")
    assert remaining.status_code == 200, remaining.text
    assert remaining.json()["next_cursor"] is None
    assert {first.json()["items"][0]["id"], remaining.json()["items"][0]["id"]} == {str(id), str(second)}
    assert client.get("/api/v1/account/commissions?status=approved").json()["items"] == []
    assert client.get("/api/v1/account/commissions?status=unknown").status_code == 422


def test_commission_search_is_literal_and_filters_before_paging(flow):
    client, db, owner, id = prepare(flow)
    for idea in ("Match 100% portrait", "Match 100% second", "Unrelated"):
        response = client.post("/api/v1/account/commissions", json=dict(submission_id=str(uuid4()), idea=idea, changes="blue background", style="Ink", size="20 cm", execution="digital"))
        assert response.status_code == 200
    first = client.get("/api/v1/account/commissions", params={"q": "  MATCH 100%  ", "limit": 1, "status": "awaiting_review"}).json()
    assert len(first["items"]) == 1 and first["next_cursor"]
    second = client.get("/api/v1/account/commissions", params={"q": "match 100%", "limit": 1, "cursor": first["next_cursor"]}).json()
    assert len(second["items"]) == 1 and second["next_cursor"] is None
    assert second["items"][0]["id"] != first["items"][0]["id"]
    assert client.get("/api/v1/account/commissions", params={"q": "blue background"}).json()["items"]
    assert client.get("/api/v1/account/commissions", params={"q": "_"}).json()["items"] == []
    assert client.get("/api/v1/account/commissions", params={"q": "x" * 201}).status_code == 422


def test_staff_queue_filters_all_records_before_pagination(flow):
    client, db, owner, id = prepare(flow)
    db.execute(text("INSERT INTO identity_account_roles(account_id,role) VALUES(:id,'admin')"), {"id": owner})
    db.commit()
    response = client.post("/api/v1/account/commissions", json={"submission_id": str(uuid4()), "idea": "Another portrait", "changes": "", "style": "Oil", "size": "30 cm", "execution": "digital"})
    assert response.status_code == 200
    other = response.json()["id"]
    base = "/api/v1/admin/commissions"
    first = client.get(base, params={"q": "portrait", "status": "awaiting_review", "limit": 1}).json()
    second = client.get(base, params={"q": "portrait", "status": "awaiting_review", "limit": 1, "cursor": first["next_cursor"]}).json()
    assert {first["items"][0]["id"], second["items"][0]["id"]} == {str(id), other}
    assert second["next_cursor"] is None
    assert [x["id"] for x in client.get(base, params={"q": "another"}).json()["items"]] == [other]
    assert client.get(base, params={"q": "%"}).json()["items"] == []
    assert client.get(base, params={"status": "approved"}).json()["items"] == []
    assert client.get(base, params={"status": "invalid"}).status_code == 422


def test_admin_commission_summary_counts_recorded_statuses_only(flow):
    from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
    client, db, owner, id = prepare(flow)
    root = "/api/v1/admin/commissions/overview/summary"
    assert client.get(root).status_code == 403
    SqlAccountManagement(db).bootstrap(str(owner), "Isolated commission summary access")
    db.commit()
    result = client.get(root)
    assert result.json() == {"total_commissions": 1, "statuses": {"awaiting_review": 1}}
    assert "Private portrait" not in result.text and str(owner) not in result.text
    publish(db, id, owner)
    assert client.get(root).json() == {"total_commissions": 1, "statuses": {"awaiting_customer": 1}}
    db.execute(text("DELETE FROM commission_artwork_versions WHERE commission_id=:id"), {"id": id})
    db.execute(text("DELETE FROM commission_requests WHERE id=:id"), {"id": id})
    db.commit()
    assert client.get(root).json() == {"total_commissions": 0, "statuses": {}}
    client.cookies.clear()
    assert client.get(root).status_code == 401
