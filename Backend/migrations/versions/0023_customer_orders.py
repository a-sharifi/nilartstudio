"""Owned historical order snapshots and review requests; no payment simulation."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0023"
down_revision = "0022"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "customer_orders",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("account_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False),
        sa.Column("source_id", UUID(as_uuid=True), nullable=False),
        sa.Column("snapshot", JSONB, nullable=False),
        sa.Column("state", JSONB, nullable=False),
        sa.Column("version", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("account_id", "source_id", name="uq_order_source"),
        sa.CheckConstraint("version >= 0", name="ck_order_version"),
    )
    op.create_index("ix_customer_orders_owned", "customer_orders", ["account_id", "created_at", "id"])
    op.create_table(
        "customer_order_requests",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("account_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False),
        sa.Column("order_id", UUID(as_uuid=True), sa.ForeignKey("customer_orders.id"), nullable=False),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="submitted"),
        sa.Column("payload", JSONB, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("kind IN ('cancellation','return')", name="ck_order_request_kind"),
        sa.CheckConstraint("status IN ('submitted','in_review','approved','rejected','completed')", name="ck_order_request_status"),
    )
    op.create_index("ix_order_requests_owned", "customer_order_requests", ["account_id", "order_id", "id"])
    op.create_index("uq_active_order_request", "customer_order_requests", ["order_id"], unique=True,
                    postgresql_where=sa.text("status IN ('submitted','in_review','approved')"))


def downgrade():
    op.drop_table("customer_order_requests")
    op.drop_table("customer_orders")
