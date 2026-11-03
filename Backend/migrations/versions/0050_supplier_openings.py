"""Explicit supplier opening confirmations and linked append-only corrections."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0050"
down_revision = "0049"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "supplier_opening_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "supplier_id",
            UUID(as_uuid=True),
            sa.ForeignKey("procurement_suppliers.id"),
            nullable=False,
        ),
        sa.Column(
            "actor_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False
        ),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column(
            "corrects_id",
            UUID(as_uuid=True),
            sa.ForeignKey("supplier_opening_events.id"),
            unique=True,
        ),
        sa.Column("amount", sa.Numeric(24, 6), nullable=False),
        sa.Column("delta", sa.Numeric(24, 6), nullable=False),
        sa.Column("as_of_date", sa.Date(), nullable=False),
        sa.Column("source_reference", sa.String(500), nullable=False),
        sa.Column("intent", JSONB, nullable=False),
        sa.Column("result", JSONB, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("supplier_id", "version", name="uq_supplier_opening_version"),
        sa.CheckConstraint(
            "version>0 AND ((version=1 AND corrects_id IS NULL) OR (version>1 AND corrects_id IS NOT NULL))",
            name="ck_supplier_opening_link",
        ),
    )


def downgrade():
    op.drop_table("supplier_opening_events")
