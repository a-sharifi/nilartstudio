# Admin feature verification — 2026-10-13

The admin panel does **not** yet contain all required features. Passing tests establish the implemented contracts; they do not establish completion of the RFP or visual/workflow acceptance of every registered page.

## Connected and tested

- Protected admin shell, permission-specific navigation, session expiry and denied access.
- Private collection/category/product lists including drafts, status filtering and pagination. Collection/category/product search now uses server filtering across all pages. Bundle/artwork search remains limited to the displayed page.
- Bilingual collection/category/product creation and editing, explicit product memberships, version checks, separate confirmed publication/unpublication and audit history.
- Draft SKU creation and exact decimal SKU price editing. Bilingual option/value definitions, explicit combinations and version-pinned SKU mapping/removal are now connected. Reviewed SKU publication/unpublication now requires explicit confirmation, a published parent and a current mapping.
- Account permissions and audited access management.
- Published bundle/artwork browsing. These are read-only admin lists; they are not complete authoring workflows.

Security and persistence checks cover permission/CSRF rechecks inside transactions, draft isolation, conflicting/concurrent edits, session revocation, rollback on audit/outbox failure, migration rollback and uncertain write outcomes. Browser checks exercise Persian mobile and English desktop slices, not all page/state/locale combinations. Browser APIs are mocked; backend database tests separately verify persistence.

## Required gaps

The register contains 56 required administration-related views: 9 connected_partial, 4 foundation, 5 prototype and 38 missing. None of those statuses means fully accepted. The entire site has 126 required views; this report focuses on administration.

- Catalog: bundle and artwork authoring, media storage/management, full public variant presentation, discounts, artists, content and business settings.
- Costing: materials, conversions, rates, formulas, yield/waste, calculated proposals and dependency review.
- Operations: stock ledger/reservations, adjustments, suppliers, purchases/receipts, production and QC.
- Commerce and service: operational order processing, fulfillment, returns, refunds, commission review and complete admin support inbox.
- Finance: cash/accounts, expenses, balances, transactions, settlement, profit/cash flow/inventory reporting and accounting exports.

Backend support-ticket list/reply contracts exist, but the admin inbox is not connected. Unavailable live routes display an integration message. Prototype reference screens and sample artwork metadata are not evidence of real business records or operational capability.

RFP AC-01–22 remain unaccepted as a complete set. In particular, payment callbacks, late payments, stock concurrency, discount eligibility, historical costing, returns and gateway settlement require workflows which are not yet implemented. Catalog and access tests alone cannot satisfy these criteria.

## Current register snapshot

| ID | Required view | Register status |
|---|---|---|
| ADM-01 | داشبورد ادمین / Admin Dashboard | connected_partial |
| ADM-02 | مدیریت کالکشن / Collections Admin | connected_partial |
| ADM-03 | مدیریت دسته / Categories Admin | connected_partial |
| ADM-04 | فهرست محصولات / Products Admin | connected_partial |
| ADM-05 | فرم محصول / Product Editor | connected_partial |
| ADM-06 | گزینه‌ها و SKU / Variant Matrix | connected_partial |
| ADM-07 | مدیریت پکیج / Bundles Admin | connected_partial |
| ADM-08 | فرم پکیج / Bundle Editor | missing |
| ADM-09 | کدهای تخفیف / Discounts Admin | missing |
| ADM-10 | فرم کد تخفیف / Discount Editor | missing |
| ADM-11 | رسانه و فایل چاپ / Media Library | missing |
| ADM-12 | آثار نقاشی / Artwork Admin | connected_partial |
| ADM-13 | کاربران و دسترسی / Users & Roles | connected_partial |
| ADM-14 | هنرمندان / Artists Admin | connected_partial |
| ADM-15 | محتوا و پشتیبانی / Content Admin | missing |
| ADM-16 | تنظیمات کسب‌وکار / Business Settings | missing |
| COST-01 | فهرست مواد / Materials | missing |
| COST-02 | تعریف ماده و تبدیل واحد / Material Editor | missing |
| COST-03 | نرخ خدمات / Service Rates | missing |
| COST-04 | فرمول‌های ساخت / BOM Library | missing |
| COST-05 | ویرایش فرمول ساخت / BOM Editor | missing |
| COST-06 | بازده برش و ضایعات / Cutting Yield | missing |
| COST-07 | محاسبه‌گر هزینه SKU / SKU Cost Calculator | missing |
| COST-08 | قیمت پیشنهادی SKU / Price Proposal | foundation |
| COST-09 | صف بازبینی قیمت / Price Review Queue | missing |
| COST-10 | تأیید انتشار و تاریخچه / Price Publication | foundation |
| OPS-01 | نمای انبار / Inventory | prototype |
| OPS-02 | گردش و رزرو موجودی / Stock Ledger | missing |
| OPS-03 | موجودی افتتاحیه و اصلاح / Stock Adjustment | missing |
| OPS-04 | تأمین‌کننده و مانده / Suppliers | missing |
| OPS-05 | فهرست خرید / Purchases | missing |
| OPS-06 | سند خرید / Purchase Editor | missing |
| OPS-07 | تحویل و برگشت خرید / Purchase Receipt | missing |
| OPS-08 | دستورهای تولید / Production Orders | missing |
| OPS-09 | اجرای بچ تولید / Production Batch | missing |
| OPS-10 | کنترل کیفیت و پایان تولید / Production QC | missing |
| OPS-11 | ضایعات و خرابی / Waste & Damage | missing |
| FIN-01 | داشبورد مالی / Finance Overview | prototype |
| FIN-02 | دریافت و پرداخت / Cash Movements | missing |
| FIN-03 | بانک و صندوق / Accounts & Balances | missing |
| FIN-04 | هزینه‌های جاری / Operating Expenses | missing |
| FIN-05 | بدهی و مطالبات / Payables & Receivables | missing |
| FIN-06 | پرداخت‌ها و رسیدها / Transactions | missing |
| FIN-07 | تسویه درگاه / Gateway Settlement | missing |
| FIN-08 | بازپرداخت‌ها / Refund Processing | missing |
| FIN-09 | سود محصول، SKU و پکیج / Profit Report | missing |
| FIN-10 | جریان نقدی / Cash Flow | missing |
| FIN-11 | گزارش موجودی و تولید / Inventory & Production Report | missing |
| FIN-12 | خروجی حسابدار / Accounting Export | prototype |
| ORDER-01 | فهرست سفارش ادمین / Orders Admin | connected_partial |
| ORDER-02 | جزئیات عملیاتی سفارش / Operations Order | connected_partial |
| ORDER-03 | آماده‌سازی و ارسال / Fulfillment | missing |
| ORDER-04 | مرجوعی و کنترل کالا / Return Inspection | missing |
| ORDER-05 | صف بررسی سفارش نقاشی / Commission Review Admin | connected_partial |
| ORDER-06 | پشتیبانی ادمین / Support Inbox | connected_partial |
| ORDER-07 | لاگ و تاریخچه تغییر / Audit Log | foundation |

