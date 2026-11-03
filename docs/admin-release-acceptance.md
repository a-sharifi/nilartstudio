# Integrated sandbox release acceptance matrix

One release; implementation and acceptance proceed in dependency order. The existing register is historical evidence, not proof of full workflow completion. Every row requires persisted behavior, permission checks, fa/en responsive UI and integrated acceptance before release.

| View | Route | Recorded baseline | Release acceptance |
|---|---|---|---|
| ADM-01 — داشبورد ادمین / Admin Dashboard | `/admin` | connected_partial | Pending integrated acceptance |
| ADM-02 — مدیریت کالکشن / Collections Admin | `/admin/collections` | connected_partial | Pending integrated acceptance |
| ADM-03 — مدیریت دسته / Categories Admin | `/admin/categories` | connected_partial | Pending integrated acceptance |
| ADM-04 — فهرست محصولات / Products Admin | `/admin/products` | connected_partial | Pending integrated acceptance |
| ADM-05 — فرم محصول / Product Editor | `/admin/products/:id/edit` | connected_partial | Pending integrated acceptance |
| ADM-06 — گزینه‌ها و SKU / Variant Matrix | `/admin/products/:id/variants` | connected_partial | Pending integrated acceptance |
| ADM-07 — مدیریت پکیج / Bundles Admin | `/admin/bundles` | connected_partial | Pending integrated acceptance |
| ADM-08 — فرم پکیج / Bundle Editor | `/admin/bundles/:id/edit` | missing | Pending integrated acceptance |
| ADM-09 — کدهای تخفیف / Discounts Admin | `/admin/discounts` | connected_partial | Pending integrated acceptance |
| ADM-10 — فرم کد تخفیف / Discount Editor | `/admin/discounts/:id/edit` | connected_partial | Pending integrated acceptance |
| ADM-11 — رسانه و فایل چاپ / Media Library | `/admin/media` | missing | Pending integrated acceptance |
| ADM-12 — آثار نقاشی / Artwork Admin | `/admin/artworks` | connected_partial | Pending integrated acceptance |
| ADM-13 — کاربران و دسترسی / Users & Roles | `/admin/users` | connected_partial | Pending integrated acceptance |
| ADM-14 — هنرمندان / Artists Admin | `/admin/artists` | connected_partial | Pending integrated acceptance |
| ADM-15 — محتوا و پشتیبانی / Content Admin | `/admin/content` | missing | Pending integrated acceptance |
| ADM-16 — تنظیمات کسب‌وکار / Business Settings | `/admin/settings` | missing | Pending integrated acceptance |
| COST-01 — فهرست مواد / Materials | `/admin/materials` | connected_partial | Pending integrated acceptance |
| COST-02 — تعریف ماده و تبدیل واحد / Material Editor | `/admin/materials/:id/edit` | connected_partial | Pending integrated acceptance |
| COST-03 — نرخ خدمات / Service Rates | `/admin/service-rates` | connected_partial | Pending integrated acceptance |
| COST-04 — فرمول‌های ساخت / BOM Library | `/admin/boms` | connected_partial | Pending integrated acceptance |
| COST-05 — ویرایش فرمول ساخت / BOM Editor | `/admin/boms/:id/edit` | connected_partial | Pending integrated acceptance |
| COST-06 — بازده برش و ضایعات / Cutting Yield | `/admin/costing/cutting` | connected_partial | Pending integrated acceptance |
| COST-07 — محاسبه‌گر هزینه SKU / SKU Cost Calculator | `/admin/costing` | connected_partial | Pending integrated acceptance |
| COST-08 — قیمت پیشنهادی SKU / Price Proposal | `/admin/pricing/:sku` | foundation | Pending integrated acceptance |
| COST-09 — صف بازبینی قیمت / Price Review Queue | `/admin/pricing/reviews` | connected_partial | Pending integrated acceptance |
| COST-10 — تأیید انتشار و تاریخچه / Price Publication | `/admin/pricing/reviews/:id` | foundation | Pending integrated acceptance |
| OPS-01 — نمای انبار / Inventory | `/admin/inventory` | prototype | Pending integrated acceptance |
| OPS-02 — گردش و رزرو موجودی / Stock Ledger | `/admin/inventory/:item/movements` | missing | Pending integrated acceptance |
| OPS-03 — موجودی افتتاحیه و اصلاح / Stock Adjustment | `/admin/inventory/adjustments/new` | missing | Pending integrated acceptance |
| OPS-04 — تأمین‌کننده و مانده / Suppliers | `/admin/suppliers` | connected_partial | Pending integrated acceptance |
| OPS-05 — فهرست خرید / Purchases | `/admin/purchases` | missing | Pending integrated acceptance |
| OPS-06 — سند خرید / Purchase Editor | `/admin/purchases/:id` | missing | Pending integrated acceptance |
| OPS-07 — تحویل و برگشت خرید / Purchase Receipt | `/admin/purchases/:id/receipts/new` | missing | Pending integrated acceptance |
| OPS-08 — دستورهای تولید / Production Orders | `/admin/production` | missing | Pending integrated acceptance |
| OPS-09 — اجرای بچ تولید / Production Batch | `/admin/production/:id` | missing | Pending integrated acceptance |
| OPS-10 — کنترل کیفیت و پایان تولید / Production QC | `/admin/production/:id/qc` | missing | Pending integrated acceptance |
| OPS-11 — ضایعات و خرابی / Waste & Damage | `/admin/waste` | missing | Pending integrated acceptance |
| FIN-01 — داشبورد مالی / Finance Overview | `/admin/finance` | prototype | Pending integrated acceptance |
| FIN-02 — دریافت و پرداخت / Cash Movements | `/admin/finance/movements` | missing | Pending integrated acceptance |
| FIN-03 — بانک و صندوق / Accounts & Balances | `/admin/finance/accounts` | missing | Pending integrated acceptance |
| FIN-04 — هزینه‌های جاری / Operating Expenses | `/admin/finance/expenses` | missing | Pending integrated acceptance |
| FIN-05 — بدهی و مطالبات / Payables & Receivables | `/admin/finance/balances` | missing | Pending integrated acceptance |
| FIN-06 — پرداخت‌ها و رسیدها / Transactions | `/admin/finance/payments` | missing | Pending integrated acceptance |
| FIN-07 — تسویه درگاه / Gateway Settlement | `/admin/finance/settlements` | missing | Pending integrated acceptance |
| FIN-08 — بازپرداخت‌ها / Refund Processing | `/admin/finance/refunds` | missing | Pending integrated acceptance |
| FIN-09 — سود محصول، SKU و پکیج / Profit Report | `/admin/reports/profit` | missing | Pending integrated acceptance |
| FIN-10 — جریان نقدی / Cash Flow | `/admin/reports/cashflow` | missing | Pending integrated acceptance |
| FIN-11 — گزارش موجودی و تولید / Inventory & Production Report | `/admin/reports/inventory` | missing | Pending integrated acceptance |
| FIN-12 — خروجی حسابدار / Accounting Export | `/admin/finance/export` | prototype | Pending integrated acceptance |
| ORDER-01 — فهرست سفارش ادمین / Orders Admin | `/admin/orders` | connected_partial | Pending integrated acceptance |
| ORDER-02 — جزئیات عملیاتی سفارش / Operations Order | `/admin/orders/:id` | connected_partial | Pending integrated acceptance |
| ORDER-03 — آماده‌سازی و ارسال / Fulfillment | `/admin/shipments/:id` | missing | Pending integrated acceptance |
| ORDER-04 — مرجوعی و کنترل کالا / Return Inspection | `/admin/returns/:id` | missing | Pending integrated acceptance |
| ORDER-05 — صف بررسی سفارش نقاشی / Commission Review Admin | `/admin/commissions/reviews` | connected_partial | Pending integrated acceptance |
| ORDER-06 — پشتیبانی ادمین / Support Inbox | `/admin/support` | connected_partial | Pending integrated acceptance |
| ORDER-07 — لاگ و تاریخچه تغییر / Audit Log | `/admin/audit` | connected_partial | Pending integrated acceptance |

