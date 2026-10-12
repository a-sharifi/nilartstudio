"""Isolated draft options and transactional audit history; no published data changes."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("catalog_option_drafts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", UUID(as_uuid=True), sa.ForeignKey("catalog_products.id"), nullable=False, unique=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("document", JSONB(), nullable=False),
        sa.CheckConstraint("version > 0", name="ck_option_draft_version"))
    op.create_table("catalog_option_audits",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("configuration_id", UUID(as_uuid=True), sa.ForeignKey("catalog_option_drafts.id"), nullable=False),
        sa.Column("product_id", UUID(as_uuid=True), sa.ForeignKey("catalog_products.id"), nullable=False),
        sa.Column("actor_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False),
        sa.Column("previous_version", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("before", JSONB(), nullable=False),
        sa.Column("after", JSONB(), nullable=False),
        sa.CheckConstraint("previous_version >= 0 AND version = previous_version + 1", name="ck_option_audit_version"))
    op.create_index("ix_option_audit_configuration", "catalog_option_audits", ["configuration_id", "version"], unique=True)


def downgrade():
    op.drop_table("catalog_option_audits")
    op.drop_table("catalog_option_drafts")
