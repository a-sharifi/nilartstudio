# Nilart — AI engineering handoff

Updated 2026-10-12. This is an implemented foundation, **not a finished commerce platform**. Use Git history for the exact source revision.

## Instructions for the receiving AI

Continue this repository; do not recreate it. Read this document, `docs/implementation-progress.md`, `docs/architecture.md`, `docs/rfp.md`, and relevant backend contracts before editing. Read applicable `AGENTS.md` instructions and preserve unrelated working-tree changes.

The user requires Python/FastAPI DDD, PostgreSQL, Redis, RabbitMQ/Celery and Next.js. For every frontend step, reuse the supplied design's actual components, hierarchy, markup, CSS, typography, spacing and responsive behavior. Do not replace it with generic components or silently redesign screens. Framework/API adaptations may change internals, not the appearance. Report missing design states before substituting a new visual system.

Never fake successful authentication, payments, inventory, SMS or AI in live mode. Do not infer stock/prices from artwork filenames. Do not commit secrets, publish print-production files, delete volumes, reset Docker storage, force-push or deploy publicly without appropriate authorization. Distinguish implemented, tested and release-ready.

## Sources of truth

- `docs/rfp.md`: PRD v2; collection-based shop, SKU options, ready stock, bundles, discounts, BOM/material costing, manual price publication, operational accounting, ready paintings and custom commissions.
- `docs/ui-ux-design-spec.md`: screens, states and Persian/English RTL/LTR requirements.
- `docs/design-prompt-checklist.md`: delivered design prompts; checkmarks do **not** mean working integrations.
- `docs/architecture.md`: architecture decisions.
- `docs/design-import.md`, `docs/design-source-manifest.json`: imported design provenance.
- `docs/implementation-progress.md`: detailed work/test history and current blockers.
- `Backend/CATALOG.md`, `Backend/IDENTITY.md`, `Backend/ACCESS.md`, `Backend/PROFILE.md`: current contracts and limitations.

Design repository: `git@github.com:a-sharifi/DesignNilArtHomepage.git`, pinned revision `70be0f616f75580f57116d3d001481b54f0e5a8c`. Do not implicitly update the revision.

Code remote: `git@github.com:a-sharifi/nilartstudio.git`.

## Structure and excluded assets

```text
nilartstudio/                  # Git checkout root on this machine
  Backend/                    # Python 3.12, API and worker
  Frontend/                   # Node 24, Next App Router/TypeScript
  packages/api-client/        # generated OpenAPI and TypeScript types
  design-reference/           # Vite reference preview
  infra/
  docs/
  Makefile
```

The previous workspace nested this checkout under `code/` and kept `design-prints/`
as an external sibling. Those print assets are absent from this clone. Commands
must run from the current Git checkout root.

A clone does not include print artwork, local environments, credentials or database volumes. `docs/artwork-manifest.json` records external artwork, not approved website images or opening stock. Artwork was moved intact and post-move hashes checked; no pre-move hash baseline was captured. Preserve workspace upload/download folders and legacy environments. Publish only explicitly approved display assets.

## Feature status

| Area | Implemented | Still pending |
| --- | --- | --- |
| Foundation | Compose, proxy, migrations, CI configuration, Make commands, health/logging, typed schema | GitHub CI verification; other-service/production recovery |
| Design | Original components/pages imported; 42 original CSS files byte-identical | Complete Next layouts/SSR and remaining integrations |
| Catalog | Published localized collections/categories/products/SKUs; homepage and collection list/detail connected | Product purchase, real prices/stock and admin writes |
| Identity | Password/OTP registration/login/recovery, sessions, CSRF, logout, rate limiting | Real SMS adapter and operational verification |
| Permissions | Explicit role policies and database role lookup per request | Audited role administration, first-admin bootstrap, future resource ownership enforcement |
| Profile | Own-profile API and original form, version conflicts, owner precondition, real states, native history guard | Shared private-cache lifecycle, contact/address changes |
| Outbox | Transactional insertion, retryable dispatch, idempotent consumer infrastructure | Business handlers and failed-event operations UI |
| Media | Local internal S3-compatible storage foundation | Buckets, least-privilege credentials, uploads/private delivery |
| Commerce/finance | Requirements and imported design bases | Inventory, purchases, production, costing, bundles/cart, payments, shipping/returns, accounting |
| Artist/paintings | Design and documented scope | Real commission execution, AI integration, delivery and settlement |

