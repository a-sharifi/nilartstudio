"""Purpose-bound OTP challenges and one-use registration/recovery grants."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("identity_otp_challenges",
                    sa.Column("id", UUID(as_uuid=True), primary_key=True),
                    sa.Column("phone", sa.String(16), nullable=False),
                    sa.Column("purpose", sa.String(16), nullable=False),
                    sa.Column("code_hash", sa.String(64), nullable=False),
                    sa.Column("attempts", sa.Integer(), nullable=False),
                    sa.Column("consumed", sa.Boolean(), nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
                    sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
                    sa.CheckConstraint("attempts >= 0", name="ck_otp_attempts"),
                    sa.CheckConstraint("purpose IN ('register','login','recovery')", name="ck_otp_purpose"))
    op.create_index("ix_otp_phone_purpose", "identity_otp_challenges", ["phone", "purpose"])
    op.create_index("ix_otp_expiry", "identity_otp_challenges", ["expires_at"])
    op.create_table("identity_password_grants",
                    sa.Column("token_hash", sa.String(64), primary_key=True),
                    sa.Column("phone", sa.String(16), nullable=False),
                    sa.Column("purpose", sa.String(16), nullable=False),
                    sa.Column("consumed", sa.Boolean(), nullable=False),
                    sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
                    sa.CheckConstraint("purpose IN ('register','recovery')", name="ck_grant_purpose"))


def downgrade():
    op.drop_table("identity_password_grants")
    op.drop_table("identity_otp_challenges")
