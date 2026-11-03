# Integrated admin sandbox release

Accepted scope: all 56 ADM/COST/OPS/FIN/ORDER views and customer/artist dependencies; full RFP phase 1 and phase 2, excluding FUT-01–03 and production activation. Use the RFP for rules, UI/UX specification for states and design-reference for presentation. Preserve Yekan Bakh, shared dropdowns, existing records and immutable snapshots.

## Delivery sequence

1. Business settings, common command safeguards, media and content.
2. Complete catalogue/SKU/bundle/artwork authoring; family recipes, cutting yield and price proposals/publication.
3. Stock ledger, reservations, procurement/partial receipts/returns and supplier balances.
4. Version-pinned production, consumption/WIP/QC/waste and operational finance.
5. Authoritative checkout, shipping/tax, reconciliation, fulfillment, inspection and historical refunds.
6. Commission quote/review/assignment/work/delivery, support workflow, reporting and cross-domain audit.
7. Real isolated browser journeys, AC-01–22, responsive fa/en acceptance, migration/restore verification and one integrated release.

Each command includes fresh authorization/Origin/CSRF checks, explicit intent/version, idempotent recovery and atomic business/audit/outbox records. No invented stock/cost/policies; an incomplete configuration remains incomplete. Exact server arithmetic; decimal-string API amounts with currency. Correct posted records through linked reversals. See admin-release-acceptance.md for the row-level matrix. Partial implementation must never be reported as the full release.

## Confirmed defaults

Separate resettable demo workspace, isolated database/storage/queues. Simulated labeled AI assessment with human review. Sandbox payments/refunds/settlements/SMS/shipping adapters only; no real-money transactions. Customer/artist dependency screens included. Historical/live records stay intact. Formal double-entry/legal tax integration and future features excluded.

## Current implementation

- Versioned /admin/settings editor and /api/v1/admin/settings API: identity/contact, fixed IRT currency, tax, reservation duration, return terms/window, shipping methods and basic commission amounts/terms. Missing fields remain null/blank and are listed explicitly. Immutable reasoned revisions, exact retry receipts, conflict comparison and private clearing.
- /admin/inventory, /admin/inventory/adjustments/new and /admin/inventory/positions/{id}: named SKU/material/original choices, recorded stock/value/available balances, opening/increase/decrease/waste/threshold commands, moving-average valuation, history and latest-movement linked reversals. Additive migrations 0034/0035 do not infer opening stock from catalogue data.
- /admin/content and approved-only public information pages: bilingual private drafts, explicit publish/unpublish, immutable reasoned revisions and conflict/unknown-save recovery. Public text is rendered as plain text; unapproved sample policies are not used as fallback. Rich page-specific sections and full public SSR/SEO remain pending.
- /admin/media: bounded validated PNG/JPEG/PDF uploads, immutable deduplicated blobs, metadata revisions, explicit image publication, permanently private print purpose, required SKU/size binding, protected old-version downloads and recovery workflows. Asset-to-gallery and production print-consumption integrations remain pending.
- Purchase receipts and receipt-linked supplier returns now use the stock ledger atomically. Production now issues/returns material and transfers QC-approved healthy output through the same ledger. Checkout is not connected yet. Reservation tracking, broader source-document integration, full media/content integration, catalogue/pricing, finance, fulfillment/refunds, commissions and reports remain unfinished. Settings are stored but not yet enforced by those downstream workflows. Do not mark the full release complete.

## Isolated demo workspace

Use `python infra/scripts/demo_workspace.py init`, then `build`, `up`, `migrate` and `seed`. The project is fixed to nilart-demo with nilart_demo database, separate volumes/network and origin http://127.0.0.1:18080. The separate hostname keeps demo login cookies independent of localhost:8080. The script never reads live .env; .env.demo is private (0600) and ignored. Seed refuses a non-demo database/origin/environment and creates only an audited synthetic administrator (+989121110001). Its generated password remains in .env.demo. Later workflows require explicit synthetic records; no live records are copied.

`status` lists the demo services. `stop` preserves data. `reset --confirm-demo-reset` removes only that project's containers and volumes; configuration is retained. Recreate services, migrate and seed after resetting. Reset is never part of a normal deployment.

