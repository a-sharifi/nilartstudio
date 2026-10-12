from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import text
from test_identity_otp_postgres import flow as flow
from test_identity_otp_postgres import register

from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.infrastructure.secrets import (
    hash_password,
    new_session_token,
    token_digest,
)


def test_profile_owner_csrf_conflicts_and_mass_assignment(flow):
    client, db, sms = flow
    _, login = register(client, sms)
    token_a = client.cookies.get("nilart_session")
    csrf = login.json()["csrf_token"]
    profile = client.get("/api/v1/account/profile")
    assert profile.status_code == 200
    assert profile.headers["cache-control"] == "no-store"
    assert profile.json()["full_name"] == "" and profile.json()["version"] == 0
    body = {"full_name": "  سارا احمدی  ", "version": 0}
    assert client.put("/api/v1/account/profile", json=body).status_code == 403
    client.headers["X-CSRF-Token"] = csrf
    assert client.put("/api/v1/account/profile", json=body,
                      headers={"Origin": "https://attacker.invalid"}).status_code == 403
    saved = client.put("/api/v1/account/profile", json=body)
    assert saved.status_code == 200 and saved.json()["full_name"] == "سارا احمدی"
    assert saved.json()["version"] == 1
    assert client.put("/api/v1/account/profile", json=body).status_code == 409
    assert client.put("/api/v1/account/profile", json={**body, "version": True}).status_code == 422
    assert client.put("/api/v1/account/profile", json={**body, "version": 1, "phone": "+989999999999"}).status_code == 422
    assert client.put("/api/v1/account/profile", json={"full_name": "bad\nname", "version": 1}).status_code == 422

    other_id, token_b, csrf_b = uuid4(), new_session_token(), new_session_token()
    db.execute(text("INSERT INTO identity_accounts (id,phone,password_hash,phone_verified,blocked,created_at) "
                    "VALUES (:id,:phone,:hash,true,false,:now)"),
               {"id": other_id, "phone": "+989123456780", "hash": hash_password("a long secure passphrase"), "now": datetime.now(UTC)})
    db.execute(text("INSERT INTO identity_account_roles VALUES (:id,'customer')"), {"id": other_id})
    SqlIdentityRepository(db).store_session(str(other_id), token_digest(token_b), token_digest(csrf_b),
                                           datetime.now(UTC), datetime.now(UTC) + timedelta(hours=1))
    db.commit()
    client.cookies.clear()
    client.cookies.set("nilart_session", token_b)
    client.headers["X-CSRF-Token"] = csrf_b
    assert client.put("/api/v1/account/profile", json=body,
                      headers={"X-Profile-Owner": login.json()["account_id"]}).status_code == 403
    assert client.get("/api/v1/account/profile").json()["full_name"] == ""
    assert client.get("/api/v1/account/profile", params={"account_id": login.json()["account_id"]}).json()["account_id"] == str(other_id)
    assert client.put("/api/v1/account/profile", json={"full_name": "attacker", "version": 1}).status_code == 409
    assert client.put("/api/v1/account/profile", json={**body, "account_id": login.json()["account_id"]}).status_code == 422
    client.cookies.clear()
    client.cookies.set("nilart_session", token_a)
    assert client.get("/api/v1/account/profile").json()["full_name"] == "سارا احمدی"
    db.execute(text("DELETE FROM identity_account_roles"))
    db.commit()
    denied = client.get("/api/v1/account/profile")
    assert denied.status_code == 403 and denied.headers["cache-control"] == "no-store"
    client.cookies.clear()
    assert client.get("/api/v1/account/profile").status_code == 401


@pytest.mark.parametrize("change", ["rotate", "revoke"])
def test_profile_rechecks_session_before_writing(flow, monkeypatch, change):
    client, db, sms = flow
    _, login = register(client, sms)
    old_csrf = login.json()["csrf_token"]
    token = token_digest(client.cookies.get("nilart_session"))
    original = SqlIdentityRepository.session_account
    rotated = False

    def account(self, digest, now, *, lock=False):
        nonlocal rotated
        result = original(self, digest, now, lock=lock)
        if not lock and not rotated:
            # Rotation occurs after the permission guard's ordinary session read.
            rotated = True
            if change == "rotate":
                self.rotate_csrf(token, token_digest(new_session_token()), now)
            else:
                self.session.execute(text("DELETE FROM identity_sessions WHERE token_hash=:token"),
                                     {"token": token})
        return result

    monkeypatch.setattr(SqlIdentityRepository, "session_account", account)
    result = client.put("/api/v1/account/profile", json={"full_name": "Must not save", "version": 0},
                        headers={"X-CSRF-Token": old_csrf})
    assert result.status_code == (403 if change == "rotate" else 401)
    assert db.execute(text("SELECT count(*) FROM identity_profiles")).scalar_one() == 0
