# PUB-24 — Cancellation, returns and refunds

## Delivery

- Persian `/fa/returns`, English `/en/returns`.
- `/returns` and `/returns-policy` links resolve to the current language route.
- Shared public header, footer, typography, tokens, guide navigation and FAQ styles.
- Responsive React implementation, not separately created Figma frames.
- Review at 1440, 768, 390 and 320 CSS pixels.

## Content boundary

No approved legal policy was supplied. Default content is an explicitly labelled
Demo of the interface and the educational material supplied in the brief.
`returnsDemoPolicy` is **not published**, has no invented version/date and no
deadline, monetary value, eligibility guarantee or absolute prohibition.
Policy checklist copy is clearly marked “Sample content; approval required”.

`returns.ts` separates five product types, seven commission stages, educational
concepts, order-stage guidance, request steps, evidence checklist and related FAQ.
In non-Demo mode an unpublished policy renders only the unavailable state and
help actions, never internal sample placeholders. Published-language gating
prevents silent guessed translation. Non-Demo stage conditions and FAQ answers
must come from `stageConditions` and `relatedQuestions`, not the sample arrays.
Published metadata is shown only when provided by the content source.

Production must replace the Demo with approved content; legal copy, refund method,
return-cost responsibility, permitted partial bundle returns, time windows and
estimates are business-managed conditions, not UI defaults.

## Interaction

- Product buttons use visible selection indicators and `aria-pressed`.
  Selection filters reading content only; it changes no order or authorization.
- Six stage buttons are an educational guide, not a real order-status detector.
- Desktop sticky section list; mobile “On this page” native accordion.
- Stable anchors: `#returns-concepts`, `#returns-product`, `#returns-stage`,
  `#returns-request`, `#returns-documents`, `#returns-packing`,
  `#returns-refunds`, `#returns-questions`, `#returns-help`.
- Active topic follows scroll; section links respect reduced motion.
- Old anchors show a calm notice and return to the title.
- Five independent related FAQ accordions use semantic buttons, expanded state,
  controls and hidden answer panels. Sample answers are not approved FAQ policy.
- Print button uses the browser print UI. Print styling removes global navigation,
  sidebar, selectors and actions; all product/stage sections and FAQ answers are
  included. Demo marks stay visible. No fabricated print metadata.
- Language changes preserve the selected type and stage as well as the anchor.

## Actions and commercial distinctions

- Signed-in users → `/account/orders`; guests →
  `/login?returnTo=%2Faccount%2Forders`.
- Guest tracking → `/fa/track-order` or `/en/track-order`.
  Phone verification there does not grant return-request permissions.
- `/contact` remains a clear alternative for users without an account/access.
- Existing named destination previews handle account/contact pages; full account,
  authentication and return-request management are outside scope.
- Submission, approval, receipt, condition approval and completed refund differ.
- Bundle refunds refer to approved items and recorded historical discounts,
  not today's price or an unconditional full-price component refund.
- Current policy does not rewrite a previous order's recorded agreement.
- No uploads, banking fields, private files, order amounts or cost accounting.

## States and verification

Footer → Design system & states → Returns policy state: full Demo, loading,
unpublished policy, unpublished selected section, network/service error,
unpublished translation. Error states do not reuse remembered/guessed policies.
Retry preserves product/stage selections and returns to the Demo fixture.
There is no successful-return or successful-refund toast.

Checks: `node tests/returns.mjs`, `node tests/faq.mjs`,
`node tests/tracking.mjs`, `pnpm exec tsc --noEmit`, `pnpm build`.
Server-render checks do not substitute for browser visual/interaction verification.
