from dataclasses import dataclass
from uuid import UUID

from nilart.shared.money import Money


@dataclass(frozen=True)
class CatalogEntry:
    id: UUID
    slug: str
    title_fa: str
    title_en: str
    published: bool
    description_fa: str = ""
    description_en: str = ""

    def __post_init__(self):
        if not self.slug or not self.title_fa.strip() or not self.title_en.strip():
            raise ValueError("Catalog entry requires slug and both titles")


@dataclass(frozen=True)
class Collection(CatalogEntry):
    pass


@dataclass(frozen=True)
class Category(CatalogEntry):
    pass


@dataclass(frozen=True)
class Product(CatalogEntry):
    collection_ids: tuple[UUID, ...] = ()
    category_ids: tuple[UUID, ...] = ()


@dataclass(frozen=True)
class SKU:
    id: UUID
    product_id: UUID
    code: str
    published: bool
    price: Money | None = None

    def __post_init__(self):
        if not self.code.strip():
            raise ValueError("SKU requires a code")
        if self.price is not None:
            amount = self.price.amount
            exponent = amount.as_tuple().exponent
            if amount >= 10 ** 18 or not isinstance(exponent, int) or exponent < -6:
                raise ValueError("SKU price must fit NUMERIC(24, 6) without rounding")
