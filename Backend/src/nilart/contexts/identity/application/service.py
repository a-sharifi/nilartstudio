from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Protocol

from nilart.contexts.identity.domain.rules import IdentityError, normalize_phone


@dataclass(frozen=True)
class Account:
    id: str
    phone: str
    password_hash: str
    verified: bool
    blocked: bool


@dataclass(frozen=True)
class SessionAccount:
    id: str
    phone: str
    csrf_hash: str


@dataclass(frozen=True)
class SessionGrant:
    account_id: str
    token: str
    csrf: str
    expires: datetime


class Repository(Protocol):
    def account_for_update(self, phone: str) -> Account | None: ...
    def store_session(self, account_id: str, token_hash: str, csrf_hash: str,
                      now: datetime, expires: datetime) -> None: ...
    def session_account(self, token_hash: str, now: datetime) -> SessionAccount | None: ...
    def delete_session(self, token_hash: str, csrf_hash: str) -> bool: ...


class PasswordSignIn:
    def __init__(self, repository: Repository, verify: Callable[[str, str], bool],
                 token: Callable[[], str], digest: Callable[[str], str], dummy_hash: str):
        self.repository = repository
        self.verify, self.token, self.digest, self.dummy_hash = verify, token, digest, dummy_hash

    def execute(self, phone: str, password: str) -> SessionGrant:
        account = self.repository.account_for_update(normalize_phone(phone))
        valid = self.verify(password, account.password_hash if account else self.dummy_hash)
        if not valid or not account or not account.verified or account.blocked:
            raise IdentityError("invalid_credentials")
        now = datetime.now(UTC)
        token, csrf = self.token(), self.token()
        expires = now + timedelta(hours=24)
        self.repository.store_session(account.id, self.digest(token), self.digest(csrf), now, expires)
        return SessionGrant(account.id, token, csrf, expires)
