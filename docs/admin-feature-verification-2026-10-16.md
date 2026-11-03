
### 2026-10-19 — Payment inquiry verification

0042 connects sandbox payment inquiry list/history and order embedding with fresh independent permissions, stable receipts, gateway outcome/revision conflicts and uncertain-result recovery. Malformed payloads no longer imply failure. Verification: 630 backend tests, 361 frontend tests, production build/lint; isolated live browser inquiry response dropped after commit, own receipt recovered, exact replay left one history entry, order stayed on hold; fa/en 390/1440 and finance alias passed. Main/demo services healthy; main inquiry table empty; restored-copy migration preserved business snapshots. See payment-inquiries.md for scope and remaining dependencies.

### 2026-10-19 — Atomic physical stock commitment verification

0043 checkout stock fingerprints, repeated bundle/standalone SKU aggregation, append-only reservation history, configured expiry task, unknown/late payment shortage and reasoned actor-owned staff recommit receipts are connected. Frozen component paid shares sum to the original line net amount and survive price changes. Real last-unit and last-coupon concurrent winners, rollback, expiry, duplicate callback and permission checks passed. Verification: 638 backend tests / 368 frontend tests, production build/typecheck/lint, five browser checks including the isolated real stock-opening→zero-payment order→commitment→fa/en 390/1440 staff/customer journey. Restored-copy migration preserved recorded business snapshots. Main receives no synthetic stock/orders; full shipment/tax/policy/refund/settlement acceptance remains pending. See order-stock-reservations.md.

### 2026-10-19 — Partial parcel preparation/dispatch/delivery

0044 adds persisted bounded parcel plans, pick/QC/pack, actual component stock/weighted-cost dispatch, recorded delivery, tracking corrections, labels and owner-only customer tracking/notices. Source stock/report links recognize fulfillment and independent permissions. Seven browser checks passed on the final build, including a real isolated two-parcel journey with a lost committed dispatch response recovered/replayed once, changed incoming stock cost between parcels, preserved historic cost, order status derived to delivered, labels excluding cost/audit, and cross-account privacy. 372 frontend tests, production build/typecheck/lint passed. Restored-copy 0044 migration preserved old stock, purchase, production, price/audit and reservation records. Custom print, checkout policy completion, returns/refunds, profit and settlement remain pending. See fulfillment-workflow.md.

Final 0044 backend suite: 642 tests passed. Main/demo deployment verified at 0044 with healthy API/web/worker/scheduler; main shipment/event/dispatch counts zero, no synthetic main data. Guest fulfillment reads 401/no-store and preserved fa/en/alias routes passed. All prior scope exclusions and pending return/refund/custom print/policy/finance workflows remain explicit.

### 2026-10-19 — Approved return receipt and inspection (0045)

Shipment/component-bounded, append-only inspections restore healthy inventory at original dispatch cost and record damaged disposition separately. Receipt/version/audit/customer notice/outbox are atomic, exact replay is safe, and customer inspection data excludes staff identity and costs. The isolated real checkout-to-two-parcel journey and approved synthetic legacy-return inspection passed, including lost-response receipt recovery, exact replay, changed inventory costs and owned customer outcomes. Persian/English desktop/mobile screens and the `/admin/returns/:id` alias passed on the final build; completed requests show history without inert forms.

Final verification: 647 backend tests, 374 frontend tests, production build/typecheck and targeted lint passed. Three deployed browser checks passed: shipment journey, return inspection journey and completed-screen fa/en desktop/mobile review. The restored-copy 0045 migration preserved existing stock/purchase/production/price/reservation records; private backup is `backups/pre-return-inspections-20261019T141919Z.dump`. Main and isolated demo are at 0045 with healthy API/web/worker/scheduler, readiness 200; unauthenticated inspection reads are 401/no-store. Main has zero synthetic inspection records.

