# Nilart — AI engineering handoff

## Product images — implementation checkpoint, 2026-11-03

Read [the execution plan](product-images-plan.md) and [the live progress register](product-images-progress.json). This checkpoint supersedes the original planning-only binding note. The approved rule is TOP-bound sketchbooks (40 sheets, front/back), side-bound ruled notebooks (80 sheets, front/back/real-paper spread). All 220 sets / 484 PNG positions are now rendered in the local database on schema0062. Nothing has been published or deployed by this image project yet.

Implemented: deterministic Pillow renderer; immutable private source assets; versioned photo templates; durable Celery jobs on a dedicated single-process queue; atomic reviewed publication/withdrawal/rollback; product-workspace controls (including fresh design uploads); shared filtered/lazy public gallery outside the hidden notebook form; selected-SKU gallery loading guards. Local Docker supports Persian text through libraqm0; do not remove that runtime dependency. 49 backend tests and 30 frontend workflow tests pass; Docker web build passes. Browser use is disabled in Work settings, so real UI screenshot checks are still unverified.

Portable inputs: `/home/ez/Documents/nilart/product-images-build-20261103` (145 named private inputs, 136 original source files) and `/srv/nilart/deploy-private/product-images-20261103` (transfer is private). All output images and 17 review sheets are at `/home/ez/Documents/nilart/product-images-review-local-20261103`. Original source files and real photos were never rewritten. The RGBA bookmark/sticker release is `/home/ez/Documents/nilart/other-product-images-build-20261103` (12+12 original poses). Contact sheets 1–6 of the notebook export and the complete 24-pose sheet have been visually reviewed; finish 7–17 before publishing.

Resume using `infra/scripts/manage-product-images.py` (run in the API container): `import`, `status`, `retry`, `export`, `publish --reviewed-keys <json>`, `covers`. Publication requires an explicit JSON list of reviewed canonical set keys. Match each environment separately; local legacy 50/100-sheet sketchbook SKUs must not receive new 40-sheet SKU galleries. No price, cost, inventory, shipping dimensions, return policy, sale activation or payment setting changes are authorized. Production backup: `/srv/nilart/backups/scheduled-20261103T151106Z.dump`; read-only commerce digests are in `docs/product-image-baselines.json`.

Next: finish image QA; publish/verify locally; deploy code, additive0062 and dedicated worker; render/publish/verify production; complete other-product galleries and mandala checks; compare commerce baselines; update this checkpoint and commit on the existing branch. No new branch. Earlier checkpoint sections below are historical.

Updated 2026-10-13. This is an implemented foundation, **not a finished commerce platform**. Use Git history for the exact source revision.

## Browser audit continuation — 2026-10-22

Latest server follow-up: pinned SKU mappings now supply authoritative basket option labels/UUID selections, which existing checkout acceptance and order snapshots preserve. Real browser zero-charge order `3f7f9917-7180-43f6-a5e0-d3d936cfe3c1` retains Small/کوچک after reviewed mapping v3 publication. Full backend suite 721 passed, zero skipped; preview API/worker/scheduler rebuilt, main unchanged. Synthetic SKU now explicitly priced 0 IRT with physical 100g profile v1 and approved gallery; one unit committed to this unshipped test order, admin basket empty. This supersedes the older historical-label gap below; remaining multi-SKU/financial/artist/release gaps still apply.

Latest correction: public authored options now load frozen published SKU mappings from the existing API, with identity validation, bounded request concurrency and safe fallback for incompatible historical definitions. QA mapping v2 has selectable Small and intentionally unsupported QA Large; browser draft isolation/review/publication/fa/en checks pass. 11 focused tests, build/lint pass, preview web rebuilt. This supersedes the raw-SKU-only display gap below; AC-03 exact notebook/stock transitions and server-side historical option labels still remain open. Main unchanged.

Basket follow-up: live quantity/reload/edit/invalid-zero/Persian-digit/remove-undo checks pass against real preview. Fixed demo disclosure/accessibility label on live basket rows; 7 focused tests, lint/build pass and preview rebuilt. Retained preview admin basket has synthetic RSV-e7134e0e quantity 3. Newly confirmed gap: current published QA Size/Small mapping is not rendered as authored public option families; AC-03 remains blocked. See audit for exact action limits.

Follow-up: synthetic product memberships now persist across two collections and one category, and populated public filters return the same product/SKU. Corrected live collection cards using demo pricing/favorites and false out-of-stock labels for missing prices; locale links now explicit. Browser fa/en retest, 8 focused tests, lint and build pass. AC-01/02 shared stock-changing purchase remains open because this SKU lacks a published price. See the audit follow-up for exact evidence.

See `admin-browser-audit-2026-10-22.md`. Fixed shop URL filters being discarded against the empty loading catalogue. Real-browser English/Persian reloads and selective chip removal pass in preview; 3 focused tests, production build and typecheck pass. Main untouched; populated collection acceptance and the previously recorded release gaps remain open.

## Current integrated checkpoint — 2026-10-21

Read `admin-integrated-release-progress.md`, `admin-integrated-acceptance.json` and `artwork-checkout-integration.md` first. Isolated preview0054 now includes managed original/print/licensed artwork authoring, accepted settings-backed checkout, digital/mixed stock separation, protected digital fulfillment and frozen-policy/tax refund bounds. Main stays0051. Keep the integrated-preview compose override; do not reset demo resources or deploy partial stages to main. Remaining work is family/group costing and production dependencies, gateway/artist/customer finance and official profit, full commissions/artist workspaces, operational queues and final56-view/AC-01–22 release acceptance.

## Browser audit checkpoint — 2026-10-21

Read `admin-browser-audit-2026-10-21.md` and its JSON evidence. Five dedicated browser-registered roles and labeled synthetic records remain in preview only; private credentials/session files are outside Git. All 56 admin routes were checked in fa/en at 1440/390 px: 54 workspaces and two placeholders (settlements/profit). Forty-eight customer layout variants, browser-only connected authoring/purchase/production/checkout/delivery/return/support/commission-preview flows, permission revocation and session invalidation are recorded. Supplemental browser tests use explicitly labeled API/imported-state fixtures. The shared filter reload, unlabeled dropdown toggle, overlapping CSRF rotation, commission-review alias and mixed physical/digital return-state defects were corrected and retested. Backend718/frontend434 pass. Full acceptance is still blocked; do not equate route coverage or supplemental mocked tests with complete browser acceptance. Keep main0051 unchanged and preserve preview0054 resources.

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

Current head **0022** (2026-10-13; later continuations below): outbox → collections → catalog foundations → processed events → accounts/sessions → OTP/grants → roles → profiles → draft SKU options/audits. Artwork descriptions follow draft options; commission request storage follows artworks; bundle composition follows commission requests; versioned explicit SKU price editing follows bundles; applied locally at head 0013. Do not rewrite applied migrations destructively.

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
| Backend with PostgreSQL/Redis | 213 passed | Isolated database schemas and disposable Redis containers |
| Frontend tests | 84 passed | Includes native artwork, commission, bundle and product-detail coverage |
| Lint/type checks, both applications | Passed | Latest source |
| Final Docker build and service health | Passed | All eight services healthy, migration head 0013 |
| Chromium catalog checks | 17 passed historically | Latest UI slice; this backend-only slice verifies unauthorized HTTP access and service health |
| Firefox expiry page | 3 passed historically | Reload, retry, permission rejection, external redirects, Persian mobile; prior session/navigation checks remain historical |
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

## Restored row-fingerprint continuation (2026-10-12)

New backup reports include per-table SHA-256 fingerprints of sorted row JSON,
streamed through COPY and an anonymous private temporary file. Rechecks now detect
changed values even when counts are equal. Old reports remain supported with
counts-only verification; raw rows never enter reports/logs. Eleven tests passed,
including a real same-count value change, restoration to the original fingerprint,
malformed fingerprints, mismatch rejection and old-report compatibility. A new
local backup restored at revision 0008 with 15 tables and the older saved backup
also passed its narrower recheck. Application code was unchanged. Fingerprints do
not add signatures, approved off-host retention or application recovery approval.

## Live session-expiry continuation (2026-10-12)

The supplied AUTH-09 page is connected at both locale session-expired routes.
It checks the API on entry and shared lifecycle signals, presents explicit retry
for unknown/service failures, and distinguishes an active session from confirmed
absence. Continue is a user action; destination permission/ownership remains the
endpoint's responsibility. Locale profile return paths are now accepted by the
safe auth allowlist; external redirects are rejected. Original CSS is unchanged,
live fixture controls/notes are hidden, and no private content or replayed operation
is introduced. Three unit regressions cover absence, retry and verified-logout
ordering; browser regressions cover reload, safe returns, permission rejection and
Persian mobile layout. Account-restricted routes remain unconnected.

## Live access-adapter continuation (2026-10-12)

A shared frontend adapter now consumes `/api/v1/auth/access` with no-store reads,
strict owner/role/permission metadata validation and immutable snapshots. Ordered
reads and session revisions reject stale grants; fresh calls see revocation instead
of cached permissions. A 401 clears registered memory; a 403 does not establish
global logout. Nine new unit cases passed (56 frontend tests total). No private
panel was connected, no account role changed and no frontend permission snapshot
can authorize a backend operation. Future panels must subscribe/revalidate and
clear their local snapshots on verified boundaries. See `Backend/ACCESS.md`.
Browser results above belong to the preceding route implementation; this adapter
adds no visible route or styling change.

## Shared access-consumer continuation (2026-10-12)

`AccessStore` and client `useAccountAccess()` now share one live permission request
stream between mounted consumers. Session hints revalidate while hiding prior
grants; unknown/denied reads never retain a ready snapshot. Verified logout clears
access immediately and generations reject older positive reads. Final unsubscribe
releases the listener and private snapshot; remounting reads afresh. Server snapshots
contain no private access. Seven store tests plus a React consumer integration test
bring frontend tests to 64 passing. This is reusable infrastructure; existing demo
panels remain guarded and no private workflow or account-role change is introduced.
Prior browser results belong to earlier visible-route work.

## Profile session-lock continuation (2026-10-12)

Profile saving revalidates and locks the session/account rows through its database
transaction, closing the CSRF read/write gap. Rotation/revocation after the initial
permission read is detected before writing: stale CSRF yields 403, missing active
session yields 401. Ordinary session GETs remain unlocked. Three new PostgreSQL
cases cover those interleavings and a real two-connection lock/rotation probe;
124 backend tests passed. Test data lives only in isolated test schemas. No schema
migration or frontend behavior changed, and this is not blanket serialization of
role revocation or future commerce workflows. See `Backend/PROFILE.md`.

## Transactional profile-permission continuation (2026-10-12)

Profile writes now re-read role grants with `FOR SHARE` and re-require
`account.write_self` inside the session-locked transaction. A role revoked after
the initial request guard cannot authorize a later profile write. A two-connection
probe proves a deletion waits after grant locking and proceeds after commit.
All 125 backend tests passed; lint/type checks passed. No migration, role-management
endpoint, administrator bootstrap or frontend change was introduced. Only this
profile write has the additional transactional recheck; other business workflows
must enforce their own permission/ownership/state concurrency rules.

## Logout-origin continuation (2026-10-12)

Logout now uses the same exact configured-Origin gate as the other cookie-auth
mutations, before session lookup and revocation. Even a genuine CSRF token cannot
bypass missing/foreign-origin rejection; rejected requests leave session and cookie
unchanged. Five new origin cases plus the real PostgreSQL logout flow passed;
130 backend tests total. Lint/type checks passed. Non-browser API clients must send
the configured Origin explicitly. No migration or frontend change was introduced;
existing browser POSTs supply Origin. Remote CI remains unverified.

## Real Redis rate-limit continuation (2026-10-12)

Seven Docker-backed Redis cases now verify concurrent password phone/address
caps, CSRF caps/expiry, OTP action caps/windows, hashed keys and real bootstrap
outage behavior. Fixtures use localhost-only dynamic ports and temporary storage;
only generated fixture containers are stopped/removed. The application Redis
service/data is untouched. Set `NILART_TEST_REDIS_IMAGE` to enable these tests;
backend CI now pulls/enables Redis 7. All 137 backend tests passed locally with
PostgreSQL and Redis, plus lint/type checks. Runtime application code did not change;
no new frontend build/browser result is claimed. Remote CI, deployment/proxy
addressing, failover and live SMS delivery remain unverified.

## OTP address/outage continuation (2026-10-12)

Nine further disposable Redis cases cover shared-address OTP caps across distinct
phones, independent action counters, address-only paths and unchanged expiry on
rejection. Real Redis shutdown denies all five password/OTP sign-in endpoints
with 503, no cookie and no-store before database business work. No SMS was sent.
All 146 backend tests passed locally, and lint passed for the changed test file.
All eight application services remain healthy; fixture containers were removed.
Only tests/documentation changed, so no fresh frontend/build/typecheck result is
claimed. Remote CI, production proxy address handling and Redis failover remain
unverified. Existing Starlette/httpx warning remains.

## Private response cache continuation (2026-10-12)

Request middleware now enforces no-store across auth/account path boundaries,
including framework validation and routing failures that bypass endpoint headers.
Eight initial regression failures reproduced the gap; all 158 backend tests now
pass, including twelve new cache/error/boundary cases. Lint/type checks and Docker
build passed. Live nginx API probes confirmed private 422/404 no-store responses;
all eight application services are healthy. No frontend or migration changes.
Unhandled exceptions are outside this returned-response guarantee. Remote CI is
unverified, and the existing Starlette/httpx warning remains.

## Unexpected-error continuation (2026-10-12)

Global exception handling now returns generic 500 internal_error JSON with matching
request-ID header and no-store. The handler logs only exception class/request ID;
response and application-handler log omit exception messages/traces. Two injected
session/access failures verify the contract without application data mutations.
All 160 backend tests, lint/type checks and Docker build passed; eight services
are healthy. No frontend/migration changes. This covers pre-response failures;
streaming/background failures and server-level traceback logging remain separate.
Remote CI remains unverified and the existing Starlette/httpx warning remains.

## Catalog batch-read continuation (2026-10-12)

Product pages now batch published memberships in two queries for selected product
IDs. Nonempty pages use four SELECTs; empty pages use two. Ordering, draft-link
exclusion and empty memberships are preserved. Three new regression cases measure
query counts and compare list/detail outputs. All 163 backend tests, lint/type
checks and Docker build passed; eight local services are healthy. No frontend,
API shape, migration or application data changes. Query counts do not establish
production throughput or a snapshot across concurrent publication changes.
Remote CI remains unverified; existing Starlette/httpx warning remains.

## Product-SKU read continuation (2026-10-12)

Product-SKU lookup now checks published product ID without loading memberships.
Published/empty products use two SELECTs; missing/draft products use one and 404.
Four HTTP regression cases verify query counts and ordered public results. The
extended isolated PostgreSQL case passes for SKU identity/exact price. Full suite
passed 167 tests; the PostgreSQL case was rerun after extending its assertions.
Lint/type checks and Docker build passed; eight services remain healthy. No
frontend, migration, application data or stock changes. Remote CI unverified;
existing Starlette/httpx warning remains.

## Catalog identifier-validation continuation (2026-10-12)

Catalog detail/product-SKU slugs and SKU codes now accept 1–160 characters;
optional collection/category filters reject empty/oversized values. Omit filters
for unfiltered lists. Eight new HTTP cases prove rejection before catalog queries.
All 175 backend tests passed. OpenAPI updated and client regenerated (TypeScript
output unchanged); backend lint/type checks, frontend typecheck and Docker build
passed. Eight local services healthy. No frontend runtime, migration or data
changes. Remote CI unverified; existing Starlette/httpx warning remains.

## Draft SKU option authoring continuation (2026-10-12)

Migration 0009 adds separate JSONB draft aggregates and audit snapshots. Protected
GET/PUT /api/v1/admin/catalog/products/{product_id}/options target existing products.
PUT replaces a validated complete document with optimistic version checking,
transactional session/role locks and exact Origin/current CSRF; product locking
serializes initial saves. Audit and draft commit atomically. No public SKU/data,
price, stock, administrator assignment or publication change. See Backend/CATALOG.md
for payload limits, ordering, empty/version-0 semantics and draft-code scope.
Sixteen new cases verify validation, authorization, permission/session/CSRF changes,
public isolation, audit rollback, concurrent first saves and migration downgrade.
191 backend tests, 11 infra tests, lint/backend typechecks, API client generation,
frontend typecheck and Docker build passed. Local head 0009 and eight healthy
services verified; live protected endpoint returns 401/no-store. Backup defaults
advance to 0009; historical saved reports are unchanged. Remote CI unverified.
Next: publication needs a separate approved contract, followed by documented
inventory and purchasing before connecting the live product selector. Admin UI
and product creation are also outstanding. No option data was inferred/seeded.

## Option audit-read continuation (2026-10-12)

