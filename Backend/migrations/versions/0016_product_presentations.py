"""Product detail content, separate from unpublished SKU option drafts."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0016"
down_revision = "0015"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("catalog_product_presentations",
        sa.Column("product_id", UUID(as_uuid=True), sa.ForeignKey("catalog_products.id"), primary_key=True),
        sa.Column("document", JSONB(), nullable=False),
        sa.Column("published", sa.Boolean(), nullable=False, server_default="false"))


def downgrade():
    op.drop_table("catalog_product_presentations")
