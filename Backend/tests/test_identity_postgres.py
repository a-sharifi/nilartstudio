"""Real PostgreSQL identity flow in a rollback-only isolated schema."""
import importlib.util
import os
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from nilart.bootstrap.main import app
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.infrastructure.secrets import hash_password, token_digest
from nilart.shared.database import session_dependency


def test_identity_password_session_logout(monkeypatch):
    url = os.environ.get("NILART_TEST_DATABASE_URL")
    if not url:
        pytest.skip("NILART_TEST_DATABASE_URL required")
    engine = create_engine(url)
    schema = "identity_test_" + uuid4().hex
    migration = Path(__file__).resolve().parents[1] / "migrations/versions/0005_identity.py"
    monkeypatch.setattr("nilart.contexts.identity.presentation.router.rate_allowed", lambda *args: True)
    monkeypatch.setattr("nilart.contexts.identity.presentation.router.csrf_attempt_allowed", lambda *args: True)
    with engine.connect() as connection:
        transaction = connection.begin()
        try:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            spec = importlib.util.spec_from_file_location("identity_migration", migration)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            with Operations.context(MigrationContext.configure(connection)):
                module.upgrade()
            db = Session(bind=connection, join_transaction_mode="create_savepoint")
            account_id = uuid4()
            db.execute(text("INSERT INTO identity_accounts VALUES "
                            "(:id,:phone,:password,true,false,:now)"),
                       {"id": account_id, "phone": "+989123456789",
                        "password": hash_password("a long secure passphrase"), "now": datetime.now(UTC)})
            db.commit()
            app.dependency_overrides[session_dependency] = lambda: db
            with TestClient(app) as client:
                payload = {"phone": "۰۹۱۲۳۴۵۶۷۸۹", "password": "a long secure passphrase"}
                assert client.post("/api/v1/auth/login/password", json=payload).status_code == 403
                headers = {"Origin": "http://localhost:8080"}
                wrong = client.post("/api/v1/auth/login/password",
                                    json={**payload, "password": "wrong password"}, headers=headers)
                assert wrong.status_code == 401
                result = client.post("/api/v1/auth/login/password", json=payload, headers=headers)
                assert result.status_code == 200
                assert "HttpOnly" in result.headers["set-cookie"]
                assert result.headers["cache-control"] == "no-store"
                assert client.get("/api/v1/auth/session").json()["account_id"] == str(account_id)
                assert client.post("/api/v1/auth/logout").status_code == 403
                csrf = result.json()["csrf_token"]
                refresh = client.post("/api/v1/auth/session/csrf")
                assert refresh.status_code == 403
                refresh = client.post("/api/v1/auth/session/csrf", headers=headers)
                assert refresh.status_code == 200
                assert refresh.headers["cache-control"] == "no-store"
                assert not SqlIdentityRepository(db).delete_session(
                    token_digest(client.cookies.get("nilart_session")), token_digest(csrf))
                assert db.execute(text("SELECT count(*) FROM identity_sessions")).scalar() == 1
                assert client.post("/api/v1/auth/logout", headers={**headers, "X-CSRF-Token": csrf}).status_code == 403
                csrf = refresh.json()["csrf_token"]
                for origin in [None, "https://attacker.invalid"]:
                    blocked_headers = {"X-CSRF-Token": csrf}
                    if origin:
                        blocked_headers["Origin"] = origin
                    rejected = client.post("/api/v1/auth/logout", headers=blocked_headers)
                    assert rejected.status_code == 403
                    assert rejected.json()["code"] == "origin_invalid"
                    assert "set-cookie" not in rejected.headers
                    assert client.get("/api/v1/auth/session").status_code == 200
                assert client.post("/api/v1/auth/logout", headers={**headers, "X-CSRF-Token": csrf}).status_code == 204
                assert client.get("/api/v1/auth/session").status_code == 401
                assert db.execute(text("SELECT count(*) FROM identity_sessions")).scalar() == 0
            db.close()
        finally:
            app.dependency_overrides.pop(session_dependency, None)
            transaction.rollback()
    engine.dispose()