Imported customer/artist/admin pages are not functioning panels. Unconnected live routes are guarded; only explicitly labelled demo mode may use fixtures. No real accounts/admin, opening stock or financial records were seeded. No real messaging, payments, refunds or public deployment occurred.

## Backend map and invariants

`Backend/src/nilart/contexts/<context>/` contains `domain`, `application`, `infrastructure`, `presentation`. Catalog and identity are currently implemented. Domain code must not depend on FastAPI, SQLAlchemy or Celery. Use cases coordinate operations; infrastructure implements ports. Do not mutate another context's ORM models directly.

Entry points: `bootstrap/main.py`, `bootstrap/settings.py`, `bootstrap/worker.py` under `Backend/src/nilart/`. Shared event and money infrastructure is in `shared/outbox.py` and `shared/money.py`. OpenAPI export is `Backend/scripts/export_openapi.py`.

API prefix `/api/v1`; catalog under `/catalog`, identity under `/auth`, profile `/account/profile`, readiness `/health/ready`. Consult `packages/api-client/openapi.json` for exact methods/fields. Public reads must not leak draft records. PostgreSQL is the truth for stock and finance; Redis is not.

Money uses Decimal with explicit currency and JSON string amounts, never floats. Reject negative/non-finite values, more than six decimal places and amounts >=10^18. Future adapters must explicitly handle toman/rial conversion.

### Identity/security

- Iranian phones normalize Persian/Arabic/ASCII digits to canonical `+98`.
- Passwords: 12–128 Unicode characters and <=512 UTF-8 bytes; salted scrypt, bounded verification parameters.
- Server sessions expire after 24 hours; hashed token/CSRF storage; HttpOnly, SameSite=Lax cookies, Secure outside development.
- Exact configured origin, CSRF validation and fail-closed Redis rate limits.
- OTP: purpose-bound HMAC, 3-minute expiry, five attempts, 60-second resend interval, independent secret >=32 bytes.
- Register/recovery grants: opaque, one-use, 10-minute expiry. Registration assigns customer only. Recovery revokes old sessions/grants/challenges.
- Password failures do not disclose unknown/blocked/unverified accounts.
- SMS is deliberately disabled until a provider is selected; unavailable/unconfirmed responses are not success. Capturing adapters exist only in tests. Never store/log raw OTPs.
- OTP provider calls currently occur synchronously through a transactional port: delivery followed by rollback may leave an unusable code. Handle uncertain outcomes, not blind successful retry.
- Customer/artist/operations/finance/admin policies are explicit. Roles re-read from PostgreSQL each request; no admin seed, assignment endpoint or audit implementation exists yet.

Profile version 0 means no saved profile; first save becomes 1. Stale writes return 409; preserve the draft. Extra fields/control characters are rejected; phone, roles and account ID cannot be edited. `X-Profile-Owner` detects account switches; it never selects an owner. Derive ownership from the session principal.

### Migrations and background processing

Current head **0008**: outbox → collections → catalog foundations → processed events → accounts/sessions → OTP/grants → roles → profiles. Applied locally before the Docker failure; inspect the actual database after recovery. Do not rewrite applied migrations destructively.

Outbox insertion shares the domain transaction. Dispatch locks with SKIP LOCKED and confirms broker publishing; consumption records event IDs transactionally. Only `infrastructure.ping` has a handler; stock/payment workflows do not exist yet. Celery uses JSON, persistent delivery, late ack, prefetch 1 and bounded retries. Optional beat must have one active instance.

## Frontend map and caveats

- `Frontend/src/design/`: imported components and pages; preserve visuals.
- `Frontend/src/features/design/DesignEntry.tsx`, `DesignRuntime.tsx`: compatibility runtime/live guards.
- `Frontend/src/app/[[...path]]/page.tsx`: catch-all entry.
- `Frontend/src/features/catalog/adapter.ts`: real catalog mapping.
- `Frontend/src/features/identity/adapter.ts`, `profile.ts`: auth/profile adapters.
- `Frontend/src/styles/design-compatibility.css`: targeted fixes separate from original CSS.

