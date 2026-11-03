# Materials and service-rate foundation

Implemented local admin routes: `/fa/admin/materials`, `/en/admin/materials`, and equivalent `/admin/service-rates` routes. Editors use stable resource IDs, including `/new/{id}` before the first save. Access requires `pricing.publish`; internal rates are never exposed through public catalog APIs.

Migration `0029` adds `cost_resources` and immutable `cost_resource_versions`. No resources, prices, stock, currencies, conversions, suppliers or rate policies are seeded. Resource kinds are material/service. Materials can record purchase and consumption units, an explicit positive purchase-to-base factor, supplier label, dimensions and grammage. Services have an explicit per-unit basis. Supplier labels are informational; supplier accounts and balances remain separate future procurement work.

Rates are exact decimal strings with explicit IRT/IRR currency. Missing rates/conversions stay null. A deliberately zero rate requires an explicit acknowledgement. Start/end validity dates and active/archived state are versioned. Archival preserves history; there is no destructive deletion endpoint. These are replacement estimates, separate from actual purchase/stock costs and sale prices.

## API

All routes are under `/api/v1/admin/costing`:

- `GET /resources?kind=material|service&q=...&active=...&cursor=...`
- `GET /resources/{id}`
- `GET /resources/{id}/versions?before=...`
- `GET /resources/{id}/versions/{revision_id}`
- `PUT /resources/{id}/versions/{revision_id}` with `expected_version`, complete `content` and required `reason`
- `GET /resources/{id}/estimate?quantity=...&unit=base|purchase&on=YYYY-MM-DD`

Writes recheck live session, Origin, CSRF and permission inside the transaction. Stable client revision IDs provide exact-intent replay; stale versions or reused revision IDs with changed content conflict. Database locks serialize concurrent updates. Resource, immutable revision, audit and outbox insert commit together; failures roll back together. `costing.resource_saved` is a validated, deduplicated worker acknowledgement; no inventory/price update is implied.

The editor preserves rejected inputs, requires an explicit comparison acknowledgement after loading a newer version, and locks unknown saves until their stored revision is checked or the exact same intent is retried. A reload of a new-resource URL reads the same stable resource ID and cannot create an unrelated duplicate. Private state clears with the session.

## Exact consumption preview

The preview uses only the saved resource/version. Quantity, conversion and rate are multiplied as `Decimal` with enough precision for the bounded inputs; no float, currency conversion or implicit rounding is used. Unknown rates, missing purchase conversions, archived records, missing validity start dates and out-of-range dates produce an incomplete result with no monetary total. The server returns resource/version/date/input provenance and the client rejects stale or mismatched results. A zero total is possible only from an acknowledged zero rate with valid metadata.

## Still required

The next implementation adds versioned SKU recipes, manually approved yield/waste, recipe cost calculation and a dependency review queue; see `docs/sku-recipes.md`. Family templates/inherited SKU overrides, automatic cutting geometry, price proposals, procurement supplier records, inventory valuation, actual production costs and finance remain unfinished. Existing sale-price editing remains separate; this module never publishes a price or moves stock.

Production verification: API/web/worker images rebuilt successfully; additive migration 0029 applied to the local database. All eight services healthy. All 13 costing browser checks passed again through localhost:8080 using intercepted fixtures (no business records created). Unauthenticated list/detail/estimate requests return 401 with no-store. New local routes: /fa/admin/materials and /fa/admin/service-rates.
