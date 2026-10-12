from dataclasses import dataclass
from typing import Protocol

from nilart.contexts.identity.domain.rules import IdentityError, normalize_full_name


@dataclass(frozen=True)
class Profile:
    account_id: str
    full_name: str
    phone: str
    version: int


class ProfileRepository(Protocol):
    def read(self, account_id: str) -> Profile: ...
    def update(self, account_id: str, full_name: str, version: int) -> Profile | None: ...


class UpdateProfile:
    def __init__(self, repository: ProfileRepository):
        self.repository = repository

    def execute(self, account_id: str, full_name: str, version: int) -> Profile:
        name = normalize_full_name(full_name)
        result = self.repository.update(account_id, name, version)
        if result is None:
            raise IdentityError("profile_version_conflict")
        return result
