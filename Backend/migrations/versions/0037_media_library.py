"""Bounded immutable media blobs and separately approved public image revisions."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision="0037"
down_revision="0036"
branch_labels=None
depends_on=None


def upgrade():
    op.create_table("media_blobs",
        sa.Column("sha256",sa.String(64),primary_key=True),
        sa.Column("content",sa.LargeBinary(),nullable=False),
        sa.Column("size",sa.Integer(),nullable=False),
        sa.CheckConstraint("size BETWEEN 1 AND 5242880 AND size=octet_length(content)",name="ck_media_blob_size"))
    op.create_table("media_assets",
        sa.Column("id",UUID(as_uuid=True),primary_key=True),
        sa.Column("purpose",sa.String(20),nullable=False),
        sa.Column("version",sa.Integer(),nullable=False),
        sa.Column("metadata",JSONB,nullable=False),
        sa.Column("sha256",sa.String(64),sa.ForeignKey("media_blobs.sha256"),nullable=False),
        sa.Column("file_name",sa.String(200),nullable=False),
        sa.Column("published_revision",UUID(as_uuid=True),nullable=True),
        sa.Column("updated_at",sa.DateTime(timezone=True),server_default=sa.func.now(),nullable=False),
        sa.CheckConstraint("version>0 AND purpose IN ('public_image','print_file')",name="ck_media_asset_version_purpose"))
    op.create_table("media_asset_versions",
        sa.Column("revision_id",UUID(as_uuid=True),primary_key=True),
        sa.Column("asset_id",UUID(as_uuid=True),sa.ForeignKey("media_assets.id"),nullable=False),
        sa.Column("actor_id",UUID(as_uuid=True),sa.ForeignKey("identity_accounts.id"),nullable=False),
        sa.Column("expected_version",sa.Integer(),nullable=False),
        sa.Column("version",sa.Integer(),nullable=False),
        sa.Column("action",sa.String(20),nullable=False),
        sa.Column("purpose",sa.String(20),nullable=False),
        sa.Column("metadata",JSONB,nullable=False),
        sa.Column("sha256",sa.String(64),sa.ForeignKey("media_blobs.sha256"),nullable=False),
        sa.Column("file_name",sa.String(200),nullable=False),
        sa.Column("reason",sa.Text(),nullable=False),
        sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.func.now(),nullable=False),
        sa.UniqueConstraint("asset_id","version",name="uq_media_asset_version"),
        sa.CheckConstraint("version=expected_version+1 AND expected_version>=0 AND action IN ('draft','publish','unpublish')",name="ck_media_asset_revision"))
    op.create_foreign_key("fk_media_asset_publication","media_assets","media_asset_versions",["published_revision"],["revision_id"],use_alter=True)


def downgrade():
    op.drop_constraint("fk_media_asset_publication","media_assets",type_="foreignkey")
    op.drop_table("media_asset_versions")
    op.drop_table("media_assets")
    op.drop_table("media_blobs")
