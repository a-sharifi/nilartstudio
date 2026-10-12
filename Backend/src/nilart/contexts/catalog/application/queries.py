from typing import Protocol

from nilart.contexts.catalog.domain.entities import Collection


class CollectionRepository(Protocol):
    def published_page(self, page: int, page_size: int) -> tuple[list[Collection], int]: ...

    def published_detail(self, slug: str) -> Collection | None: ...


class ListCollections:
    def __init__(self, repository: CollectionRepository):
        self.repository = repository

    def execute(self, page: int, page_size: int) -> tuple[list[Collection], int]:
        if page < 1 or not 1 <= page_size <= 100:
            raise ValueError("Invalid pagination")
        return self.repository.published_page(page, page_size)


class GetCollection:
    def __init__(self, repository: CollectionRepository):
        self.repository = repository

    def execute(self, slug: str) -> Collection | None:
        return self.repository.published_detail(slug)


class CatalogRepository(Protocol):
    def page(self, resource: str, page: int, page_size: int,
             collection: str | None = None, category: str | None = None): ...

    def detail(self, resource: str, key: str): ...

    def skus(self, product_slug: str): ...


class ListCatalog:
    def __init__(self, repository: CatalogRepository):
        self.repository = repository

    def execute(self, resource: str, page: int, page_size: int,
                collection: str | None = None, category: str | None = None):
        if page < 1 or not 1 <= page_size <= 100:
            raise ValueError("Invalid pagination")
        return self.repository.page(resource, page, page_size, collection, category)


class GetCatalog:
    def __init__(self, repository: CatalogRepository):
        self.repository = repository

    def execute(self, resource: str, key: str):
        return self.repository.detail(resource, key)


class ListProductSKUs:
    def __init__(self, repository: CatalogRepository):
        self.repository = repository

    def execute(self, product_slug: str):
        return self.repository.skus(product_slug)
