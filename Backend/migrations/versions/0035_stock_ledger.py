"""Authoritative stock positions and append-only recorded movements."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0035"
down_revision = "0034"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("inventory_positions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("reference_id", UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(160), nullable=False),
        sa.Column("title_fa", sa.String(300), nullable=False),
        sa.Column("title_en", sa.String(300), nullable=False),
        sa.Column("unit", sa.String(40), nullable=False),
        sa.Column("quantity", sa.Numeric(24,6), nullable=False),
        sa.Column("reserved", sa.Numeric(24,6), nullable=False),
        sa.Column("value", sa.Numeric(24,6), nullable=False),
        sa.Column("threshold", sa.Numeric(24,6), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.UniqueConstraint("kind","reference_id",name="uq_inventory_reference"),
        sa.CheckConstraint("kind IN ('sku','material','artwork') AND quantity>=0 AND reserved>=0 AND reserved<=quantity AND value>=0 AND (quantity>0 OR value=0) AND (threshold IS NULL OR threshold>=0) AND version>0",name="ck_inventory_position"))
    op.create_table("inventory_movements",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("position_id", UUID(as_uuid=True), sa.ForeignKey("inventory_positions.id"),nullable=False),
        sa.Column("actor_id", UUID(as_uuid=True),sa.ForeignKey("identity_accounts.id"),nullable=False),
        sa.Column("kind", sa.String(30), nullable=False),
        sa.Column("expected_version", sa.Integer(),nullable=False),
        sa.Column("version", sa.Integer(),nullable=False),
        sa.Column("quantity_delta", sa.Numeric(24,6),nullable=False),
        sa.Column("value_delta", sa.Numeric(24,6),nullable=False),
        sa.Column("quantity_after", sa.Numeric(24,6),nullable=False),
        sa.Column("value_after", sa.Numeric(24,6),nullable=False),
        sa.Column("threshold_after", sa.Numeric(24,6),nullable=True),
        sa.Column("reverses_id", UUID(as_uuid=True),sa.ForeignKey("inventory_movements.id"),unique=True),
        sa.Column("reason", sa.Text(),nullable=False),
        sa.Column("intent", JSONB,nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True),server_default=sa.func.now(),nullable=False),
        sa.UniqueConstraint("position_id","version",name="uq_inventory_movement_version"),
        sa.CheckConstraint("version=expected_version+1 AND expected_version>=0 AND quantity_after>=0 AND value_after>=0",name="ck_inventory_movement"))
    op.create_index("ix_inventory_movements_position","inventory_movements",["position_id","version"])


def downgrade():
    op.drop_table("inventory_movements")
    op.drop_table("inventory_positions")