The design runtime is behind an SSR-disabled client boundary: public SSR/SEO and route-specific layout migration remain unfinished. Live navigation uses Next routing; demo history is separate. Auth grants stay in per-tab JS memory, not URLs/storage; reloading restarts incomplete OTP flows. Navigation-generation guards reject stale results. Unknown mutations must not become success or trigger automatic reissue.

Profile routes `/fa/account/profile` and `/en/account/profile` use original `ProfilePage` inside `DashboardPage`. Live fixture names, fake notification/support markers and preview controls are removed. Conflict drafts remain until explicit reload. Focus/logout broadcasts revalidate through the API; broadcasts never establish authorization. Internal links, native Back/Forward and beforeunload protect edits. The persistent `NavigationGuardProvider` preserves Next router state, rolls rejected traversal back without unmounting the form, and replays the original destination only after explicit consent. Current browsers use native indices for fragment history; older browsers fall back to marked application entries. Other panel/contact/address routes remain unconnected.

## Running and testing

Requires Python 3.12, Node 24, Docker, Compose 2.24.4+ and Make. Copy `.env.example` to `.env`, provide fresh independent secrets, never commit/share the populated file.

```sh
make install
make up
make migrate
make check
make build
make api-client
make design-reference
```

Other commands: `help`, `down`, `logs`, `test`, `lint`, `typecheck`. `down` preserves volumes. Enable periodic outbox dispatch with `COMPOSE_PROFILES=scheduler make up`, one scheduler only. Normal URL: `http://localhost:8080`; nginx exposes localhost and routes `/api` through the same origin.

Compose: PostgreSQL 17, Redis 7, RabbitMQ 4, API, worker, Next, local S3-compatible storage and nginx. Infrastructure is internal; test override ports are localhost-only. API readiness checks PostgreSQL/Redis, not broker health; worker health is separate.

MinIO's historical image was unavailable. Development builds source revision `07c3a429bfed433e49018cb0f78a52145d4bedeb`; upstream is archived. Production requires a security-reviewed `MINIO_PRODUCTION_IMAGE`, external secrets and HTTPS certificates. Bucket provisioning/backend S3 integration remain unfinished.

## Current environment and verification evidence

The Linux development stack has been brought up on 2026-10-12. All eight services
are healthy at `http://localhost:8080`; readiness returns `ready`. This machine has
ample disk space and a functioning Docker daemon. The earlier Docker Desktop disk
failure in the progress log belongs to the previous environment.

A protected, gitignored `.env` contains fresh independent development credentials.
This clone started with an empty PostgreSQL volume. Migrations were applied through
**0008**. No accounts, roles, catalog stock or prices were seeded. The public catalog
correctly returns an empty list. A separate `nilart_test` database holds isolated,
rollback-only integration schemas; it is not the application database.

Building pinned MinIO source failed because Go dependency downloads returned 403
and TLS timeouts. The current development run explicitly uses the already cached
community image pinned by digest through the new development-only override:

```sh
make MINIO_DEVELOPMENT_IMAGE=minio/minio@sha256:d249d1fb6966de4d8ad26c04754b545205ff15a62e4fd19ebd0f26fa5baacbc0 up
```

Keep the same option for subsequent Compose commands. This override removes the
source build and uses `mc ready local` for health. Make rejects it in production;
production storage selection/security review remains a release gate.

Local Python 3.12 is in `Backend/.venv`. The downloaded, checksum-verified Node 24
runtime is under `/home/ez/.local/share/nilart-runtime/bin`; add it to PATH for npm
and Make checks on this host. Docker builds use their own Python/Node base images.

The latest profile continuation orders reads and rejects old-session save results.
Account switches/denials clear private drafts and conflicts. Temporary read failures
preserve edits across focus checks and explicit retry. All 42 original CSS files
remain byte-identical to the reference. The profile also has native Back/Forward protection, including multi-entry jumps,
pending-save blocking and fragment entries on current browsers. Shared session lifecycle is connected for auth and profile: verified changes clear
registered auth memory and profile drafts, and revisions reject late private API
responses. Focus, visibility, BFCache and tab hints trigger API revalidation. Profile save/bootstrap 401 responses also clear registered private caches; stale
denials cannot clear a newer account, and 403 never establishes global sign-out. Future
private caches must register cleanup/revalidation and forms must register their own guard.

