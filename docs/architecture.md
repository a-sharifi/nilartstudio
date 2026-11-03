# Foundation architecture

Git root: the checkout directory. The original workspace called it `code/`.
Artwork was an external `design-prints/` sibling and is not included in this clone.

## Browser-audit corrections (2026-10-21)

The shared private client serializes each rotating CSRF bootstrap with its command; concurrent checkout-review effects can no longer invalidate each other. Session generation is captured before queuing and checked before dispatch/after responses. Errors release the queue without automatic retries. Reads remain concurrent. This page-local queue does not replace server authorization, version checks, command receipts or transaction safety. Mixed orders with physically delivered goods and outstanding digital delivery derive `partial`, preserving physical return eligibility until licensed files are released. No historical snapshots or ledger entries are rewritten. See `admin-browser-audit-2026-10-21.md` for actual evidence and remaining acceptance gaps.

## Backend

FastAPI presentation → application queries/ports → domain value objects/entities.
SQLAlchemy repositories implement ports; Alembic owns PostgreSQL schema changes.
Catalog products have many-to-many collection/category membership; public queries
return each product once and exclude unpublished associations. Prices are exact
Decimal values serialized as strings. Availability is not inferred from files.

PostgreSQL is authoritative. Redis is cache/rate-limit infrastructure and RabbitMQ
is Celery's broker. The outbox inserts in the caller's transaction; confirmed
publication can redeliver, so consumers deduplicate transactionally. Both publication
attempts and consumer retries are bounded. Only infrastructure ping is currently handled;
business handlers, monitoring and manual retry UI remain future work.

## Frontend

Next.js App Router hosts the imported Figma React components under `src/design`.
All 42 source CSS files are preserved byte-for-byte. Public catalog pages use a
live-data adapter; Next navigation is used in live mode. Browser-dependent export
initialization remains behind a client-only compatibility boundary. SSR rendering
of catalog content and extraction of route-specific layouts are not yet complete.

The source preview is under `design-reference`, not deployed and not a nested Git repo.
Private routes and simulated transaction flows require explicit demo mode until real
backend authentication and business workflows are connected. Production does not
simulate successful purchases. Generated OpenAPI types live in `packages/api-client`.

## Local operation

Compose keeps services internal and publishes only nginx on localhost. Optional
`scheduler` profile provides one beat instance. A separate test-only override exposes
PostgreSQL on localhost:15432 for isolated integration tests; do not use it in production.
Development storage uses a pinned source build because public MinIO images were
unavailable. Production requires a reviewed storage image and externally supplied TLS.

No production launch, real SMS, payment, refund or print-asset publication is performed.

## 2026-10-19 — Recorded cash and supplier allocations

Migration 0040 adds cash/bank accounts, explicit dated openings, receipts/payments, atomic transfers, categorized expenses, linked corrections and purchase-allocated partial supplier payments/refunds. Purchase receipt, liability, cash movement and revenue remain distinct; returns after payment create supplier credit until actual refund received is recorded. Independent read/write/export permissions, exact amounts, expected versions, stable operation recovery, audit and deduplicated outbox apply. Shared fa/en admin tables/filter/icon actions cover finance routes and aliases. Date-filtered cash flow and protected CSV exports are connected. See finance-workflow.md.

Verification: 615 backend tests and 347 existing frontend tests passed, plus three new finance client checks. Real isolated browser evidence verifies transfer/expense/correction, ambiguous response recovery, exact replay, CSV and mobile fa/en. Restored-copy additive migration preserves existing stock/purchases/production. No synthetic financial records or invented opening balances enter the main workspace. Full admin release remains unfinished: uploaded finance attachments, XLSX, gateway/customer/artist obligations, full reports and downstream checkout/fulfillment/refunds remain pending.

## 2026-10-19 — Historical operational reporting and XLSX

Added permission-controlled inventory valuation/low-stock, source movements, warehouse waste/corrections and production WIP/QC/cost reports with explicit event-time cutoffs. Historical thresholds and costs come from immutable events; incompatible quantities stay grouped by unit. Production estimates use pinned rates, actual costs stay separate, missing values remain unknown and historical reservation availability is explicitly withheld. Source links honor operational permissions and filters survive URL navigation. Dashboard inventory/WIP/low-stock/incomplete-cost metrics now use recorded reports; the stale integration placeholder was removed. CSV/XLSX exports include exact amounts, currency, complete filters and source/correction IDs under independent finance.export access. Financial document exports also support XLSX. No schema changes or synthetic main records. See operational-reporting.md.

Verification: full backend suite 621 passed; frontend suite 353 plus two new dashboard checks passed; targeted lint, production build and real isolated reporting browser evidence cover historical valuation, low stock, waste reversal, source navigation, XLSX, WIP completion and fa/en desktop/mobile. Full integrated admin acceptance remains unfinished; FIN-11/12 remain connected_partial.

## 2026-10-19 — Reviewed price proposals and explicit publication

