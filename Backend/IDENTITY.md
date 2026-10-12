# Identity foundation

Implemented: Iranian phone normalization (Persian/Arabic/ASCII digits), bounded salted
scrypt password hashes, purpose-bound OTP HMAC primitives, secure random tokens,
PostgreSQL accounts and hashed sessions, password login, session inspection and
CSRF-protected logout. Application use case and repository port are separate from
SQLAlchemy/HTTP. Migration `0005` creates empty tables, not demo accounts.

Endpoints: `POST /api/v1/auth/login/password`, `GET /api/v1/auth/session`,
`POST /api/v1/auth/logout`.

Login requires an exact `Origin` matching `NILART_PUBLIC_ORIGIN`; browser JSON
requests supply this automatically. Sessions last 24 hours; cookies are HttpOnly,
SameSite=Lax, Secure outside development. Only token digests are persisted. Login
returns a CSRF token that clients must retain in memory for mutations. Logout
requires `X-CSRF-Token`. Blocked/unverified/unknown accounts have the same error.
Auth responses disable caching. Redis limits attempts by canonical phone and
socket client address; cache failure denies login. An untrusted forwarded IP is
never accepted. Behind the current proxy this address may be shared; trusted
proxy/client IP configuration and distributed rate-limit QA remain release gates.

## OTP, registration and recovery

Migration `0006` adds hashed OTP challenges and one-use password grants. Endpoints:
`POST /otp/request`, `POST /otp/verify`, `POST /register/complete`, and
`POST /recovery/complete` under `/api/v1/auth`.

Challenges expire after 3 minutes, allow at most 5 attempts, and are bound to an
explicit purpose. Resend requires 60 seconds and invalidates the prior challenge
for the same phone/purpose. Redis separately limits requests, verification and
password completion; PostgreSQL row locks protect one-use consumption. Wrong-code
attempts commit even when the HTTP request fails. ASCII/Persian/Arabic OTP digits
are supported. Only HMAC digests of codes are stored; a separate secret
`NILART_OTP_HMAC_KEY` of at least 32 bytes is required. Do not rotate this key while
expecting outstanding codes to remain valid.

Registration/recovery verification returns a 10-minute opaque grant, not a session.
Registration completion consumes that grant and inserts an account atomically;
duplicate phones cannot overwrite credentials. Recovery updates the password and
revokes all old sessions/challenges/grants before issuing a new session. Login OTP
requires an existing verified, unblocked account. Passwords require 12–128 characters
and at most 512 UTF-8 bytes; previous demo policy is not production policy.

**SMS is deliberately disabled by default.** No production provider was selected.
Request returns `sms_unavailable` rather than claiming delivery. The sender port is
injectable; only tests use a capturing adapter. A real adapter must have bounded
timeouts and return normally only after provider acceptance. `delivery_status:
accepted` means provider acceptance, not delivery to a handset. Unknown/failed
provider outcomes return `otp_request_unconfirmed`; database changes roll back.
That may leave a delivered-but-unusable code; UI must not claim it can be used.
No plaintext codes, phone numbers or grants are written to logs/outbox.

The supplied password design is connected in live mode at `/fa/auth/login/password`
and `/en/auth/login/password`; success requires fetching and verifying the session.
Registration, OTP request/verification/resend and password recovery design forms
are also connected. SMS method selection opens the actual request form; with no
configured provider it shows service unavailable and does not advance. Preview
controls are absent in live mode. Logout design integration is complete for the current-session flow.
No credentials or user records have been seeded into the local application database.

Frontend challenges/grants are kept only in per-tab JavaScript memory to survive
Next route remounts. Full reload deliberately requires restarting verification;
tokens, OTPs and passwords are never persisted in browser storage or URLs. Stale
async outcomes cannot advance a flow after navigation. Unconfirmed mutation
outcomes pause resubmission instead of pretending a failed network request had
no side effect. Registration/recovery UI uses the backend password policy and
requires a matching verified session before claiming success.

Not complete: real SMS adapter, audited role management, audit, authenticated password change,
expiry cleanup, trusted proxy policy and complete auth UX. Session CSRF state is
memory-only and is bootstrapped after refresh
using `POST /api/v1/auth/session/csrf`. The account UI and guest-cart merge are not connected.

## Logout and CSRF bootstrap

The supplied `LogoutPage` is connected at `/fa/auth/logout` and `/en/auth/logout`.
It first checks the session without mutations. On explicit confirmation it obtains
a fresh CSRF token, revokes the current session, then verifies session absence.
Unknown outcomes pause sign-out and offer a read-only status check; no retry of
the mutation is automatic. Auth flow memory is cleared only after confirmed absence.

CSRF bootstrap requires exact `Origin`, an active cookie session and a Redis
rate limit (60 attempts per socket address / 5 minutes). Missing cache fails closed.
The token hash rotates in PostgreSQL; expiry is not extended and old CSRF becomes
invalid. Requests from competing tabs may invalidate a prior token, so clients
bootstrap immediately before mutation and treat rejection honestly. Live broadcast
messages carry no personal data and trigger server revalidation; they are not proof
of logout. Server-side private-data permission checks remain mandatory.

