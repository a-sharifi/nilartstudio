"""Recorded staff decisions; approval never executes a refund or cancellation."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0026"
down_revision = "0025"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("customer_order_requests", sa.Column("version", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("customer_order_requests", sa.Column("public_reply", sa.Text(), nullable=False, server_default=""))
    op.create_table("order_request_reviews",
                    sa.Column("id", UUID(as_uuid=True), primary_key=True),
                    sa.Column("request_id", UUID(as_uuid=True), sa.ForeignKey("customer_order_requests.id"), nullable=False),
                    sa.Column("actor_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False),
                    sa.Column("status", sa.String(20), nullable=False),
                    sa.Column("reply", sa.Text(), nullable=False),
                    sa.Column("expected_version", sa.Integer(), nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
                    sa.CheckConstraint("status IN ('in_review','approved','rejected')", name="ck_request_review_status"))


def downgrade():
    op.drop_table("order_request_reviews")
    op.drop_column("customer_order_requests", "public_reply")
    op.drop_column("customer_order_requests", "version")
