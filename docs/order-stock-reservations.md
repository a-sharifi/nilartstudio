# Checkout stock commitments — 0043

This stage connects recorded physical stock to sandbox checkout and operational order review. It is part of the integrated sandbox release; fulfillment, shipping/tax/delivery policy enforcement and refunds remain unfinished.

## Workflow

The basket remains unreserved. Authenticated checkout first obtains `/api/v1/payments/stock-review?basket_version=…`. The review freezes the current basket/options/prices/selected components and business settings version in a fingerprint. A missing configured `reservation_minutes` blocks payment. Missing opening stock or insufficient available stock blocks checkout. The browser shows readiness and the configured duration, and requires fresh acceptance after a changed review.

Payment initiation requires that fingerprint as well as the existing basket/discount version and total. New orders freeze each actual SKU or unique original, quantity per purchased unit and selected component title in `OrderLine.stock_components` and `order_stock_allocations`. Repeated occurrences of the same SKU, including a standalone line and multiple bundle components choosing that SKU, share aggregated demand. No historical bundle is reconstructed from the current catalogue.

Order, payment, coupon reservation, stock reservation history and outbox events commit atomically. Global stock lock 78214/35 is shared with manual adjustments, purchasing and production; no second writer can reserve the same last unit. Reservation changes leave physical quantity/value untouched, use an independent `reservation_version`, and record per-position delta/after/version. Existing physical movement versions and costs remain intact.

A confirmed payment commits its held stock. Definitive payment rejection/cancellation releases temporary stock and pending coupon usage once. Transport/malformed/unknown results retain stock until configured expiry and never establish failure. A scheduled task scans up to 100 due reservations every 30 seconds; checkout also clears due reservations under the same stock lock. Duplicate expiry is harmless. Committed paid stock does not expire.

Late success after release reacquires all actual frozen components atomically. If any component is unavailable, the paid order enters the visible `shortage` queue and remains on hold. All sandbox orders remain on hold pending the separate fulfillment/policy stage, even when stock is committed. No shipping, physical stock consumption, historical cost, revenue, refund or bank settlement is inferred from a reservation.

Uncertain payment requests may have no recorded authority; stock can expire but payment remains unresolved. The original payment intent and recovery route must be reused. This stage does not provide safe automatic re-initiation of an uncertain gateway charge.

## Staff and customer views

`/{fa|en}/admin/order-stock` provides status/search/pagination. `/admin/order-stock/:order` shows frozen components, configured expiry/settings version and append-only reservation/commitment history. Order details reuse the same component. `fulfillment.manage` controls standalone reads and commands independently of `orders.read_all`. Opening the containing order page also requires its existing order permission.

Staff can recheck a paid shortage after replenishment, using a nonblank reason, expected allocation version and stable operation ID. Exact retry returns its original actor-owned receipt. A stale version or different intent conflicts. A lost response freezes the command for receipt/retry recovery. There is no manual allocation binding for historical orders, no manual success flag and no stock movement implied by the command.

Customers see only their own stock state/expiry through `/api/v1/account/orders/:id/stock`. A paid shortage explicitly says shipment is not confirmed and support resolution is required. Staff identity/history is not returned to customers.

The shared HTTP exception handler now preserves explicit domain error codes, enabling checkout to distinguish changed stock/basket/price validation from uncertain results and renew customer acceptance.

## Important limits

- Shipping/tax remain explicitly zero in the existing sandbox checkout; SKU/artwork delivery type, weight-based shipping and full policy enforcement are pending. Existing catalogue basket types are physical. This is not a complete production-ready checkout.
- Reservations use physical stock only; recipe/material capacity does not imply finished SKU availability.
- Legacy orders have no allocation backfill. They remain visibly incomplete; missing historical costs or selected components are never invented.
- Coupon usage remains reserved during an unknown payment even if temporary physical stock expires, preventing the same limited coupon from being reallocated while that gateway outcome is unresolved. Explicit failure releases it. A subsequently verified late success records the actual coupon redemption, even after a prior release; downstream financial resolution of exceptional late coupon-limit overruns remains pending. Fulfillment is on hold.
- Historical inventory reports still disclose missing historical reservation coverage; this stage adds order-level reservation history and current balances, not complete as-of availability reporting.
- Paid cancellation/refunds, fulfillment consumption/COGS, private print workflow, shipment/QC/partial delivery and settlement are separate pending stages. Background gateway inquiries remain pending; reservation expiry is a real scheduled worker task.

