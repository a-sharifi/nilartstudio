"""Committed temporary schema for real two-connection session locking probes."""
import os
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository


def test_locked_session_blocks_csrf_rotation_until_mutation_finishes():
    url = os.environ.get("NILART_TEST_DATABASE_URL")
    if not url:
        pytest.skip("NILART_TEST_DATABASE_URL required")
    engine = create_engine(url)
    schema = "session_lock_test_" + uuid4().hex
    now = datetime.now(UTC)
    try:
        with engine.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            connection.execute(text("CREATE TABLE identity_accounts (id uuid PRIMARY KEY, phone text, "
                                    "phone_verified boolean, blocked boolean)"))
            connection.execute(text("CREATE TABLE identity_sessions (token_hash text PRIMARY KEY, "
                                    "account_id uuid REFERENCES identity_accounts(id), csrf_hash text, "
                                    "expires_at timestamptz)"))
            account = uuid4()
            connection.execute(text("INSERT INTO identity_accounts VALUES (:id,'test',true,false)"),
                               {"id": account})
            connection.execute(text("INSERT INTO identity_sessions VALUES ('token',:id,'old',:expiry)"),
                               {"id": account, "expiry": now + timedelta(hours=1)})
        with engine.begin() as first:
            first.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            principal = SqlIdentityRepository(Session(bind=first)).session_account("token", now, lock=True)
            assert principal.csrf_hash == "old"
            with engine.connect() as second:
                with pytest.raises(OperationalError) as failure, second.begin():
                    second.execute(text(f'SET LOCAL search_path TO "{schema}"'))
                    second.execute(text("SET LOCAL lock_timeout='150ms'"))
                    SqlIdentityRepository(Session(bind=second)).rotate_csrf("token", "new", now)
                assert failure.value.orig.sqlstate == "55P03"
        with engine.begin() as connection:
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            repository = SqlIdentityRepository(Session(bind=connection))
            assert repository.rotate_csrf("token", "new", now)
            assert repository.session_account("token", now).csrf_hash == "new"
    finally:
        with engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        engine.dispose()
