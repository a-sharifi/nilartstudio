# PUB-21 — Buying guide

Public route: `/guides/buying`. Entry: shared footer → Help → Buying guide.
Reuses the site's public header, footer, fonts, tokens, buttons and original sample mockups.

## Preview

- Use the shared language switch for Persian RTL / English LTR.
- Responsive desktop sidebar becomes a native topics accordion on mobile.
- Review at 1440, 768, 390 and 320 CSS pixels.
- Footer → Design system & states → Buying guide state exposes complete, loading,
  error (with retry), unpublished and unavailable-translation previews.
- These states are independent prototype fixtures, not a live CMS integration.
- No ordinary-load success toast.

## Stable anchors

`#collections`, `#notebooks`, `#bundles`, `#ordering`, `#artworks`, `#delivery`.
Topic selection creates a shareable URL and history entry. Reduced motion disables
animated anchor navigation. Scroll position updates the active topic.

## Content and commercial boundaries

- Collections are independent of product categories.
- Paper weight, physical sheet count and purchase quantity are independent.
- Three A5 notebooks with 50 sheets each is a teaching example, not a SKU.
- Nominal sizes preserve ISO proportions; confirmed product specifications take precedence.
- Illustrations are original sample diagrams/mockups, not actual product photography.
- No invented delivery prices, return deadlines, execution times or revision counts.
- No real purchase controls, OTP, address forms, payment, accounting or production-cost data.

## Destinations

`/collections`, `/shop`, `/bundles`, `/artworks`, `/commissions/new`,
`/track-order`, `/returns-policy`, `/faq`, `/contact`.
Unimplemented destinations use the existing site's named destination preview.
The specialized notebook guide is intended for `/guides/notebooks`; its link
currently goes to `/faq` with explicit coming-soon copy, avoiding a broken route.
Destination pages are outside this delivery.

This deliverable is responsive React code, not four separate Figma design frames.
