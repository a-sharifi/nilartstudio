import importlib.util
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from test_identity_otp_postgres import flow as flow

from nilart.bootstrap.design_artwork_details import seed_artwork_details
from nilart.bootstrap.design_artworks import NOTICE_EN
from nilart.contexts.catalog.domain.artwork_details import ArtworkDetails


def test_sample_details_validate_stock_and_media():
    import json

    entries = json.loads((Path(__file__).parents[1] / "fixtures/design-artwork-details.json").read_text())
    assert len(entries) == 9
    for entry in entries:
        document = ArtworkDetails.model_validate({k: v for k, v in entry.items() if k != "slug"})
        assert document.stock == 1 and document.artist_fa == "نیلوفر مرادی"
        with pytest.raises(ValueError):
            ArtworkDetails.model_validate({**document.model_dump(), "stock": -1})


def test_details_import_is_atomic_idempotent_and_publication_safe(flow):
    client, db, _ = flow
    directory = Path(__file__).parents[1] / "migrations/versions"
    modules = []
    for filename in ["0010_artworks.py", "0021_catalog_management.py", "0022_artwork_details.py"]:
        spec = importlib.util.spec_from_file_location(filename, directory / filename)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with Operations.context(MigrationContext.configure(db.connection())):
            module.upgrade()
        modules.append(module)
    import json

    entry = json.loads((Path(__file__).parents[1] / "fixtures/design-artwork-details.json").read_text())[0]
    db.execute(text("INSERT INTO catalog_artworks(id,slug,title_fa,title_en,description_en,published) VALUES (:id,:slug,'اثر','Art',:notice,true)"), {"id": uuid4(), "slug": entry["slug"], "notice": NOTICE_EN})
    db.commit()
    with pytest.raises(RuntimeError), db.begin_nested():
        seed_artwork_details(db, [entry])
        raise RuntimeError("rollback")
    assert db.scalar(text("SELECT count(*) FROM catalog_artwork_details")) == 0
    seed_artwork_details(db, [entry])
    db.commit()
    seed_artwork_details(db, [entry])
    assert db.scalar(text("SELECT count(*) FROM catalog_artwork_details")) == 1
    with pytest.raises(ValueError, match="Never overwrite"):
        seed_artwork_details(db, [{**entry, "stock": 2}])
    details = client.get(f"/api/v1/catalog/artworks/{entry['slug']}").json()["details"]
    assert details["stock"] == 1 and details["price_amount"] == entry["price_amount"]
    db.execute(text("UPDATE catalog_artworks SET published=false"))
    db.commit()
    assert client.get(f"/api/v1/catalog/artworks/{entry['slug']}").status_code == 404
    assert client.get("/api/v1/catalog/artworks").json()["items"] == []
    with Operations.context(MigrationContext.configure(db.connection())):
        for module in reversed(modules):
            module.downgrade()
