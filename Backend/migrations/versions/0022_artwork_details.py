"""Persist optional artwork metadata and explicitly marked sample availability."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0022"
down_revision = "0021"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "catalog_artwork_details",
        sa.Column("artwork_id", UUID(as_uuid=True), sa.ForeignKey("catalog_artworks.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("document", JSONB, nullable=False),
    )


def downgrade():
    op.drop_table("catalog_artwork_details")
