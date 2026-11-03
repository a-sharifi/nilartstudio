from typing import Protocol
from uuid import UUID

from nilart.contexts.catalog.domain.authoring import EntryContent, EntryKind, validate_reason


class CatalogAuthoringRepository(Protocol):
    def create(self, kind, entry_id, actor_id, content, reason): ...
    def update(self, kind, entry_id, actor_id, version, content, reason): ...
    def publish(self, kind, entry_id, actor_id, version, published, reason): ...


class AuthorCatalog:
    def __init__(self, repository: CatalogAuthoringRepository):
        self.repository = repository

    def create(self, kind: EntryKind, entry_id: UUID, actor_id: str, content: EntryContent, reason: str):
        validate_reason(reason)
        return self.repository.create(kind, entry_id, actor_id, content.for_kind(kind), reason)

    def update(self, kind: EntryKind, entry_id: UUID, actor_id: str, version: int, content: EntryContent, reason: str):
        validate_reason(reason)
        return self.repository.update(kind, entry_id, actor_id, version, content.for_kind(kind), reason)

    def publish(self, kind: EntryKind, entry_id: UUID, actor_id: str, version: int, published: bool, reason: str):
        validate_reason(reason)
        return self.repository.publish(kind, entry_id, actor_id, version, published, reason)
