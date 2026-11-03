# Managed bundle authoring — integrated preview0052

Admin bundle/package URLs now share a live draft/publication workspace. This increment is part of the unfinished integrated admin release; it is deployed only to the isolated demo preview.

## Authoring and publication

The editor supports bilingual titles/descriptions, slug, required component quantities and permitted SKU choices, collection IDs, ordered approved image revisions with bilingual alt text, fixed/percentage discount, explicit packaging/service estimates and coupon stacking. Repeated default SKU rows must share permitted choices and are aggregated into one logical component quantity at publication. Selecting the same SKU through different permitted component choices shares its ledger stock.

Drafts leave the previous published catalogue and presentation unchanged. Publication requires nonempty components/collections/gallery, explicit packaging/service estimates (including explicit zero), published priced IRT SKUs, valid same-product alternatives and published collections. All gallery versions must be approved public images; private print files cannot be bound. Unpublishing retains every command and previous definition. Legacy records remain unchanged until an explicit command; missing gallery/costs stay incomplete. Invalid legacy metadata remains readable as an identified legacy record requiring reviewed replacement, rather than fabricated defaults.

Publishing a price-affecting definition requires both `catalog.manage` and fresh independent `pricing.publish`; draft editing/unpublication requires catalogue management. No command creates stock, recognizes cost/revenue or moves cash. Packaging/service fields are configured pricing estimates, not actual fulfillment cost or payments. Full BOM/group/bundle price review and official profit integration remain pending. Additional collection IDs are retained; complete multi-collection public discovery is still part of the remaining catalogue integration.

## API and safeguards

`/api/v1/admin/catalog/bundles` provides bounded search/status/keyset listing. `/{id}` reads a managed/legacy definition; `/{id}/history?before=` reads20 immutable versions. GET/PUT `/{id}/commands/{operation_id}` supports exact receipt recovery and actor-bound idempotent commands. Commands bind expected version, action, content and reason. Dependency locks coordinate catalogue publication and media approval; catalogue updates, immutable result, audit and outbox commit atomically. Receipt replay does not repeat publication. Rejections preserve editor inputs and require reload/review; unknown results retain and retry the exact operation. Private state and selected lookup caches clear on session changes.

Bounded typed `choices/skus`, `choices/collections` and `choices/media` expose named picks; media choices contain only approved public title/alt metadata. Editor history displays saved definitions and supports explicit comparison with the latest saved draft without silently overwriting local inputs.

Public `/{slug}/gallery` exposes only ordered image URLs/alt text from the published revision, never private estimates/notes. `/api/v1/media/{asset}/versions/{revision}/content` serves immutable formerly approved image bytes only while the asset remains publicly approved; draft and print files remain inaccessible. Asset unpublication revokes old public URLs.

The existing basket and public price preview support both fixed and percentage discounts. Percentage savings use half-up rounding to six IRT decimal places, consistently on server and client; old fixed-discount documents remain compatible. Single allowed SKUs without an option matrix select automatically; multiple unmapped alternatives use an explicit selector.

Public `/{slug}/availability?choices=` validates the selected composition and aggregates SKU demand before dividing ledger available quantity (on hand minus reserved). Missing stock setup returns configured=false/capacity=null, distinct from zero stock. Capacity is an exact integer string. The storefront blocks unconfigured, unavailable and excessive quantities, supports bounded retry on lookup failure, and still relies on atomic checkout reservation for the final purchase.

## Migration and evidence

Migration0052 adds only bundle document/revision tables and publication links; no historical business data or stock is backfilled. It was verified on a restored main database, with every pre-existing public table hash unchanged. Private backup: `backups/pre-integrated-catalogue-20261020T132853Z.dump`.

Final full suites:699 backend tests and418 frontend tests; typecheck, lint and production build pass. Seven new database cases cover publication/draft isolation, duplicate aggregation, approved/private media, unknown configuration, rollback, permissions, percentage quote, original image bytes/revocation, ledger capacity/reservations and invalid legacy metadata. Client/editor tests cover scoped receipts, unknown outcomes, reopening saved new URLs and independent publication permissions.

Real isolated browser evidence passed: new collection/media/stock→bundle draft→explicit publication→lost response→receipt recovery→exact replay→reload→Persian/English390/1440 layouts→approved storefront image/percentage quote/capacity→customer denial. A second read-only journey verifies package listing, version display, retained-draft comparison, BOM/material edit aliases and standalone cutting calculation. The mobile inherited role-form layout was corrected and reviewed.

Main remains on stable0051. Full product/SKU media/weight/specification authoring, artwork originals/prints/digital editions, settings-backed checkout, remaining finance/artist workflows and all56-view acceptance are unfinished. Do not present this increment as the completed integrated release.
