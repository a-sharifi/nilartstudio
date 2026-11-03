#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu host. Existing services are not replaced.
set -Eeuo pipefail
host=${NILART_DEPLOY_HOST:-ubuntu@94.183.176.20}
[[ $host =~ ^[a-zA-Z0-9_.@-]+$ ]] || exit 2
ssh -o BatchMode=yes "$host" bash -s <<'REMOTE'
set -Eeuo pipefail
sudo -n apt-get update -qq
sudo -n env DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io docker-compose-v2 rsync ca-certificates
sudo -n systemctl enable --now docker
sudo -n install -d -o "$(id -un)" -g "$(id -gn)" -m 750 /srv/nilart
REMOTE
