"""Public catalog foundation; prices are explicit and inventory is out of scope."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def translated_columns():
    return [
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(160), nullable=False, unique=True),
        sa.Column("title_fa", sa.String(300), nullable=False),
        sa.Column("title_en", sa.String(300), nullable=False),
        sa.Column("published", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("description_fa", sa.Text, nullable=False, server_default=""),
        sa.Column("description_en", sa.Text, nullable=False, server_default=""),
    ]


def upgrade():
    op.add_column("catalog_collections", sa.Column(
        "description_fa", sa.Text, nullable=False, server_default=""))
    op.add_column("catalog_collections", sa.Column(
        "description_en", sa.Text, nullable=False, server_default=""))
    op.create_table("catalog_categories", *translated_columns())
    op.create_table("catalog_products", *translated_columns())
    op.create_table("catalog_product_collections",
        sa.Column("product_id", UUID(as_uuid=True),
                  sa.ForeignKey("catalog_products.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("collection_id", UUID(as_uuid=True),
                  sa.ForeignKey("catalog_collections.id", ondelete="CASCADE"), primary_key=True))
    op.create_index("ix_catalog_product_collections_collection_id",
                    "catalog_product_collections", ["collection_id"])
    op.create_table("catalog_product_categories",
        sa.Column("product_id", UUID(as_uuid=True),
                  sa.ForeignKey("catalog_products.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("category_id", UUID(as_uuid=True),
                  sa.ForeignKey("catalog_categories.id", ondelete="CASCADE"), primary_key=True))
    op.create_index("ix_catalog_product_categories_category_id",
                    "catalog_product_categories", ["category_id"])
    op.create_table("catalog_skus",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", UUID(as_uuid=True), sa.ForeignKey("catalog_products.id"),
                  nullable=False),
        sa.Column("code", sa.String(160), nullable=False, unique=True),
        sa.Column("published", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("price_amount", sa.Numeric(24, 6)),
        sa.Column("currency", sa.String(3)),
        sa.CheckConstraint("price_amount IS NULL OR price_amount >= 0", name="ck_sku_price"),
        sa.CheckConstraint("(price_amount IS NULL AND currency IS NULL) OR "
                           "(price_amount IS NOT NULL AND currency IS NOT NULL "
                           "AND currency IN ('IRT', 'IRR'))", name="ck_sku_money"))
    op.create_index("ix_catalog_skus_product_id", "catalog_skus", ["product_id"])


def downgrade():
    op.drop_table("catalog_skus")
    op.drop_table("catalog_product_categories")
    op.drop_table("catalog_product_collections")
    op.drop_table("catalog_products")
    op.drop_table("catalog_categories")
    op.drop_column("catalog_collections", "description_en")
    op.drop_column("catalog_collections", "description_fa")
