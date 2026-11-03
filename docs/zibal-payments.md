# Zibal sandbox payments

Official contract: https://help.zibal.ir/ipg/ (request, start, callback, verify, inquiry). The owner's gateway panel currently says the merchant will be issued after activation. The panel gateway identifier is not used as a merchant credential.

## Current server configuration

```
NILART_PAYMENT_MODE=zibal_sandbox
NILART_ZIBAL_MERCHANT_ID=zibal
```

These values are configured in `/srv/nilart/.env.server`; compose forwards them to the API and workers. Production security, HTTPS, cookies, CSRF and SMS settings remain unchanged. The public payment config exposes enabled/provider/sandbox, never credentials. All created orders/payments remain explicitly sandbox records. The existing `/api/v1/payments/sandbox/...` and customer checkout/result URLs are preserved.

This mode deliberately rejects any merchant other than `zibal`. After Zibal activates the account, live activation requires an explicit reviewed transition including real-order flags and customer labels, then the issued merchant credential; replacing a value must not silently turn test orders into real charges. No real merchant or transaction is enabled in this release.

## Behavior

- Exact IRT → IRR conversion on the server; minimum 1,000 IRR and Zibal maximum 4,000,000,000 IRR. Checkout validates accepted settings, stock, discounts and totals before requesting payment.
- HTTPS POST to `https://gateway.zibal.ir/v1/request`, with merchant `zibal`, integer amount, callback and stable payment ID as `orderId`. Redirect only to the exact allowlisted `/start/{trackId}` path.
- Callback: `/api/v1/payments/sandbox/callback/{payment_id}`; no customer session/cookie required. Match the persisted track ID and verify with Zibal regardless of browser success flags.
- Successful verification must confirm the exact amount, submitted order ID, and verified status. Previously verified (`201`) or unpaid (`202`) responses trigger inquiry; pending/internal/ambiguous responses remain unknown. Provider-reported definitive failures are separate from unknown outcomes.
- Zibal's real test merchant returns a null bank reference on successful simulated payments. A `zibal-sandbox-{trackId}` receipt explicitly identifies a test receipt; no real bank reference is invented.
- Provider is frozen in each attempt's existing JSON intent. Historical attempts without that field remain Zarinpal sandbox and retain their callback/URL behavior even after configuration changes. No schema migration or historical rewrite is needed.
- Existing idempotent commands, reconciliation, stock reservations, coupon limits and late-payment financial resolution remain in place. Uncertain requests are not automatically resubmitted.
- Refund handling remains the application's existing simulated sandbox workflow, not a newly activated external refund API.

## Evidence

35 database/adapter/checkout tests passed (isolated disposable PostgreSQL), including duplicate callback handling, forged browser success, pending-to-paid recovery, amount/order mismatches, legacy provider retention and checkout terms. 18 frontend tests passed across gateway URL validation, checkout consent, discount pinning, uncertain-result recovery, unmount safety, stock checks, digital delivery, and payment APIs. TypeScript and focused lint passed. OpenAPI and client declarations regenerated.

A real request to Zibal's sandbox created track `4884773395` for 10,000 IRR. Chrome opened the provider test page and selected simulated success. Actual verify and repeated inquiry returned the same labeled test receipt. This was an adapter smoke test with a generated callback UUID, not a business order or a completed storefront purchase; no synthetic order entered the public business database. Database-backed tests separately exercise persisted order/callback behavior. Production activation remains excluded.

Final checks: both public and isolated demo `/api/v1/payments/config` return `provider=zibal_sandbox`, `enabled=true`, `sandbox=true`. Both readiness endpoints pass. The public server also successfully created sandbox track `4884784704`. Chrome confirmed the deployed checkout displays `ZIBAL · SANDBOX`; the empty basket correctly keeps payment disabled. A full real-provider storefront purchase was not performed.
