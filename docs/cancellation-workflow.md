# Approved sandbox-order cancellations — 0047/0048

The existing order-request review screen now processes an approved cancellation as a separate operation. It requires an unshipped sandbox order, consistent payment evidence, frozen stock identities and an intact reservation allocation. Pending/unknown/failed/cancelled payments without a paid receipt may also be cancelled; their financial review stays approved and open. Contradictory paid evidence still blocks processing; shipped/delivered orders require returns. Missing historical stock is shown explicitly and is never invented.

A command has a stable ID, order/request versions and a reason. Fresh `fulfillment.manage` plus `orders.read_all` are required. Under the shared fulfillment lock, it locks payment, order/request and stock in the established order, stops all remaining draft/pick/QC/packed parcels through their existing command/event system, releases temporary/committed holds, and records cancellation. A shortage/released allocation transitions without manufacturing stock. Physical quantity, value and historical cost are unchanged. One immutable cancellation per order/request prevents repeated release.

Parcel events, stock reservation cancellation event, order/request versions, immutable cancellation receipt, actor/reason audit, customer notice and outbox commit atomically. A failed child/notification/outbox write rolls everything back. Exact retry returns the original receipt, including after financial completion; changed intent or stale versions are conflicts. Posted histories remain retained. Child parcel aggregate updates are transaction-internal; the cancellation exposes one final order version.

Cancellation does not issue a refund or mark payment failed/refunded. The request remains approved for finance. `/admin/finance/refunds` and its alias now include processed cancellations alongside inspected returns. Cancellation quantities and paid shares come from the original whole-order snapshot, without requiring return inspection for goods never shipped. Original shipping/tax choices, quote consent, refund limits, explicit financial closure and independent `payments.read`/`payments.refund` permissions remain unchanged. Payout remains explicitly simulated; no real transfer or fictional bank posting occurs.

Paid late-payment shortages use the customer's cancellation request and staff approval, then the same cancellation/refund workflow. The stock workspace now links directly to the existing order requests and names cancellation release in its recorded history. There is no automatic financial decision or impersonated customer request. Repeated callbacks cannot reacquire cancelled stock or erase the recorded refund.

Customer order status, stock confirmation and in-app notices distinguish cancellation/stock release from refund. Customer refund receipts are still owned and omit staff/internal cost data. Persian/English screens retain shared controls, icon actions, private-cache clearing, draft/unknown-result guards and mobile behavior.

## Verification and limits

Real database tests cover packed parcel cancellation, physical/value preservation, idempotent release/refund, stale intent, uncertain payment, prior shipment, rollback of child events/stock, independent permissions, consumed-once background events, actual expiry→late-paid shortage→cancellation→refund and repeated bundle SKU/standalone aggregation (nine held units release once, refund uses frozen paid shares after catalogue edits).

The isolated browser journey begins with a newly imported synthetic paid order (no external gateway payment), real counted demo stock/reservation and packed parcel. It submits the customer's owned cancellation request through the actual API, approves in the staff UI, loses a committed cancellation response, recovers/replays once, checks stock/parcels and completes the separate finance refund and customer tracking. Existing business records are preserved.

Staff-originated shortage reviews and operational cancellation for unpaid/unknown payments are now implemented. Final no-payment financial closure, real/asynchronous payout adapters and settlement reconciliation, full checkout policy acceptance and the complete 56-view release remain pending. Legacy records missing frozen stock/paid identities require manual resolution; this stage performs no backfill or silent correction.

Final 0047 evidence: 663 backend / 379 frontend tests, build/typecheck/lint, isolated live cancellation/refund journey and final bilingual desktop/mobile stock/request screen checks passed. Main/demo services healthy and ready; main has zero synthetic cancellation records.

## Unpaid and uncertain payment cancellation extension — 2026-10-20

Approved operational cancellation releases temporary stock holds without altering pending/verification/failed payment state or claiming a refund. The approved request remains open for financial reconciliation. A later authoritative payment success adds its original receipt and makes the existing cancelled request eligible for the separate simulated refund workflow; it never reacquires stock or reopens fulfillment. Callback replay after refund preserves the refund. An unknown payment followed by a non-OK browser callback is verified with the provider; another unknown response remains unknown.

No schema migration or historical rewrite is required. The existing immutable cancellation receipt, audit/outbox and permission/version/retry rules apply. The staff UI allows this operation, explains the remaining financial review in both languages and shows refund navigation only once payment is confirmed. Final administrative closure when no payment ever occurs is still pending.

Evidence: four database-backed pending/unknown/failed/cancelled-payment journeys cover cancellation → late success → original-allocation refund → callback replay, physical stock/cost preservation and unchanged financial state at cancellation. Unknown-provider response after non-OK callback is also covered. The isolated unpaid browser fixture creates only new synthetic demo records; it does not contact the gateway or simulate a real money transfer.

Unused coupon holds are released in the cancellation transaction; existing redeemed usage stays historical. A late authoritative payment redeems its released original usage. The refund queue requires confirmed payment; unpaid cancelled requests remain visible in order/payment review. Final focused tests cover these transitions.

Unpaid cancellation verification: full backend suite 670 passed; final cancellation/refund focused suite 20 passed and queue/coupon cancellation recheck 10 passed. Frontend 382 passed, typecheck/build and scoped lint passed. Isolated real-database unpaid browser journey passed in fa/en at 390/1440 widths; Persian mobile screenshot reviewed. No migration; schema remains 0048. This remains a partial sandbox release.

Deployment verified on main (`localhost:8080`) and isolated demo (`127.0.0.1:18080`): readiness 200, API/web/worker/scheduler healthy, schema 0048 unchanged, main cancellation records remain zero. Post-deployment read-only browser recheck passed in both languages and widths. The mutating and post-deployment journeys passed separately; late payment/refund cases use database-backed sandbox gateway mocks. No real external payment or refund was performed.

2026-10-20 update: explicit no-payment financial closure after fresh confirmed rejection, and reopening on later uncertainty/success, are now implemented in schema 0049. See [financial closure](cancellation-financial-closure.md). Earlier pending notes describe their original stage.
