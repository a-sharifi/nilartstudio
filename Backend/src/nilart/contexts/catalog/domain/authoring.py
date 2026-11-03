"""Catalog content validation, independent from HTTP and persistence."""
import unicodedata
from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID


class EntryKind(StrEnum):
    COLLECTIONS = "collections"
    CATEGORIES = "categories"
    PRODUCTS = "products"


class CatalogAuthoringError(ValueError):
    pass


@dataclass(frozen=True)
class EntryContent:
    slug: str
    title_fa: str
    title_en: str
    description_fa: str = ""
    description_en: str = ""
    collection_ids: tuple[UUID, ...] = ()
    category_ids: tuple[UUID, ...] = ()

    def __post_init__(self):
        import re

        if len(self.slug) > 160 or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", self.slug):
            raise CatalogAuthoringError("invalid_slug")
        for title in (self.title_fa, self.title_en):
            if not title.strip() or title != title.strip() or len(title) > 300 or any(unicodedata.category(c) == "Cc" for c in title):
                raise CatalogAuthoringError("invalid_title")
        for description in (self.description_fa, self.description_en):
            if len(description) > 10000 or any(unicodedata.category(c) == "Cc" and c not in "\n\t" for c in description):
                raise CatalogAuthoringError("invalid_description")
        for ids in (self.collection_ids, self.category_ids):
            if len(ids) > 100 or len(set(ids)) != len(ids):
                raise CatalogAuthoringError("invalid_membership")

    def for_kind(self, kind: EntryKind):
        if kind != EntryKind.PRODUCTS and (self.collection_ids or self.category_ids):
            raise CatalogAuthoringError("invalid_membership")
        return self


def validate_reason(reason: str):
    if not reason.strip() or reason != reason.strip() or len(reason) > 1000 or any(unicodedata.category(c) == "Cc" for c in reason):
        raise CatalogAuthoringError("invalid_reason")
