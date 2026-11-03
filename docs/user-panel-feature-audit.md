# User-panel feature audit — 2026-10-13

The complete reference feature set is **not ready**. Working account features and
unfinished commerce features are distinguished below. Passing the connected-feature
tests does not certify the missing workflows or a real paid purchase.

| Reference | Feature | Current result |
|---|---|---|
| USER-01 | Dashboard | API counts, recent owned orders, actionable artwork review cards, real ready-file cards, updates, localized quick links, loading/retry and mobile drawer tested. Owned counts for recorded orders, paid orders awaiting delivery, active requests and eligible downloads are implemented; financial aggregates remain unfinished. |
| USER-02 | Orders list | Owned persisted order history, full-history reference/item/SKU search, payment/delivery filters, cursor pagination, empty/error/retry and fa/en views implemented. Checkout ingestion remains an internal adapter boundary; no public checkout integration yet. |
| USER-03 | Order details | Owned immutable items, exact historical amounts, saved address, payment and fulfillment states implemented. Cancellation/return submission and recorded staff review are available; upstream execution/completion remains unfinished. |
| USER-04 | Receipt/invoice | Displays and prints an issued historical payment receipt. Never synthesizes a receipt for pending/review payments. Official tax invoice generation and payment-provider integration remain unfinished. |
| USER-05 | Cancellation | Owned cancellation request submission, eligibility, versions, idempotency, draft guards and uncertain-result reconciliation implemented. Recorded staff review is implemented; actual fulfillment cancellation remains unfinished. |
| USER-06 | Returns | Owned return request submission with explicit stored deadline, physical delivered quantities and duplicate-quantity protection implemented. Receiving/inspection and refund execution remain unfinished. |
| USER-07 | Return/refund status | Owned request list/details show persisted review status, public decision history, original item names and requested quantities. Order details show the recorded refund state/amount separately. Staff review transitions are implemented; payment-provider reconciliation remains unfinished. |
| USER-08 | Digital downloads | Owned library and verified private file downloads implemented for released paid digital order lines. Staff release/revoke APIs, commission approval checks, integrity checks and account cleanup included. Files are bounded to 16 MiB in private PostgreSQL storage; staff release/revoke controls are implemented in order details; large object storage and automatic checkout delivery remain unfinished. |
| USER-09 | Artwork approval/revisions | Owned commission history, private PNG previews, immutable version history, acknowledged approval/revision, limits, conflict checks and unknown-result recovery implemented. Staff publishing screen and API require confirmed agreed terms. Final-file release APIs/downloads exist; the staff final-file release screen is implemented; quote/payment integration remains unfinished. |
| USER-10 | Favorites | Product, bundle and artwork save/remove; persistence, published-title search, type filters, pagination, unknown-write recovery and read-only permissions tested. |
| USER-11 | Addresses | Save, edit, default selection, deletion, persistence and all-page loading supported. Ambiguous saves reconcile against server data without discarding the draft. Live forms accept province/city names beyond the sample regions and display both named and legacy locations. An authoritative region directory and delivery availability lookup remain unfinished. |
| USER-12 | Profile | Server profile, confirmed edits, conflicts, draft retention, guest denial and account-switch cleanup tested. Email unsupported. |
| USER-13 | Security | Password change, owned session revocation and verified phone change tested. SMS provider acceptance/delivery in production is not verified; development sandbox is separate. |
| USER-14 | Preferences | Language and in-app categories persist after acknowledgement; read-only inputs disabled. SMS notification delivery unavailable. |
| USER-15 | Support | Ticket submission, persistence, owned order/item association, search/filtering and read-only behavior tested. New-ticket PNG, JPEG and PDF files are selected locally and uploaded after confirmed ticket creation, with partial-failure recovery. The same private formats are supported in existing conversations. |
| USER-16 | Support conversation | Reply persistence, owned message history, close/reopen and version handling tested. Private PNG/JPEG/PDF conversation attachments with ownership, limits, idempotent upload and staff downloads implemented. Authorized staff can upload the same formats to a conversation, with reply drafts preserved and private customer delivery. |
| USER-17 | Notifications | Automatic in-app notices for artwork previews, file release/revocation and request reviews respect saved category preferences and link to the relevant workflow. Read/unread, filters, bulk read, persistence and Tehran timestamps tested. |

## Fixes made during this audit

- Connected bundle and artwork favorites to existing owned APIs.
- Favorite writes now wait for a valid initial read, respect write permissions, clear on
  account switches, and require server reload after an unknown write result.
- Added guarded full pagination to the customer adapter; addresses no longer fail at
  the first 100 records. Repeated cursors fail explicitly rather than looping.
- Disabled editing in live address, preferences and support forms for read-only accounts.
- Address writes now block unconfirmed retries and offer an explicit check of the saved
  result. The saved version is applied to the draft only by the user's choice.
- Added confirmed bulk notification reading. Existing owned records are captured and
  updated individually with their versions. The operation is not atomic: partial failure
  requires reload; no automatic mutation retry is performed.
- Removed the fake reference artwork-order link from live support guidance.

## Verification limits

Backend tests use the real PostgreSQL database in temporary rollback-only test schemas;
they do not modify real customer accounts. Browser tests use mocked private API contracts
and include real public page rendering. They verify UI and API agreement, not real payment,
external SMS delivery, financial reconciliation or private file downloads.

Final verification counts and production-preview results are recorded below after the
last run. The normal local preview is http://localhost:8080/fa/account and requires login.

## Final results

- 114 frontend unit tests passed; six new regression tests cover pagination, uncertain
  favorite writes, read-only favorites, account changes and bulk reads.
- 35 focused backend tests passed against isolated real PostgreSQL schemas, covering
  customer records, ownership, profile, OTP, commissions, account permissions, security,
  session revocation and phone changes.
- All 26 selected browser checks passed against the final production build at port 8080.
  This includes the new default-address and support-reply recovery checks and every
  unavailable USER-02–09 destination. Private API writes in these tests are mocked.
- Focused lint, TypeScript checking, production Docker web builds and changed-file
  whitespace checks passed. All eight application services remained healthy.
- Only the web service was rebuilt/restarted. No production customer record, order,
  payment or inventory record was created or changed by this audit.

Additional recovery fixes: uncertain default-address writes can be checked directly
from the list, and reloading an uncertain support reply keeps the draft. The updated
local application is available at http://localhost:8080/fa/account.

## Continued implementation: persisted order reads

Migration 0023 adds owned historical order snapshots and reserved request storage.
The internal `record_checkout_snapshot` adapter validates exact totals, delivered
quantities and confirmed receipt/payment consistency, preserves source idempotency,
and writes its audit/outbox records in the caller's transaction. Customer order
creation is not exposed. Upstream checkout ingestion and state updates remain to be
integrated; real accounts can legitimately have empty history.

