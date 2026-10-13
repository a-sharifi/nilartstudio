import importlib.util
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Barrier
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from nilart.contexts.identity.infrastructure.management import ManagementError, SqlAccountManagement


def test_concurrent_access_changes_and_management_migration_rollback():
    url = os.environ.get("NILART_TEST_DATABASE_URL")
    if not url:
        pytest.skip("NILART_TEST_DATABASE_URL required")
    engine = create_engine(url)
    schema = "management_" + uuid4().hex
    actor, target = uuid4(), uuid4()
    modules = []
    try:
        with engine.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            with Operations.context(MigrationContext.configure(connection)):
                for filename in ["0005_identity.py", "0006_identity_otp.py", "0007_identity_roles.py", "0008_identity_profiles.py", "0017_identity_management.py", "0018_phone_changes.py"]:
                    path = Path(__file__).parents[1]/"migrations/versions"/filename
                    spec = importlib.util.spec_from_file_location(filename, path)
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                    module.upgrade()
                    modules.append(module)
            for id, phone, role in [(actor, "+989123456789", "admin"), (target, "+989123456780", "customer")]:
                connection.execute(text("INSERT INTO identity_accounts(id,phone,password_hash,phone_verified,blocked,created_at) VALUES(:id,:phone,'isolated-test',true,false,now())"), {"id": id, "phone": phone})
                connection.execute(text("INSERT INTO identity_account_roles VALUES(:id,:role)"), {"id": id, "role": role})
        barrier = Barrier(2)

        def update(role):
            with Session(engine) as db:
                db.execute(text(f'SET LOCAL search_path TO "{schema}"'))
                barrier.wait(timeout=10)
                repo = SqlAccountManagement(db)
                repo.serialize_writes()
                try:
                    repo.update(actor, target, 0, [role], {}, False, "Concurrent test")
                    db.commit()
                    return "saved"
                except ManagementError as exc:
                    db.rollback()
                    return exc.code

        with ThreadPoolExecutor(max_workers=2) as workers:
            results = list(workers.map(update, ["finance", "operations"]))
        assert sorted(results) == ["access_version_conflict", "saved"]
        with engine.begin() as connection:
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            assert connection.execute(text("SELECT access_version FROM identity_accounts WHERE id=:id"), {"id": target}).scalar_one() == 1
            assert connection.execute(text("SELECT count(*) FROM identity_audits WHERE account_id=:id"), {"id": target}).scalar_one() == 1
            with Operations.context(MigrationContext.configure(connection)):
                modules[-1].downgrade()
                modules[-2].downgrade()
            assert connection.execute(text("SELECT count(*) FROM identity_accounts")).scalar_one() == 2
            assert connection.execute(text("SELECT count(*) FROM identity_account_roles")).scalar_one() == 2
    finally:
        with engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        engine.dispose()
