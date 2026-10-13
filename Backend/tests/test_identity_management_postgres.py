from uuid import uuid4

import pytest
from sqlalchemy import text
from test_identity_otp_postgres import flow as flow
from test_identity_otp_postgres import register

from nilart.contexts.identity.infrastructure.management import ManagementError, SqlAccountManagement
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.infrastructure.secrets import hash_password, verify_password


def admin(flow):
    client, db, sms = flow
    _, result = register(client, sms)
    owner = result.json()["account_id"]
    SqlAccountManagement(db).bootstrap(owner, "Isolated test bootstrap")
    db.commit()
    client.headers["X-CSRF-Token"] = result.json()["csrf_token"]
    return client, db, owner


def target(db):
    id = uuid4()
    db.execute(text("INSERT INTO identity_accounts(id,phone,password_hash,phone_verified,blocked,created_at) VALUES(:id,'+989123456780',:hash,true,false,now())"), {"id": id, "hash": hash_password("a long secure passphrase")})
    db.execute(text("INSERT INTO identity_account_roles VALUES(:id,'customer')"), {"id": id})
    db.commit()
    return str(id)


def body(**changes):
    return {"version": 0, "roles": ["finance"], "overrides": {"payments.refund": True, "finance.write": False}, "blocked": False, "reason": "Assign responsibilities", **changes}


def test_bootstrap_is_explicit_once_and_audited(flow):
    client, db, sms = flow
    assert db.execute(text("SELECT count(*) FROM identity_account_roles WHERE role='admin'")).scalar_one() == 0
    _, result = register(client, sms)
    repo = SqlAccountManagement(db)
    owner = result.json()["account_id"]
    with pytest.raises(RuntimeError), db.begin_nested():
        repo.bootstrap(owner, "Rollback test")
        raise RuntimeError("rollback")
    assert not SqlIdentityRepository(db).principal(owner).allows("identity.manage")
    assert db.execute(text("SELECT count(*) FROM identity_audits")).scalar_one() == 0
    repo.bootstrap(owner, "Explicit test administrator")
    db.commit()
    assert SqlIdentityRepository(db).principal(owner).allows("identity.manage")
    with pytest.raises(ManagementError, match="administrator_already_exists"):
        repo.bootstrap(owner, "Do not repeat")
    audit = db.execute(text("SELECT actor_id,action,changes FROM identity_audits")).mappings().one()
    assert audit["actor_id"] is None and audit["action"] == "admin.bootstrapped"
    assert "password_hash" not in str(audit["changes"])


def test_admin_access_updates_versions_overrides_and_atomic_audit(flow):
    client, db, owner = admin(flow)
    id = target(db)
    assert client.get("/api/v1/admin/identity/accounts", params={"limit": 1}).status_code == 200
    assert client.get("/api/v1/admin/identity/permissions").status_code == 200
    endpoint = f"/api/v1/admin/identity/accounts/{id}/access"
    saved = client.put(endpoint, json=body())
    assert saved.status_code == 200, saved.text
    assert saved.json()["version"] == 1 and saved.json()["roles"] == ["finance"]
    assert "payments.refund" in saved.json()["permissions"] and "finance.write" not in saved.json()["permissions"]
    assert client.put(endpoint, json=body()).status_code == 409
    audits = client.get(f"/api/v1/admin/identity/accounts/{id}/audits").json()
    assert len(audits) == 1 and audits[0]["actor_id"] == owner
    assert audits[0]["changes"]["before"]["version"] == 0
    assert "password" not in str(audits) and "csrf" not in str(audits) and "token_hash" not in str(audits)
    with pytest.raises(RuntimeError), db.begin_nested():
        SqlAccountManagement(db).update(owner, id, 1, ["customer"], {}, False, "Rollback")
        raise RuntimeError("rollback")
    assert SqlAccountManagement(db).read(id)["roles"] == ["finance"]
    assert db.execute(text("SELECT count(*) FROM identity_audits WHERE account_id=:id"), {"id": id}).scalar_one() == 1