New customer APIs list orders, retrieve owned details and retrieve an issued receipt.
Foreign orders and foreign pagination cursors return 404. Reads require
`orders.read_self`. The frontend uses exact amount strings, retains the stored currency,
and provides bilingual history/details/receipt views with explicit retry and print.
Cancellation/return submissions now persist for review; staff resolution, financial execution, private downloads and artwork review are still incomplete.

This continuation passed three new PostgreSQL tests and six new order UI unit tests.
The full current frontend suite passed 129 tests (including concurrent catalog/admin work).
Migration 0023 and the rebuilt API/web are running in the local preview.


## Cancellation and return request continuation

Customer submissions recheck Origin, CSRF and current `account.write_self` plus
`orders.read_self` permissions under the account lock. The owned order is locked,
version checked and incremented; one active request per order is enforced.
A repeated request identity with identical payload returns its original result.
The request, audit and outbox insert commit together. No order fulfillment or payment
state is changed by submission.

Returns require an explicit upstream return deadline and confirmed delivered physical
returnable quantities. Quantities in prior non-rejected return requests are reserved,
including completed requests, so the same units cannot be requested again.

The live panel includes cancellation/return forms and owned request list/details.
Drafts are guarded during navigation. Unknown submission outcomes disable edits/retry
and can be checked by request identity without resubmitting. Known server rejections
allow explicit order refresh without discarding the reason.

The new order/request backend suite passed five PostgreSQL tests; the new UI suites
passed eleven tests. These do not certify staff review, warehouse receiving, real
payment cancellation/refunds or upstream checkout ingestion. Those integrations remain
unfinished, together with downloads, private attachments and artwork review.

Latest local verification after the request continuation:

- 136 frontend unit tests passed across the current shared checkout.
- Five dedicated order/request PostgreSQL tests passed in isolated rollback-only schemas.
- 16 selected browser checks passed against the rebuilt production preview at port 8080,
  including four new order/request browser scenarios; private API contracts were mocked.
- Frontend type checking, focused lint, backend lint, production builds and whitespace
  checks passed. Local API/web and the other six Nilart services are healthy.
- Both order and request APIs reject unauthenticated reads with HTTP 401.
- No real customer order, cancellation, return, payment, refund or inventory mutation
  was performed to demonstrate these features.


## Commission tracking and artwork review continuation

Migration 0024 adds commission status/version tracking, agreed revision terms,
immutable preview versions and one customer decision per artwork version.
Existing submissions appear in owned history and details; the dashboard links to this
history. No reference commission or artwork is inserted.

Small review previews are stored privately in PostgreSQL. The producer accepts only
validated non-interlaced 8-bit RGB/RGBA PNG files up to 5 MiB, 4096 pixels per axis and
four million pixels total. Checks include chunk bounds/CRC, exact bounded decompression
and valid filter bytes. Preview responses enforce owner access, no-store, PNG content
type, nosniff and restrictive content policy. Public catalog media is not used.
This is preview storage, not final file delivery or general attachment storage.

An authorized `commissions.manage` staff API publishes a version after confirming agreed
review terms. Origin, CSRF and current permissions are rechecked. Publication identity
is idempotent and terms cannot silently change between versions. The staff publishing
screen and quote acceptance/payment integration remain unfinished.

Customer approval/revision locks the owned commission and checks its current version,
latest artwork, awaiting-customer state, acknowledgement and recorded revision allowance.
The decision, status update, audit and outbox commit atomically. Approval never changes
payment, shipment, final delivery or publication consent. The live screen requires the
selected private preview to load and resets acknowledgement when refreshing or selecting
another version. Unknown writes retain feedback and reconcile via an explicit read.

Verification for this continuation:

- 144 frontend unit tests passed in the current shared checkout, including six new
  commission review UI tests.
- 12 focused backend tests passed: seven commission submission/review/history tests
  and five order/request regressions. Database scenarios use isolated rollback-only
  PostgreSQL schemas; the raster validation scenario runs without a database.
- 11 selected browser checks passed against the rebuilt local production preview,
  including four new commission scenarios and seven dashboard/order regressions.
  Browser private API contracts are mocked, including the private preview bytes.
- Production build/type checks, focused lint and whitespace checks passed.
  Migration 0024 is applied locally; API and web are healthy. Guest commission reads
  return 401. No real commission preview, customer decision or administrator promotion
  was created during verification.


## Private download continuation

Migration 0025 adds immutable bounded final file contents, hashes and order-line
entitlements. Authorized fulfillment staff can release a file only against a confirmed
paid digital order item. A linked commission also requires approval and the same owner;
approval alone never grants a file. Release identity is idempotent, conflicting content
is rejected, and audit/outbox writes commit together. Staff can revoke a release with
an optimistic version; repeating a completed revocation does not emit another event.

The customer library and content API require `orders.read_self` and owner access.
Every read checks current active entitlement, paid state, non-cancelled order and linked
commission approval. Any refund/review state blocks downloads until upstream entitlement
reconciliation is available. Foreign/revoked files are indistinguishable 404s. Content is
served as an attachment with no-store, nosniff and restrictive content policy; filenames
are printable basenames with Unicode attachment encoding. The server checks exact size
and SHA-256 before serving bytes; metadata never includes private contents or storage keys.

The live download panel includes empty/error/retry states, loaded-file search, pagination,
order links and download progress. The browser rechecks size/hash before saving, rejects
redirects and active document content types, discards responses from changed accounts,
and clears requests and temporary blob URLs on account changes/unmount.

Final files currently use bounded private PostgreSQL storage (16 MiB per file), separate
from small artwork previews. Large object-storage delivery, automatic checkout ingestion,
refund reconciliation, the staff release screen and general support/reference attachments
remain unfinished. No paid transaction or real final-file release is created by tests.


Order details now preserve optional commission linkage from historical snapshots and
link each commissioned item to its actual review. The reference order artwork-review
route lists only commissions linked to an owned order; unowned orders cannot expose a
review link. Orders without linkage explicitly state that no review is attached. The
commission service independently rechecks ownership when following a link.
The dashboard loads up to three recent owned orders only for `orders.read_self` accounts,
shows their recorded currency/totals and keeps unrelated account sections usable when
that read fails. No commerce aggregate counts are fabricated.

Verification after private downloads and linked order navigation:

- 158 frontend unit tests passed in the current shared checkout, including eleven new
  download UI/adapter tests and three order-link/dashboard regressions.
- 19 focused backend tests passed across downloads, orders and commissions. Persisted
  scenarios use real PostgreSQL in isolated rollback-only schemas; pure domain/raster
  validation scenarios run without a database.
- 24 browser checks passed against the final rebuilt local production preview. Four new
  download scenarios verify exact saved bytes, Unicode filenames, revoked access,
  checksum failure and Persian mobile search. Private APIs are mocked for browser tests.
- Production builds/type checks, focused lint and whitespace checks passed. Migration
  0025 is applied; all eight Nilart services are healthy. Guest download-library reads
  return 401. No real purchase, final-file release, refund or stock change was performed.

