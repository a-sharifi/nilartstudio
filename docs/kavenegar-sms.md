# Kavenegar SMS integration — 2026-11-01

## Provider templates

Created in the authenticated Kavenegar console for nilartstudio.ir. Approval checked in the browser.

| Purpose | Template | Provider ID | Approval |
|---|---|---|---|
| Login | nilartlogin | 1553419 | Approved |
| Registration | nilartregister | 1553421 | Approved |
| Password recovery | nilartrecovery | 1553422 | Approved |
| New phone verification | nilartphonechange | 1553423 | Approved |
| Successful purchase | nilartpurchase | 1553532 | Pending review |
| Shipment dispatched | nilartshipped | 1553533 | Pending review |

OTP templates use token; order templates use token (order ID) and token2 (paid toman amount / shipment tracking). Approval of the two transactional templates is an external dependency. They must not be placed in the approved allowlist before approval.

## Configuration and safety

The existing provider key is held only in the private server environment; it is not committed or exposed to the frontend. Set NILART_SMS_MODE=kavenegar and NILART_KAVENEGAR_API_KEY. NILART_KAVENEGAR_APPROVED_TEMPLATES is an explicit comma-separated approval allowlist. Each template can be overridden with its corresponding NILART_KAVENEGAR_TEMPLATE_* setting.

NILART_ORDER_SMS_ENABLED defaults false. Enable only after both order templates are approved and included in the allowlist. The isolated demo retains sandbox SMS and no real provider key. Zibal remains in sandbox mode. Sandbox orders never send real purchase or shipment claims.

OTP lifetime, resend limits, purpose binding, hashed codes and one-time verification remain in the existing identity workflow. Real codes have no development preview. Provider calls use HTTPS POST with tokens/recipient in the body; exceptions suppress credential-bearing URLs and provider payloads. Provider acceptance is not proof of handset delivery.

Migration 0056 creates an atomic, durable order SMS queue. Payment confirmation and shipment dispatch enqueue within the source transaction. Unique event keys prevent duplicate callbacks or dispatch commands from producing duplicate sends; partial shipments have distinct identities. Customer SMS opt-outs are checked at enqueue and immediately before sending. The worker commits its sending claim before contacting the provider. Timeout/interruption becomes unknown and is never automatically retried, because external acceptance may already have occurred. Unknown records require provider reconciliation before any manual remediation; no unsafe retry button is supplied.

## Verification

- 12 provider adapter tests: four OTP purposes, approval gate, POST body, rejection, recipient/message-ID validation, timeout and secret-safe errors.
- 5 database queue tests: sandbox exclusion, paid-only deduplication, distinct partial shipments, uncertain-result handling and preference revocation.
- 9 existing database OTP tests passed.
- 27 payment, Zibal and fulfillment regression tests passed.
- Frontend type checking passed with the notification preference availability contract.
- Four real, explicitly authorized OTP samples were accepted by Kavenegar for the administrator test number. No codes are retained in this report. Message IDs are retained privately for provider reconciliation.
- Purchase/shipment samples remain blocked by template approval, and have not been sent.

Provider contract: https://kavenegar.com/rest.html

## Deployment evidence

Public sandbox deployed successfully with migration 0056, healthy services and Kavenegar OTP mode. Transactional SMS remains disabled until approval. Provider authentication from the deployed server was checked separately. The isolated demo was rebuilt, migrated and verified ready with sandbox SMS and no real key. Browser verification confirmed the public OTP entry page; no additional unapproved test sends were made.
