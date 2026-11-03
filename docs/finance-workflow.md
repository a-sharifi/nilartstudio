# Recorded operational finance — 2026-10-19

This stage implements staff-recorded sandbox cash events. It does not send bank payments or call external refund providers. The complete integrated admin release remains unfinished.

## Screens and contracts

The shared FinancePanel serves `/admin/finance`, `/accounts`, `/movements` (alias `/receipts-payments`), `/expenses`, `/balances`, `/cashflow` (alias `/cash-flow` and `/admin/reports/cashflow`), and `/export` (alias `/exports`). Each route supports Persian and English and uses shared admin tables, filters, compact buttons and labeled icon actions. Existing panel layout and Yekan Bakh remain.

`/api/v1/admin/finance` exposes paginated accounts, immutable documents, purchase balances, cash flow, date-filtered CSV and actor-owned command recovery. Account creation requires an explicit opening amount and date; no existing business balance is inferred. Account metadata is versioned, account kind is fixed and a nonzero account cannot be deactivated. All amounts are exact decimal strings in IRT. Negative cash balances are rejected.

`finance.read`, `finance.write` and `finance.export` are independent. Writes revalidate session permissions, Origin and CSRF. Own command recovery requires write permission and cannot expose another actor's receipt. Private responses are not cacheable. Logout clears private UI state. Pending inputs survive rejected/conflicting writes; conflict requires reload and comparison, while ambiguous results retain the original operation ID and full intent for recovery/retry.

## Financial events and corrections

Receipt/payment/expense creates one cash line; an internal transfer atomically changes both accounts. Source account versions bind commands. Supporting reference, description, date and reason are explicit. Account opening records are separate from operational inflows/outflows. Opening balances and internal transfers are excluded from cash-flow totals. Reversals appear on their own document dates; expense reversals reduce net operating expenses.

Posted documents and account codes in historical lines are immutable. Corrections create linked opposite lines, with a unique reversal per original document. Corrections of corrections are rejected. Stable operation IDs bind actor, target and the complete intent, so exact replay cannot duplicate money. Changed intent, stale account versions, invalid dependent corrections and insufficient balance fail without partial effects. Cash, allocation, audit and outbox updates commit together. Worker processing deduplicates `finance.recorded` events.

Supplier payment is allocated to a specific posted purchase and bounded by its current liability minus net recorded payments. Partial payment does not receive stock or change the purchase version. A purchase receipt changes stock separately. Purchase returns/cancellation reduce liability; if already paid, the excess becomes a visible supplier credit, without inventing a cash refund. Staff may then record refund received, bounded by that credit. Dependent refunds must be corrected before reversing their payments. Purchase edits and finance allocations share purchase locking.

CSV exports require the export permission, explicit dates and a bounded range (10,000 cash lines). They carry source document IDs, dates, currency, filters, frozen account codes, deltas, post-event balances, purchase/reversal IDs and supporting references. User text is protected against spreadsheet formula execution.

## Verification and limitations

Database tests cover partial payments, purchase return credits, refund bounds, duplicate commands/corrections, rollback of transfers, exact fractional amounts, permissions/CSRF and CSV safety. Real isolated browser journeys cover account creation, transfer, lost successful response, exact recovery/replay, expense correction, cash flow, CSV and mobile fa/en; a separate supplier journey checks partial payments, stock receipt/return and refund received. Synthetic data is confined to `nilart-demo` at `127.0.0.1:18080`.

Migration 0040 is additive and was verified against a privately backed-up/restored copy of the existing database, preserving stock, purchase and production snapshots. No opening balances are migrated or invented.

Still pending: uploaded private financial supporting files (this stage records references), XLSX, customer/gateway/artist obligations, actual gateway fee/settlement integration, historical fulfillment costs/profit, cross-domain official reports and the full end-to-end release acceptance. Existing supplier purchase-only statements remain explicitly labeled; payment-inclusive purchase balances are in Finance → Supplier balances. FIN-01–05, FIN-10 and FIN-12 remain connected_partial rather than accepted.

Deployment verification (2026-10-19): main and isolated demo are at schema 0040; all nine services in each workspace are healthy. Main finance accounts/documents are both empty; no synthetic balances were introduced. Guest finance reads return 401/no-store and fa/en finance routes respond successfully. Sixteen emitted demo finance events were published and processed exactly once at the worker audit check. Both real finance browser journeys passed independently; finance client tests (3), backend finance checks (7), type checking, targeted lint and the frontend production build passed. The full backend run passed 615 checks; existing frontend suite passed 347 before adding the three finance client checks.
