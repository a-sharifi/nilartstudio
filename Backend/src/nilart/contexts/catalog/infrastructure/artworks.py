from sqlalchemy import text


class SqlArtworkRepository:
    def __init__(self, session):
        self.session = session

    def page(self, page, page_size):
        total = self.session.scalar(text("SELECT count(*) FROM catalog_artworks WHERE published=true"))
        items = self.session.execute(text("SELECT id,slug,title_fa,title_en,description_fa,description_en "
            "FROM catalog_artworks WHERE published=true ORDER BY slug,id LIMIT :limit OFFSET :offset"),
            {"limit": page_size, "offset": (page - 1) * page_size}).mappings().all()
        return {"items": items, "total": total, "page": page, "page_size": page_size}

    def detail(self, slug):
        return self.session.execute(text("SELECT id,slug,title_fa,title_en,description_fa,description_en "
            "FROM catalog_artworks WHERE slug=:slug AND published=true"), {"slug": slug}).mappings().first()
