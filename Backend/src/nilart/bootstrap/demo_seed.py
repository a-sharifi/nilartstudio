"""Explicit synthetic administrator for the isolated demo database only."""
import os
from urllib.parse import urlsplit
from uuid import UUID

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from nilart.bootstrap.settings import settings
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.infrastructure.secrets import hash_password

ADMIN_ID=UUID("b1884016-a284-4a2a-af38-bd018aa5df27")
PHONE="+989121110001"


def main():
    if settings.environment!="development" or os.environ.get("NILART_DEMO_WORKSPACE")!="true" or urlsplit(settings.database_url).path!="/nilart_demo" or settings.public_origin!="http://127.0.0.1:18080":
        raise SystemExit("Demo seeding requires the isolated nilart_demo development workspace.")
    password=os.environ.get("NILART_DEMO_ADMIN_PASSWORD","")
    if len(password)<20:
        raise SystemExit("A private generated demo password is required.")
    engine=create_engine(settings.database_url)
    try:
        with Session(engine) as db,db.begin():
            existing=db.execute(text("SELECT id,phone FROM identity_accounts ORDER BY id")).mappings().all()
            if existing:
                if not any(r["id"]==ADMIN_ID and r["phone"]==PHONE for r in existing):
                    raise SystemExit("Refusing to seed a workspace containing unrelated accounts.")
                print("Demo administrator already exists; its password and records were preserved.")
                return
            db.execute(text("INSERT INTO identity_accounts(id,phone,password_hash,phone_verified,blocked,created_at) VALUES(:id,:phone,:password,true,false,now())"),{"id":ADMIN_ID,"phone":PHONE,"password":hash_password(password)})
            db.execute(text("INSERT INTO identity_account_roles(account_id,role) VALUES(:id,'customer')"),{"id":ADMIN_ID})
            SqlAccountManagement(db).bootstrap(str(ADMIN_ID),"Explicit isolated sandbox administrator")
    finally:
        engine.dispose()
    print("Synthetic demo administrator created: +989121110001. Password is in the private .env.demo file.")


if __name__=="__main__":
    main()
