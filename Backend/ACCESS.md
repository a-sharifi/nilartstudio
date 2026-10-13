# Access control foundation

Migration `0007` adds explicit account roles: customer, artist, operations, finance
and admin. Existing accounts receive customer only. New registration inserts that
same default in its transaction. No administrator is seeded or publicly grantable.
Recovery changes credentials, not roles. Audited management endpoints are described below.

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

Remaining: business-specific ownership/assignment enforcement and integration of
the remaining customer/artist/admin workflows. The historical foundation notes below
describe their state when originally written; the current contracts follow. Do not mistake imported demo
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

### Transactional profile authorization (2026-10-12)

Profile saving now rechecks `account.write_self` from current roles under row-share
locks in the write transaction, after locking the session/account. Revocation before
that check denies the write; deletion after it waits for transaction completion.
The request's earlier principal is not the sole permission proof for a profile save.
Other endpoints' ordinary role reads remain unchanged. This introduces no role-write
API, bootstrap administrator or actual role changes, and does not complete audited
role management or concurrency rules for future commerce workflows.

## Audited account management (2026-10-13)

Migrations 0017–0018 add permission overrides, optimistic access versions, safe public
session IDs, account audits and owned phone-change challenges. Effective permissions
combine explicit role grants and individual grants, then remove individual denials.
Unknown permissions never grant access. Existing protected catalog, commission and
profile mutations recheck this effective principal in their transaction.

`/api/v1/admin/identity` exposes permissions, cursor-paginated accounts, account detail,
`PUT /accounts/{id}/access`, and bounded account audit history. Every endpoint requires
`identity.manage`; writes also require exact Origin, fresh CSRF, and a locked current
session/principal. Updates require the expected version and a reason, return 409 on
stale input, and audit before/after changes atomically. Global advisory serialization
prevents concurrent changes from removing the last active access manager. Restricting
an account revokes its sessions, OTP grants and phone-change challenges. Audits omit
passwords, OTPs, session tokens and CSRF secrets.

The first administrator is assigned only by an explicit operator command:

```sh
docker compose --env-file .env -f infra/docker/compose.yaml exec -T api \
  python -m nilart.bootstrap.first_admin --account-id ACCOUNT_UUID --reason 'Initial administrator assignment'
```

Replace ACCOUNT_UUID with the intended existing verified account. This command refuses
a blocked account or an existing administrator and writes an audit in the transaction.
It never runs during startup. No local account was promoted during implementation.

Live `/fa/admin/users`, `/en/admin/users`, and roles aliases use the reference admin
shell, permission filtering, actual account records and the shared dropdown. Stale
or ambiguous writes require reload; unsaved edits are protected. Other admin/artist
workflows remain unavailable until connected and enforce access before rendering.