Real-browser acceptance is opt-in via NILART_RUN_DEMO_TESTS=true and PLAYWRIGHT_BASE_URL=http://127.0.0.1:18080; the test refuses all other targets. It writes synthetic settings/material/stock/content/media records only in the isolated demo database. Full purchase/production/refund/commission journeys remain pending implementation.

## 2026-10-18 — Shared admin redesign

Introduced AdminFilters, AdminButton, AdminAction, AdminTable and typed AdminDataTable in Frontend/src/components/admin. All existing live admin feature tables and primary/secondary controls now use the shared components. Table row actions use labeled SVG icons with native titles, hover/focus tooltips and preserved accessible names. Filters are grouped, controls consistently sized, and mobile action columns remain visible during horizontal scrolling. Catalogue, account and support selectors no longer sit apart from their search forms. Price review, content and media use structured data tables. No business mutation, authorization or price calculation was changed by the redesign.

## Verification and local deployment

574 backend tests and 340 frontend tests pass. Shared admin redesign has 60 existing workflow browser checks plus five targeted fa/en desktop/mobile visual/semantic checks; 22 foundation browser workflows also pass. Two opt-in real database-backed journeys verify settings/stock and content/media using only synthetic demo data. Production build, type checking and lint pass.

A private backup preceded main-schema migration to 0037. Both main and demo services are healthy; main private APIs return 401/no-store to guests. Existing main records were preserved and no demo seed was run there. Shared admin components are documented in Frontend/src/components/admin/README.md. Full operational release acceptance remains pending; the UI/foundation deployment is not proof that downstream workflows are complete.

## 2026-10-18 — Cutting layout estimation

Recipe sheet lines now include a server-calculated uniform-grid layout with exact decimal sheet/piece dimensions, explicit per-edge margin and inter-piece gap, and fixed orientation unless rotation is explicitly allowed. The preview labels its limited method; unsupported/no-fit layouts never become automatic yields. A named workshop confirmation is required before copying the yield and complete geometry/orientation into the recipe draft's existing approval note. Saving uses the existing immutable recipe-version command, audit and uncertain-result safeguards. Source dimensions remain pinned to the resource revision; missing dimensions require resource setup. Manual workshop yields remain supported.

This extends COST-06 within the recipe editor; the standalone cutting page, mixed-layout optimization, reusable family BOM parameters and price proposals remain pending. No stock, production or published price is changed by calculation. API contract regenerated. Targeted verification: 29 backend checks, three recipe/calculator component checks, lint and production build pass; deployed recipe browser journey verifies confirmation and saved approval inputs.

## 2026-10-18 — Purchasing and receipt integration

OPS-05–07 now have persisted purchase drafts, explicit posting, immutable command receipts/history, partial goods receipts and receipt-linked supplier returns. Receipt valuation includes line discounts and supplier-billed direct acquisition costs and uses cumulative exact allocation. Stock movements carry source document/event IDs; supplier credit preserves original receipt allocation while stock exits at its current moving average, with variance visible. Supplier pages expose purchase-liability statements excluding payments. The shared admin tables/actions and fa/en responsive layout are retained. `/admin/purchases`, existing inventory aliases and receipt routes work; `/admin/suppliers` aliases the existing supplier workspace. See purchase-workflow.md for contracts, safeguards and outstanding finance/unit-entry dependencies.

Migration 0038 was tested against restored existing data before main sandbox activation. No synthetic demo records enter the main database. The opt-in real demo journey verifies persisted draft → posting → partial receipt → linked return → stock/statement, including lost-response recovery. Full admin release remains incomplete; production, finance/payment allocation, fulfillment/refunds and further catalogue/costing/commission/reporting work remain pending.

## 2026-10-18 — Production/WIP/QC integration

Production drafts pin immutable BOM revisions and target output. Running batches record actual material issues/returns and explicit service costs, preserve issued cost on returns, retain WIP and transfer healthy output only after QC. Normal waste is absorbed in output and abnormal damage is costed separately. Open-batch cancellation requires returned material or explicit WIP write-off. Production permissions are independent; immutable command receipts, audit/outbox, stock source links and lost-result recovery apply throughout. Existing production/batch/QC URLs alias the shared workspace; production losses are filterable. See production-workflow.md for method and remaining parent-order/scheduling/print/finance dependencies. Full integrated admin acceptance is still pending.

