# Original-allocation sandbox refunds — 0046

Admin `/admin/finance/refunds` and `/admin/refunds` now show received approved returns and immutable refund receipts. Request details accept component quantities, optional original shipping/tax charges, an exact server quote, a reason and explicit sandbox confirmation. Completed requests retain their receipts. Both languages, shared panel tables, icon row actions, keyboard controls and mobile layout apply.

This is a **local simulated adapter**. It sends no provider request, transfers no real funds, posts no fictional bank/cash movement and does not claim a real gateway confirmation. Every receipt carries `local_sandbox` and `SIMULATED-REFUND-…`, original payment/reference, order/request IDs, exact currency amounts and paid-share allocations. It runs only in development sandbox mode on sandbox orders. Production activation remains excluded.

## Bounds and transactions

Only approved return requests with confirmed original payment and recorded inspections can refund item quantities. Available quantity is bounded by this request's inspected/approved quantity and all previous refunds of the frozen component. Repeated bundle components keep independent identities even when they share a SKU. Original component `paid_amount` includes historical discounts; today's catalogue and replacement prices are not consulted. Cumulative two-decimal allocation exhausts each original paid share exactly across partial refunds. No component or money is invented for missing legacy snapshots.

Original shipping and tax are separate, explicit choices, each bounded by the original charge minus prior refunds. Closing a request is explicit and requires all its approved component quantities to be resolved. Charge-only and completion-only actions remain possible before closing. Zero-paid quantities can be resolved with a zero-value receipt; no monetary payout is implied.

Commands use order/request versions, an exact quote fingerprint/amount, a stable UUID and a reason. Fresh `payments.refund` plus `payments.read` are required; ordinary finance write access is insufficient. Read access is independently `payments.read`, including navigation. Writes share the fulfillment lock and lock payment before order/request, avoiding reverse payment lock order. Receipt, aggregate refunded payment state, request closure/version, actor/reason audit, notification and deduplicated outbox are atomic. Identical retries return the original receipt; changed/stale/excess commands fail. Client uncertainty retains the exact command for receipt lookup/retry. No stock is moved by refunds.

Partially refunded orders can still prepare/dispatch their remaining paid parcel. Repeated payment callbacks preserve the refund state and original payment record; a refund does not rewrite the original paid receipt. Historical order snapshots and dispatch cost remain intact.

Customers see only their own refund references, amounts, quantities, currency and date, explicitly labeled simulated. Staff reasons, actor identities, source costs and provider references are excluded.

## Verification and remaining scope

Database regression covers partial/full refund, replay/conflicting intent, stale quote/versions, original prices, inspected quantity bounds, charge bounds, explicit completion, zero-paid resolution, rounding, permission revocation, rollback, customer ownership, duplicate payment callbacks, remaining-parcel dispatch and background-event deduplication. Frontend contract tests check scope, amount, intent, selected quantities and unknown-result recovery.

The isolated browser fixture imports a **new, visibly synthetic paid order** rather than contacting a gateway. It uses real reservation, fulfillment and inspection services with counted synthetic opening stock/cost before exercising the finance screen. No existing order or business data is rewritten. This verifies the refund workflow, not real external payout or full checkout-policy acceptance.

Still pending: cancellation completion/stock release and cancellation refunds, late-payment shortage refunds, real/asynchronous provider adapters and financial uncertainty reconciliation, independent gateway settlement/bank reconciliation, broader profit/waste reporting and the full integrated 56-view release. Closed requests need a separate authorized correction workflow; posted receipts cannot be edited or deleted.


Final verification (2026-10-20): 657 backend / 377 frontend tests; production build/typecheck/lint; live refund journey plus final bilingual desktop/mobile receipt review. Restored-copy 0046 migration preserved all previous public tables. Main and demo API/web/worker/scheduler healthy, main refund count zero.
