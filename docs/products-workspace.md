# Product management workspace

The real `/fa/admin/products` and `/en/admin/products` list now uses a dedicated workspace. Existing product creation, content/publication, gallery/profile and option-authoring URLs remain intact.

## Daily workflow

- Scan published product thumbnails, collections, variant/publication counts, exact price ranges and missing-price warnings together.
- Search product titles, slugs or SKU codes; filter by collection, publication or missing configuration; sort and paginate on the server (24 products per page).
- Open variants in a modal side drawer without navigating away from the filtered list. Search variant codes, inspect price history, edit one price, or continue to the existing content/photos/options editors.
- Compact row icons have accessible names and hover labels. Mobile product rows become cards; variant tables retain horizontal scrolling.
- Changing filters or navigating away from dirty input asks whether to discard it. Unknown mutation results retain input and prevent repeat submission until authoritative state is reloaded.

## Contracts and safeguards

`GET /api/v1/admin/catalog/product-workspace` requires fresh `catalog.manage`. Its bounded queries batch page memberships, prices and published media. Summary counts share the search/collection scope; status and missing-configuration filters apply to the result list. Prices remain decimal strings grouped by explicit currency; no conversions or stock/cost values are inferred. Existing SKU creation and versioned price commands are reused; writes to prices still require `pricing.publish` independently.

Private state clears on session changes. Authorization checks temporarily hide and disable mounted editors, preserving their state during a successful focus recheck; denied checks remove private content. OpenAPI and client declarations are regenerated.

## Automated evidence (2026-11-01)

- `Backend/tests/test_product_workspace.py`: 3 PostgreSQL-backed tests passed, including exact large decimal ranges, currency separation, scoped collection/SKU search, configuration filters, pagination and permission revocation.
- `Frontend/tests/products-workspace.test.tsx`: 7 tests passed for list context, filters, editor links, unsaved input, independent price permission, uncertain-result protection and exact formatting.
- `Frontend/tests/panel-access-boundary.test.tsx`: 2 tests passed for hidden/inert revalidation, preserved input and revocation.
- `Frontend/tests/access-store.test.tsx`: 7 existing authorization tests passed.
- Targeted lint, TypeScript and production builds checked. No database migration or business-data rewrite is required.

Browser and deployment evidence is recorded below after integrated verification.

### Browser checks

The real isolated sandbox passed Persian SKU search, collection filtering (Cats: 3 products), variant drawer, unsaved-price keep/discard, restored focus authorization, profile-editor navigation, English empty results and page 2 pagination. A clearly labeled synthetic product (`qa-015640-products`, SKU `QA-015640-SKU`) was changed from 150000 to 150001 IRT through the drawer, reloaded to verify persistence, and restored to 150000 through the same UI. Actual business prices were not changed. Responsive cards were inspected at 390 × 844.

### Rollout

Deployed to the main Caddy sandbox with a verified pre-deployment database backup and unchanged schema/data. API, web, worker, scheduler, database, cache, queue and Caddy reported healthy. The final frontend density adjustment was rebuilt and applied to web only. Main-browser checks confirmed all 14 existing products, all five collection choices, the empty draft filter, Cats' 3 products, the A5 subset of its 12 variants and approved thumbnails. No main-environment records were mutated.

Screenshots: `verification/products-workspace-desktop.png`, `verification/products-workspace-drawer.png`, `verification/products-workspace-mobile.png`.
