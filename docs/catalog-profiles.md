# Catalogue media, specifications and delivery profiles

Implemented 2026-10-21 in the isolated integrated preview (schema 0053). Main remains schema 0051. This is a dependency stage, not full catalogue or checkout acceptance.

## Staff workflows

- Product/collection content editors link to `/{fa|en}/admin/{products|collections}/{id}/profile`.
- The product options workspace links each inspected SKU to `/{fa|en}/admin/skus/{id}/profile`.
- Profiles retain ordered bilingual specifications and approved immutable gallery versions with bilingual alternative text. `ApprovedGalleryEditor` is reusable and requests only approved public-image choices, with search and bounded pagination.
- SKU profiles additionally require explicit physical/digital delivery, shipping weight for physical items, and return eligibility. Digital items cannot carry shipping weight. No legacy weight, delivery, return policy or gallery is inferred.
- Staff save drafts, explicitly publish/unpublish, review history, reload while retaining local input, and explicitly discard local input. Navigation warns on unsaved edits. Unknown writes retain the original operation and offer receipt inquiry or exact replay. Private session changes clear forms, results and media choices.
- Publishing a profile is independent of publishing the catalogue identity, SKU combination, stock or price. It does not make unpublished items purchasable. These fields do not authorize refunds or bypass a return policy.

## Contracts and persistence

`/api/v1/admin/catalog/profiles/{products|skus|collections}/{id}` returns a nullable unconfigured content document/version zero for existing entries without a profile. History is descending, bounded to 20 revisions with a before-version cursor. Commands/receipts use `/commands/{operation_id}`. All admin reads require catalog.manage; commands recheck current authorization and CSRF, serialize against media/catalogue changes, check expected versions and actor-owned exact intents, and atomically persist profile, revision, before/after audit and outbox event. Transaction failures roll back all effects.

The additive 0053 migration creates profile heads and immutable command revisions. There is no historical backfill. Existing catalogue, order, inventory and financial snapshots are preserved.

`GET /api/v1/catalog/profiles/{kind}/{id}` exposes only the explicitly published revision for a publicly visible entity. Public SKU profiles also require a published parent product. Media withdrawal removes public gallery bindings; immutable media URLs independently enforce withdrawal and never serve private print files.

Public product detail renders approved product specifications/images and selected-SKU overrides. Unpublished changes stay private; existing presentation remains the fallback for records without approved profiles. A failed profile request has an explicit retry state.

## Evidence

- `Backend/tests/test_catalog_profiles_postgres.py`: publication/draft isolation, exact receipt replay/conflicts/history, required configuration, digital/physical validation, parent visibility, media revocation/draft rejection, permission revocation and atomic rollback.
- `Frontend/tests/catalog-profile-api.test.tsx` and `catalog-profile-panel.test.tsx`: exact receipt scope/intent/version/content, uncertain saves, authoritative conflicts, retained input and required renewed review.
- `Frontend/tests/e2e/catalog-profiles-live.spec.ts`: real demo database/media upload, product and SKU authoring/publication/storefront rendering, lost-response recovery, private drafts, cross-account denial, fa/en 390/1440 layouts, navigation and keyboard controls.
- Restored main-data copy migrated 0051 → 0053 with every prior public-table field preserved and zero invented profiles. Private backup: `backups/pre-catalog-profiles-20261021T073131Z.dump`.

Final stage checks:703 distinct backend tests (686 in the full database run plus17 disposable Redis cases),422-test full frontend suite plus the new navigation regression, lint/typecheck/build and backend lint passed. Two live browser journeys passed separately. Persian390px and English1440px screenshots were visually reviewed. Main/preview services are healthy; readiness passes.

## Later integration checkpoint

Schema0054 now consumes and freezes published delivery/weight/return metadata through settings-backed checkout, physical/digital/mixed fulfillment and policy-bound refund calculations. See `artwork-checkout-integration.md`; the original0053 evidence below remains historical.

## Remaining integration

Settings-backed checkout is now connected in0054. Full commission/private-print dependencies, external sandbox financial adapters and all-view acceptance remain pending.

Collection gallery rendering outside product detail, product-list/card gallery bindings, SKU recipe relationships and full publication validation remain in the integrated backlog. Shared media selection does not replace existing protected private-print/final-download systems. All 56-view and AC-01–22 final acceptance flags remain false.
