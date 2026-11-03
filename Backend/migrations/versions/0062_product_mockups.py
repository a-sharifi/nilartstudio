"""Versioned real-photo templates, durable render jobs and reviewed image sets."""

from alembic import op

revision = "0062"
down_revision = "0061"
branch_labels = depends_on = None


def upgrade():
    op.execute("ALTER TABLE media_assets DROP CONSTRAINT ck_media_asset_version_purpose")
    op.execute(
        "ALTER TABLE media_assets ADD CONSTRAINT ck_media_asset_version_purpose CHECK(version>0 AND purpose IN ('public_image','print_file','mockup_source'))"
    )
    op.execute("""CREATE TABLE mockup_templates (
      id uuid PRIMARY KEY,version integer NOT NULL CHECK(version>0),content jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now())""")
    op.execute("""CREATE TABLE mockup_sets (
      id uuid PRIMARY KEY,set_key text NOT NULL UNIQUE,version integer NOT NULL CHECK(version>0),
      spec jsonb NOT NULL,target jsonb NOT NULL,published_run uuid,
      updated_at timestamptz NOT NULL DEFAULT now())""")
    op.execute("""CREATE TABLE mockup_runs (
      id uuid PRIMARY KEY,set_id uuid NOT NULL REFERENCES mockup_sets(id),actor_id uuid NOT NULL REFERENCES identity_accounts(id),
      intent jsonb NOT NULL,inputs jsonb NOT NULL,fingerprint text NOT NULL,
      status text NOT NULL CHECK(status IN ('queued','rendering','ready','failed')),
      outputs jsonb NOT NULL DEFAULT '[]',error text NOT NULL DEFAULT '',attempts integer NOT NULL DEFAULT 0,
      lease_until timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(set_id,fingerprint))""")
    op.execute(
        "ALTER TABLE mockup_sets ADD CONSTRAINT fk_mockup_publication FOREIGN KEY(published_run) REFERENCES mockup_runs(id)"
    )
    op.execute("CREATE INDEX ix_mockup_runs_queue ON mockup_runs(status,lease_until)")
    op.execute("""CREATE TABLE mockup_commands (
      id uuid PRIMARY KEY,actor_id uuid NOT NULL REFERENCES identity_accounts(id),
      kind text NOT NULL CHECK(kind IN ('template','set')),entity_id uuid NOT NULL,
      intent jsonb NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now())""")


def downgrade():
    op.execute("ALTER TABLE mockup_sets DROP CONSTRAINT fk_mockup_publication")
    for table in ["mockup_commands", "mockup_runs", "mockup_sets", "mockup_templates"]:
        op.drop_table(table)
    # Private sources must be explicitly removed before downgrading the media purpose constraint.
    op.execute("ALTER TABLE media_assets DROP CONSTRAINT ck_media_asset_version_purpose")
    op.execute(
        "ALTER TABLE media_assets ADD CONSTRAINT ck_media_asset_version_purpose CHECK(version>0 AND purpose IN ('public_image','print_file'))"
    )