### Order request staff decisions (2026-10-13 continuation)

Implemented migration 0026 and staff queue/detail/review API at `/api/v1/admin/order-requests`. Reads require `orders.read_all`; decisions require both current `fulfillment.manage` and `orders.read_all`, Origin and CSRF checks. Versioned, idempotent decisions record immutable reviewer history plus audit/outbox events. Supported transitions: submitted → in_review/rejected; in_review → approved/rejected. Cancellation approval rechecks current fulfillment. Customer request pages show the public reply as plain text; reviewer identity stays private. Approval does not change payment, delivery, refund, or cancellation state. Completion remains unavailable pending actual upstream processing evidence.

Staff review screen is now connected at `/fa/admin/order-requests` and `/en/admin/order-requests`; see the following continuation for UI validation. Local checks: 8 order/request PostgreSQL tests, 14 focused frontend tests, 5 browser checks against the rebuilt local preview, type checking, lint and production build. Migration 0026 is applied locally; unauthenticated staff queue access returns 401. Prior broader test totals belong to the preceding downloads implementation, not this continuation.

### Staff request review screen (2026-10-13 continuation)

Implemented the admin request queue and detail screen in the existing reference shell, including sidebar access, loaded-record search, status filtering, pagination, read-only access, allowed status transitions, explicit decision confirmation and public replies. Drafts are guarded on navigation/unload; version conflicts preserve draft text and require refresh. Unknown acknowledgements lock editing and preserve the decision UUID for identical retries or explicit read reconciliation. Account changes clear private records and drafts. Approval still does not execute cancellation, return receipt, payment or refund.

Validation: 7 staff-screen unit scenarios plus 6 customer-request tests; production build, type checking and focused lint passed. Four browser scenarios verify the staff-to-customer reply flow, unknown-result reconciliation, read-only access and Persian mobile layout with mocked API records against the rebuilt production preview. No real customer decision or payment was made.

### Staff artwork publishing (2026-10-14)

Connected `/fa/admin/commissions` and `/en/admin/commissions` to an authenticated staff queue, detail and private-preview API protected by current `commissions.manage`. Staff can inspect the original brief and version/customer decision history, search loaded records, paginate, select a bounded PNG, preview it and publish after confirming the customer already accepted the recorded terms. Existing agreement and revision limits remain immutable. Publication drafts are guarded on navigation/unload and cleared on account changes. Invalid/conflicting writes retain drafts and require refresh; unknown results retain the artwork UUID and payload for identical retry or read reconciliation. This publishes review previews only; it does not charge, deliver a final file or grant public publication consent.

Validation: 7 PostgreSQL commission tests, 13 focused frontend tests and 8 browser checks passed. Browser checks use mocked contracts against the rebuilt local production preview and cover staff-to-customer handoff, lost acknowledgement, rejected files, customer decisions and Persian mobile layouts. Type checking, lint and production build passed; API contracts exported. No real commission or customer data was published during verification.

### Address locations beyond sample regions (2026-10-14)

Live customer address forms accept province and city names directly rather than restricting recipients to the three reference provinces. Both fields are required, bounded to 100 characters and trimmed before saving. Existing region IDs are preserved when unchanged and shown using their localized labels; records with named locations display their saved values. Changing province clears the previous city. Demo dropdowns retain their sample behavior. Saving an address does not establish delivery availability; a verified administrative region directory and shipping service remain outstanding.

Validation: 11 focused frontend tests and 12 customer PostgreSQL tests passed; type checking and production build passed. Browser coverage checks named-location persistence in English mobile and Persian forms with mocked private API records.

### Customer cancellation/return tracking (2026-10-14)

Request cards now link to detail tracking with the original order reference and item snapshot, requested return quantities (or purchased quantities for a cancellation), and recorded review steps/replies in version order. The owned tracking API checks both request and order ownership, exposes no reviewer IDs/address data and never invents execution events. Detail refresh updates request status; history fetch errors have independent retry without hiding the main request. Private tracking is cleared on account changes and late responses are discarded. Review approval continues to be separate from refund/fulfillment state.

Validation: 4 order-request PostgreSQL tests and 10 focused frontend tests passed. Production build, type checking, focused lint and contract export passed. Browser coverage checks request quantities/history, independent retry and Persian mobile presentation with mocked API records against the local production preview.

### Business event notifications (2026-10-14)

New artwork versions, digital file release/revocation and staff order-request review decisions now create owned in-app notifications in the same transaction as their recorded business event. Saved category preferences suppress notices; absence of saved preferences enables in-app notices. Deterministic event IDs deduplicate notifications and preserve read state on replay. Static bilingual titles omit private briefs/files/reviewer details. Notifications link to request tracking, commission review or the downloads library; opening the link neither approves artwork nor downloads a file automatically. Existing event identity/version checks prevent repeated actions from generating duplicate notices. No SMS is sent and older records are not backfilled.

Validation: 20 PostgreSQL notification/commission/request/download tests, 11 focused frontend tests and 10 customer-feature browser checks passed. Production build, type checking and focused lint passed. Browser checks use mocked notification contracts against the rebuilt local production preview to verify English/Persian workflow links and mobile layout.

### Dashboard order activity (2026-10-14)

The dashboard now reads owned counts for recorded orders, paid orders awaiting delivery, active cancellation/return requests and currently eligible downloads. Counts come from one database query; download eligibility shares the exact library predicate, including paid state, active files and linked commission approval. Read access requires `orders.read_self`. Activity errors have a separate retry and do not suppress account cards or updates; account changes clear the private counts. Counts link to the appropriate panel pages. No financial totals or checkout success are synthesized.

Validation: 7 private-download/summary PostgreSQL tests, 7 dashboard frontend tests and 4 browser layout/retry checks passed. Type checking, focused lint, contract export and production build passed. SMS is explicitly outside the current implementation scope at the user's request.

### Order history search and status filters (2026-10-14)

Live customer order history now searches the full owned history by recorded order reference, bilingual item title or SKU and filters payment and fulfillment states independently. Search text is bounded, case-insensitive and treated literally rather than as SQL wildcard patterns. Filters are preserved on errors/retry and pagination, clear when explicitly reset, and reset the cursor when changed. Filtered-empty results are distinct from an empty account history and unavailable data. Searching does not disclose phone, payment transaction or foreign account data. The live panel retains the reference dashboard shell and supports Persian/mobile forms; no SMS work is included.

Validation: 7 customer-order PostgreSQL tests, 11 focused order-panel tests and 10 browser order/request checks passed; production build, type checking and focused lint passed. An unrelated missing basket import in the shared bundle-detail page was repaired to unblock the production build.

### Download actions and file details (2026-10-14)

Added user cancellation of an in-progress private-file retrieval, a clear-search action and expandable recorded file metadata in the existing customer dashboard shell. Cancellation aborts the browser request, discards late bytes and allows a new retrieval; an older cancelled request cannot clear the new request's busy state. File details expose recorded exact size, updated time and SHA-256 for verification, with accessible expansion controls and checksum wrapping on mobile. Private expansion state clears on account changes. This cancels retrieval before the browser save starts; it cannot cancel a file already handed to the browser download manager. Licensing/usage terms still need an approved business policy; no terms are invented.

