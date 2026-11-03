# Sandbox payment inquiries

Implemented 2026-10-19 as a partial ORDER-02 / FIN-06 stage. This does not complete the integrated sandbox release.

## Staff workflow

`/{fa|en}/admin/payments` and `/admin/finance/payments` show recorded sandbox payments, status filters and paginated results. Order details embed the same shared workspace when the viewer has `payments.read`. The independent payment view works for finance staff without granting customer order access.

Staff with both `payments.read` and `finance.write` can select an unresolved payment, enter a reason and inquire its recorded authority through the existing sandbox gateway adapter. There is no manual mark-paid command. Requests without a recorded authority remain unresolved and explain why inquiry cannot run. Paid payments are terminal for inquiry. A confirmed payment still leaves existing fulfillment on hold; no shipment, inventory consumption, refund, revenue or settlement is fabricated.

Each inquiry retains its actor, reason, operation ID, before/result records and time in `payment_inquiries`. Read history is paginated. Lost responses freeze the exact operation: check the actor-owned receipt, or retry the same operation. Exact replay returns its original immutable result even when the payment subsequently changes. Reusing an operation for a different actor, payment or intent conflicts.

## Concurrency and uncertainty

Migration 0042 adds a payment revision and a database trigger that advances it for every update, including existing gateway callbacks and customer verification. Commands require the displayed revision. A per-operation advisory lock serializes retries, and the payment row lock serializes inquiries against callbacks. Fresh account/permission and CSRF/origin checks happen before the gateway request. Read endpoints and errors use private no-store responses.

The existing adapter uses an eight-second external timeout. Inquiry runs synchronously using that existing adapter; moving external inquiry to a recoverable background job remains pending. If the database transaction cannot commit after gateway verification, retry queries the same authority; an already-verified gateway receipt can be recovered without creating a second payment. Order, receipt, discount outcome, payment result, outbox event and staff inquiry receipt commit together.

Timeouts, transport failures and malformed gateway payloads remain `unknown`; they do not establish failure. Explicit valid gateway rejection remains distinct. Unknown payments retain their pending review state. Authority values and gateway credentials are not exposed in staff responses.

## Scope still pending

Authoritative checkout stock/component reservations, configurable expiry and late-success stock reacquisition, fulfillment, return/refund allocation, gateway settlement/fees, background operational retry queues and full cross-domain financial reporting are not delivered by this stage. Missing historical stock identities and costs must remain explicit. No real gateway or production activation is included.

## Evidence

- `Backend/tests/test_payment_inquiries.py`: real PostgreSQL inquiry, unknown-to-paid reconciliation, exact replay, immutable receipt, stale revision, independent permission denial, CSRF, missing authority and malformed response.
- `Frontend/tests/payments-api.test.tsx`: exact response/intent binding, cross-order/history protection and ambiguous-result recovery.
- `Frontend/tests/e2e/payment-inquiries-live.spec.ts`: isolated database-backed sandbox browser journey, dropped response recovery/replay, retained on-hold order, Persian/English 390/1440 layouts and finance route alias.

Verified deployment: main and isolated demo schema 0042, all API/web/worker/scheduler services healthy. Main staff inquiry table remains empty; synthetic inquiry records exist only in the demo database. Both language routes and finance alias return 200/private no-store; unauthenticated payment reads return 401/no-store. Restored-copy migration backup `backups/pre-payment-inquiries-20261019T130423Z.dump` preserved stock/purchase/production/SKU/price audit snapshots. Verification passed: 630 backend tests, 361 frontend tests, production build, targeted lint and the real demo browser journey. Mobile Persian screenshot was visually reviewed; no viewport overflow at 390/1440 in either language.
