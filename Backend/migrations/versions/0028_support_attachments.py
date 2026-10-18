"""Bounded private support screenshots."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0028"
down_revision = "0027"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("support_attachments",
                    sa.Column("id", UUID(as_uuid=True), primary_key=True),
                    sa.Column("ticket_id", UUID(as_uuid=True), sa.ForeignKey("customer_records.id"), nullable=False),
                    sa.Column("account_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False),
                    sa.Column("file_name", sa.String(200), nullable=False),
                    sa.Column("content", sa.LargeBinary(), nullable=False),
                    sa.Column("sha256", sa.String(64), nullable=False),
                    sa.Column("size", sa.Integer(), nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
                    sa.CheckConstraint("size BETWEEN 1 AND 5242880 AND octet_length(content)=size", name="ck_support_attachment_size"))
    op.create_index("ix_support_attachment_ticket", "support_attachments", ["ticket_id", "created_at", "id"])


def downgrade():
    op.drop_table("support_attachments")
