"""Versioned private materials and estimated service rates."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0029"
down_revision = "0028"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("cost_resources",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("code", sa.String(80), nullable=False),
        sa.Column("content", JSONB, nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("kind", "code", name="uq_cost_resource_code"),
        sa.CheckConstraint("kind IN ('material','service') AND version>0", name="ck_cost_resource_kind_version"))
    op.create_table("cost_resource_versions",
        sa.Column("revision_id", UUID(as_uuid=True), primary_key=True),
        sa.Column("resource_id", UUID(as_uuid=True), sa.ForeignKey("cost_resources.id"), nullable=False),
        sa.Column("actor_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False),
        sa.Column("expected_version", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("content", JSONB, nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("resource_id", "version", name="uq_cost_resource_version"),
        sa.CheckConstraint("expected_version>=0 AND version=expected_version+1", name="ck_cost_resource_revision_version"))


def downgrade():
    op.drop_table("cost_resource_versions")
    op.drop_table("cost_resources")
