"""Durable channel settings, listings, operations, inbox and external stock commitments."""

from alembic import op

revision = "0060"
down_revision = "0059"
branch_labels = depends_on = None


def upgrade():
    op.execute("""CREATE TABLE sales_channels (
      code text PRIMARY KEY CHECK(code IN ('basalam','digikala','snappshop','tapsishop')),
      version integer NOT NULL DEFAULT 0, config jsonb NOT NULL,
      actor_id uuid REFERENCES identity_accounts(id), live_since timestamptz, poll_cursor text, updated_at timestamptz NOT NULL DEFAULT now())""")
    op.execute("""INSERT INTO sales_channels(code,config) SELECT code,
      '{"mode": "disabled","markup_percent": "10","commission_percent": null,"installment_percent": null,"rounding_toman": 1,"stock_buffer": 0,"stock_cap": null,"vendor_id": null,"sync_products": true,"sync_stock": true,"import_orders": true,"preparation_days": null,"packaging_weight_grams": null}'::jsonb
      FROM unnest(ARRAY['basalam','digikala','snappshop','tapsishop']) AS code""")
    op.execute(
        "UPDATE sales_channels SET config=jsonb_set(config,'{mode}','\"preview\"'::jsonb) WHERE code='basalam'"
    )
    op.execute("""CREATE TABLE channel_settings_receipts (
      id uuid PRIMARY KEY, channel text NOT NULL REFERENCES sales_channels(code),
      actor_id uuid NOT NULL REFERENCES identity_accounts(id), intent jsonb NOT NULL,
      result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now())""")
    op.execute("""CREATE TABLE channel_listings (
      id uuid PRIMARY KEY, channel text NOT NULL REFERENCES sales_channels(code),
      sku_id uuid NOT NULL REFERENCES catalog_skus(id), version integer NOT NULL DEFAULT 0,
      content jsonb NOT NULL, external_product_id bigint, external_variation_id bigint,
      uploaded_images jsonb NOT NULL DEFAULT '{}'::jsonb, last_applied_fingerprint text, last_error text, updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(channel,sku_id))""")
    op.execute(
        "CREATE UNIQUE INDEX channel_external_identity ON channel_listings(channel,external_product_id,COALESCE(external_variation_id,0)) WHERE external_product_id IS NOT NULL"
    )
    op.execute("""CREATE TABLE channel_listing_receipts (
      id uuid PRIMARY KEY, listing_id uuid NOT NULL REFERENCES channel_listings(id),
      actor_id uuid NOT NULL REFERENCES identity_accounts(id),intent jsonb NOT NULL,
      result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now())""")
    op.execute("""CREATE TABLE channel_operations (
      id uuid PRIMARY KEY, channel text NOT NULL REFERENCES sales_channels(code),
      listing_id uuid REFERENCES channel_listings(id), kind text NOT NULL,
      actor_id uuid NOT NULL REFERENCES identity_accounts(id), intent jsonb NOT NULL,
      state text NOT NULL CHECK(state IN ('queued','sending','succeeded','unknown','failed','superseded')),
      result jsonb, error_code text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())""")
    op.execute(
        "CREATE UNIQUE INDEX channel_one_pending_listing ON channel_operations(listing_id) WHERE state IN ('queued','sending','unknown')"
    )
    op.execute("""CREATE TABLE channel_inbox (
      id uuid PRIMARY KEY, channel text NOT NULL REFERENCES sales_channels(code),
      digest text NOT NULL, payload jsonb NOT NULL, state text NOT NULL DEFAULT 'received',
      error_code text, created_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz,
      UNIQUE(channel,digest))""")
    op.execute("""CREATE TABLE channel_orders (
      id uuid PRIMARY KEY, channel text NOT NULL REFERENCES sales_channels(code),
      external_id bigint NOT NULL, provider_updated_at timestamptz NOT NULL,
      status text NOT NULL, snapshot jsonb NOT NULL, issue text, checked_at timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(channel,external_id))""")
    op.execute("""CREATE TABLE channel_stock_commitments (
      order_id uuid NOT NULL REFERENCES channel_orders(id),
      position_id uuid NOT NULL REFERENCES inventory_positions(id),
      quantity numeric(24,6) NOT NULL CHECK(quantity>0),
      state text NOT NULL CHECK(state IN ('held','consumed','released')),
      PRIMARY KEY(order_id,position_id))""")


def downgrade():
    for name in [
        "channel_stock_commitments",
        "channel_orders",
        "channel_inbox",
        "channel_operations",
        "channel_listing_receipts",
        "channel_listings",
        "channel_settings_receipts",
        "sales_channels",
    ]:
        op.drop_table(name)