## 2026-10-19 — Recorded cash and supplier allocations

Migration 0040 adds cash/bank accounts, explicit dated openings, receipts/payments, atomic transfers, categorized expenses, linked corrections and purchase-allocated partial supplier payments/refunds. Purchase receipt, liability, cash movement and revenue remain distinct; returns after payment create supplier credit until actual refund received is recorded. Independent read/write/export permissions, exact amounts, expected versions, stable operation recovery, audit and deduplicated outbox apply. Shared fa/en admin tables/filter/icon actions cover finance routes and aliases. Date-filtered cash flow and protected CSV exports are connected. See finance-workflow.md.

Verification: 615 backend tests and 347 existing frontend tests passed, plus three new finance client checks. Real isolated browser evidence verifies transfer/expense/correction, ambiguous response recovery, exact replay, CSV and mobile fa/en. Restored-copy additive migration preserves existing stock/purchases/production. No synthetic financial records or invented opening balances enter the main workspace. Full admin release remains unfinished: uploaded finance attachments, XLSX, gateway/customer/artist obligations, full reports and downstream checkout/fulfillment/refunds remain pending.

## 2026-10-19 — Historical operational reporting and XLSX

Added permission-controlled inventory valuation/low-stock, source movements, warehouse waste/corrections and production WIP/QC/cost reports with explicit event-time cutoffs. Historical thresholds and costs come from immutable events; incompatible quantities stay grouped by unit. Production estimates use pinned rates, actual costs stay separate, missing values remain unknown and historical reservation availability is explicitly withheld. Source links honor operational permissions and filters survive URL navigation. Dashboard inventory/WIP/low-stock/incomplete-cost metrics now use recorded reports; the stale integration placeholder was removed. CSV/XLSX exports include exact amounts, currency, complete filters and source/correction IDs under independent finance.export access. Financial document exports also support XLSX. No schema changes or synthetic main records. See operational-reporting.md.

Verification: full backend suite 621 passed; frontend suite 353 plus two new dashboard checks passed; targeted lint, production build and real isolated reporting browser evidence cover historical valuation, low stock, waste reversal, source navigation, XLSX, WIP completion and fa/en desktop/mobile. Full integrated admin acceptance remains unfinished; FIN-11/12 remain connected_partial.

## 2026-10-19 — Reviewed price proposals and explicit publication

Migration 0041 connects exact recipe-cost snapshots to explicit margin/fee/fixed-cost/rounding proposals, custom prices and simulated discounts. Proposals are saved/revised/rejected independently of publication. Expected versions, reviewed-calculation fingerprints, shared source locks and the existing SKU price version/audit reject stale inputs and prevent duplicate publication. Pending reads flag changed resource/recipe/public-price/bundle dependencies. Own immutable receipts recover unknown outcomes. Publication, audit and outbox are atomic; historical inventory/order costs remain separate. pricing.publish is independent of catalog.manage and now also gates the legacy manual SKU-price writer; catalogue-only controls are read-only. Shared fa/en admin UI, proposal routes and the existing dependency queue remain available. See price-proposals.md.

Verification covers six PostgreSQL pricing workflows, three client binding/recovery checks and a real isolated preview→draft→publication→lost-response recovery→stale rate→reviewed revision→rejection browser journey with fa/en desktop/mobile layouts. Restored-copy additive migration preserves stock, purchases, production, SKU prices and price audits. The full admin release remains unfinished; COST-08–10 remain connected_partial for family/group/bundle/scheduled review and full acceptance. An existing customer payment-filter test was updated to select the shared dropdown option through its actual interaction; customer behavior was unchanged.

2026-10-19: Payment inquiry stage adds revisioned sandbox gateway inquiries, persisted actor/reason/before/result history and lost-response receipt recovery; see [payment inquiries](payment-inquiries.md). FIN-06/ORDER-02 remain partial pending stock-backed checkout, external worker recovery and downstream financial/fulfillment workflows.