## Automated evidence

`Backend/tests/test_order_stock_postgres.py` covers actual bundle/standalone aggregation, initial reservation, confirmed commitment, idempotent callbacks, expiry, unknown/late payment shortage, staff recommit/receipts, missing configuration, changed review, cost preservation and rollback. `test_discounts_postgres.py` covers independent concurrent last-unit and last-coupon winners using separate real database sessions. Existing payment/discount/inquiry checks remain passing.

`Frontend/tests/order-stock-api.test.tsx`, `stock-review.test.tsx`, `order-stock-outcome.test.tsx` and extended `sandbox-checkout.test.tsx` verify exact receipt binding, private clearing, cross-order rejection and blocked/reaccepted checkout. `tests/e2e/order-stock-live.spec.ts` runs the isolated real database-backed opening → customer stock review → 100%-discount zero-payment order → stock commitment → staff/customer bilingual/mobile views. It makes no real gateway charge.

Component money is frozen independently of stock cost: each selected component retains its original unit price and a deterministic largest-remainder share of the line's actual paid amount after bundle/coupon discounts. Decimal/Fraction calculations preserve the exact sum to the original line net amount; future price edits do not change these records. These are sale allocations for future refund bounds, not inventory cost recognition.

### Reproduce isolated browser acceptance

`Backend/scripts/seed_stock_acceptance.py` creates a labeled synthetic customer/address and published product/SKU only in the database named exactly `nilart_demo`, and requires `--demo-only`. It copies the isolated demo account's password hash for the synthetic customer; it never prints credentials or creates staff roles. Run it via stdin in the demo API container (which already has its isolated database configuration):

```sh
docker compose --project-name nilart-demo --env-file .env.demo -f infra/docker/compose.yaml -f infra/docker/demo.override.yaml exec -T api python - --demo-only < Backend/scripts/seed_stock_acceptance.py
```

Set `NILART_STOCK_FIXTURE` to the returned fixture JSON, `NILART_RUN_DEMO_TESTS=true` and `PLAYWRIGHT_BASE_URL=http://127.0.0.1:18080`, then run `Frontend/tests/e2e/order-stock-live.spec.ts`. The browser journey explicitly opens counted stock and a customer-scoped sandbox-only 100% coupon, uses the real APIs and verifies the recorded outcomes. A fresh fixture is required per run. None of these synthetic records belong in the main database.

Verification completed: 638 backend tests and 368 frontend unit tests passed; production build, type checking and targeted lint passed. Five browser checks passed on the final build (the real isolated stock-opening/checkout/commitment/customer/staff journey plus four checkout regression journeys). Persian and English views were checked at 390/1440 pixels with no viewport overflow; the Persian mobile component/history layout was visually reviewed. The restored-copy 0043 migration preserved existing stock, purchase, production, SKU and price-audit records (`backups/pre-stock-reservations-20261019T132625Z.dump`). Demo expiry tasks were received and completed by the real worker; both recorded reservation events at the worker check were published and processed.

Deployed to main local sandbox and isolated demo at schema 0043. Both environments' API/web/worker/scheduler services are healthy. Main allocation/event tables remain empty: no synthetic stock, orders or reservations were added to main. fa/en staff queue pages return 200/private no-store, and unauthenticated staff/checkout stock reads return 401/no-store. Main existing records are preserved. New checkout availability requires explicit settings and recorded opening/received/produced stock; absent values remain incomplete configuration.
