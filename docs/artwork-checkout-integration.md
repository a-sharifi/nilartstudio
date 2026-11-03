# Artwork authoring and settings-backed checkout

Integrated sandbox stage, 2026-10-21. Only the isolated preview runs schema 0054; main remains 0051. This stage does not complete the remaining finance, costing, artist/commission or final integrated-release backlog.

## Artwork workflows

`/{fa|en}/admin/artworks` now provides bounded search/pagination, new records, editing and immutable definition history. New/editor routes use `/new/{uuid}` and `/{uuid}/edit`. The shared gallery component selects approved immutable public-image versions, ordering and bilingual alternative text. Artwork identities, bilingual copy/artist, medium/style, dimensions, credit, edition, delivery metadata, license and pricing inputs are authored through typed fields.

- Unique originals require an explicit IRT price, physical weight and return eligibility. Publication creates no stock or cost. The existing stock ledger limits on-hand original quantity to one; reserved stock reduces availability.
- Prints reference an explicitly selected published, priced SKU with an approved physical delivery profile. Price and capacity follow that SKU. A print and a standalone purchase of the same SKU consume one aggregated stock source, including repeated bundle demand. Independent artwork images remain supported.
- Licensed digital editions require bilingual license terms, an explicit price and non-returnable status, with no shipping weight. They are one-per-artwork-basket-line/order; publication does not promise immediate file availability. Staff release final customer files through the existing protected-download workflow after payment. No second private-file store or public print-file URL was introduced.

Publication requires fresh catalog.manage and pricing.publish. Draft/unpublish require catalog.manage; stock setup and file release retain independent inventory/fulfillment permissions. Edition and linked stock source become immutable after first publication, including after unpublishing. Legacy samples remain readable with their approved historical image-source constraints; legacy originals cannot silently become another stock source.

`/api/v1/admin/catalog/artworks` exposes listing, `/{id}`, `/{id}/history?before=`, and exact actor-owned `/commands/{operation_id}` reads/writes. Commands check expected versions, retain exact intents/results, serialize with media/catalogue publication, and atomically persist catalogue changes, immutable revision, before/after audit and outbox. Unknown saves retain the operation ID; receipt checks/replay cannot apply a different intent. Staff navigation protects retained edits. Media withdrawal revokes bytes and removes managed availability when no approved image remains.

Public artwork lists/detail and basket quotes retain legacy compatibility while reading approved galleries and live source availability for managed editions. Public print prices follow their SKU until accepted checkout freezes the sale. Gallery order, alt text and licensed terms render on artwork detail.

## Checkout review and policy settings

Business settings now require explicit tax basis, tax rounding, shipping weight basis, shipping rounding and the supported refund policy. Old settings documents load these as unconfigured; no automatic zero values or inferred policies are saved.

Supported settings are:

- Tax on discounted items, or discounted items plus shipping.
- Shipping based on actual kilograms or each started kilogram; active methods enforce province scopes and maximum grams.
- Independent shipping/tax rounding: nearest hundredth toman (half up) or whole toman rounded upward. Amounts remain exact decimal strings; unsupported fractional-rial gateway amounts are rejected rather than silently rounded.
- Refund policy: original paid items with cumulative proportional tax; shipping is eligible only for an unshipped cancellation. Tax allocated to non-refundable shipping is retained after dispatch.

`POST /api/v1/payments/checkout-review` accepts basket version, optional owned address, selected shipping method and optional current coupon/version. It returns applicable methods, physical weight, item/discount/shipping/tax/total amounts, delivery/return metadata, policy/settings versions, readiness/issues and a server fingerprint. Missing business or delivery configuration blocks affected checkout. Digital-only orders require neither an address nor a shipping method; mixed orders weigh and ship only physical components.

The fingerprint binds authoritative basket identities, prices/options/components, approved delivery-profile revision IDs, licensed terms, owned address contents, shipping eligibility/rates, discounts, policies and financial totals. Payment requires the accepted fingerprint and existing stock-review fingerprint. Changed inputs require renewed acceptance before any order/hold is created. Previously persisted exact payment commands remain replayable without changing their accepted terms.