Validation: 15 download-panel/API frontend tests and 6 browser download checks passed; type checking, focused lint and production build passed. Browser scenarios cover cancellation followed by a successful download and Persian mobile details/search cleanup.

### Dashboard artwork review actions (2026-10-14)

Dashboard commission cards now show up to three actual owned commissions awaiting customer review, linked directly to their private artwork review page. The commission-history endpoint filters the recorded status before pagination, so newer unrelated statuses cannot hide a pending review. When none are awaiting review, the original commission invitation remains available; read failures offer a separate retry without claiming no review is pending. Account changes clear review cards and late responses are discarded. Cards do not approve artwork or change payment/delivery.

Validation: 8 PostgreSQL commission tests, 15 dashboard/commission frontend tests and 6 browser dashboard checks passed; type checking, focused lint, API contract export and production build passed. Browser coverage checks the dashboard review action and Persian retry alongside existing dashboard/layout checks. SMS remains outside scope.

### Cancellation and return history filters (2026-10-14)

Owned request history now supports server-side search by customer reason or original order reference, exact request-type/status filters and stable newest-first cursor pagination. Filter changes restart pagination and clear stale rows; search inputs survive failures for explicit retry. Filtered-empty results are distinct from unavailable data. Foreign/unknown cursor anchors return 404, and request rows whose order is not owned are excluded. Customer request forms and tracking details retain their existing guarded behavior.

Validation: 8 PostgreSQL customer-order tests and 8 request-panel frontend tests passed; production build, type checking, focused lint and API contract export passed. The combined browser run passed 14 of 16 checks, including both new history-filter scenarios. Two older checks timed out at 30 seconds; both passed when rerun sequentially with a 60-second test limit. This does not certify browser performance under concurrent load. SMS remains out of scope.

### Private support screenshot attachments (2026-10-14)

Migration 0028 adds immutable private PNG screenshots to existing support conversations. Customer list/download endpoints require owned tickets and current read access; uploads require current read/write access, Origin/CSRF and a locked open ticket. Staff list/download endpoints require `support.manage`. Uploads validate bounded RGB/RGBA non-interlaced PNG content, printable `.png` basenames, 5 MiB per file and at most five per ticket. UUID identities make exact retries idempotent. A new attachment updates the ticket to awaiting_reply, increments its version, and records audit/outbox atomically without private filenames or bytes in audit summaries. Downloads verify stored size/SHA-256 and use attachment/no-store/nosniff/sandbox headers.

The customer conversation and staff inbox expose the screenshots. Selected files can be removed before uploading; draft/navigation guards include attachment state. Unknown acknowledgements preserve the same file/UUID for retry or metadata reconciliation. Customer replies and close actions wait while a file draft or upload needs resolution. Upload confirmation refreshes the ticket version while retaining typed reply text. Read-only/closed controls prevent new uploads; existing screenshots remain readable when a ticket is closed. Initial ticket creation instructs customers to attach screenshots after saving. PNG-only evidence is attached to the conversation, not to an individual message. PDFs, JPEGs, general documents, staff-uploaded reply files, large object storage and retention/deletion policy remain unfinished. SMS is not included.

Validation: 4 PostgreSQL attachment tests, 12 focused frontend tests and 19 browser attachment/support checks passed, using isolated rollback schemas and mocked browser contracts. Production build, type checking, focused lint and contract export passed. Local database head is 0028; all eight services are healthy. No real support attachment or message was sent during verification.

### Visible artwork review history (2026-10-14)

Commission details now show all recorded versions, publication times, customer decisions, feedback and decision times chronologically. History actions reopen the corresponding private preview without mutating source ordering or approving an old version. Switching previews preserves the existing draft-discard confirmation, clears acknowledgement and requires the selected current preview to load before approval. Only recorded events are shown; missing decision times are not synthesized. The reference customer dashboard shell remains in use.

Validation: 8 focused commission frontend tests and 5 browser review checks passed; type checking, lint and production build passed. SMS remains outside scope.

### Order-specific private downloads (2026-10-14)

Digital order details now link directly to a download library scoped to that order, with links back to the order and all files. The backend validates order ownership before filtering; scoped cursors must belong to the same owned order, including revoked anchors used for stable pagination. The standard release/payment/commission eligibility predicate remains enforced and binary downloads still recheck access and integrity. The client rejects a response containing files from another order. Scoped-empty states describe that order only and never imply the entire account has no files. Changing the order scope remounts the library, clears private state and aborts pending retrieval. SMS is not included.

Validation: 8 PostgreSQL download tests and 25 order/download frontend tests passed; production build, type checking, focused lint and API contract export passed. Seven of eight browser checks passed in the combined run; the initial download case opened an Nginx 502 page immediately after container replacement and passed separately once the proxy was ready. All eight distinct scenarios passed, including both new scoped-library cases. Verify the actual preview URL returns HTTP 200 after container replacement, beyond container health, before starting browser checks.

### Commission history search and status filters (2026-10-14)
- Customers can search brief idea, style, size, and revision requirements across their full owned history, combined with any commission status. Bound literal substring search runs before cursor pagination; percent/underscore characters are literal.
- English and Persian controls preserve the applied search on refresh and pagination, clear filters explicitly, deduplicate paged rows, and distinguish filtered emptiness from failed retrieval. Private session cleanup clears search state.
- Verified: 10 commission panel unit tests, 9 PostgreSQL commission tests, production build and TypeScript check. Mobile browser verification recorded below.
- Browser verification: all six commission scenarios passed across the main run and an isolated rerun. The first main-run navigation hit a transient Nginx 502 immediately after service recreation; five remaining scenarios passed, including Persian mobile search/status/reset. The isolated approval/history rerun passed once the preview was warm.

### Search the complete private download library (2026-10-14)

Replaced loaded-files-only filtering with an explicit bilingual search across the full eligible owned library, matching filename, description and order reference. The search is bounded and literal, filters before pagination, and combines with the selected order. Refresh and pagination preserve the applied query; reset clears it and returns to the scoped or full library. Duplicate page records are suppressed. Failed search retains input, offers retry and does not claim an empty result. Revoked/ineligible files remain excluded; private query and expansion state clear on account changes. SMS remains outside scope.

Validation: 18 focused frontend tests and 9 PostgreSQL private-download tests passed; production build, type checking, focused lint and API contract export passed. Browser verification follows.

Browser validation: all 9 download scenarios passed sequentially against the refreshed local production preview, including Persian mobile search/reset, scoped search pagination/refresh, protected file bytes, integrity rejection, cancellation and scoped empty states. Readiness checked the preview after proxy DNS refresh before running the suite. Browser APIs are mocked; PostgreSQL checks use isolated rollback schemas.

