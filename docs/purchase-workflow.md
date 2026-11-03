# Purchase documents and stock receipts

Sandbox workflow implemented at `/fa/admin/purchases` and `/en/admin/purchases`. Existing `/admin/inventory/purchases` and `/admin/inventory/receipts` entries open the same workspace; `/admin/purchases/:id/receipts/new` opens the document's receipt controls. Every read and command requires `inventory.manage`; commands additionally refresh account permission, Origin and CSRF checks.

## Recorded behavior

- Searchable, paginated purchase drafts with supplier lookup and material/finished-SKU lookup. All quantities are explicitly in the recorded base unit. All prices, line discounts and supplier-billed acquisition costs are explicit decimal strings in IRT. No blank value silently becomes zero.
- Drafts can change until posting. Posting freezes item identities, unit/name snapshots, amounts and supplier identity, and records purchase liability independently of receiving goods. Posted content cannot be silently overwritten or deleted.
- Partial receipts cannot exceed the ordered quantity. Incoming stock and value are committed with the receipt and audit/outbox event. Existing stock uses moving weighted-average valuation; first receipt establishes a position only for the explicitly received goods.
- Cost allocation uses cumulative six-decimal rounding so the final receipt absorbs rounding remainder. Line discounts and supplier-billed direct acquisition costs are included in the incoming valuation.
- Returns must identify an eligible receipt and line from the same purchase. Cumulative returned quantity cannot exceed that receipt. Reserved/insufficient stock cannot leave. Supplier credit uses the original receipt's allocated cost; the stock reduction uses the current weighted average. The event exposes their valuation difference, without pretending a financial payment has occurred.
- Source document, event and stock movement IDs retain traceability. Purchase-generated movements cannot be reversed from manual stock adjustments. Cancellation is a linked document event and is allowed only before any goods have been received; received goods require a receipt-linked return.
- Supplier pages expose paginated purchase statements, explicitly labeled as purchase liability excluding payments. Full supplier financial balances, cash/bank payments and statement exports remain pending finance implementation.
- Immutable command receipts bind actor, document, expected version and complete intent. Repeated requests return the original result; changed intent and stale versions conflict. UI retains rejected inputs, supports latest-version comparison, and checks/retries the same operation after an uncertain result. Private state clears on session changes.

## Limits and outstanding work

No external provider calls, production, customer checkout or real-money payments are introduced. Purchase-unit entry/conversion, non-supplier acquisition documents, financial payment allocation, general posted-document adjustments and complete supplier financial statements/exports are still pending. Drafts are retained in the open editor after failed requests; local browser storage is not used for private data. A browser reload before a confirmed save does not retain unsaved edits.

Migration 0038 is additive after 0037. Existing inventory is not inferred from old catalogue/order data. The complete integrated admin release remains unfinished.

## Verification

PostgreSQL tests cover separate posting/receipt effects, exact retries, stale versions, partial rounding, receipt limits, original-cost credit versus current stock cost, cross-document return rejection, source reversal protection, cancellation bounds, multi-line rollback, permission/CSRF checks and large-value stock history. The opt-in `purchases-live.spec.ts` creates synthetic suppliers/materials only in `nilart-demo`, then uses the actual UI/API/database for draft → post → partial receipt → linked return → stock/statement verification, including uncertain receipt recovery and Persian mobile layout.

## Deployment verification (2026-10-18)

Main and demo schema are at 0038. Main contains no synthetic purchase records. A database backup and restored-copy migration check preceded main activation; inventory-position content hashes remained unchanged. All nine main services, including scheduler, are healthy. The scheduler now dispatches the transactional outbox; all eight demo purchase events were both published and deduplicated by the worker. The demo workspace helper includes the scheduler profile when recreating/stopping its isolated workspace. These handlers acknowledge recorded changes and do not send external messages or perform money movements.

Final regression evidence: 595 backend tests, 343 frontend tests, thirty affected browser checks, lint, production build and the real isolated purchase browser journey passed. Wider release acceptance remains pending.