2026-10-19: Schema 0043 adds atomic checkout/component stock reservations and a shared staff shortage review workspace, with configured expiry, immutable frozen sale shares and late payment handling; see [stock commitments](order-stock-reservations.md). Checkout requires explicit physical opening stock and a configured reservation duration. No historical reservations or costs are backfilled. Full shipping/tax/policy integration and fulfillment remain pending.

2026-10-19: Schema 0044 connects partial parcel preparation, picking/QC/packing, actual stock/cost dispatch, delivery and customer tracking. Staff can print a sandbox parcel label and record reasoned tracking corrections; stable command receipts recover lost dispatch responses. Source links from inventory/reports honor fulfillment permissions. See [fulfillment workflow](fulfillment-workflow.md). Custom private-print fulfillment, returns/refunds, full checkout policy and profit/settlement integration remain pending.


### Return inspection stage — 0045 (2026-10-19)

Approved returns now have shipment/component-bounded, original-cost healthy stock recovery, separate damaged disposition, immutable receipts, safe retry and owned customer tracking. Inspection does not issue money or close the request. ORDER-04 remains partial; FIN-08/refunds and full purchase-policy acceptance remain pending. See [return inspections](return-inspections.md).


### Original-allocation refund stage — 0046 (2026-10-20)

Approved inspected returns now support exact partial/full component refunds, explicit bounded shipping/tax, explicit closure, immutable local sandbox receipts, lost-response recovery and owned customer tracking. Payments read/refund permissions are independent of finance write. Refunds never move stock or post fictional bank movements. Partially refunded orders retain remaining-parcel dispatch. FIN-08 / ORDER-04 remain partial; cancellation/shortage refunds, provider/settlement reconciliation and complete checkout-policy acceptance remain pending. See [refund workflow](refunds-workflow.md).


### Paid cancellation and shortage financial resolution — 0047 (2026-10-20)

Approved paid cancellation now stops unshipped parcels, releases holds exactly once and records immutable operation/audit/customer history atomically. Separate finance refunds use original whole-order allocations, including paid late-stock-shortage orders, without return inspection for unshipped goods. Unknown payments and shipped/legacy-incomplete orders are blocked. Existing snapshots/physical stock/value remain preserved. This remains a partial release: unpaid/unknown cancellation completion, real payout/settlement and checkout policy work remain pending. See [cancellation workflow](cancellation-workflow.md).


### Staff-originated shortage review — 0048 (2026-10-20)

Stock-shortage detail now opens an explicitly staff-originated customer-visible cancellation review, with versions, immutable receipt/retry, independent permissions, audit/notification/outbox and active-request protection. It changes no stock or money and never auto-approves. Recommit waits for pending cancellation review. Nullable provenance preserves existing unknown history; staff origin survives approval and financial completion in customer/admin views. Unpaid/unknown payment cancellation, provider/settlement, checkout policy and artist work remain pending. See [stock resolution reviews](stock-resolution-reviews.md).


### Unpaid/uncertain cancellation extension — 2026-10-20

Approved unshipped sandbox orders can now release stock while payment remains pending, unknown or failed. Financial review stays open. Late confirmed payment retains cancellation and enters the existing original-allocation refund workflow without reacquiring stock; repeated callbacks preserve refunds. Unknown provider outcomes remain unknown even after non-OK browser return. Contradictory paid history remains blocked. No migration/backfill is needed. Final no-payment closure, external payout/settlement, full checkout policies, catalogue/artist dependencies and 56-view acceptance remain pending. See [cancellation workflow](cancellation-workflow.md).


### No-payment cancellation financial closure — 0049 (2026-10-20)

A processed cancellation can now be financially completed against a fresh recorded rejected gateway inquiry, with independent finance/payment/order permissions, optimistic versions, immutable receipt/recovery and atomic audit/notification/outbox. It moves neither money nor stock. Later success or uncertainty reopens review while preserving closure history; paid callbacks never erase refunds. Pending/unknown/browser-cancelled evidence alone cannot close. See [financial closure workflow](cancellation-financial-closure.md). Full release acceptance, external payout/settlement, full checkout policies, catalogue/BOM/artist/reporting work remain pending.


