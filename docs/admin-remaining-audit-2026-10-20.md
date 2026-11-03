# Admin remainder audit — 2026-10-20

## Conclusion

This audit describes the pre-integration baseline. Subsequent bundle authoring and costing route fixes are verified in the isolated preview; see `admin-integrated-release-progress.md` and the current page register. Main rollout and the complete release remain pending.

The register contains **56 required admin views: 53 connected_partial, 3 missing, 0 marked fully accepted**. These are view-register labels, not a completion percentage. Many workflows are implemented, but their parent views still depend on unfinished workflows and release acceptance.

The three explicitly missing entries are **ADM-08 bundle editor, FIN-07 gateway settlement and FIN-09 official profit reporting**. Missing work is broader than these three pages: artwork authoring, artist/commission operations and other dependencies remain incomplete inside partially connected views.

This is a source/contract/document audit of the current checkout. It does not claim a fresh browser walkthrough of all56 views or rerun of the entire test suite. Latest recorded verification is692 backend tests,412 frontend tests and the two supplier-report browser journeys; those counts do not prove complete release acceptance.

## Highest-priority unfinished workflows

1. **Catalogue authoring and approved media:** complete bundle editor and artwork authoring; catalogue/SKU images, gallery ordering/alt text/specifications/weight; connect original/print/digital rules to inventory and delivery.
2. **Settings-backed checkout and policies:** authoritative shipping/tax, digital-only address handling, recorded policy acceptance and returns eligibility. Keep missing configuration explicit.
3. **Gateway finance and official profit:** gateway receivables/fees/settlements and bank allocation without a second revenue event; realized versus estimated/replacement profit, bundle allocation/refunds, and unique collection totals.
4. **Commission/artist workflow:** sandbox assessment plus human review, quotes/acceptance/payment eligibility, assignment/deadlines/workload, assigned-only artist workspace, final files/delivery and artist obligations/settlement.
5. **Remaining costing/operations:** family BOM templates/overrides, group/bundle price review; purchase units; production scheduling/splits/print files/service obligations.
6. **Finish acceptance:** cross-domain dashboard/audit/worker recovery, customer/gateway/artist balances and aging, financial attachments/exports, all-view bilingual/mobile/permission and integrated journey verification.

Recommended next implementation: **complete catalogue media associations and the bundle editor**, then artwork authoring. Further supplier report refinements should not displace these larger blockers.

## Route and placeholder findings

| Required route | Actual behavior in current code |
|---|---|
| `/admin/bundles/:id/edit` | Falls into generic published catalogue listing; no bundle editor. |
| `/admin/finance/settlements` | Generic unconnected-workflow placeholder. |
| `/admin/reports/profit` | Generic unconnected-workflow placeholder. |
| `/admin/boms`, `/admin/boms/:id/edit` | Unconnected placeholder; working individual recipes use `/admin/recipes`. |
| `/admin/costing/cutting` | Unconnected placeholder; cutting calculator exists inside recipe editing. |
| `/admin/materials/:id/edit` | Reference edit suffix is not covered by resource route; working resource editor uses the existing ID/new-ID route. |
| `/admin/commissions/reviews` | Unconnected placeholder; `/admin/commissions` currently provides preview publication/customer review, not the full assessment/quote queue. |
| `/admin/artists` | Connected identity/account management, not full artist professional/work assignment operations. |
| `/admin/artworks` | Published-record listing, not full authoring. |

A200 page response or a shared reference shell is not evidence that its commands work. Route aliases and independent permissions need verification together when these pages are connected.

## Confirmed checkout integration blocker

`Backend/src/nilart/contexts/payments/router.py` currently requires an owned shipping address, writes every checkout line with `delivery='physical'` and `returnable=False`, and freezes `shipping_amount='0'` and `tax_amount='0'`. This confirms that settings-based shipping/tax, digital-only checkout and return-policy eligibility are unfinished, despite working downstream stock, shipment, inspection and simulated-refund modules. Existing isolated journeys against seeded eligible snapshots do not prove this final checkout-to-return path is complete.

## Reconciliation of outdated notes

Do **not** count the following as unimplemented: purchase cash allocations; purchase receipts/returns/weighted averages; production material/WIP/QC/waste; stock-backed checkout and late-payment shortage handling; partial fulfillment/tracking; return inspection; local simulated refunds; unpaid/unknown cancellation and no-payment financial closure; supplier openings, linked settlements, statements, current/historical balance reports and CSV/XLSX exports. These have later implementation evidence.

