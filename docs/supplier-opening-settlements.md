# Supplier opening cash settlements — 0051

Opening debt payments and opening credit receipts use the existing operational finance ledger. Staff record cash evidence; this does not send a bank transfer or contact an external refund provider. Purchase payments remain independent.

## Workflow and contracts

`/{locale}/admin/finance/suppliers/{supplier_id}/settlements` reads the authoritative opening and remaining allocation. An unconfigured opening has no amount; explicit zero is required. Positive outstanding permits an outgoing opening payment; negative outstanding permits a recorded credit receipt. Settled openings accept no additional allocation.

GET `/api/v1/admin/finance/suppliers/{id}/opening/settlement` returns the current opening event, settlement counter and exact decimal-string IRT amounts. GET `…/opening/settlements` pages 20 records with supplier-scoped cursors. Posting reuses PUT `/api/v1/admin/finance/documents/{operation_id}` and its immutable receipt recovery endpoint, with `supplier_opening_payment` or `supplier_opening_refund`. Commands bind the latest opening event, expected settlement counter and every affected cash account version. Finance read and write are both required; reads require finance read.

Dates must follow the frozen opening date. Payments cannot exceed outstanding debt; receipts cannot exceed opening credit. Cash cannot become negative. Concurrent opening corrections, cash commands and supplier allocations serialize through the existing finance transaction lock. Cash lines, allocation, command receipt, audit and outbox commit atomically. Stale proof rejects without movement. The UI retains rejected inputs, requires refreshed confirmation, and preserves an exact pending command after an uncertain response.

Opening corrections retain all cash history. Financial corrections use linked reversals pinned to the current opening and allocation counter. Reverse dependent corrective receipts/payments before reversing their original settlement; duplicate reversal is rejected. Reversals of unrelated cash documents cannot acquire an opening allocation.

Migration 0051 adds only `finance_opening_allocations` and creates no supplier, opening, cash or stock records. Historical purchase allocations and receipts remain valid. Supplier statements include signed opening cash/reversals in net paid, keep opening changes separate, and preserve exact running balances and source-document links. Purchase balances and stock are unaffected.

## Verification

Database-backed tests cover partial debt payment, credit receipt, bounds, idempotent replay, stale bank/opening proofs, correction and dependent reversals, permission revocation, atomic outbox rollback, statement totals and unrelated reversal rejection. Frontend contract checks cover authoritative versions, nullable missing configuration and scoped history. Integrated demo browser evidence and release checks are recorded in the admin verification log.

This is one completed workflow within the partial sandbox release. Real external payouts, full gateway settlement, full catalogue/commission/reporting dependencies and complete 56-view acceptance remain pending.
