"""Separate draft and published revisions for approved bilingual information pages."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision="0036"
down_revision="0035"
branch_labels=None
depends_on=None


def upgrade():
    op.create_table("content_pages",
        sa.Column("slug",sa.String(40),primary_key=True),
        sa.Column("version",sa.Integer(),nullable=False),
        sa.Column("content",JSONB,nullable=False),
        sa.Column("published_revision",UUID(as_uuid=True),nullable=True),
        sa.Column("updated_at",sa.DateTime(timezone=True),server_default=sa.func.now(),nullable=False),
        sa.CheckConstraint("version>0",name="ck_content_page_version"))
    op.create_table("content_page_versions",
        sa.Column("revision_id",UUID(as_uuid=True),primary_key=True),
        sa.Column("slug",sa.String(40),sa.ForeignKey("content_pages.slug"),nullable=False),
        sa.Column("actor_id",UUID(as_uuid=True),sa.ForeignKey("identity_accounts.id"),nullable=False),
        sa.Column("expected_version",sa.Integer(),nullable=False),
        sa.Column("version",sa.Integer(),nullable=False),
        sa.Column("action",sa.String(20),nullable=False),
        sa.Column("content",JSONB,nullable=False),
        sa.Column("reason",sa.Text(),nullable=False),
        sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.func.now(),nullable=False),
        sa.UniqueConstraint("slug","version",name="uq_content_page_version"),
        sa.CheckConstraint("version=expected_version+1 AND expected_version>=0 AND action IN ('draft','publish','unpublish')",name="ck_content_page_revision"))
    op.create_foreign_key("fk_content_page_publication","content_pages","content_page_versions",["published_revision"],["revision_id"],use_alter=True)


def downgrade():
    op.drop_constraint("fk_content_page_publication","content_pages",type_="foreignkey")
    op.drop_table("content_page_versions")
    op.drop_table("content_pages")
