#!/usr/bin/env bash
# Server phase: read from a file so Compose cannot consume the script stdin.
set -Eeuo pipefail
cd "$1"
exec 9>.deploy.lock
flock -n 9 || { echo 'Another deployment is running' >&2; exit 1; }
if [ ! -f .env.server ]; then
    umask 077
    python3 - "$2" <<'PY'
import secrets,sys
from pathlib import Path
values={'NILART_DOMAIN':sys.argv[1], 'POSTGRES_PASSWORD':secrets.token_hex(32),
        'REDIS_PASSWORD':secrets.token_hex(32),'RABBITMQ_PASSWORD':secrets.token_hex(32),
        'NILART_OTP_HMAC_KEY':secrets.token_hex(48)}
Path('.env.server').write_text(''.join(f'{k}={v}'+chr(10) for k,v in values.items()))
PY
fi
chmod 600 .env.server
compose=(sudo -n docker compose --project-name nilart-live --env-file .env.server -f infra/docker/compose.caddy.yaml)
"${compose[@]}" config -q
# Retain the previous application images for operator rollback.
for service in api web; do
    id=$("${compose[@]}" ps -q "$service")
    if [ -n "$id" ]; then
        image=$(sudo -n docker inspect --format '{{.Image}}' "$id")
        if sudo -n docker image inspect "$image" >/dev/null 2>&1; then
            sudo -n docker tag "$image" "nilart-live-$service:previous"
        else
            # A previously interrupted build may already have moved :current.
            # Preserve its existing rollback tag instead of tagging the wrong image.
            sudo -n docker image inspect "nilart-live-$service:previous" >/dev/null
            echo "Retaining existing rollback image for $service"
        fi
    fi
done
"${compose[@]}" build api web
mkdir -p backups
chmod 700 backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
# Stop writers, then dump a consistent database before any migration.
"${compose[@]}" stop caddy worker mockup-worker scheduler api web
if [ -n "$("${compose[@]}" ps -q postgres)" ]; then
    umask 077
    "${compose[@]}" exec -T postgres pg_dump -U nilart -d nilart -Fc > "backups/pre-deploy-$stamp.dump"
    test -s "backups/pre-deploy-$stamp.dump"
    "${compose[@]}" exec -T postgres pg_restore --list < "backups/pre-deploy-$stamp.dump" >/dev/null
fi
"${compose[@]}" down --remove-orphans
# NEVER pass -v: all database/queue/certificate volumes survive.
"${compose[@]}" up -d --wait --wait-timeout 300 postgres redis rabbitmq
"${compose[@]}" run -T --rm --no-deps api alembic upgrade head
"${compose[@]}" up -d --wait --wait-timeout 300
"${compose[@]}" exec -T api python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health/ready',timeout=5)"
echo "Services healthy. Check public HTTPS at https://$2"
