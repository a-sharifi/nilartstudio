# PUB-23 — Privacy and your information

## Delivery

- Persian `/fa/privacy`, English `/en/privacy`; existing `/privacy` links resolve
  to the selected language. Shared header/footer and current-page indicator.
- Responsive React code, not separate Figma frames.
- Readable content column up to 840px, desktop sticky section navigation, native
  mobile “On this page” accordion and complete visible policy text.
- Review at 1440, 768, 390 and 320 CSS pixels.

## Publication boundary

No approved privacy policy or verified service/retention information was supplied.
`privacyDemoDocument` is explicitly Demo, unapproved and unpublished.
Its educational copy comes from the brief, with pending technical/policy review
clearly shown. It must not become a production policy by removing the Demo label.

No default version, dates, company/service names, processing countries, retention
periods, legal rights, training claims or security guarantees are invented.
No private customer images, prompts, orders, credentials, internal logs,
accounting or production files exist in the document data.

Non-Demo rendering requires approved/published flags, real valid version/dates,
non-empty sections, stable unique IDs and complete selected-language content.
Incomplete or unpublished content renders an unavailable state, not generated
legal text. Language actions use the document's available languages, not an
assumed reference language.

## Content and interaction

`privacy.ts` separates document/version/source state, 13 sections, localized
information-purpose pairs, potential access roles, actions and change summary.

The four quick-summary cards derive directly from the corresponding main sections.
All clauses are readable without opening accordions; only mobile navigation
collapses. Stable anchors:

`#privacy-scope`, `#privacy-account`, `#privacy-orders`, `#privacy-files`,
`#privacy-ai`, `#privacy-access`, `#privacy-communications`, `#privacy-technical`,
`#privacy-retention`, `#privacy-security`, `#privacy-requests`,
`#privacy-changes`, `#privacy-contact`.

Scroll updates the active section. Selection creates a shareable history entry,
closes mobile navigation and focuses its target without hiding it behind a header.
Invalid anchors show a calm notice and return to the title. Reduced motion
disables animated navigation. Language changes preserve the anchor.

Reference images, prompts, first versions, revisions, final files, public portfolio
images and production/print files are distinguished. Uploading is not portrayed as
consent to publication, advertising or training. AI is not a replacement for human
review; unspecified technical practices remain pending.

Access entries in Demo are explicitly hypothetical policy-review categories.
Non-Demo rows require active and approved flags, with localized purpose, required
information and conditions. The semantic desktop table becomes labelled cards
at 768px; column relationships remain in the accessibility structure.

Notifications and marketing remain distinct. No fake cookie-consent controls,
deletion button, notification toggle, PDF or inactive account-settings link.
Default settings actions are empty; approved active internal routes may be supplied.
Guest account actions preserve their destination through `/login?returnTo=…`.

Contact about information goes to `/fa/contact` or `/en/contact`; submitting a
public message is not identity verification or immediate execution of a request.
No settings, consent manager, privacy-request form or user dashboard is designed.

## Versions, states and print

Approved documents render source-provided version, publication and update dates.
Cached/previous sources are explicitly marked, never silently called latest.
Previous-version links and change summaries appear only when supplied by source.
The Demo cached fixture has no fabricated metadata.

Footer → Design system & states → Privacy policy state exposes full Demo, loading,
unpublished, load error, service error, unavailable translation and cached-content
previews. Error states do not insert guessed or remembered legal content.
Retry returns to the Demo fixture; it does not claim a real service response.

Browser print styling includes title, supplied real metadata and complete text,
removing site/sidebar/mobile navigation and interactive actions. Demo and stale
source labels remain visible in print. No download exists without a real PDF.

## Verification

`node tests/privacy.mjs`, existing public-page tests, `pnpm exec tsc --noEmit`,
`pnpm build`. Server-render and CSS structure tests do not replace browser
interaction, print-preview or visual accessibility review.
