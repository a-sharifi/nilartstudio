import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import text
from test_identity_otp_postgres import flow as flow
from test_identity_otp_postgres import register

from nilart.contexts.identity.presentation.access import require_permission
from nilart.shared.database import session_dependency


@pytest.mark.parametrize("role", ["customer", "artist", "operations", "finance", "admin"])
def test_http_permission_guard_uses_current_database_roles(flow, role):
    client, db, sms = flow
    register(client, sms)
    db.execute(text("DELETE FROM identity_account_roles"))
    db.execute(text("INSERT INTO identity_account_roles SELECT id,:role FROM identity_accounts"),
               {"role": role})
    db.commit()
    isolated_app = FastAPI()
    isolated_app.dependency_overrides[session_dependency] = lambda: db

    @isolated_app.get("/refund", dependencies=[Depends(require_permission("payments.refund"))])
    def refund_permission_probe():
        return {"allowed": True}

    with TestClient(isolated_app) as probe:
        assert probe.get("/refund").status_code == 401
        probe.cookies.set("nilart_session", client.cookies.get("nilart_session"))
        assert probe.get("/refund").status_code == (200 if role == "admin" else 403)
        # Existing cookie must not retain privileges after a role is removed.
        db.execute(text("DELETE FROM identity_account_roles"))
        db.commit()
        assert probe.get("/refund").status_code == 403
        db.execute(text("UPDATE identity_accounts SET blocked=true"))
        db.commit()
        assert probe.get("/refund").status_code == 401
