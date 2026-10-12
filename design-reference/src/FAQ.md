# PUB-20 — FAQ handoff

- Public route: `/faq`; shared header and footer, no sign-in required.
- React responsive delivery, not separate Figma frames. Review Persian RTL and
  English LTR at 1440, 768, 390 and 320 CSS pixels.
- Copy is exactly the supplied design content, marked as sample content.
  Production must use admin-approved published data. No live backend or chatbot.
- Data: `faq.ts`; each question has a stable ID, topic, fa/en copy, publication
  flag and optional related link. Counts come from the 16 actual sample records.
- Search covers question and answer in the selected language and topic, with
  280ms debounce or immediate Enter. Persian/Arabic letter variants, spacing and
  diacritics are normalized. Highlights render safe text, never HTML.
- Query, topic and expanded answers are independent. Topic changes retain query.
  Search and topic changes close answers; deep links explicitly open their target.
- Multiple answers can stay open. Semantic buttons expose expanded state and
  controls; hidden panels are removed from screen-reader navigation.
- Example deep link: `/faq#sheets-and-pages`. Missing IDs retain the full FAQ
  with an unavailable-question notice. No success toasts or unexpected focus moves.
- Footer → Design system & states → FAQ state exposes loading, error/retry,
  unpublished, empty topic, missing translation and removed-question fixtures.
  Retry preserves topic and query. Empty search is an actual search result, not
  an error fixture.
- Links to `/guides/buying`, `/track-order`, `/returns-policy`, `/contact`,
  `/collections` and `/account/downloads` retain their named destinations.
- `/guides/notebooks` is not published; notebook guidance currently links to
  `/guides/buying#notebooks` rather than a broken destination.
- The existing destination preview handles not-yet-implemented pages; destination
  pages are not designed here. Guest downloads links navigate to
  `/login?returnTo=%2Faccount%2Fdownloads`, preserving the target. The actual
  authentication screen and return-to execution belong to future account work.
- No customer order data, numerical policy promises or commercial rules beyond
  the supplied text are introduced.
- Verification: `node tests/faq.mjs` and `pnpm build`.