## Verification evidence

Fresh checks: 312 backend tests passed (one dependency deprecation warning); 113 frontend tests passed; 20 admin/catalog/access browser checks passed against localhost:8080; frontend type checking passed. The browser checks intercept API responses and therefore verify UI contracts rather than live authenticated database writes. The backend suite separately tests those writes against PostgreSQL. Concurrent customer-panel edits are present in the shared checkout, so results describe the tested snapshot. The register remains the source of page-level scope; this snapshot is not a completion certificate.

Continuation: connected product options and draft SKU mapping editor. Seven client-contract tests, six mocked browser tests and 33 existing backend option/mapping tests passed. This adds implemented coverage without marking ADM-06 fully accepted.

Local web production build succeeded and only the web service was refreshed. Six option/mapping browser checks passed against localhost:8080, including the /variants alias. Readiness returns 200; unauthenticated private options return 401/no-store; all eight local services are healthy. No business records or published SKU state were changed by this continuation.


### 2026-10-13 — Draft SKU code editing

Product options editor now exposes versioned draft SKU code edits through the existing protected authoring endpoint. Published SKU codes remain locked. Duplicate codes preserve input and allow correction; unknown/conflicting writes require reload. Unsaved code changes are guarded and cannot be mixed with option/mapping writes. After an acknowledged rename, mapping state is reread from the server; mapping read failure does not turn a confirmed code save into a false failure. Price and inventory are unchanged. SKU publication still needs implementation.

Validation: 8 option API client tests, 7 option/mapping browser checks and 16 backend SKU authoring tests passed; lint and types passed. No business records were edited by the browser fixtures.

Final code-edit continuation checks: full frontend suite 123 passed; all seven option/mapping browser checks passed on the refreshed localhost:8080 production build; production types/build and lint passed; all eight local services healthy. Only the web service was refreshed.

Final reviewed-publication verification: full isolated backend suite 325 passed (no skips), frontend suite 130 passed, backend ruff/mypy and frontend lint/types passed, API client regenerated, API/web production builds succeeded. Existing local migration head remains 0023; no migration/business data was changed by this slice. All eight services are healthy, readiness is 200, unauthenticated publication is 401/no-store and unknown public snapshots are 404.

Final SKU-history verification: 42 focused backend SKU/publication/mapping tests passed; 136 frontend tests passed; all nine option/mapping/history browser checks passed on the refreshed localhost:8080 build. API/web builds passed, all eight services healthy, readiness 200 and unauthenticated audit access 401/no-store after service-name resolution settled. Only API/web services refreshed; no migrations or real business records were modified.


### 2026-10-13 — SKU price history

Connected the existing protected price audit endpoint to the bilingual admin price editor. History preserves exact decimal strings/currencies, shows unpriced/removal states, actor and Tehran timestamps, supports retry and exclusive pagination, validates SKU/product identity and clears on selection/version/session changes. It does not convert currencies or change stock. No new backend contracts, migrations or business writes.

Seven backend price-audit checks passed; two client history checks cover session clearing and pagination/retry; admin browser coverage verifies decimal/currency/removal history on mobile. Public variant presentation and broader administration remain unfinished.

Final price-history checks: 7 existing backend price-audit tests, 2 new client history tests and 13 admin browser checks passed. The price-history browser check also passed on the refreshed localhost:8080 production build. Web build/types and lint passed; all eight local services healthy. Only web was refreshed; no business records or migrations were modified.


### 2026-10-13 — Admin catalog search

Connected the existing private catalog `q` filter for collections/categories/products. Explicit submit resets pagination, preserves publication filtering and protects unsaved SKU/price input. Clear search restores the full managed list. Bundle/artwork lists retain their accurately labelled current-page filter. A failed catalog load no longer displays a false empty-state confirmation. No backend writes or migrations added.

Final catalog-search validation: 27 backend catalog management tests and 14 admin browser checks passed; search also passed on the refreshed localhost:8080 production build. Frontend lint/type checking and web build passed; all eight services healthy. Only web refreshed, without business writes or migrations.


### 2026-10-13 — Admin support inbox

Connected `/fa/admin/support` and `/en/admin/support` using the supplied AdminDashboard shell. Support staff can page through tickets, open chronological conversations and record versioned replies with fresh CSRF. Added protected ticket and paginated message reads, including ticket-scoped request-ID receipt lookup. An uncertain write requires explicit reload: an existing receipt confirms success; an absent receipt allows retrying the same locked payload and identifier. Conflicts retain drafts; closed tickets disable replies. Unsaved edits are guarded and private state clears with session changes. Fixed cancelled request cleanup under React development effect replay.

Attachments, assignment/priority, admin closure controls and broader workflow acceptance remain outstanding. ORDER-06 is connected_partial, not accepted. Browser checks use intercepted fixtures; backend checks exercise an isolated PostgreSQL schema. No real customer replies were sent by verification.

Final support verification: 10 backend customer/support PostgreSQL checks and all 7 support browser checks passed, with the browser checks repeated against the refreshed localhost:8080 production build. Frontend lint/type checking, backend ruff/mypy, generated API client and API/web production builds passed. All eight local services healthy; readiness 200 and unauthenticated ticket/conversation reads 401/no-store. Only API/web refreshed; this slice added no migration or real business writes. Concurrent customer/order/file work remains in the shared checkout.


### 2026-10-14 — Staff support ticket closure and reopening

Added protected `PUT /api/v1/admin/customer/tickets/{id}/state`: `support.manage`, fresh session/CSRF/Origin, strict optimistic version, row lock, required trimmed internal reason (1–1000 characters), audited before/after/version and transactional outbox. Staff can close an open ticket or reopen a closed ticket as submitted; redundant transitions fail. The bilingual inbox exposes explicit confirm controls, guards unsaved reasons and prevents mixing a draft reply with a status change. Unknown/conflicting status writes lock further actions until a read reload; reload clears the old intent and shows current status without automatically retrying or reversing it. Reasons remain internal and do not create customer messages.

ORDER-06 remains connected_partial. Attachments, assignment/priority and broader workflow acceptance remain outstanding. Verification uses isolated backend records and intercepted browser fixtures; no real support messages or ticket states were changed.

Final closure/reopening verification: 11 backend customer/support PostgreSQL checks and all 10 support browser checks passed; browser checks repeated on the refreshed localhost:8080 production build. Lint/types, backend ruff/mypy, regenerated OpenAPI client and API/web builds passed. All eight services healthy, readiness 200, unauthenticated state write 401/no-store. This slice added no migration and changed no real business records. Concurrent commission/order/download work remains in the shared checkout.


### 2026-10-14 — Support inbox status filtering

