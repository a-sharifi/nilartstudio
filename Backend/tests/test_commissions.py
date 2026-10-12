import importlib.util
from pathlib import Path
from uuid import uuid4

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from test_identity_otp_postgres import flow as flow
from test_identity_otp_postgres import register


def test_commission_submission_auth_csrf_idempotency_and_ownership(flow):
    client, db, sms = flow
    path = Path(__file__).resolve().parents[1] / "migrations/versions/0011_commissions.py"
    spec = importlib.util.spec_from_file_location("commission_migration", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(db.connection())):
        module.upgrade()
    body = {"submission_id": str(uuid4()), "idea": "Portrait", "changes": "", "style": "Oil", "size": "40 x 60 cm", "execution": "handmade"}
    assert client.post("/api/v1/account/commissions", json=body).status_code == 401
    _, login = register(client, sms)
    assert client.post("/api/v1/account/commissions", json=body).status_code == 403
    headers = {"X-CSRF-Token": login.json()["csrf_token"]}
    assert client.post("/api/v1/account/commissions", json=body, headers={**headers, "Origin": "https://foreign.invalid"}).status_code == 403
    saved = client.post("/api/v1/account/commissions", json=body, headers=headers)
    assert saved.status_code == 200 and saved.json()["status"] == "awaiting_review"
    assert saved.headers["cache-control"] == "no-store"
    assert client.post("/api/v1/account/commissions", json=body, headers=headers).json() == saved.json()
    assert client.post("/api/v1/account/commissions", json={**body, "idea": "Other"}, headers=headers).status_code == 409
    assert client.post("/api/v1/account/commissions", json={**body, "account_id": str(uuid4())}, headers=headers).status_code == 422
    assert client.post("/api/v1/account/commissions", json={**body, "idea": " "}, headers=headers).status_code == 422
    row = db.execute(text("SELECT account_id,brief FROM commission_requests")).mappings().one()
    assert str(row["account_id"]) == login.json()["account_id"]
    assert row["brief"]["idea"] == "Portrait"
    assert "price" not in row["brief"]
    with Operations.context(MigrationContext.configure(db.connection())):
        module.downgrade()
