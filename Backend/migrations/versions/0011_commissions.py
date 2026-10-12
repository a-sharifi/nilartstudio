"""Account-owned commission requests, without quotes or payment."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("commission_requests",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("account_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False),
        sa.Column("submission_id", UUID(as_uuid=True), nullable=False),
        sa.Column("brief", JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("account_id", "submission_id", name="uq_commission_submission"))
    op.create_index("ix_commission_owner", "commission_requests", ["account_id", "created_at"])


def downgrade():
    op.drop_table("commission_requests")
