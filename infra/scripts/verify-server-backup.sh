#!/usr/bin/env bash
# Restore into a disposable database; never overwrite the live database.
set -Eeuo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$root"
compose=(sudo -n docker compose --project-name nilart-live --env-file .env.server -f infra/docker/compose.caddy.yaml)
archive=${1:-$(find backups -maxdepth 1 -type f -name '*.dump' -printf '%T@ %p\n' | sort -rn | head -1 | cut -d' ' -f2-)}
test -s "$archive"
database="nilart_restore_check_$$"
"${compose[@]}" exec -T postgres createdb -U nilart "$database"
cleanup() { "${compose[@]}" exec -T postgres dropdb -U nilart "$database"; }
trap cleanup EXIT
"${compose[@]}" exec -T postgres pg_restore -U nilart --exit-on-error -d "$database" < "$archive"
"${compose[@]}" exec -T postgres psql -U nilart -d "$database" -Atc "SELECT version_num FROM alembic_version; SELECT count(*) AS restored_accounts FROM identity_accounts;"
echo "Backup restoration verified: $archive"
