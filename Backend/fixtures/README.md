# Local design-reference catalog

`design-catalog.json` copies the five collection names/descriptions, four product
names and four category names from the pinned `design-reference/src/data.ts`.
Product membership follows the reference collection index. Categories follow the
explicit product type: sketchbook, notebook, sticker and bookmark. The reference
contains no product images. Its sample prices/options/availability are deliberately
omitted: these are descriptions for local UI testing, not commercial records.
Every inserted record includes a bilingual test-data notice in its description.

This opt-in importer creates published descriptions so the local public catalog
can display them. It does not run on startup or in migrations. Existing matching
slugs cause the whole import to fail without changing records. Invalid memberships
roll back the transaction. No accounts, permissions, SKUs, prices or stock are added.

To populate the local Docker development database once, copy the fixture and script
into the API service, then run the script with `--local-test-data --fixture` pointing
to the copied JSON. The script reads `NILART_DATABASE_URL` from that service's
existing environment and accepts only a local PostgreSQL host; credentials never
appear in command arguments or output. For example, from the repository root:

```sh
docker compose --env-file .env -f infra/docker/compose.yaml cp Backend/fixtures/design-catalog.json api:/tmp/nilart-design-catalog.json
docker compose --env-file .env -f infra/docker/compose.yaml cp Backend/src/nilart/bootstrap/design_catalog.py api:/tmp/nilart-design-catalog.py
docker compose --env-file .env -f infra/docker/compose.yaml exec -T api python /tmp/nilart-design-catalog.py --local-test-data --fixture /tmp/nilart-design-catalog.json
```

The user explicitly requested this local test import on 2026-10-12. It was applied
to the previously empty local catalog: five collections, four categories and four
products. There is no remote data import or deployment.

### Local Cats bundle

After importing the local design catalog, explicitly import the reference Cats
bundle (one sketchbook, two Cats stickers, one Cats bookmark):

```sh
docker compose --env-file .env -f infra/docker/compose.yaml cp Backend/src/nilart/bootstrap/design_bundle.py api:/tmp/nilart-design-bundle.py
docker compose --env-file .env -f infra/docker/compose.yaml exec -T api python /tmp/nilart-design-bundle.py --local-test-data
```

Creates two reference products, three explicitly named `TEST-DESIGN-CATS-*` SKUs,
and one published test bundle. All prices/currencies remain null; no stock or
purchase eligibility is created. Names and quantities come from
`design-reference/src/catalog.ts`; prototype prices and option specifications
are not imported. The existing sketchbook must carry the original test notice.
Existing product slugs, SKU codes or bundle slugs cause a transactional failure;
this command never overwrites them. All descriptions carry the bilingual test
notice. The frontend uses the original SVG mockups and `BundleStillLife` for
explicitly associated reference slugs; unrelated records keep missing media.

### Database-backed reference product details

After the design catalog and Cats bundle fixtures, import the four product detail
profiles explicitly:

```sh
docker compose --env-file .env -f infra/docker/compose.yaml cp Backend/fixtures/design-product-details.json api:/tmp/nilart-design-product-details.json
docker compose --env-file .env -f infra/docker/compose.yaml cp Backend/src/nilart/bootstrap/design_product_details.py api:/tmp/nilart-design-product-details.py
docker compose --env-file .env -f infra/docker/compose.yaml exec -T api python /tmp/nilart-design-product-details.py --local-test-data --fixture /tmp/nilart-design-product-details.json
```

Requires migration 0016 and existing products carrying the bilingual local test
notice. Creates four published test presentation documents and three unpriced
SKUs for Ghosts notebook, Cows stickers and Love bookmark. It never overwrites
profiles/SKU codes, and validates every document before inserting anything.

The notebook gallery views and notebook copy come from the pinned product detail
reference. Bookmark/sticker details adapt that layout to their reference product
names, kinds, palettes and collection memberships; they do not claim notebook
sizes, sheet counts, paper weights or materials. All illustrations are the original
SVG mockups. Readable option labels are explicitly associated with fixture SKU
codes in the database. No prototype prices or stock are imported.

### Remaining reference bundle sets

After the Cats bundle fixture, import its two reference companion sets:

```sh
docker compose --env-file .env -f infra/docker/compose.yaml cp Backend/src/nilart/bootstrap/design_bundle_sets.py api:/tmp/nilart-design-bundle-sets.py
docker compose --env-file .env -f infra/docker/compose.yaml exec -T api python /tmp/nilart-design-bundle-sets.py --local-test-data
```

