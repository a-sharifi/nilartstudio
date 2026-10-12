from typing import Protocol


class ArtworkRepository(Protocol):
    def page(self, page, page_size): ...
    def detail(self, slug): ...


class ReadArtworks:
    def __init__(self, repository: ArtworkRepository):
        self.repository = repository

    def page(self, page, page_size):
        if not 1 <= page <= 2147483647 or not 1 <= page_size <= 100:
            raise ValueError("Invalid pagination")
        return self.repository.page(page, page_size)

    def detail(self, slug):
        return self.repository.detail(slug)
