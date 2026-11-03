"""Versioned supplier directory, no opening balances or stock."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0032"
down_revision = "0031"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("procurement_suppliers",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("code", sa.String(80), nullable=False),
        sa.Column("content", JSONB, nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("code", name="uq_procurement_supplier_code"),
        sa.CheckConstraint("kind IN ('supplier','service_provider','both') AND version>0", name="ck_procurement_supplier_kind_version"))
    op.create_table("procurement_supplier_versions",
        sa.Column("revision_id", UUID(as_uuid=True), primary_key=True),
        sa.Column("supplier_id", UUID(as_uuid=True), sa.ForeignKey("procurement_suppliers.id"), nullable=False),
        sa.Column("actor_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False),
        sa.Column("expected_version", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("content", JSONB, nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("supplier_id", "version", name="uq_procurement_supplier_version"),
        sa.CheckConstraint("expected_version>=0 AND version=expected_version+1", name="ck_procurement_supplier_revision_version"))


def downgrade():
    op.drop_table("procurement_supplier_versions")
    op.drop_table("procurement_suppliers")
