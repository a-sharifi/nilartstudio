# Return receipt and inspection — sandbox stage 0045

Approved customer return requests now support append-only inspections in their existing admin detail screen. `/admin/returns/:id` aliases `/admin/order-requests/:id`. Persian/English screens reuse panel tables, buttons and dropdowns.

Each command has a stable UUID, expected request version, shipment, component quantities and reason. Staff must currently hold both `fulfillment.manage` and `orders.read_all` to write. Permission checks run again in the transaction. Delivered shipments and approved requests are required; no inspection changes the original purchase terms or approves a new return.

Quantities are bounded independently by the approved request and the original shipment component. Prior inspections across requests share the shipment limit. Repeated bundle components remain separate frozen identities even when they refer to one SKU. Healthy quantities restore inventory using their historical dispatch cost, with cumulative six-decimal allocation; changing today's moving average or catalogue cannot change the recovered cost. Unique-original capacity remains one. Stock movements link to the shipment and inspection receipt.

Damaged quantities and their original cost remain on the immutable inspection record, excluded from healthy available stock. That cost is a disposition of already dispatched cost, not an additional expense posted a second time. Consolidated waste/profit reporting remains pending.

Inspection, stock movement, request version, actor/reason audit, customer notice and outbox commit together. Exact retries return the original receipt. Different intents under the same operation ID, stale versions and excess quantities fail without partial writes. Staff can retrieve a lost response and retry the same operation.

Customers can view their own inspection quantities and timestamps. The customer API excludes stock values, original cost, staff identity, internal notes and movement IDs. Receipt explicitly does not confirm any refund. Request remains approved for further processing; inspection does not mark it completed or change payment/order delivery state.

## Acceptance and limits

Database tests: partial healthy/damaged receipt, original cost after moving-average changes, replay, stale/conflicting commands, wrong shipment/component, approval and permission checks, atomic rollback and customer data minimization. Frontend contract tests validate command scope, exact intent/outcome and uncertain-result recovery.

This is a partial ORDER-04 implementation. Full checkout return-policy acceptance, automatic eligible customer submission for newly configured policies, complete request closure, cancellation completion, refund commands and gateway/financial reconciliation remain pending. Legacy orders missing shipment cost/components cannot be assigned invented stock/cost. No real money or external carrier actions are performed.

The isolated browser journey uses a visibly labeled synthetic approved legacy-return fixture, created only in `nilart_demo` by `Backend/scripts/seed_return_acceptance.py`; it never edits the order's frozen terms. It follows real sandbox checkout and two-parcel dispatch/delivery, records healthy and damaged receipt through the staff screen, drops a committed HTTP response, recovers/replays its exact receipt and checks customer privacy. This verifies inspection dependencies, not yet the complete policy-submission-to-refund journey.

Existing `orders.request_reviewed` background events are now explicitly validated/consumable alongside inspection events, with transactional deduplication. Events already exhausted before this fix still require operational review; this stage does not reset unrelated failed jobs.


Final sandbox verification: 647 backend tests, 374 frontend tests, production build/typecheck/lint and three deployed browser checks passed. Main/demo services are healthy at 0045. Main contains no synthetic inspection records.