Added validated status filtering to the protected support list before cursor pagination. The bilingual dropdown covers all/submitted/awaiting reply/awaiting customer/closed. Changing views resets pagination and the selected conversation, with explicit unsaved-change protection; status-changing saves remove tickets that no longer match the view. Empty states describe the selected status and failed reads remain errors. No migration or real business write added. ORDER-06 remains connected_partial; assignment, priorities and attachments remain outstanding.

Shop and current cats-bundle page were also checked at 390px: neither has horizontal overflow. The preceding shop filter placement is retained.

Final status-filter verification: 13 current backend customer/support PostgreSQL tests and all 11 support browser checks passed. The new guarded filter check also passed on the refreshed localhost:8080 production build. Lint/types, backend ruff/mypy, generated API client and API/web builds passed. All eight services healthy; readiness 200 and unauthenticated filtered inbox 401/no-store. Only API/web refreshed, with no migration or real business write in this slice.


### 2026-10-14 — Staff support action history

Added protected ticket-scoped `GET /api/v1/admin/customer/tickets/{id}/audits`, with descending timestamp/ID cursor pagination and support.manage permission. Only staff reply/status audit actions for the ticket's owner and record ID are returned. The bilingual conversation shows action, actor, Tehran timestamp, internal reason and recorded before/after/version values. History is read on demand, supports retry/older pages, clears on ticket/version changes and clears private reasons on session changes. Unrecorded values are labelled rather than inferred. No migration or real business write added; ORDER-06 remains connected_partial.

Final staff-history verification: 14 backend customer/support PostgreSQL tests, all 12 support browser checks and the new private-cache history unit check passed. The history retry/pagination/version-reset browser check also passed on the refreshed localhost:8080 production build. Lint/types, backend ruff/mypy, generated OpenAPI client and API/web builds passed. All eight services healthy; readiness 200 and unauthenticated history 401/no-store. No migration or real business record changed in this slice. Concurrent workspace changes remain preserved.


### 2026-10-14 — Support subject search

Protected support list now accepts a bounded `q` subject search, applied with status and cursor before pagination. LIKE metacharacters are escaped so `%` and `_` search literally; Persian text is supported. The bilingual form submits explicitly, resets pagination, preserves the active status, supports clear search, guards unsaved reply/reason input when changing views, and clears private search state when the session changes. Empty states distinguish search/status matches; failed reads remain errors. No migration or real business write added. ORDER-06 and the wider admin panel remain partially implemented.

Final subject-search verification: 15 backend customer/support PostgreSQL tests and all 13 support browser checks passed. The new search/pagination/status/draft-guard check also passed on refreshed localhost:8080. Frontend lint/types, backend ruff/mypy, generated API client and API/web production builds passed. All eight services healthy; readiness 200 and unauthenticated subject search 401/no-store. Only API/web refreshed, without migrations or real business writes in this slice. Concurrent workspace work remains preserved.


### 2026-10-14 — Support conversation reference alignment

Applied the supplied SupportConversationPage message structure and existing support-conversation.css to live admin support: ordered conversation, distinct customer/support cards, sender avatars/icons, semantic timestamps and automatic text direction. Ticket statuses use the AdminDashboard reference badge styles. Subject-search input now uses visible theme control borders/spacing. Business reply/status/history behavior remains unchanged; no backend contract or migration added.

Validation uncovered shared basket/order syntax/import/type errors. Missing expression/tag delimiters, the bundle AddToBasket import, an unsupported ESLint directive and unsupported testing-library exact options were minimally corrected without changing the intended workflows. All 13 support browser checks and 11 order unit checks passed; lint/types and web production build passed. Wider admin features remain incomplete.

Final reference-layout verification: reply persistence and Persian mobile browser checks passed on localhost:8080 after the successful web build. Visual inspection confirms reference message cards, status badges and visible search control without horizontal overflow. All eight local services healthy. No real business writes or migrations in this slice.


### 2026-10-14 — Artist account administration

Connected `/fa/admin/artists` and `/en/admin/artists` to the reference AdminDashboard shell and existing account access editor. Protected account listing now supports a validated role filter before cursor pagination. The artist directory requires identity.manage, as do its access/restriction writes; commissions.manage alone does not expose identity data. Existing reason, version, CSRF, audit and unsaved-change controls are reused. Removing the artist role removes that row from the directory after acknowledgement. Artist role assignment remains available through Users; commission assignment, artist profiles and settlements remain unfinished. ADM-14 is connected_partial, not accepted. No migration or real business writes added.

Final artist-account verification: all 10 identity management PostgreSQL tests and both artist browser checks passed. Browser checks repeated on refreshed localhost:8080, including 390px layout, audited role removal with fresh CSRF and denial before identity reads for commission-only access. Lint/types, backend ruff/mypy, regenerated API client and API/web builds passed. All eight services healthy; readiness 200 and unauthenticated artist directory 401/no-store. No migration or real business records changed in this slice. Concurrent workspace changes preserved.


### 2026-10-14 — Admin user/artist phone search

Protected account listing now accepts bounded full/partial phone search before role filtering/cursor pagination. Persian/Arabic digits and formatted/local Iranian numbers are normalized; malformed terms return a specific validation error. Users, Roles and Artists share explicit search/clear controls in the reference shell. Search preserves artist scope, resets pagination, guards unsaved access changes and clears private search state with session changes. Starting a new read clears the selected editor so its response cannot discard newly typed access edits. Failed reads do not produce a false empty-state confirmation. No migration or real business writes added; broader admin work remains unfinished.

Final account-search verification: 11 identity management PostgreSQL tests and all 3 artist-directory browser checks passed, with browser checks repeated against refreshed localhost:8080. Tests cover number normalization, invalid input, artist scope, explicit search/clear, draft protection and access denial. Lint/types, backend ruff/mypy, regenerated client and API/web builds passed. All eight services healthy; readiness 200 and unauthenticated directory search 401/no-store. No migration or real business records changed in this slice.


### 2026-10-14 — User directory role filtering

Connected the existing protected role query to the bilingual Users/Roles directory using the reference dropdown and theme controls. Role changes combine with the applied phone search, reset cursor pagination, guard unsaved access changes and clear with private session state. Artists retain their fixed artist-only scope. After acknowledged access changes, accounts that no longer match the current role leave the directory. Search/clear action spacing uses reference tokens. No backend contract, migration or real business writes added; wider admin workflows remain incomplete.

Final role-filter verification: all 4 account/artist directory browser checks passed, with the new role/phone/draft-guard check repeated against refreshed localhost:8080. Frontend lint and types and web production build passed. The initial shared customer-attachment lint errors were resolved before final validation. All eight services healthy. Only web refreshed; no backend contracts, migrations or real business records changed in this slice.


### 2026-10-14 — Account restriction filtering