Migration 0041 connects exact recipe-cost snapshots to explicit margin/fee/fixed-cost/rounding proposals, custom prices and simulated discounts. Proposals are saved/revised/rejected independently of publication. Expected versions, reviewed-calculation fingerprints, shared source locks and the existing SKU price version/audit reject stale inputs and prevent duplicate publication. Pending reads flag changed resource/recipe/public-price/bundle dependencies. Own immutable receipts recover unknown outcomes. Publication, audit and outbox are atomic; historical inventory/order costs remain separate. pricing.publish is independent of catalog.manage and now also gates the legacy manual SKU-price writer; catalogue-only controls are read-only. Shared fa/en admin UI, proposal routes and the existing dependency queue remain available. See price-proposals.md.

Verification covers six PostgreSQL pricing workflows, three client binding/recovery checks and a real isolated preview→draft→publication→lost-response recovery→stale rate→reviewed revision→rejection browser journey with fa/en desktop/mobile layouts. Restored-copy additive migration preserves stock, purchases, production, SKU prices and price audits. The full admin release remains unfinished; COST-08–10 remain connected_partial for family/group/bundle/scheduled review and full acceptance. An existing customer payment-filter test was updated to select the shared dropdown option through its actual interaction; customer behavior was unchanged.

### Sandbox payment inquiry boundary (0042)

`payments/admin.py` exposes permission-controlled sandbox payment reads and reasoned gateway inquiry commands. `payment_inquiries` retains immutable operation intent/before/result/actor receipts. A payment revision trigger covers callbacks and customer verification; per-key advisory/payment row locks serialize retries and concurrent gateway outcomes. Inquiry uses the existing eight-second synchronous sandbox adapter, keeps malformed/transport results unknown, commits payment/order/discount/outbox/receipt atomically and never creates stock, shipment, refund or settlement facts. Background inquiry jobs remain pending. See payment-inquiries.md.

### Order stock reservation boundary (0043)

`inventory/reservations.py` owns transaction-scoped checkout reservation, expiry, release and paid commitment. It shares the global stock lock with existing purchasing/production/manual writes. `order_stock_allocations` freezes checkout components and sale shares; `stock_reservation_events` is append-only transition history with per-position delta/after/reservation revision. Physical stock quantity/value/version is unchanged by a reservation; independent `reservation_version` prevents mixing holds with physical valuation movements. Existing customer order snapshots gain optional frozen components, with no legacy backfill. Payment callbacks and staff recommit lock payment/order before stock; scheduled expiry locks stock/allocation records only, avoiding a reverse order lock. External payment uncertainty remains separate from stock expiry. `nilart.inventory.expire` is scheduled every 30 seconds. Private staff/customer APIs and UI are described in order-stock-reservations.md.

### Shipment and dispatch boundary (0044)

`fulfillment` owns versioned parcels and immutable action receipts. Stock/order payment locks are shared with reservations; planned physical line quantities across active parcels are bounded before picking. Dispatch atomically consumes its frozen component quantities using `inventory.document_stock`, freezes actual weighted stock cost/movement IDs, updates the allocation's consumed-position map, derives the order aggregate and writes audit/customer notice/outbox. It does not post bank payments, gateway settlement or revenue. Owned parcel tracking omits staff/cost data. Reasons, expected versions and exact command keys make dispatch replay safe. Legacy/custom print lines without ready component identities are blocked. See fulfillment-workflow.md.

### Return inspection boundary (0045)

`fulfillment/returns.py` owns immutable inspections against approved requests and delivered shipment components. Global fulfillment and stock locks serialize quantity/cost recovery; original dispatch cost is allocated cumulatively without changing historical sale/dispatch snapshots. Healthy receipt creates a source-linked `fulfillment_return` stock movement; damaged disposition remains in the inspection, outside healthy stock. Request versions, audit, notification and outbox commit with receipt. Payment/refund completion is a separate boundary. Owned customer responses expose only quantities, component labels and receipt timestamps. See return-inspections.md.


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


### Catalogue profiles (0053, isolated integrated preview)

`catalog_profiles` stores versioned product/collection/SKU profile heads; immutable `catalog_profile_revisions` retain exact actor-owned commands/results and publication pointers. Profiles bind approved immutable public media, bilingual specifications and explicit SKU delivery/weight/return metadata. Their publication is independent of catalogue identity/price/stock. Public product detail reads only approved profiles with selected-SKU overrides; private print files continue through the existing protected media/file systems. Checkout consumption and frozen policy integration remain pending. See `catalog-profiles.md`.


### Managed artworks and accepted checkout (0054, isolated preview)

`catalog_artwork_documents` and immutable `catalog_artwork_revisions` isolate drafts/publication and actor-owned exact command receipts. Managed originals use the unique artwork ledger, prints reference existing SKU stock/prices, and licensed digital editions use protected order-file release. Accepted checkout fingerprints bind approved catalogue/profile revisions, address, configured shipping/tax, coupons and policy versions; `OrderSnapshot.checkout_terms` freezes these inputs. Component allocations distinguish physical stock from digital entitlements, allowing aggregated stock, mixed delivery and bounded original-value refunds without fake digital inventory. Shipment policy and customer-visible terms come from the accepted snapshot. Catalogue/file events use the existing deduplicating worker. See `artwork-checkout-integration.md` for contracts, migration and verification limits.
