"""Explicit SKU option snapshots; no automatic publication."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("catalog_sku_option_mappings",
        sa.Column("sku_id", UUID(as_uuid=True), sa.ForeignKey("catalog_skus.id"), primary_key=True),
        sa.Column("configuration_id", UUID(as_uuid=True), sa.ForeignKey("catalog_option_drafts.id"), nullable=False),
        sa.Column("configuration_version", sa.Integer(), nullable=False),
        sa.Column("combination_code", sa.String(160), nullable=False),
        sa.Column("snapshot", JSONB(), nullable=False),
        sa.CheckConstraint("configuration_version > 0", name="ck_sku_mapping_version"),
        sa.UniqueConstraint("configuration_id", "configuration_version", "combination_code",
                            name="uq_sku_mapping_combination"))


def downgrade():
    op.drop_table("catalog_sku_option_mappings")