Protected GET /api/v1/admin/catalog/products/{product_id}/options/audits now
returns product-scoped before/after snapshots and actor/version metadata, ordered
newest first. Limit 1–100 (default 20), exclusive before_version cursor and
next_before_version provide stable paging when new versions are added. Missing
products return 404; empty history is an empty page. No audit mutation endpoint.
The new PostgreSQL regression covers authorization, ordering/paging, product
isolation, actor identity and bounds. All 192 backend tests, lint/backend typing,
client generation, frontend typing and Docker build passed; eight services healthy.
No migration, live data or admin UI changes. Remote CI remains unverified.

## Concurrent option replacement verification (2026-10-12)

The isolated two-connection PostgreSQL test now synchronizes writer starts and
covers initial creation plus replacement of an existing version-1 draft. Exactly
one succeeds and one conflicts; final document, audit count and before/after
snapshots must match the winning write and prior document. All 193 backend tests
and changed-file lint passed; eight services healthy. Tests/docs only: no fresh
build/frontend/typecheck claim. Remote CI unverified; existing warning remains.

## Live shop browsing continuation (2026-10-12)

/fa/shop and /en/shop now connect to public catalog through LiveShopPage in App,
with real product cards, category/collection URL filters and six-item paging.
The existing shop classes/ProductCard are reused; original design CSS unchanged.
Loading, empty and error/retry states use API status. Category-load failure now
marks catalog error rather than silently presenting incomplete data. Live cards
hide demo labels/favorites, use explicit image-unavailable and unconfirmed
purchase details, and do not infer prices/stock from draft combinations.
All 66 frontend tests, lint/typecheck and Docker build passed; the focused
Chromium shop test verifies English/Persian with mocked API products. Backend and
migration unchanged. This is browsing only: product detail remains guarded;
inventory, cart, checkout, media and option publication are still required for
purchasing. Remote CI unverified. Full old browser suite was not rerun here.

## Live artworks continuation (2026-10-12)

Migration 0010 adds unseeded catalog_artworks descriptions with published-only
paginated list/detail APIs. Application queries and SQL repository separate reads
from presentation. /fa|en/artworks and detail routes now use a cancellable API
loader, timeout/error retry, empty and not-found states. Existing gallery classes
and unchanged original CSS are reused; no demo paintings/prices/statuses become
live. Without approved media/purchase data, show image unavailable and purchase
unconfirmed. Real gallery starts empty; artwork authoring/import, metadata filters,
media and purchasing are outstanding. All 194 backend and 68 frontend tests passed,
plus lint/typechecks, client generation, Docker build, 11 infra checks and focused
bilingual Chromium gallery/detail navigation. PostgreSQL read test reran after
repository extraction. Backup defaults advance to 0010. Remote CI unverified.

## Commission submission continuation (2026-10-12)

Migration 0011 adds account-owned text briefs with unique owner/submission UUID.
POST /api/v1/account/commissions requires account.write_self, exact Origin/current
CSRF and transactionally rechecked session/roles. Replay returns the original
receipt; altered brief under the same ID conflicts. Receipt status awaiting_review
means saved, not assigned/dispatched or quoted. Live fa/en commission forms record
idea, changes, style/size preferences and execution. Unknown outcomes retry the
same immutable brief/ID; session changes clear private memory. No browser storage.
195 backend tests, 70 frontend tests, 11 infra tests, focused Chromium submission,
lint/typechecks, client generation and Docker build passed. See Backend/COMMISSIONS.md.
Uploads, AI, artist assignment/review, quotes, request history, payments and
cancellation remain outstanding. No external messages, financial writes or seeds.
Backup default advances to 0011. Remote CI unverified; existing warning remains.

## Bundles and static footer continuation (2026-10-12)

Migration 0012 adds unseeded bundle descriptions/components using shared SKUs and
positive quantities. Public list/detail exclude empty bundles and any unpublished
component SKU/parent product. Bounded pages batch load component titles/codes.
Live bundle list/detail reuse the cancellable description loader with resource-
scoped state; no inferred prices, capacity, discounts or media. All eight requested
footer information routes now render static bilingual content with explicit
unpublished policies/contact/tracking where appropriate, without simulated writes.
196 backend tests, 71 frontend tests, lint/typechecks, client generation and 11
infra tests passed; targeted bundle/artwork PostgreSQL tests rerun after query-port
refactoring. Final Docker build and three focused Chromium cases (bundle navigation, artwork
regression and eight footer routes) passed; eight services healthy at head 0012.
Backup defaults advance to 0012. Bundle authoring/options/discounts,
inventory capacity/reservation, cart and payment remain outstanding. No seeds.
Remote CI unverified; existing warning remains.

## Static footer content completion (2026-10-12)

Eight footer information pages now have bilingual introductions, content sections,
breadcrumbs, shared navigation and shop/commission links; FAQ uses expandable
answers. Responsive styling is isolated in features/design/static-info.css using
existing tokens; imported CSS remains unchanged. Unpublished legal/contact details
stay explicit, and no fake tracking/message/refund forms are introduced. All 72
frontend tests, lint/typecheck and Docker build passed. Two focused Chromium tests
verify all eight routes plus mobile FAQ interaction/no overflow; mobile screenshot
was inspected. Backend/migration unchanged. Remote CI remains unverified.

## Design fidelity correction (2026-10-12)

The generic static footer and shop implementations in the previous entries were
contrary to the supplied design and are superseded by this correction. The live
footer routes now render the actual AboutPage, ContactPage, TermsPage,
ReturnsPage, TrackingPage, FAQPage, BuyingGuide, and PrivacyPage. Those eight
component files and all reference CSS remain byte-identical to design-reference.
StaticInfoPage and its custom stylesheet were removed. Contact uses the
reference's unavailable state because no approved contact configuration or
message service exists; tracking uses the reference service-error path and cannot
issue simulated SMS. Legal pages retain the supplied prototype labels; these are
not approved business policies.

ShopPage now receives the real catalog through optional data/status/retry props.
Its original cards, filters, layout and sheets remain intact. API collections and
categories drive query normalization; products without published SKU contracts
remain visible with the existing unknown-price/availability state. Stock/price
filters exclude these products. Unapproved images use the original image-error
state, and demo favorites and preview controls are disabled for this live route.
The simplified LiveShopPage was removed. Category routes are connected too.

This correction covers footer pages and shop. LiveArtworksPage (also used for
bundles) and LiveCommissionsPage still need replacement with their native reference
components and compatible backend contracts. Do not describe the whole site as
matching the reference yet. Preserve existing real submission and listing APIs
while doing that work; never replace native page markup with another generic page.
Backend contracts, migrations, application data and credentials were unchanged.
Local frontend tests: 72 passing; lint and typecheck passing. Production Docker
build and desktop/mobile browser verification are recorded in the progress log.
Remote CI remains unverified.

## Artwork reference restoration (2026-10-12)

The artwork correction is now complete for public description browsing. App uses
ArtworksPage and ArtworkDetailPage directly with optional catalog props, replacing
the simplified artwork rendering. The supplied layout, gallery cards, filters,
image fallback, detail specifications, information sections, skeletons and error
states remain in their original components. All 42 supplied stylesheets remain
byte-identical. Demo mode retains the original illustrative gallery; live mode
never substitutes fixture paintings or commercial data.

The cancellable artwork-catalog adapter validates published list/detail responses,
paginates, bounds loading time, distinguishes missing detail from request errors,
and retries. Published title/description fields populate the native components.
Artist, medium, style, dimensions, images, price, uniqueness, frame and inventory
are not in the existing API contract and remain unknown; filters requiring those
fields exclude these records. Default order follows the catalog API, not inferred
publication dates. Purchase and favorite callbacks cannot execute in live mode.
Localized gallery/detail routes, including unprefixed aliases, are connected;
search survives detail navigation, back and reload.

Validation: 75 frontend tests, lint/typecheck, production Docker build and eight
focused Chromium cases (including mobile screenshots) pass; all eight services
healthy. Backend/migration/data and API schema unchanged; backend checks from the
previous slice remain historical and were not rerun for this frontend correction.
Remote CI remains unverified. Fixtures used by browser tests are intercepted API
responses only and were not inserted into the application database.

Commissions and bundle presentation still need their reference components restored.
LiveArtworksPage is now used only by the remaining bundle wrapper. Preserve the
existing real commission submission and bundle APIs while replacing those UIs.

## Commission design restoration — 2026-10-12

Live commission routes now render the original CommissionsPage, ReferencesPage
and PreferencesPage instead of the generic form. All 42 reference CSS files
remain byte-identical. The original layout, cards, illustrations and field groups
are retained, with live state labels and no prototype controls. A verified session
is required for private authoring; the introductory CTA uses real authentication.

The text brief and preference checkpoints survive Next route mounts in browser
memory, scoped to the verified account. They are not server drafts and do not use
browser storage. Session rotation clears them; focus revalidation detects a
changed account. Image input is disabled. Illustrative style/dimension cards
express customer wishes and do not establish approved production offerings.
Final submission uses the existing CSRF-protected, idempotent review-request API
and shows its stored receipt in the preferences page. Unknown outcomes lock edits
and reuse the identical submission ID/body on retry. Obsolete CSRF/receipt replies
cannot submit or restore a prior account's private data. No assessment, quote,
payment or external dispatch is simulated.

Validation: 77 frontend tests, lint/typecheck, production Docker build and 12
focused Chromium cases pass, including Persian mobile layout, original flow,
guest sign-in, uncertain retries and private-data clearing on account changes.
All eight services are healthy. Backend/schema/migrations/data are unchanged;
previous backend results are historical and were not rerun for this UI slice.
Remote CI remains unverified. Browser fixtures are intercepted responses only.

Next design restoration: bundles still use the generic wrapper. Restore the
original bundle list/detail components with their existing real API, keeping
unknown commercial data and purchase controls unavailable. Commission uploads,
configured production options, assessment, quotes and review workflows remain
subsequent backend contracts.

## User-requested local reference catalog — 2026-10-12

The user explicitly requested products/collections from design-reference for local
UI testing. The previously empty local database now has five published collections
(Cats, Ghosts, Cows, qolche, Love), four categories and four products (127 gsm
sketchbook, ruled notebook, sticker set, bookmark), with their reference memberships.
Bilingual descriptions mark them as test data. This supersedes earlier statements
that the local catalog is unseeded; those statements describe prior checkpoints.
No accounts/roles, SKUs, prices, stock, artwork or bundle records were created.

`Backend/fixtures/design-catalog.json` contains the reference descriptions and names;
`nilart.bootstrap.design_catalog` is an explicit local-only importer. It requires
`--local-test-data`, a fixture path and the local service's database environment.
It never runs in startup/migrations, does not overwrite matching slugs, and stages
all records in one transaction. See `Backend/fixtures/README.md` for reproduction.

Validation: seven focused backend tests passed, new-module lint/mypy passed,
public API counts and all product/collection memberships were checked, and live
English/Persian shop plus collection detail were verified in Chromium. Persian
mobile shop has no horizontal overflow. A second real PostgreSQL import was
rejected without changing existing data. No frontend/API/schema changes or full
backend suite/build rerun for this data-only request; remote CI is unverified.

## Published bundle reference layout — 2026-10-12

Live bundle list/detail routes now use the original bundle-card, product-gallery,
two-column purchase panel and bundle-component structures. PublishedBundlesPage
uses the homepage reference bundle section; PublishedBundleDetail in the original
BundleDetailPage adapts the detail structure to the available public contract.
All 42 reference CSS files remain byte-identical. The last generic
LiveArtworksPage wrapper was removed. Prototype bundle options/calculation/cart
remain limited to demo mode and are not invoked by published bundle views.

The bounded, cancellable bundle adapter validates descriptions, explicit quantities,
SKU codes and uniqueness, supports pagination/retry and distinguishes missing detail
from service errors. Native states cover loading, empty, malformed/error and 404.
Arbitrary components display their exact published names/quantities/codes; there
is no assumption of notebook options or Cats membership. Images, stock, price,
discounts and purchase eligibility remain unconfirmed. No fabricated media,
prototype cart, automatic capacity or discount calculations are introduced.

Validation: 80 frontend tests, lint/typecheck and production Docker build pass.
Fourteen focused Chromium checks cover bundles, catalog, commissions and footer,
including RTL mobile, invalid responses, retry, empty results and missing details.
All eight services remain healthy. The local user-requested five collections/four
products persist in PostgreSQL; this slice adds no bundle/SKU/data records and no
backend/API/schema changes. Historical backend tests were not rerun. Remote CI
remains unverified.

Next: connect product detail routes to original ProductDetailPage and existing
published product/SKU reads, retaining unknown inventory and disabled purchasing;
then implement explicitly approved inventory/price and authoring contracts.

## Published product detail connection — 2026-10-12

Product detail routes, including /products/{slug} and Persian/English aliases,
now render PublishedProductDetail inside the original ProductDetailPage source.
It retains the reference gallery, purchase panel, option radios, price summary
and description/specification sections. All 42 CSS files remain byte-identical.
Shop product links preserve the selected language. Prototype notebook options,
cart, fake price changes, favorites and reservation callbacks are not invoked.

The public adapter loads the product and its published SKU list with cancellation,
bounded loading and retry; missing/unpublished details stay distinct from errors.
It validates product membership arrays, SKU ownership, duplicate identities/codes
and exact decimal/currency representations. SKU codes are shown as published
options without inferring size, cover, material, stock or production specifications.
An explicit option selection shows only its published price; null prices remain
unknown. Decimal strings are never converted to floating point, including large
six-decimal values. Purchasing stays disabled until inventory/purchasing contracts
exist. A product with no published SKUs remains visible and explains that state.

Validation: 84 frontend tests, lint/typecheck, production Docker build and 17
focused Chromium cases pass (three product-detail cases plus fourteen catalog,
bundle, commission and footer regressions). English/Persian navigation, exact
prices, invalid/foreign SKU responses, retry, 404 and mobile overflow were checked.
A separate browser read verified the actual local PostgreSQL sketchbook and its
test-data notice/no-SKU state. All services remain healthy; local test records persist.
No API/backend/schema/migrations/data changes; backend checks remain historical.
Remote CI is unverified. Automated product fixtures are intercepted only, not seeded.

Next backend slice: audited published-SKU/price authoring and inventory contracts,
with explicit option mappings and stock availability before enabling purchases.
No automatic draft-option publication, stock inference or price calculation is implied.

## Explicit SKU price editor — 2026-10-12

Migration 0013 and GET/PUT admin SKU price endpoints provide versioned editing of
existing SKU prices. Writes require catalog.manage, exact Origin, fresh CSRF and
locked session/account/role rechecks. Explicit null means unknown; IRT/IRR amounts
must be decimal strings within NUMERIC(24,6) bounds. Floats/exponents/extra fields
and excessive precision are rejected. A stale version yields 409. Price/version
reads share one database snapshot; SKU locks serialize writers. Price, incremented
version and actor/identity/timestamp/before-after audit commit atomically.

No SKU creation, draft publication, stock, inferred price, admin role assignment,
admin UI or audit browser is included. Public price changes require an explicit
successful write to an existing published SKU; no automatic publication occurs.
No prices or SKUs were entered in the application database; five test collections
and four products remain unchanged. The additive migration is applied locally.

Validation: all 213 backend tests pass with isolated PostgreSQL/Redis fixtures,
including 15 new precision/security/rollback/concurrency cases. Backend lint and
configured mypy pass; OpenAPI/client regenerated; frontend type checking and
production Docker build pass. All eight services are healthy at 0013; the new
private endpoint returns 401 without a session. Eleven backup tests, including the
real PostgreSQL restore test, pass; backup defaults advance to 0013. UI/browser
results from the prior frontend slice remain historical. Remote CI is unverified.
Existing Starlette/httpx deprecation warning remains.

Next: explicitly versioned SKU creation/publication and option mappings, plus
inventory contracts before enabling purchasing. Admin UI/role bootstrap require
their own implementation; do not infer stock or configure real business prices.

## Reference product imagery and local Cats bundle (2026-10-12)

The user's explicit reference imagery request is implemented with the exact
original SVG `Mockup` extracted into its own module and original `BundleStillLife`.
Known reference product slugs now show those illustrations in shop cards,
homepage products and product detail. Only `cats-bundle` receives the reference
one-book/two-sticker/one-bookmark composition; unknown records retain missing media.
All 42 reference CSS files remain byte-identical.

The explicit local fixture was imported into the application PostgreSQL database:
6 products, 5 collections, 4 categories, 3 unpriced test SKUs and 1 Cats bundle.
The two added products are Cats stickers and bookmark; quantities are 1/2/1.
Descriptions retain bilingual test notices. Prices and currencies are null,
stock/purchasing remain unavailable, and no admin permissions were assigned.
The importer rejects conflicts and rolls back atomically. Reproduction is in
`Backend/fixtures/README.md`; do not rerun it against existing fixture records.
Production SKU authoring/publication, inventory and purchase contracts remain
separate work. Historical zero-SKU statements above describe previous slices.

