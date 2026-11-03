#!/usr/bin/env bash
# Explicit first operator provision on a NEW public database, not a registration bypass.
set -Eeuo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$root"
[ "$#" -eq 1 ] || { echo 'Usage: bootstrap-server-admin.sh IRANIAN_MOBILE' >&2; exit 2; }
umask 077
mkdir -p deploy-private
chmod 700 deploy-private
[ ! -e deploy-private/initial-admin.json ] || { echo 'Initial credentials already exist; refusing overwrite' >&2; exit 1; }
compose=(sudo -n docker compose --project-name nilart-live --env-file .env.server -f infra/docker/compose.caddy.yaml)
# The credential is generated in memory and only written to the private server file.
"${compose[@]}" exec -T api python - "$1" > deploy-private/initial-admin.json.partial <<'PY'
import json,secrets,sys
from datetime import datetime, UTC
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from nilart.bootstrap.settings import settings
from nilart.contexts.identity.domain.rules import normalize_phone
from nilart.contexts.identity.infrastructure.otp import SqlOtpRepository
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.infrastructure.secrets import hash_password
phone=normalize_phone(sys.argv[1]); password=secrets.token_urlsafe(24)
engine=create_engine(settings.database_url)
with Session(engine) as db, db.begin():
    management=SqlAccountManagement(db)
    management.serialize_writes()
    if db.execute(text('SELECT 1 FROM identity_accounts LIMIT 1')).first():
        raise SystemExit('Refusing initial bootstrap: database already has accounts')
    account=SqlOtpRepository(db).register_account(phone, hash_password(password), datetime.now(UTC))
    management.bootstrap(account, 'Initial deployment: owner explicitly supplied this operator mobile; SMS integration unavailable; operator provisioned over authorized SSH.')
print(json.dumps({'phone':phone,'password':password,'account_id':account},indent=2))
PY
test -s deploy-private/initial-admin.json.partial
mv deploy-private/initial-admin.json.partial deploy-private/initial-admin.json
echo 'First administrator provisioned and audited. Credentials: /srv/nilart/deploy-private/initial-admin.json (private).'
