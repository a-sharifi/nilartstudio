"""Immutable business configuration revisions; no inferred business values."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0034"
down_revision = "0033"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("business_settings",
        sa.Column("key", sa.String(40), primary_key=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("content", JSONB, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("key='business' AND version>0", name="ck_business_settings_singleton"))
    op.create_table("business_setting_versions",
        sa.Column("revision_id", UUID(as_uuid=True), primary_key=True),
        sa.Column("actor_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False),
        sa.Column("expected_version", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, unique=True),
        sa.Column("content", JSONB, nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("expected_version>=0 AND version=expected_version+1", name="ck_business_setting_revision"))


def downgrade():
    op.drop_table("business_setting_versions")
    op.drop_table("business_settings")
