# User panel — 2026-10-13

The live `/fa/account` and `/en/account` dashboard now uses the imported DashboardPage
shell, original responsive cards, updates, quick links and mobile drawer. Counts and
updates come from the existing owned customer API. Loading, retry and private-cache
cleanup are supported. No sample commerce data is shown in live mode.

Favorites use the reference tile grid, title search, type filters, published catalog
links, explicit unavailable records and confirmed deletion. Known product/bundle
visuals reuse explicit pinned reference associations; missing associations have a
fallback. Notifications use the reference summary, read status tabs, category filter,
read/unread cards and Tehran timestamps. Read changes require API acknowledgement.
Support conversations use message cards and ticket metadata; drafts remain visible
on failed writes. CustomerPages disables mutations for accounts without write access.

Orders, downloads, commission tracking and request/detail destinations retain the
account shell and explain current unavailability. Commerce services, paid orders,
receipts, returns/refunds, file entitlements and artwork approval are not implemented
by this UI change. This is not complete acceptance of USER-02–09.

Verification: 106 frontend unit tests passed before the final presentation adjustments;
the four focused panel tests passed again afterwards. Type checking and focused lint
passed. Eight customer browser checks passed on the development server, covering
English desktop, Persian mobile drawer/filtering, favorites, addresses, preferences,
conversation, confirmed read changes and guest denial. Screenshots inspected for
desktop dashboard, Persian mobile dashboard/notifications and mobile favorites.
Production Docker web build passed. Browser tests use mocked private API contracts.

Final production verification: the same eight browser checks passed against the local
Nginx preview on port 8080 after rebuilding/restarting only the web service. All eight
application services remained healthy. The existing browser fixtures now explicitly
mock the summary read added to customer pages; no real customer record was changed.

## Follow-up audit — 2026-10-13

See `user-panel-feature-audit.md` for the complete 17-feature matrix. Bundle/artwork
favorites, read-only form controls, full address pagination, safe address/favorite
reconciliation, draft-preserving support reloads and confirmed bulk notification reads
were added. Verification: 114 frontend unit tests, 35 isolated backend tests and 26
production-preview browser checks passed, alongside lint/types/build and eight healthy
services. USER-02–09 commerce features, private attachments, production SMS and nationwide
address-region coverage remain unfinished; the panel is not fully feature-complete.


## Order history continuation

The live account orders route now uses `OrdersPanel` and `/api/v1/account/orders`.
Owned immutable checkout snapshots supply historical details and issued receipts;
receipt printing is available only for a recorded receipt. Currency is displayed as
stored, with no floating-point or rial/toman conversion. Migration 0023 is applied
locally. The checkout ingestion adapter is internal and still needs a real checkout
producer. No real paid orders, money movements or stock changes were created.
Cancellation/return submission, refund processing, private downloads and artwork
review remain unfinished. See the updated feature audit for verification limits.


Cancellation and return submission are now connected to owned order-request records.
`/account/requests` and its detail route read persisted statuses. Submission has
eligibility checks, optimistic versions and idempotent request identities; uncertain
responses retain drafts and reconcile via an explicit read. Submission records a review
request only. Staff review transitions, fulfillment changes and refund execution still
need their upstream integrations.

## Commission tracking and private artwork reviews

The live commission history/detail routes now read existing submissions. Authorized
staff can publish a small private PNG review version with confirmed agreed terms through
the staff API. Customers can view immutable preview history, acknowledge and approve the
latest version, or submit revision feedback within the stored allowance. Decisions use
owned version checks, one decision per version, atomic audit/outbox writes and explicit
unknown-result recovery. Preview loading and acknowledgement are required in the UI;
refreshing resets acknowledgement. Feedback drafts are guarded and retained.

Migration 0024 is applied locally. Review previews are bounded raster images stored
privately in PostgreSQL, without public catalog URLs. Final downloads, general
attachments, quote/payment integration and the staff publication screen are unfinished.

## Private download library

The live Downloads route now lists final files released against owned paid digital
order lines. It supports loaded-file search, pagination, owned order links and verified
saving of private bytes. Both server and browser check exact size/hash; changed accounts,
revoked access and integrity failures cannot produce a browser download.

Staff release/revoke APIs require current fulfillment and order-management permissions,
Origin and CSRF checks. Files are immutable and publication identities are idempotent;
revocation is versioned. Linked commissioned files require both the paid digital order
line and the customer's artwork approval. Approval does not imply final-file delivery.

