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