Added protected boolean restriction filtering before account-list pagination. Users and Artists expose the reference dropdown for all/active/restricted, combined with role and phone search. View changes guard unsaved edits; acknowledged restriction changes remove rows that no longer match. No migration or real business write added. A shared attachment count query was minimally switched from scalar() to scalar_one(): COUNT always returns one row, resolving its optional-value type error without changing the limit.

Final account-status verification: all 12 identity PostgreSQL tests and all 5 account/artist browser checks passed. The status/role/phone combination check also passed on refreshed localhost:8080. Frontend lint/types, backend ruff/mypy, regenerated API client and API/web builds passed. All eight services healthy; readiness 200 and unauthenticated filtered directory 401/no-store. No migration or real business records changed in this slice; concurrent workspace work preserved.


### 2026-10-14 — Stored order administration

Connected protected cross-customer admin order listing and details with orders.read_all. Server search covers reference, bilingual item title and SKU, combined with payment/fulfillment filters and descending timestamp/UUID cursor pagination. The reference AdminDashboard shell/table/panels show saved order status, Tehran timestamps, exact decimal/currency amounts and persistent detail URLs. Details include recipient/address, items/options/quantities/discounts, shipping/tax/total, recorded refund and receipt number. Read-only: no fulfillment, shipping, payment or refund writes or fake orders are created. Private data clears with the session and late responses are discarded. ORDER-01/02 are connected_partial; operational write workflows and full visual/state acceptance remain unfinished. No migration or real business writes added.

Final stored-order verification: all 9 customer/admin order PostgreSQL tests and all 4 admin order browser checks passed. Browser checks repeated against refreshed localhost:8080, covering exact amounts, stored detail reloads, search/status filters, denial before reads and Persian mobile layout. Frontend lint/types, backend ruff/mypy, regenerated API client and API/web builds passed. All eight services healthy; readiness 200 and unauthenticated list/detail 401/no-store. No migration or real business writes added. Concurrent workspace changes preserved.


### 2026-10-14 — Admin saved receipt viewing and printing

Added persistent `/admin/orders/{id}/receipt` views behind orders.read_all, using the existing protected order snapshot. Receipt number, timezone-validated issue timestamp and exact paid amount are shown alongside the saved order amounts/items. No receipt is invented when absent, and no payment action is performed. The print stylesheet removes admin navigation and action controls only for the receipt view, leaving other pages' printing unchanged. Session/request read guards and cache clearing remain in place. No backend contract, migration or real business write added; wider admin workflows remain incomplete.

Final saved-receipt verification: all 6 admin-order browser checks passed; both receipt/print/missing-state checks repeated on refreshed localhost:8080. Frontend lint/types and web production build passed. Print layout inspected; navigation/actions are removed and saved values remain visible. All eight services healthy. Only web refreshed; no backend contract, migration, payment action or real business write added.


### 2026-10-14 — Admin commission queue search and statuses

Replaced the loaded-page commission filter with protected server-wide search across request ID and brief text, plus validated commission status filtering before cursor pagination. The reference dropdown/search controls submit explicitly, preserve current status when clearing search, reset pagination and clear private query state with the session. Queue view changes guard unpublished drafts; confirmed discards clear selected preview/terms/note state. Acknowledged publication/status changes remove rows that no longer match the current status. Existing private PNG publication and uncertain-write recovery remain unchanged. Customer review history now displays the same note in multiple locations, so its publication browser assertion was scoped to the history region. No migration or real business writes added; artist assignment, final-file/payment workflows and wider administration remain unfinished.

Final commission-queue verification: all 10 commission PostgreSQL tests, 7 focused publication client tests and 5 publishing/queue browser checks passed. All 5 browser checks repeated on refreshed localhost:8080. Frontend lint/types, backend ruff/mypy, regenerated API client and API/web builds passed. All eight services healthy; readiness 200 and unauthenticated filtered commission queue 401/no-store. No migration or real customer publication/business writes added in this slice. Concurrent workspace work preserved.


### 2026-10-14 — Admin cancellation and return queue filters

Connected server-wide reason/request ID/order ID/order reference search and validated request status/type filters before UUID cursor pagination. The reference dropdowns and explicit Search/Clear controls reset pagination and guard unsaved customer replies before changing the queue. Clearing search preserves status/type; session clearing removes private search/filter state. Existing versioned staff decisions, read-only access and uncertain-write recovery remain unchanged. No migration or real business write added; refunds, fulfillment and return inspection remain unfinished.

Verification: 5 isolated PostgreSQL request-review tests (including filtered cursor pagination, reference/ID search, literal percent and invalid filters), 7 focused client tests and 5 browser checks passed. Browser checks cover combined server filters, discarded/kept reply drafts, lost-response recovery, read-only access and Persian mobile layout. Frontend lint/types, backend ruff/mypy and API client generation passed.

Local verification: API/web builds passed and the refreshed localhost:8080 passed all 5 request-review browser checks again. Readiness returned 200; unauthenticated filtered requests returned 401 with no-store. Seven services are healthy. The concurrently changed local MinIO container is restarting because its configured user cannot write its existing volume; this slice did not change storage configuration or data. File-related runtime availability needs follow-up. No migration or real order decisions/refunds were performed.


### 2026-10-14 — Admin order-request decision history

Added protected GET /api/v1/admin/order-requests/{id}/reviews, requiring orders.read_all. Returns only the selected request's recorded decisions, staff actor ID, timestamp, reply and expected version, newest version first. Cursor lookup is scoped to the same request; missing requests/cursors return 404. This is read-only and adds no migration. The reference admin detail panel shows bilingual decision history, Tehran timestamps, version transitions, manual loading/retry, empty/error states and older-page loading. Private history clears on session changes, late responses are ignored, and selected request/version changes reset history after acknowledged writes or reconciliation. No real order decisions, refund, fulfillment or return inspection were performed.

Verification: all 6 isolated PostgreSQL review tests, 9 focused client tests and 6 browser checks passed. Tests cover cross-request cursor rejection, permission/session denial, chronological pagination, retries, history reset after saving, and private cache/late-response clearing. Frontend lint/types, backend ruff/mypy and API client regeneration passed. Wider admin workflows remain incomplete.

Final local decision-history verification: API/web production builds passed; all 6 review browser checks repeated successfully on refreshed localhost:8080. Readiness returned 200 and unauthenticated history returned 401/no-store. Fixed the observed MinIO startup failure by setting ownership of the existing nilart_minio_data volume to its configured UID/GID 10001, then restarting only MinIO; existing file contents were preserved and no storage configuration was changed. Runtime health checked after restart. No application migration or real order/refund write performed.


### 2026-10-14 — Protected admin Activity log

