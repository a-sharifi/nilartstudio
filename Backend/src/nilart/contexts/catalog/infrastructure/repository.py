from decimal import Decimal
from uuid import UUID as PythonUUID

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    ForeignKey,
    Numeric,
    String,
    Text,
    func,
    select,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column
from sqlalchemy.types import TypeDecorator

from nilart.contexts.catalog.domain.entities import SKU, Category, Collection, Product
from nilart.shared.money import Money


class Base(DeclarativeBase):
    pass


class CollectionRow(Base):
    __tablename__ = "catalog_collections"
    id: Mapped[PythonUUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True)
    title_fa: Mapped[str] = mapped_column(String(300))
    title_en: Mapped[str] = mapped_column(String(300))
    published: Mapped[bool] = mapped_column(Boolean, default=False)
    description_fa: Mapped[str] = mapped_column(Text, default="", server_default="")
    description_en: Mapped[str] = mapped_column(Text, default="", server_default="")


class SqlCollectionRepository:
    def __init__(self, session: Session):
        self.session = session

    def published_page(self, page: int, page_size: int):
        total = self.session.scalar(select(func.count()).select_from(CollectionRow)
                                    .where(CollectionRow.published.is_(True)))
        rows = self.session.scalars(select(CollectionRow)
            .where(CollectionRow.published.is_(True))
            .order_by(CollectionRow.slug, CollectionRow.id)
            .offset((page - 1) * page_size).limit(page_size)).all()
        return [Collection(r.id, r.slug, r.title_fa, r.title_en, r.published,
                           r.description_fa, r.description_en)
                for r in rows], total or 0

    def published_detail(self, slug: str):
        row = self.session.scalar(select(CollectionRow).where(
            CollectionRow.slug == slug, CollectionRow.published.is_(True)))
        return None if row is None else Collection(
            row.id, row.slug, row.title_fa, row.title_en, row.published,
            row.description_fa, row.description_en)


class CategoryRow(Base):
    __tablename__ = "catalog_categories"
    id: Mapped[PythonUUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True)
    title_fa: Mapped[str] = mapped_column(String(300))
    title_en: Mapped[str] = mapped_column(String(300))
    published: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    description_fa: Mapped[str] = mapped_column(Text, default="", server_default="")
    description_en: Mapped[str] = mapped_column(Text, default="", server_default="")


class ProductRow(Base):
    __tablename__ = "catalog_products"
    id: Mapped[PythonUUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True)
    title_fa: Mapped[str] = mapped_column(String(300))
    title_en: Mapped[str] = mapped_column(String(300))
    published: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    description_fa: Mapped[str] = mapped_column(Text, default="", server_default="")
    description_en: Mapped[str] = mapped_column(Text, default="", server_default="")


class ProductPresentationRow(Base):
    __tablename__ = "catalog_product_presentations"
    product_id: Mapped[PythonUUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("catalog_products.id"), primary_key=True)
    document: Mapped[dict] = mapped_column(JSON)
    published: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")


class ProductCollectionRow(Base):
    __tablename__ = "catalog_product_collections"
    product_id: Mapped[PythonUUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("catalog_products.id", ondelete="CASCADE"), primary_key=True)
    collection_id: Mapped[PythonUUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("catalog_collections.id", ondelete="CASCADE"),
        primary_key=True, index=True)


class ProductCategoryRow(Base):
    __tablename__ = "catalog_product_categories"
    product_id: Mapped[PythonUUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("catalog_products.id", ondelete="CASCADE"), primary_key=True)
    category_id: Mapped[PythonUUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("catalog_categories.id", ondelete="CASCADE"),
        primary_key=True, index=True)


class ExactAmount(TypeDecorator[Decimal]):
    """Reject lossy writes before the database can round or coerce a float."""
    impl = Numeric(24, 6)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            Money(value)
            exponent = value.as_tuple().exponent
            if value >= 10 ** 18 or not isinstance(exponent, int) or exponent < -6:
                raise ValueError("Price must fit NUMERIC(24, 6) without rounding")
        return value


