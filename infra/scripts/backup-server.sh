#!/usr/bin/env bash
# Run on the deployment server; custom PostgreSQL dump includes private/media bytes.
set -Eeuo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$root"
umask 077
mkdir -p backups
chmod 700 backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
target="backups/scheduled-$stamp.dump"
compose=(docker compose --project-name nilart-live --env-file .env.server -f infra/docker/compose.caddy.yaml)
"${compose[@]}" exec -T postgres pg_dump -U nilart -d nilart -Fc > "$target.partial"
test -s "$target.partial"
"${compose[@]}" exec -T postgres pg_restore --list < "$target.partial" >/dev/null
mv "$target.partial" "$target"
echo "Database backup verified: $target"
