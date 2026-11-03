# Browser audit continuation — 2026-10-22

Scope: isolated preview `http://127.0.0.1:18080` only. Main remains unchanged. This supplements, rather than replaces, the 2026-10-21 per-view audit and its unresolved acceptance items.

## Confirmed defect and fix

Reloading `/en/shop?collection=bundle-collection-5c0a3ef5` discarded the collection and navigated to `/en/shop`. The shop canonicalized the query against an empty catalogue while its real records were loading. Collection/category choices were therefore treated as invalid before they could be validated.

`ShopPage` now waits for a successfully loaded catalogue before canonicalizing. Error/retry states preserve the requested query. Normal page bounds and invalid-filter normalization still run after successful loading.

## Recorded checks

| Action | Result | Evidence / limit |
| --- | --- | --- |
| English collection + category selection, hard reload | passed | Both selections and URL retained: `category=qa-015640-categories&collection=qa-015640-collections` |
| Switch to Persian, hard reload | passed | Both selections and translated filter chips retained |
| Remove collection chip in Persian | passed | Category remains selected and stays in URL |
| Loading → error → successful catalogue, bookmarked collection + page | passed | Regression test confirms no premature replacement; valid collection retained and out-of-range page corrected after loading |
| Production build and TypeScript checks | passed | `/tmp/nilart-browser-filter-build.log`, `/tmp/nilart-filter-typecheck.log` |
| Focused shop tests | passed | `Frontend/tests/live-shop.test.tsx`: 3 tests |

Browser checks used the actual application through the in-app browser, without mocked responses. Screenshots are local ignored artifacts: `Frontend/test-results/browser-audit-2026-10-22/collection-category-reload.png` and `fa-filter-reload.png`. The rebuilt web image was deployed only to the isolated preview; its readiness check returned 200.

## Acceptance limits

These synthetic collection/category selections currently produce zero products. Their empty state and persistence were verified; this does **not** establish AC-01 populated collection/category correctness or AC-02 shared inventory across memberships. Those scenarios, repeated-component concurrent reservation, mixed coupon allocation, partial bundle refunds, unavailable finance/artist workflows and other unverified actions remain open as documented in the prior audit. Full release acceptance remains false.

## Populated collection follow-up

Browser setup used the existing isolated sandbox administrator because the prior dedicated accounts' temporary credential file was unavailable; no passwords or roles were changed. The synthetic product `3ca549dd-0208-4a87-8110-9e92c8778c71` (`qa-015640-products`) was edited through the admin form to join `QA-015640 collections`, `Integrated collection 37d98164`, and `QA-015640 categories`. Reload confirmed version 3, all three memberships, and the reasoned audit entry.

| Action | Result | Evidence / limit |
| --- | --- | --- |
| Admin membership edit and reload | passed | Persisted version 3 and audit reason `QA-20261022 browser verification: one product shared by two collections and one category` |
| Shop collection plus category, with a real matching product | passed | Exactly one result in each collection; both links target `/en/products/qa-015640-products` |
| Collection landing-page category filter and reload | passed | Collection stays in path, category stays in query, one matching product remains |
| Shared product identity | passed | Product page exposes both collections and the same published `QA-015640-SKU` |
| Live card missing-price state | failed → fixed → passed | Removed false `Out of stock` and demo-price claims; now `Price unavailable`. Explicitly labeled reference/demo cards retain their original behavior |
| Live card locale | passed after fix | English links use `/en/products/…`; Persian links use `/fa/products/…`, verified by clicking through |
| Persian filter and card translation | passed | Category remains selected; one result; `قیمت دریافت نشده` shown |
| Focused regression suite, lint, production build | passed | 8 tests across live-collection, live-shop and catalog-routing; `/tmp/nilart-collection-{build,lint}.log` |

Also removed nonfunctional live-card demo favorite controls and sample-copy/catalog disclaimers, retaining explicit missing-image placeholders. Screenshots: `populated-collection-category.png`, `collection-live-card-fixed.png` in the same ignored evidence directory. Preview web rebuilt and readiness returned 200; main unchanged.

This adds populated filtering and shared-identity evidence toward AC-01/02 and ADM-02/04. It does not establish a stock-changing shared-inventory journey: this SKU has no published price, so purchase remains disabled. No price, inventory or financial value was invented. These acceptance criteria and full release acceptance remain open. The earlier empty-state limitation describes the preceding test, not the updated populated fixture.

## Product selection and basket follow-up

