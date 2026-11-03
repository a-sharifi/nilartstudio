# Nilart help pages

The Help footer links now resolve to live bilingual buying guide, FAQ, order tracking and cancellation/return guidance. Presentation preserves the reference typography, warm palette, contents navigation and compact mobile controls.

- `/fa/guides/buying` and `/en/guides/buying`: choosing collections, notebook sizes, paper, bundle options, checkout and after-sales support.
- `/fa/faq` and `/en/faq`: published questions, native keyboard-accessible disclosure controls, normalized Persian/English text search and a no-results contact route.
- `/fa/track-order` and `/en/track-order`: authenticated owned-order search, recorded payment/delivery status, pagination and links to existing order/shipment detail. Guests sign in using the purchase account and return to tracking. No simulated guest OTP or fake shipment result is used on live routes. Access requires the independent `orders.read_self` permission; old owner rows are hidden on account change and revoked access. The existing API enforces ownership.
- `/fa/returns` and `/en/returns`: published cancellation, withdrawal, damage, return inspection and refund guidance. Calls to action lead to existing order-bound request forms and request status history. Guidance does not create a return or promise a refund by itself.

The three information documents are added to `content/site-pages.json` and published through `infra/scripts/publish-site-pages.py`, which now accepts only the seven known content slugs. Existing unchanged publications are skipped and historical revisions remain intact. Tracking uses the existing owned orders API rather than introducing a second tracking authorization mechanism.

Verification: 28 focused frontend and existing order/request/shipment tests passed, including guest access, independent permissions, owned search, revoked access, FAQ search, existing order filters and shipment display. Type checking and focused lint passed. Legal withdrawal wording follows the same reference as the published purchase terms, documented in `docs/information-pages.md`; checkout configuration and historical policy snapshots are unchanged.

## Published browser verification

All three content publications match source in both the public site and isolated demo; readiness passed in both environments. In Chrome, searched the demo's recorded owned order SANDBOX-D9A9D4A5 and opened its existing order detail and shipment section. The Returns request-history link opened the account's real request panel. Public guest tracking linked to sign-in with the tracking return URL preserved. Reviewed Persian tracking and English buying guide at mobile width. On the public FAQ, searching for نشانک filtered both answers and contents links to two matches, and the bookmark answer opened successfully. Evidence is retained in `docs/verification/help-faq-public.png`, `help-tracking-mobile.png` and `help-owned-order-detail.png`. No real customer order was changed during this verification.
