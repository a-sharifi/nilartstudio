"""Versioned explicit SKU prices and atomic audit; no inferred prices or stock."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("catalog_sku_price_versions",
        sa.Column("sku_id", UUID(as_uuid=True), sa.ForeignKey("catalog_skus.id"), primary_key=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.CheckConstraint("version > 0", name="ck_sku_price_version"))
    op.create_table("catalog_sku_price_audits",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("sku_id", UUID(as_uuid=True), sa.ForeignKey("catalog_skus.id"), nullable=False),
        sa.Column("product_id", UUID(as_uuid=True), sa.ForeignKey("catalog_products.id"), nullable=False),
        sa.Column("actor_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False),
        sa.Column("previous_version", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("before", JSONB(), nullable=False),
        sa.Column("after", JSONB(), nullable=False),
        sa.CheckConstraint("previous_version >= 0 AND version = previous_version + 1",
                           name="ck_sku_price_audit_version"))
    op.create_index("ix_sku_price_audit_version", "catalog_sku_price_audits",
                    ["sku_id", "version"], unique=True)


def downgrade():
    op.drop_table("catalog_sku_price_audits")
    op.drop_table("catalog_sku_price_versions")
