"""Bounded private final files released against confirmed paid digital order lines."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0025"
down_revision = "0024"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("customer_downloads",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", UUID(as_uuid=True), sa.ForeignKey("customer_orders.id"), nullable=False),
        sa.Column("line_id", UUID(as_uuid=True), nullable=False),
        sa.Column("commission_id", UUID(as_uuid=True), sa.ForeignKey("commission_requests.id"), nullable=True),
        sa.Column("file_name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("size", sa.Integer, nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("content", sa.LargeBinary, nullable=False),
        sa.Column("active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("version", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("size BETWEEN 1 AND 16777216 AND octet_length(content)=size", name="ck_download_size"),
        sa.CheckConstraint("version>=0", name="ck_download_version"))
    op.create_index("ix_download_order", "customer_downloads", ["order_id", "created_at", "id"])


def downgrade():
    op.drop_table("customer_downloads")