## Customer and artist dependencies

Checkout with price consent, stock reservations, shipping/tax and sandbox payment; shipment tracking; cancellation/return/refund tracking; digital downloads; commission quote acceptance, feedback and final delivery; assigned artist workspace and profile. Existing implementations must be extended, not replaced.

## AC-01–22

| Criterion | Required integrated evidence |
|---|---|
| AC-01 | Collection filters preserve membership — pending integrated evidence |
| AC-02 | Shared stock across collection membership — pending integrated evidence |
| AC-03 | Valid SKU options update price/image/weight/stock — pending integrated evidence |
| AC-04 | Purchase quantity is independent of sheet count — pending integrated evidence |
| AC-05 | Concurrent final-unit reservation has one winner — pending integrated evidence |
| AC-06 | Duplicate bundle components aggregate SKU demand — pending integrated evidence |
| AC-07 | Scoped discount and explicit stacking — pending integrated evidence |
| AC-08 | Definitive failure/repeated callbacks update once — pending integrated evidence |
| AC-09 | Late success reacquires or enters financial resolution — pending integrated evidence |
| AC-10 | Rate change flags dependent SKUs/bundles without publication — pending integrated evidence |
| AC-11 | Missing cost/unit prevents valid price proposal — pending integrated evidence |
| AC-12 | Duplex sheet/surface bases do not double count — pending integrated evidence |
| AC-13 | Package purchases and partial consumption remain separate — pending integrated evidence |
| AC-14 | Weighted-average receipts and healthy production output — pending integrated evidence |
| AC-15 | Historical orders and costs survive rate changes — pending integrated evidence |
| AC-16 | Margin/fees/rounding formula and publication — pending integrated evidence |
| AC-17 | Partial bundle return/refund uses historical allocation once — pending integrated evidence |
| AC-18 | Collection overlap disclosed; official totals unique — pending integrated evidence |
| AC-19 | Ready artwork and reviewed commissions follow correct payment eligibility — pending integrated evidence |
| AC-20 | Print/financial/private files reject unauthorized access — pending integrated evidence |
| AC-21 | Digital-only and mixed fulfillment use appropriate shipping — pending integrated evidence |
| AC-22 | Settlement moves gateway receivable without new revenue — pending integrated evidence |