### Support conversation message isolation (2026-10-14)

Opening a support conversation now fetches only messages for that ticket. Server-side filtering precedes pagination and verifies ticket ownership plus cursor membership; missing tickets and cursors from other conversations return 404. Filtering other record kinds returns 422. The client validates message ticket IDs, deduplicates pages and rejects repeated cursors, preventing a malformed paging response from hanging conversation loading. Existing chronological replies and draft guards are retained. SMS is excluded.

Validation: 8 frontend API/feature tests and 16 PostgreSQL customer-panel tests passed. Production build, API contract export and focused lint passed. Browser verification follows.

All 7 focused browser support/attachment scenarios passed against the refreshed production preview, including Persian mobile scoped pagination, replies, close/reopen, retained uncertain drafts, screenshot reload/reconciliation and staff protected links. Browser records are mocked; database tests use isolated rollback schemas.

### Support ticket history search and status filters (2026-10-14)

The live support history now exposes bilingual full-history search and exact status selection from the reference workflow. Search matches owned ticket subject/body using trimmed bounded literal case-insensitive text, before cursor pagination. The reference status labels are retained in Persian/English, with Submitted added to the available filter options. Explicit search/reset restart the cursor and clear stale rows; paged duplicates are suppressed. Retries retain the applied query. Failed retrieval never displays an empty-history claim, and filters clear on account changes. New-ticket drafts and conversation guards remain independent. SMS is excluded.

Validation: 10 frontend API/feature tests and 17 PostgreSQL customer-panel tests passed; production build, focused lint and API contract export passed. Browser verification follows.

Final browser verification: all 5 focused support/ticket scenarios passed, including Persian mobile filtered search/reset, failed-query retry, scoped messages and reply/close/reopen flows. Initial browser failures identified the active reference route and its nested-label dropdown reopening; filters were wired into that route and the status label markup corrected before the final rebuilt run. Production build includes TypeScript verification. Browser records are mocked and database tests use isolated rollback schemas.

### Private artwork preview retry (2026-10-14)

Failed artwork previews now expose a dedicated bilingual retry action, preserving typed revision feedback. Retry resets acknowledgement and image-view state, and cannot approve/revise until the image has loaded successfully and the customer acknowledges again. It does not reload metadata or submit a decision; busy or uncertain writes disable retry. The existing private route and version eligibility checks are retained. SMS is excluded.

Validation: 11 commission-panel tests and focused lint passed. Production build and browser verification follow.

Production build (including TypeScript) passed. All 7 commission browser scenarios passed against the refreshed preview, covering Persian mobile failed-image retry and fresh acknowledgement alongside persisted decisions, uncertainty reconciliation, historical version guards and history filters. Browser records are mocked; this change introduces no backend write behavior.

### Copy order and support references (2026-10-14)

Added reference-copy actions to live order details and support conversation details, matching the reference conversation interaction. The exact recorded order reference or ticket UUID is copied only on click. English/Persian success messages wait for clipboard completion; failure leaves the value selectable and gives manual-copy guidance. Pending clicks are locked and private cache invalidation discards late acknowledgements. Clipboard contents already copied are not automatically erased. No messages are sent or records changed; SMS is excluded.

Validation: 15 focused copy-reference/order-panel tests, focused lint and production build including TypeScript passed. Browser verification follows.

All 4 focused browser scenarios passed against the local production preview, including actual browser clipboard reads for Persian mobile order details and support conversation references, denied-clipboard fallback, existing replies/state changes, and receipt navigation. Browser API records are mocked; no real customer messages or order writes were performed.

### Supported live support topics (2026-10-14)

Added Account and Commission to the original live support form alongside General, Product, Technical and Other. A separate live topic list matches the existing backend enum and displays localized topic names in history. Validation no longer subjects these live topics to fixture-order requirements. The inactive order selector and demo-order guidance are hidden in live mode; demo workflows retain their existing choices and validation. Ticket creation still requires explicit submission and retains guarded/uncertain-result behavior. SMS is excluded.

Validation: 13 focused topic/API tests and focused lint passed. Production build and browser verification follow.

Production build including TypeScript passed. Four distinct browser scenarios passed across the main run and focused rerun: existing support replies/close/reopen, failed history retry, English Account creation and Persian mobile Commission creation without an order selector. The initial topic tests used an exact accessible name that omitted the required-field asterisk; the test selectors were corrected, and both topic scenarios passed. API records and submissions are mocked; no real tickets were sent.

### Navigation protection during pending decisions and requests (2026-10-14)

Artwork review and cancellation/return forms now block panel-menu/back navigation while a submission or saved-result check is pending. The commission support link follows the same guard. Drafts still have discard confirmation outside that interval. Browser reload/close activates its standard unsaved-work warning; users retain browser control over leaving. Localized status explains that the result is being saved/checked. No decision/payment/refund semantics change; SMS is excluded.

Validation: 21 focused commission/request frontend tests and focused lint passed, including pending writes, menu/back guards, before-unload warnings and release after confirmation. Production build and browser verification follow.

Production build including TypeScript passed. All 8 commission browser scenarios passed, including clicking the panel menu during a delayed approval and remaining on the review page until confirmation. Existing private preview retries, version eligibility, decision reconciliation and Persian mobile history checks remain passing. Browser API responses are mocked; no real artwork decisions were written.

### Direct recovery of unconfirmed support creation (2026-10-14)

Support creation recovery now reads only the original ticket and validates returned kind/identity. Only the API's confirmed not-found response enables same-identifier submission retry; network/access failures preserve the draft and keep resubmission blocked. The check button shows progress and disables overlapping checks. Navigation uses the operation lock during recovery. A recovered ticket updates the history/result without another write. This uses the existing owned detail API; SMS is excluded.

Validation: 15 focused support-topic/API tests and focused lint passed. Production build including TypeScript passed. Browser verification follows.

All 5 focused browser support scenarios passed. The new delayed recovery scenario verifies progress locking, failed-check draft retention, a later successful read and exactly one original submission. Existing topic creation, conversation state changes and history retry remain passing. Browser records/submissions are mocked; no real tickets were sent.

### Full-history notification search and read filters (2026-10-17)

Notification search and category/read selection now filter the complete owned history before cursor pagination. Bounded literal case-insensitive search covers recorded bilingual titles/body; category values are validated, and read/unread are distinct. The live page adds the Read option, explicit full-history search/reset, filtered-empty feedback, and preserved applied filters on pagination/retry. Duplicate page records are suppressed and load-more is disabled during retrieval. Private cleanup resets filter state. Bulk confirmed marking remains independent of current filters. SMS is excluded.

Validation: 19 PostgreSQL customer-panel tests, 13 focused frontend API/feature tests, focused lint and contract export passed. Production build/browser verification follows.