Likewise, basic geometric cutting with margins/orientation and workshop-approved yield already exists; only the standalone route and broader optimization/template dependencies remain. Old append-only notes saying these features are pending are historical snapshots and need superseding, not duplicated implementation.

## All56 views: remaining acceptance work

| ID | View | Register status | Remaining work |
|---|---|---|---|
| ADM-01 | داشبورد ادمین / Admin Dashboard | connected_partial | Consolidated sales/profit/gateway metrics, cross-domain actionable queues and failed-job retry visibility; current recorded summaries are partial. |
| ADM-02 | مدیریت کالکشن / Collections Admin | connected_partial | Approved media/gallery ordering/alt text and complete publication checks across member products/bundles. |
| ADM-03 | مدیریت دسته / Categories Admin | connected_partial | Complete catalogue/media publication dependencies and integrated acceptance; text drafts/publication exist. |
| ADM-04 | فهرست محصولات / Products Admin | connected_partial | Complete product/SKU/media authoring and publication workflow; lists and basic drafts exist. |
| ADM-05 | فرم محصول / Product Editor | connected_partial | Gallery/media associations, specifications, weight and full publication validation; current editor is mainly bilingual text and membership. |
| ADM-06 | گزینه‌ها و SKU / Variant Matrix | connected_partial | SKU images/weight and full operational authoring/public selection acceptance; option mapping, prices and ledger stock foundations exist. |
| ADM-07 | مدیریت پکیج / Bundles Admin | connected_partial | Bundle administration beyond the published-record list: drafts, component/choice editing and publication. |
| ADM-08 | فرم پکیج / Bundle Editor | missing | Full bundle editor: components, allowed SKUs, quantities, gallery, membership, discounts and packaging/service costs. No connected editor. |
| ADM-09 | کدهای تخفیف / Discounts Admin | connected_partial | Complete bundle/catalogue/policy integration and end-to-end acceptance; discount rules, usage and checkout reservations already exist. |
| ADM-10 | فرم کد تخفیف / Discount Editor | connected_partial | Complete rule-to-sale/return financial acceptance across final catalogue workflows; editor/revisions already exist. |
| ADM-11 | رسانه و فایل چاپ / Media Library | connected_partial | Attach approved assets to catalogue galleries and consume protected print files in production/fulfillment. Upload/version/private-file foundation exists. |
| ADM-12 | آثار نقاشی / Artwork Admin | connected_partial | Create/edit/publish originals, print products and licensed digital editions with separate availability/delivery rules; admin currently lists published artworks. |
| ADM-13 | کاربران و دسترسی / Users & Roles | connected_partial | Final independent-permission, revocation and cross-domain acceptance; account/role/override management already works. |
| ADM-14 | هنرمندان / Artists Admin | connected_partial | Professional artist profiles, workload, deadlines, assignment and obligations; artist account-role management alone is connected. |
| ADM-15 | محتوا و پشتیبانی / Content Admin | connected_partial | Richer page-specific content sections and complete public presentation/SEO acceptance; bilingual drafting and explicit publication exist. |
| ADM-16 | تنظیمات کسب‌وکار / Business Settings | connected_partial | Enforce applicable shipping/tax/currency/returns/commission settings downstream; missing configuration must continue to block or remain explicit. |
| COST-01 | فهرست مواد / Materials | connected_partial | Link resource supplier metadata to authoritative supplier records rather than only free text; final procurement/costing integration. |
| COST-02 | تعریف ماده و تبدیل واحد / Material Editor | connected_partial | Reference edit-route alias and full supplier/unit authoring integration; versioned resource rates/conversions exist. |
| COST-03 | نرخ خدمات / Service Rates | connected_partial | Authoritative supplier/service obligations and full actual-cost/finance integration; versioned service rates exist. |
| COST-04 | فرمول‌های ساخت / BOM Library | connected_partial | Reusable family BOM templates, parameters and inherited overrides; reference /admin/boms route is not aliased to the connected recipe workspace. |
| COST-05 | ویرایش فرمول ساخت / BOM Editor | connected_partial | Template/override editing and reference /admin/boms/:id/edit alias; individual versioned recipes already exist. |
| COST-06 | بازده برش و ضایعات / Cutting Yield | connected_partial | Standalone /admin/costing/cutting route and broader mixed-layout optimization. Geometric margins/orientation/yield plus workshop confirmation already exist inside recipes. |
| COST-07 | محاسبه‌گر هزینه SKU / SKU Cost Calculator | connected_partial | Family/template-dependent calculation and complete catalogue/bundle estimates; individual exact recipe estimates exist. |
| COST-08 | قیمت پیشنهادی SKU / Price Proposal | connected_partial | Family/group policies and full bundle price proposals; individual margin/fee/rounding proposals exist. |
| COST-09 | صف بازبینی قیمت / Price Review Queue | connected_partial | Group/family and full affected-bundle review/publication workflow; individual stale-proposal checks exist. |
| COST-10 | تأیید انتشار و تاریخچه / Price Publication | connected_partial | Complete group/bundle publication and integrated historical-price/cost acceptance; individual audited publication exists. |
| OPS-01 | نمای انبار / Inventory | connected_partial | Complete catalogue/media/source integrations and integrated operational acceptance; ledger balances, stock and low-stock filters exist. |
| OPS-02 | گردش و رزرو موجودی / Stock Ledger | connected_partial | Complete cross-domain reservation/source-history acceptance and reporting integration; checkout reservations and expiry already exist. |
| OPS-03 | موجودی افتتاحیه و اصلاح / Stock Adjustment | connected_partial | Broader source-document correction/backdating policy and acceptance; reasoned openings/adjustments/reversals already exist. |
| OPS-04 | تأمین‌کننده و مانده / Suppliers | connected_partial | Explicit due-date terms/aging and remaining service/provider obligations; directory, statements, opening settlements and historical supplier balances already work. |
| OPS-05 | فهرست خرید / Purchases | connected_partial | Purchase-unit entry/conversion and full acceptance; posted purchases, receipts/returns and independent cash payments already work. |
| OPS-06 | سند خرید / Purchase Editor | connected_partial | Purchase-unit authoring/conversion and final source/correction acceptance; persisted drafts/posting and cash allocations exist. |
| OPS-07 | تحویل و برگشت خرید / Purchase Receipt | connected_partial | Final unit/source and operational acceptance; partial receipts, receipt-bounded returns and weighted-average valuation exist. |
| OPS-08 | دستورهای تولید / Production Orders | connected_partial | Parent-order batch splits, scheduling/material reservations and production-finance obligations. |
| OPS-09 | اجرای بچ تولید / Production Batch | connected_partial | Substitutions/rework/corrections, detailed labor, protected print consumption and linked service obligations. |
| OPS-10 | کنترل کیفیت و پایان تولید / Production QC | connected_partial | Approved waste thresholds and remaining production/finance/print dependencies; QC, healthy output and normal/abnormal waste posting exist. |
| OPS-11 | ضایعات و خرابی / Waste & Damage | connected_partial | Complete cross-domain waste/profit/financial reporting and correction policy; stock write-offs and production loss views exist. |
| FIN-01 | داشبورد مالی / Finance Overview | connected_partial | Consolidated sales/revenue/profit, gateway/customer/artist obligations and actionable queues. |
| FIN-02 | دریافت و پرداخت / Cash Movements | connected_partial | Private supporting-document uploads and remaining gateway/customer/artist allocation workflows; cash movements/transfers/reversals exist. |
| FIN-03 | بانک و صندوق / Accounts & Balances | connected_partial | Configured multi-currency and bank/gateway reconciliation integration; explicit account openings/balances exist. |
| FIN-04 | هزینه‌های جاری / Operating Expenses | connected_partial | Private supporting-file uploads and wider source/obligation integration; categorized expenses and linked corrections exist. |
| FIN-05 | بدهی و مطالبات / Payables & Receivables | connected_partial | Customer/gateway/artist balances and explicit due-date aging; current and historical supplier balances are implemented. |
| FIN-06 | پرداخت‌ها و رسیدها / Transactions | connected_partial | Full asynchronous external processing/recovery and reconciliation with gateway receivables/settlement; sandbox inquiry/late-payment resolution exist. |
| FIN-07 | تسویه درگاه / Gateway Settlement | missing | Gateway receivable/fee/settlement records, bank allocation, deduplication and linked corrections without duplicate revenue. Page remains a placeholder. |
| FIN-08 | بازپرداخت‌ها / Refund Processing | connected_partial | Provider/outbox payout reconciliation and full policy acceptance. Existing refunds are explicitly local sandbox simulations, not bank transfers. |
| FIN-09 | سود محصول، SKU و پکیج / Profit Report | missing | Official product/SKU/bundle/collection profit with frozen fulfillment costs, fees/refunds and unique totals despite overlapping collections. Page remains a placeholder. |
| FIN-10 | جریان نقدی / Cash Flow | connected_partial | Complete gateway/customer/artist and realized-sales cash attribution; recorded operational cash flow exists. |
| FIN-11 | گزارش موجودی و تولید / Inventory & Production Report | connected_partial | Complete reservation/fulfillment/sales-cost integration and full operational reporting acceptance; historical inventory/production/waste reports exist. |
| FIN-12 | خروجی حسابدار / Accounting Export | connected_partial | Cross-domain accountant export for missing sales/profit/settlement/customer/artist workflows; existing cash/inventory/supplier CSV/XLSX remain working. |
| ORDER-01 | فهرست سفارش ادمین / Orders Admin | connected_partial | Full settings-backed checkout shipping/tax/policies, delivery-type rules and integrated acceptance. |
| ORDER-02 | جزئیات عملیاتی سفارش / Operations Order | connected_partial | Complete policy/commission/private-print/finance dependencies and operational recovery queues; stock/late-payment/cancellation resolution already exists. |
| ORDER-03 | آماده‌سازی و ارسال / Fulfillment | connected_partial | Private-print and complete digital/physical catalogue delivery rules, policy enforcement and end-to-end acceptance; partial shipments/tracking/delivery exist. |
| ORDER-04 | مرجوعی و کنترل کالا / Return Inspection | connected_partial | Full policy eligibility and customer-to-inspection-to-financial/provider acceptance; inspection, healthy/damaged disposition and simulated refunds exist. |
| ORDER-05 | صف بررسی سفارش نقاشی / Commission Review Admin | connected_partial | Review-route alias, reproducible labeled sandbox assessment, human difficulty review, versioned quotes/customer acceptance, payable eligibility, artist assignment and final delivery. |
| ORDER-06 | پشتیبانی ادمین / Support Inbox | connected_partial | Support assignment and priority; verify final ownership/attachment/cross-domain acceptance. Search, replies and protected attachments already exist. |
| ORDER-07 | لاگ و تاریخچه تغییر / Audit Log | connected_partial | Aggregate missing-domain events and worker/retry visibility; existing audit search/filter/history is connected. |

