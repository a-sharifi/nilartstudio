# PUB-18 — About NilArt

## Delivery

- Persian `/fa/about`, English `/en/about`; existing `/about` links resolve to
  the selected language. The shared footer identifies About as the current page.
- Shared header/footer, fonts, colors, buttons, CollectionCard and skeletons.
- Two-column editorial hero, short overview, three buying routes, five themed
  collection cards, design/product relationship, experience principles and final CTA.
- Responsive React code, not separate Figma frames. Review at 1440, 768, 390 and 320.
- Hero content precedes imagery on mobile; route cards stack; collection grid
  becomes two columns, then one at the narrowest width.

## Editorial and media boundaries

`about.ts` separates localized text, public media metadata, route cards, approved
featured collection IDs and optional story content from UI.

Default copy is the user-supplied design sample, clearly marked Demo and pending
brand approval. No founder, studio location, history, team, statistics, customer
quotes or trust claims were invented. Shop products are ready-stock; commissions
follow a separate production process. Collections are independent of categories.

No approved brand/product photography exists in the repository. The imagery skill
was consulted, but stock photos were not substituted for NilArt's actual studio
or products. Original abstract composition placeholders are labelled as such,
never presented as actual artwork/product photographs or confirmed SKU options.
Collection names/slugs/publication flags are reused from `data.ts`; qolche is not
given an invented Persian name. No counts, popularity or stock labels are shown.

Production:

- Replace Demo text with approved content and set the publication/language fields.
- Media must be public and approved, with meaningful alt text; private photos
  and print payloads have no place in the content schema.
- Non-Demo content without approved media uses a text-only layout.
- Collection media must exist and the ID must be explicitly approved.
- An unpublished or untranslated page does not expose Demo copy.
- Story appears only when published and translated into the selected language.
  Missing story is omitted, not fabricated. The Demo-only optional slot shows
  where approved story and real process imagery could go.
- Use approved source captions and contained images, not destructive artwork crops.

## States

Footer → Design system & states → About page state:

- Normal, with no fictional story/workshop.
- Partial loading: hero visual, overview copy, collection skeletons.
- Dynamic collection error: static introduction and other content remain readable.
- Image failure: calm fallback and accessible description.
- Optional story slot: expressly requires approved copy/photography.
- No featured collections: valid shop link.
- Unpublished translation: named available-language action, no guessed translation.

No success toast, autoplay, parallax, forms, cart controls or additional destination
pages are introduced. Native links support keyboard, focus and modified-click
navigation; existing reduced-motion styles apply.

## Routes and checks

`/collections`, `/collections/:slug`, `/shop`, `/artworks`,
`/commissions/new`, `/contact`. Existing routing handles destination previews;
no full destination page is rebuilt.

Checks: `node tests/about.mjs`, `node tests/faq.mjs`,
`node tests/tracking.mjs`, `node tests/returns.mjs`,
`pnpm exec tsc --noEmit`, `pnpm build`.
Server-render tests do not replace visual/browser interaction verification.