Final production build including TypeScript passed. All 5 focused notification browser scenarios passed, including full-history filtered pagination, Persian mobile failure/retry/reset, confirmed bulk marking outside the current category, individual read acknowledgement and business links. Initial checks found an overlapping category control after adding Read; the live filter layout now uses a responsive grid and all controls are clickable. A separate initial test hit a temporary Nginx 502 and passed in the final run. Browser data/writes are mocked; database checks use isolated rollback schemas.

### Recorded return deadlines and live expiry (2026-10-17)

Return request forms show the actual stored deadline in localized Tehran time, explain missing deadlines and mark expired deadlines. Eligibility updates when the deadline passes on an open form and after returning from a background tab. Expiry disables submission but preserves typed reason and quantities. Submission performs an immediate client-clock check; the existing server eligibility/version/quantity rules still decide acceptance. Timers are bounded and cleared on deadline changes/unmount. No policy interval, refund or SMS behavior is added.

Validation: 12 focused return-clock/request-panel tests and focused lint passed. Production build/browser verification follows.

Production build including TypeScript passed. All 4 focused order-request browser scenarios passed: open-form deadline expiry with draft/quantity retention and zero writes, Persian mobile missing-deadline guidance, existing cancellation submission and unknown-result reconciliation. Browser clock/API fixtures are controlled; no real return/cancellation requests were sent.

### Remaining return quantities and active-request tracking (2026-10-17)

Owned order detail now reports delivered physical-returnable quantities minus non-rejected previous return quantities, clamped at zero. Rejected returns release their allowance; completed returns remain deducted. Reads and writes share the reservation helper, and the active request link is scoped to the current account. The return form shows remaining counts and enforces their maxima, disables invalid or missing-availability submissions, and explains active requests with a tracking link for cancellation/return forms. The server still rechecks ownership, payment/deadline, quantities, active requests and order version under its existing locks. No money/refund/fulfillment mutation or SMS behavior is introduced.

Validation: 11 PostgreSQL order tests, 26 focused order/request/clock frontend tests, focused lint and contract export passed. Production build/browser verification follows.

Production build including TypeScript passed. All 6 focused order browser scenarios passed: remaining quantity maximum and invalid-selection blocking, Persian active-request tracking, open deadline expiry/missing-deadline guidance, cancellation and unknown-result recovery. Browser API records/writes are mocked and PostgreSQL tests use rollback schemas; no real requests, refunds or order changes were made.

### Full-history favorite search and item-type filters (2026-10-17)

Favorite title search and product/bundle/artwork selection now operate before server pagination across the complete owned saved list. Matching is bounded, case-insensitive and literal, supports common Persian/Arabic letter variants, and reads only currently published title metadata. Unpublished cards retain their previous hidden-metadata/removal behavior outside title search. Foreign/unknown favorite cursors return 404. Search/reset restart pagination, retain filters on retries and use the responsive filter layout; duplicate page records are suppressed. SMS is excluded.

Validation: 20 PostgreSQL customer-panel tests, 14 focused API/feature frontend tests, focused lint and contract export passed. Production build/browser verification follows.

Production build including TypeScript passed. All 9 focused favorite/notification browser scenarios passed, covering full-history favorite query/type pagination, Persian mobile failure/retry/reset, persisted save/removal, and shared notification filter/bulk/individual-read workflows. Browser data/writes are mocked; PostgreSQL checks use isolated rollback schemas. No real favorite or notification records were modified.

### Local support screenshot preview (2026-10-17)

Added a bounded, responsive local preview for selected support PNG screenshots, with Persian/English text distinguishing preview from submission. Selection/removal do not upload anything. Removing the selection, confirming/reconciling upload, or private account cleanup clears the preview. Image display failures retain the selected file and show guidance. Existing read-only/closed controls, explicit upload, nonce recovery and backend validation are unchanged. Saved private attachments are not automatically fetched. SMS is excluded.

Validation: 9 attachment frontend tests and focused lint passed. Production build/browser verification follows.

Production build including TypeScript passed. All 5 attachment browser scenarios passed, including actual local PNG decoding and zero uploads on Persian mobile selection/removal, existing upload/download persistence, unknown-save reconciliation, read-only controls and protected staff links. Browser APIs are mocked; no real screenshots or messages were sent.

### Draft-preserving support conversation refresh (2026-10-17)

Added Refresh conversation to the live thread. A loaded conversation stays mounted during data refresh and read failure so reply drafts and selected screenshot previews remain intact. Success reads the latest owned ticket/status and scoped messages, then announces completion; failure clearly labels the retained conversation as last-loaded data. Pending/unknown writes and attachment work disable refresh; conversation writes are disabled during refresh. Attachment metadata retains its separate Check saved attachments action. No messages/files are sent by refreshing, and SMS is excluded.

Validation: 23 focused API/attachment frontend tests, focused lint and production build passed. Browser verification follows.

All 9 focused conversation/attachment browser scenarios passed. New checks verify a later staff reply/status appears without sending the customer's draft, and read failure followed by successful refresh retains both reply text and the selected local PNG with zero uploads. Existing reply/close/reopen, uncertain-write recovery, private download, read-only controls, staff links and Persian mobile preview remain passing. TypeScript verification passed after the new test additions. Browser API data/writes are mocked; no real messages/files were sent.

### Reference-design correction and panel visual review (2026-10-17)

The live downloads page had replaced the reference's dedicated layout with generic dashboard cards and omitted `downloads.css`. Restored the reference breadcrumb, heading, search area, order grouping, file rows, metadata/details, delivery status, guidance and responsive empty/error states. API-backed search, pagination, scoped order links, integrity checks, cancellation and account cleanup remain active; no reference fixture files or invented delivery states were introduced. Added missing search/refresh/document glyphs and corrected alert/add icons in the shared icon set.

Reviewed mobile screenshots of dashboard, orders, requests, commissions, favorites, notifications, addresses, preferences, support, profile and security. Orders/requests/commissions had missing field styling and inconsistent headings; added a shared account heading and bounded, padded responsive search/filter controls. Other account screens retain their existing reference-based components. This is a layout review, not a claim that every populated detail state is pixel-identical to the reference.

Validation: 18 download frontend tests and 35 order/request/commission frontend tests passed; focused lint and production compilation/type checking passed. A browser regression now checks same-order file grouping and bounded action controls at desktop and mobile widths. Browser and deployed-preview verification follows. SMS remains excluded.

Final downloads/orders/commissions browser verification: all 35 scenarios passed against the updated local production preview, including the new responsive grouping check. Preview URL returned HTTP 200. The normal Docker build hit a registry HTTP 403; built the production app locally and packaged it with the existing local Node runtime image, without changing repository deployment configuration. Browser records and writes were mocked; no customer files, messages or orders were changed.

The 6 broader account browser checks also passed after updating address scenarios to select the current geography-backed province/city controls with deterministic mocked geography. Verified address persistence in both languages, preferences acknowledgement, support submission, notification acknowledgement and guest access protection. All 11 other account sections were captured at 390px and 1440px with no horizontal overflow; downloads was inspected separately at both widths with multiple real-contract-shaped files grouped under one order.

