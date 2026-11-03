"""Operational cash ledger, supplier allocations and immutable command receipts."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0040"
down_revision = "0039"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "finance_accounts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(80), unique=True, nullable=False),
        sa.Column("title_fa", sa.String(200), nullable=False),
        sa.Column("title_en", sa.String(200), nullable=False),
        sa.Column("kind", sa.String(10), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("balance", sa.Numeric(24, 6), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "kind IN ('cash','bank') AND currency='IRT' AND balance>=0 AND version>0",
            name="ck_finance_account",
        ),
    )
    op.create_table(
        "finance_documents",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("kind", sa.String(30), nullable=False),
        sa.Column("effect_kind", sa.String(30), nullable=False),
        sa.Column("document_number", sa.String(100), nullable=False),
        sa.Column("document_date", sa.Date(), nullable=False),
        sa.Column("amount", sa.Numeric(24, 6), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("supporting_reference", sa.String(500), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column(
            "reverses_id", UUID(as_uuid=True), sa.ForeignKey("finance_documents.id"), unique=True
        ),
        sa.Column(
            "actor_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("amount>=0 AND currency='IRT'", name="ck_finance_document"),
    )
    op.create_table(
        "finance_lines",
        sa.Column(
            "document_id",
            UUID(as_uuid=True),
            sa.ForeignKey("finance_documents.id"),
            primary_key=True,
        ),
        sa.Column(
            "account_id", UUID(as_uuid=True), sa.ForeignKey("finance_accounts.id"), primary_key=True
        ),
        sa.Column("account_code", sa.String(80), nullable=False),
        sa.Column("delta", sa.Numeric(24, 6), nullable=False),
        sa.Column("balance_after", sa.Numeric(24, 6), nullable=False),
        sa.Column("account_version", sa.Integer(), nullable=False),
        sa.UniqueConstraint(
            "account_id", "account_version", name="uq_finance_account_line_version"
        ),
    )
    op.create_table(
        "finance_allocations",
        sa.Column(
            "document_id",
            UUID(as_uuid=True),
            sa.ForeignKey("finance_documents.id"),
            primary_key=True,
        ),
        sa.Column(
            "purchase_id",
            UUID(as_uuid=True),
            sa.ForeignKey("procurement_purchases.id"),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(24, 6), nullable=False),
    )
    op.create_table(
        "finance_commands",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "actor_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False
        ),
        sa.Column("area", sa.String(20), nullable=False),
        sa.Column("target_id", UUID(as_uuid=True), nullable=False),
        sa.Column("intent", JSONB, nullable=False),
        sa.Column("result", JSONB, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_finance_documents_date", "finance_documents", ["document_date", "id"])
    op.create_index("ix_finance_allocations_purchase", "finance_allocations", ["purchase_id"])


def downgrade():
    op.drop_table("finance_commands")
    op.drop_table("finance_allocations")
    op.drop_table("finance_lines")
    op.drop_table("finance_documents")
    op.drop_table("finance_accounts")
