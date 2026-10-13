import importlib.util
from pathlib import Path
from uuid import uuid4

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from test_identity_otp_postgres import flow as flow


def artwork_details_migration(connection):
    spec = importlib.util.spec_from_file_location("art_details_migration", Path(__file__).resolve().parents[1] / "migrations/versions/0022_artwork_details.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(connection)):
        module.upgrade()
    return module


def test_published_artworks_pagination_details_and_migration(flow):
    client, db, _ = flow
    spec = importlib.util.spec_from_file_location("art_migration", Path(__file__).resolve().parents[1] / "migrations/versions/0010_artworks.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(db.connection())):
        module.upgrade()
    detail_module = artwork_details_migration(db.connection())
    for slug, published in [("a", True), ("b", True), ("draft", False)]:
        db.execute(text("INSERT INTO catalog_artworks (id,slug,title_fa,title_en,published) VALUES (:id,:slug,'نقاشی','Art',:published)"), {"id": uuid4(), "slug": slug, "published": published})
    db.commit()
    result = client.get("/api/v1/catalog/artworks", params={"page_size": 1}).json()
    assert result["total"] == 2 and result["items"][0]["slug"] == "a"
    assert client.get("/api/v1/catalog/artworks?page=2&page_size=1").json()["items"][0]["slug"] == "b"
    assert client.get("/api/v1/catalog/artworks/a").json() == result["items"][0]
    assert "price" not in result["items"][0]
    assert client.get("/api/v1/catalog/artworks/draft").status_code == 404
    assert client.get("/api/v1/catalog/artworks/missing").status_code == 404
    assert client.get("/api/v1/catalog/artworks?page_size=101").status_code == 422
    assert client.get("/api/v1/catalog/artworks?page=0").status_code == 422
    with Operations.context(MigrationContext.configure(db.connection())):
        detail_module.downgrade()
        module.downgrade()
