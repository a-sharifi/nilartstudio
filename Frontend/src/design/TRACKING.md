# PUB-17 — Guest order tracking

## Routes and preview

- Persian: `/fa/track-order`; English: `/en/track-order`.
- Existing `/track-order` links resolve to the selected language route.
- Shared public header, footer, fonts and design tokens. No compulsory account.
- Language changes preserve form inputs, country, code, stage and demo result.
- Responsive React delivery; no separate Figma frames generated.
- Desktop: centered 540px form; result with primary status/parcels and secondary
  summary/support. Mobile: one column, vertical timelines, wrapped codes/actions.
- Review at 1440, 768, 390 and 320 CSS pixels.

## Prototype

Enter an order identifier and a sample phone matching the selected demo country,
then request a code. No SMS is sent. Use the clearly displayed Demo code `123456`
to display a local sample result. There is no real customer lookup.

Footer → Design system & states → Order tracking state exposes initial, OTP,
single parcel, mixed order, payment under review, preparing/no tracking,
delivered, cancelled, refund review, fulfillment issue, no new update, skeleton,
network/service/SMS errors, invalid/expired code, attempt limit, verification
expiry, access expiry and stale result.

Previewing result fixtures is an explicit Demo-only shortcut, not authorization.
`trackingDemoConfig` contains illustrative OTP length, cooldown, attempt limit,
challenge expiry and result expiry values. These are not NilArt policies.
Phone countries/rules are demo mobile rules, not an approved country catalog.
Order validation currently checks only that an identifier is present; no invented
order-number format is enforced.

## Components and data

- `tracking.ts`: configuration, public-only fixtures, validation/normalization,
  country options, safe carrier URL validation and preview modes.
- `TrackingPage.tsx`: scoped local challenge, details/OTP/result flow.
- `TrackingResult.tsx`: status badge, copyable code, timeline, parcel/item cards,
  payment summary, support and cancellation/refund sections.
- No private uploads, names, full addresses, account notes, amounts or accounting
  information exist in the result fixtures.
- Mixed result has a delivered notebook parcel, preparing bundle parcel, and an
  independent commission timeline. Overall status is partially delivered.
- Sheet count and purchase quantity are separate.
- Payment, shipment, cancellation, return receipt and refund are distinct.
- Future events have no timestamp/checkmark. All fixture dates are marked Demo/UTC.
- No invented estimates or guaranteed timelines.

## Security boundary for production

This is not a working authentication or order service. Production must replace the
local demo with server-enforced lookup, rate limits, generic pre-verification
responses, code verification, order-scoped short-lived access and a public-field
allowlist. Client state is never an authorization boundary.

- Before verification, only user-provided masked phone is shown; no order details.
- Details are preserved after errors; edit clears code, challenge and result.
- In-flight work is invalidated on edits, preview changes and unmount.
- Access expiry removes result data and rendered result nodes; no overlay.
- A new order starts a fresh flow; verifying one order grants no other lookup.
- No input, phone, OTP or result data is placed in URLs/history/localStorage.
- Account links use `/login?returnTo=%2Faccount%2Forders` without private IDs.
- Contact and returns routes are existing named destination previews. Full
  account/authentication screens and return forms remain out of scope.
- External carrier links are enabled only for service-provided HTTPS URLs whose
  exact origin belongs to a verified allowlist. No approved carrier configuration
  was supplied, so fixture external tracking buttons are explicitly disabled.

## Accessibility and verification

Visible labels, associated errors, one integrated LTR numeric OTP input with
paste/autofill, keyboard navigation, stage-heading focus, live request feedback,
textual status distinctions and reduced-motion spinner.

Checks: `node tests/tracking.mjs`, `node tests/faq.mjs`,
`pnpm exec tsc --noEmit`, `pnpm build`.
Server-render tests do not replace browser interaction/visual accessibility tests.
