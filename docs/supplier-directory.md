# Supplier directory — 2026-10-18

Connected `/fa/admin/inventory/suppliers` and its English equivalent to protected supplier records. Stable `/new/{id}` and `/{id}` editors reuse the reference AdminDashboard shell, typography, panels and shared dropdown. No sample suppliers or financial balances are created.

Records have a globally unique uppercase code, bilingual names, an explicit goods/service/both classification, optional contact person/phone/email, multi-line address/internal notes and active/archive state. Empty contact fields mean unrecorded. Persian and Arabic phone digits normalize to ASCII in the editor; the server validates bounded printable contact data. Notes and addresses allow line breaks. Archival preserves identity and immutable history; there is no delete endpoint.

Reads/writes require `inventory.manage`. Writes recheck live authorization, exact Origin and CSRF inside the transaction. Revision IDs bind the actor, expected version, complete content and reason; exact retries return the original receipt. Different intent, duplicate codes and stale versions conflict. Supplier updates, version receipts, staff audit and outbox are atomic. Concurrent writers have one winner. The worker validates and deduplicates `procurement.supplier_saved`; it sends no external messages and makes no stock/financial changes.

The editor preserves rejected inputs, compares the latest saved record after conflicts and requires an explicit acknowledgement before retrying against that version. Unknown outcomes lock the editor until the stored receipt is checked or the exact same intent is retried. Reloading a new supplier URL reuses its stable ID. Private contacts/drafts/history clear on session changes and late responses are ignored. History shows actor, Tehran time, reason and complete saved fields.

Server contact search matches code, bilingual name, contact person, phone and email literally; active/archive filtering applies before UUID keyset pagination. UI reload/clear/more actions preserve applied scopes.

## API

Prefix: `/api/v1/admin/procurement`.

- `GET /suppliers?q=&active=&cursor=&limit=`
- `GET /suppliers/{id}`
- `GET /suppliers/{id}/versions?before=&limit=`
- `GET /suppliers/{id}/versions/{revision}`
- `PUT /suppliers/{id}/versions/{revision}`: expected_version, complete content, required reason.

Migration 0032 adds `procurement_suppliers` and `procurement_supplier_versions` after existing migration 0031. It is additive, reversible and seeds no business data. API contracts and generated client types are updated.

## Verification and remaining scope

17 isolated PostgreSQL checks cover versioned replay/history, global duplicate codes, contact/filter pagination, input validation, private access, Origin/CSRF, fresh authorization changes, atomic rollback, actual concurrent writes, reversible migration and worker deduplication. Seven frontend checks cover receipt identity/intention and private-state cleanup. Ten intercepted browser workflows cover stable creation/reload, contact edits/history, stale conflicts, lost responses, archiving/search/pagination, unauthorized reads, draft navigation and Persian mobile layout. Browser checks never write real supplier data.

This completes the directory portion of OPS-04. Supplier balances, opening debts/credits, purchase orders/receipts, independent payments, linked corrections and statement/export workflows remain unfinished. Cost-resource supplier labels remain informational and are not automatically converted into directory relationships. Inventory, production, price proposals, finance and other pending admin areas remain separate work.

Local deployment: frontend production build passed; API/worker source updated using an existing runtime after all installed dependency versions matched requirements.lock. Local database is at 0032; all eight services healthy. Supplier list/history reject unauthenticated requests with 401/no-store, and the Persian admin route returns 200. No business supplier or financial records were seeded.

All ten supplier browser checks passed again through localhost:8080 after deployment, using intercepted fixtures.


### Recorded supplier financial statements — 2026-10-20

Supplier statements now combine posted purchase/cancellation/return liability with recorded supplier payments/refunds and linked reversals, exact running subtotals, Tehran recording-date filters, stable paginated revisions and full-range CSV/XLSX exports. Finance-only access has its own `/admin/finance/suppliers/{id}` route; source financial documents support deep links. Missing opening supplier balance and incomplete history are explicit. This adds no migration or money/stock command. See [supplier financial statements](supplier-financial-statements.md). Opening debts/credits and complete release acceptance remain pending.


### Explicit supplier opening balances — 0050 (2026-10-20)

Finance can now confirm an external opening debt, credit or zero, with evidence, an excluded-recorded-activity acknowledgement, a frozen pre-activity date and reason. Corrections retain linked versions and signed deltas; cash, purchases and inventory are unchanged. Openings are integrated into statements, revised pagination and exports; unknown loading is distinct from missing setup. Migration 0050 creates no business data. See [supplier opening balances](supplier-opening-balances.md). Settlement against opening balances and full release acceptance remain pending.
