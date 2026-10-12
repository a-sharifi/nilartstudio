from datetime import datetime

from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.identity.application.service import Account, SessionAccount


class SqlIdentityRepository:
    def __init__(self, session: Session):
        self.session = session

    def roles(self, account_id: str) -> list[str]:
        return list(self.session.execute(text("SELECT role FROM identity_account_roles "
                                              "WHERE account_id=:id"),
                                         {"id": account_id}).scalars())

    def account_for_update(self, phone: str) -> Account | None:
        row = self.session.execute(text("SELECT id, phone, password_hash, phone_verified, blocked "
                                        "FROM identity_accounts WHERE phone=:phone FOR UPDATE"),
                                   {"phone": phone}).mappings().first()
        return Account(str(row["id"]), row["phone"], row["password_hash"],
                       row["phone_verified"], row["blocked"]) if row else None

    def store_session(self, account_id: str, token_hash: str, csrf_hash: str,
                      now: datetime, expires: datetime) -> None:
        self.session.execute(text("INSERT INTO identity_sessions "
                                  "(token_hash,account_id,csrf_hash,expires_at,created_at) "
                                  "VALUES (:token,:account,:csrf,:expires,:now)"),
                             {"token": token_hash, "account": account_id, "csrf": csrf_hash,
                              "expires": expires, "now": now})

    def session_account(self, token_hash: str, now: datetime, *, lock: bool = False) -> SessionAccount | None:
        row = self.session.execute(text("SELECT a.id,a.phone,s.csrf_hash FROM identity_sessions s "
                                        "JOIN identity_accounts a ON a.id=s.account_id "
                                        "WHERE s.token_hash=:token AND s.expires_at>:now "
                                        "AND a.phone_verified=true AND a.blocked=false"
                                        + (" FOR UPDATE OF s, a" if lock else "")),
                                   {"token": token_hash, "now": now}).mappings().first()
        return SessionAccount(str(row["id"]), row["phone"], row["csrf_hash"]) if row else None

    def delete_session(self, token_hash: str, csrf_hash: str) -> bool:
        # Recheck the nonce in the mutation, not just a prior read. A concurrent
        # bootstrap cannot make an already-rotated token valid again.
        row = self.session.execute(text("DELETE FROM identity_sessions WHERE token_hash=:token "
                                        "AND csrf_hash=:csrf RETURNING token_hash"),
                                   {"token": token_hash, "csrf": csrf_hash}).first()
        return row is not None

    def rotate_csrf(self, token_hash: str, csrf_hash: str, now: datetime) -> bool:
        row = self.session.execute(text("UPDATE identity_sessions s SET csrf_hash=:csrf "
                                        "FROM identity_accounts a WHERE s.account_id=a.id "
                                        "AND s.token_hash=:token AND s.expires_at>:now "
                                        "AND a.phone_verified=true AND a.blocked=false "
                                        "RETURNING s.token_hash"),
                                   {"token": token_hash, "csrf": csrf_hash, "now": now}).first()
        return row is not None
