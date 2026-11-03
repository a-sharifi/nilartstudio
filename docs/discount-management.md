# Discount management and sandbox redemption

The placeholder at `/fa/admin/discounts` is replaced with a bilingual reference-shell rule list and persistent editor. Routes include `/admin/discounts/new/{id}`, `/admin/discounts/{id}` and the reference `/{id}/edit` alias. Admin reads/writes require `catalog.manage`; the generic fallback now uses the same permission. No promotional codes, policies, purchases or redemptions are seeded by this implementation.

## Staff workflow

Rules have a unique uppercase ASCII code, bilingual title, fixed whole-toman amount or exact percentage, inclusive Tehran-day validity, minimum eligible goods amount, optional amount cap, total/per-account limits, optional product/collection/category scopes, allowed verified mobile numbers, explicit bundle-stacking permission and enabled state. New drafts are disabled. Empty scopes mean all goods; nonempty scopes combine as a union. Blank caps/limits are explicitly unlimited. Scope selectors use real catalogue names, including paginated search; mobile restrictions normalize to the identity system's canonical Iranian number format.

The rule's displayed calculation policy rounds the coupon benefit down once to whole toman. Eligible line capacities round down to historical hundredths of toman; largest-remainder allocation distributes the benefit deterministically by remainder and stable basket-line ID. Allocation never exceeds line capacity or the eligible goods total. Public amounts/allocation units are decimal strings; calculations use Fraction/Decimal, never binary floating point. Shipping/tax are excluded. Discounted bundles are excluded by default, while eligible standalone items in a mixed basket still receive the code. Explicit stacking applies only to the post-bundle-discount amount; bundle savings are allocated deterministically to components first, and scoped codes apply only to the eligible remaining component amounts. Original component prices, bundle savings and code allocations are frozen with usage history.

Staff can search/filter/page, create/edit/deactivate, read complete immutable revisions, review current-vs-retained input after a conflict, and check/retry an unknown save using the same revision intent. The editor keeps a stable identity before first save and clears private state on session changes. History includes actors, Tehran timestamps, reasons, rule settings and lazily resolved scope names. Recorded redeemed/reserved counts are fetched explicitly rather than invented.

Writes recheck live permission/session, exact Origin and CSRF in the transaction. Version checks, globally unique codes, immutable receipts, audit and outbox are atomic. Resource IDs in scopes are validated. Rule-save worker events are validated and deduplicated.

## Customer workflow

The live basket directs code entry to the existing sandbox checkout, replacing the disabled/not-available coupon message. Checkout requests a fresh authenticated quote against the saved basket and its current published catalogue prices. It displays the code benefit and new payable amount, and requires renewed amount confirmation. Editing a code, changing the basket or changing accounts invalidates the quote. Requests/late results after session changes or unmount cannot redirect the user from stale checkout state.

Starting payment rechecks the rule/version, date, mobile, scopes, minimum/cap and quotas. A transaction lock serializes rule edits and coupon reservations across accounts; two checkouts competing for the final use have one winner. Usage is reserved atomically with the order/payment/outbox, and a frozen rule snapshot and exact line allocations are retained. Order snapshots are validated before external requests. Payment commands bind their complete intent; uncertain retries preserve the same body/command and cannot silently change coupon/address/amount.

Only verified success redeems a reservation. A definitively rejected gateway-creation request releases it. Unknown requests and payments that remain resumable (including cancelled/not-yet-verified attempts with an authority) retain reservations; they are not final redemptions. There is deliberately no automatic time-based release while a late payment can still settle, preventing overuse. Provider reconciliation/manual operational recovery for abandoned or ambiguous authorities remains part of the existing sandbox payment limitations, not a new automatic cancellation policy.

An exactly zero payable order completes atomically with a clearly prefixed sandbox zero-total receipt, without calling the gateway. Replay does not create another order or consume the code again. Fulfillment remains on hold and no stock, shipping, real-money charge or actual revenue is fabricated. Nonzero amounts must satisfy the existing sandbox gateway bounds. This connects the existing development-only sandbox checkout; production merchant activation and full stock/fulfillment workflows remain separate prerequisites.

## API and migration

Admin prefix `/api/v1/admin/discounts`:

- `GET /rules?q=&active=&cursor=&limit=`; `GET /rules/{id}`.
- `GET /rules/{id}/versions?before=&limit=`; `GET/PUT /rules/{id}/versions/{revision}`.
- `GET /rules/{id}/usage`.
- `GET /choices/{products|collections|categories}?q=&ids=&cursor=&limit=`.

`POST /api/v1/discounts/quote` accepts one code and a saved basket version, requires the current account/Origin/CSRF, and never reserves usage. Sandbox checkout adds optional `discount_code` and `discount_version`, revalidates them and binds its complete command intent. API contracts and generated types include these changes.

Migration 0033 adds rule/revision/usage tables and nullable intent metadata for historical sandbox payments. It allows zero-rial sandbox payment records. Upgrade does not modify old order snapshots or create business data. Downgrade preserves existing positive payment rows; it explicitly refuses before any destructive step if zero-total orders exist, because the older positive-only schema cannot represent that history.

## Verification

27 isolated PostgreSQL discount checks cover rules/history/idempotency, invalid input, scopes and bundle-component union, deterministic exact allocation, caps/minimum/date/mobile, fresh authorization, permissions, rollback, usage lifecycle, zero-total orders without gateway calls, repeated callbacks/commands, worker validation/deduplication, actual concurrent final-use reservation and compatible downgrade. Six existing payment checks and 19 outbox checks also pass.

13 frontend tests cover receipt/intent scope, private-cache cleanup, checkout quoting/ineligible codes, exact uncertain retries and ignored late payment navigation. Twelve intercepted browser workflows cover admin CRUD/scopes/history/usage/conflict/recovery/filters, cart-to-checkout application, pinned totals, uncertain retries and Persian mobile views. Browser checks use fixtures; payment/database tests use isolated schemas and stub the gateway. No real code or purchase is written by verification.

Local deployment verified on 2026-10-18: migration 0033 applied, production frontend built, and all eight services healthy. The API/worker source layer uses the existing runtime with installed dependency versions checked against requirements.lock. All 52 combined discount/payment/outbox checks pass.