## Release-wide acceptance still outstanding

- Reconcile AC-01–22 and all56 views against final API/database/browser evidence, including customer and artist dependencies.
- Verify Persian/English, desktop/mobile/keyboard, loading/empty/error/conflict/unsaved/uncertain states for every required view.
- Complete cross-account/assigned-only/private-file permission checks for new domains and permission revocation during commands.
- Complete integrated purchase→production→sale, discount→checkout→delivery, return→refund and commission→artist→delivery journeys against the final system.
- Validate full database/private-file restore, scheduled jobs and worker recovery. Existing migration/backup evidence is incremental, not final release-wide acceptance.
- Retain isolated demo data and explicit missing historical inventory/costs; no invented backfills.

Production activation, real credentials/merchant transactions, formal double-entry/legal-tax integration and FUT-01–03 remain excluded. The requested sandbox settlement/refund/assessment adapters and safe operational recovery still need implementation where absent; production exclusion does not waive those sandbox features.

## Source evidence

- `docs/page-implementation-register.json` and `docs/ui-ux-design-spec.md` for scope and recorded status.
- `Frontend/src/features/design/DesignRuntime.tsx` and `Frontend/src/features/admin/AdminPanel.tsx` for connected routes, fallbacks and published-only catalogue behavior.
- Catalogue authoring/bundles/artworks presentation modules under `Backend/src/nilart/contexts/catalog/presentation/` for actual command scope.
- `Backend/src/nilart/contexts/commissions/` for the current request/preview/review scope; no complete assignment/quote/artist domain.
- Current finance/reporting modules and latest workflow documents for implemented supplier, purchase, production, payment, cancellation, fulfillment and refund increments.
- `docs/AI-HANDOFF.md` and `docs/admin-feature-verification-2026-10-16.md` for latest deployed verification.
