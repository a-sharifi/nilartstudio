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
