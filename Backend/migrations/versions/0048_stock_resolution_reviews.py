"""Staff-originated shortage reviews with explicit provenance and immutable receipts."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0048"
down_revision = "0047"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "customer_order_requests",
        sa.Column(
            "initiated_by", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=True
        ),
    )
    op.create_table(
        "stock_resolution_reviews",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "order_id", UUID(as_uuid=True), sa.ForeignKey("customer_orders.id"), nullable=False
        ),
        sa.Column(
            "request_id",
            UUID(as_uuid=True),
            sa.ForeignKey("customer_order_requests.id"),
            nullable=False,
            unique=True,
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
    op.create_index(
        "ix_stock_resolution_reviews_order", "stock_resolution_reviews", ["order_id", "id"]
    )


def downgrade():
    op.drop_table("stock_resolution_reviews")
    op.drop_column("customer_order_requests", "initiated_by")
