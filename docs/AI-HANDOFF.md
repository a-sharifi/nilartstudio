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

Current head **0013**: outbox → collections → catalog foundations → processed events → accounts/sessions → OTP/grants → roles → profiles → draft SKU options/audits. Artwork descriptions follow draft options; commission request storage follows artworks; bundle composition follows commission requests; versioned explicit SKU price editing follows bundles; applied locally at head 0013. Do not rewrite applied migrations destructively.

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