ORDER-04 remains connected_partial. Customer policy acceptance/submission, request closure, cancellation completion, bounded refunds, settlements and full waste/profit reporting remain pending. The synthetic approved return fixture does not claim those workflows passed. See return-inspections.md.


### 2026-10-20 — Original-allocation simulated refunds (0046)

Final verification: 657 backend tests, 377 frontend tests, production build/typecheck and targeted lint passed. The isolated database-backed finance browser journey exercised a newly imported synthetic paid order with real reservation/fulfillment/inspection services, partial/full refund, a deliberately lost committed response, exact receipt recovery/replay, explicit request closure, unchanged stock and private customer receipts. Final fa/en desktop/mobile screens and both refund aliases passed after receipt wrapping was corrected. No actual provider payout was performed.

Restored-copy migration preserved every pre-existing public table; private backup: `backups/pre-refunds-20261020T053822Z.dump`. Main/demo are healthy at 0046, readiness 200. Unauthenticated refund reads return 401/no-store. Main contains zero synthetic refunds. FIN-08 remains connected_partial: cancellation/shortage refunds, real/asynchronous adapter reconciliation, gateway settlement, broader profit reporting and complete checkout policy acceptance remain pending. See refunds-workflow.md.


### 2026-10-20 — Approved paid cancellations and shortage refunds (0047)

663 backend tests, 379 frontend tests, production build/typecheck and targeted lint passed. Latest targeted cancellation tests also verify consumed-once cancellation/reservation events and explicit legacy-stock guards. The isolated browser journey passed customer-owned submission → staff review/approval → packed parcel cancellation → deliberately lost committed response → exact receipt recovery/replay → separate original-allocation simulated refund → customer cancellation/stock/refund tracking. A second final-build browser check verified completed fa/en desktop/mobile screens and stock-history/request links. No real payment/payout was performed.

Restored-copy migration preserved every existing public table. Private backup: `backups/pre-cancellations-20261020T055053Z.dump`. Main/demo are healthy at 0047 with readiness 200; unauthenticated cancellation reads are 401/no-store. Main cancellation count is zero; all synthetic journey data stays isolated in nilart_demo. Existing order snapshots, physical stock/value, paid receipts and recorded histories remain preserved.

ORDER-02 / FIN-08 remain partial. Unpaid/unknown-payment cancellation completion, staff-originated financial requests, real payout/settlement, checkout policy acceptance, artist workflows and complete 56-view integrated acceptance remain pending. See cancellation-workflow.md.


### 2026-10-20 — Staff-originated shortage reviews (0048)

666 backend tests, 381 frontend tests, build/typecheck and targeted lint passed. Final targeted checks also cover a command ID colliding with an existing customer request. The isolated database-backed browser journey verified staff initiation without stock/money changes, deliberately lost committed response, exact receipt recovery/replay, explicit staff origin, independent human approval, cancellation and simulated refund, then owned customer provenance. A second final-build check verified completed staff-origin labels in fa/en desktop/mobile and stock-history/request links. No real provider transaction was performed.

Restored-copy migration preserved all pre-existing values; comparison excludes only the newly added nullable provenance field. Existing initiators remain null. Private backup: `backups/pre-stock-resolution-20261020T060347Z.dump`. Main/demo are healthy at 0048 and readiness returns 200. Unauthenticated resolution reads are 401/no-store. Main contains zero stock-resolution review receipts and zero newly attributed staff initiators; all synthetic data remains isolated. Full 56-view release, unpaid/unknown cancellation completion, providers/settlements, checkout policy acceptance and artist workflows remain pending. See stock-resolution-reviews.md.


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

## 2026-10-20 — 0051 supplier opening settlements

