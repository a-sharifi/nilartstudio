"""Versioned catalog content and explicit publication with atomic audits."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0021"
down_revision = "0020"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "catalog_entry_versions",
        sa.Column("kind", sa.String(20), primary_key=True),
        sa.Column("entry_id", UUID(as_uuid=True), primary_key=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.CheckConstraint("kind IN ('collections','categories','products')", name="ck_entry_kind"),
        sa.CheckConstraint("version > 0", name="ck_entry_version"),
    )
    op.create_table(
        "catalog_entry_audits",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("entry_id", UUID(as_uuid=True), nullable=False),
        sa.Column("actor_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("previous_version", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("before", JSONB, nullable=True),
        sa.Column("after", JSONB, nullable=False),
        sa.CheckConstraint("kind IN ('collections','categories','products')", name="ck_entry_audit_kind"),
        sa.CheckConstraint("action IN ('created','edited','published','unpublished')", name="ck_entry_audit_action"),
        sa.CheckConstraint("previous_version >= 0 AND version = previous_version + 1", name="ck_entry_audit_version"),
    )
    op.create_index("ix_entry_audit_version", "catalog_entry_audits", ["kind", "entry_id", "version"], unique=True)


def downgrade():
    op.drop_table("catalog_entry_audits")
    op.drop_table("catalog_entry_versions")
