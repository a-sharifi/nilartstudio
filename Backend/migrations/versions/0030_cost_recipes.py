"""Immutable SKU recipes with pinned resource snapshots."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0030"
down_revision = "0029"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("cost_recipes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("sku_id", UUID(as_uuid=True), sa.ForeignKey("catalog_skus.id"), nullable=False, unique=True),
        sa.Column("content", JSONB, nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("version>0", name="ck_cost_recipe_version"))
    op.create_table("cost_recipe_versions",
        sa.Column("revision_id", UUID(as_uuid=True), primary_key=True),
        sa.Column("recipe_id", UUID(as_uuid=True), sa.ForeignKey("cost_recipes.id"), nullable=False),
        sa.Column("actor_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False),
        sa.Column("expected_version", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("content", JSONB, nullable=False),
        sa.Column("snapshots", JSONB, nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("recipe_id", "version", name="uq_cost_recipe_version"),
        sa.CheckConstraint("expected_version>=0 AND version=expected_version+1", name="ck_cost_recipe_revision"))


def downgrade():
    op.drop_table("cost_recipe_versions")
    op.drop_table("cost_recipes")
