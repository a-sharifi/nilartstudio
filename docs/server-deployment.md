# nilartstudio.ir deployment

Target: `ubuntu@94.183.176.20`, source directory `/srv/nilart`, Compose project `nilart-live`.

Run once on a fresh Ubuntu server:

```sh
./infra/scripts/setup-server.sh
```

Deploy the current local working tree, including uncommitted application changes:

```sh
./infra/scripts/deploy.sh
```

The script uses SSH and rsync, excludes local env files, keys, test fixtures, caches and browser evidence, and preserves server-only `.env.server`, backups and all named Docker volumes. It prepares exact Linux x86_64/Python 3.12 wheels locally (cached in ignored `Backend/.deploy-wheels`), installs them offline on the server, and builds before downtime, stops writers, makes a PostgreSQL custom-format backup, runs `docker compose down` **without `-v`**, starts dependencies, applies additive migrations, starts all services and checks health/HTTPS. No local database, media, credentials or synthetic account is imported.

Caddy handles HTTPS and `/api/*` routing directly to FastAPI, with all remaining requests going to Next.js. Only ports 80/443 are published. Database, Redis and RabbitMQ are private to Docker. Certificates persist in `nilart-live_caddy_data`. Current approved media/private download bytes live in PostgreSQL, so database backups include these assets; the unused development MinIO compatibility container is deliberately absent.

The server generates independent database/cache/queue/OTP secrets on first deploy in mode-0600 `/srv/nilart/.env.server`. Subsequent deployments retain them. Do not replace that file with `.env.demo` or commit it. The runtime uses production security settings with secure cookies and an exact HTTPS origin. Real payments and SMS are disabled until their production integrations are implemented/configured. No automatic admin, demo catalogue, stock or price is created.

Cloudflare: apex A record `nilartstudio.ir → 94.183.176.20`, proxied; SSL/TLS **Full (Strict)**. Caddy obtains and renews its public certificate. DNS must point at the server before HTTPS verification can pass. Domain, SSH target and source directory can be overridden using `NILART_DOMAIN`, `NILART_DEPLOY_HOST`, `NILART_DEPLOY_DIR`; configure matching DNS first.

## Operations

```sh
ssh ubuntu@94.183.176.20
cd /srv/nilart
sudo docker compose --project-name nilart-live --env-file .env.server -f infra/docker/compose.caddy.yaml ps
sudo docker compose --project-name nilart-live --env-file .env.server -f infra/docker/compose.caddy.yaml logs --tail=100 api caddy worker
```

Before redeploying, ensure free disk space for build layers and backups. Backups are retained under `/srv/nilart/backups`; copy them to a separate private backup location. The deployment creates a backup on subsequent runs when a database exists. It never automatically downgrades schema or restores an older database. Failed builds leave the running services untouched; migration/start failures halt with evidence in logs. The prior API/web images are tagged `nilart-live-api:previous` and `nilart-live-web:previous`; code rollback requires checking schema compatibility, and database restoration requires a deliberate operator decision.

A complete deployment does not mean all application release acceptance has passed. Follow the acceptance matrix for unfinished workflows. The initial public database is empty and customer registration requiring SMS is unavailable until real SMS is connected. Provision the first verified operator account deliberately; the existing `python -m nilart.bootstrap.first_admin --account-id … --reason …` command grants the first admin role with audit and refuses when an administrator already exists.

Manual verified backup on the server:

```sh
sudo /srv/nilart/infra/scripts/backup-server.sh
```

A backup is finalized only after `pg_restore --list` validates the archive. Private backups are mode 0600. Keep an encrypted copy off-server and manage retention explicitly; scripts do not delete backup history.

## First administrator

On a new, account-free database, explicitly provision the owner-supplied mobile over authorized SSH:

```sh
bash /srv/nilart/infra/scripts/bootstrap-server-admin.sh OWNER_MOBILE
```

This one-time operator workflow generates a random password, records the administrative grant in the audit log, refuses an existing account database, and writes credentials only to mode-0600 `/srv/nilart/deploy-private/initial-admin.json`. Retrieve them privately over SSH; do not paste them into issue trackers or commit them. The confirmed owner account was provisioned during this deployment. Password sign-in works independently of the disabled SMS service.

