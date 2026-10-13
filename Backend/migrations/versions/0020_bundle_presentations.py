"""Explicit published bundle presentation and permitted component choices."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0020"
down_revision = "0019"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "catalog_bundle_presentations",
        sa.Column(
            "bundle_id", UUID(as_uuid=True), sa.ForeignKey("catalog_bundles.id"), primary_key=True
        ),
        sa.Column("document", JSONB, nullable=False),
        sa.Column("published", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade():
    op.drop_table("catalog_bundle_presentations")
