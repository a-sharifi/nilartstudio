"""Explicit local test artwork metadata, images and availability; no sellable ledger stock."""
import argparse
import json
import os
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from nilart.bootstrap.design_artworks import NOTICE_EN
from nilart.contexts.catalog.domain.artwork_details import ArtworkDetails


def seed_artwork_details(db, entries):
    staged, seen = [], set()
    for entry in entries:
        slug = entry["slug"]
        if slug in seen:
            raise ValueError("Duplicate artwork fixture")
        seen.add(slug)
        document = ArtworkDetails.model_validate({key: value for key, value in entry.items() if key != "slug"}).model_dump(mode="json")
        artwork = db.execute(text("SELECT id,description_en FROM catalog_artworks WHERE slug=:slug FOR UPDATE"), {"slug": slug}).mappings().first()
        if not artwork or artwork["description_en"] != NOTICE_EN:
            raise ValueError("Expected local test artwork")
        existing = db.scalar(text("SELECT document FROM catalog_artwork_details WHERE artwork_id=:id"), {"id": artwork["id"]})
        if existing is not None and existing != document:
            additions = {"surface_fa", "surface_en", "frame_fa", "frame_en"}
            old_base = {key: value for key, value in existing.items() if key not in additions}
            new_base = {key: value for key, value in document.items() if key not in additions}
            if old_base != new_base or any(existing.get(key) is not None and existing[key] != document[key] for key in additions):
                raise ValueError("Never overwrite different artwork details")
        if existing != document:
            staged.append((artwork["id"], document))
    for artwork_id, document in staged:
        db.execute(text("INSERT INTO catalog_artwork_details (artwork_id,document) VALUES (:id,CAST(:document AS jsonb)) ON CONFLICT (artwork_id) DO UPDATE SET document=EXCLUDED.document"), {"id": artwork_id, "document": json.dumps(document)})
    db.flush()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--local-test-data", action="store_true", required=True)
    parser.add_argument("--fixture", type=Path, required=True)
    args = parser.parse_args()
    if os.environ.get("NILART_ENVIRONMENT", "development") != "development":
        parser.error("Sample details are development-only")
    url = make_url(os.environ["NILART_DATABASE_URL"])
    if url.get_backend_name() != "postgresql" or url.host not in {"postgres", "localhost", "127.0.0.1"}:
        parser.error("Only local PostgreSQL is supported")
    engine = create_engine(url)
    try:
        with Session(engine) as db, db.begin():
            seed_artwork_details(db, json.loads(args.fixture.read_text()))
    finally:
        engine.dispose()
    print("Saved local sample artwork metadata; no orders or inventory ledger entries created.")


if __name__ == "__main__":
    main()
