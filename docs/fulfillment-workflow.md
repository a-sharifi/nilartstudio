# Sandbox fulfillment and parcel tracking — 0044

This stage connects ready physical stock commitments to partial parcels, actual stock consumption and customer tracking. It is a partial ORDER-03 release; full checkout policy, custom print, return/refund, settlement and integrated release acceptance remain pending.

## Operational flow

`/{fa|en}/admin/shipments` (alias `/admin/shipping`) lists persisted parcels with status/reference/tracking filters and pagination. An order's preparation action opens `/admin/shipments/new?order=…`; standalone creation finds paid sandbox orders with recorded committed stock. Historical orders without component identities are not reconstructed.

A parcel selects positive whole quantities of physical order lines. Bundle units include all their actual frozen components. Quantities across all active plans, dispatched and delivered parcels cannot exceed the ordered quantities. Cancelling an undispatched parcel frees its planning quantities; it does not cancel the paid order or release the order's stock commitment.

The versioned workflow is draft/edit → explicit picking confirmation → QC checklist → packing → explicit sandbox dispatch → delivery. QC failure is recorded and prevents packing until a subsequent passing inspection. Packing requires a note and measured positive weight. Dispatch requires a carrier, tracking number, explicit actual shipping cost (zero must be entered), a reason and sandbox confirmation. This records staff-entered sandbox shipment facts; it contacts no real carrier and makes no bank payment.

Open submitted/in-review/approved cancellation requests block new preparation, picking and dispatch. Paid/committed stock is rechecked at dispatch. Custom commission lines and missing historic components are blocked until their private print workflow is implemented.

Dispatch also requires explicit configured return duration and bilingual operational policy text. The version/text is frozen in that parcel; it does not rewrite the customer's original returnability or purchase terms. Checkout still needs its full tax/shipping/delivery/return-policy integration. Missing configuration is not assigned a silent default.

## Atomic stock and cost

Commands acquire the existing fresh account lock, shipment lock 78214/44, payment/order locks, then the stock lock 78214/35. No network request runs under these locks. Planning quantity checks and dispatch serialization prevent concurrent over-allocation. Stable operation IDs bind actor/shipment/full intent; exact retry returns the original immutable event receipt. Conflicts, unknown outcomes and permission denial remain distinct. Private state is cleared on session changes and unsaved inputs have navigation guards.

Dispatch releases only this parcel's committed quantities and immediately records linked `fulfillment_dispatch` inventory movements in the same transaction. Actual selected bundle SKUs, repeated SKU demand and partial quantities are preserved. `order_stock_allocations.shipped` tracks total consumed quantity per position; its reservation event records released holds. Physical stock/value uses the existing moving weighted-average helper. Actual per-component movement IDs and cost, plus their sum, are frozen in the shipment. Future stock rates/prices do not alter these historical costs.

Shipment, stock movements, commitment event, order aggregate state, staff audit, customer notice and outbox event commit together. A failure rolls everything back. Replaying a dispatch never deducts stock or recognizes its historical cost twice. Actual shipping cost is a distinct recorded operational fact, not bank payment or an automatic expense entry. No revenue or gateway settlement is posted here.

## Delivery, corrections and customer privacy

Overall order fulfillment is derived from all recorded parcels and preserved digital delivery counts: partial, fully shipped, then delivered only when every order line is delivered. Delivery quantities cannot exceed the order. Parcel delivery times and return dates use server UTC timestamps. Each parcel retains its own deadline; the existing order-wide return gate uses the earliest delivered-parcel deadline conservatively, so a later parcel does not extend an earlier one. Full per-component return inspection/refund processing remains pending.

Posted parcels cannot be cancelled or edited. Carrier/tracking corrections are explicit reasoned commands with retained before/version history. Delivered quantities and frozen cost do not change. A sandbox packing label at `/admin/shipments/:id/label` prints only recipient/address, quantities, carrier/tracking and weight; it excludes cost, staff notes and audit data. It is not an official carrier-generated label.

Customers access only their own `/api/v1/account/orders/:id/shipments`, containing dispatched/delivered parcels and quantities/tracking/dates. Drafts, internal cost, QC notes and staff audit are excluded. Dispatch/delivery generate deduplicated in-app order notices respecting preferences. No SMS is sent. The customer order view follows recorded parcels, and stock status no longer claims shipment is unconfirmed after recorded dispatch.

`fulfillment.manage` independently controls staff shipment reads/commands/labels; order page access remains `orders.read_all`, and customer reads require owned `orders.read_self`. Shipment operations do not confer refund or bank-payment permissions.

## Evidence and remaining limits

`Backend/tests/test_fulfillment_postgres.py` covers partial planning/dispatch/delivery, actual cost preservation, duplicate command/receipt, QC failure, cancellation planning recovery, policy/cancellation blocks, independent permission denial, privacy and atomic rollback. Existing stock/payment/procurement/production tests remain separate evidence.

`Frontend/tests/fulfillment-api.test.tsx` checks complete intent/transition/receipt binding and uncertainty. `shipment-tracking.test.tsx` checks owned response binding and private clearing. `tests/e2e/fulfillment-live.spec.ts` uses the exact isolated demo fixture guard from `Backend/scripts/seed_stock_acceptance.py`: real counted stock, a no-charge customer checkout, two partial parcels, lost dispatch response recovery, a new incoming-stock cost adjustment, frozen first-parcel cost, complete delivery, labels and owned customer tracking. No real money or carrier action occurs.

Outstanding: component-only partial bundle shipments (current parcels ship complete bundle units), formal returns/inspection/refunds and corrected stock reversals, complete checkout policy and per-parcel return eligibility, production print file consumption/custom commission delivery, profit report integration, real carrier/gateway activation and full integrated acceptance. Posted source shipments are never silently deleted.

Final verification includes a real repeated-SKU bundle dispatch test: two frozen component choices select the same SKU, the current bundle definition changes afterwards, and dispatch still consumes the original component demand and actual cost. Further checks verify reasoned tracking correction keeps its original dispatch receipt/cost, unrelated customers cannot read parcels, and notices are not duplicated. All 642 backend tests passed on the final expanded suite. All 372 frontend unit tests passed, plus seven final browser checks (real two-parcel fulfillment and six inventory regression journeys). The real browser journey verified cost 50.000000 for the first parcel, 116.666667 after a new incoming-stock cost adjustment for the second, preserved first cost, complete delivery, private customer tracking, four notices and cost-free printable label content. Final source/client checks and build/typecheck/lint passed.

The restored-copy migration to 0044 preserved stock/purchase/production/SKU/price-audit and existing reservation snapshots, adding empty shipment/event tables. The private backup is `backups/pre-fulfillment-20261019T135001Z.dump`. Final worker check showed 24/24 shipment events published and processed in the isolated demo, with no duplicated events from dispatch replay. Main receives no synthetic shipment records.

Deployed to main local sandbox and isolated demo at schema 0044. API/web/worker/scheduler are healthy in both. Workers/scheduler were upgraded before exposing the new main API event types. Main shipment/event/dispatch-movement tables remain empty: synthetic acceptance records were confined to nilart_demo. fa/en shipment pages and the preserved shipping alias return 200/private no-store; guest shipment API reads return 401/no-store. No existing business orders or historical costs were rewritten.
