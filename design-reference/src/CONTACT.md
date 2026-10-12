# PUB-19 — Contact NilArt

## Delivery

Persian `/fa/contact`, English `/en/contact`; existing `/contact` links resolve to
the selected language. Shared header/footer and current-page state.

Compact introduction, four help shortcuts, main form (up to 760px), contact-channel
sidebar and privacy guidance. Mobile stacks fields, form and sidebar; no fixed
submit bar. No image, chatbot, uploads, newsletter consent or invented map.

This is responsive React code, not separate Figma frames. Review at 1440, 768,
390 and 320 CSS pixels.

## Data and channels

`contact.ts` separates configuration, seven sample topics, reply options, validation,
payload minimization and the local Demo service. No verified phone, email, social
account, hours, public address or response estimate was supplied. The Demo sidebar
shows a clearly labelled “Verified information required” placeholder.

Non-Demo rendering never shows that internal placeholder. Channels require active
and approved flags with a safe appropriate URL. Address requires explicit public
and approved flags; visit conditions remain separate from return instructions.
No browser geolocation or fabricated coordinates are used. The optional map is an
approved outbound link, not an embedded map needing a failure fallback.

Reply methods and country rules are Demo options, not a published promise. Real
support configuration must replace them. No field maximum is invented; optional
limits are taken from `maxLengths`. Only the selected reply channel is included
in the normalized payload; optional order references accompany order topics only.

## Form and privacy

Name, topic, reply method and message are required. Email/phone is conditionally
required. Order number is optional and grants no order-data access.

Changing topic/method/language preserves all written input. Draft edits never
update a profile. An `initialDraft` may be supplied only from permitted profile
fields; this app has no approved profile prefill source.

Order support: `/account/orders` when signed in; otherwise
`/login?returnTo=%2Faccount%2Forders`. Public messaging remains available without
registration. Commission guidance goes to `/commissions/new`, not an automatic
commission request. Private evidence belongs in authenticated order/commission
flows. Do not collect passwords, codes, banking data or print files here.

## Submission boundary

No production endpoint is installed. The page is labelled Demo; no message,
email or SMS is actually sent. Production configuration without a submission
adapter does not silently use the Demo service.

The local service distinguishes pre-send network error, server error, unknown
outcome, rate limit and confirmed Demo receipt. In-flight submissions use a
synchronous latch. Unknown outcomes freeze the draft and block resubmission;
“Check this message's result” recovers the same internal request key without
creating another submission. Internal keys are never displayed as references.

Only a confirmed Demo response clears the form. No public reference number is
fabricated. A receipt can render/copy a reference only if an adapter supplies it.
The success view explicitly says no real message or notification was sent.

Rate-limit waiting data must come from a service; no default period or response
promise is invented. The rate-limit preview remains blocked until the preview
mode is changed. No invented CAPTCHA or unsupported anti-spam challenge.

For production, add server-side validation, accessible anti-spam when needed,
idempotency, durable status recovery, actual waiting periods and verified receipt
handling. The local in-memory Demo deduplication is not a production guarantee
and does not persist across reloads.

## States and checks

Footer → Design system & states → Contact page state:
general/order/commission topics, phone reply, validation, sending, Demo receipt,
network/server errors, unknown outcome, rate limit, channel skeletons, empty
channels, disabled form, all options unavailable and unpublished translation.

Visible labels, textual required/optional markers, associated field errors, focus
to first invalid field, keyboard-compatible native controls, LTR contact values
and live processing/outcome announcements.

Checks: `node tests/contact.mjs`, existing public-page tests,
`pnpm exec tsc --noEmit`, `pnpm build`. Server-render checks do not replace browser
interaction/visual review.
