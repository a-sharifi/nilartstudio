"""Versioned price proposals, explicit publication and retained command receipts."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0041"
down_revision = "0040"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "pricing_proposals",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("sku_id", UUID(as_uuid=True), sa.ForeignKey("catalog_skus.id"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("content", JSONB, nullable=False),
        sa.Column("snapshot", JSONB, nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "version>0 AND status IN ('pending','published','rejected')", name="ck_pricing_proposal"
        ),
    )
    op.create_table(
        "pricing_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "proposal_id", UUID(as_uuid=True), sa.ForeignKey("pricing_proposals.id"), nullable=False
        ),
        sa.Column(
            "actor_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False
        ),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("intent", JSONB, nullable=False),
        sa.Column("result", JSONB, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("proposal_id", "version", name="uq_pricing_proposal_version"),
    )


def downgrade():
    op.drop_table("pricing_events")
    op.drop_table("pricing_proposals")