## Current purchasing increment — 2026-10-18

OPS-05, OPS-06 and OPS-07 are now connected_partial in the current page register. Persisted drafts/posting, partial receipts, receipt-linked returns, inventory traceability and purchase-only supplier statements are implemented and verified in an isolated real database-backed browser journey. The historical baseline column above is retained for comparison. Independent payments/full financial supplier balances and integrated acceptance for all 56 views remain pending. See purchase-workflow.md.

## Current production increment — 2026-10-18

OPS-08–10 are connected_partial in the current register: pinned production orders/batches, actual material issues/returns, services, WIP, QC, healthy stock transfer and abnormal loss are persisted. OPS-11 has stock waste history/reversal status and production loss views under their independent permissions. A real isolated purchase-to-production browser journey verifies stock and cost outcomes, lost completion response recovery and no duplicate output. Parent-order splitting/scheduling, print consumption, detailed labor, finance and the complete release's integrated criteria remain pending. Historical baseline labels above are retained for comparison.

## 2026-10-19 — Recorded cash and supplier allocations

Migration 0040 adds cash/bank accounts, explicit dated openings, receipts/payments, atomic transfers, categorized expenses, linked corrections and purchase-allocated partial supplier payments/refunds. Purchase receipt, liability, cash movement and revenue remain distinct; returns after payment create supplier credit until actual refund received is recorded. Independent read/write/export permissions, exact amounts, expected versions, stable operation recovery, audit and deduplicated outbox apply. Shared fa/en admin tables/filter/icon actions cover finance routes and aliases. Date-filtered cash flow and protected CSV exports are connected. See finance-workflow.md.

Verification: 615 backend tests and 347 existing frontend tests passed, plus three new finance client checks. Real isolated browser evidence verifies transfer/expense/correction, ambiguous response recovery, exact replay, CSV and mobile fa/en. Restored-copy additive migration preserves existing stock/purchases/production. No synthetic financial records or invented opening balances enter the main workspace. Full admin release remains unfinished: uploaded finance attachments, XLSX, gateway/customer/artist obligations, full reports and downstream checkout/fulfillment/refunds remain pending.

## 2026-10-19 — Historical operational reporting and XLSX

Added permission-controlled inventory valuation/low-stock, source movements, warehouse waste/corrections and production WIP/QC/cost reports with explicit event-time cutoffs. Historical thresholds and costs come from immutable events; incompatible quantities stay grouped by unit. Production estimates use pinned rates, actual costs stay separate, missing values remain unknown and historical reservation availability is explicitly withheld. Source links honor operational permissions and filters survive URL navigation. Dashboard inventory/WIP/low-stock/incomplete-cost metrics now use recorded reports; the stale integration placeholder was removed. CSV/XLSX exports include exact amounts, currency, complete filters and source/correction IDs under independent finance.export access. Financial document exports also support XLSX. No schema changes or synthetic main records. See operational-reporting.md.

