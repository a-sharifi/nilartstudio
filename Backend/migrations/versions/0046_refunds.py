"""Immutable original-allocation sandbox refunds, separate from inventory receipts."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0046"
down_revision = "0045"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "order_refunds",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "order_id", UUID(as_uuid=True), sa.ForeignKey("customer_orders.id"), nullable=False
        ),
        sa.Column(
            "request_id",
            UUID(as_uuid=True),
            sa.ForeignKey("customer_order_requests.id"),
            nullable=False,
        ),
        sa.Column(
            "payment_id", UUID(as_uuid=True), sa.ForeignKey("sandbox_payments.id"), nullable=False
        ),
        sa.Column(
            "actor_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False
        ),
        sa.Column("intent", JSONB, nullable=False),
        sa.Column("result", JSONB, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index("ix_order_refunds_order", "order_refunds", ["order_id", "id"])
    op.create_index("ix_order_refunds_request", "order_refunds", ["request_id", "id"])


def downgrade():
    op.drop_table("order_refunds")
