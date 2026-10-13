"""OTP flows against PostgreSQL; capturing SMS exists ONLY in these tests."""
import importlib.util
import os
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from nilart.bootstrap.main import app
from nilart.bootstrap.settings import settings
from nilart.contexts.identity.infrastructure.secrets import verify_password
from nilart.contexts.identity.presentation.otp_router import sms_dependency
from nilart.shared.database import session_dependency


class CapturingSms:
    def __init__(self):
        self.codes = []

    def send_code(self, phone, code, purpose):
        self.codes.append((phone, code, purpose))


@pytest.fixture
def flow(monkeypatch):
    url = os.environ.get("NILART_TEST_DATABASE_URL")
    if not url:
        pytest.skip("NILART_TEST_DATABASE_URL required")
    engine = create_engine(url)
    schema = "otp_test_" + uuid4().hex
    directory = Path(__file__).resolve().parents[1] / "migrations/versions"
    monkeypatch.setattr(settings, "otp_hmac_key", SecretStr("test-only-key-" + "x" * 32))
    monkeypatch.setattr("nilart.contexts.identity.presentation.otp_router.otp_attempt_allowed",
                        lambda *args: True)
    monkeypatch.setattr("nilart.contexts.identity.presentation.router.rate_allowed", lambda *args: True)
    with engine.connect() as connection:
        transaction = connection.begin()
        db = None
        try:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            with Operations.context(MigrationContext.configure(connection)):
                for filename in ["0005_identity.py", "0006_identity_otp.py", "0007_identity_roles.py", "0008_identity_profiles.py", "0017_identity_management.py", "0018_phone_changes.py"]:
                    spec = importlib.util.spec_from_file_location(filename, directory / filename)
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                    module.upgrade()
            db = Session(bind=connection, join_transaction_mode="create_savepoint")
            sms = CapturingSms()
            app.dependency_overrides[session_dependency] = lambda: db
            app.dependency_overrides[sms_dependency] = lambda: sms
            with TestClient(app) as client:
                client.headers["Origin"] = "http://localhost:8080"
                yield client, db, sms
        finally:
            app.dependency_overrides.pop(session_dependency, None)
            app.dependency_overrides.pop(sms_dependency, None)
            if db:
                db.close()
            transaction.rollback()
    engine.dispose()


def request_code(client, sms, purpose="register"):
    response = client.post("/api/v1/auth/otp/request", json={"phone": "۰۹۱۲۳۴۵۶۷۸۹", "purpose": purpose})
    assert response.status_code == 202, response.text
    assert response.json()["delivery_status"] == "accepted"
    assert response.headers["cache-control"] == "no-store"
    assert "code" not in response.json()
    assert "set-cookie" not in response.headers
    return {"challenge_id": response.json()["challenge_id"], "purpose": purpose,
            "code": sms.codes[-1][1]}


def register(client, sms):
    code = request_code(client, sms)
    verification = client.post("/api/v1/auth/otp/verify", json=code)
    assert verification.status_code == 200
    assert "set-cookie" not in verification.headers
    grant = verification.json()["grant"]
    result = client.post("/api/v1/auth/register/complete",
                         json={"grant": grant, "password": "a long secure passphrase"})
    assert result.status_code == 200, result.text
    assert "HttpOnly" in result.headers["set-cookie"]
    return grant, result


def test_register_login_recovery_and_replay(flow):
    client, db, sms = flow
    grant, initial = register(client, sms)
    assert client.get("/api/v1/auth/session").status_code == 200
    assert client.post("/api/v1/auth/register/complete", json={
        "grant": grant, "password": "a long secure passphrase"}).status_code == 400
    row = db.execute(text("SELECT * FROM identity_accounts")).mappings().one()
    assert row["phone_verified"] and not row["blocked"]
    access = client.get("/api/v1/auth/access")
    assert access.json()["roles"] == ["customer"]
    assert "identity.manage" not in access.json()["permissions"]
    assert verify_password("a long secure passphrase", row["password_hash"])
    code = request_code(client, sms, "login")
    result = client.post("/api/v1/auth/otp/verify", json=code)
    assert result.status_code == 200 and result.json()["account_id"] == initial.json()["account_id"]
    assert client.post("/api/v1/auth/otp/verify", json=code).status_code == 400
    old_token = client.cookies.get("nilart_session")
    code = request_code(client, sms, "recovery")
    recovery = client.post("/api/v1/auth/otp/verify", json=code).json()["grant"]
    assert client.post("/api/v1/auth/register/complete", json={
        "grant": recovery, "password": "a new secure passphrase"}).status_code == 400
    reset = client.post("/api/v1/auth/recovery/complete", json={
        "grant": recovery, "password": "a new secure passphrase"})
    assert reset.status_code == 200
    assert client.post("/api/v1/auth/recovery/complete", json={
        "grant": recovery, "password": "a new secure passphrase"}).status_code == 400
    assert db.execute(text("SELECT count(*) FROM identity_sessions")).scalar() == 1
    client.cookies.clear()
    client.cookies.set("nilart_session", old_token)
    assert client.get("/api/v1/auth/session").status_code == 401
    assert client.post("/api/v1/auth/login/password", json={
        "phone": "09123456789", "password": "a long secure passphrase"}).status_code == 401
    assert client.post("/api/v1/auth/login/password", json={
        "phone": "09123456789", "password": "a new secure passphrase"}).status_code == 200


