"""Explicit bundle composition without inferred capacity or discounts."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("catalog_bundles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(160), nullable=False, unique=True),
        sa.Column("title_fa", sa.String(300), nullable=False),
        sa.Column("title_en", sa.String(300), nullable=False),
        sa.Column("description_fa", sa.Text(), nullable=False, server_default=""),
        sa.Column("description_en", sa.Text(), nullable=False, server_default=""),
        sa.Column("published", sa.Boolean(), nullable=False, server_default="false"))
    op.create_table("catalog_bundle_components",
        sa.Column("bundle_id", UUID(as_uuid=True), sa.ForeignKey("catalog_bundles.id"), primary_key=True),
        sa.Column("sku_id", UUID(as_uuid=True), sa.ForeignKey("catalog_skus.id"), primary_key=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.CheckConstraint("quantity > 0", name="ck_bundle_component_quantity"))


def downgrade():
    op.drop_table("catalog_bundle_components")
    op.drop_table("catalog_bundles")