Migration 0025 is applied locally. Final files currently use private PostgreSQL storage
with a 16 MiB bound. Larger object storage, automatic paid-checkout fulfillment, refund
reconciliation and the staff release screen remain unfinished. Existing pre-linkage order
snapshots remain compatible with source replay after adding optional commission linkage.

Order request review API now persists staff decisions and customer-visible replies (migration 0026). Request versions protect against stale decisions, UUID review identities prevent repeated audit/outbox writes, and immutable review rows retain actor/decision history. Customer request cards render recorded replies safely. Approval is a review decision only; no payment or fulfillment mutation is performed. Staff review UI is implemented below; upstream execution/completion remain outstanding.

Staff request review screen is implemented at `/fa/admin/order-requests` and `/en/admin/order-requests`, linked from the admin sidebar. Staff can inspect requests, filter loaded records, paginate, and record the allowed review decision with a public reply. Accounts with `orders.read_all` can read; writing also requires `fulfillment.manage`. Drafts have navigation/unload guards. Uncertain acknowledgements preserve the reply and decision UUID for explicit reconciliation or identical retries; version conflicts require refreshing before editing again. Final refunds/cancellations and completed states still require upstream execution.

Staff artwork publication is now connected in the existing admin shell at `/fa/admin/commissions` and `/en/admin/commissions`. The protected staff list/detail/private-preview APIs reuse the commission record contract. Publishing requires a loaded PNG preview, immutable accepted terms/revision allowance and explicit staff confirmation. Version conflicts and invalid previews preserve drafts until refresh; unknown acknowledgements preserve the artwork UUID for reconciliation or identical retry. Verified with 7 PostgreSQL tests, 13 frontend tests and 8 browser checks. Final-file staff release and upstream payment execution remain outstanding.

Live address forms now allow named province/city values across Iran instead of the limited sample dropdowns. Saved legacy IDs remain compatible and retain localized display labels; custom locations render directly. Required fields, 100-character limits, trimming and dependent city clearing are enforced. This enables address entry without claiming an authoritative region directory or confirmed shipping availability.

Customer request tracking now uses `/api/v1/account/requests/{id}/tracking` to show immutable order item names/options and requested quantities, plus submission and recorded staff decision history. Both request/order ownership are checked; reviewer IDs and unrelated address data are omitted. Detail cards link from request history and support explicit status refresh and independent history retry. This records review progress only; upstream cancellation/return receiving/refund execution remain unfinished.

Business events now generate transactional in-app notices through `contexts/customer/notifications.py`: artwork review readiness, order-request review decisions, and digital-file release/revocation. Saved category choices are honored; deterministic owned event IDs prevent duplicate notices and avoid resetting existing read state. The inbox links to the correct customer workflow. No external SMS or retrospective event backfill is performed.

Dashboard activity counts now use the owned `/api/v1/account/orders/summary` endpoint for recorded orders, paid orders awaiting delivery, active requests and eligible files. Shared download eligibility keeps counts consistent with the actual library. Counts fail independently, support refresh and clear on session changes. Financial aggregates remain outside this implementation; SMS is out of scope per user instruction.

Order history now supports server-side search across the full owned order history and exact payment/fulfillment filters. Search covers immutable reference/item-title/SKU snapshots, uses literal bound parameters and never searches personal phone or payment transaction fields. Filter changes reset cursor and stale rows; failures preserve inputs for retry, with a distinct filtered-empty state.

Downloads now offer explicit retrieval cancellation, clear search and expandable recorded file details. AbortSignal guards late responses; controller identity prevents an older cancellation from changing the busy state of a newer retrieval. Details show exact size, updated time and checksum without inventing usage rights. Cancellation applies while retrieving bytes; browser download-manager saves remain outside the panel's control.

Dashboard commissions now show owned pending artwork review actions using the server's `awaiting_customer` history filter before pagination. Up to three recorded commissions link directly to their review page; no pending records retains the existing commission invitation, and failures have an explicit retry. Private review cards clear on account changes. No approval, payment or final delivery is triggered by these links.

Customer cancellation/return history now offers full-history reason/order-reference search and request type/status filters. The backend sorts newest first with stable cursor anchors and enforces request/order ownership; filters reset pagination and stale rows. Errors retain the search draft and show explicit retry rather than a false empty history.

