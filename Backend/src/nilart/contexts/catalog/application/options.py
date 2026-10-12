from typing import Protocol
from uuid import UUID

from nilart.contexts.catalog.domain.options import OptionDocument


class OptionDraftRepository(Protocol):
    def save(self, product_id, actor_id, version, document): ...


class UpdateOptionDraft:
    def __init__(self, repository: OptionDraftRepository):
        self.repository = repository

    def execute(self, product_id: UUID, actor_id: str, version: int, document: OptionDocument):
        return self.repository.save(product_id, actor_id, version, document.snapshot())