Validation: 86 frontend unit tests; three focused backend tests in isolated
PostgreSQL; frontend/backend lint, frontend typecheck and configured backend
mypy. Production Docker build succeeded, all eight services are healthy, and eleven
focused browser cases passed, including the actual database fixture on desktop
and Persian mobile. Screenshots were visually inspected.
Remote CI is not verified.

## Protected SKU price history (2026-10-12)

GET `/api/v1/admin/catalog/skus/{sku_id}/price/audits` exposes existing price
history to current sessions with `catalog.manage`. It uses the 0013 audit index,
without schema changes. Responses are private/no-store, scoped to one SKU,
newest first, with limit 1–100 and an exclusive `before_version` cursor. Typed
snapshots preserve exact decimal strings and null unknown prices. Audit metadata
includes actor, SKU/product, versions and UTC timestamp; tokens are excluded.

Seven new PostgreSQL cases cover permission denial/revocation, unauthenticated
access, exact snapshots, null transitions, SKU isolation, missing/empty history,
invalid cursors/limits and a newer price write between pages. OpenAPI and client
types were regenerated. No application price/stock/catalog records were changed.
Admin UI, versioned SKU creation/publication and inventory contracts remain next.
Validation: all 221 backend tests passed with isolated PostgreSQL/Redis; backend
lint and configured mypy passed; OpenAPI/client generation and frontend typecheck
passed. Production Docker build passed and all eight services are healthy. Live
unauthenticated history returns 401/no-store. Local DB still has zero price audits
and zero priced SKUs; Cats bundle composition remains 1/2/1. Browser checks from
the previous imagery slice remain historical; remote CI remains unverified.

## Unpublished SKU authoring foundation (2026-10-12)

Migration 0014 adds independent SKU authoring versions/audits. POST admin
`/products/{product_id}/skus` creates only an explicitly submitted code, unpublished
and unpriced. GET/PUT admin `/skus/{sku_id}` reads metadata and version-checks code
edits. Published codes are immutable through this API. Missing records return
404; duplicate codes/stale versions/published edits return 409. Existing untracked
SKUs report version zero. Product membership and price are never reassigned.

Every write requires catalog.manage, exact Origin, fresh CSRF and locked rechecks
of session/account/roles. Create/edit plus audit plus version are atomic. Public
catalog responses exclude these unpublished SKUs. No automatic option publication,
stock, price, account or administrator assignment is added. Price authoring keeps
its separate versions. No application SKU data is entered by this slice.

Tests cover invalid codes/extra fields, authorization, fresh CSRF/session
revocation, duplicate codes, stale versions, audit rollback for creation and
editing, public isolation, concurrent duplicate creation and concurrent edits,
and migration downgrade preserving catalog records. Backup expected revision
advances to 0014. All 237 backend tests passed with isolated PostgreSQL/Redis;
backend lint/configured mypy, OpenAPI/client regeneration and frontend typecheck
passed. Production Docker build and eleven backup tests (including real isolated
restore) passed. Local migration head is 0014; all eight services are healthy.
Live private metadata returns 401/no-store without a session. Existing three
fixture SKUs remain unpriced, authoring audits remain empty, and Cats composition
is unchanged. No UI changed; prior browser results are historical. Remote CI
is unverified.

Next: explicit option-combination mapping and reviewed publication, followed by
inventory contracts; admin UI remains separate. Do not enable purchase controls
using fixture SKUs or infer business specifications/prices from the reference.

## Explicit unpublished SKU option mapping (2026-10-12)

Migration 0015 adds SKU mapping snapshots. GET/PUT admin `/skus/{sku_id}/options`
select an explicit combination from that product's exact draft configuration
version. Codes must match the SKU; foreign/incomplete/missing references are not
inferred. Null explicitly unmaps. A configuration/version/combination maps at most
once; clear an old association before reassignment. Mapping writes use the shared
SKU authoring version and audit, independently of price versions.

Snapshots retain bilingual ordered option/value labels and explicit selections.
A draft version or SKU code change marks the mapping non-current without mutating
its snapshot. Product-before-SKU locks coordinate option editing and mapping;
read metadata/mapping/current draft in one statement. Writes require catalog.manage,
exact Origin, fresh CSRF and locked session/account/roles. Audit failures roll back
mapping/version changes. Published SKU mapping remains immutable in this API.

No publication, public response changes, inventory, prices, purchasing or new
application fixture mappings are introduced. Backup default advances to 0015.
Tests cover explicit snapshots, code and product ownership, stale versions,
missing/foreign references, security revocation, public isolation, unique mapping
and reassignment, rollback and concurrent mapping/draft edits. All 252 backend
tests passed with isolated PostgreSQL/Redis. Backend lint/configured mypy,
OpenAPI/client regeneration and frontend typecheck passed. Production Docker
build and all eleven backup tests, including isolated real restore, passed.
Local migration head is 0015 and all eight services are healthy; live private
mapping access returns 401/no-store without a session. Local DB retains three
unpriced fixture SKUs, zero mappings and zero authoring audits. All 42 reference
CSS files remain unchanged. UI/browser checks from earlier slices are historical;
remote CI remains unverified.

Next: reviewed publication with immutable public option snapshots and freshness
checks under the same product/SKU locks, then inventory contracts and admin UI.
Existing published test fixtures need no automatic mapping or inferred options.

## Database-backed product detail reference layout (2026-10-13)

The live PublishedProductDetail now uses original ProductGallery, native modal,
thumbnail/navigation/zoom gestures, full breadcrumb, intro action row, native
option/selection/quantity/price layout, specifications dl and delivery section.
Related product cards use published records from the same collection.
Closing zoom restores trigger focus. Share copies the actual product URL; favorites
and quantity/purchase remain disabled without their backend contracts. All 42
reference CSS files stay byte-identical. Bookmark/sticker details use their actual
reference kinds and palettes; notebook-only fields/interior views are not inferred.

Migration 0016 adds validated published presentation documents. Product detail
responses include them optionally; product lists and details without published
presentation remain unchanged. Frontend validates bilingual copy, gallery and
media before use. Presentation is separate from private draft option mappings.
The opt-in local import creates four profiles and three unpriced test SKUs;
readable option labels also live in DB. Six products, five collections, four
categories, six unpriced SKUs and one Cats bundle now exist locally. Existing test
notices and bundle composition remain preserved. Fixture README has reproduction.

Validation: all 255 backend tests passed with isolated PostgreSQL/Redis;
87 frontend tests and 13 browser cases passed. Browser tests cover actual DB
bookmark content, lightbox/focus restoration, Persian mobile, notebook keyboard
navigation and related collection cards. Desktop/mobile screenshots were inspected.
Backend/frontend lint, configured mypy, frontend typecheck, OpenAPI/client generation
and production Docker build passed. Eleven backup tests, including real isolated
restore, passed. Local head is 0016; all eight services are healthy and all 42
reference CSS files remain byte-identical. No real prices, stock, admin
roles or purchase eligibility are created. Reviewed SKU publication/immutable
public option snapshots and inventory remain subsequent work; remote CI unverified.

## Complete reference bundle presentation and database homepage — 2026-10-13

Live bundle list/detail and homepage share the original bundle card layout.
Known reference bundles use all four original still-life/gallery views, native
zoom/modal, keyboard/swipe navigation and focus restoration. Details show the
explicit fixed composition with reference component visuals, product links,
share, delivery/conditions and related component cards. Component API records
now include the published product_slug from the SKU/product join. Unknown
reference media remains unavailable rather than guessed. Prices, discounts,
stock and purchasing stay unconfirmed; no cart/inventory contract was added.

The homepage reads published collections, categories, four reference product
picks and the first two bundles from the catalog API. Reference ordering and
palettes are preserved. Bundle loading/error/retry/empty states do not inject
sample results. Published artwork copy is read when available; an empty artwork
catalog remains visibly empty. No simulated favorites or purchases are offered.

The opt-in local bundle-set importer adds the everyday/keepsake bundles with
their ruled/hardcover notebook products, sharing the existing Cats sticker and
bookmark SKUs. All three bundles contain one notebook, two stickers and one
bookmark. Preflight identity conflicts reject the entire import; the caller's
transaction rolls back failures. Local totals are eight products, eight unpriced
SKUs, three bundles, five collections and four categories. No migration is needed;
head remains 0016. Fixture reproduction is in Backend/fixtures/README.md.

Validation: 256 backend tests with isolated PostgreSQL/Redis, 88 frontend tests
and 16 browser cases pass. Browser coverage includes actual database homepage
content/order, all bundle gallery views, zoom/focus, component links, retry/empty
states and Persian mobile without overflow. Desktop/mobile screenshots were
reviewed. Backend/frontend lint, mypy, frontend typecheck, generated OpenAPI/client
and production Docker build pass. All eight local services are healthy; all 42
reference CSS files remain byte-identical. Remote CI has not been verified.

## Reference category list and shared filters — 2026-10-13

Shop category navigation and collection/category filters use the existing reference
ShopPage and FilterPanel. FilterPanel accepts explicit published database categories;
its markup, controls and styles are unchanged. This fixes missing category radios
in the live shop and removes the duplicate live collection category fieldset.
Category and collection choices follow the reference order; unknown categories
remain supported. Scoped category pages keep their category fixed. Live product
cards use the shared component's live mode, with no prototype labels or stock claims.

Validation: 88 frontend tests, nine browser cases covering real database categories,
filter selection/chips/clear, scoped routes, collection filtering, mobile temporary
apply/cancel/focus, navigation and homepage regressions. Typecheck/lint and production
Docker build pass. Desktop and Persian mobile screenshots reviewed; all 42 reference
CSS files byte-identical and eight services healthy. Backend unchanged; remote CI
unverified. No prices, inventory or purchase capability created.

## Shared reference product option rendering — 2026-10-13

ProductGallery/Modal/ProductCard remain the original reference components. The
reference ProductOptions now delegates its radio fieldset to ProductOptionGroup;
the published detail uses that same renderer for explicitly published SKU choices.
It preserves the original option-required label, radio grid, selected/checkmark,
status messages, guide/helper placement and CSS classes. Prototype option families
retain their existing behavior; live products do not infer notebook families or
stock. Product collection breadcrumbs, intro links and related collection actions
now use supported /collections routes with an explicit language query, including
direct load. Published presentation and exact prices remain database-backed.

Validation: 88 frontend tests and 13 browser cases pass, including selected state,
actual sticker/bookmark/notebook content, exact decimal prices, gallery keyboard/
zoom/focus, collection direct load, mobile Persian and homepage/bundle/filter
regressions. Typecheck/lint and production Docker build pass; desktop/mobile images
reviewed. All 42 reference CSS files remain byte-identical; eight services healthy.
Backend/database unchanged; remote CI unverified.

## Reference artwork list verification — 2026-10-13

Live artwork listing uses the original ArtworksPage/ArtGalleryCard, search,
filter panel/mobile sheet, pagination and loading/error/empty sections. No alternate
list renderer or CSS was introduced. Published records now explicitly show unknown
availability rather than implying an inventory result. Filter sheet close, Escape
and Apply restore focus to the original filter trigger; canceled drafts remain
unapplied. Images and artist/material/dimensions/prices are unknown until provided
by their contracts. The local artwork database remains empty; browser fixtures are
isolated and no artwork offers were seeded.

Validation: 88 frontend tests and nine browser cases pass, covering published card
layout, six-card pagination, search by description, detail/back/reload, mobile
apply/cancel/focus, retry/empty and homepage/bundle regressions. Desktop/Persian
mobile screenshots reviewed; typecheck/lint and production Docker build pass.
All 42 reference CSS files remain byte-identical and eight services healthy.
Backend/database unchanged; remote CI unverified.

## Reference artwork detail verification — 2026-10-13

Published artwork details use the original ArtworkDetailPage and artwork-detail.css,
with its gallery, purchase panel, key specifications, section navigation, about,
specification table and shipping sections. There is no alternate detail renderer.
Unknown live availability is explicitly labeled; breadcrumb home preserves the
language, modified clicks work normally, and the current page is identified.
Missing media keeps the original reference fallback and disables enlargement;
prototype frames, artist, dimensions, prices and buying are not fabricated.

Validation: 88 frontend tests and nine browser cases pass, covering reference
sections, actual API copy, unknown metadata/availability, disabled purchasing and
zoom, loading skeleton, distinct retry/404, list/detail/back/search and Persian
mobile without overflow. Desktop/mobile screenshots reviewed. Typecheck/lint and
production Docker build pass; all 42 reference CSS files byte-identical and eight
services healthy. Backend/database unchanged; remote CI unverified.

## Local reference artwork test data — 2026-10-13

The opt-in local importer/JSON fixture creates all nine bilingual reference artwork
titles as published PostgreSQL descriptions. Every description identifies test data
and unconfirmed image/artist/specifications/price/availability. No prototype
financial, inventory, authenticity or frame claims are copied. There is no migration
or API contract change. Existing identities are preflight rejected, with no overwrite;
caller transaction rolls back failures. Startup remains unseeded. Reproduction is
in Backend/fixtures/README.md. Local catalog now includes nine test artworks in
addition to eight products, eight unpriced SKUs and three bundles. Live gallery,
details and homepage use these database records with the existing reference UI.

Validation: 257 backend tests with isolated PostgreSQL/Redis and 11 browser cases
pass, including real DB records, bilingual detail/home content, rollback/conflict,
unknown pricing/stock and existing artwork UI regressions. Backend lint/mypy,
frontend typecheck/lint and Docker build pass; eight services healthy. Frontend
runtime/style/API contracts unchanged; remote CI unverified.

## Reusable dropdown with optional autocomplete — 2026-10-13

Frontend/src/components/ui/Dropdown.tsx provides a controlled dropdown with
`autocomplete` enabled/disabled (default false), localized labels/placeholder/empty
message, disabled choices/control and optional hidden form field. Autocomplete
filters labels, normalizes Persian letters and commits only existing choices.
Keyboard arrows/Enter/Home/End (non-searchable), Escape, Tab, outside dismissal,
selected checkmarks and scroll-to-active are supported. Escape inside the mobile
filter sheet closes the dropdown before dismissing the sheet.

Shop collection filters use searchable mode; sorting uses the same component with
autocomplete disabled. Both retain existing query and mobile draft/apply behavior.
Styles are isolated in dropdown.css; all 42 original reference CSS files remain
byte-identical. Component usage is documented beside its source in README.md.

Validation: 91 frontend tests and seven browser cases pass, covering both modes,
disabled options, no arbitrary values, Persian matching, real collection filtering,
sort selection, mobile apply/Escape and category/shop regressions. Typecheck/lint
and production Docker build pass; desktop/mobile screenshots reviewed and eight
services healthy. Backend/data unchanged; remote CI unverified.

## Restore notebook reference option families — 2026-10-13

The previous live notebook detail still showed one generic SKU selector; sharing
its radio renderer alone did not reproduce the reference notebook controls.
Published presentation now supplies ordered arbitrary option families, choice
labels/captions/helpers, explicit SKU-code combinations and an optional fixed fact.
The native ProductOptionGroup renders size/sheets/cover for the Cats sketchbook;
selection retains compatible choices and disables combinations not offered. Exact
published SKU resolution drives price display, without guessing stock. Notebook
size guide, about guide action, dynamic specifications and actual related bundle
cards use the native reference components/classes. All 42 reference CSS files remain
byte-identical. Other products retain the generic published-SKU path.

The guarded local importer upgrades original fixture profiles only, adds twelve
unpriced reference variant SKUs, and creates profiles for the ruled/hardcover Cats
notebooks. Seven Cats sketchbook combinations come directly from the reference;
other three notebooks get only explicit reference size choices. Existing generic
bundle SKUs and their quantities remain intact. Local totals: eight products,
twenty unpriced SKUs, six presentations, three bundles and nine test artworks.
No migration; head remains 0016. Private draft option mappings remain separate.

Validation: 259 backend tests with isolated PostgreSQL/Redis, 91 frontend tests,
and 12 browser cases pass. Coverage includes guard/rollback, duplicate/foreign/
incomplete combinations, actual DB family selectors, incompatibility, guide,
SKU resolution, related bundles, Persian mobile and existing product/home/bundle
regressions. Backend lint/mypy, frontend typecheck/lint, OpenAPI/client generation
and Docker build pass; desktop/mobile screenshots reviewed and eight services
healthy. No real prices/stock/purchases created; remote CI unverified.

## Recommended continuation

