"""Purchase documents, command receipts and receipt-linked supplier returns."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0038"
down_revision = "0037"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("procurement_purchases",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("supplier_id", UUID(as_uuid=True), sa.ForeignKey("procurement_suppliers.id"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("content", JSONB, nullable=False),
        sa.Column("state", JSONB, nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("version>0 AND status IN ('draft','posted','cancelled')", name="ck_purchase_status"))
    op.create_table("procurement_purchase_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("purchase_id", UUID(as_uuid=True), sa.ForeignKey("procurement_purchases.id"), nullable=False),
        sa.Column("actor_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("intent", JSONB, nullable=False),
        sa.Column("result", JSONB, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("purchase_id", "version", name="uq_purchase_event_version"))
    op.create_table("procurement_receipt_lines",
        sa.Column("receipt_id", UUID(as_uuid=True), sa.ForeignKey("procurement_purchase_events.id", deferrable=True, initially="DEFERRED"), primary_key=True),
        sa.Column("line_id", UUID(as_uuid=True), primary_key=True),
        sa.Column("quantity", sa.Numeric(24,6), nullable=False),
        sa.Column("value", sa.Numeric(24,6), nullable=False),
        sa.Column("returned", sa.Numeric(24,6), nullable=False, server_default="0"),
        sa.Column("credited", sa.Numeric(24,6), nullable=False, server_default="0"),
        sa.CheckConstraint("quantity>0 AND value>=0 AND returned>=0 AND returned<=quantity AND credited>=0 AND credited<=value", name="ck_purchase_receipt_line"))
    op.add_column("inventory_movements", sa.Column("source_document_id", UUID(as_uuid=True), nullable=True))
    op.add_column("inventory_movements", sa.Column("source_event_id", UUID(as_uuid=True), nullable=True))
    op.create_index("ix_purchase_supplier", "procurement_purchases", ["supplier_id", "id"])


def downgrade():
    op.drop_column("inventory_movements", "source_event_id")
    op.drop_column("inventory_movements", "source_document_id")
    op.drop_table("procurement_receipt_lines")
    op.drop_table("procurement_purchase_events")
    op.drop_table("procurement_purchases")
