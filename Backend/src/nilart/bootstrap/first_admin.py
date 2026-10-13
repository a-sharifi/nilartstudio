"""Explicit, audited first administrator bootstrap. Never runs at startup."""
import argparse
from uuid import UUID

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from nilart.bootstrap.settings import settings
from nilart.contexts.identity.infrastructure.management import ManagementError, SqlAccountManagement


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--account-id", type=UUID, required=True)
    parser.add_argument("--reason", required=True)
    args = parser.parse_args()
    reason = args.reason.strip()
    if not reason or len(reason)>1000 or any(ord(c)<32 for c in reason):
        parser.error("A nonblank reason of at most 1000 characters is required")
    engine = create_engine(settings.database_url)
    try:
        with Session(engine) as db, db.begin():
            SqlAccountManagement(db).bootstrap(args.account_id, reason)
    except ManagementError as exc:
        parser.exit(2, exc.code + "\n")
    finally:
        engine.dispose()
    print("First administrator assigned and audited.")


if __name__ == "__main__":
    main()
