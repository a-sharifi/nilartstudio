"""Opt-in local artwork test descriptions from the pinned design reference."""
import argparse
import json
import os
from pathlib import Path
from uuid import uuid4

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

NOTICE_FA = "اثر آزمایشی از مرجع طراحی؛ اثر واقعی یا پیشنهاد فروش تأییدشده نیست. تصویر، هنرمند، مشخصات، قیمت و موجودی تأیید نشده‌اند."
NOTICE_EN = "Test artwork from the design reference; not a real artwork or approved sale. Image, artist, specifications, price and availability are unconfirmed."


def seed_design_artworks(db: Session, entries: list[dict]) -> int:
    """Validate identities before inserts; caller owns the transaction."""
    if not entries or any(set(row) != {"slug", "title_fa", "title_en"} for row in entries):
        raise ValueError("Invalid artwork fixture")
    for row in entries:
        if any(not isinstance(value, str) or not value.strip() for value in row.values()):
            raise ValueError("Invalid artwork labels")
        if len(row["slug"]) > 160 or any(len(row[key]) > 300 for key in ["title_fa", "title_en"]):
            raise ValueError("Artwork label exceeds catalog limits")
    slugs = [row["slug"] for row in entries]
    if len(set(slugs)) != len(slugs):
        raise ValueError("Duplicate fixture identity")
    if db.scalar(text("SELECT count(*) FROM catalog_artworks WHERE slug=ANY(:slugs)"), {"slugs": slugs}):
        raise ValueError("Artwork identity already exists; never overwrite")
    for row in entries:
        db.execute(text("INSERT INTO catalog_artworks (id,slug,title_fa,title_en,description_fa,description_en,published) "
                        "VALUES (:id,:slug,:title_fa,:title_en,:fa,:en,true)"),
                   {"id": uuid4(), **row, "fa": NOTICE_FA, "en": NOTICE_EN})
    return len(entries)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--local-test-data", action="store_true", required=True)
    parser.add_argument("--fixture", type=Path, required=True)
    args = parser.parse_args()
    url = make_url(os.environ["NILART_DATABASE_URL"])
    if url.get_backend_name() != "postgresql" or url.host not in {"postgres", "localhost", "127.0.0.1"}:
        parser.error("Only local PostgreSQL is supported")
    entries = json.loads(args.fixture.read_text())
    engine = create_engine(url)
    try:
        with Session(engine) as db, db.begin():
            count = seed_design_artworks(db, entries)
    except (SQLAlchemyError, ValueError):
        parser.exit(2, "Import failed; transaction rolled back. Existing records were not overwritten.\n")
    finally:
        engine.dispose()
    print(f"Added {count} local artwork test descriptions; no price, assets or stock.")


if __name__ == "__main__":
    main()
