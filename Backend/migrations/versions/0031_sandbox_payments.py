"""Sandbox checkout attempts and immutable order linkage."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0031"
down_revision = "0030"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('customer_orders', sa.Column('sandbox', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_table('sandbox_payments',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('account_id', UUID(as_uuid=True), sa.ForeignKey('identity_accounts.id'), nullable=False),
        sa.Column('basket_id', UUID(as_uuid=True), sa.ForeignKey('shopping_baskets.id'), nullable=False),
        sa.Column('basket_version', sa.Integer(), nullable=False),
        sa.Column('command_id', UUID(as_uuid=True), nullable=False),
        sa.Column('order_id', UUID(as_uuid=True), sa.ForeignKey('customer_orders.id'), nullable=False, unique=True),
        sa.Column('amount_rial', sa.BigInteger(), nullable=False),
        sa.Column('authority', sa.String(80), unique=True),
        sa.Column('reference', sa.String(80)),
        sa.Column('status', sa.String(24), nullable=False),
        sa.Column('language', sa.String(2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('account_id', 'command_id'),
        sa.UniqueConstraint('basket_id', 'basket_version'),
        sa.CheckConstraint('amount_rial>0'),
        sa.CheckConstraint("status IN ('requesting','pending','paid','cancelled','failed','unknown')"))


def downgrade():
    op.drop_table('sandbox_payments')
    op.drop_column('customer_orders', 'sandbox')