Connected the reference System → Activity log at /admin/activity, with /admin/audit as an alias. New GET /api/v1/admin/identity/audits requires identity.manage, consistent with existing private account audit access. Read-only overview projects action, internal reason, actor/account IDs and timestamp; detailed changes remain in scoped pages. Literal server search across action/reason and optional validated account UUID filter apply before timestamp/UUID cursor pagination. Cursors must match the current filters. Reference shell/table and bilingual explicit Search/Clear/Reload controls provide private-cache clearing, stale-response guards, Tehran timestamps, older entries, loading/error/empty states and read retries. Fixed development strict-effect cleanup so the initial read can restart safely. ORDER-07 is connected_partial; catalog/price histories remain in their scoped pages and comprehensive cross-domain aggregation is unfinished. No migration or real business writes added.

Verification: 13 isolated PostgreSQL identity management tests, 2 client privacy tests and 4 activity browser checks passed. Coverage includes permissions/revocation, filtered cursor ordering, invalid account IDs, literal wildcard search, session and late-response clearing, server search/pagination, retries and Persian mobile layout. A concurrent registration test used an unsupported Testing Library role option; removed that option while preserving its exact string name assertion.

Final Activity log verification: frontend lint/typecheck, backend ruff/mypy, regenerated API client and API/web production builds passed. Both privacy tests and all 3 concurrent registration transition tests passed. All 4 Activity log browser checks repeated successfully on refreshed localhost:8080. All eight services healthy; readiness 200 and unauthenticated global audit feed 401/no-store. No migration or real business write was performed; concurrent workspace changes preserved.


### 2026-10-14 — Live admin order overview

Added read-only GET /api/v1/admin/order-summary behind orders.read_all. A single SQL statement counts all persisted orders by payment/fulfillment state and submitted/in_review cancellation/return requests. Approved/rejected/completed requests are excluded from the awaiting-review count. Response contains aggregate counts only, without customer IDs, addresses or monetary aggregation. The reference dashboard now presents bilingual order overview panels and links to orders/request review, with explicit refresh, read retries, empty/error/loading states and session/stale-response clearing. Staff without order access never fetch or see the panel. Updated the stale dashboard integration notice to reflect connected orders. No migration or real order/refund/fulfillment writes added. ADM-01 remains connected_partial; inventory, costing and finance metrics remain unfinished.

Verification: 10 customer/admin order PostgreSQL tests and 7 review PostgreSQL tests passed, including empty/persisted counts, access denial and request transition counts. All 18 admin shell/summary browser checks passed, including Persian mobile, unauthorized read avoidance, refresh/retry and explicit zero results.

Final order-overview verification: both client session/privacy tests, frontend lint/typecheck, backend ruff/mypy, regenerated API client and API/web production builds passed. After transient nginx 502 responses immediately following container replacement settled, all 4 summary browser checks passed on localhost:8080. All eight services healthy; readiness returned 200 and unauthenticated order summary 401/no-store. No migration or real order/refund/fulfillment write added. Concurrent workspace changes preserved.


### 2026-10-14 — Live support dashboard overview

Connected GET /api/v1/admin/customer/ticket-summary behind support.manage, aggregating recorded tickets by status in one database statement. The response exposes counts only; addresses, messages and other customer records are excluded. The reference dashboard displays total tickets and submitted/awaiting_reply/awaiting_customer/closed counts, explicit zero results, refresh/retry/error/loading states and an inbox link. Staff without support access never fetch or see the panel. Aggregate cache clears on session changes and late responses are discarded. No migration, ticket reply/status changes or real business writes added. ADM-01 remains connected_partial; inventory/costing/finance metrics remain unfinished.

Verification: 18 customer/support PostgreSQL tests, 2 summary privacy tests and 4 browser checks passed. Coverage includes permission/session denial, status totals and non-ticket exclusion, private cache/late-response clearing, inbox navigation, read retry, empty results and Persian mobile layout. API client regenerated; frontend lint/types and backend ruff/mypy passed.

Final support-overview verification: API/web production builds passed and all 4 dashboard support browser checks repeated successfully on refreshed localhost:8080. All eight services healthy; readiness 200 and unauthenticated ticket summary 401/no-store. All 18 customer/support PostgreSQL tests and both privacy tests passed. No migration, real ticket reply/status changes or business writes performed; concurrent workspace changes preserved.


### 2026-10-14 — Live commission dashboard overview

Added GET /api/v1/admin/commissions/overview/summary behind commissions.manage, counting persisted commission statuses in one statement. Aggregate response contains no brief, account IDs, private artwork or agreement details. The reference admin dashboard now displays total commissions and awaiting_review/in_progress/awaiting_customer/revision_requested/approved/cancelled counts, an explicit queue link, refresh/retry and zero/error/loading states. Staff without commission management access never fetch or see the overview. Private counts clear with the session and late reads are discarded. No migration or real commission publication/status/business writes added. ADM-01 remains connected_partial; artist assignment, final-file/payment and wider operational workflows remain unfinished.

Verification: 11 isolated commission PostgreSQL tests, 2 client privacy tests and 4 dashboard browser checks passed, covering actual persisted status changes, private projection, empty and permission/session-denied reads, session clearing/late responses, queue navigation, retry/zero state and Persian mobile layout. Frontend lint/types, backend ruff/mypy and regenerated API client passed.

Final commission-overview verification: API/web production builds passed and all 4 commission dashboard browser checks repeated successfully on refreshed localhost:8080. All eight services healthy; readiness 200 and unauthenticated summary 401/no-store. No migration or real commission publication/status/business write performed; concurrent workspace changes preserved.


### 2026-10-14 — Activity log staff actor filter

Extended the protected identity.manage activity feed with optional actor_id UUID filtering combined with account ID and literal action/reason search before pagination. Cursor validation respects the actor scope. The reference Activity log editor now has bilingual Actor ID validation, explicit Search, combined filter pagination, Clear filters and session clearing. No migration or business writes added. Global audit aggregation and broader admin operations remain unfinished.

Verification: all 14 isolated identity PostgreSQL tests, 2 private cache/late-response client tests and 4 Activity log browser checks passed. Tests cover combined actor/account/search filters, mismatched cursor denial, invalid/empty actor results, form validation, server query parameters, cleared actor filters, unauthorized access and Persian mobile. Frontend lint/types, backend ruff/mypy and regenerated API client passed.

Final actor-filter verification: API/web production builds passed and all 4 Activity log browser checks repeated successfully on refreshed localhost:8080. All eight services healthy; readiness 200 and unauthenticated actor-filtered activity feed 401/no-store. No migration or business write performed; concurrent workspace changes preserved.


### 2026-10-17 — Saved order context in admin request review