1. Keep the local stack healthy using the explicit development storage option above; verify remote CI and extend the PostgreSQL restore drill to approved off-host retention and recovery of other services.
2. Adopt shared session/private-cache cleanup and revalidation in each future private feature; reuse the navigation provider and extend guards as new forms are connected.
3. Continue the accepted `docs/panel-implementation-plan.md` from the remaining milestone 1 acceptance work. Audited role management/bootstrap and security contracts now exist; enforce ownership/artist assignment on each future business endpoint.
4. Finish Next route/layout/SSR migration in small visually verified steps using the pinned components, desktop/mobile and both languages.
5. Select SMS provider with the user; implement bounded observable delivery without fake live success.
6. Implement media provisioning/private access and approved display-asset imports.
7. Deliver tested vertical slices for inventory, materials/BOM and price review, procurement/production, bundles/discounts, shared cart, checkout/payments, fulfillment/returns, commissions and finance. Definitive PRD requirements are not dropped.

High-risk rules for future work: lock final-stock reservations; idempotent callbacks/refunds/events; immutable historical price/cost snapshots; distinguish failed from ambiguous payments; dependency-driven cost review without automatic public price changes; separate leaves/pages and replacement/weighted-average costs; deterministic bundle discount allocation and partial returns; avoid multi-collection/gateway-settlement double counting.

## Release gates

Obtain approved SKU/stock data, material rates/target margin, shipping rules, customer policies, asset permissions, selected SMS/payment/AI providers, domain/VPS access and secure credentials. Test backup restoration in isolation. Verify private access, OTP abuse limits, CSRF, queue recovery, concurrency, RTL/LTR, design parity and limited real orders before release.

An imported admin page or successful build does not satisfy these gates. Financial writes, real messaging, refunds and public deployment require specific authority. Report completed slices and outstanding limitations honestly.

### 2026-10-13 — Dropdown/font/reference price update

All existing selects now render through SelectDropdown, backed by the searchable Dropdown component (autocomplete remains an explicit option on Dropdown). Eight supplied Yekan Bakh WOFF2 weights are stored in Frontend/public/fonts/yekan-bakh; typography.css applies them without modifying reference CSS.

Local database now contains ten reference notebook variant prices from fixtures/design-test-prices.json. The guarded importer is idempotent for identical prices and refuses different existing prices or non-fixture products. Product detail offers quantity and a persisted local browser test basket for priced TEST-REF SKUs. It does not connect to the existing prototype cart, create server orders, reserve inventory, or take payment. UI labels state these limits; do not describe this as production checkout. Ghost notebook and other unpriced SKUs remain unavailable for adding until explicitly supplied prices exist.

Local checks: 260 backend tests and 92 frontend tests, frontend lint/typecheck, Docker build; all eight services healthy. Remote CI results remain unverified.

Final browser verification: all 11 relevant cases pass across the final runs, including shared dropdowns, Persian mobile filtering, reference product detail, supplied font loading, quantity selection and test basket persistence after reload. PostgreSQL confirms ten priced reference variants.

## 2026-10-13 — Milestone 1: audited access and account security

Implemented migrations 0017–0018, granular permission overrides, audited role/restriction
management with optimistic versions and last-manager protection, an explicit first-admin
operator command, safe session listing/revocation, password changes and owned verified
phone changes. All protected writes recheck Origin/CSRF/current permissions in their
transaction. Development sandbox SMS is explicitly configured and rejected in production.
No administrator was automatically assigned.

Connected `/fa|en/admin/users` and roles aliases through the reference admin shell;
connected the original customer security screen and a reference-pattern phone-change
form. Live shells omit prototype role switches and fake counters. Account changes clear
private data; unsaved edits and stale/ambiguous writes are guarded. The 129-view register
and full accepted eight-milestone plan are saved beside this document.

Local verification: 272 backend tests (isolated PostgreSQL/Redis, concurrent access writes,
rollback and audit atomicity), 96 frontend tests, four new browser checks, backend
ruff/mypy, frontend lint/type checks, generated OpenAPI/client, Docker builds and eight
healthy services. Mobile admin and desktop security screenshots reviewed. Browser tests
use mocked contracts; backend tests exercise the real isolated database. This is not
visual acceptance of every language, viewport or required state.

Milestone 1 remains partial: complete restricted-account/recovery/shared-system journeys
and broader route/layout acceptance are still required. Milestones 2–8 remain required.
No stock, orders, payments, costing, fulfillment or artist workflow was added by this
slice. Remote CI results are separate and currently unverified.

Phone-change follow-up: unsaved fields/challenges are guarded, confirmed verification returns to sign-in after revocation, and live customer headers omit the prototype unread dot. Persian mobile phone-change browser flow and a focused unit test pass. GitHub connector returned no commit statuses or PR workflow runs; push CI remains unverified.

## 2026-10-13 — Persisted customer-panel features (partial delivery)

Migration 0019 adds owned address, preference, favorite, support-message and notification records. Protected writes recheck the current session/permission and Origin/CSRF under an account lock; optimistic versions protect edits. Audit and outbox records commit with the change and omit private message/address contents. Ticket creation/replies use persisted idempotency keys. Staff replies require support.manage; no external SMS is sent.

Connected the original AddressesPage, AccountPreferencesPage and SupportPage to confirmed API results. Added owned conversations, notifications, published-catalog favorites and actual dashboard counts using the reference shell/patterns. Product details can save favorites. Inputs survive failed writes; private data clears on account changes. New address retries reuse their identifier. Empty accounts receive empty states, not reference records. All reference CSS remains unchanged.

Acceptance remains partial: favorites, conversations, notifications and dashboard require full original-component parity and Persian/mobile/state acceptance. Address region choices still come from the limited reference region list; nationwide coverage is not established. Support attachments are disabled until private media storage exists. Preference SMS delivery is unavailable. Bundle/artwork favorite buttons and read-only UI controls remain follow-up work.

USER-02–09 remain required: persisted orders, receipt, cancellation, returns/refunds, download entitlements and artwork approval need authoritative commerce/fulfillment/commission contracts. This slice does not create stock, paid orders, payments or private-file entitlements. The complete user-panel request is unfinished.

Verification evidence: isolated PostgreSQL tests cover ownership, validation, revoked permissions, optimistic conflicts, idempotency, unpublished favorite visibility, default addresses, atomic audit/outbox rollback and event deduplication. Five browser tests use mocked contracts for address reload, preference acknowledgement, support conversation, notification acknowledgement and guest denial. Browser checks and isolated database tests are separate evidence; no end-to-end paid purchase is claimed. Remote CI remains unverified.

## Admin continuation (2026-10-13)

`features/admin/AdminPanel.tsx` connects the fa/en admin landing shell and published
catalog browser, with collections/categories, products/SKUs, packages/bundles aliases
and artworks. `catalog-api.ts` validates exact price strings and uses the existing
private request/session/CSRF lifecycle for audited SKU price updates. Existing
AccountManagementPage handles users/roles. Sidebar permissions now filter individual
items; unimplemented business routes remain explicit unavailable states inside the
reference shell. No fixture dashboard metrics are shown in live mode.

Eleven new browser checks cover catalog contracts, aliases, decimal/version/CSRF
writes, persisted acknowledgement, conflicts, ambiguous results, retry/empty,
permission denial and Persian mobile navigation. Four existing panel-management
checks and all 96 frontend unit tests pass; lint/typecheck pass. Browser fixtures
are mocked, not live business mutations. Screenshots reviewed for English desktop
and Persian mobile. CRUD/publication, draft listing, stock/commerce/costing/finance
remain required; see the connected_partial page register. Unrelated in-progress
customer-panel changes in this workspace were preserved.

Admin production build: `npm run build` completed successfully after the final browser checks. Original design stylesheets remain unchanged.

## 2026-10-13 — Bundle detail aligned with the reference

Restored the reference detail hierarchy: collection breadcrumbs/eyebrow, original gallery and sticker-pair composition, shared component cards, ProductOptionGroup cards, standalone links, shared grouped purchase summary, quantity/count preview, starting price and exact decimal price breakdown, discount note, guide/lightbox dialogs and four related catalog cards. Reference styling is unchanged; approved Yekan Bakh remains in place. Option changes preserve compatible selections and clear dependent incompatible fields like the reference.

Migration 0020 and an optional public presentation endpoint provide explicit allowed component SKU choices and bilingual display data. The development-only importer stores the pinned reference's five Cats notebook variants, everyday/keepsake choices and sample discounts in the local database; adds only the explicitly approved reference sticker/bookmark sample prices. Existing different records reject the whole transaction. Public bundle list/detail contracts remain compatible. Tests cover published-only/same-product alternatives, absent presentation, repeat imports, overwrite rejection and migration reversal.

These are marked test prices, not approved retail data. Inventory remains unconfirmed; adding a bundle to a real cart stays unavailable. Stock flags and successful purchases are not fabricated to match the prototype. Exact original copy may differ where the database title or actual business state differs.

Local verification: 282 backend tests, 99 frontend tests and ten related browser checks passed. Persian mobile and English desktop screenshots were reviewed against the running pinned reference. Frontend lint/types, backend ruff/mypy, generated API client, Docker builds and all eight services passed. All 42 retained reference stylesheets are byte-identical. Remote CI remains unverified.


## Product-card starting prices — 2026-10-13

Home, shop and collection product cards display “از / From” with the cheapest explicitly priced published variant from the existing paginated SKU API. Exact decimal and currency comparisons preserve the selected price currency. Price display is independent of inventory; missing prices or a failed price lookup do not invent a default or prevent browsing. Reference card styling is unchanged.

Local verification: 102 frontend tests, 5 browser checks, frontend lint/type checking, Docker build and eight healthy services. Browser checks cover Persian/English prices and lookup failure. No backend schema or API changes. Remote CI is reported separately.


## Remaining homepage and bundle prices — 2026-10-13

Applied explicit local test prices to Ghosts notebook variants (145000 IRT), Cows stickers (45000 IRT) and Love bookmark (30000 IRT, using the reference bookmark sample price rather than the homepage zero/unavailable placeholder). The guarded opt-in importer validates test markers, rejects production mode and conflicting prices, and remains transactional/idempotent. No inventory was created.

Removed unconfirmed-purchase badges from homepage/shop browsing cards without claiming stock availability. Bundle cards now quote the cheapest authored allowed component options, multiply component quantities and apply the saved discount using exact decimal arithmetic. Missing data retains an unavailable price. Homepage Cats/everyday totals are 195000/180000 IRT. Reference CSS remains unchanged.

Local checks: 107 frontend tests, 7 browser checks, 2 focused backend importer tests, frontend types/lint and focused backend lint passed. Web Docker build passed; all eight services healthy. Unrelated ongoing panel work remains outside this commit. Remote CI is reported separately.

## Catalog administration continuation (2026-10-13)

Admin collections/categories/products now use `/api/v1/admin/catalog/entries/{kind}`
for all/draft/published lists and creation. `CatalogEditor.tsx` handles `/new` and
`/{id}/edit`, bilingual content, explicit product memberships, reasons, protected
navigation, audited history, version conflicts and uncertain results. Creation uses a
stable client UUID and routes to the persisted editor after server acknowledgement.
Explicit publication/unpublication has its own confirmation; published slugs are fixed,
and product dependencies must be published. Public SKU/presentation/media publication
remains separate and is not implemented here.

Backend domain/application/infrastructure/presentation authoring modules and migration
0021 implement current permission/session/Origin/CSRF rechecks, serialized dependency
publication checks, expected versions, atomic before/after audits and change outbox
notifications. Private SKU listing includes draft records, and the existing draft-SKU
creation endpoint is connected in AdminPanel. See Backend/CATALOG.md for contracts.

Final verification: all 312 shared backend tests passed (isolated PostgreSQL and disposable
Redis), including 27 new authoring cases; 107 frontend unit tests; 20 browser contract
checks. English desktop/Persian mobile editor screenshots reviewed; lint, mypy,
frontend typecheck, generated API types and production Docker builds passed. Local
migration head is 0022, including concurrent artwork metadata work; all eight services
are healthy and unauthenticated admin entry reads return 401/no-store. No business
records or roles were seeded/changed by this admin work. Browser mutations are mocked.
Remaining page/workflow gaps are recorded as connected_partial. Remote CI is unverified.


## Database-backed artwork samples — 2026-10-13

Nine existing test artworks now have persisted optional details: user-selected Niloufar Moradi / نیلوفر مرادی, colored-pencil technique, explicit varied sample dimensions, positive IRT prices and one sample unit each. Eight prices follow the reference; the unpriced afternoon placeholder receives an explicit 3900000 IRT local test price. Downloaded nine CC0 museum JPEGs to `Frontend/public/sample-artworks`; credits retain the real source artists and URLs and visibly identify sample imagery. These images are not claimed as works by Niloufar Moradi.

Migration 0022 adds `catalog_artwork_details`; its existing 0021 catalog schema prerequisite is included so the delivered migration chain is self-contained. No admin authoring routes are included in this slice. Existing artwork records without details keep unknown states. The optional details contract is generated into OpenAPI/client types. Sample stock is presentation data, not authoritative inventory or checkout permission. The guarded development-only importer requires original test notices, rejects conflicting details, commits atomically, and permits identical reruns.

Reference gallery/detail layouts and CSS are preserved. Cards and details share artist, price, technique, dimensions and sample images; available, price, artist-search and colored-pencil filters use persisted data. Purchasing remains disabled until its business workflow exists.

Verification: 108 frontend tests, frontend types/lint, 12 artwork browser checks across final runs, focused PostgreSQL migration/import/rollback/idempotency/unpublication tests, focused backend lint/types, API/client generation, Docker API/web builds and eight healthy services. Full workspace backend run: 287 passed, 25 skipped (reported separately from focused PostgreSQL evidence). Unrelated panel implementation remains outside this commit. Remote CI is reported separately.


## Artwork surface and frame samples — 2026-10-13

All nine local artwork detail documents now include bilingual surface (300 gsm drawing paper — sample) and frame (unframed — sample) labels. Key specs and the expanded specification table read the same persisted values. Optional fields preserve unknown states for legacy documents. The guarded importer may fill only missing surface/frame fields when every previously saved value matches; different existing values remain protected. No migration, price or inventory change. OpenAPI/client types updated.

Verification: 113 frontend tests, frontend types/lint, 2 isolated PostgreSQL tests covering upgrade rollback/idempotency/conflict protection, focused backend lint, Docker API/web builds and browser checks across all nine Persian detail pages plus English passed. Shared reference CSS unchanged. Remote CI reported separately.


## Optional artwork frames — 2026-10-13

All nine local sample artwork documents now offer an optional wood frame with the reference 650000 IRT surcharge. Bilingual framed labels and explicit frame-price amounts are persisted; missing options remain unavailable on other records. Selection updates the reference frame preview, key/expanded specs and displayed total, retaining the same artwork stock. Unframed restores the base amount. Sample purchases remain disabled. The guarded importer only fills missing frame metadata while protecting existing different values. OpenAPI/client types updated.

Local checks: 114 frontend tests, frontend lint/types, 2 PostgreSQL importer tests, focused backend lint, API/web Docker builds, eight healthy services, and browser checks for both selection directions across all nine artworks passed. Remote CI is reported separately.


### 2026-10-13 — Admin product options and SKU mapping continuation

Connected `/fa|en/admin/products/:id/options` (also `/variants`) from admin product rows. The original admin shell now hosts bilingual option/value fields, explicit combination selection, guarded removal, separate save, paginated option audits and draft SKU mapping/removal pinned to configuration and SKU versions. Existing published SKU immutability is respected. Conflicts/unknown acknowledgements retain input and require reload; navigation warns about unsaved drafts, private state clears with session changes. No price, stock or SKU publication is inferred. There is no SKU publication endpoint yet; the editor states that limitation.

Validation: 7 new API contract tests, 6 new mocked browser checks, 16 existing admin/catalog browser checks and 33 backend option/mapping tests passed. Persian mobile screenshot inspected, frontend lint/type checking passed. Final full frontend suite passed 121 checks. ADM-06 remains partial: SKU publication/code editor and complete matrix/media acceptance remain outstanding. Broader milestones and RFP AC-01–22 are not complete.

Local web production build succeeded and only the web service was refreshed. Six option/mapping browser checks passed against localhost:8080, including the /variants alias. Readiness returns 200; unauthenticated private options return 401/no-store; all eight local services are healthy. No business records or published SKU state were changed by this continuation.


### 2026-10-13 — Draft SKU code editing

Product options editor now exposes versioned draft SKU code edits through the existing protected authoring endpoint. Published SKU codes remain locked. Duplicate codes preserve input and allow correction; unknown/conflicting writes require reload. Unsaved code changes are guarded and cannot be mixed with option/mapping writes. After an acknowledged rename, mapping state is reread from the server; mapping read failure does not turn a confirmed code save into a false failure. Price and inventory are unchanged. SKU publication still needs implementation.

Validation: 8 option API client tests, 7 option/mapping browser checks and 16 backend SKU authoring tests passed; lint and types passed. No business records were edited by the browser fixtures.


## Notebook and bundle photography — 2026-10-13

