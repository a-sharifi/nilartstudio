# Staff-originated stock-shortage reviews — sandbox 0048

The order-stock detail workspace now lets authorized staff open a cancellation review when a confirmed paid order remains in stock shortage and no customer request exists. The reason is explicitly customer-visible. Creation submits a review only: it does not approve cancellation, release held stock, change physical quantity/value or issue a refund.

The action requires fresh `fulfillment.manage` and `orders.read_all`, a sandbox unshipped paid order, a shortage allocation, current order/stock versions, a stable operation ID and a reason. Existing submitted/in-review/approved requests block duplicate initiation and are linked for continued review. Recommit is blocked while a cancellation review is active. Customer submission and staff initiation serialize on the same order; the existing active-request constraint remains authoritative. Reasons and uncertain operations are retained for exact receipt lookup/retry; changed operation IDs/intents or stale versions do not create additional reviews.

Migration 0048 adds a nullable `initiated_by` to existing requests and an immutable `stock_resolution_reviews` receipt table. Existing request initiators are left unknown/null; no historical source is invented. Customer/admin response models expose only an `initiated_by_staff` flag, not the internal actor UUID. Staff/customer request detail views show the source explicitly, and the original tracking event retains the staff-origin marker after later public replies. Old APIs/tests without the new nullable column remain readable.

Request creation, order version, staff receipt, actor/reason audit, customer notice and deduplicated outbox commit together. Exact retries return the original submitted receipt even if review has subsequently progressed. Customer views remain owned and cannot read staff operation receipts. This stage does not add email/SMS or external messaging.

After submission, the established human review, approved paid cancellation, stock release and independent finance refund workflows apply. These remain separate decisions with their existing permissions and sandbox labels. Simulated refunds transfer no real money.

## Verification and limits

Database checks cover immutable/replayed/conflicting operations, version conflicts, existing-request collisions, unchanged stock/money, staff provenance after approval, ordinary cancellation, permission removal, atomic rollback, active-review recommit blocking and consumed-once background events. Client contract tests validate order/request/operation identity, exact intent, submitted state/source and unknown-result recovery.

The isolated browser fixture imports a new synthetic confirmed late-paid order, uses counted stock plus scoped reservation release, recorded synthetic damage and late stock confirmation to create the shortage, then exercises staff initiation → lost-result receipt recovery/replay → explicit human approval → cancellation → separate simulated refund → owned customer source tracking. It never modifies another demo order or any main business record, and does not claim real gateway payment acceptance.

Unpaid/unknown-payment cancellation completion, asynchronous payout/provider uncertainty, settlements, checkout tax/shipping/policy acceptance, artist workflows and full 56-view integrated acceptance remain pending. Missing historical identities are not backfilled; an active request must be resolved through its own review rather than overwritten.

Final 0048 verification: 666 backend / 381 frontend tests, production build/typecheck/lint and two deployed browser journeys passed. Main/demo services healthy; main review/provenance counts zero. Restored-copy migration preserved existing values, adding only nullable provenance and the empty receipt table.
