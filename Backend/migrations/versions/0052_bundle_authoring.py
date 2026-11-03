"""Immutable managed bundle drafts, publications and approved gallery bindings."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0052"
down_revision = "0051"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "catalog_bundle_documents",
        sa.Column("id", UUID(as_uuid=True), sa.ForeignKey("catalog_bundles.id"), primary_key=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("content", JSONB, nullable=False),
        sa.Column("published_revision", UUID(as_uuid=True), nullable=True),
        sa.CheckConstraint("version>0", name="ck_bundle_document_version"),
    )
    op.create_table(
        "catalog_bundle_revisions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "bundle_id", UUID(as_uuid=True), sa.ForeignKey("catalog_bundles.id"), nullable=False
        ),
        sa.Column(
            "actor_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False
        ),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("intent", JSONB, nullable=False),
        sa.Column("result", JSONB, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("bundle_id", "version", name="uq_bundle_revision_version"),
    )
    op.create_foreign_key(
        "fk_bundle_document_publication",
        "catalog_bundle_documents",
        "catalog_bundle_revisions",
        ["published_revision"],
        ["id"],
        use_alter=True,
    )


def downgrade():
    op.drop_constraint(
        "fk_bundle_document_publication", "catalog_bundle_documents", type_="foreignkey"
    )
    op.drop_table("catalog_bundle_revisions")
    op.drop_table("catalog_bundle_documents")