class SKURow(Base):
    __tablename__ = "catalog_skus"
    __table_args__ = (
        CheckConstraint("price_amount IS NULL OR price_amount >= 0", name="ck_sku_price"),
        CheckConstraint("(price_amount IS NULL AND currency IS NULL) OR "
                        "(price_amount IS NOT NULL AND currency IS NOT NULL "
                        "AND currency IN ('IRT', 'IRR'))", name="ck_sku_money"),
    )
    id: Mapped[PythonUUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    product_id: Mapped[PythonUUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("catalog_products.id"), index=True)
    code: Mapped[str] = mapped_column(String(160), unique=True)
    published: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    price_amount: Mapped[Decimal | None] = mapped_column(ExactAmount())
    currency: Mapped[str | None] = mapped_column(String(3))


class SqlCatalogRepository:
    MODELS: dict[str, type[CategoryRow] | type[ProductRow] | type[SKURow]] = {
        "categories": CategoryRow, "products": ProductRow, "skus": SKURow,
    }

    def __init__(self, session: Session):
        self.session = session

    def _statement(self, resource):
        model = self.MODELS[resource]
        statement = select(model).where(model.published.is_(True))
        if resource == "skus":
            statement = statement.join(ProductRow, SKURow.product_id == ProductRow.id)
        if resource in {"products", "skus"}:
            statement = statement.where(ProductRow.published.is_(True))
        return statement

    def _entity(self, row):
        if isinstance(row, SKURow):
            price = None
            if row.price_amount is not None:
                if row.currency is None:
                    raise ValueError("Price requires a currency")
                price = Money(row.price_amount, row.currency)
            return SKU(row.id, row.product_id, row.code, row.published,
                       price)
        if isinstance(row, ProductRow):
            collection_ids = tuple(self.session.scalars(select(CollectionRow.id)
                .join(ProductCollectionRow, ProductCollectionRow.collection_id == CollectionRow.id)
                .where(ProductCollectionRow.product_id == row.id, CollectionRow.published.is_(True))
                .order_by(CollectionRow.slug, CollectionRow.id)).all())
            category_ids = tuple(self.session.scalars(select(CategoryRow.id)
                .join(ProductCategoryRow, ProductCategoryRow.category_id == CategoryRow.id)
                .where(ProductCategoryRow.product_id == row.id, CategoryRow.published.is_(True))
                .order_by(CategoryRow.slug, CategoryRow.id)).all())
            return Product(row.id, row.slug, row.title_fa, row.title_en, row.published,
                           row.description_fa, row.description_en,
                           collection_ids, category_ids)
        return Category(row.id, row.slug, row.title_fa, row.title_en, row.published,
                        row.description_fa, row.description_en)

    def _products(self, rows):
        if not rows:
            return []
        ids = [row.id for row in rows]
        collections: dict[PythonUUID, list[PythonUUID]] = {id_: [] for id_ in ids}
        categories: dict[PythonUUID, list[PythonUUID]] = {id_: [] for id_ in ids}
        for product_id, collection_id in self.session.execute(
                select(ProductCollectionRow.product_id, CollectionRow.id)
                .join(CollectionRow, ProductCollectionRow.collection_id == CollectionRow.id)
                .where(ProductCollectionRow.product_id.in_(ids), CollectionRow.published.is_(True))
                .order_by(CollectionRow.slug, CollectionRow.id)):
            collections[product_id].append(collection_id)
        for product_id, category_id in self.session.execute(
                select(ProductCategoryRow.product_id, CategoryRow.id)
                .join(CategoryRow, ProductCategoryRow.category_id == CategoryRow.id)
                .where(ProductCategoryRow.product_id.in_(ids), CategoryRow.published.is_(True))
                .order_by(CategoryRow.slug, CategoryRow.id)):
            categories[product_id].append(category_id)
        return [Product(row.id, row.slug, row.title_fa, row.title_en, row.published,
                        row.description_fa, row.description_en,
                        tuple(collections[row.id]), tuple(categories[row.id])) for row in rows]

    def page(self, resource, page, page_size, collection=None, category=None):
        statement = self._statement(resource)
        model = self.MODELS[resource]
        if resource == "products":
            if collection is not None:
                statement = statement.join(ProductCollectionRow,
                    ProductCollectionRow.product_id == ProductRow.id).join(CollectionRow,
                    ProductCollectionRow.collection_id == CollectionRow.id).where(
                    CollectionRow.slug == collection, CollectionRow.published.is_(True))
            if category is not None:
                statement = statement.join(ProductCategoryRow,
                    ProductCategoryRow.product_id == ProductRow.id).join(CategoryRow,
                    ProductCategoryRow.category_id == CategoryRow.id).where(
                    CategoryRow.slug == category, CategoryRow.published.is_(True))
            statement = statement.distinct()
        total = self.session.scalar(select(func.count()).select_from(statement.subquery())) or 0
        key = getattr(model, "code" if resource == "skus" else "slug")
        rows = self.session.scalars(statement.order_by(key, model.id)
                                    .offset((page - 1) * page_size).limit(page_size)).all()
        entities = self._products(rows) if resource == "products" else [self._entity(row) for row in rows]
        return entities, total

    def detail(self, resource, key):
        model = self.MODELS[resource]
        column = getattr(model, "code" if resource == "skus" else "slug")
        row = self.session.scalar(self._statement(resource).where(column == key))
        return None if row is None else self._entity(row)

    def skus(self, product_slug):
        product_id = self.session.scalar(select(ProductRow.id).where(
            ProductRow.slug == product_slug, ProductRow.published.is_(True)))
        if product_id is None:
            return None
        rows = self.session.scalars(self._statement("skus").where(
            SKURow.product_id == product_id).order_by(SKURow.code, SKURow.id)).all()
        return [self._entity(row) for row in rows]
