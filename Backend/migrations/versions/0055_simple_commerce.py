"""Simple variant costs and purchases over the existing stock ledger."""

from alembic import op

revision = "0055"
down_revision = "0054"
branch_labels = depends_on = None


def upgrade():
    op.execute(
        """CREATE TABLE simple_variant_costs (sku_id uuid PRIMARY KEY REFERENCES catalog_skus(id), unit_cost numeric(24,6) NOT NULL CHECK(unit_cost>=0), version integer NOT NULL CHECK(version>0))"""
    )
    op.execute(
        """CREATE TABLE simple_commerce_commands (id uuid PRIMARY KEY, actor_id uuid NOT NULL REFERENCES identity_accounts(id), sku_id uuid NOT NULL REFERENCES catalog_skus(id), kind text NOT NULL CHECK(kind IN ('variant','purchase')), intent jsonb NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now())"""
    )


def downgrade():
    op.drop_table("simple_commerce_commands")
    op.drop_table("simple_variant_costs")
