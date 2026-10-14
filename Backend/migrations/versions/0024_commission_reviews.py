"""Owned commission tracking and small private raster review previews."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0024"
down_revision = "0023"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("commission_requests", sa.Column("status", sa.String(30), nullable=False, server_default="awaiting_review"))
    op.add_column("commission_requests", sa.Column("version", sa.Integer, nullable=False, server_default="0"))
    op.add_column("commission_requests", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.add_column("commission_requests", sa.Column("revision_allowance", sa.Integer, nullable=True))
    op.add_column("commission_requests", sa.Column("agreement", sa.Text, nullable=True))
    op.create_check_constraint("ck_commission_status", "commission_requests", "status IN ('awaiting_review','in_progress','awaiting_customer','revision_requested','approved','cancelled')")
    op.create_check_constraint("ck_commission_allowance", "commission_requests", "revision_allowance IS NULL OR revision_allowance BETWEEN 0 AND 100")
    op.create_table("commission_artwork_versions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("commission_id", UUID(as_uuid=True), sa.ForeignKey("commission_requests.id"), nullable=False),
        sa.Column("number", sa.Integer, nullable=False),
        sa.Column("note", sa.Text, nullable=False),
        sa.Column("preview", sa.LargeBinary, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("commission_id", "number", name="uq_commission_artwork_number"),
        sa.CheckConstraint("octet_length(preview) BETWEEN 24 AND 5242880", name="ck_commission_preview_size"))
    op.create_table("commission_artwork_decisions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("artwork_id", UUID(as_uuid=True), sa.ForeignKey("commission_artwork_versions.id"), nullable=False, unique=True),
        sa.Column("action", sa.String(10), nullable=False),
        sa.Column("details", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("action IN ('approve','revise')", name="ck_artwork_decision_action"))


def downgrade():
    op.drop_table("commission_artwork_decisions")
    op.drop_table("commission_artwork_versions")
    op.drop_constraint("ck_commission_allowance", "commission_requests")
    op.drop_constraint("ck_commission_status", "commission_requests")
    for name in ("agreement", "revision_allowance", "updated_at", "version", "status"):
        op.drop_column("commission_requests", name)
