# Combined supplier balances — 2026-10-20

The finance workspace now links to `/admin/finance/supplier-balances`, alongside the existing per-purchase balance screen. This read-only report combines the latest external opening, current purchase liability, purchase cash allocations and separate opening cash allocations. Linked reversals and purchase cancellations/returns are reflected through their recorded sources. Cash, purchases, stock and supplier history are not changed by loading or exporting.

An unconfigured opening is nullable, never a claimed zero. Such suppliers show known recorded activity but have no confirmed balance and are excluded from confirmed payable/receivable totals. The summary explicitly counts missing openings. An explicit zero opening is configured. Positive configured balances mean we owe the supplier; negative balances mean supplier credit. Gross debt and credit are summed separately. Archived suppliers retain balances and source links.

## API and consistency

GET `/api/v1/admin/finance/supplier-balances` requires `finance.read`. It accepts literal code/fa/en-name search `q`, balance status (`all`, `debt`, `credit`, `settled`, `unconfigured`), bounded offset/limit and a snapshot fingerprint. The default page is25, maximum100. A single PostgreSQL statement reads source balances and verifies purchase event count/version/final liability consistency; incomplete history is rejected rather than presented as authoritative. The report is bounded to1000 suppliers; exceeding that limit is an explicit error, never a truncated total.

All money is exact decimal-string IRT. The fingerprint binds filtered rows, configuration, source opening ID/version, identities and filters. Subsequent pages require the same fingerprint; changed balances reject with409. Filters must be applied before pagination/export. Errors discard stale report results and do not show a false empty/zero report. Session changes clear private state; stale asynchronous results are ignored.

GET `…/export` additionally requires independent `finance.export`. CSV and XLSX contain supplier IDs, opening event IDs/versions, explicit currency, exact component balances, configuration, filters, snapshot fingerprint and UTC export timestamp. Unconfigured amounts remain blank. User text is formula-safe; XLSX stores text to preserve exact decimals. Source transaction dates, corrections and document IDs are available through each linked supplier statement. Export rejects a changed snapshot. This is a current-position report, not a historical-date or aging report.

The UI preserves Yekan Bakh, the shared panel/filter/table/button components, accessible icon actions and mobile table cards. Each supplier links to the financial statement/opening and opening settlement workspaces. The original `/admin/finance/balances` per-purchase workflow remains available.

## Evidence and remaining scope

Database-backed tests verify combined opening/purchase cash against the supplier statement, missing/zero/negative opening rules, purchase cancellation, stale snapshots, CSV/XLSX metadata and formula safety, independent read/export permissions and incomplete histories. Frontend tests verify filter/snapshot scope, missing configuration, errors and export availability. The isolated real-database browser journey creates new demo-only suppliers/cash, checks payment and later correction totals, rejects an old export, downloads both formats, follows source links and reviews Persian/English390/1440 layouts.

No migration or backfill is required; schema remains0051. FIN-05 and FIN-12 remain partial: customer, gateway and artist obligations, aging/historical-date reports and complete integrated release acceptance remain pending.

## Historical recording-date extension — 2026-10-20

Optional `as_of_date=YYYY-MM-DD` now selects entries recorded through the end of that day in Asia/Tehran. Omit it for the current position. Future dates reject explicitly. The cutoff applies independently to purchase liability changes, purchase payments/reversals, opening confirmations/corrections and opening cash allocations. Later activity cannot rewrite an earlier report. This is a record-time view: old document dates and imported external opening dates do not backdate when the system first knew about an entry. Supplier names, codes and active status remain current and the screen discloses this.

An opening recorded after the selected day remains unconfigured in that historical view; its earlier external date is not treated as evidence of earlier system configuration. Supplier statements now use the same recorded-through rule for their opening-configuration indicator. Financial amounts continue to use exact recorded deltas; future changes are excluded, while existing completeness checks remain enforced. The date is bound into pagination/export fingerprints, is returned by the API, and appears as `recorded_through_tehran` in CSV/XLSX.

The page URL preserves applied `q`, `status` and `as_of_date` filters, supporting reload, sharing and browser back. Draft filter edits disable pagination/exports until applied. Statement links carry `recorded_to` so the statement opens with the same cutoff. Invalid URL dates/statuses are ignored safely; future valid dates produce an explicit error with inputs retained. Session lifecycle still clears private report state.

This extension supersedes the original current-only limitation above. Aging and due-date reports remain pending; no due dates or overdue status are invented. No migration, cash, stock or supplier-history mutation is introduced.

The historical browser journey also verified navigation protection: declining a dirty opening form's confirmation keeps its input and route; clean approval returns to the filtered report. The shared history guard was corrected to honor synchronous approval callbacks while retaining deferred/denied/session-change protection.