def test_wrong_attempts_persist_and_exhaust(flow):
    client, db, sms = flow
    code = request_code(client, sms)
    wrong = "000000" if code["code"] != "000000" else "111111"
    for _ in range(5):
        assert client.post("/api/v1/auth/otp/verify", json={**code, "code": wrong}).status_code == 400
    assert db.execute(text("SELECT attempts FROM identity_otp_challenges")).scalar() == 5
    assert client.post("/api/v1/auth/otp/verify", json=code).status_code == 400
    assert db.execute(text("SELECT count(*) FROM identity_password_grants")).scalar() == 0


def test_persian_otp_digits_are_accepted(flow):
    client, db, sms = flow
    code = request_code(client, sms)
    code["code"] = code["code"].translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))
    assert client.post("/api/v1/auth/otp/verify", json=code).status_code == 200


@pytest.mark.parametrize("invalid", ["expired", "purpose"])
def test_expiry_and_purpose_binding(flow, invalid):
    client, db, sms = flow
    code = request_code(client, sms)
    if invalid == "expired":
        db.execute(text("UPDATE identity_otp_challenges SET expires_at=now()-interval '1 minute'"))
        db.commit()
    else:
        code["purpose"] = "login"
    assert client.post("/api/v1/auth/otp/verify", json=code).status_code == 400
    assert db.execute(text("SELECT count(*) FROM identity_password_grants")).scalar() == 0


def test_resend_invalidates_old_code(flow):
    client, db, sms = flow
    code = request_code(client, sms)
    assert client.post("/api/v1/auth/otp/request", json={
        "phone": "09123456789", "purpose": "register"}).status_code == 429
    db.execute(text("UPDATE identity_otp_challenges SET created_at=now()-interval '2 minutes'"))
    db.commit()
    replacement = request_code(client, sms)
    assert client.post("/api/v1/auth/otp/verify", json=code).status_code == 400
    assert client.post("/api/v1/auth/otp/verify", json=replacement).status_code == 200


def test_disabled_sms_and_failed_provider_do_not_create_challenge(flow):
    client, db, sms = flow
    app.dependency_overrides.pop(sms_dependency)
    assert client.post("/api/v1/auth/otp/request", json={
        "phone": "09123456789", "purpose": "register"}).status_code == 503
    assert db.execute(text("SELECT count(*) FROM identity_otp_challenges")).scalar() == 0


def test_unknown_login_and_duplicate_registration_do_not_create_account(flow):
    client, db, sms = flow
    code = request_code(client, sms, "login")
    assert client.post("/api/v1/auth/otp/verify", json=code).status_code == 400
    register(client, sms)
    db.execute(text("UPDATE identity_otp_challenges SET created_at=now()-interval '2 minutes'"))
    db.commit()
    code = request_code(client, sms)
    grant = client.post("/api/v1/auth/otp/verify", json=code).json()["grant"]
    assert client.post("/api/v1/auth/register/complete", json={
        "grant": grant, "password": "another secure passphrase"}).status_code == 400
    assert db.execute(text("SELECT count(*) FROM identity_accounts")).scalar() == 1
    password_hash = db.execute(text("SELECT password_hash FROM identity_accounts")).scalar()
    assert verify_password("a long secure passphrase", password_hash)


def test_grant_expired_and_blocked_login(flow):
    client, db, sms = flow
    register(client, sms)
    db.execute(text("UPDATE identity_accounts SET blocked=true"))
    db.commit()
    code = request_code(client, sms, "login")
    assert client.post("/api/v1/auth/otp/verify", json=code).status_code == 400
    code = request_code(client, sms, "recovery")
    grant = client.post("/api/v1/auth/otp/verify", json=code).json()["grant"]
    db.execute(text("UPDATE identity_password_grants SET expires_at=now()-interval '1 minute'"))
    db.commit()
    assert client.post("/api/v1/auth/recovery/complete", json={
        "grant": grant, "password": "another secure passphrase"}).status_code == 400
