"""Managed artwork definitions and immutable command receipts; no legacy backfill."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0054"
down_revision = "0053"
branch_labels = depends_on = None


def upgrade():
    op.create_table(
        "catalog_artwork_documents",
        sa.Column("id", UUID(as_uuid=True), sa.ForeignKey("catalog_artworks.id"), primary_key=True),
        sa.Column("version", sa.Integer, nullable=False),
        sa.Column("content", JSONB, nullable=False),
        sa.Column("published_revision", UUID(as_uuid=True)),
        sa.CheckConstraint("version>0", name="ck_artwork_document_version"),
    )
    op.create_table(
        "catalog_artwork_revisions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "artwork_id", UUID(as_uuid=True), sa.ForeignKey("catalog_artworks.id"), nullable=False
        ),
        sa.Column(
            "actor_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False
        ),
        sa.Column("version", sa.Integer, nullable=False),
        sa.Column("intent", JSONB, nullable=False),
        sa.Column("result", JSONB, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("artwork_id", "version", name="uq_artwork_revision"),
    )
    op.create_foreign_key(
        "fk_artwork_document_publication",
        "catalog_artwork_documents",
        "catalog_artwork_revisions",
        ["published_revision"],
        ["id"],
        use_alter=True,
    )


def downgrade():
    op.drop_constraint(
        "fk_artwork_document_publication", "catalog_artwork_documents", type_="foreignkey"
    )
    op.drop_table("catalog_artwork_revisions")
    op.drop_table("catalog_artwork_documents")
