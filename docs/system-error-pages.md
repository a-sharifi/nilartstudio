# System error pages

Implemented from SYS-01–03 in `docs/ui-ux-design-spec.md`, using the existing reference palette, small arch artwork, Yekan Bakh, bilingual copy, responsive layouts, and keyboard-visible controls. The exported design-reference source did not contain dedicated system error page components.

- Unmatched public URLs and `/404` use Next's `notFound()` with a real 404 status, instead of returning the home page or a backend-placeholder screen. Known catalogue route shapes continue to use their existing resource-loading behavior. Private route namespaces retain their existing authorization and dispatch.
- `/403`, `/500`, `/error`, `/offline`, and their `/fa` and `/en` variants provide public views for review; these preview routes are ordinary pages, not manufactured HTTP failure responses.
- Actual panel permission denials and authorization-check outages use the shared error presentation, without rendering protected children. Sign-in retains the requested destination.
- `error.tsx` and `global-error.tsx` handle unexpected rendering failures using this installed Next version's `retry` prop. They show only bounded request digests, never raw exception messages. A failed page switches to offline copy when the browser reports no network. No mutation or payment is automatically retried.
- 404 recovery links go to the localized home/shop/contact pages. Its search submits to the real shop, and search query parsing, filtering, and canonicalization now retain `q`.
- No draft is copied into browser storage by these pages. Recovery cannot promise that unsaved component state survived an unexpected rendering crash.

Verification: 20 focused tests passed, including unknown route rejection, existing route preservation, explicit retry, privacy-safe reference handling, localized destinations, sign-in return paths, and shop search. TypeScript and focused lint checks passed. Production build/deployment and live browser checks are recorded in the delivery response.

Live verification (2026-11-01): production deployment finished with all services healthy; unknown public URL returned HTTP 404, as did the removed temporary verification-file URL. Chrome reviewed Persian/English 404, Persian access-denied/offline, and English 500 with explicit retry. A real 404 search for «گربه» reached the shop and returned its three matching products while retaining the query. Screenshots saved under `/tmp/nilart-error-evidence/`. These checks do not claim a simulated full backend outage or crash injection in the public environment.