Downloaded four licensed Pexels notebook/stationery photographs and stored optimized JPEGs locally under `Frontend/public/sample-stationery` (about 510 KB combined). Source/photographer credits and the Pexels license are in CREDITS.md. Explicit associations cover the four local notebook slugs and three local bundle slugs. Images appear in home/shop/collection cards and detail galleries; notebook gallery captions identify sample photos rather than claiming exact front/back product views. Stock photos are visibly labeled as samples, not actual NilArt product photos or exact bundle compositions. Unknown products retain missing-media handling. Original sticker/bookmark illustrations and bundle component views remain.

The shared reference media components and layouts are retained; presentation CSS is additive and approved reference CSS is unchanged. No database, price, stock, API or purchasing changes.

Local checks: 122 frontend tests, frontend lint/type check, five browser checks across notebook/bundle routes and mobile rendering, web Docker build and service health passed. Remote CI is reported separately.

Final code-edit continuation checks: full frontend suite 123 passed; all seven option/mapping browser checks passed on the refreshed localhost:8080 production build; production types/build and lint passed; all eight local services healthy. Only the web service was refreshed.


### 2026-10-13 — Reviewed SKU publication

Added explicit versioned SKU publication/unpublication with required reason, session/Origin/CSRF/permission checks, published-parent/current-mapping validation, product-before-SKU locks and transactional audits. Added a public reviewed snapshot endpoint that remains stable after draft edits and hides unpublished SKUs/products. No stock/prices/business records are inferred or changed. Admin editor uses a separate confirmation dialog and protects unknown/conflicting writes. No migration is added. Legacy unmapped fixtures retain their existing state and return 404 on the new snapshot endpoint.

Focused backend SKU/option/publication checks: 41 passed, including publication concurrency and audit rollback. Full frontend suite: 130 passed; eight option/mapping browser checks passed; lint/types and generated API checks passed. Dedicated SKU audit-history UI and public presentation integration remain partial, along with broader admin milestones.

Final reviewed-publication verification: full isolated backend suite 325 passed (no skips), frontend suite 130 passed, backend ruff/mypy and frontend lint/types passed, API client regenerated, API/web production builds succeeded. Existing local migration head remains 0023; no migration/business data was changed by this slice. All eight services are healthy, readiness is 200, unauthenticated publication is 401/no-store and unknown public snapshots are 404.


### 2026-10-13 — SKU authoring history

Added protected paginated SKU authoring history and bilingual admin before/after comparisons with actor, reason and Tehran timestamps. Older audit snapshots that omit mapping are labelled as not recorded rather than claiming removal. History has independent retry/loading state and clears on SKU selection, acknowledged mutations and session changes. Refreshed SKU metadata also updates the product list to avoid stale visibility labels. Price audits remain separate. No migrations/business records changed.

Checks: 11 focused backend publication/history tests passed, full frontend suite 136 passed, nine option/mapping browser checks passed (history includes mobile, retry and pagination), backend ruff/mypy and frontend lint/types passed. A missing `dict[str, int]` annotation in concurrent order-request code was fixed to restore the shared type check. Public variant presentation, media/matrix acceptance and wider admin workflows remain required.

Final SKU-history verification: 42 focused backend SKU/publication/mapping tests passed; 136 frontend tests passed; all nine option/mapping/history browser checks passed on the refreshed localhost:8080 build. API/web builds passed, all eight services healthy, readiness 200 and unauthenticated audit access 401/no-store after service-name resolution settled. Only API/web services refreshed; no migrations or real business records were modified.


### 2026-10-13 — SKU price history

Connected the existing protected price audit endpoint to the bilingual admin price editor. History preserves exact decimal strings/currencies, shows unpriced/removal states, actor and Tehran timestamps, supports retry and exclusive pagination, validates SKU/product identity and clears on selection/version/session changes. It does not convert currencies or change stock. No new backend contracts, migrations or business writes.

Seven backend price-audit checks passed; two client history checks cover session clearing and pagination/retry; admin browser coverage verifies decimal/currency/removal history on mobile. Public variant presentation and broader administration remain unfinished.

Final price-history checks: 7 existing backend price-audit tests, 2 new client history tests and 13 admin browser checks passed. The price-history browser check also passed on the refreshed localhost:8080 production build. Web build/types and lint passed; all eight local services healthy. Only web was refreshed; no business records or migrations were modified.


### 2026-10-13 — Admin catalog search

Connected the existing private catalog `q` filter for collections/categories/products. Explicit submit resets pagination, preserves publication filtering and protects unsaved SKU/price input. Clear search restores the full managed list. Bundle/artwork lists retain their accurately labelled current-page filter. A failed catalog load no longer displays a false empty-state confirmation. No backend writes or migrations added.

Final catalog-search validation: 27 backend catalog management tests and 14 admin browser checks passed; search also passed on the refreshed localhost:8080 production build. Frontend lint/type checking and web build passed; all eight services healthy. Only web refreshed, without business writes or migrations.


### 2026-10-13 — Admin support inbox

Connected `/fa/admin/support` and `/en/admin/support` using the supplied AdminDashboard shell. Support staff can page through tickets, open chronological conversations and record versioned replies with fresh CSRF. Added protected ticket and paginated message reads, including ticket-scoped request-ID receipt lookup. An uncertain write requires explicit reload: an existing receipt confirms success; an absent receipt allows retrying the same locked payload and identifier. Conflicts retain drafts; closed tickets disable replies. Unsaved edits are guarded and private state clears with session changes. Fixed cancelled request cleanup under React development effect replay.

Attachments, assignment/priority, admin closure controls and broader workflow acceptance remain outstanding. ORDER-06 is connected_partial, not accepted. Browser checks use intercepted fixtures; backend checks exercise an isolated PostgreSQL schema. No real customer replies were sent by verification.

Final support verification: 10 backend customer/support PostgreSQL checks and all 7 support browser checks passed, with the browser checks repeated against the refreshed localhost:8080 production build. Frontend lint/type checking, backend ruff/mypy, generated API client and API/web production builds passed. All eight local services healthy; readiness 200 and unauthenticated ticket/conversation reads 401/no-store. Only API/web refreshed; this slice added no migration or real business writes. Concurrent customer/order/file work remains in the shared checkout.


### 2026-10-14 — Staff support ticket closure and reopening

Added protected `PUT /api/v1/admin/customer/tickets/{id}/state`: `support.manage`, fresh session/CSRF/Origin, strict optimistic version, row lock, required trimmed internal reason (1–1000 characters), audited before/after/version and transactional outbox. Staff can close an open ticket or reopen a closed ticket as submitted; redundant transitions fail. The bilingual inbox exposes explicit confirm controls, guards unsaved reasons and prevents mixing a draft reply with a status change. Unknown/conflicting status writes lock further actions until a read reload; reload clears the old intent and shows current status without automatically retrying or reversing it. Reasons remain internal and do not create customer messages.

ORDER-06 remains connected_partial. Attachments, assignment/priority and broader workflow acceptance remain outstanding. Verification uses isolated backend records and intercepted browser fixtures; no real support messages or ticket states were changed.

Final closure/reopening verification: 11 backend customer/support PostgreSQL checks and all 10 support browser checks passed; browser checks repeated on the refreshed localhost:8080 production build. Lint/types, backend ruff/mypy, regenerated OpenAPI client and API/web builds passed. All eight services healthy, readiness 200, unauthenticated state write 401/no-store. This slice added no migration and changed no real business records. Concurrent commission/order/download work remains in the shared checkout.


## Authentication phone selector spacing — 2026-10-14

Added scoped authentication phone layout styles so the shared country dropdown has its own fixed flex area and divider, while the national phone input takes only the remaining width. Nested dropdown inputs no longer compete with the phone input's width. Applies to registration/OTP and password phone groups; approved auth.css is unchanged.

Frontend lint/types and web Docker build passed. Browser regression passed for Persian/English at 979, 390 and 320 pixel widths, including non-overlap, country-menu keyboard dismissal, retained phone input and no horizontal overflow. No backend or phone-validation changes. Remote CI reported separately.


### 2026-10-14 — Support inbox status filtering

Added validated status filtering to the protected support list before cursor pagination. The bilingual dropdown covers all/submitted/awaiting reply/awaiting customer/closed. Changing views resets pagination and the selected conversation, with explicit unsaved-change protection; status-changing saves remove tickets that no longer match the view. Empty states describe the selected status and failed reads remain errors. No migration or real business write added. ORDER-06 remains connected_partial; assignment, priorities and attachments remain outstanding.

Shop and current cats-bundle page were also checked at 390px: neither has horizontal overflow. The preceding shop filter placement is retained.

Final status-filter verification: 13 current backend customer/support PostgreSQL tests and all 11 support browser checks passed. The new guarded filter check also passed on the refreshed localhost:8080 production build. Lint/types, backend ruff/mypy, generated API client and API/web builds passed. All eight services healthy; readiness 200 and unauthenticated filtered inbox 401/no-store. Only API/web refreshed, with no migration or real business write in this slice.


## Opt-in development OTP display — 2026-10-14

Added `NILART_DEV_MODE` and `NILART_FAKE_SMS` (both false in .env.example). Fake SMS enables the existing sandbox provider; the existing SMS_MODE=sandbox remains supported. Enabled both flags in the ignored local .env. API request responses include development_code only when development mode, development environment and sandbox SMS all hold. The per-request wrapper captures only a successfully delivered code; failures do not expose a code. Responses remain no-store; no code is written to logs, audit or browser persistence. Production rejects development/fake-SMS configuration.

Verification pages display the server-provided sandbox code in Persian/English, remove it after success/expiry, and refresh it from a new request/resend. An already-open pre-change flow needs a new request/resend. OpenAPI/client contracts updated. No OTP verification bypass was added.

Local verification: 8 backend tests including isolated PostgreSQL verification/gating and SMS failure, focused backend lint/types, 178 frontend tests, frontend lint/types, browser display/disabled-state regression, API/web Docker builds and eight healthy services passed. Remote CI reported separately.


### 2026-10-14 — Staff support action history

Added protected ticket-scoped `GET /api/v1/admin/customer/tickets/{id}/audits`, with descending timestamp/ID cursor pagination and support.manage permission. Only staff reply/status audit actions for the ticket's owner and record ID are returned. The bilingual conversation shows action, actor, Tehran timestamp, internal reason and recorded before/after/version values. History is read on demand, supports retry/older pages, clears on ticket/version changes and clears private reasons on session changes. Unrecorded values are labelled rather than inferred. No migration or real business write added; ORDER-06 remains connected_partial.

Final staff-history verification: 14 backend customer/support PostgreSQL tests, all 12 support browser checks and the new private-cache history unit check passed. The history retry/pagination/version-reset browser check also passed on the refreshed localhost:8080 production build. Lint/types, backend ruff/mypy, generated OpenAPI client and API/web builds passed. All eight services healthy; readiness 200 and unauthenticated history 401/no-store. No migration or real business record changed in this slice. Concurrent workspace changes remain preserved.


### 2026-10-14 — Support subject search

Protected support list now accepts a bounded `q` subject search, applied with status and cursor before pagination. LIKE metacharacters are escaped so `%` and `_` search literally; Persian text is supported. The bilingual form submits explicitly, resets pagination, preserves the active status, supports clear search, guards unsaved reply/reason input when changing views, and clears private search state when the session changes. Empty states distinguish search/status matches; failed reads remain errors. No migration or real business write added. ORDER-06 and the wider admin panel remain partially implemented.

Final subject-search verification: 15 backend customer/support PostgreSQL tests and all 13 support browser checks passed. The new search/pagination/status/draft-guard check also passed on refreshed localhost:8080. Frontend lint/types, backend ruff/mypy, generated API client and API/web production builds passed. All eight services healthy; readiness 200 and unauthenticated subject search 401/no-store. Only API/web refreshed, without migrations or real business writes in this slice. Concurrent workspace work remains preserved.


### 2026-10-14 — Support conversation reference alignment

Applied the supplied SupportConversationPage message structure and existing support-conversation.css to live admin support: ordered conversation, distinct customer/support cards, sender avatars/icons, semantic timestamps and automatic text direction. Ticket statuses use the AdminDashboard reference badge styles. Subject-search input now uses visible theme control borders/spacing. Business reply/status/history behavior remains unchanged; no backend contract or migration added.

Validation uncovered shared basket/order syntax/import/type errors. Missing expression/tag delimiters, the bundle AddToBasket import, an unsupported ESLint directive and unsupported testing-library exact options were minimally corrected without changing the intended workflows. All 13 support browser checks and 11 order unit checks passed; lint/types and web production build passed. Wider admin features remain incomplete.

Final reference-layout verification: reply persistence and Persian mobile browser checks passed on localhost:8080 after the successful web build. Visual inspection confirms reference message cards, status badges and visible search control without horizontal overflow. All eight local services healthy. No real business writes or migrations in this slice.


### 2026-10-14 — Artist account administration

Connected `/fa/admin/artists` and `/en/admin/artists` to the reference AdminDashboard shell and existing account access editor. Protected account listing now supports a validated role filter before cursor pagination. The artist directory requires identity.manage, as do its access/restriction writes; commissions.manage alone does not expose identity data. Existing reason, version, CSRF, audit and unsaved-change controls are reused. Removing the artist role removes that row from the directory after acknowledgement. Artist role assignment remains available through Users; commission assignment, artist profiles and settlements remain unfinished. ADM-14 is connected_partial, not accepted. No migration or real business writes added.

Final artist-account verification: all 10 identity management PostgreSQL tests and both artist browser checks passed. Browser checks repeated on refreshed localhost:8080, including 390px layout, audited role removal with fresh CSRF and denial before identity reads for commission-only access. Lint/types, backend ruff/mypy, regenerated API client and API/web builds passed. All eight services healthy; readiness 200 and unauthenticated artist directory 401/no-store. No migration or real business records changed in this slice. Concurrent workspace changes preserved.


### 2026-10-14 — Admin user/artist phone search

Protected account listing now accepts bounded full/partial phone search before role filtering/cursor pagination. Persian/Arabic digits and formatted/local Iranian numbers are normalized; malformed terms return a specific validation error. Users, Roles and Artists share explicit search/clear controls in the reference shell. Search preserves artist scope, resets pagination, guards unsaved access changes and clears private search state with session changes. Starting a new read clears the selected editor so its response cannot discard newly typed access edits. Failed reads do not produce a false empty-state confirmation. No migration or real business writes added; broader admin work remains unfinished.

Final account-search verification: 11 identity management PostgreSQL tests and all 3 artist-directory browser checks passed, with browser checks repeated against refreshed localhost:8080. Tests cover number normalization, invalid input, artist scope, explicit search/clear, draft protection and access denial. Lint/types, backend ruff/mypy, regenerated client and API/web builds passed. All eight services healthy; readiness 200 and unauthenticated directory search 401/no-store. No migration or real business records changed in this slice.


### 2026-10-14 — User directory role filtering

Connected the existing protected role query to the bilingual Users/Roles directory using the reference dropdown and theme controls. Role changes combine with the applied phone search, reset cursor pagination, guard unsaved access changes and clear with private session state. Artists retain their fixed artist-only scope. After acknowledged access changes, accounts that no longer match the current role leave the directory. Search/clear action spacing uses reference tokens. No backend contract, migration or real business writes added; wider admin workflows remain incomplete.

Final role-filter verification: all 4 account/artist directory browser checks passed, with the new role/phone/draft-guard check repeated against refreshed localhost:8080. Frontend lint and types and web production build passed. The initial shared customer-attachment lint errors were resolved before final validation. All eight services healthy. Only web refreshed; no backend contracts, migrations or real business records changed in this slice.


### 2026-10-14 — Account restriction filtering

Added protected boolean restriction filtering before account-list pagination. Users and Artists expose the reference dropdown for all/active/restricted, combined with role and phone search. View changes guard unsaved edits; acknowledged restriction changes remove rows that no longer match. No migration or real business write added. A shared attachment count query was minimally switched from scalar() to scalar_one(): COUNT always returns one row, resolving its optional-value type error without changing the limit.

Final account-status verification: all 12 identity PostgreSQL tests and all 5 account/artist browser checks passed. The status/role/phone combination check also passed on refreshed localhost:8080. Frontend lint/types, backend ruff/mypy, regenerated API client and API/web builds passed. All eight services healthy; readiness 200 and unauthenticated filtered directory 401/no-store. No migration or real business records changed in this slice; concurrent workspace work preserved.


### 2026-10-14 — Stored order administration

Connected protected cross-customer admin order listing and details with orders.read_all. Server search covers reference, bilingual item title and SKU, combined with payment/fulfillment filters and descending timestamp/UUID cursor pagination. The reference AdminDashboard shell/table/panels show saved order status, Tehran timestamps, exact decimal/currency amounts and persistent detail URLs. Details include recipient/address, items/options/quantities/discounts, shipping/tax/total, recorded refund and receipt number. Read-only: no fulfillment, shipping, payment or refund writes or fake orders are created. Private data clears with the session and late responses are discarded. ORDER-01/02 are connected_partial; operational write workflows and full visual/state acceptance remain unfinished. No migration or real business writes added.

