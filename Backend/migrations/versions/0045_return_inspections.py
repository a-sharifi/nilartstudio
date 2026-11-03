"""Append-only, shipment-linked return inspections and original-cost stock recovery."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0045"
down_revision = "0044"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "order_return_inspections",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "request_id",
            UUID(as_uuid=True),
            sa.ForeignKey("customer_order_requests.id"),
            nullable=False,
        ),
        sa.Column(
            "shipment_id",
            UUID(as_uuid=True),
            sa.ForeignKey("fulfillment_shipments.id"),
            nullable=False,
        ),
        sa.Column(
            "actor_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False
        ),
        sa.Column("expected_version", sa.Integer(), nullable=False),
        sa.Column("intent", JSONB, nullable=False),
        sa.Column("result", JSONB, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint("request_id", "expected_version", name="uq_return_inspection_version"),
        sa.CheckConstraint("expected_version>=0", name="ck_return_inspection_version"),
    )
    op.create_index(
        "ix_return_inspection_shipment", "order_return_inspections", ["shipment_id", "id"]
    )


def downgrade():
    op.drop_table("order_return_inspections")
