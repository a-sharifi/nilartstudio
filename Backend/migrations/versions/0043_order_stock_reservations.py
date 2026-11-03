"""Frozen checkout component allocations and append-only reservation history."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0043"
down_revision = "0042"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "inventory_positions",
        sa.Column("reservation_version", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_table(
        "order_stock_allocations",
        sa.Column(
            "order_id", UUID(as_uuid=True), sa.ForeignKey("customer_orders.id"), primary_key=True
        ),
        sa.Column("components", JSONB, nullable=False),
        sa.Column("state", sa.String(20), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("settings_version", sa.Integer(), nullable=False),
        sa.Column("reservation_minutes", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "state IN ('reserved','committed','released','shortage') AND version>0 AND settings_version>0 AND reservation_minutes>0",
            name="ck_order_stock_allocation",
        ),
    )
    op.create_index("ix_order_stock_expiry", "order_stock_allocations", ["state", "expires_at"])
    op.create_table(
        "stock_reservation_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "order_id", UUID(as_uuid=True), sa.ForeignKey("customer_orders.id"), nullable=False
        ),
        sa.Column(
            "actor_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=True
        ),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(30), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("intent", JSONB, nullable=False),
        sa.Column("result", JSONB, nullable=False),
        sa.Column("changes", JSONB, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint("order_id", "version", name="uq_stock_reservation_order_version"),
    )
    op.create_index(
        "ix_stock_reservation_history", "stock_reservation_events", ["order_id", "version"]
    )


def downgrade():
    op.drop_table("stock_reservation_events")
    op.drop_table("order_stock_allocations")
    op.drop_column("inventory_positions", "reservation_version")