Verification: full backend suite 621 passed; frontend suite 353 plus two new dashboard checks passed; targeted lint, production build and real isolated reporting browser evidence cover historical valuation, low stock, waste reversal, source navigation, XLSX, WIP completion and fa/en desktop/mobile. Full integrated admin acceptance remains unfinished; FIN-11/12 remain connected_partial.

## 2026-10-19 — Reviewed price proposals and explicit publication

Migration 0041 connects exact recipe-cost snapshots to explicit margin/fee/fixed-cost/rounding proposals, custom prices and simulated discounts. Proposals are saved/revised/rejected independently of publication. Expected versions, reviewed-calculation fingerprints, shared source locks and the existing SKU price version/audit reject stale inputs and prevent duplicate publication. Pending reads flag changed resource/recipe/public-price/bundle dependencies. Own immutable receipts recover unknown outcomes. Publication, audit and outbox are atomic; historical inventory/order costs remain separate. pricing.publish is independent of catalog.manage and now also gates the legacy manual SKU-price writer; catalogue-only controls are read-only. Shared fa/en admin UI, proposal routes and the existing dependency queue remain available. See price-proposals.md.

Verification covers six PostgreSQL pricing workflows, three client binding/recovery checks and a real isolated preview→draft→publication→lost-response recovery→stale rate→reviewed revision→rejection browser journey with fa/en desktop/mobile layouts. Restored-copy additive migration preserves stock, purchases, production, SKU prices and price audits. The full admin release remains unfinished; COST-08–10 remain connected_partial for family/group/bundle/scheduled review and full acceptance. An existing customer payment-filter test was updated to select the shared dropdown option through its actual interaction; customer behavior was unchanged.

## 2026-10-19 — Payment inquiry stage (0042)

FIN-06 / ORDER-02 now have a recorded sandbox inquiry workflow at `/admin/payments` (alias `/admin/finance/payments`) and within authorized order details. Reads require `payments.read`; gateway inquiry also requires `finance.write`. Stable operation receipts, reasoned audit history, revision checks and unknown-result recovery are implemented. Malformed gateway responses remain uncertain. See [payment inquiries](payment-inquiries.md). Stock reservations, fulfillment, refund processing, settlement and background inquiry jobs remain pending; these views are still partially connected.

## 2026-10-19 — Stock-backed sandbox checkout and shortage review (0043)

OPS-02 / ORDER-01–02 now include actual whole-order component reservations, frozen selected component prices/paid shares, explicit configured reservation duration, stable customer stock-review fingerprints, scheduled expiry, confirmed failure release and late-payment reacquisition/shortage. The independent staff queue at `/admin/order-stock` supports reasoned versioned recommit with immutable receipt/retry; customers see their own committed/shortage state without a shipment promise. AC-05/06/08/09 have real database regression evidence, including two-session last-unit/last-coupon races and rollback. See [stock commitments](order-stock-reservations.md). Full acceptance is still pending: shipping/tax/delivery policy, fulfillment consumption/COGS, return/refunds, complete late financial resolution and historic as-of availability.

## 2026-10-19 — Physical shipment workflow (0044)

ORDER-03 now has persisted draft/pick/QC/packing/partial dispatch/delivery and tracking corrections, with linked physical inventory movements and frozen actual cost. Active plans are bounded by ordered quantities and open cancellation requests block dispatch. Full-history command receipts support lost-result recovery without duplicate stock/cost. Customers see owned parcels and deduplicated in-app notices. A sandbox parcel label excludes internal cost/audit. This remains partial: custom print, component-only bundle parcels, returns/refunds, full purchase-policy integration and profit reporting remain pending. See [fulfillment workflow](fulfillment-workflow.md).


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


### 2026-10-21 artwork/checkout evidence

Schema0054 managed original/print/licensed artwork authoring, accepted configured checkout, frozen policies/licenses/amounts, digital/mixed physical-stock separation, protected delivery and bounded proportional tax/refunds are verified in the isolated demo. Automated718 backend/430 frontend checks and three live journeys are documented in `artwork-checkout-integration.md`. Final56-view/AC-01–22 acceptance remains pending alongside remaining costing/finance/artist/operational work; main has not been rolled out.