Final stored-order verification: all 9 customer/admin order PostgreSQL tests and all 4 admin order browser checks passed. Browser checks repeated against refreshed localhost:8080, covering exact amounts, stored detail reloads, search/status filters, denial before reads and Persian mobile layout. Frontend lint/types, backend ruff/mypy, regenerated API client and API/web builds passed. All eight services healthy; readiness 200 and unauthenticated list/detail 401/no-store. No migration or real business writes added. Concurrent workspace changes preserved.


### 2026-10-14 — Admin saved receipt viewing and printing

Added persistent `/admin/orders/{id}/receipt` views behind orders.read_all, using the existing protected order snapshot. Receipt number, timezone-validated issue timestamp and exact paid amount are shown alongside the saved order amounts/items. No receipt is invented when absent, and no payment action is performed. The print stylesheet removes admin navigation and action controls only for the receipt view, leaving other pages' printing unchanged. Session/request read guards and cache clearing remain in place. No backend contract, migration or real business write added; wider admin workflows remain incomplete.

Final saved-receipt verification: all 6 admin-order browser checks passed; both receipt/print/missing-state checks repeated on refreshed localhost:8080. Frontend lint/types and web production build passed. Print layout inspected; navigation/actions are removed and saved values remain visible. All eight services healthy. Only web refreshed; no backend contract, migration, payment action or real business write added.


### 2026-10-14 — Admin commission queue search and statuses

Replaced the loaded-page commission filter with protected server-wide search across request ID and brief text, plus validated commission status filtering before cursor pagination. The reference dropdown/search controls submit explicitly, preserve current status when clearing search, reset pagination and clear private query state with the session. Queue view changes guard unpublished drafts; confirmed discards clear selected preview/terms/note state. Acknowledged publication/status changes remove rows that no longer match the current status. Existing private PNG publication and uncertain-write recovery remain unchanged. Customer review history now displays the same note in multiple locations, so its publication browser assertion was scoped to the history region. No migration or real business writes added; artist assignment, final-file/payment workflows and wider administration remain unfinished.

Final commission-queue verification: all 10 commission PostgreSQL tests, 7 focused publication client tests and 5 publishing/queue browser checks passed. All 5 browser checks repeated on refreshed localhost:8080. Frontend lint/types, backend ruff/mypy, regenerated API client and API/web builds passed. All eight services healthy; readiness 200 and unauthenticated filtered commission queue 401/no-store. No migration or real customer publication/business writes added in this slice. Concurrent workspace work preserved.


### 2026-10-14 — Admin cancellation and return queue filters

Connected server-wide reason/request ID/order ID/order reference search and validated request status/type filters before UUID cursor pagination. The reference dropdowns and explicit Search/Clear controls reset pagination and guard unsaved customer replies before changing the queue. Clearing search preserves status/type; session clearing removes private search/filter state. Existing versioned staff decisions, read-only access and uncertain-write recovery remain unchanged. No migration or real business write added; refunds, fulfillment and return inspection remain unfinished.

Verification: 5 isolated PostgreSQL request-review tests (including filtered cursor pagination, reference/ID search, literal percent and invalid filters), 7 focused client tests and 5 browser checks passed. Browser checks cover combined server filters, discarded/kept reply drafts, lost-response recovery, read-only access and Persian mobile layout. Frontend lint/types, backend ruff/mypy and API client generation passed.

Local verification: API/web builds passed and the refreshed localhost:8080 passed all 5 request-review browser checks again. Readiness returned 200; unauthenticated filtered requests returned 401 with no-store. Seven services are healthy. The concurrently changed local MinIO container is restarting because its configured user cannot write its existing volume; this slice did not change storage configuration or data. File-related runtime availability needs follow-up. No migration or real order decisions/refunds were performed.


### 2026-10-14 — Admin order-request decision history

Added protected GET /api/v1/admin/order-requests/{id}/reviews, requiring orders.read_all. Returns only the selected request's recorded decisions, staff actor ID, timestamp, reply and expected version, newest version first. Cursor lookup is scoped to the same request; missing requests/cursors return 404. This is read-only and adds no migration. The reference admin detail panel shows bilingual decision history, Tehran timestamps, version transitions, manual loading/retry, empty/error states and older-page loading. Private history clears on session changes, late responses are ignored, and selected request/version changes reset history after acknowledged writes or reconciliation. No real order decisions, refund, fulfillment or return inspection were performed.

Verification: all 6 isolated PostgreSQL review tests, 9 focused client tests and 6 browser checks passed. Tests cover cross-request cursor rejection, permission/session denial, chronological pagination, retries, history reset after saving, and private cache/late-response clearing. Frontend lint/types, backend ruff/mypy and API client regeneration passed. Wider admin workflows remain incomplete.

Final local decision-history verification: API/web production builds passed; all 6 review browser checks repeated successfully on refreshed localhost:8080. Readiness returned 200 and unauthenticated history returned 401/no-store. Fixed the observed MinIO startup failure by setting ownership of the existing nilart_minio_data volume to its configured UID/GID 10001, then restarting only MinIO; existing file contents were preserved and no storage configuration was changed. Runtime health checked after restart. No application migration or real order/refund write performed.


### 2026-10-14 — Protected admin Activity log

Connected the reference System → Activity log at /admin/activity, with /admin/audit as an alias. New GET /api/v1/admin/identity/audits requires identity.manage, consistent with existing private account audit access. Read-only overview projects action, internal reason, actor/account IDs and timestamp; detailed changes remain in scoped pages. Literal server search across action/reason and optional validated account UUID filter apply before timestamp/UUID cursor pagination. Cursors must match the current filters. Reference shell/table and bilingual explicit Search/Clear/Reload controls provide private-cache clearing, stale-response guards, Tehran timestamps, older entries, loading/error/empty states and read retries. Fixed development strict-effect cleanup so the initial read can restart safely. ORDER-07 is connected_partial; catalog/price histories remain in their scoped pages and comprehensive cross-domain aggregation is unfinished. No migration or real business writes added.

Verification: 13 isolated PostgreSQL identity management tests, 2 client privacy tests and 4 activity browser checks passed. Coverage includes permissions/revocation, filtered cursor ordering, invalid account IDs, literal wildcard search, session and late-response clearing, server search/pagination, retries and Persian mobile layout. A concurrent registration test used an unsupported Testing Library role option; removed that option while preserving its exact string name assertion.

Final Activity log verification: frontend lint/typecheck, backend ruff/mypy, regenerated API client and API/web production builds passed. Both privacy tests and all 3 concurrent registration transition tests passed. All 4 Activity log browser checks repeated successfully on refreshed localhost:8080. All eight services healthy; readiness 200 and unauthenticated global audit feed 401/no-store. No migration or real business write was performed; concurrent workspace changes preserved.


### 2026-10-14 — Live admin order overview

Added read-only GET /api/v1/admin/order-summary behind orders.read_all. A single SQL statement counts all persisted orders by payment/fulfillment state and submitted/in_review cancellation/return requests. Approved/rejected/completed requests are excluded from the awaiting-review count. Response contains aggregate counts only, without customer IDs, addresses or monetary aggregation. The reference dashboard now presents bilingual order overview panels and links to orders/request review, with explicit refresh, read retries, empty/error/loading states and session/stale-response clearing. Staff without order access never fetch or see the panel. Updated the stale dashboard integration notice to reflect connected orders. No migration or real order/refund/fulfillment writes added. ADM-01 remains connected_partial; inventory, costing and finance metrics remain unfinished.

Verification: 10 customer/admin order PostgreSQL tests and 7 review PostgreSQL tests passed, including empty/persisted counts, access denial and request transition counts. All 18 admin shell/summary browser checks passed, including Persian mobile, unauthorized read avoidance, refresh/retry and explicit zero results.

Final order-overview verification: both client session/privacy tests, frontend lint/typecheck, backend ruff/mypy, regenerated API client and API/web production builds passed. After transient nginx 502 responses immediately following container replacement settled, all 4 summary browser checks passed on localhost:8080. All eight services healthy; readiness returned 200 and unauthenticated order summary 401/no-store. No migration or real order/refund/fulfillment write added. Concurrent workspace changes preserved.


### 2026-10-14 — Live support dashboard overview

Connected GET /api/v1/admin/customer/ticket-summary behind support.manage, aggregating recorded tickets by status in one database statement. The response exposes counts only; addresses, messages and other customer records are excluded. The reference dashboard displays total tickets and submitted/awaiting_reply/awaiting_customer/closed counts, explicit zero results, refresh/retry/error/loading states and an inbox link. Staff without support access never fetch or see the panel. Aggregate cache clears on session changes and late responses are discarded. No migration, ticket reply/status changes or real business writes added. ADM-01 remains connected_partial; inventory/costing/finance metrics remain unfinished.

Verification: 18 customer/support PostgreSQL tests, 2 summary privacy tests and 4 browser checks passed. Coverage includes permission/session denial, status totals and non-ticket exclusion, private cache/late-response clearing, inbox navigation, read retry, empty results and Persian mobile layout. API client regenerated; frontend lint/types and backend ruff/mypy passed.

Final support-overview verification: API/web production builds passed and all 4 dashboard support browser checks repeated successfully on refreshed localhost:8080. All eight services healthy; readiness 200 and unauthenticated ticket summary 401/no-store. All 18 customer/support PostgreSQL tests and both privacy tests passed. No migration, real ticket reply/status changes or business writes performed; concurrent workspace changes preserved.


### 2026-10-14 — Live commission dashboard overview

Added GET /api/v1/admin/commissions/overview/summary behind commissions.manage, counting persisted commission statuses in one statement. Aggregate response contains no brief, account IDs, private artwork or agreement details. The reference admin dashboard now displays total commissions and awaiting_review/in_progress/awaiting_customer/revision_requested/approved/cancelled counts, an explicit queue link, refresh/retry and zero/error/loading states. Staff without commission management access never fetch or see the overview. Private counts clear with the session and late reads are discarded. No migration or real commission publication/status/business writes added. ADM-01 remains connected_partial; artist assignment, final-file/payment and wider operational workflows remain unfinished.

Verification: 11 isolated commission PostgreSQL tests, 2 client privacy tests and 4 dashboard browser checks passed, covering actual persisted status changes, private projection, empty and permission/session-denied reads, session clearing/late responses, queue navigation, retry/zero state and Persian mobile layout. Frontend lint/types, backend ruff/mypy and regenerated API client passed.

Final commission-overview verification: API/web production builds passed and all 4 commission dashboard browser checks repeated successfully on refreshed localhost:8080. All eight services healthy; readiness 200 and unauthenticated summary 401/no-store. No migration or real commission publication/status/business write performed; concurrent workspace changes preserved.


### 2026-10-14 — Activity log staff actor filter

Extended the protected identity.manage activity feed with optional actor_id UUID filtering combined with account ID and literal action/reason search before pagination. Cursor validation respects the actor scope. The reference Activity log editor now has bilingual Actor ID validation, explicit Search, combined filter pagination, Clear filters and session clearing. No migration or business writes added. Global audit aggregation and broader admin operations remain unfinished.

Verification: all 14 isolated identity PostgreSQL tests, 2 private cache/late-response client tests and 4 Activity log browser checks passed. Tests cover combined actor/account/search filters, mismatched cursor denial, invalid/empty actor results, form validation, server query parameters, cleared actor filters, unauthorized access and Persian mobile. Frontend lint/types, backend ruff/mypy and regenerated API client passed.

Final actor-filter verification: API/web production builds passed and all 4 Activity log browser checks repeated successfully on refreshed localhost:8080. All eight services healthy; readiness 200 and unauthenticated actor-filtered activity feed 401/no-store. No migration or business write performed; concurrent workspace changes preserved.


### 2026-10-17 — Saved order context in admin request review

Added an explicitly loaded order-context section to cancellation/return request review using existing orders.read_all-protected admin order details. It resolves immutable item titles, SKU/options, ordered and delivered quantities, delivery type and returnability recorded at purchase. Return reviews show requested quantities separately and include only requested lines; cancellation reviews show all order lines. Mismatched request/order IDs or unknown requested line IDs fail closed. Includes read retry, private session clearing, late-response guards, reset by request/version and a saved-order link behind the existing unsaved-reply navigation guard. Reference admin panels/tables extend the order review/details pattern. No backend contract, migration or real decision/refund/inspection writes added; actual return inspection and operational fulfillment/refunds remain unfinished.

Verification: 10 client review/context tests and 7 review browser checks passed. Checks cover mismatched lines, private session/late-response clearing, saved item identity, requested versus delivered/ordered quantities, failed-read retry and unsaved reply protection. Frontend lint passed. A typecheck briefly observed concurrent customer-page edits; a fresh typecheck passed without editing those files.

Final saved-order-context verification: web production build passed and all 7 review browser checks passed on localhost:8080, including mobile overflow with the loaded context. All 11 focused client tests passed, including exclusion of unrequested order lines. All eight services healthy and readiness 200. Build also required a minimal type guard for an unknown notification fixture payload in customer-feature-audit.spec.ts; no customer product behavior changed. Own changed-file whitespace checks passed; unrelated concurrent AddressFields whitespace was preserved. No API contract, migration or real decision/refund/inspection write added.


### 2026-10-17 — Persistent admin request review URLs

Connected /admin/order-requests/{id} as an orders.read_all-protected persistent detail route. Queue review actions navigate to stored request URLs; direct loads/reloads fetch only that request. Detail views retain read-only access messaging, explicit request-read retry and no fabricated detail on failures, plus guarded Back to requests navigation. Queue filters stay on the queue route; unsaved-reply view-change coverage now verifies guarded navigation back to that route. Existing decision writes, idempotency, uncertain-write recovery, saved order context and decision history are unchanged. No API contract, migration or real business writes added. Return inspection, refunds and fulfillment actions remain unfinished.

Verification includes client review/context tests, browser direct reloads, failed-read retry, direct-link denial before private reads, accepting/declining draft discard, existing recovery and Persian mobile coverage. Full production verification recorded below when complete.

Final persistent-review verification: all 11 client review/context tests and 10 browser checks passed; all 10 browser checks repeated on refreshed localhost:8080. Frontend lint/types and web production build passed. All eight services healthy; readiness 200. Changed-file whitespace checks passed. Web refreshed; no API contract, database migration or real decision/refund/inspection write performed. Concurrent workspace work preserved.


### 2026-10-17 — Activity log Tehran date ranges

Added optional date_from/date_to to the identity.manage activity feed. Both dates are inclusive calendar days in Asia/Tehran, combined with actor/account/reason filters before timestamp/UUID pagination; cursor lookup uses the same scope. Invalid or reversed ranges return 422. Reference native date controls submit explicitly, validate reversed ranges, retain the applied dates for older-page/reload reads and clear them with filters or the session. No migration or business writes added; broader administration remains unfinished.

Verification: all 15 isolated identity PostgreSQL tests, 2 client privacy tests and 5 Activity log browser checks passed. Tests cover Tehran midnight boundaries, inclusive day ends, invalid ranges/dates, mismatched-date cursors, combined actor/date pagination, date input clearing, access denial and Persian mobile layout. Frontend lint/types, backend ruff/mypy and API client generation passed.

Final date-filter verification: API/web production builds passed; all 5 Activity log browser checks repeated successfully on refreshed localhost:8080. All eight services healthy; readiness 200 after transient proxy refresh settled, and unauthenticated date-filtered feed 401/no-store. Changed-file whitespace checks passed. No migration or business write performed; concurrent workspace changes preserved.


### 2026-10-17 — Requests linked from saved order details

Extended the orders.read_all request queue with optional validated order_id filtering before cursor pagination, combined with existing query/status/type filters. Saved order details now explicitly load that order's cancellation/return requests with status, reason, Tehran timestamp and persistent review links. Supports pagination, reload/retry, true empty/error/loading states, private session clearing and stale-response guards. Client rejects cross-order responses. Request controls are excluded from saved receipts; receipt detection also accepts a trailing slash. Reference admin panels/detail links are reused. No migration or real order decisions/refund/fulfillment/inspection writes added.

Verification: 7 isolated request-review PostgreSQL tests, 3 request-list privacy/scope client tests and 8 order-page browser checks passed. Includes combined order filters, cross-order empty results, invalid IDs, private cache/late-response clearing, retry/pagination query scope, direct review navigation, receipt isolation and existing Persian mobile checks. Frontend lint/types, backend ruff/mypy and API client generation passed.

Final order-linked-request verification: API/web production builds passed; all 8 order-page browser checks passed again on localhost:8080. All eight services healthy and readiness 200 after concurrent web replacement settled. Unauthenticated order-scoped request list returned 401/no-store. No migration or real order decision/refund/fulfillment/inspection write added; concurrent workspace changes preserved.


