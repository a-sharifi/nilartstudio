# Homepage promotions and motion — 2026-11-03

Implemented the owner's homepage requests on local and production:

- Main hero CTA: «سفارش دفتر اختصاصی», linked to the existing localized notebook request route.
- Homepage special-offer cards use a bounded public endpoint. Only published, available variants/artworks with an effective scheduled reduction are returned. Cards show the approved image, variant, original/current price and Persian expiry date; SKU links preselect the exact published variant.
- Up to ten announcement banners managed at `/fa/admin/promotions`: independent copy, colour, approved image, local destination, discount code and Jalali schedule. The existing primary announcement remains compatible with older clients; extras can be reordered and removed.
- Announcements can be browsed, swiped, paused and dismissed. Dismissal persists for the current campaign in the tab session; changed campaign content can appear again. Rotation pauses on hover, keyboard focus, a hidden tab and reduced-motion preference. Code copying stays tied to the current slide.
- Homepage sections and cards reveal on entry, cards lift on hover, and hero covers arrive with a small stagger. Motion is scoped to the homepage, has an observer-free visible fallback and respects reduced-motion settings.
- Admin edits retain concurrency/version checks, exact-operation replay after an uncertain response, unsaved-change protection and audit reasons.

The welcome coupon was preserved. A second sage announcement links to the custom notebook flow. Existing prices, inventory, coupon rules and sale schedules were preserved. Production has the three previously activated seven-day offers; local catalogue data has no active sales and is not populated with production SKU IDs.

Validation: 20 frontend tests, four PostgreSQL marketing tests, TypeScript checks, Ruff and production build passed. Tests cover carousel playback/dismissal/reduced motion, admin add/reorder/preserved content and uncertain-save replay, offer filtering and exact-variant preselection. Local and production public routes, private-access rejection and production offer image/product URLs are checked separately after deployment. Browser access is disabled in Work settings, so no visual browser review was possible in this turn.

Release: `/srv/nilart/releases/home-complete-20261103`. API and web rollback images are tagged `before-home-complete` under their respective `nilart-live-*` repositories. No migration was required; banner additions use the existing versioned marketing JSON. The previous single-banner response is retained for rolling deployment.

Post-deploy result: API/web are healthy; local and production serve the same frontend build (`-XNP_d-ou30Kyzdgm1Kkb`) and script paths. Both expose two active banners. Production returns three offers, all with successful product-page and WebP-thumbnail responses. Private promotion settings reject anonymous requests with 401. Verification details: `docs/verification/homepage-2026-11-03.json`.

## Follow-up: homepage introduction

The homepage now leads with «نقاشی و دفتر، به سلیقهٔ شما» and explains both custom-art commissions and notebooks with a choice of size, paper and cover design. Both CTAs use their localized routes; the Persian artwork CTA explicitly says «سفارش نقاشی اختصاصی». This copy-only update required no new tests. Production build passed, and the published JS asset matches local byte-for-byte. Homepage and Persian/English artwork/notebook entry routes return 200. Both existing announcements remain active. Browser access remains disabled, so this verification used served assets and HTTP responses.

Current frontend build: `0DPnYAPsWbOdKBMN3RcVg`. Release: `/srv/nilart/releases/home-hero-20261103`; web rollback tags: `nilart-live-web:before-home-hero` and `nilart-web:before-home-hero`. Production source `Frontend/src/design/App.tsx` is synchronized.