def test_last_manager_validation_and_write_gates(flow):
    client, db, owner = admin(flow)
    endpoint = f"/api/v1/admin/identity/accounts/{owner}/access"
    assert client.put(endpoint, json=body(version=1), headers={"Origin": "https://invalid.example"}).status_code == 403
    assert client.put(endpoint, json=body(version=1), headers={"X-CSRF-Token": "invalid"}).status_code == 403
    for change in [body(version=1, roles=["customer"], overrides={}), body(version=1, roles=["admin"], overrides={"identity.manage": False}), body(version=1, roles=["admin"], blocked=True)]:
        assert client.put(endpoint, json=change).status_code == 409
        assert SqlAccountManagement(db).read(owner)["version"] == 1
    assert client.put(endpoint, json=body(version=1, roles=["admin","admin"])).status_code == 422
    assert client.put(endpoint, json=body(version=True)).status_code == 422
    assert client.put(endpoint, json=body(version=1, overrides={"invented.permission": True})).status_code == 422
    db.execute(text("DELETE FROM identity_account_roles WHERE role='admin'"))
    db.commit()
    assert client.get("/api/v1/admin/identity/accounts").status_code == 403
    assert client.put(endpoint, json=body()).status_code == 403
    client.cookies.clear()
    assert client.get("/api/v1/admin/identity/accounts").status_code == 401


def test_permission_revocation_between_guard_and_mutation(flow, monkeypatch):
    client, db, owner = admin(flow)
    id = target(db)
    original = SqlIdentityRepository.principal
    revoked = False

    def principal(self, account, *, lock=False):
        nonlocal revoked
        result = original(self, account, lock=lock)
        if not lock and not revoked:
            revoked = True
            self.session.execute(text("INSERT INTO identity_permission_overrides VALUES(:id,'identity.manage',false)"), {"id": account})
        return result

    monkeypatch.setattr(SqlIdentityRepository, "principal", principal)
    response = client.put(f"/api/v1/admin/identity/accounts/{id}/access", json=body())
    assert response.status_code == 403
    assert SqlAccountManagement(db).read(id)["version"] == 0


def test_password_change_revokes_sessions_and_hides_credentials(flow, monkeypatch):
    client, db, sms = flow
    _, initial = register(client, sms)
    client.headers["X-CSRF-Token"] = initial.json()["csrf_token"]
    monkeypatch.setattr("nilart.contexts.identity.presentation.security.password_attempt_allowed", lambda *args: True)
    sessions = client.get("/api/v1/account/security/sessions")
    assert sessions.status_code == 200 and sessions.json()[0]["current"]
    assert "token" not in sessions.text and "csrf" not in sessions.text
    response = client.post("/api/v1/account/security/password", json={"current_password": "incorrect", "new_password": "a new secure passphrase"})
    assert response.status_code == 400
    response = client.post("/api/v1/account/security/password", json={"current_password": "a long secure passphrase", "new_password": "a new secure passphrase"})
    assert response.status_code == 200 and response.json()["reauthenticate"]
    assert client.get("/api/v1/auth/session").status_code == 401
    assert db.execute(text("SELECT count(*) FROM identity_sessions")).scalar_one() == 0
    encoded = db.execute(text("SELECT password_hash FROM identity_accounts")).scalar_one()
    assert verify_password("a new secure passphrase", encoded)
    audit = db.execute(text("SELECT changes FROM identity_audits")).scalar_one()
    assert audit == {"all_sessions_revoked": True}


