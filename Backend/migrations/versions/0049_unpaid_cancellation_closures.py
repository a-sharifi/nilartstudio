"""Retain explicit financial closure against an authoritative rejected inquiry."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0049"
down_revision = "0048"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "unpaid_cancellation_closures",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "request_id",
            UUID(as_uuid=True),
            sa.ForeignKey("customer_order_requests.id"),
            nullable=False,
        ),
        sa.Column(
            "order_id", UUID(as_uuid=True), sa.ForeignKey("customer_orders.id"), nullable=False
        ),
        sa.Column(
            "inquiry_id", UUID(as_uuid=True), sa.ForeignKey("payment_inquiries.id"), nullable=False
        ),
        sa.Column(
            "actor_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False
        ),
        sa.Column("intent", JSONB, nullable=False),
        sa.Column("result", JSONB, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("request_id", "inquiry_id", name="uq_unpaid_closure_inquiry"),
    )


def downgrade():
    op.drop_table("unpaid_cancellation_closures")