Private PNG support screenshots are now implemented for existing customer conversations and readable in the staff support inbox (migration 0028). Storage is private PostgreSQL bytea, bounded to 5 MiB each and five per conversation, with strict PNG validation and owned/current permission checks. Upload identities are immutable/idempotent; attachment creation updates ticket status/version with audit/outbox in one transaction. Read/download endpoints verify integrity and send private attachment headers. UI guards selected files and uncertain results, disables concurrent close/reply actions until attachment resolution, and refreshes the ticket after confirmed upload. General document/image formats and staff reply attachments remain unfinished; this feature does not send SMS.

Commission review details now include a chronological visible version/feedback history with private preview links and recorded decision times. History uses existing immutable records; preview selection resets view acknowledgement and preserves the latest-version decision guard. No payment, delivery or old-version approval is triggered.

Digital order details link to `/account/downloads?order=<owned order ID>`. The private library supports server-side `order_id` filtering, validates the owned order and same-order cursor, and keeps its existing availability/integrity checks. The client validates returned order IDs and provides order-specific empty/error states plus navigation back to all downloads. Switching scopes clears private state and aborts in-progress retrieval.

Commission history now accepts optional `q` (trimmed, maximum 200 characters) alongside the existing status and cursor filters. The customer screen exposes bilingual search/status controls; the API adapter retains the second status argument used by dashboard pending reviews. Search covers owned brief fields before pagination and treats wildcard characters literally. Failed searches retain inputs and refresh retries the applied query.

The downloads library now searches all eligible owned files on the server using optional `q` (trimmed, maximum 200 characters), across filename, description, and order reference. Literal case-insensitive matching precedes stable cursor pagination and preserves optional order scope. The customer search form explicitly submits, clears, and retries the applied query; account changes clear private query state. File access and integrity checks remain enforced independently at download time.

Support conversations now request `/account/panel/message?ticket_id=<owned ticket>` for each page instead of retrieving every message from the account. The API checks ticket ownership and cursor membership before filtering messages; the optional filter is accepted only for message lists. The existing all-pages helper deduplicates records and rejects pagination loops and messages belonging to another ticket. Conversation chronology, draft guards, attachments, and confirmed state changes are retained.

Support ticket lists accept optional `q` (trimmed, maximum 200 characters) and validated `status` on the existing owned record endpoint. These filters are accepted only for ticket lists, and run before pagination. The support screen adds explicit bilingual search/reset controls, localized recorded statuses and distinct filtered-empty results. Applied filters survive reload/pagination failures and reset with private account state.

The active ticket history route uses the original SupportPage live adapter. Its explicit search now forwards filters through every page of the guarded all-records helper, while conversation details remain in CustomerPages. The reference presentation and chronological last-updated display are preserved. The status control now uses an explicit separate label, avoiding the enclosing label reopening its custom dropdown after selection.

Artwork review offers a dedicated retry action when its private preview fails. Retry remounts the selected image without reloading commission metadata or discarding revision feedback. It resets image-view and acknowledgement state, so approval/revision remain disabled until the retried image loads and the customer acknowledges again. Pending or uncertain decisions block image retry; selecting historical artwork remains subject to the latest-version decision guard.

Order details and support conversation details now provide explicit copy-reference buttons. The shared component copies only the displayed persisted reference on a user click, announces confirmed clipboard completion, and keeps the reference selectable with localized manual-copy guidance if the clipboard is unavailable/denied. Late acknowledgements are discarded on account changes/unmount. This does not send messages or alter records.

The original support form now distinguishes live topics from reference fixtures. Live choices exactly match the persisted backend contract: general, account, product, commission, technical, other. Validation uses that topic list and requires no sample order for Account or Commission. The inactive order/item selection and demo-order guidance are hidden in the live form; reference demo order workflows retain their existing requirements. History displays localized names for the live topics.

Commission review and cancellation/return forms now guard pending writes and saved-result checks. Browser-back guards reject navigation while the request lock is held; panel-menu navigation uses the same pending lock and keeps unsaved-change confirmation for drafts. The commission support link also uses this guard. Browser reload/close attempts activate the normal before-unload warning during pending work. A localized saving/checking message makes the blocked interval visible. Confirmed completion releases navigation without discarding unknown-result recovery.

Unconfirmed support creation now checks the original ticket directly through the owned detail endpoint, rather than scanning every ticket page. The adapter validates the returned ticket kind/identity and treats only a confirmed `record_not_found` as absence. Recovery checks hold the request lock, disable overlapping checks and guard navigation until they settle. Read failures preserve the draft and unknown state; confirmed absence enables retry with the original identifier, while a recovered ticket completes without another submission.