def test_session_revoke_is_owned_and_repeatable(flow):
    client, db, sms = flow
    _, initial = register(client, sms)
    client.headers["X-CSRF-Token"] = initial.json()["csrf_token"]
    before = client.get("/api/v1/account/security/sessions").json()
    assert client.delete(f"/api/v1/account/security/sessions/{uuid4()}").status_code == 204
    assert client.get("/api/v1/account/security/sessions").json() == before
    assert client.delete(f"/api/v1/account/security/sessions/{before[0]['id']}").status_code == 204
    assert client.get("/api/v1/auth/session").status_code == 401


def test_phone_change_is_owned_verified_one_use_and_revokes_sessions(flow, monkeypatch):
    client, db, sms = flow
    _, initial = register(client, sms)
    client.headers["X-CSRF-Token"] = initial.json()["csrf_token"]
    monkeypatch.setattr("nilart.contexts.identity.presentation.phone_change.password_attempt_allowed", lambda *args: True)
    monkeypatch.setattr("nilart.contexts.identity.presentation.phone_change.otp_attempt_allowed", lambda *args: True)
    request = client.post("/api/v1/account/security/phone/request", json={"phone": "09123456780", "current_password": "a long secure passphrase"})
    assert request.status_code == 202, request.text
    assert "code" not in request.json()
    challenge = request.json()["challenge_id"]
    code = sms.codes[-1][1]
    wrong = "000000" if code != "000000" else "111111"
    assert client.post("/api/v1/account/security/phone/verify", json={"challenge_id": challenge, "code": wrong}).status_code == 400
    assert db.execute(text("SELECT attempts FROM identity_phone_changes")).scalar_one() == 1
    assert client.post("/api/v1/account/security/phone/verify", json={"challenge_id": str(uuid4()), "code": code}).status_code == 400
    saved = client.post("/api/v1/account/security/phone/verify", json={"challenge_id": challenge, "code": code})
    assert saved.status_code == 200 and saved.json()["reauthenticate"]
    assert db.execute(text("SELECT phone FROM identity_accounts")).scalar_one() == "+989123456780"
    assert db.execute(text("SELECT consumed FROM identity_phone_changes")).scalar_one()
    assert client.get("/api/v1/auth/session").status_code == 401
    assert client.post("/api/v1/account/security/phone/verify", json={"challenge_id": challenge, "code": code}).status_code == 401
    audit = db.execute(text("SELECT changes FROM identity_audits")).scalar_one()
    assert "code" not in audit and audit["all_sessions_revoked"]


def test_restriction_revokes_existing_sessions(flow):
    client, db, owner = admin(flow)
    id = target(db)
    from datetime import UTC, datetime, timedelta

    from nilart.contexts.identity.infrastructure.secrets import token_digest

    SqlIdentityRepository(db).store_session(id, token_digest("other-session"), token_digest("other-csrf"), datetime.now(UTC), datetime.now(UTC)+timedelta(hours=1))
    db.commit()
    response = client.put(f"/api/v1/admin/identity/accounts/{id}/access", json=body(roles=["customer"], overrides={}, blocked=True))
    assert response.status_code == 200
    assert db.execute(text("SELECT count(*) FROM identity_sessions WHERE account_id=:id"), {"id": id}).scalar_one() == 0


def test_password_change_rate_limit_and_redis_failure(flow, monkeypatch):
    client, db, sms = flow
    _, initial = register(client, sms)
    client.headers["X-CSRF-Token"] = initial.json()["csrf_token"]
    body = {"current_password": "a long secure passphrase", "new_password": "a new secure passphrase"}
    monkeypatch.setattr("nilart.contexts.identity.presentation.security.password_attempt_allowed", lambda *args: False)
    assert client.post("/api/v1/account/security/password", json=body).status_code == 429

    def unavailable(*args):
        raise ConnectionError("Redis unavailable")

    monkeypatch.setattr("nilart.contexts.identity.presentation.security.password_attempt_allowed", unavailable)
    assert client.post("/api/v1/account/security/password", json=body).status_code == 503
    assert verify_password(body["current_password"], db.execute(text("SELECT password_hash FROM identity_accounts")).scalar_one())
