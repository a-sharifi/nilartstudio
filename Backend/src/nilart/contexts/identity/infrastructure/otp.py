from datetime import datetime
from uuid import uuid4

from sqlalchemy import text

from nilart.contexts.identity.application.otp import Challenge, PasswordGrant
from nilart.contexts.identity.domain.rules import OtpPurpose
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.infrastructure.secrets import (
    hash_password,
    new_otp,
    new_session_token,
    otp_digest,
    token_digest,
)


class SmsUnavailable(RuntimeError):
    pass


class DisabledSmsSender:
    def send_code(self, phone: str, code: str, purpose: OtpPurpose) -> None:
        raise SmsUnavailable("SMS adapter is not configured")


class SecureOtpSecrets:
    def __init__(self, key: bytes):
        if len(key) < 32:
            raise ValueError("OTP HMAC key must contain at least 32 bytes")
        self.key = key

    def code(self) -> str:
        return new_otp()

    def token(self) -> str:
        return new_session_token()

    def digest(self, value: str) -> str:
        return token_digest(value)

    def code_digest(self, challenge: str, purpose: OtpPurpose, code: str) -> str:
        return otp_digest(key=self.key, challenge_id=challenge, purpose=purpose.value, code=code)

    def password_hash(self, password: str) -> str:
        return hash_password(password)


class SqlOtpRepository(SqlIdentityRepository):
    def lock_phone(self, phone: str, purpose: OtpPurpose) -> None:
        self.session.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key,0))"),
                             {"key": "identity-otp:" + phone + ":" + purpose.value})

    def latest_created(self, phone: str, purpose: OtpPurpose) -> datetime | None:
        return self.session.execute(text("SELECT max(created_at) FROM identity_otp_challenges "
                                         "WHERE phone=:phone AND purpose=:purpose"),
                                    {"phone": phone, "purpose": purpose.value}).scalar()

    def replace_challenge(self, challenge: Challenge, now: datetime) -> None:
        self.session.execute(text("UPDATE identity_otp_challenges SET consumed=true "
                                  "WHERE phone=:phone AND purpose=:purpose AND consumed=false"),
                             {"phone": challenge.phone, "purpose": challenge.purpose.value})
        self.session.execute(text("INSERT INTO identity_otp_challenges "
                                  "(id,phone,purpose,code_hash,attempts,consumed,created_at,expires_at) "
                                  "VALUES (:id,:phone,:purpose,:hash,0,false,:now,:expires)"),
                             {"id": challenge.id, "phone": challenge.phone,
                              "purpose": challenge.purpose.value, "hash": challenge.code_hash,
                              "now": now, "expires": challenge.expires})

    def challenge_for_update(self, id: str) -> Challenge | None:
        row = self.session.execute(text("SELECT * FROM identity_otp_challenges "
                                        "WHERE id=:id FOR UPDATE"), {"id": id}).mappings().first()
        return Challenge(str(row["id"]), row["phone"], OtpPurpose(row["purpose"]),
                         row["code_hash"], row["attempts"], row["consumed"],
                         row["expires_at"]) if row else None

    def record_attempt(self, id: str, consumed: bool) -> None:
        self.session.execute(text("UPDATE identity_otp_challenges SET attempts=attempts+1, "
                                  "consumed=:consumed WHERE id=:id"), {"id": id, "consumed": consumed})

    def create_grant(self, token_hash: str, grant: PasswordGrant) -> None:
        self.session.execute(text("INSERT INTO identity_password_grants "
                                  "VALUES (:hash,:phone,:purpose,false,:expires)"),
                             {"hash": token_hash, "phone": grant.phone,
                              "purpose": grant.purpose.value, "expires": grant.expires})

    def grant_for_update(self, token_hash: str) -> PasswordGrant | None:
        row = self.session.execute(text("SELECT * FROM identity_password_grants "
                                        "WHERE token_hash=:hash FOR UPDATE"),
                                   {"hash": token_hash}).mappings().first()
        return PasswordGrant(row["phone"], OtpPurpose(row["purpose"]), row["consumed"],
                             row["expires_at"]) if row else None

    def consume_grant(self, token_hash: str) -> None:
        self.session.execute(text("UPDATE identity_password_grants SET consumed=true "
                                  "WHERE token_hash=:hash"), {"hash": token_hash})

    def verified_account(self, phone: str) -> str | None:
        account = self.account_for_update(phone)
        return account.id if account and account.verified and not account.blocked else None

    def register_account(self, phone: str, password_hash: str, now: datetime) -> str | None:
        id = self.session.execute(text("INSERT INTO identity_accounts "
                                       "(id,phone,password_hash,phone_verified,blocked,created_at) "
                                       "VALUES (:id,:phone,:hash,true,false,:now) "
                                       "ON CONFLICT (phone) DO NOTHING RETURNING id"),
                                  {"id": uuid4(), "phone": phone, "hash": password_hash,
                                   "now": now}).scalar()
        if id:
            self.session.execute(text("INSERT INTO identity_account_roles (account_id,role) "
                                      "VALUES (:id,'customer')"), {"id": id})
        return str(id) if id else None

    def reset_password(self, phone: str, password_hash: str) -> str | None:
        account_id = self.verified_account(phone)
        if account_id:
            self.session.execute(text("UPDATE identity_accounts SET password_hash=:hash "
                                      "WHERE id=:id"), {"hash": password_hash, "id": account_id})
            self.session.execute(text("DELETE FROM identity_sessions WHERE account_id=:id"),
                                 {"id": account_id})
            self.session.execute(text("UPDATE identity_password_grants SET consumed=true "
                                      "WHERE phone=:phone"), {"phone": phone})
            self.session.execute(text("UPDATE identity_otp_challenges SET consumed=true "
                                      "WHERE phone=:phone"), {"phone": phone})
        return account_id