### 2026-10-17 — Exact action filtering for staff activity

Added optional bounded exact action filtering to the identity.manage activity feed, composed with account/actor/date/reason scopes before pagination and cursor lookup. A reason mentioning an action code does not count as that action. The reference shared dropdown offers common access/security/support/order actions; All actions retains the full feed. Selection applies explicitly through Search, persists for older-page/reload reads and clears with filters or the session. Used a non-label container around the shared dropdown so native label activation does not reopen the menu after selection. No migration or business writes added; operational admin gaps remain unfinished.

Verification: 16 isolated identity PostgreSQL tests, 2 private cache/late-response client tests and 6 Activity log browser checks passed. Covers exact-action exclusion of reason-only matches, combined scopes, pagination, mismatched-action cursor denial, empty/invalid actions, explicit apply, filter clearing, access denial and Persian mobile. Backend ruff/mypy and API client generation passed.

Final exact-action verification: frontend lint/types, API/web production builds and all 6 Activity log browser checks passed on refreshed localhost:8080. All eight services healthy; readiness 200 and unauthenticated action-filtered feed 401/no-store. Changed-file whitespace checks passed. No migration or business write performed; concurrent workspace changes preserved.


## 2026-10-17 — Materials and service rates

Connected `/fa/admin/materials` and `/fa/admin/service-rates` (and English equivalents) with protected, versioned resource editing, explicit purchase/consumption conversion, exact nullable rates/currencies/validity, deliberate zero acknowledgement, archival, server filters/pagination and immutable history. Stable revision receipts support lost-response recovery; stale edits retain inputs and require review of the current version. Saved-resource consumption previews report missing data instead of inventing totals. Migration 0029 adds resource/version tables without business seeds. The worker validates and deduplicates the new save event; it does not move stock or publish prices.

Validation: 21 isolated PostgreSQL costing tests, 19 outbox tests, 7 frontend unit/component tests and 13 intercepted browser checks passed; backend lint/type checking and frontend lint/type checking passed. See `docs/costing-foundation.md` for contracts and limitations. COST-01/02/03 remain connected_partial: BOM/SKU costing, cutting yield, procurement, inventory, production, finance and the other remaining admin workflows are not complete.

Production verification: API/web/worker images rebuilt successfully; additive migration 0029 applied to the local database. All eight services healthy. All 13 costing browser checks passed again through localhost:8080 using intercepted fixtures (no business records created). Unauthenticated list/detail/estimate requests return 401 with no-store. New local routes: /fa/admin/materials and /fa/admin/service-rates.


## 2026-10-18 — SKU recipes, manufacturing estimates and dependency review

Connected bilingual `/admin/recipes` library/editor and `/admin/costing` entry point, with real SKU lookup, stable drafts, immutable recipe/resource snapshots, explicit quantities/bases/conversions, confirmed cutting yield and waste, validity/archive and history. Exact rational batch/unit costing requires explicit output/date/rounding and blocks incomplete or stale data. `/admin/price-review` derives changed/expired/archived/unknown resource dependencies before pagination. Reviewing new rates preserves quantities only when units/conversions and cutting dimensions allow it; changed cutting dimensions require renewed approval. Version conflicts retain inputs and require comparison, unknown saves retain an exact retry intent, private caches clear on session changes. Migration 0030 is additive and seeds no business records. See `docs/sku-recipes.md` for API contracts and unfinished scope.

Validation: 19 isolated PostgreSQL recipe tests, 19 outbox tests, 21 material regression tests; 7 recipe frontend tests (plus material/support regressions); 16 intercepted recipe browser workflows. Targeted lint/type checks passed. COST-04/05/06/07/09 remain connected_partial: family templates/overrides, geometric cutting, price proposals, inventory/procurement/production/finance and other unfinished admin workflows are still outstanding.


Local deployment verification (2026-10-18): additive migration 0030 applied; API, web and worker updated; all eight services healthy. Frontend production build passed. Container package download failed due to DNS; the API/worker source update used an existing local runtime after verifying every installed package against requirements.lock (zero mismatches). Standard Dockerfiles and dependency requirements were preserved. Protected recipe/SKU/review endpoints return unauthenticated 401 with no-store; Persian recipes/costing/review routes return 200. No business records were seeded or written by browser checks.


## 2026-10-18 — Supplier/provider directory

Connected protected bilingual `/admin/inventory/suppliers` list and stable editors using reference shell/shared dropdowns. Explicit goods/service/both type, optional contacts, localized phone digits, multi-line address/notes, archive, literal server contact search and paginated immutable history. Versioned writes require fresh permission/session/Origin/CSRF and commit supplier+revision+audit+outbox atomically. Conflicts preserve inputs and require comparison; unknown saves retain exact receipt/retry identity. Migration 0032 is additive with no supplier/balance seeds.

Verification: 17 isolated PostgreSQL checks (including concurrency, reversal, rollback and TOCTOU), 7 frontend client/privacy checks and 10 intercepted browser workflows. See `docs/supplier-directory.md`. OPS-04 remains partial because supplier financial balances, purchases, independent payments and statements are not yet implemented; other remaining admin modules remain outstanding.

Local deployment: frontend production build passed; API/worker source updated using an existing runtime after all installed dependency versions matched requirements.lock. Local database is at 0032; all eight services healthy. Supplier list/history reject unauthenticated requests with 401/no-store, and the Persian admin route returns 200. No business supplier or financial records were seeded.


## 2026-10-18 — Discount placeholder replaced with real rule management and sandbox application

Implemented `/admin/discounts` list/editor with versioned fixed/percentage rules, named product/collection/category scopes, validity/caps/quotas/mobile restrictions, stacking opt-in, usage counters, immutable history and retained conflict/unknown-save workflows. Live cart directs code entry to sandbox checkout; fresh server quotes and payment revalidation use exact rational allocation. Discount usage reserves atomically with order/payment/outbox; verified success redeems once; definitively rejected gateway creation releases; unresolved/resumable attempts retain reservations. Zero-total orders complete without a gateway call, with a prefixed zero-total sandbox receipt. Complete payment intents now bind retries, and stale/unmounted checkout responses cannot navigate. Migration 0033 preserves old snapshots and guards downgrade when zero-total rows cannot fit the prior schema. No business codes/orders were seeded.

Verification: 27 isolated discount PostgreSQL checks plus 6 payment and 19 outbox checks; 13 frontend tests; 12 intercepted browser workflows including fa mobile. Build/lint/type verification and local deployment recorded in docs/discount-management.md. ADM-09/10 remain connected_partial in the full release register: real merchant activation, stock/fulfillment and ambiguous-provider operational recovery remain separate existing prerequisites.

## 2026-10-18 — Integrated sandbox foundations and shared admin UI

Implemented versioned business settings, recorded stock/valuation adjustments and linked reversals, approved-only bilingual content, and an immutable media/print library. Added an isolated resettable nilart-demo workspace at http://127.0.0.1:18080 with separate database/storage/queues and host-isolated login cookies. Synthetic users/data are created only there. The 56-view and AC-01–22 matrix is docs/admin-release-acceptance.md; full scope/current remaining work is docs/admin-sandbox-release.md.

Redesigned live admin tables/filters/buttons using shared AdminFilters, AdminButton, AdminAction, AdminTable and AdminDataTable components. Migrated existing admin table markup and primary/secondary controls, made row actions accessible SVG icons, grouped catalogue/account/support filters, and converted price review/content/media lists into tables. Mobile action columns stay visible during horizontal scrolling. Preserved all existing guards, APIs and pending-intent semantics.

Verification: 574 backend tests passed, 340 frontend tests passed, lint/types/production build passed; 60 existing admin browser checks, 22 foundation workflows and five fa/en desktop/mobile redesign checks passed. Two real database-backed browser journeys verified synthetic settings/stock and content/media behavior in the separate demo. A stale customer-order test was updated to verify the now-separate payment/delivery badges without changing that screen.

Local deployment: private pre-migration database backup saved; additive migrations 0034–0037 applied, all eight main services healthy, new private APIs reject guests with 401/no-store. No business data seeded in the main workspace. The complete operational release is NOT finished: catalogue/media consumption, advanced costing/publication, stock reservations, purchasing/production, financial ledgers/reports, fulfillment/refunds and complete commission/artist workflows remain outstanding. Do not describe this foundation/UI release as all 56 views completed.

### 2026-10-18 — Purchasing stage

PurchasesPanel, SupplierStatement, purchases-api and Backend procurement/purchases.py plus purchase_stock.py now implement drafts, posting, partial receipts, receipt-linked supplier returns, exact command recovery, stock source traceability and purchase-only supplier liability. Migration 0038 follows 0037. Preserve existing records; generated API contracts include the new models. Purchase-generated stock movements have source_document_id/source_event_id and cannot be manually reversed. Recorded stock intents allow larger derived valuations while manual amount input bounds remain intact. Supplier purchase statements explicitly exclude payments; do not claim full supplier financial balances. Sources and remaining scope: docs/purchase-workflow.md and docs/admin-sandbox-release.md. Real isolated demo browser test is Frontend/tests/e2e/purchases-live.spec.ts; it requires explicit demo env flags and never targets main. Full integrated release remains unfinished. Next dependency stages include production/version-pinned consumption/QC and operational finance, with catalogue/pricing and downstream checkout/fulfillment work also pending.

### 2026-10-18 — Production/WIP/QC stage

Added migration 0039 and Backend contexts/production/router.py. Production drafts pin a saved effective recipe revision and target/date; start → actual issues/unused-material returns → explicit service totals → QC healthy output/normal waste/abnormal loss → finished stock. Open batch cancellation requires unused materials back or explicit WIP write-off. Material returns preserve outstanding issued cost; normal waste absorbs into output and abnormal cost is separate. Inventory source kind/document/event links prevent manual reversal bypass. The generic transaction-owned stock writer now lives in inventory/document_stock.py, with procurement/purchase_stock.py compatibility exports; existing purchase behavior is preserved. Production reads/writes require production.manage independently of inventory/pricing. UI has retained conflicts, private clearing and exact unknown-result recovery. Routes and existing inventory production/batch/QC aliases use ProductionPanel; /production/losses lists losses. Full parent-order splitting, scheduling/reservations, print consumption, labor detail and finance/reporting integration remain pending. See docs/production-workflow.md. Full integrated admin release remains unfinished.

Evidence: 606 backend tests and 347 frontend tests passed; opt-in real demo purchase-to-production browser journey and existing purchase journey pass, including dropped completion response, exact recovery/replay, stock valuation and Persian mobile. Restored-copy migration preserves inventory and purchase snapshots; backup retained. No synthetic records enter main.

## 2026-10-19 — Recorded cash and supplier allocations

Migration 0040 adds cash/bank accounts, explicit dated openings, receipts/payments, atomic transfers, categorized expenses, linked corrections and purchase-allocated partial supplier payments/refunds. Purchase receipt, liability, cash movement and revenue remain distinct; returns after payment create supplier credit until actual refund received is recorded. Independent read/write/export permissions, exact amounts, expected versions, stable operation recovery, audit and deduplicated outbox apply. Shared fa/en admin tables/filter/icon actions cover finance routes and aliases. Date-filtered cash flow and protected CSV exports are connected. See finance-workflow.md.

Verification: 615 backend tests and 347 existing frontend tests passed, plus three new finance client checks. Real isolated browser evidence verifies transfer/expense/correction, ambiguous response recovery, exact replay, CSV and mobile fa/en. Restored-copy additive migration preserves existing stock/purchases/production. No synthetic financial records or invented opening balances enter the main workspace. Full admin release remains unfinished: uploaded finance attachments, XLSX, gateway/customer/artist obligations, full reports and downstream checkout/fulfillment/refunds remain pending.

Deployment verification (2026-10-19): main and isolated demo are at schema 0040; all nine services in each workspace are healthy. Main finance accounts/documents are both empty; no synthetic balances were introduced. Guest finance reads return 401/no-store and fa/en finance routes respond successfully. Sixteen emitted demo finance events were published and processed exactly once at the worker audit check. Both real finance browser journeys passed independently; finance client tests (3), backend finance checks (7), type checking, targeted lint and the frontend production build passed. The full backend run passed 615 checks; existing frontend suite passed 347 before adding the three finance client checks.

## 2026-10-19 — Historical operational reporting and XLSX

Added permission-controlled inventory valuation/low-stock, source movements, warehouse waste/corrections and production WIP/QC/cost reports with explicit event-time cutoffs. Historical thresholds and costs come from immutable events; incompatible quantities stay grouped by unit. Production estimates use pinned rates, actual costs stay separate, missing values remain unknown and historical reservation availability is explicitly withheld. Source links honor operational permissions and filters survive URL navigation. Dashboard inventory/WIP/low-stock/incomplete-cost metrics now use recorded reports; the stale integration placeholder was removed. CSV/XLSX exports include exact amounts, currency, complete filters and source/correction IDs under independent finance.export access. Financial document exports also support XLSX. No schema changes or synthetic main records. See operational-reporting.md.

Verification: full backend suite 621 passed; frontend suite 353 plus two new dashboard checks passed; targeted lint, production build and real isolated reporting browser evidence cover historical valuation, low stock, waste reversal, source navigation, XLSX, WIP completion and fa/en desktop/mobile. Full integrated admin acceptance remains unfinished; FIN-11/12 remain connected_partial.

Deployment verification (2026-10-19): the final build is deployed to both local main and isolated demo. All nine services per workspace are healthy. Schema remains 0040, main finance-account and production-batch counts remain zero, and no synthetic report fixtures were seeded there. Guest report/read/export requests return 401/no-store; fa/en reports and the finance inventory-value alias return 200/no-store. Final verification: 621 backend tests, 355 frontend tests, production build/type checking/targeted lint, and all three real isolated finance/supplier/reporting browser journeys passed. The reporting journey also verifies recorded dashboard navigation.

## 2026-10-19 — Reviewed price proposals and explicit publication

Migration 0041 connects exact recipe-cost snapshots to explicit margin/fee/fixed-cost/rounding proposals, custom prices and simulated discounts. Proposals are saved/revised/rejected independently of publication. Expected versions, reviewed-calculation fingerprints, shared source locks and the existing SKU price version/audit reject stale inputs and prevent duplicate publication. Pending reads flag changed resource/recipe/public-price/bundle dependencies. Own immutable receipts recover unknown outcomes. Publication, audit and outbox are atomic; historical inventory/order costs remain separate. pricing.publish is independent of catalog.manage and now also gates the legacy manual SKU-price writer; catalogue-only controls are read-only. Shared fa/en admin UI, proposal routes and the existing dependency queue remain available. See price-proposals.md.

Verification covers six PostgreSQL pricing workflows, three client binding/recovery checks and a real isolated preview→draft→publication→lost-response recovery→stale rate→reviewed revision→rejection browser journey with fa/en desktop/mobile layouts. Restored-copy additive migration preserves stock, purchases, production, SKU prices and price audits. The full admin release remains unfinished; COST-08–10 remain connected_partial for family/group/bundle/scheduled review and full acceptance. An existing customer payment-filter test was updated to select the shared dropdown option through its actual interaction; customer behavior was unchanged.

Deployment verification (2026-10-19): main and isolated demo are at schema 0041 with the pricing build. Main proposal/event tables remain empty; synthetic pricing decisions are confined to demo. Guest proposal reads return 401/no-store and fa/en proposal routes return 200/no-store. Ten demo pricing events were published and processed once at the worker check. Final verification: 627 backend tests, 358 frontend tests, production build/type checking/lint, 15 existing/permission browser checks and one real pricing browser journey passed.

## 2026-10-19 — Sandbox payment inquiries deployed (0042)

`payments/admin.py`, `PaymentsPanel.tsx` and shared `PaymentWorkspace` connect standalone `/admin/payments` (finance/payments alias) and authorized order details to recorded gateway inquiries. Fresh payments.read + finance.write, expected payment revision, reason, per-key/payment locks, immutable actor-owned receipts and audit history. Migration 0042 advances revisions for legacy callbacks/customer verification too. Malformed gateway payloads stay unknown. No manual success, stock, fulfillment, refund or settlement is invented. External inquiry still uses the existing synchronous eight-second adapter; worker-based recovery remains pending. See payment-inquiries.md.

Main/demo 0042 services healthy; main payment_inquiries remains empty. Only demo received synthetic inquiry fixtures. Restored-copy migration and private backup passed. 630 backend tests, 361 frontend tests, production build, lint and database-backed browser lost-response/replay/fa-en/mobile/desktop/alias checks passed. Full release remains incomplete: authoritative checkout stock/policy integration, fulfillment, return/refund allocations, gateway settlement, artist/commission end-to-end workflows and full acceptance remain outstanding.

## 2026-10-19 — Order stock commitments (0043)