Added an explicitly loaded order-context section to cancellation/return request review using existing orders.read_all-protected admin order details. It resolves immutable item titles, SKU/options, ordered and delivered quantities, delivery type and returnability recorded at purchase. Return reviews show requested quantities separately and include only requested lines; cancellation reviews show all order lines. Mismatched request/order IDs or unknown requested line IDs fail closed. Includes read retry, private session clearing, late-response guards, reset by request/version and a saved-order link behind the existing unsaved-reply navigation guard. Reference admin panels/tables extend the order review/details pattern. No backend contract, migration or real decision/refund/inspection writes added; actual return inspection and operational fulfillment/refunds remain unfinished.

Verification: 10 client review/context tests and 7 review browser checks passed. Checks cover mismatched lines, private session/late-response clearing, saved item identity, requested versus delivered/ordered quantities, failed-read retry and unsaved reply protection. Frontend lint passed. A typecheck briefly observed concurrent customer-page edits; a fresh typecheck passed without editing those files.

Final saved-order-context verification: web production build passed and all 7 review browser checks passed on localhost:8080, including mobile overflow with the loaded context. All 11 focused client tests passed, including exclusion of unrequested order lines. All eight services healthy and readiness 200. Build also required a minimal type guard for an unknown notification fixture payload in customer-feature-audit.spec.ts; no customer product behavior changed. Own changed-file whitespace checks passed; unrelated concurrent AddressFields whitespace was preserved. No API contract, migration or real decision/refund/inspection write added.


### 2026-10-17 — Persistent admin request review URLs

Connected /admin/order-requests/{id} as an orders.read_all-protected persistent detail route. Queue review actions navigate to stored request URLs; direct loads/reloads fetch only that request. Detail views retain read-only access messaging, explicit request-read retry and no fabricated detail on failures, plus guarded Back to requests navigation. Queue filters stay on the queue route; unsaved-reply view-change coverage now verifies guarded navigation back to that route. Existing decision writes, idempotency, uncertain-write recovery, saved order context and decision history are unchanged. No API contract, migration or real business writes added. Return inspection, refunds and fulfillment actions remain unfinished.

Verification includes client review/context tests, browser direct reloads, failed-read retry, direct-link denial before private reads, accepting/declining draft discard, existing recovery and Persian mobile coverage. Full production verification recorded below when complete.

Final persistent-review verification: all 11 client review/context tests and 10 browser checks passed; all 10 browser checks repeated on refreshed localhost:8080. Frontend lint/types and web production build passed. All eight services healthy; readiness 200. Changed-file whitespace checks passed. Web refreshed; no API contract, database migration or real decision/refund/inspection write performed. Concurrent workspace work preserved.


### 2026-10-17 — Activity log Tehran date ranges

Added optional date_from/date_to to the identity.manage activity feed. Both dates are inclusive calendar days in Asia/Tehran, combined with actor/account/reason filters before timestamp/UUID pagination; cursor lookup uses the same scope. Invalid or reversed ranges return 422. Reference native date controls submit explicitly, validate reversed ranges, retain the applied dates for older-page/reload reads and clear them with filters or the session. No migration or business writes added; broader administration remains unfinished.

Verification: all 15 isolated identity PostgreSQL tests, 2 client privacy tests and 5 Activity log browser checks passed. Tests cover Tehran midnight boundaries, inclusive day ends, invalid ranges/dates, mismatched-date cursors, combined actor/date pagination, date input clearing, access denial and Persian mobile layout. Frontend lint/types, backend ruff/mypy and API client generation passed.

Final date-filter verification: API/web production builds passed; all 5 Activity log browser checks repeated successfully on refreshed localhost:8080. All eight services healthy; readiness 200 after transient proxy refresh settled, and unauthenticated date-filtered feed 401/no-store. Changed-file whitespace checks passed. No migration or business write performed; concurrent workspace changes preserved.


### 2026-10-17 — Requests linked from saved order details

Extended the orders.read_all request queue with optional validated order_id filtering before cursor pagination, combined with existing query/status/type filters. Saved order details now explicitly load that order's cancellation/return requests with status, reason, Tehran timestamp and persistent review links. Supports pagination, reload/retry, true empty/error/loading states, private session clearing and stale-response guards. Client rejects cross-order responses. Request controls are excluded from saved receipts; receipt detection also accepts a trailing slash. Reference admin panels/detail links are reused. No migration or real order decisions/refund/fulfillment/inspection writes added.

Verification: 7 isolated request-review PostgreSQL tests, 3 request-list privacy/scope client tests and 8 order-page browser checks passed. Includes combined order filters, cross-order empty results, invalid IDs, private cache/late-response clearing, retry/pagination query scope, direct review navigation, receipt isolation and existing Persian mobile checks. Frontend lint/types, backend ruff/mypy and API client generation passed.

Final order-linked-request verification: API/web production builds passed; all 8 order-page browser checks passed again on localhost:8080. All eight services healthy and readiness 200 after concurrent web replacement settled. Unauthenticated order-scoped request list returned 401/no-store. No migration or real order decision/refund/fulfillment/inspection write added; concurrent workspace changes preserved.


### 2026-10-17 — Exact action filtering for staff activity

Added optional bounded exact action filtering to the identity.manage activity feed, composed with account/actor/date/reason scopes before pagination and cursor lookup. A reason mentioning an action code does not count as that action. The reference shared dropdown offers common access/security/support/order actions; All actions retains the full feed. Selection applies explicitly through Search, persists for older-page/reload reads and clears with filters or the session. Used a non-label container around the shared dropdown so native label activation does not reopen the menu after selection. No migration or business writes added; operational admin gaps remain unfinished.

Verification: 16 isolated identity PostgreSQL tests, 2 private cache/late-response client tests and 6 Activity log browser checks passed. Covers exact-action exclusion of reason-only matches, combined scopes, pagination, mismatched-action cursor denial, empty/invalid actions, explicit apply, filter clearing, access denial and Persian mobile. Backend ruff/mypy and API client generation passed.

Final exact-action verification: frontend lint/types, API/web production builds and all 6 Activity log browser checks passed on refreshed localhost:8080. All eight services healthy; readiness 200 and unauthenticated action-filtered feed 401/no-store. Changed-file whitespace checks passed. No migration or business write performed; concurrent workspace changes preserved.


## 2026-10-17 — Materials and service rates

Connected `/fa/admin/materials` and `/fa/admin/service-rates` (and English equivalents) with protected, versioned resource editing, explicit purchase/consumption conversion, exact nullable rates/currencies/validity, deliberate zero acknowledgement, archival, server filters/pagination and immutable history. Stable revision receipts support lost-response recovery; stale edits retain inputs and require review of the current version. Saved-resource consumption previews report missing data instead of inventing totals. Migration 0029 adds resource/version tables without business seeds. The worker validates and deduplicates the new save event; it does not move stock or publish prices.

Validation: 21 isolated PostgreSQL costing tests, 19 outbox tests, 7 frontend unit/component tests and 13 intercepted browser checks passed; backend lint/type checking and frontend lint/type checking passed. See `docs/costing-foundation.md` for contracts and limitations. COST-01/02/03 remain connected_partial: BOM/SKU costing, cutting yield, procurement, inventory, production, finance and the other remaining admin workflows are not complete.

