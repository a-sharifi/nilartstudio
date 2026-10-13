import importlib.util
import json
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from test_artworks import artwork_details_migration
from test_identity_otp_postgres import flow as flow

from nilart.bootstrap.design_artworks import seed_design_artworks


def test_reference_artworks_atomic_import_and_public_descriptions(flow):
    client, db, _ = flow
    root = Path(__file__).parents[1]
    spec = importlib.util.spec_from_file_location("art_migration", root / "migrations/versions/0010_artworks.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(db.connection())):
        module.upgrade()
    artwork_details_migration(db.connection())
    entries = json.loads((root / "fixtures/design-artworks.json").read_text())
    db.execute(text("INSERT INTO catalog_artworks (id,slug,title_fa,title_en) VALUES (:id,:slug,'تست','Existing')"), {"id": uuid4(), "slug": entries[-1]["slug"]})
    db.commit()
    with pytest.raises(ValueError, match="never overwrite"), db.begin_nested():
        seed_design_artworks(db, entries)
    assert db.scalar(text("SELECT count(*) FROM catalog_artworks")) == 1
    assert db.scalar(text("SELECT title_en FROM catalog_artworks")) == "Existing"
    db.execute(text("DELETE FROM catalog_artworks"))
    db.commit()
    with pytest.raises(RuntimeError), db.begin_nested():
        seed_design_artworks(db, entries)
        raise RuntimeError("rollback")
    assert db.scalar(text("SELECT count(*) FROM catalog_artworks")) == 0
    assert seed_design_artworks(db, entries) == 9
    db.commit()
    response = client.get("/api/v1/catalog/artworks").json()
    assert response["total"] == 9
    for row in response["items"]:
        assert "Test artwork" in row["description_en"]
        assert set(row) == {"id", "slug", "title_fa", "title_en", "description_fa", "description_en", "details"}
        assert row["details"] is None
    assert client.get("/api/v1/catalog/artworks/quiet-morning").json()["title_en"] == "Quiet morning"
    with pytest.raises(ValueError):
        seed_design_artworks(db, entries)
    assert db.scalar(text("SELECT count(*) FROM catalog_artworks")) == 9
