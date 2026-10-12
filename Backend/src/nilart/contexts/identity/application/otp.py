import hmac
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Protocol
from uuid import uuid4

from nilart.contexts.identity.application.service import SessionGrant
from nilart.contexts.identity.domain.rules import (
    IdentityError,
    OtpPurpose,
    normalize_phone,
    require_active_challenge,
    validate_password,
)


class SmsSender(Protocol):
    def send_code(self, phone: str, code: str, purpose: OtpPurpose) -> None: ...


class OtpSecrets(Protocol):
    def code(self) -> str: ...
    def token(self) -> str: ...
    def digest(self, value: str) -> str: ...
    def code_digest(self, challenge: str, purpose: OtpPurpose, code: str) -> str: ...
    def password_hash(self, password: str) -> str: ...


@dataclass(frozen=True)
class Challenge:
    id: str
    phone: str
    purpose: OtpPurpose
    code_hash: str
    attempts: int
    consumed: bool
    expires: datetime


@dataclass(frozen=True)
class PasswordGrant:
    phone: str
    purpose: OtpPurpose
    consumed: bool
    expires: datetime


class OtpRepository(Protocol):
    def lock_phone(self, phone: str, purpose: OtpPurpose) -> None: ...
    def latest_created(self, phone: str, purpose: OtpPurpose) -> datetime | None: ...
    def replace_challenge(self, challenge: Challenge, now: datetime) -> None: ...
    def challenge_for_update(self, id: str) -> Challenge | None: ...
    def record_attempt(self, id: str, consumed: bool) -> None: ...
    def create_grant(self, token_hash: str, grant: PasswordGrant) -> None: ...
    def grant_for_update(self, token_hash: str) -> PasswordGrant | None: ...
    def consume_grant(self, token_hash: str) -> None: ...
    def verified_account(self, phone: str) -> str | None: ...
    def register_account(self, phone: str, password_hash: str, now: datetime) -> str | None: ...
    def reset_password(self, phone: str, password_hash: str) -> str | None: ...
    def store_session(self, account_id: str, token_hash: str, csrf_hash: str,
                      now: datetime, expires: datetime) -> None: ...


class OtpService:
    def __init__(self, repository: OtpRepository, secrets: OtpSecrets, sms: SmsSender):
        self.repository, self.secrets, self.sms = repository, secrets, sms

    def request(self, phone: str, purpose: OtpPurpose) -> Challenge:
        phone, now = normalize_phone(phone), datetime.now(UTC)
        self.repository.lock_phone(phone, purpose)
        latest = self.repository.latest_created(phone, purpose)
        if latest and now < latest + timedelta(seconds=60):
            raise IdentityError("rate_limited")
        id, code = str(uuid4()), self.secrets.code()
        challenge = Challenge(id, phone, purpose, self.secrets.code_digest(id, purpose, code),
                              0, False, now + timedelta(minutes=3))
        self.repository.replace_challenge(challenge, now)
        # Never log/store plaintext OTP or report delivery. Exceptions abort this request.
        self.sms.send_code(phone, code, purpose)
        return challenge

    def verify(self, id: str, purpose: OtpPurpose, code: str) -> SessionGrant | str:
        challenge, now = self.repository.challenge_for_update(id), datetime.now(UTC)
        if not challenge:
            raise IdentityError("invalid_or_expired_challenge")
        require_active_challenge(purpose=challenge.purpose, expected=purpose,
                                 expires_at=challenge.expires, now=now,
                                 attempts=challenge.attempts, consumed=challenge.consumed)
        valid = hmac.compare_digest(challenge.code_hash, self.secrets.code_digest(id, purpose, code))
        # Failed attempts MUST commit too. Boundary commits expected domain failures.
        self.repository.record_attempt(id, consumed=valid)
        if not valid:
            raise IdentityError("invalid_or_expired_challenge")
        if purpose == OtpPurpose.LOGIN:
            account_id = self.repository.verified_account(challenge.phone)
            if not account_id:
                raise IdentityError("invalid_or_expired_challenge")
            return self._session(account_id, now)
        token = self.secrets.token()
        self.repository.create_grant(self.secrets.digest(token), PasswordGrant(
            challenge.phone, purpose, False, now + timedelta(minutes=10)))
        return token

    def complete(self, token: str, purpose: OtpPurpose, password: str) -> SessionGrant:
        validate_password(password)
        now, digest = datetime.now(UTC), self.secrets.digest(token)
        grant = self.repository.grant_for_update(digest)
        if (not grant or grant.consumed or grant.expires <= now or grant.purpose != purpose
                or purpose == OtpPurpose.LOGIN):
            raise IdentityError("invalid_or_expired_grant")
        self.repository.consume_grant(digest)
        password_hash = self.secrets.password_hash(password)
        if purpose == OtpPurpose.REGISTER:
            account_id = self.repository.register_account(grant.phone, password_hash, now)
        else:
            account_id = self.repository.reset_password(grant.phone, password_hash)
        if not account_id:
            raise IdentityError("invalid_or_expired_grant")
        return self._session(account_id, now)

    def _session(self, account_id: str, now: datetime) -> SessionGrant:
        token, csrf = self.secrets.token(), self.secrets.token()
        expires = now + timedelta(hours=24)
        self.repository.store_session(account_id, self.secrets.digest(token),
                                      self.secrets.digest(csrf), now, expires)
        return SessionGrant(account_id, token, csrf, expires)