### New-ticket screenshots, owned order context and ready files (2026-10-17)

Replaced the live new-ticket form's simulated attachment controls with a private PNG queue: up to three screenshots, 5 MiB each, local preview/removal, and upload only after ticket creation is acknowledged. Partial upload failures retain stable file IDs; retries send only remaining files and metadata reconciliation sends no files. Unknown ticket creation retains selected files; finding the saved ticket does not upload automatically, and the customer can explicitly send the retained screenshots. New-ticket creation and navigation are guarded during uploads. Private account cleanup drops selections and ignores late results. Live controls no longer show demo acceptance or demo character counts. JPEG/PDF remain outside the implemented upload contract.

The support form now offers the complete owned order history and optional item selection. Tickets persist optional order/item UUIDs. The server checks current order-read permission, ownership and exact item membership, and preserves legacy ticket replay without new nullable fields. Conversations link to the related order. Order-list failure permits general ticket submission without an association.

The dashboard now reads the first three released, eligible files from the real library and displays filenames, order references, byte sizes and order-scoped download links in the reference's ready-file cards. Empty and independent retry states replace the previous generic message; private state clears on account changes and order-read permission is required.

Initial validation: 36 PostgreSQL order/panel/attachment checks passed. Frontend and browser validation follows. No SMS, customer messages, production files or payment changes are sent by these tests.

Focused frontend validation: 28 tests passed across the ready-file dashboard, new-ticket upload queue, existing attachments and topic contracts. Production build including TypeScript and focused lint passed. Browser verification follows.

Final validation: all 23 affected browser scenarios passed across the final run and isolated rerun of the six dashboard/layout scenarios. Existing mock fixtures were updated for the newly requested orders/downloads reads and the already-server-side favorite/notification filters. New checks cover order/item payloads, zero upload on selection/removal, post-create upload, lost attachment acknowledgement, read-only recovery after lost ticket acknowledgement, and Persian mobile ready-file navigation. The mobile new-ticket form was captured and visually inspected. There are 28 passing focused frontend tests and 37 unique PostgreSQL order/panel/attachment scenarios (the order suite was rerun with the added permission-denial check). Focused lint, TypeScript and production build passed; updated web/API previews are healthy and the support route returns HTTP 200. Browser writes are intercepted and PostgreSQL tests use rollback schemas; no real customer tickets/files/orders were changed.

Payment/refund provider details were requested from the user for that remaining integration. Other unfinished integrations in the matrix, including official invoices, fulfillment/refund execution and non-PNG attachment formats, are not certified by these passing checks.

### Real JPEG/PDF support evidence (2026-10-17)

Extended private conversation and new-ticket attachments from PNG-only to PNG, JPEG and PDF. Client checks names, MIME/extension agreement, byte signatures and the existing 5 MiB limit before encoding; selection remains local. JPEG uses a local image preview and PDF has a file summary, with no document iframe/object/embed. New-ticket known content rejections now show a removable failed item, while transport uncertainty retains immutable retry identities and metadata reconciliation.

The server verifies real image decoding with bounded dimensions (16 million pixels, 10,000px per axis, single frame), and strict readable, unencrypted PDF structure with 1–200 pages. Original bytes and checksums are retained. Download response types match validated formats and preserve private/no-store, attachment, sandbox and nosniff behavior. Legacy `png_base64` submissions remain accepted alongside `content_base64`; existing stored PNGs need no migration. Palette PNGs are supported without changing the stricter commission-preview contract. Staff read/download permissions and ticket ownership remain enforced.

Pinned Pillow 12.3.0 and pypdf 6.10.0. The package host could not resolve from the shell; compatible bundled distributions were used to install/test and package the local preview offline. Repository deployment remains reproducible from the pinned requirements when the package server is available. A missing JSX brace in the concurrently edited RecipesPanel blocked compilation; corrected only that delimiter.

Initial checks: 16 backend format/private-attachment tests passed. Frontend, production and browser verification follows. Staff-uploaded reply attachments, provider-backed payments/refunds and official invoice issuance remain outside this change. SMS is excluded.

Final validation: 16 backend checks, 20 frontend checks and all 20 affected browser scenarios passed. Browser coverage includes exact PDF bytes/filename, no PDF embeds, actual JPEG image decoding on Persian mobile, zero upload on selection/removal, mixed JPEG/PDF new-ticket submission, private staff downloads, legacy PNG flows, unknown-result reconciliation, address/preferences/support regressions and dashboard links. The JPEG mobile screenshot was visually inspected. Focused lint, dependency consistency, API contract regeneration and production build/type checking passed. Updated API/web containers are healthy and the support preview returns HTTP 200. Tests use intercepted browser writes and isolated PostgreSQL rollback schemas; no real customer files or tickets were submitted.

### Staff files delivered to customer conversations (2026-10-17)

Added the protected staff attachment write endpoint and upload controls to the support inbox. PNG/JPEG/PDF validation, immutable identities, current permissions, CSRF/origin, closed-ticket rules and the shared conversation limit apply to staff writes. Files remain owned by the ticket's customer, including when a different staff account uploads them. Staff upload changes the ticket to awaiting customer and creates one preference-aware in-app notice linking to the conversation; replay does not duplicate status/version changes or notices. Audit records retain the staff actor and customer target without filenames or content.

Staff reply drafts survive upload and metadata reconciliation. Reply/status submission and navigation are guarded during attachment work; pending selections block competing writes. Uploading does not send the typed reply. Customer and staff downloads use their respective protected routes. No new database migration is needed.

Validation in progress: 22 backend format/attachment/notification checks passed, including different-owner isolation, CSRF, revoked staff permission, closed conversations, idempotent notices and opt-out preferences. UI/browser verification follows. SMS stays excluded.

Staff attachment completion: 22 backend tests and 21 frontend tests passed. All 22 existing/support browser scenarios passed, and both new staff-to-customer PDF scenarios passed after correcting a test timing assumption and selecting reply fields by their accessible textbox role. The new checks verify draft retention, zero reply submissions, one upload after lost-ack reconciliation, correct protected staff links and customer visibility.

### Staff final-file delivery screen (2026-10-18)

Added a final-file delivery section to persisted digital order details. Order readers can inspect active/revoked metadata with scoped cursor pagination; fulfillment managers can select a digital line, choose a private file up to 16 MiB, acknowledge final delivery and explicitly release it. Client SHA-256 and exact byte count are checked against the confirmed release record. Existing server eligibility still requires paid/non-cancelled digital orders and approved owned commissions where applicable. File selection/removal and metadata refresh do not upload anything.

Revocation requires an explicit reason and confirmation. Unknown release/revoke results preserve the same operation and offer exact-ID metadata checks or an identical retry. Staff read endpoints expose metadata without file content, enforce order-read permissions and reject unknown or cross-order cursors. Navigation, browser unload, private account cleanup and pending-operation guards retain drafts or discard late responses. The screen does not change payment, receipt or artwork-approval state.