Implemented whole-order physical stock reservation at sandbox checkout. Customer review fingerprints bind basket/options/prices/components/settings; explicit reservation_minutes and counted opening stock are required. Frozen actual bundle choices aggregate repeated SKU demand with standalone items. Exact component prices/paid sale shares are retained for future refunds. Payment failure/cancellation releases temporary holds once; unknown results retain holds until scheduled expiry; late success reacquires all components or enters a paid-stock-shortage queue. Physical quantity/value/history are unchanged until a separate future fulfillment event.

`inventory/reservations.py` + `inventory/order_stock.py` provide append-only events, independent reservation versions, configured expiry worker and reasoned staff recommit with expected versions, stable keys and actor-owned receipts. `/admin/order-stock[/:order]` and authorized order details reuse shared components, filters, icon rows and guards. Customers see owned commitment/shortage state. Historical orders are never backfilled. Existing HTTP exception detail codes now propagate to clients, allowing explicit reacceptance instead of treating validation as an uncertain charge.

See order-stock-reservations.md. Shipping/tax still explicitly zero in this sandbox stage; delivery type/weight/policy enforcement, fulfillment/COGS, return/refunds, gateway settlement, complete artist workflows and integrated release acceptance remain pending. Paid orders remain on hold; a commitment never promises shipment.

Final 0043 verification: 638 backend / 368 frontend tests passed, production build/typecheck/lint passed, five final browser checks passed (real isolated stock opening → no-charge checkout → committed stock/customer/staff/bilingual/mobile views and four discount checkout regressions). Separate target check confirms no-charge orders record a no-payment audit reason rather than a gateway confirmation. Real expiry worker task registered and completed; reservation outbox events published/processed. Restored-copy migration preserved old stock/purchase/production/SKU/price audit records and created empty reservation tables. Synthetic test fixture script is `Backend/scripts/seed_stock_acceptance.py`, guarded by --demo-only and exact nilart_demo database name.

0043 deployment confirmed: main and isolated demo API/web/worker/scheduler healthy, main order_stock_allocations and stock_reservation_events both empty, fa/en staff pages 200/private no-store and guest stock reads 401/no-store. No main synthetic records or historical backfill. Only the isolated nilart_demo workspace was seeded for browser acceptance.

## 2026-10-19 — Partial parcel fulfillment (0044)

`fulfillment` owns draft/edit/pick/QC-failure/pack/dispatch/deliver/cancel/tracking commands, each expected-version/reason/key bound with immutable receipts. Dispatch consumes only the parcel's actual frozen components through the existing weighted stock helper, releases its reserved quantities, records per-component movements/actual COGS, updates allocation.shipped and derives the order state atomically with staff audit, notices and outbox. Tracking corrections retain posted cost/quantities. Pending cancellation requests and missing stock/policy/custom-print identities block dispatch.

Staff routes `/admin/shipments`, `/new?order=…`, `/:id`, `/:id/label` (alias `/admin/shipping`) use shared filters/tables/icon actions, fresh permissions, unsaved/uncertain guards and explicit confirmations. Customer tracking is owner-only and excludes internal cost/notes. Shipment notices link to the owned order. Labels exclude cost/audit and are explicitly sandbox labels. Inventory/report source links point to parcels and respect fulfillment.manage. See fulfillment-workflow.md for remaining limits: complete return/refund, custom print, checkout policy, profit report and settlement integration are not done.

0044 verification: 642 backend tests and 372 frontend unit tests passed; production build/typecheck/lint and seven final browser checks passed. Real repeated-SKU bundle dispatch remained bound to frozen choices after catalogue edits. Real two-parcel browser flow recovered/replayed a lost dispatch once, recalculated the next parcel's weighted inventory cost after incoming stock, preserved prior COGS, delivered both parcels, verified customer privacy/notices and printed label content without cost/audit. Final mobile Persian forms/labels were visually checked. Restored-copy migration preserved business and reservation snapshots; private backup pre-fulfillment-20261019T135001Z.dump. Demo shipment events 24 emitted/published/processed at the final worker check. Deploy workers/scheduler before exposing new API event types after migration.

0044 deployment confirmed: main and isolated demo schema 0044, API/web/worker/scheduler healthy. Main fulfillment_shipments, fulfillment_events and fulfillment_dispatch movement counts all zero. Synthetic records stayed in nilart_demo. fa/en shipment pages and /admin/shipping alias passed private/no-store route checks; guest fulfillment reads are 401/no-store. Full remaining release scope is still open; do not claim all 56 admin views accepted.


### Return inspection stage — 0045 (2026-10-19)

Approved returns now have shipment/component-bounded, original-cost healthy stock recovery, separate damaged disposition, immutable receipts, safe retry and owned customer tracking. Inspection does not issue money or close the request. ORDER-04 remains partial; FIN-08/refunds and full purchase-policy acceptance remain pending. See [return inspections](return-inspections.md).

0045 final evidence: 647 backend / 374 frontend tests, production build/lint, three deployed browser checks; private pre-migration backup `backups/pre-return-inspections-20261019T141919Z.dump`. Main/demo ready/healthy, main inspection count zero. Next work: explicit checkout policy acceptance and return submission, request closure/cancellation and original-paid-allocation refunds; inspection alone must never mark money refunded.


### Original-allocation refund stage — 0046 (2026-10-20)

Approved inspected returns now support exact partial/full component refunds, explicit bounded shipping/tax, explicit closure, immutable local sandbox receipts, lost-response recovery and owned customer tracking. Payments read/refund permissions are independent of finance write. Refunds never move stock or post fictional bank movements. Partially refunded orders retain remaining-parcel dispatch. FIN-08 / ORDER-04 remain partial; cancellation/shortage refunds, provider/settlement reconciliation and complete checkout-policy acceptance remain pending. See [refund workflow](refunds-workflow.md).

0046 final evidence: 657 backend, 377 frontend tests; live simulated refund journey and final fa/en mobile/desktop screen checks passed. Main/demo deployed healthy at 0046; main has no synthetic refunds. Backup: `backups/pre-refunds-20261020T053822Z.dump`. Next: approved cancellation processing/release, late-payment shortage refund resolution, checkout policy acceptance and gateway settlements. Do not claim real payouts, full FIN-08 completion or full 56-view release.


### Paid cancellation and shortage financial resolution — 0047 (2026-10-20)

Approved paid cancellation now stops unshipped parcels, releases holds exactly once and records immutable operation/audit/customer history atomically. Separate finance refunds use original whole-order allocations, including paid late-stock-shortage orders, without return inspection for unshipped goods. Unknown payments and shipped/legacy-incomplete orders are blocked. Existing snapshots/physical stock/value remain preserved. This remains a partial release: unpaid/unknown cancellation completion, real payout/settlement and checkout policy work remain pending. See [cancellation workflow](cancellation-workflow.md).

0047 final: 663 backend / 379 frontend tests and two deployed browser checks passed; main/demo healthy at 0047, main cancellation count zero. Backup `backups/pre-cancellations-20261020T055053Z.dump`. Continue unpaid/unknown-payment cancellation handling, staff-originated resolution requests, settings/checkout policy acceptance, settlement and artist workflows. Do not claim full release or real payouts.


### Staff-originated shortage review — 0048 (2026-10-20)

Stock-shortage detail now opens an explicitly staff-originated customer-visible cancellation review, with versions, immutable receipt/retry, independent permissions, audit/notification/outbox and active-request protection. It changes no stock or money and never auto-approves. Recommit waits for pending cancellation review. Nullable provenance preserves existing unknown history; staff origin survives approval and financial completion in customer/admin views. Unpaid/unknown payment cancellation, provider/settlement, checkout policy and artist work remain pending. See [stock resolution reviews](stock-resolution-reviews.md).

0048 final: 666 backend / 381 frontend tests, isolated staff-initiation→review→cancellation→simulated-refund journey and final bilingual desktop/mobile source tracing passed. Main/demo healthy at 0048; main stock-resolution review/provenance counts zero. Backup `backups/pre-stock-resolution-20261020T060347Z.dump`. Continue unpaid/unknown payment cancellation, provider/settlement, checkout settings/policies and artist workflows; full integrated release remains incomplete.


### Unpaid/uncertain cancellation extension — 2026-10-20

Approved unshipped sandbox orders can now release stock while payment remains pending, unknown or failed. Financial review stays open. Late confirmed payment retains cancellation and enters the existing original-allocation refund workflow without reacquiring stock; repeated callbacks preserve refunds. Unknown provider outcomes remain unknown even after non-OK browser return. Contradictory paid history remains blocked. No migration/backfill is needed. Final no-payment closure, external payout/settlement, full checkout policies, catalogue/artist dependencies and 56-view acceptance remain pending. See [cancellation workflow](cancellation-workflow.md).

Unpaid cancellation verification: full backend suite 670 passed; final cancellation/refund focused suite 20 passed and queue/coupon cancellation recheck 10 passed. Frontend 382 passed, typecheck/build and scoped lint passed. Isolated real-database unpaid browser journey passed in fa/en at 390/1440 widths; Persian mobile screenshot reviewed. No migration; schema remains 0048. This remains a partial sandbox release.


### No-payment cancellation financial closure — 0049 (2026-10-20)

A processed cancellation can now be financially completed against a fresh recorded rejected gateway inquiry, with independent finance/payment/order permissions, optimistic versions, immutable receipt/recovery and atomic audit/notification/outbox. It moves neither money nor stock. Later success or uncertainty reopens review while preserving closure history; paid callbacks never erase refunds. Pending/unknown/browser-cancelled evidence alone cannot close. See [financial closure workflow](cancellation-financial-closure.md). Full release acceptance, external payout/settlement, full checkout policies, catalogue/BOM/artist/reporting work remain pending.


0049 verification: 674 backend tests passed, with 14 final cancellation/closure checks; 387 frontend tests passed; typecheck/build/scoped lint passed. Two isolated real-database browser checks passed separately (new synthetic imported rejection → cancellation → lost closure response → receipt recovery/replay → owned completed request, and final read-only fa/en 390/1440 screens). Final Persian mobile screenshot reviewed. Restored-copy migration preserved every pre-existing public table; private backup retained. Main/demo migrations advance additively to 0049. No real provider transaction or refund was performed; complete release acceptance remains pending.


### Recorded supplier financial statements — 2026-10-20

Supplier statements now combine posted purchase/cancellation/return liability with recorded supplier payments/refunds and linked reversals, exact running subtotals, Tehran recording-date filters, stable paginated revisions and full-range CSV/XLSX exports. Finance-only access has its own `/admin/finance/suppliers/{id}` route; source financial documents support deep links. Missing opening supplier balance and incomplete history are explicit. This adds no migration or money/stock command. See [supplier financial statements](supplier-financial-statements.md). Opening debts/credits and complete release acceptance remain pending.


Verification: 678 backend tests / 391 frontend tests passed, including four real PostgreSQL statement tests for cash/stock separation, return and reversal references, exact balances, changed pagination, Tehran recording dates/prior activity, independent finance/export access, CSV formula safety, XLSX contents and explicit incomplete-history rejection. Typecheck, production build and scoped lint passed. The isolated browser journey created only new demo supplier/SKU/purchase/cash records through real APIs; it received/returned goods, paid/reversed cash, verified the recorded statement, downloaded CSV/XLSX, opened the authoritative financial source, checked fa/en 390/1440 layouts and denied customer access. Persian mobile screenshot reviewed. This stage adds no migration; schema stays 0049.


### Explicit supplier opening balances — 0050 (2026-10-20)

Finance can now confirm an external opening debt, credit or zero, with evidence, an excluded-recorded-activity acknowledgement, a frozen pre-activity date and reason. Corrections retain linked versions and signed deltas; cash, purchases and inventory are unchanged. Openings are integrated into statements, revised pagination and exports; unknown loading is distinct from missing setup. Migration 0050 creates no business data. See [supplier opening balances](supplier-opening-balances.md). Settlement against opening balances and full release acceptance remain pending.


0050 verification: 681 backend tests passed; seven final opening/statement checks passed after adding explicit export movement types. 396 frontend tests passed, with nine targeted API/form/statement checks. Typecheck/build/scoped lint passed. A restored-copy migration preserved every field of every pre-existing public table and retained a private backup; existing suppliers received no opening data. The isolated browser journey recorded a zero confirmation, lost and recovered its committed receipt, replayed the original command, linked debt then credit corrections, checked statement/export totals and proved cash account/purchase records unchanged. Customer access was denied. Persian/English 390/1440 screenshots were reviewed. No real payment or stock operation was triggered by an opening command.


### Supplier opening cash settlements — 0051 (2026-10-20)

Opening debt payments and credit receipts now use shared operational cash documents with exact remaining-balance bounds, current opening/allocation/account version checks, retained uncertain commands and linked reversals. Corrections preserve prior cash; dependent corrective entries must be reversed first. Supplier statements include opening allocations independently of purchase balances. The bilingual responsive workspace uses shared table and icon actions at `/admin/finance/suppliers/{id}/settlements`. Migration 0051 creates no business records. See [opening settlements](supplier-opening-settlements.md). This remains a partial sandbox release; external transfers and complete integrated acceptance are pending.

0051 deployment verification: main and demo healthy on schema0051; main opening allocations0. Final frontend400/100 files, backend685 wider suite plus final5-test opening regression suite, lint/typecheck/build and real demo browser journey passed. Restored-copy migration preserved existing records. Next work remains in the partial release backlog; do not recreate this settlement workflow or claim complete56-view acceptance.


### Combined supplier balances — 2026-10-20 (schema0051 unchanged)

Finance now has a shared-table report combining supplier openings, purchase liabilities and distinct purchase/opening cash allocations, with missing setup explicitly excluded from confirmed debt/credit totals. Literal bilingual search, balance-state filters, stable pagination, guarded CSV/XLSX export and icon links to statements/settlements use independent finance permissions. One database snapshot verifies source purchase history; stale or incomplete reports reject. Archived balances remain visible. No migration, stock, cash or business-data mutation. See [supplier balances report](supplier-balances-report.md). Customer/gateway/artist obligations, aging and full release acceptance remain pending.

Combined supplier report deployed to main/demo on unchanged0051: backend690, frontend405/102 files, final focused database4 and real demo browser journey passed; typecheck/lint/build passed. Both readiness checks200, anonymous report401/no-store, main opening allocation count0. Main API/web/worker/scheduler healthy. Next work should advance other partial finance/checkout/catalogue/artist/reporting gaps; this current supplier-position report is complete within its documented1000-supplier bound, but FIN-05/FIN-12 and the integrated56-view release are not complete.


### Historical supplier balances and retained filters — 2026-10-20

The supplier report supports an optional recorded-through date in Tehran, reconstructing purchase/opening changes and cash/reversals without later events. Missing openings remain missing until their recording date. Pagination and exports bind the date; shareable URL filters survive reload/back, and linked statements use the same cutoff. Supplier identities remain current and are labeled accordingly. No migration or ledger mutation; schema0051. See [supplier balances report](supplier-balances-report.md). Due-date aging, other counterparties and full release acceptance remain pending.

Historical supplier report deployed to main/demo, schema0051 unchanged. Final backend692/frontend412 across103 files, lint/typecheck/build and two live demo journeys passed. Main API/web/worker/scheduler healthy; both readiness200, anonymous dated report401/no-store, main opening allocation count0. Shared browser history guard now honors synchronous approval and still blocks cancelled/uncertain form navigation. Continue the broader backlog (due-date aging, other counterparties, checkout/catalogue/artist/reporting dependencies); this remains a partial56-view release.


Admin remainder audit (2026-10-20): see `admin-remaining-audit-2026-10-20.md` for all56 views, current route gaps and superseded notes. Register remains53 connected_partial/3 missing; these are not completion percentages. Biggest blockers are catalogue media/bundle/artwork authoring, settings-backed checkout (current sandbox forces physical/address, zero shipping/tax and non-returnable lines), gateway settlement/official profit, and complete artist/commission workflows. Recommended next stage is catalogue/media and bundle authoring, rather than more supplier-report refinements. This audit changed documentation only and did not repeat the full browser/test acceptance.


### Integrated catalogue preview0052 — 2026-10-20

The requested full56-view release is in progress. The source has a verified managed bundle editor/publication/gallery/history/receipt workflow, percentage quotes and ledger-backed selected capacity, plus BOM/material edit aliases and standalone cutting workbench. Independent catalogue/price publication permissions apply. Final699 backend /418 frontend tests and two real isolated browser journeys pass; restored-copy migration preserves existing tables. Main remains stable0051; only demo uses0052 via integrated-preview.override.yaml. See `bundle-authoring.md`, `admin-integrated-release-progress.md` and `admin-integrated-acceptance.json`. Catalogue/SKU commerce profiles, artwork authoring, settings-backed checkout, family costing/production dependencies, gateway/profit/artist/support/recovery workflows and final release acceptance remain unfinished. No complete release or main rollout is claimed.
