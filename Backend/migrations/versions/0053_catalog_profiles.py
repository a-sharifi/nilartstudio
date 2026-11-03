"""Versioned catalogue media and SKU commerce profiles; no inferred legacy values."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0053"
down_revision = "0052"
branch_labels = depends_on = None


def upgrade():
    op.create_table(
        "catalog_profiles",
        sa.Column("kind", sa.String(20), primary_key=True),
        sa.Column("entity_id", UUID(as_uuid=True), primary_key=True),
        sa.Column("version", sa.Integer, nullable=False),
        sa.Column("content", JSONB, nullable=False),
        sa.Column("published_revision", UUID(as_uuid=True)),
        sa.CheckConstraint(
            "kind IN ('products','skus','collections')", name="ck_catalog_profile_kind"
        ),
        sa.CheckConstraint("version>0", name="ck_catalog_profile_version"),
    )
    op.create_table(
        "catalog_profile_revisions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("entity_id", UUID(as_uuid=True), nullable=False),
        sa.Column(
            "actor_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False
        ),
        sa.Column("version", sa.Integer, nullable=False),
        sa.Column("intent", JSONB, nullable=False),
        sa.Column("result", JSONB, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["kind", "entity_id"], ["catalog_profiles.kind", "catalog_profiles.entity_id"]
        ),
        sa.UniqueConstraint("kind", "entity_id", "version", name="uq_catalog_profile_revision"),
    )
    op.create_foreign_key(
        "fk_catalog_profile_publication",
        "catalog_profiles",
        "catalog_profile_revisions",
        ["published_revision"],
        ["id"],
        use_alter=True,
    )


def downgrade():
    op.drop_constraint("fk_catalog_profile_publication", "catalog_profiles", type_="foreignkey")
    op.drop_table("catalog_profile_revisions")
    op.drop_table("catalog_profiles")
