# Access control foundation

Migration `0007` adds explicit account roles: customer, artist, operations, finance
and admin. Existing accounts receive customer only. New registration inserts that
same default in its transaction. No administrator is seeded or publicly grantable.
Recovery changes credentials, not roles. No role-management write endpoint exists.

`GET /api/v1/auth/access` returns the authenticated account's roles and permissions,
with no-store caching. `authenticated_principal` verifies the active cookie session;
`require_permission` denies absent permissions. Roles are loaded from PostgreSQL
for every request, so revocation is not delayed by Redis or a session role snapshot.
Blocked, unverified or expired accounts cannot obtain a principal.

Policies are framework-independent in `domain/permissions.py`. Customer self-read,
artist assigned work, operations, finance and administration are separate. Finance
alone cannot refund or manage identities; operations cannot publish prices or write
finance. There are no wildcard permissions. Multiple roles combine explicit grants.

This is NOT completion of protected business workflows. Future endpoints must use
the guard AND enforce aggregate ownership/assignment, valid state, CSRF for cookie
mutations, and audit/approval for sensitive actions. `Principal.owns` is a primitive,
not an automatic SQL ownership filter. Artist permissions do not grant access to
every commission. Catalog public reads remain public and publication-filtered.

Tests probe authorization using a test-only isolated FastAPI application and
rollback-only PostgreSQL schemas; no refund endpoint or financial action is created
in the actual app. Customer defaults, all role boundaries, live role revocation,
blocked accounts and unauthenticated requests are covered.

Remaining: audited role assignment/revocation use cases, first-admin bootstrap with
explicit operator authority, granular override approval, per-order ownership tests,
and integration of customer/artist/admin panels. Do not mistake imported demo
panels for permission-protected production workflows.

## Frontend access adapter (2026-10-12)

`Frontend/src/features/identity/access.ts` now reads the live access endpoint with
credentials and no-store caching. It validates nonempty owner IDs, known distinct
roles and distinct named permissions; malformed responses never become grants.
The returned snapshot and its arrays are immutable. Every load queries the server;
there is no persisted or module-cached permission snapshot.

Shared session revisions and ordered reads reject old-account responses and stale
permission reads after a newer revocation read. An authenticated 401 clears
registered private memory; a 403 denies this read without declaring global logout.
This is an adapter for future connected private pages, not an integration of
customer/artist/admin panels and not a substitute for backend permission and
ownership checks. Consumers must re-read on shared lifecycle signals and discard
local snapshots on verified session changes. Audited role management/bootstrap
remain unfinished and no actual account roles were modified.

### Shared access consumers

`useAccountAccess()` now subscribes to a shared in-memory `AccessStore`. Mounted
consumers share one request stream and lifecycle subscription. Revalidation hides
previous grants before checking the API; unknown results do not restore them.
Verified logout immediately drops the snapshot and invalidates pending reads.
Ordering rejects late grants after revocation, and the final unsubscribe releases
all cached access and the lifecycle listener. A later mount performs a fresh read.
Server rendering returns a stable checking state without access data or API calls.
This hook provides presentation state only; no private panel/business workflow is
connected by this change and backend permission/ownership checks remain mandatory.