The existing sandbox administrator remained signed in. Browser actions used actual backend records, without mocked responses or setup API writes. No checkout or payment was submitted.

| Action | Result | Evidence / limit |
| --- | --- | --- |
| Select `QA-015640-SKU`, which lacks a published price | passed | Price unavailable; quantity and Add to basket remain disabled |
| Select priced `RSV-e7134e0e` | passed | 100 IRT/unit, explicit SKU selection required |
| Increase quantity 1 → 3 and add | passed | Same selected SKU; one saved basket line, quantity 3, total 300 IRT |
| Reload basket | passed | Quantity 3 and 300 IRT persisted |
| Edit options from basket; change 3 → 2 and save | passed | Same line ID `1b0ba8c2be5df0edc71ad33e9d262165`, quantity 2, total 200 IRT; no duplicate |
| Type quantity 0 and leave field | passed | Validation requests a whole number 1–99; recorded total remains 200 IRT |
| Enter Persian digit `۳` | passed | Normalized to quantity 3 and total 300 IRT |
| Remove and Undo | passed | Empty state followed by restoration of the same line, SKU, quantity 3 and 300 IRT |
| Switch basket to Persian | passed | Quantity, names, prices and labels remain consistent |
| Live row demo disclosure | failed → fixed → passed | Hide `Demo details and price` for live rows; image accessible name now `Image: …`. Reference/demo rows retain explicit labels |
| Authored option mapping exposed publicly | failed / remaining integration | Admin shows `QA Size / Small`, current mapping v1, published `QA-015640-SKU`; public detail only exposes raw SKU code, without the authored family/value |
| Reference notebook compatibility fixture | blocked | `/en/products/cats-sketchbook-127gsm` does not exist in this isolated dataset; no sample records imported into existing business data |

Added `Frontend/tests/live-cart-row.test.tsx` for live/reference disclosures, exact recorded totals, quantity command and edit-line identity. This and `published-product-detail.test.tsx`: 7 tests pass. Production build and lint pass (`/tmp/nilart-basket-audit-{build,lint}.log`), preview web rebuilt, readiness 200; main untouched. Screenshot: `Frontend/test-results/browser-audit-2026-10-22/basket-quantity-three.png`.

The retained preview admin basket contains this single synthetic line at quantity 3 for review. Later basket journeys must account for it. No stock was reserved or consumed. AC-04 has generic quantity/persistence evidence, but the exact notebook sheet-count scenario remains unverified. AC-03 remains blocked by the authored-option/public-selection integration and unavailable notebook fixture. Full release acceptance remains false.

## Authored options integration correction

Corrected the public-selection integration failure above. Product loading now reads the existing `/api/v1/catalog/skus/{code}/options` published snapshot endpoint (at most eight concurrent requests), validates SKU/product/code and selected-value identities, and feeds bilingual families and explicit combinations into the existing selector. Missing legacy mappings retain legacy choices. Incompatible historical definitions or mixed mapped/unmapped SKUs use individual labeled SKU selectors rather than merging conflicting meanings. Non-404 failures or malformed mapping data fail the product load and offer retry; they do not silently bypass the mapping.

No server contract, migration, stock or price change was needed. Public choice selection still resolves to the published SKU ID. Basket editing can restore the selection from that SKU's pinned mapping. Generic authored families no longer imply that a product is a notebook or has a configured size guide.

| Action | Result | Evidence / limit |
| --- | --- | --- |
| Load existing published mapping v1 | passed | Public `QA Size` / `Small` replaces raw-code-only selector |
| Save draft v2 with new `QA Large` value, without a corresponding combination | passed | Admin marks mapping stale; public reload still shows only pinned v1 Small, proving draft isolation |
| Unpublish synthetic SKU, review mapping v2, republish with reasons | passed | Admin current v2 and published; no price/inventory edits |
| Public reload after reviewed publication | passed | Small selectable; QA Large disabled with “This combination isn't offered.” |
| Persian translation and selection | passed | `اندازه آزمایش`, `کوچک`, disabled `بزرگ آزمایش`; selected specifications use authored labels |
| Missing price after choosing valid Small | passed | Quantity and Add to basket stay disabled; no guessed business value |
| Malformed/foreign mapping, incompatible historical meanings, unpublished combination, mapping-service failure | passed (automated) | `published-option-mappings.test.tsx` covers rejection, safe fallback and fail-closed loading |

