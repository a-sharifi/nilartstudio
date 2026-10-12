"""Versioned account-owned profiles; no invented profile values."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("identity_profiles",
                    sa.Column("account_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), primary_key=True),
                    sa.Column("full_name", sa.String(120), nullable=False),
                    sa.Column("version", sa.Integer(), nullable=False),
                    sa.CheckConstraint("version > 0", name="ck_profile_version"))


def downgrade():
    op.drop_table("identity_profiles")
