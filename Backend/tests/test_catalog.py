from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from nilart.bootstrap.main import app
from nilart.contexts.catalog.application.queries import ListCollections
from nilart.contexts.catalog.domain.entities import Collection
from nilart.contexts.catalog.infrastructure.repository import Base, CollectionRow
from nilart.shared.database import session_dependency


def test_domain_requires_translations():
    with pytest.raises(ValueError):
        Collection(uuid4(), "cats", "گربه", "", False)


def test_query_rejects_invalid_pagination():
    with pytest.raises(ValueError):
        ListCollections(None).execute(0, 24)


def test_public_catalog_excludes_drafts():
    # SQLite checks read semantics only, not PostgreSQL locking or financial behavior.
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                           poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        session.add_all([
            CollectionRow(id=uuid4(), slug="cats", title_fa="گربه",
                          title_en="Cats", published=True),
            CollectionRow(id=uuid4(), slug="draft", title_fa="پیش‌نویس",
                          title_en="Draft", published=False),
        ])
        session.commit()

    def override():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[session_dependency] = override
    try:
        response = TestClient(app).get("/api/v1/catalog/collections")
        assert response.status_code == 200
        assert response.json()["total"] == 1
        assert response.json()["items"][0]["slug"] == "cats"
        invalid = TestClient(app).get("/api/v1/catalog/collections?page=0")
        assert invalid.status_code == 422
        assert invalid.json()["code"] == "validation_error"
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