Verify a backup by restoring it into a disposable database, automatically removed afterward:

```sh
bash /srv/nilart/infra/scripts/verify-server-backup.sh
```

## Verified deployment — 2026-10-31

- Applied migrations through `0054` to the new server database.
- Eight healthy services: Caddy, web, API, worker, scheduler, PostgreSQL, Redis and RabbitMQ.
- Cloudflare proxied apex DNS and Full (Strict); Caddy obtained a valid Let's Encrypt origin certificate. HTTP redirects to HTTPS; public readiness returns `{"status":"ready"}`.
- With owner confirmation, attached a dedicated `nilart-web` hosting security group: inbound TCP 80/443 and UDP 443 only. Retained the existing SSH group. No database/cache/queue port is published.
- Repeated the complete sync/build/down/up deployment successfully; the administrator account and certificate survived.
- Verified a pre-deployment archive by restoring into a separate temporary database: schema `0054` and one restored operator account. The live database was not overwritten.
- Verified real Chrome password sign-in, authenticated Persian admin dashboard and settings, and public storefront. Worker logs show successful scheduled outbox dispatch and inventory expiry jobs.
- Main local and isolated demo databases were not imported or changed. Public catalogue is initially empty. Existing presentation placeholders and unfinished release acceptance remain subject to the separate application audit; deployment is not a claim of complete commerce readiness.

The provider initially allowed SSH only. A healthy container stack alone did not prove deployment: opening approved web ingress was required for Cloudflare access and ACME HTTP validation. Keep those rules in place for certificate renewal. Source synchronization alone does not update provider firewall/DNS settings.


## eNamad technical verification preparation — 2026-11-01

- Published the exact portal-provided `enamad` meta tag (`34025288`) in server-rendered homepage metadata. Confirmed it is inside the public HTML head. TypeScript and the production build passed; all deployed services and public readiness passed.
- Published `/34025288.txt` as an empty HTTP 200 response over HTTP and HTTPS, without requiring authentication or following a redirect. Other HTTP routes still redirect to HTTPS.
- Added proxied `www` CNAME to the existing apex; Caddy obtained a valid certificate and redirects normal `www` requests to the apex. The public verification file is also accessible directly on `www`.
- Verified file access from the hosting server as well as the development connection. The eNamad portal has so far rejected both meta-tag and file checks with generic missing-tag/file messages. This does **not** establish successful ownership verification; technical access remains pending portal acceptance. No binding declarations, tariffs, or later application stages were submitted.


## Direct Caddy HTTPS — 2026-11-01

At the owner's request, both Cloudflare DNS records are now **DNS only**: apex A `94.183.176.20` and `www` CNAME to the apex. Cloudflare remains the DNS provider; its HTTP proxy is disabled. Caddy terminates public TLS with automatically renewed Let's Encrypt certificates for both hostnames. Verified direct origin HTTPS with normal certificate validation for the homepage, readiness, and `www` redirect. The apex certificate expires 2027-01-29 and `www` 2027-01-30; Caddy retains certificates in its existing persistent volume. Cached DNS answers may temporarily continue routing through Cloudflare.


## Official eNamad badge — 2026-11-01

Owner supplied the issued trust seal (ID `8242686`). The shared `EnamadSeal` component embeds the official remote badge and verification link with `referrerPolicy="origin"`, opens verification in a new tab, and provides Persian/English accessible text. It appears in the storefront and checkout footers. Removed the temporary `enamad` verification meta tag, `/34025288.txt` public file, and all corresponding Caddy verification exceptions. Ordinary HTTP traffic redirects to HTTPS again. DNS-only Cloudflare records, Caddy-managed certificates, and the canonical `www` redirect remain in place. This supersedes the pending ownership-check notes above; no claim is made about later license processing beyond the owner's supplied badge.

Browser validation confirmed the official seal opens NilArt's issued business profile, with validity through 1407/08/10. At verification time the supplied `logo.aspx` endpoint returned HTTP 403, so the component retains the exact official remote image URL and hides a failed image while keeping a visible, accessible verification caption/link. No copied or fabricated badge is substituted. The old verification URL now falls through the existing application's generic HTML route instead of serving a verification file.