### Recorded supplier financial statements — 2026-10-20

Supplier statements now combine posted purchase/cancellation/return liability with recorded supplier payments/refunds and linked reversals, exact running subtotals, Tehran recording-date filters, stable paginated revisions and full-range CSV/XLSX exports. Finance-only access has its own `/admin/finance/suppliers/{id}` route; source financial documents support deep links. Missing opening supplier balance and incomplete history are explicit. This adds no migration or money/stock command. See [supplier financial statements](supplier-financial-statements.md). Opening debts/credits and complete release acceptance remain pending.


### Explicit supplier opening balances — 0050 (2026-10-20)

Finance can now confirm an external opening debt, credit or zero, with evidence, an excluded-recorded-activity acknowledgement, a frozen pre-activity date and reason. Corrections retain linked versions and signed deltas; cash, purchases and inventory are unchanged. Openings are integrated into statements, revised pagination and exports; unknown loading is distinct from missing setup. Migration 0050 creates no business data. See [supplier opening balances](supplier-opening-balances.md). Settlement against opening balances and full release acceptance remain pending.


### Supplier opening cash settlements — 0051 (2026-10-20)

Opening debt payments and credit receipts now use shared operational cash documents with exact remaining-balance bounds, current opening/allocation/account version checks, retained uncertain commands and linked reversals. Corrections preserve prior cash; dependent corrective entries must be reversed first. Supplier statements include opening allocations independently of purchase balances. The bilingual responsive workspace uses shared table and icon actions at `/admin/finance/suppliers/{id}/settlements`. Migration 0051 creates no business records. See [opening settlements](supplier-opening-settlements.md). This remains a partial sandbox release; external transfers and complete integrated acceptance are pending.


### Combined supplier balances — 2026-10-20 (schema0051 unchanged)

Finance now has a shared-table report combining supplier openings, purchase liabilities and distinct purchase/opening cash allocations, with missing setup explicitly excluded from confirmed debt/credit totals. Literal bilingual search, balance-state filters, stable pagination, guarded CSV/XLSX export and icon links to statements/settlements use independent finance permissions. One database snapshot verifies source purchase history; stale or incomplete reports reject. Archived balances remain visible. No migration, stock, cash or business-data mutation. See [supplier balances report](supplier-balances-report.md). Customer/gateway/artist obligations, aging and full release acceptance remain pending.


### Historical supplier balances and retained filters — 2026-10-20

The supplier report supports an optional recorded-through date in Tehran, reconstructing purchase/opening changes and cash/reversals without later events. Missing openings remain missing until their recording date. Pagination and exports bind the date; shareable URL filters survive reload/back, and linked statements use the same cutoff. Supplier identities remain current and are labeled accordingly. No migration or ledger mutation; schema0051. See [supplier balances report](supplier-balances-report.md). Due-date aging, other counterparties and full release acceptance remain pending.


### Integrated catalogue preview0052 — 2026-10-20

The requested full56-view release is in progress. The source has a verified managed bundle editor/publication/gallery/history/receipt workflow, percentage quotes and ledger-backed selected capacity, plus BOM/material edit aliases and standalone cutting workbench. Independent catalogue/price publication permissions apply. Final699 backend /418 frontend tests and two real isolated browser journeys pass; restored-copy migration preserves existing tables. Main remains stable0051; only demo uses0052 via integrated-preview.override.yaml. See `bundle-authoring.md`, `admin-integrated-release-progress.md` and `admin-integrated-acceptance.json`. Catalogue/SKU commerce profiles, artwork authoring, settings-backed checkout, family costing/production dependencies, gateway/profit/artist/support/recovery workflows and final release acceptance remain unfinished. No complete release or main rollout is claimed.


## 2026-10-21 integrated preview0054 checkpoint

Artwork authoring and settings-backed checkout/digital-mixed delivery are verified in isolated preview0054. Main remains stable0051. Use the integrated-preview compose override and current integrated-catalogue image tags.718 backend /430 frontend checks, build/typecheck/lint, restored-data migration and three live browser journeys passed; see `artwork-checkout-integration.md`. This is a dependency-stage preview and does not authorize declaring or rolling out the complete56-view release.