Production verification: API/web/worker images rebuilt successfully; additive migration 0029 applied to the local database. All eight services healthy. All 13 costing browser checks passed again through localhost:8080 using intercepted fixtures (no business records created). Unauthenticated list/detail/estimate requests return 401 with no-store. New local routes: /fa/admin/materials and /fa/admin/service-rates.


## 2026-10-18 — SKU recipes, manufacturing estimates and dependency review

Connected bilingual `/admin/recipes` library/editor and `/admin/costing` entry point, with real SKU lookup, stable drafts, immutable recipe/resource snapshots, explicit quantities/bases/conversions, confirmed cutting yield and waste, validity/archive and history. Exact rational batch/unit costing requires explicit output/date/rounding and blocks incomplete or stale data. `/admin/price-review` derives changed/expired/archived/unknown resource dependencies before pagination. Reviewing new rates preserves quantities only when units/conversions and cutting dimensions allow it; changed cutting dimensions require renewed approval. Version conflicts retain inputs and require comparison, unknown saves retain an exact retry intent, private caches clear on session changes. Migration 0030 is additive and seeds no business records. See `docs/sku-recipes.md` for API contracts and unfinished scope.

Validation: 19 isolated PostgreSQL recipe tests, 19 outbox tests, 21 material regression tests; 7 recipe frontend tests (plus material/support regressions); 16 intercepted recipe browser workflows. Targeted lint/type checks passed. COST-04/05/06/07/09 remain connected_partial: family templates/overrides, geometric cutting, price proposals, inventory/procurement/production/finance and other unfinished admin workflows are still outstanding.


Local deployment verification (2026-10-18): additive migration 0030 applied; API, web and worker updated; all eight services healthy. Frontend production build passed. Container package download failed due to DNS; the API/worker source update used an existing local runtime after verifying every installed package against requirements.lock (zero mismatches). Standard Dockerfiles and dependency requirements were preserved. Protected recipe/SKU/review endpoints return unauthenticated 401 with no-store; Persian recipes/costing/review routes return 200. No business records were seeded or written by browser checks.

Browser verification through localhost:8080: all 16 new recipe/review workflows and 13 material/service workflows passed. One material test initially reached a transient 502 during proxy/container replacement; after the proxy refresh it passed on a focused retry. New checks use intercepted fixtures; database tests use isolated schemas.


## 2026-10-18 — Supplier/provider directory

Connected protected bilingual `/admin/inventory/suppliers` list and stable editors using reference shell/shared dropdowns. Explicit goods/service/both type, optional contacts, localized phone digits, multi-line address/notes, archive, literal server contact search and paginated immutable history. Versioned writes require fresh permission/session/Origin/CSRF and commit supplier+revision+audit+outbox atomically. Conflicts preserve inputs and require comparison; unknown saves retain exact receipt/retry identity. Migration 0032 is additive with no supplier/balance seeds.

Verification: 17 isolated PostgreSQL checks (including concurrency, reversal, rollback and TOCTOU), 7 frontend client/privacy checks and 10 intercepted browser workflows. See `docs/supplier-directory.md`. OPS-04 remains partial because supplier financial balances, purchases, independent payments and statements are not yet implemented; other remaining admin modules remain outstanding.

Local deployment: frontend production build passed; API/worker source updated using an existing runtime after all installed dependency versions matched requirements.lock. Local database is at 0032; all eight services healthy. Supplier list/history reject unauthenticated requests with 401/no-store, and the Persian admin route returns 200. No business supplier or financial records were seeded.

All ten supplier browser checks passed again through localhost:8080 after deployment, using intercepted fixtures.


## 2026-10-18 — Discount placeholder replaced with real rule management and sandbox application

Implemented `/admin/discounts` list/editor with versioned fixed/percentage rules, named product/collection/category scopes, validity/caps/quotas/mobile restrictions, stacking opt-in, usage counters, immutable history and retained conflict/unknown-save workflows. Live cart directs code entry to sandbox checkout; fresh server quotes and payment revalidation use exact rational allocation. Discount usage reserves atomically with order/payment/outbox; verified success redeems once; definitively rejected gateway creation releases; unresolved/resumable attempts retain reservations. Zero-total orders complete without a gateway call, with a prefixed zero-total sandbox receipt. Complete payment intents now bind retries, and stale/unmounted checkout responses cannot navigate. Migration 0033 preserves old snapshots and guards downgrade when zero-total rows cannot fit the prior schema. No business codes/orders were seeded.

Verification: 27 isolated discount PostgreSQL checks plus 6 payment and 19 outbox checks; 13 frontend tests; 12 intercepted browser workflows including fa mobile. Build/lint/type verification and local deployment recorded in docs/discount-management.md. ADM-09/10 remain connected_partial in the full release register: real merchant activation, stock/fulfillment and ambiguous-provider operational recovery remain separate existing prerequisites.

## 2026-10-18 — Integrated sandbox foundations and shared admin UI

Implemented versioned business settings, recorded stock/valuation adjustments and linked reversals, approved-only bilingual content, and an immutable media/print library. Added an isolated resettable nilart-demo workspace at http://127.0.0.1:18080 with separate database/storage/queues and host-isolated login cookies. Synthetic users/data are created only there. The 56-view and AC-01–22 matrix is docs/admin-release-acceptance.md; full scope/current remaining work is docs/admin-sandbox-release.md.

Redesigned live admin tables/filters/buttons using shared AdminFilters, AdminButton, AdminAction, AdminTable and AdminDataTable components. Migrated existing admin table markup and primary/secondary controls, made row actions accessible SVG icons, grouped catalogue/account/support filters, and converted price review/content/media lists into tables. Mobile action columns stay visible during horizontal scrolling. Preserved all existing guards, APIs and pending-intent semantics.

Verification: 574 backend tests passed, 340 frontend tests passed, lint/types/production build passed; 60 existing admin browser checks, 22 foundation workflows and five fa/en desktop/mobile redesign checks passed. Two real database-backed browser journeys verified synthetic settings/stock and content/media behavior in the separate demo. A stale customer-order test was updated to verify the now-separate payment/delivery badges without changing that screen.

Local deployment: private pre-migration database backup saved; additive migrations 0034–0037 applied, all eight main services healthy, new private APIs reject guests with 401/no-store. No business data seeded in the main workspace. The complete operational release is NOT finished: catalogue/media consumption, advanced costing/publication, stock reservations, purchasing/production, financial ledgers/reports, fulfillment/refunds and complete commission/artist workflows remain outstanding. Do not describe this foundation/UI release as all 56 views completed.

## 2026-10-18 — Purchase/stock source-document workflow