- Database suite: 685 passed before final unrelated-reversal regression; focused final opening-settlement suite: 5 passed, including that regression. Shared cash, purchase and opening histories remain separate.
- Frontend contracts: 7 focused tests passed, including old financial-intent compatibility and exact opening proof matching. Typecheck, lint and production build passed.
- Isolated real-database browser journey passed: fresh synthetic supplier debt100/cash500, payment40 with lost response, exact receipt recovery/replay, cash460 and due60, linked reversal restores cash500 and due100, supplier statement100. Persian/English at390/1440 passed overflow checks; screenshots reviewed. A recovered-receipt history-refresh bug found in this journey was corrected before acceptance.
- Migration0051 was tested against a private restored main database: every field of every pre-existing public table retained its hash. Backup: `backups/pre-opening-settlement-20261020T114945Z.dump` (private). Main migration adds an empty allocation table and no business records.
- Contract: `supplier-opening-settlements.md`. Full 56-view acceptance and external payment/settlement integrations remain pending.

Final frontend suite: **400 passed across 100 files**. Main and isolated demo migrated to0051; API, web, worker, scheduler and supporting services healthy. Both readiness probes return200; anonymous opening-settlement reads return401 with no-store. Main opening allocation count remains0. The final unrelated-reversal guard was verified by the focused five-test database suite after the wider685-test pass.

## 2026-10-20 — combined supplier balances (schema0051)

- Full backend suite: **690 passed**. Final report suite: **4 passed**, including UTC export metadata after the export refinement. Covers distinct opening/purchase allocations, parity with statements, configuration gaps/zero/credit, cancellation, stale pages/exports, incomplete history and independent finance read/export access.
- Full frontend suite: **405 passed in102 files**. Final typecheck, lint, production build and backend scoped lint passed. Shared filters, tables, buttons and icon actions are reused.
- Final isolated real-database browser journey passed: new demo supplier opening100 minus cash25 gives75; a second supplier remains explicitly unconfigured; CSV/XLSX include filtered source identities; changing opening100→20 invalidates the old export and yields credit5 without changing cash475. Statement source links work. Persian/English390/1440 screenshots passed overflow checks; Persian mobile reviewed and balance/payment cells adjusted to stack clearly.
- No schema migration or main business-data insertion. Current-position report is capped at1000 suppliers with explicit failure, not truncation. Aging, customer/gateway/artist obligations and full integrated release acceptance remain pending. See `supplier-balances-report.md`.

Deployment complete: main/demo readiness200; anonymous report401/no-store; main API/web/worker/scheduler healthy. Schema0051 and main opening allocation count0 confirmed after rollout.

## 2026-10-20 — historical supplier positions and navigation

- Full backend suite **692 passed**; historical report/statement focused suite **10 passed**. Tehran day boundaries include20:29:59.999999UTC and exclude the next day at20:30UTC, with separate opening/purchase payments, linked cash reversals, purchase cancellation and later opening corrections. Historical report amounts match supplier statements. Later activity leaves earlier report fingerprints unchanged; export fingerprints bind the selected day; malformed/future dates reject.
- Full frontend suite **412 passed across103 files**. Final typecheck, lint, production build and backend scoped lint passed. Tests bind report/API/export dates, validate and encode URL filters, restore shared date/search, preserve input after invalid changes and initialize linked statement dates.
- The integrated browser journey exposed a shared history-guard bug: synchronously approved callbacks were ignored and clean Back navigation was restored as if denied. The guard now honors immediate approval while preserving deferred approval, cancelled traversal and session-change protection; three focused navigation tests passed.
- **Two final real-database demo browser journeys passed**: the existing combined-cash report/export/source workflow, plus historical before/after opening configuration, dated exports, reload, statement cutoff, browser Back with restored filters, dismissed dirty-form confirmation retaining inputs, clean Back acceptance, future-date rejection and Persian/English390/1440 layouts. Persian mobile screenshot reviewed.
- No migration or financial/stock mutation; schema0051 unchanged. Due-date aging and full integrated release acceptance remain pending. See `supplier-balances-report.md`.

Historical extension rollout verified: main/demo readiness200; dated pages private/no-store and anonymous dated report401/no-store. Main API/web/worker/scheduler healthy, schema0051, opening allocations0.
