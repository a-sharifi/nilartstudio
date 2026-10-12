from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.identity.application.profile import Profile


class SqlProfileRepository:
    def __init__(self, db: Session):
        self.db = db

    def read(self, account_id: str) -> Profile:
        row = self.db.execute(text("SELECT a.id,a.phone,coalesce(p.full_name,'') AS full_name, "
                                   "coalesce(p.version,0) AS version FROM identity_accounts a "
                                   "LEFT JOIN identity_profiles p ON p.account_id=a.id WHERE a.id=:id"),
                              {"id": account_id}).mappings().one()
        return Profile(str(row["id"]), row["full_name"], row["phone"], row["version"])

    def update(self, account_id: str, full_name: str, version: int) -> Profile | None:
        if version == 0:
            query = "INSERT INTO identity_profiles (account_id,full_name,version) "
            query += "VALUES (:id,:name,1) ON CONFLICT (account_id) DO NOTHING RETURNING account_id"
        else:
            query = "UPDATE identity_profiles SET full_name=:name,version=version+1 "
            query += "WHERE account_id=:id AND version=:version RETURNING account_id"
        row = self.db.execute(text(query), {"id": account_id, "name": full_name, "version": version}).first()
        return self.read(account_id) if row else None