| Current check | Result | Qualification |
| --- | --- | --- |
| Backend with PostgreSQL | 121 passed | Separate test database, isolated transactional schemas |
| Frontend tests | 44 passed | Profile lifecycle and shared-session/read/save-expiry regressions |
| Lint/type checks, both applications | Passed | Latest source |
| Final Docker build and service health | Passed | All eight services healthy, migration head 0008 |
| Chromium browser suite | 29 passed | Production development build; sensitive responses mocked |
| Firefox session/navigation | 12 passed previously; 3 session checks passed on latest source | Latest checks include expiry during save; navigation implementation unchanged |
| GitHub CI | Not verified | Local results do not imply a passed remote run |

A Starlette/httpx deprecation warning remains. No public deployment, real SMS or
payments have been performed. The platform's release gates still apply.

## PostgreSQL backup continuation (2026-10-12)

`infra/scripts/postgres_backup.py` and `make backup-verify` now perform read-only
custom-format dumps and restore them into an isolated, disposable PostgreSQL 17
container using the source image ID, no network/ports and a temporary memory
filesystem. The local database restored at migration 0008; all 15 user tables
were queryable. A separate fixture integration test preserved Persian rows,
sequence values and foreign-key enforcement; corrupt archives were rejected.
Four safety tests plus one Docker integration test passed. Infrastructure CI now
runs these tests, but remote CI is not yet verified. No app code changed in this
slice; frontend/backend test results above belong to the preceding slices.

Reports contain archive checksums, migration and table counts; private dumps and
reports are ignored and owner-readable only. Existing output cannot be overwritten,
failed drills leave no success report, and only generated restore containers are
removed. See `docs/backup-restore.md`. This is one-database verification, excluding
roles/ACLs, WAL/PITR, other service volumes, production recovery and off-host backup
retention/encryption. It does not satisfy the full release backup gate.

## Saved-backup recheck continuation (2026-10-12)

`make backup-check BACKUP_PATH=...` / `--verify-existing-dir` now revalidates a
trusted saved archive: strict report validation, SHA-256 before Docker, isolated
restore and exact comparison with the saved migration/table-count inventory.
Archive/report files remain unchanged on either success or failure. Older backups
use their stored revision; no source database or existing restore target is used.
Eight safety tests and one real Docker integration test passed, including corrupt
checksums, invalid image/count metadata, mismatched inventories and saved-file
preservation. The local 15-table, revision-0008 saved backup was also rechecked.
This does not add signatures, row-by-row comparison, off-host storage or production
recovery approval. No app code changed; prior app test results remain historical.

## Recommended continuation

1. Keep the local stack healthy using the explicit development storage option above; verify remote CI and extend the PostgreSQL restore drill to approved off-host retention and recovery of other services.
2. Adopt shared session/private-cache cleanup and revalidation in each future private feature; reuse the navigation provider and extend guards as new forms are connected.
3. Implement audited role management and explicitly approved first-admin bootstrap; enforce ownership/artist assignment on business endpoints.
4. Finish Next route/layout/SSR migration in small visually verified steps using the pinned components, desktop/mobile and both languages.
5. Select SMS provider with the user; implement bounded observable delivery without fake live success.
6. Implement media provisioning/private access and approved display-asset imports.
7. Deliver tested vertical slices for inventory, materials/BOM and price review, procurement/production, bundles/discounts, shared cart, checkout/payments, fulfillment/returns, commissions and finance. Definitive PRD requirements are not dropped.

High-risk rules for future work: lock final-stock reservations; idempotent callbacks/refunds/events; immutable historical price/cost snapshots; distinguish failed from ambiguous payments; dependency-driven cost review without automatic public price changes; separate leaves/pages and replacement/weighted-average costs; deterministic bundle discount allocation and partial returns; avoid multi-collection/gateway-settlement double counting.

## Release gates

Obtain approved SKU/stock data, material rates/target margin, shipping rules, customer policies, asset permissions, selected SMS/payment/AI providers, domain/VPS access and secure credentials. Test backup restoration in isolation. Verify private access, OTP abuse limits, CSRF, queue recovery, concurrency, RTL/LTR, design parity and limited real orders before release.

An imported admin page or successful build does not satisfy these gates. Financial writes, real messaging, refunds and public deployment require specific authority. Report completed slices and outstanding limitations honestly.