Added 0038 and live purchasing APIs/UI, source-linked stock receipt/return movements and supplier purchase-liability statements. Eleven purchase PostgreSQL tests plus the nineteen stock-ledger checks verify exact retries, stale versions, rounding, weighted averages, receipt eligibility, source reversal protection, multi-line rollback, permissions/CSRF and large monetary values. All 343 frontend checks pass. The opt-in real demo browser journey passes with actual records: draft → post → partial receipt → deliberately lost response → exact result recovery/replay → linked return → stock and supplier statement → Persian mobile. Demo writes are isolated from main business data. Restored-copy migration preserves the complete inventory-position snapshot; private backups precede main schema activation. See purchase-workflow.md. Financial payments/full supplier balances, production and the rest of integrated acceptance remain pending.

## 2026-10-18 — Production/WIP/QC and waste

Migration 0039 adds pinned batches and immutable commands; purchasing keeps its original API through the shared document-owned stock writer. Production tracks actual material issues/unused returns, explicit service totals, incomplete recorded WIP, normal waste, separate abnormal loss, healthy output transfer and cancellation/write-off. Repeated materials share stock, and rollback/duplicate commands preserve counts. Stock waste has a searchable source/reversal register; physical zero-value production write-offs remain visible. Read/write permissions are independent and write authorization is refreshed.

Real isolated browser evidence covers purchased material → batch start → material issue/return → service cost → QC → healthy stock plus abnormal cost → stock waste, including dropped completion response, exact recovery/replay, historical values and Persian mobile. Existing purchase browser journey and twenty-one stock/supplier/shared-table browser checks pass. Main/demo migrations and services are checked independently; synthetic records stay in demo. Full release acceptance remains pending. See production-workflow.md for remaining dependencies and allocation method.

## 2026-10-19 — Recorded cash and supplier allocations

Migration 0040 adds cash/bank accounts, explicit dated openings, receipts/payments, atomic transfers, categorized expenses, linked corrections and purchase-allocated partial supplier payments/refunds. Purchase receipt, liability, cash movement and revenue remain distinct; returns after payment create supplier credit until actual refund received is recorded. Independent read/write/export permissions, exact amounts, expected versions, stable operation recovery, audit and deduplicated outbox apply. Shared fa/en admin tables/filter/icon actions cover finance routes and aliases. Date-filtered cash flow and protected CSV exports are connected. See finance-workflow.md.

Verification: 615 backend tests and 347 existing frontend tests passed, plus three new finance client checks. Real isolated browser evidence verifies transfer/expense/correction, ambiguous response recovery, exact replay, CSV and mobile fa/en. Restored-copy additive migration preserves existing stock/purchases/production. No synthetic financial records or invented opening balances enter the main workspace. Full admin release remains unfinished: uploaded finance attachments, XLSX, gateway/customer/artist obligations, full reports and downstream checkout/fulfillment/refunds remain pending.

Deployment verification (2026-10-19): main and isolated demo are at schema 0040; all nine services in each workspace are healthy. Main finance accounts/documents are both empty; no synthetic balances were introduced. Guest finance reads return 401/no-store and fa/en finance routes respond successfully. Sixteen emitted demo finance events were published and processed exactly once at the worker audit check. Both real finance browser journeys passed independently; finance client tests (3), backend finance checks (7), type checking, targeted lint and the frontend production build passed. The full backend run passed 615 checks; existing frontend suite passed 347 before adding the three finance client checks.

## 2026-10-19 — Historical operational reporting and XLSX

Added permission-controlled inventory valuation/low-stock, source movements, warehouse waste/corrections and production WIP/QC/cost reports with explicit event-time cutoffs. Historical thresholds and costs come from immutable events; incompatible quantities stay grouped by unit. Production estimates use pinned rates, actual costs stay separate, missing values remain unknown and historical reservation availability is explicitly withheld. Source links honor operational permissions and filters survive URL navigation. Dashboard inventory/WIP/low-stock/incomplete-cost metrics now use recorded reports; the stale integration placeholder was removed. CSV/XLSX exports include exact amounts, currency, complete filters and source/correction IDs under independent finance.export access. Financial document exports also support XLSX. No schema changes or synthetic main records. See operational-reporting.md.

Verification: full backend suite 621 passed; frontend suite 353 plus two new dashboard checks passed; targeted lint, production build and real isolated reporting browser evidence cover historical valuation, low stock, waste reversal, source navigation, XLSX, WIP completion and fa/en desktop/mobile. Full integrated admin acceptance remains unfinished; FIN-11/12 remain connected_partial.

Deployment verification (2026-10-19): the final build is deployed to both local main and isolated demo. All nine services per workspace are healthy. Schema remains 0040, main finance-account and production-batch counts remain zero, and no synthetic report fixtures were seeded there. Guest report/read/export requests return 401/no-store; fa/en reports and the finance inventory-value alias return 200/no-store. Final verification: 621 backend tests, 355 frontend tests, production build/type checking/targeted lint, and all three real isolated finance/supplier/reporting browser journeys passed. The reporting journey also verifies recorded dashboard navigation.

## 2026-10-19 — Reviewed price proposals and explicit publication

Migration 0041 connects exact recipe-cost snapshots to explicit margin/fee/fixed-cost/rounding proposals, custom prices and simulated discounts. Proposals are saved/revised/rejected independently of publication. Expected versions, reviewed-calculation fingerprints, shared source locks and the existing SKU price version/audit reject stale inputs and prevent duplicate publication. Pending reads flag changed resource/recipe/public-price/bundle dependencies. Own immutable receipts recover unknown outcomes. Publication, audit and outbox are atomic; historical inventory/order costs remain separate. pricing.publish is independent of catalog.manage and now also gates the legacy manual SKU-price writer; catalogue-only controls are read-only. Shared fa/en admin UI, proposal routes and the existing dependency queue remain available. See price-proposals.md.

Verification covers six PostgreSQL pricing workflows, three client binding/recovery checks and a real isolated preview→draft→publication→lost-response recovery→stale rate→reviewed revision→rejection browser journey with fa/en desktop/mobile layouts. Restored-copy additive migration preserves stock, purchases, production, SKU prices and price audits. The full admin release remains unfinished; COST-08–10 remain connected_partial for family/group/bundle/scheduled review and full acceptance. An existing customer payment-filter test was updated to select the shared dropdown option through its actual interaction; customer behavior was unchanged.

Deployment verification (2026-10-19): main and isolated demo are at schema 0041 with the pricing build. Main proposal/event tables remain empty; synthetic pricing decisions are confined to demo. Guest proposal reads return 401/no-store and fa/en proposal routes return 200/no-store. Ten demo pricing events were published and processed once at the worker check. Final verification: 627 backend tests, 358 frontend tests, production build/type checking/lint, 15 existing/permission browser checks and one real pricing browser journey passed.
