"""Infrastructure consumer deduplication, independent of business domains."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("processed_events",
                    sa.Column("event_id", UUID(as_uuid=True), primary_key=True),
                    sa.Column("processed_at", sa.DateTime(timezone=True), nullable=False))


def downgrade():
    op.drop_table("processed_events")
