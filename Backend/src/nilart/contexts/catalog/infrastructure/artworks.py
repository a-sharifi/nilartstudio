from sqlalchemy import text


class SqlArtworkRepository:
    def __init__(self, session):
        self.session = session

    def page(self, page, page_size):
        total = self.session.scalar(text("SELECT count(*) FROM catalog_artworks a LEFT JOIN catalog_artwork_details d ON d.artwork_id=a.id WHERE published=true"))
        items = self.session.execute(text("SELECT a.id,a.slug,a.title_fa,a.title_en,a.description_fa,a.description_en,d.document AS details "
            "FROM catalog_artworks a LEFT JOIN catalog_artwork_details d ON d.artwork_id=a.id WHERE published=true ORDER BY a.slug,a.id LIMIT :limit OFFSET :offset"),
            {"limit": page_size, "offset": (page - 1) * page_size}).mappings().all()
        return {"items": items, "total": total, "page": page, "page_size": page_size}

    def detail(self, slug):
        return self.session.execute(text("SELECT a.id,a.slug,a.title_fa,a.title_en,a.description_fa,a.description_en,d.document AS details "
            "FROM catalog_artworks a LEFT JOIN catalog_artwork_details d ON d.artwork_id=a.id WHERE slug=:slug AND published=true"), {"slug": slug}).mappings().first()