Eleven focused tests pass across published-option-mappings, published-product-detail and live-cart-row. Production build (including types) and lint pass. Final web image deployed only to preview, readiness 200. Screenshot: `Frontend/test-results/browser-audit-2026-10-22/authored-options-fa.png`. Synthetic option configuration is now version 2 with Small mapped and QA Large intentionally unsupported; SKU remains published. Main remains unchanged.

The prior public-option display failure is superseded by these checks. AC-03 remains partial: exact priced A4/A5/sheet-count/stock transitions are not demonstrated by this unpriced single-SKU fixture. Server-side historical basket/order option-label snapshots are a separate remaining dependency; this frontend correction does not claim to implement them or complete full commerce acceptance.

Final legacy browser smoke check: unmapped `RSV-e7134e0e` still renders its explicit SKU selector, resolves to 100 IRT after selection, and enables quantity/Add to basket. No additional basket line or payment submitted.

## Authoritative basket labels and immutable order history

Completed the server-side label dependency identified above. Basket quotes now read the published SKU's pinned mapping, validate it as an explicit option document, and derive bilingual labels and UUID selections. Legacy presentation-based quotes remain supported. Malformed mappings make the line unavailable rather than accepting an invalid selection. Existing checkout review already fingerprints the authoritative quotes, and existing order creation freezes their bilingual option text; no historical records were rewritten and no API contract or migration changed.

### Automated evidence

Added `Backend/tests/test_published_option_snapshots.py`:

- Basket labels/selections come from the pinned mapping; later editable draft changes do not alter them.
- Invalid pinned combination codes preserve the saved quote as unavailable, preventing purchase.
- A published-label change after checkout review rejects payment initiation with `checkout_review_required` and creates no order.
- Completed order snapshots remain unchanged through the customer API after later mapping-label changes.

Focused basket/checkout suite: 24 passed. Bundle/snapshot follow-up: 12 passed. Older basket and bundle fixtures were updated to include the already-existing option migrations required by the shared quote path. The final entire backend suite passed **721 tests, zero skipped**, against disposable PostgreSQL/Redis resources: `/tmp/nilart-option-snapshot-final-tests.log`. Ruff and whitespace checks pass. Disposable resources were removed after verification; preview business/test records remain intact.

### Real browser journey

Used the existing preview administrator's customer workspace; all setup and acceptance actions were browser forms against the real backend. Set the clearly synthetic `QA-015640-SKU` price explicitly to **0 IRT**, published a complete physical delivery profile (approved synthetic image, 100 grams, eligible under the configured return policy), and retained the existing ledger stock. These are intentional fixture values, not inferred business defaults. Removed the prior synthetic 3-unit basket line to isolate the zero-charge journey.

| Action | Result |
| --- | --- |
| Select Small; add one unit | passed; basket shows `QA Size: Small`, 0 IRT |
| Edit basket selections | passed; Small and quantity 1 restored; save updates the same basket line |
| Add synthetic address; select configured zero-charge shipping; accept reviewed terms | passed |
| Complete zero-charge checkout | passed; no external charge, total/shipping/tax all zero, stock committed |
| Open customer order | passed; physical delivery, selected SKU UUID, original bilingual labels recorded |
| Edit draft labels, unpublish SKU, review mapping v3 and republish with reasons | passed; latest public page shows `Small revised QA-20261022` |
| Refresh existing English order | passed; still `QA Size: Small` |
| Switch existing order to Persian | passed; still `اندازه آزمایش: کوچک`, not the revised label |

Retained order: `3f7f9917-7180-43f6-a5e0-d3d936cfe3c1`; reference `SANDBOX-D9A9D4A5`; payment `d9a9d4a5-71f4-4bc3-bd43-14e5207f5a18`. Its one SKU unit remains committed and unshipped for review. Basket is now empty. Mapping v3 is published; price remains explicit 0 IRT and SKU profile v1 is published. Screenshots: `order-option-snapshot-en.png` (original option text after catalogue revision) and `order-option-snapshot-fa.png` under the same ignored evidence folder.

API, worker and scheduler updated only in the isolated preview, using `nilart-demo-api:integrated-catalogue` built from the tested source. Main unchanged; both readiness endpoints returned 200. This supersedes the missing standalone basket/order label integration above. Exact multi-SKU notebook size/sheet-count transitions, full financial/artist workflows and other release acceptance gaps remain open. This test does not claim shipment or delivery of the retained order, full bundle-component historical-label coverage, or completion of all 56 views.
