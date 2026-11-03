# Versioned SKU recipes and rate review

Implemented admin routes in both languages: `/fa/admin/recipes`, `/fa/admin/recipes/new/{id}`, `/fa/admin/recipes/{id}`, `/fa/admin/costing` (recipe library and calculator entry point), and `/fa/admin/price-review`. These extend the original AdminDashboard shell, Yekan Bakh typography, panels and shared dropdowns. All read/write contracts require `pricing.publish`. Public product/catalog outputs do not expose recipes or internal costs.

Migration 0030 adds `cost_recipes` (one per actual catalog SKU) and immutable `cost_recipe_versions`. No business records or rates are seeded. Each recipe has bilingual titles, active/archive state, validity and up to 100 separately labeled components. Each component references an immutable resource revision; its specification/rate snapshot is stored server-side with the recipe revision. Front/back covers, printing and packaging can be distinct components. Service quantities explicitly specify printed sides, notebooks, batches or other configured base units; there is no implicit duplex multiplier.

Component quantities are per good output or once per batch, in base or explicit purchase units. Unknown quantities stay null. Material waste is an explicit fraction from zero to less than one; blank stays unknown. Optional sheet cutting yield must be a positive integer and include workshop approval documenting grain/margins. There is no automatic assumption that rotation is permitted. This implements manually approved cutting yield; a geometric layout calculator is still outstanding.

## Save and review behavior

Stable recipe IDs exist before the first save. Client revision IDs bind the actor, expected version, complete content and reason. Replays return the original receipt; conflicting versions or changed intent cannot overwrite it. Writes recheck the live session, permission, Origin and CSRF. Resource and recipe updates share a transaction lock; competing writes produce one winner. Recipe, revision, audit and outbox are atomic. The worker validates/deduplicates `costing.recipe_saved`; it does not move inventory or publish prices.

The UI retains rejected inputs, compares latest versions after conflicts, requires acknowledgement before resaving, and supports checking an unknown save or retrying its exact intent. Session changes clear private state and discard late responses. History includes actor, Tehran time, reason, component quantities, yield/waste and frozen source rates. Archival remains possible for an obsolete recipe referencing old rates.

“Review latest rate” compares pinned/new rate, currency, units/conversion, sheet dimensions and validity before updating a draft line. Changed units/conversions clear the quantity. Changed cutting dimensions also clear quantity and workshop approval, requiring renewed approval before saving an existing yield. Active recipe saves reject stale or archived resource revisions.

## Calculation

The calculator accepts an explicit date, positive good-output count, decimal places (0–6) and rounding method (nearest/half-up or up). It uses only a saved recipe revision:

`component batch cost = quantity × purchase-to-base factor × base rate / cutting yield / (1 − material waste) × good output (only for per-output lines)`

Nonapplicable factors are one. Quantities and rates are converted directly from decimal strings into exact rational numbers. Components are summed exactly; the batch total and cost per good output are each rounded once with the explicitly selected rule. Exact total numerator/denominator is also returned. Displayed rounded line amounts need not sum to the independently rounded exact total.

Unknown quantities/rates/waste/conversions, expired or unknown validity, archived resources/recipes, a newer recipe/resource version, or mixed currencies make the total incomplete/null. There is no currency conversion, false zero total or automatic sale-price proposal. Current resource reads are batched, including when resources occur on multiple lines.

The rate-review queue is derived from current active recipe dependencies before pagination. Changed, archived, unknown or expired rates appear immediately for an explicit review date, without relying on worker timing. It links to the affected recipe. Adopting reviewed rates and saving a new recipe resolves changed-version alerts; unknown/expired rate problems remain until corrected. This is the dependency-review portion of the pricing queue; margin/fees proposals and their approval/publication are not implemented here.

## API

Paths below have prefix `/api/v1/admin/costing`:

- `GET /recipe-skus?q=&cursor=&limit=`: real SKU choices and existing recipe IDs.
- `GET /recipes?q=&active=&cursor=&limit=` and `GET /recipes/{id}`.
- `GET /recipes/{id}/versions?before=&limit=` and `GET /recipes/{id}/versions/{revision}`.
- `PUT /recipes/{id}/versions/{revision}`: `expected_version`, complete `content`, required `reason`.
- `GET /recipes/{id}/estimate?revision=&on=&good_output=&places=&rounding=`.
- `GET /recipe-reviews?on=&q=&cursor=&limit=`.

Clients validate recipe/revision identity, intent and estimate provenance. Exact filters apply on the server before keyset pagination; searches treat wildcard characters literally.

## Remaining scope

Product-family templates/parameters and inherited SKU overrides, automatic cutting geometry, overhead allocation policies, margin/commission/fee price proposals and approved publication remain unfinished. Inventory, supplier/procurement ledgers, fixed-version production orders, actual manufacturing costs, finance, fulfillment/refunds and the other pending admin areas remain separate work. A complete estimate means the recorded components are calculable; it does not certify that the business entered every required component.


Local deployment verification (2026-10-18): additive migration 0030 applied; API, web and worker updated; all eight services healthy. Frontend production build passed. Container package download failed due to DNS; the API/worker source update used an existing local runtime after verifying every installed package against requirements.lock (zero mismatches). Standard Dockerfiles and dependency requirements were preserved. Protected recipe/SKU/review endpoints return unauthenticated 401 with no-store; Persian recipes/costing/review routes return 200. No business records were seeded or written by browser checks.

Browser verification through localhost:8080: all 16 new recipe/review workflows and 13 material/service workflows passed. One material test initially reached a transient 502 during proxy/container replacement; after the proxy refresh it passed on a focused retry. New checks use intercepted fixtures; database tests use isolated schemas.