Creates Cats everyday and keepsake bundles from `design-reference/src/catalog.ts`,
with a ruled or hardcover notebook, two Cats stickers and one Cats bookmark.
The sticker/bookmark SKU IDs are shared across bundles. Adds two products and two
explicitly unpriced test SKUs. Existing identities cause an atomic failure before
any inserts; no prototype stock, prices or discounts are copied. Local totals
become eight products, eight unpriced SKUs and three bundles after all fixtures.

### Reference artwork descriptions

Explicitly import nine bilingual artwork test descriptions from
`design-reference/src/ArtworksPage.tsx` into the local database:

```sh
docker compose --env-file .env -f infra/docker/compose.yaml cp Backend/fixtures/design-artworks.json api:/tmp/nilart-design-artworks.json
docker compose --env-file .env -f infra/docker/compose.yaml exec -T api python -m nilart.bootstrap.design_artworks --local-test-data --fixture /tmp/nilart-design-artworks.json
```

Run after rebuilding the API image. Existing slugs cause rejection before inserts;
all inserts share one transaction. Titles match the pinned reference. Bilingual
descriptions identify test data explicitly. No prototype prices, available/sold
states, artist, dimensions, frames, assets or authenticity claims are imported.
Local total: nine published test descriptions; production startup remains unseeded.

### Reference notebook option families

After product detail and bundle-set fixtures, explicitly upgrade the four local
notebook test presentations and add twelve unpriced test variant SKUs:

```sh
docker compose --env-file .env -f infra/docker/compose.yaml cp Backend/fixtures/design-notebook-options.json api:/tmp/nilart-design-notebook-options.json
docker compose --env-file .env -f infra/docker/compose.yaml exec -T api python -m nilart.bootstrap.design_notebook_options --local-test-data --fixture /tmp/nilart-design-notebook-options.json
```

The Cats sketchbook gets the seven explicit size/sheet/cover combinations from
`design-reference/src/catalog.ts`, its 127 GSM sample fact and guide captions.
Other notebook profiles get only their explicit reference sizes, with no inferred
sheet counts/covers. Existing generic bundle SKUs are preserved. All additions
are test specifications, never approved real stock or offers. Stored baseline
presentations must exactly match the original fixture; modified profiles or
existing variant codes reject the whole import. No automatic overwrite/reseed.
Local totals become twenty unpriced SKUs and six product presentations.

`design-test-prices.json` contains ten explicitly mapped notebook variant prices from design-reference/src/catalog.ts. No ghost notebook price, inventory, or real specifications are inferred. Import using the guarded design_test_prices module only against the local test catalog.

### Reference bundle detail options and sample prices

After migration 0020 and the notebook option/price imports, run the opt-in development importer:

```sh
docker compose --env-file .env -f infra/docker/compose.yaml cp Backend/fixtures/design-bundle-presentations.json api:/tmp/nilart-design-bundle-presentations.json
docker compose --env-file .env -f infra/docker/compose.yaml exec -T api python -m nilart.bootstrap.design_bundle_presentations --local-test-data --fixture /tmp/nilart-design-bundle-presentations.json
```

This explicitly maps the reference Cats bundle's five permitted notebook variants, everyday/keepsake notebook choices, collection copy, fixed discounts (30000/25000/30000 toman), and shared sticker/bookmark sample prices (35000/30000 toman). It requires existing test-marked products/bundles, rejects other environments/remote database hosts and different existing prices or presentations, and commits atomically. An identical rerun is safe. No stock, reservation, cart, payment or order is created. The public presentation endpoint omits unpublished or foreign-product choices; the original public bundle list/detail contracts remain unchanged.

### Remaining homepage sample prices

The guarded `design_test_prices` importer also accepts TEST-DESIGN codes for explicitly test-marked products. Ghosts notebook variants use the reference homepage 145000 toman, Cows stickers 45000 toman. Love bookmark uses the reference bookmark sample price 30000 toman for local testing (its homepage reference has a zero/unavailable placeholder). These are sample prices, not approved production offers; no stock is created. Repeating an identical import is safe, while different existing prices still reject the transaction.

### Artwork sample details

After migration 0022, copy `design-artwork-details.json` into the local API service and run `python -m nilart.bootstrap.design_artwork_details --local-test-data --fixture /tmp/nilart-artwork-details.json`. This adds optional details to the original nine test-marked artwork records. Identical reruns are safe; conflicting data rejects the whole transaction. Production mode and remote databases are rejected. Prices, dimensions and one-unit availability are local samples, not sellable ledger stock. Images are downloaded CC0 museum placeholders, with credits in `Frontend/public/sample-artworks/CREDITS.md` and in database details.
