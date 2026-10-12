"""Unpublished SKU authoring versions and atomic audits."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("catalog_sku_authoring_versions",
        sa.Column("sku_id", UUID(as_uuid=True), sa.ForeignKey("catalog_skus.id"), primary_key=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.CheckConstraint("version > 0", name="ck_sku_authoring_version"))
    op.create_table("catalog_sku_authoring_audits",
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
                           name="ck_sku_authoring_audit_version"))
    op.create_index("ix_sku_authoring_audit_version", "catalog_sku_authoring_audits",
                    ["sku_id", "version"], unique=True)


def downgrade():
    op.drop_table("catalog_sku_authoring_audits")
    op.drop_table("catalog_sku_authoring_versions")