Notification history now accepts owned server-side `q`, `read_filter` (read/unread) and `category` filters. Literal bounded search covers bilingual titles and recorded body text before pagination. Ticket status filters remain ticket-only; notification filters are rejected for other record kinds. The customer screen explicitly applies full-history search, exposes All/Unread/Read, retries and pages with applied filters, and clears filters on account changes/reset. Bulk marking still loads the unfiltered owned history. The category dropdown uses a separate explicit label to avoid reopening after selection.

Return forms now show the order's recorded return deadline in Tehran time, or explicitly state that no deadline is recorded. A lightweight clock updates eligibility at the deadline and after focus/visibility changes, with bounded timers and cleanup. Expiry disables submission without clearing reason/quantities. The submit handler also rechecks the current clock immediately before issuing a return write. Server ownership, version, deadline and quantity checks remain authoritative; no return period or policy is invented.

Owned order details now expose `return_available` per physical returnable line and an owned `active_request_id`. Available counts subtract quantities in non-rejected prior returns, using the same shared calculation as request submission; they clamp at zero and do not replace payment/deadline/version checks. History lists remain unchanged. Request forms show remaining counts, enforce those maxima, fail closed if counts are missing, and link to tracking rather than offer another request while one is active. Draft quantities above refreshed availability cannot be submitted.

Favorites history now accepts owned `q` and `favorite_type` filters before cursor pagination. Search uses only currently published bilingual catalog titles across products, bundles and artworks, with literal matching and Persian/Arabic kaf/yeh normalization. Unpublished favorites remain removable in unsearched/type-filtered lists but cannot reveal title metadata through search. Favorite cursors must belong to the current account. The customer screen now explicitly searches the full list, preserves filters through paging/retry, resets them on account changes and distinguishes filtered-empty results.

Selected support PNG screenshots now have a local image preview before upload. The preview uses the already-read bounded PNG data, sends no request, and explains that Attach screenshot is the explicit send action. Removal, successful/reconciled upload and private account cleanup clear the selected preview. Display failures show localized guidance while retaining removal/upload controls; backend PNG validation remains unchanged.

Support conversations now expose an explicit refresh action. Existing conversation content remains mounted during refresh and refresh failures, preserving typed replies and local screenshot selections. Refresh success updates the ticket version/status and message history; failures explain that the last loaded conversation is being shown and offer retry. Writes are disabled during the read, and refresh is disabled during pending/unknown writes or attachment work. No reply/upload is triggered by refresh; attachment metadata retains its independent check action.

2026-10-17: Restored the downloads reference layout using its original stylesheet and live API data. Audited the account screens at mobile width and corrected shared orders/requests/commissions headings and unstyled filter fields. Download behavior remains covered by integrity, cancellation, search, scope and retry tests. See the feature audit for validation scope.

2026-10-17: Added real PNG screenshots during new-ticket submission, retaining selections across uncertain ticket creation and using stable attachment identifiers for retry/reconciliation. Added optional owned order/item associations to tickets with current permission, ownership and item-membership validation; conversations link back to related orders. Dashboard ready-file cards now display eligible files and open their order-scoped library. SMS remains excluded; JPEG/PDF, payment-provider reconciliation, official invoice issuance and fulfillment/refund execution remain separate unfinished integrations.

2026-10-17: Added JPEG and PDF to private support uploads in new tickets and existing conversations, with actual content validation, matching download types, local JPEG previews, and non-embedded PDF summaries. Existing PNG clients and saved files remain compatible. Staff can read/download the supported formats; staff-uploaded reply files are still unfinished. Payment/refund provider details remain pending; SMS stays excluded.

2026-10-17: Staff can now upload private PNG/JPEG/PDF files to support conversations. Current support permission, CSRF/origin, closed-ticket guards, ownership, immutable replay and file limits apply. The ticket becomes awaiting customer and one preference-aware in-app notice links to the conversation. Typed staff replies are retained and are not sent by attachment upload; unresolved attachments block competing reply/state writes. Customer downloads use owned protected routes.

2026-10-18: Added staff final-file release/revocation to digital order details, with private metadata history, exact-ID reconciliation, stable retries, checksum/size acknowledgement, draft/pending navigation guards and read-only/eligibility controls. Existing server payment/digital-line/commission-approval rules remain authoritative. Browser acceptance is tracked in the feature audit.

2026-10-18 verification: final delivery and downloads/order regression browser suite passed all 22 scenarios; Persian mobile screenshot inspected. Final-file frontend checks (8), combined attachment/delivery frontend checks (29), private-download database checks (10), focused lint and production build passed. Updated local API/web previews are healthy. See the feature audit for remaining external integration limits.
