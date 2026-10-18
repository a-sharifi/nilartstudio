# Zarinpal sandbox checkout

Enable only in development:

```
NILART_PAYMENT_MODE=zarinpal_sandbox
NILART_ZARINPAL_MERCHANT_ID=00000000-0000-0000-0000-000000000000
```

The default UUID is accepted by the sandbox; a live sandbox request and browser payment were verified on 2026-10-18. The adapter has no production gateway URL. Configuration rejects sandbox mode outside development. `NILART_PUBLIC_ORIGIN` determines the callback, which is reached through the customer's browser (localhost works for local tests).

Flow: `/fa/cart` → `/fa/checkout/sandbox` → saved address and explicit test confirmation → Zarinpal sandbox → `/fa/payment/result?id=…`. English equivalents are supported. Authentication return paths preserve the result ID. Guest baskets require an explicit merge after sign-in.

Amounts come only from the locked server basket and published catalog. Stale basket versions, changed totals, incomplete/unavailable options, unowned addresses and fractional rial totals are rejected. Toman-to-rial conversion is exact. Each basket version has one payment attempt; command IDs replay that attempt. An uncertain initiation is never automatically repeated. A known authority can be verified again by its owner. Cancelled/failed authorities can be revisited without creating a second attempt.

Callback query values never prove payment. The authority must match the stored attempt; verification uses the persisted amount and sandbox merchant. Only verification codes 100/101 with a valid reference mark paid. Payment/order/receipt/basket updates and the outbox event share one transaction; row locking makes callback replay idempotent. If the basket changes during payment it is preserved rather than cleared. Invalid Origin, missing/freshly rotated CSRF, blocked/revoked sessions and ownership are checked server-side.

Orders use a `SANDBOX-` reference, `sandbox=true` and fulfillment `on_hold`. No real money, inventory reservation, stock movement, shipment or production revenue is created. Shipping/tax are explicitly zero for this test, not approved business rates. Payments and immutable purchased line/recipient/price snapshots are persisted in PostgreSQL. Sandbox events are stored in the transactional outbox without credentials or session tokens.

If provider verification times out, show `unknown` and do not pay again; the owner can use **Check payment again**. Initiation timeouts without an authority require operator reconciliation with Zarinpal, not a blind new gateway request. Automatic provider reconciliation, real shipping/discounts, stock reservations and production payments remain subsequent work.

Protocol references: https://github.com/ZarinPal-Lab/Zarinpal-RestAPI-Sample-php and https://github.com/ZarinPal-Lab/MyBB-SpecialGroup/blob/master/zarinpal_verfywg.php (v4 request/verification payloads). Sandbox base: `https://sandbox.zarinpal.com`.
