"""Separate opening-balance allocations on the existing operational cash ledger."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0051"
down_revision = "0050"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "finance_opening_allocations",
        sa.Column(
            "document_id",
            UUID(as_uuid=True),
            sa.ForeignKey("finance_documents.id"),
            primary_key=True,
        ),
        sa.Column(
            "supplier_id",
            UUID(as_uuid=True),
            sa.ForeignKey("procurement_suppliers.id"),
            nullable=False,
        ),
        sa.Column(
            "opening_event_id",
            UUID(as_uuid=True),
            sa.ForeignKey("supplier_opening_events.id"),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(24, 6), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.UniqueConstraint("supplier_id", "version", name="uq_opening_settlement_version"),
        sa.CheckConstraint("version>0 AND amount<>0", name="ck_opening_settlement"),
    )


def downgrade():
    op.drop_table("finance_opening_allocations")
