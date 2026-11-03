#!/usr/bin/env bash
# Sync source only; build before downtime; retain volumes and Caddy certificates.
set -Eeuo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
host=${NILART_DEPLOY_HOST:-ubuntu@94.183.176.20}
remote=${NILART_DEPLOY_DIR:-/srv/nilart}
domain=${NILART_DOMAIN:-nilartstudio.ir}
[[ $host =~ ^[a-zA-Z0-9_.@-]+$ && $remote =~ ^/[a-zA-Z0-9_/-]+$ && $remote != / && $domain =~ ^[a-zA-Z0-9.-]+$ ]] || { echo 'Invalid deployment target' >&2; exit 2; }
for command in ssh rsync; do command -v "$command" >/dev/null; done
# Prepare exact locked wheels locally; the target network cannot reach PyPI files.
python=${NILART_DEPLOY_PYTHON:-$root/Backend/.venv/bin/python}
if [ ! -x "$python" ]; then python=python3; fi
"$python" - "$root" <<'PY'
import hashlib, platform, shutil, subprocess, sys
from pathlib import Path
if sys.version_info[:2] != (3, 12) or platform.machine() not in {'x86_64','AMD64'} or sys.platform != 'linux':
    raise SystemExit('Use Linux x86_64 Python 3.12 or set NILART_DEPLOY_PYTHON.')
root=Path(sys.argv[1]); lock=root/'Backend/requirements.lock'; wheels=root/'Backend/.deploy-wheels'
digest=hashlib.sha256(lock.read_bytes()).hexdigest(); marker=wheels/'.lock-sha256'
if not marker.exists() or marker.read_text()!=digest:
    if wheels.exists(): shutil.rmtree(wheels)
    wheels.mkdir()
    subprocess.run([sys.executable,'-m','pip','download','--only-binary=:all:','--dest',str(wheels),'-r',str(lock)],check=True)
    marker.write_text(digest)
PY
ssh -o BatchMode=yes "$host" "test -d '$remote' && sudo -n docker compose version >/dev/null"
# Exclude ALL local credentials, fixtures, generated caches and private browser evidence.
rsync -az --delete --delay-updates --timeout=120 -e "ssh -o BatchMode=yes -o ServerAliveInterval=15 -o ServerAliveCountMax=4" \
  --exclude='.git/' --exclude='.env' --exclude='.env.*' --exclude='*.pem' --exclude='*.key' \
  --exclude='.venv/' --exclude='node_modules/' --exclude='.next/' --exclude='.next-*/' --exclude='.deploy.lock' --exclude='__pycache__/' \
  --exclude='.pytest_cache/' --exclude='.ruff_cache/' --exclude='.mypy_cache/' \
  --exclude='test-results/' --exclude='playwright-report/' --exclude='*.tsbuildinfo' \
  --exclude='/backups/' --exclude='/releases/' --exclude='/deploy-private/' \
  --exclude='/design-reference/' --exclude='/Frontend/tests/' --exclude='/Backend/tests/' \
  "$root/" "$host:$remote/"
ssh -o BatchMode=yes -o ServerAliveInterval=15 -o ServerAliveCountMax=4 "$host" "bash '$remote/infra/scripts/deploy-remote.sh' '$remote' '$domain'"
curl --fail --silent --show-error --connect-timeout 10 --max-time 30 --retry 6 --retry-delay 10 --retry-all-errors "https://$domain/api/v1/health/ready"
printf '\nDeployment verified: https://%s\n' "$domain"