Initial validation: all 10 private-download PostgreSQL tests and 8 final-file frontend/API tests passed. Focused lint and production compilation/type checking passed; final browser verification follows. Provider-backed payments/refunds, official invoice issuance and automatic checkout delivery remain separate integrations; SMS remains excluded.

Final delivery validation (2026-10-18): all 22 browser checks passed against the updated local production preview: staff order details, release-to-customer download with exact bytes, revocation and lost-confirmation reconciliation without duplicate writes, read-only permissions, Persian mobile draft guards, and the existing downloads layout/integrity/search/scope regressions. The Persian mobile delivery screenshot was visually inspected and has no horizontal overflow. Focused final-file unit checks (8), the combined attachment/delivery frontend checks (29), private-download PostgreSQL checks (10), focused lint, and production build passed. Web/API containers are healthy. Browser writes use intercepted fixtures; database checks use rollback isolation. No customer files or messages were sent.

Current remaining integration limits: real payment/refund-provider execution and reconciliation, official invoice issuance, and upstream physical fulfillment/return execution still require their respective integrations. Final files currently use the existing 16 MiB private-storage contract. SMS remains excluded. Passing checks do not certify these remaining integrations.

### Order detail redesign (2026-10-18)

Replaced the single text-heavy customer order card with a dedicated responsive detail component: compact navigation/header, reference/date and separate recorded status badges, item rows with delivery type and exact unit/discount values, recipient/address card, digital-library callout, payment summary, receipt and request/support actions. Preserves existing API permissions, exact money formatting, historical address, commission-review links and copy-reference behavior. No inferred fulfillment timeline or invented product media. Desktop uses a main column and summary sidebar; smaller viewports stack cards.

Production build and focused lint passed. All 27 unique order/request/download browser scenarios passed across the initial 26 successes and final rerun; the initial failure was an ambiguous generic alert selector matching the framework route announcer, now scoped to the actual order error section. Four final targeted browser checks passed after the header revision. Mocked-data screenshots visually inspected at 1440px and 390px; bounds checked at 1440, 1046, 390 and 320px without horizontal overflow. Updated local web preview is healthy; no customer records were modified.

### Orders list redesign and removal of session management (2026-10-18)

Rebuilt customer order history with a compact heading, integrated search, responsive payment/delivery filters, recorded status badges, item previews, exact totals, order-detail actions and scoped digital-file links. Loaded counts are explicitly labeled as orders shown, not total account counts. Existing server filtering, retry, pagination and permission/private cleanup behavior remain connected. Screenshots with fixture data checked at 1440/1046/390/320px without overflow. Production build and focused lint passed; 21 order/request/panel browser checks passed, and the final three navigation/search checks passed after visual polish.

Removed account session-management UI, fixture states, styling, loading, revoke client, and GET/DELETE account security session-management endpoints. Regenerated API contract. Authentication sessions, normal logout and password-change invalidation are retained. One focused frontend test and 16 identity database tests passed, including removed endpoint 404 responses and unchanged authenticated session. Browser password-change test verifies zero session-management requests; desktop/mobile screenshots show no session section. No real passwords or customer records were changed.

### Clickable order product thumbnails (2026-10-19)

Owned order history/detail responses now include separate current public catalog metadata keyed by line UUID. Batched resolution handles historical SKU codes, checkout SKU UUIDs, product UUIDs, artwork UUIDs and visible bundles; unpublished products and custom commissions expose no catalog destination. Retired variants can still link to their published parent product. Historical snapshots/prices remain unchanged.

Shared list/detail thumbnails and product-name links use language-specific catalog routes and the existing storefront media components, including their explicit sample-photo labels. Artwork images use the catalog image; unavailable media has a bounded fallback. Native modified clicks are preserved. No guessed product association is based on titles.

Validation: 15 customer-order PostgreSQL checks passed, including code/UUID resolution, publication changes, retired variants, artwork images and custom-commission isolation. Production build, focused frontend lint and backend lint passed. All 28 unique order/download browser scenarios passed across the initial 27 successes and isolated rerun of a page-load timeout; the new thumbnail test also independently passed and verifies real image decode, clickable image/name destinations in both languages and viewport bounds. Persian mobile list/detail and English desktop screenshots inspected. Updated local API/web containers are healthy. Browser fixture writes and rollback-isolated database tests do not modify customer orders.

### Receipt and A4 print redesign (2026-10-19)

Replaced the minimal customer receipt block with a dedicated document: compact order navigation, print toolbar, brand/receipt number, historical recipient/address, Tehran issuance timestamp, itemized quantities/unit prices/line discounts/net amounts, shipping/tax/order total and independently labeled recorded payment amount. Derived totals use integer minor units (BigInt), without floating-point arithmetic. Receipt issuance is still server-owned; absent receipts render no print action/document.

Screen layout adapts item rows for narrow viewports. Named A4 print page uses 16mm/14mm margins, removes the account shell and controls, restores a full table at mobile print widths, repeats column headers, avoids splitting rows/summary/footer and retains readable print colors.

Validation: production build and focused lint passed; all 21 order/receipt browser scenarios passed. Persian/English screenshots at 320px and 1046px checked without horizontal overflow. Actual Chromium PDFs rendered and visually inspected: standard receipts one A4 page each; a 40-item receipt five pages with repeated headers, intact final line and totals, no blank extra page, and no navigation/print controls. Extracted PDF text confirms exact 200.00 line total from 2 × 100.10 minus 0.20, and correct final summary. Preview updated and healthy; tests use fixture data and do not alter customer payments or receipts.

### Shared order dropdowns and account navigation repair (2026-10-19)

Replaced native order payment/delivery selects with the shared Dropdown component. Separate explicit labels avoid reopening a menu on selection; controlled filters, clear/reset, server query parameters, loading disables and keyboard selection remain connected. Corrected ProfilePage live sidebar and in-page navigation so it no longer routes valid account destinations into the reference-only independent-flow dialog. Its existing dirty/pending navigation guards remain active. Other live account screens were inspected and already pass through to connected routes.

Validation: production build passed; focused component/test lint has no errors (the reference design file is excluded by repository lint configuration). Ten profile-lifecycle/shared-dropdown unit checks passed. Two complete navigation sweeps passed: Persian mobile and English desktop, profile to all nine other main account destinations, and each destination back to Orders. Four final browser checks passed, including stay/discard profile guards, search/status filters, failed-search retry and shared dropdown keyboard/selection/reset behavior. Mobile open-menu screenshot visually inspected without overflow. Initial new navigation test attempts used an incorrect exact label selector for the optional-name field; corrected to the actual accessible textbox name. Final local web preview is healthy, and tests use intercepted records with no customer profile changes.

Final dropdown polish: scoped away the generic account-input border/focus override inside order dropdown controls. Production build and the focused shared-dropdown browser check passed again; final open-menu screenshot inspected.
