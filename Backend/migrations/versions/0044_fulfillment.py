"""Versioned partial shipments, frozen dispatch costs and commitment consumption."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0044"
down_revision = "0043"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "order_stock_allocations", sa.Column("shipped", JSONB, nullable=False, server_default="{}")
    )
    op.create_table(
        "fulfillment_shipments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "order_id", UUID(as_uuid=True), sa.ForeignKey("customer_orders.id"), nullable=False
        ),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("content", JSONB, nullable=False),
        sa.Column("state", JSONB, nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "version>0 AND status IN ('draft','picked','qc_failed','qc_passed','packed','dispatched','delivered','cancelled')",
            name="ck_fulfillment_shipment",
        ),
    )
    op.create_index("ix_fulfillment_order", "fulfillment_shipments", ["order_id", "id"])
    op.create_table(
        "fulfillment_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "shipment_id",
            UUID(as_uuid=True),
            sa.ForeignKey("fulfillment_shipments.id"),
            nullable=False,
        ),
        sa.Column(
            "actor_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False
        ),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(24), nullable=False),
        sa.Column("intent", JSONB, nullable=False),
        sa.Column("result", JSONB, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint("shipment_id", "version", name="uq_fulfillment_version"),
    )


def downgrade():
    op.drop_table("fulfillment_events")
    op.drop_table("fulfillment_shipments")
    op.drop_column("order_stock_allocations", "shipped")
