# PUB-22 — Purchase terms

## Delivery

- Persian `/fa/terms`, English `/en/terms`; legacy `/terms` links resolve to the
  selected language. Shared public header/footer, fonts, tokens and current-page link.
- Readable full text (up to 840px), desktop section index and mobile “On this page”
  native accordion. Four-point summary remains expressly subordinate to full text.
- No checkout acceptance checkbox, refund form, download/PDF fiction or new privacy page.
- Responsive React code, not separate Figma frames; review at 1440, 768, 390 and 320.

## Publication boundary

No approved legal agreement, real version or publication dates were provided.
Default content is the educational material from the brief, explicitly marked
“Demo / legal and business approval required”. It is not published legal terms.
No deadlines, jurisdiction, liability exclusions, non-refund rules or commercial
rights to customer images are invented.

`terms.ts` is the single versioned content source. Four summary statements are
derived from section data, not a separately maintained competing policy.
Each section has a stable ID, localized paragraphs/points, notice and related links.
Non-Demo documents require published/approved flags, supplied version and valid
publication/update dates. Unavailable or untranslated terms are not replaced with
sample copy. Existing order agreements remain distinct from current policy.

No previous-version catalog was supplied; no selector or fabricated old version
is shown. The document schema can label a genuinely provided previous/cached
document, retaining its own metadata and optionally a valid current-version route.
These labels do not generate or fetch historical legal content.

## Reading and search

- Fourteen sections, always open; only the mobile table of contents collapses.
- Stable anchors: `#terms-scope`, `#terms-account`, `#terms-products`,
  `#terms-pricing`, `#terms-cart-stock`, `#terms-payment`, `#terms-delivery`,
  `#terms-original-artworks`, `#terms-commissions`, `#terms-digital`,
  `#terms-returns`, `#terms-customer-content`, `#terms-versions`, `#terms-support`.
- Section index follows scroll without moving focus. Explicit section selection
  scrolls/focuses its target, respects reduced motion and updates shareable history.
- Old anchors return to the title with a calm notice.
- Search covers heading/body/points/notices in the selected language with a 280ms
  debounce or immediate Enter. Reuses FAQ Persian-letter/spacing normalization
  and safe text highlights. All full text stays visible; matching-section shortcuts
  and a real count help navigate it. No-result search is not a service error.
- Language changes preserve the input and anchor; no automatic translation.
- Desktop sidebar is sticky only when the viewport is tall enough for all topics.

## Print and actions

`window.print()` invokes real browser printing. Print CSS removes global navigation,
sidebar, search UI and help actions, but retains title, supplied metadata, summary,
the complete text and Demo disclaimers. No PDF or invented version/date is produced.

Links: buying guide, tracking, artworks, commissions, returns, privacy, contact and
FAQ. Private agreement links use `/account/orders` when signed in; otherwise
`/login?returnTo=%2Faccount%2Forders`. No private order identifiers enter URLs.
Destination screens are not reimplemented. Existing browser history preserves
the checkout return path; this page introduces no acceptance or order mutations.

## States and verification

Footer → Design system & states → Purchase terms state: educational sample,
loading skeletons, unpublished terms, load error/retry and unpublished translation.
Error states do not silently reuse guessed/cached terms; a supplied cached source
is explicitly labelled and keeps its actual metadata. No ordinary-load toast.

Checks: `node tests/terms.mjs`, existing public-page tests,
`pnpm exec tsc --noEmit`, `pnpm build`. Server-render checks are not browser
interaction/visual or legal review.