The order snapshot freezes `checkout_terms`, delivery type, return eligibility, allocations and shipping/tax amounts. Shipment dispatch uses the accepted return policy; only legacy orders without checkout terms retain their previous dispatch-time fallback. Customer order detail displays recorded policies/licenses. Customer return submission uses frozen eligibility and recorded delivery deadlines.

## Stock, digital delivery and refunds

Frozen components now explicitly distinguish physical stock from digital entitlement allocations. Digital values remain allocated for bounded cancellation/refund accounting, but create no physical positions, reservations, receipts, cost movements or shipments. Physical demand is aggregated across standalone products, print artworks and bundles. Public bundle availability ignores approved digital component stock; an all-digital bundle reports an explicit unlimited-physical-stock flag with no invented numeric capacity.

Mixed bundles keep a physical order line while retaining delivery/return flags on each component. Physical dispatch and inspection exclude digital components; protected final-file tools recognize their digital entitlements. Releasing a new digital file records digital fulfillment; exact release replay adds neither another file nor another order-state transition. Mixed orders reach delivered only when required physical parcels and digital releases are complete. Cancellation is blocked after digital fulfillment as well as physical delivery.

Refunds retain their explicitly local sandbox simulation label. New-policy quotes bound tax cumulatively to refunded item value and eligible original shipping, prevent shipping refunds after dispatch, and retain tax associated with non-refundable shipping. Legacy financial records keep their historical behavior. Existing external refund/settlement-adapter work remains separate and unfinished.

## Verification and rollout

- `test_artwork_authoring_postgres.py`: drafts/publication, exact receipts, unique-original ledger availability, digital/print source distinction, immutable edition, approved media, independent permissions, rollback and catalogue-event consumption/deduplication.
- `test_checkout_terms_postgres.py`: configured shipping/tax, address/profile/settings changes, digital-only no-address/no-stock delivery, protected release/replay, mixed orders/bundles, print/standalone shared stock, frozen dispatch terms, proportional tax and retained shipping tax.
- Existing reservation/coupon concurrency, callbacks, unknown/late payment, shipment/QC, cancellation, return valuation and refund suites remain exercised. Legacy-only fixtures are explicitly labeled instead of bypassing new configuration requirements.
- Frontend API/editor tests cover exact uncertain-result recovery and independent publication permission; checkout tests cover reviewed physical and address-free digital delivery.
- `artwork-checkout-live.spec.ts` runs real isolated database journeys through original authoring/stock/checkout/QC/dispatch/delivery, digital checkout/protected release, and print authoring/mixed checkout. The payment-completion journeys use deliberately free synthetic editions and explicit zero shipping/tax, exercising recorded zero-payment completion without external provider calls. Nonzero shipping/tax/payment behavior is covered by database tests with sandbox provider responses.
- The restored main-data copy migrated 0051 → 0054 with all prior public-table values preserved and zero invented profiles/artwork definitions. Private backup: `backups/pre-catalog-profiles-20261021T082729Z.dump`.

Catalogue revision and file events are now explicitly validated and consumed by the existing deduplicating worker. The bounded `Backend/scripts/retry_catalogue_events.py --demo-only` requeues only original unconsumed catalogue events, validating payloads in rolled-back savepoints and preserving event IDs. Thirteen older preview events were recovered; the subsequent unconsumed catalogue count was zero.

Use compose.yaml + demo.override.yaml + integrated-preview.override.yaml and the `nilart-demo` project. Do not reset demo resources or roll these partial integrated stages onto main. Production activation, real transactions and the remaining integrated-release acceptance remain excluded/pending.


Final source verification: **718 backend tests** (including real PostgreSQL concurrency and disposable Redis), **430 frontend tests**, typecheck, frontend/backend lint and production build passed. Three live database-backed browser journeys passed on the deployed preview. Persian mobile and English desktop artwork/checkout/order screenshots were reviewed. Main/preview readiness and schema checks are retained in the integrated progress record; main rollout remains excluded until the complete release is accepted.