Tests cover primitives and a real PostgreSQL isolated-schema password/session/
logout flow. That test substitutes the rate-limit adapter; separate Redis outage,
concurrency and production-cookie tests remain necessary. Recovery revocation,
grant/code replay, resend, purpose/expiry, blocked/unknown accounts and duplicate
registration are tested in isolated PostgreSQL schemas with a test-only sender.
Origin rejection, request limiting and Redis failure denying login have separate
HTTP tests. Application startup requires an HTTPS origin outside development.
Do not enable production auth until the complete flow and security checks pass.

Role/permission primitives and the authenticated access endpoint are now available;
see `ACCESS.md`. This does not imply that business endpoints or imported panels
are integrated. Registration grants only customer privileges.

### Frontend session lifecycle (2026-10-12)

A persistent client provider shares focus, visible-page, BFCache-restoration and
cross-tab signals. Messages contain only a `session-changed` hint: private views
query authenticated APIs before treating a session as changed. Verified password,
OTP and completion flows announce changes only after matching the session owner;
logout announces only after confirming session absence. No CSRF token is cached
between requests or persisted in browser storage.

The in-memory lifecycle advances a revision on verified owner changes and fresh
local authentication, clears registered auth flow/grant memory even when its view
is unmounted, and notifies private views. Session/profile reads and profile writes
reject responses from an older revision. Concurrent session/profile reads are
ordered. Profile permission denial (403) does not establish global sign-out.
Future private caches must register cleanup and subscribe to authoritative
revalidation; unconnected commerce features are still unavailable. Cross-tab
messages alone do not prove same-owner session rotation, and no session identifier
or credential is broadcast.

### Live session-expiry route (2026-10-12)

`/fa/auth/session-expired` and `/en/auth/session-expired` now use the original
expiry-page layout with live session checks. Only a confirmed 401 shows sign-in
again; unavailable/unknown checks offer explicit retry. An active session offers
an explicit destination link, whose endpoint still enforces ownership/permissions.
No private content is rendered on the expiry page, no prior mutation is replayed,
and no automatic destination authorization is inferred from session presence.
Cross-tab/focus checks use the shared lifecycle; local read ordering prevents a
late positive check from replacing a verified logout. Live preview controls and
fixture notes are absent. Both locale profile URLs are allowed safe auth return
destinations; arbitrary/external redirects remain rejected. Account-restriction
pages and the broader destination workflows remain unconnected.

### Exact-origin logout gate (2026-10-12)

`POST /api/v1/auth/logout` now requires `Origin` to match `NILART_PUBLIC_ORIGIN`
exactly, in addition to the cookie session and fresh CSRF token. Missing, null,
foreign, wrong-port and lookalike origins return `403 origin_invalid` before
session lookup/revocation, with no-store caching and no cookie mutation. An API
client must supply the configured Origin; same-origin browser POSTs supply it
normally. A valid CSRF token does not override this gate. Existing atomic nonce
rechecks and server-confirmed logout behavior remain unchanged.

Five origin probes and the PostgreSQL password/session/logout flow cover rejection,
including a genuine valid-token request that leaves its session active when rejected.
No application accounts or sessions were modified during this continuation.

### Real Redis abuse-limit verification (2026-10-12)

`tests/test_rate_limit_redis.py` creates disposable Redis containers with a
random localhost-only port, temporary storage and persistence disabled. It never
connects to the application Redis service or deletes application keys/volumes.
`NILART_TEST_REDIS_IMAGE` opts into these Docker tests; without it they skip.
The backend CI job now pulls Redis 7 and enables them explicitly.

Concurrent probes verify password phone/address caps, CSRF caps and OTP request,
verify and completion phone caps. Tests also check bounded key TTLs, hashed
password-limit keys, non-extension of the CSRF window, and fresh allowance after
that isolated key is removed. An HTTP bootstrap test exhausts its real Redis
limit, then stops only its fixture container: the endpoint returns 503 with no
cookie and no-store caching. Seven new cases passed with the full suite (137).
This does not verify production proxy addressing, distributed deployment/failover,
real SMS delivery or all OTP address/purpose abuse scenarios. No production auth
release approval is implied. The existing Starlette/httpx warning remains.


### OTP address limits and sign-in outages (2026-10-12)

Nine additional disposable Redis cases verify OTP address caps across different
phone numbers, independent request/verify/complete counters, and address-only
verification/completion limiting without a phone. Rejected attempts do not extend
shortened windows. Real Redis shutdown causes password login, OTP request/verify,
registration completion and recovery completion to return
`503 authentication_unavailable`, with no session cookie and `Cache-Control: no-store`.
An unusable database dependency ensures these outage paths stop before database
business work. No SMS is sent. The full local backend suite passes 146 tests;
this update changes tests and documentation only. Production proxy address
configuration, Redis failover and remote CI execution remain unverified.


### Private response cache policy (2026-10-12)

The request middleware enforces `Cache-Control: no-store` for `/api/v1/auth`
and `/api/v1/account`, including their child paths. This closes the gap where
framework validation (422), unknown private routes (404), or unsupported methods
(405) bypassed endpoint-level headers. Exact path boundaries keep unrelated public
routes outside this rule. Twelve regression cases cover malformed auth input,
unauthenticated profile input, routing errors, request IDs, absence of cookies or
submitted secret values in errors, and public path boundaries. All 158 backend
tests pass locally. Unhandled server exceptions are outside this middleware's
returned-response guarantee and are not covered by this slice.
