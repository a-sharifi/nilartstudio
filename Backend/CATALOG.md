# Public catalog foundation

Catalog follows domain entities → application query ports → SQL repositories → HTTP outputs.
Existing collection list fields and pagination are preserved. Migration `0003` extends
collections with optional bilingual descriptions and adds categories, products, and SKUs.
It does not seed data or infer prices or inventory. Migration `0004` is reserved for outbox work.

All paths below are relative to `/api/v1/catalog`:

- `GET /collections` and `GET /collections/{slug}`
- `GET /categories` and `GET /categories/{slug}`
- `GET /products` and `GET /products/{slug}`
- `GET /products/{slug}/skus`
- `GET /skus` and `GET /skus/{code}`

Lists return `items`, `total`, `page`, and `page_size`; pages start at 1 and sizes
are 1–100. Product lists accept collection and category **slugs** as filters.
The product SKU endpoint returns an ordered array, including an empty array for
a published product with no published SKUs. Missing and unpublished details return
the same 404. Product visibility depends only on the product's published state;
an unpublished attached collection or category never hides a published product.
Only published associations are exposed in `collection_ids` and `category_ids`
or matched by filters. SKUs also require a published parent product.

Products support multiple collections and categories through association tables
with unique composite keys. Filtered product queries use DISTINCT before counting
and pagination so a shared product appears once. Collection/category membership
does not duplicate products or their SKUs; inventory remains outside this context.
SKUs have a globally unique code and an optional explicit price. PostgreSQL prices
use `NUMERIC(24,6)` and Python `Decimal`, with JSON amounts serialized as strings.
ORM writes reject floats, nonfinite/negative values, more than six fractional
digits, and amounts at or above 10^18 before SQL execution can round them.
Price and currency must either both be null or form an IRT/IRR pair. A missing
price is unknown, not zero. No stock, availability, cost, or purchase eligibility
is exposed or computed. Raw SQL writers must enforce precision themselves because
PostgreSQL's NUMERIC scale can round before checking constraints.

Run `pytest`, `ruff check src tests migrations`, and `mypy` from Backend.
Mypy initially covers catalog, shared money, and the demo CLI with checked untyped bodies;
it is not yet a strict whole-project typing gate. Dependency locks are managed
by the parent agent.

SQLite tests verify read semantics, constraints, HTTP responses, and migration
0002→0003 upgrade/downgrade preserving an existing collection. They cannot prove
PostgreSQL monetary precision. Set `NILART_TEST_DATABASE_URL` to a dedicated
PostgreSQL test database to enable the isolated transactional-schema test.
No admin writes, inventory management, or catalog publication workflow is included.

## Explicit demo CLI

From Backend, use `.venv/bin/python -m nilart.bootstrap.catalog_demo --database-url
<explicit-postgresql-demo-url>` after applying migrations. The database URL is
required; there is no fallback to settings, no SQLite mode, and no automatic
schema creation. Use a dedicated demo database. Supply credentials securely;
command-line arguments may be visible in local process listings and shell history.
The CLI does not print URLs or database exception details.

It inserts two published collections, two published categories, one shared
published product, and exactly one published SKU in a single transaction.
Default price is unknown; `--price 12.345678 --currency IRT` explicitly sets it.
No stock, inventory, or availability is created or inferred. Existing demo records
are never overwritten; use another `--prefix demo-another` for another run.


## Batched product-page associations (2026-10-12)

Product pages fetch published collection/category memberships in two batch queries
for the selected product IDs, preserving slug/ID ordering and empty memberships.
A nonempty page uses four SELECTs (count, products, collections, categories),
instead of two plus two per product. Empty pages skip membership queries.
Three regression tests measure query counts for one/multiple/zero results and
compare each listed product with its detail response. Existing public visibility,
filtering, precision and pagination tests remain passing. No schema/API shape,
data, inventory or publication workflow changes are included. This verifies query
count, not production throughput or consistency across concurrent publications.


## Product-SKU visibility reads (2026-10-12)

Product-SKU lookup now checks only the published product ID before reading SKUs;
it no longer loads product memberships. Published products use two SELECTs,
including those with no public SKUs; draft/missing products use one and return
404. Four HTTP regression cases measure this and preserve ordered public SKU
results. The isolated PostgreSQL test also verifies SKU identity and exact price
on this path. No API, schema, data or stock changes are included.


## Identifier bounds (2026-10-12)

Public detail slugs, product-SKU slugs and SKU codes accept 1–160 characters,
matching database identifier capacity. Optional collection/category filters use
the same bounds; omit a filter for an unfiltered list instead of sending an empty
value. Invalid lengths return 422 before repository queries. OpenAPI documents
these constraints. Eight new HTTP cases verify oversized detail identifiers and
empty/oversized filters with an unusable database dependency. Existing valid
catalog paths remain covered; no schema or data migration is required.

## Draft SKU option authoring (2026-10-12)

`GET` and `PUT /api/v1/admin/catalog/products/{product_id}/options` require
`catalog.manage`. They target existing products, including published products,
but operate exclusively on separate draft configurations. No public catalog
output, SKU, price, inventory, or publication state is changed.

A draft document contains `options` and explicit `combinations`. Options have
UUID `id`, bilingual `title_fa`/`title_en`, integer `order`, and similarly labeled
`values`. Combinations have a `code` and `selections` of `option_id`/`value_id`.
One value per option is required. Unknown values, repeated IDs/orders, blank
labels, duplicate codes/combinations and extra fields are rejected. Codes are
case-sensitive, nonblank, trimmed, and at most 160 characters. Draft codes are
unique within a configuration; they do not reserve published SKU codes. Maximums
are 20 options, 100 values per option, and 1,000 explicit combinations. An optionless
product can have one explicit combination with an empty selection.

An existing product without a draft returns version 0, null configuration ID,
and empty arrays. PUT replaces the whole document and requires its current
`version`; successful saves increment it, keeping the configuration UUID stable.
Stale versions return 409; missing products return 404. Reads sort options/values
by explicit order, preserving submitted combination order. UUID references are
local to the submitted document, not references to another product's options.

Writes require exact Origin and current CSRF, recheck and lock the session/account
and current role grants, then lock the product to serialize initial creation and
updates. The application validates a complete document; PostgreSQL stores it as a
JSONB aggregate in `catalog_option_drafts`. `catalog_option_audits` receives actor,
configuration/product IDs, previous/new versions, UTC timestamp and before/after
option snapshots in the same transaction. An audit failure rolls back the draft.
There is no API to modify audit history. All admin responses use no-store.

Migration 0009 creates only these two tables/indexes; downgrade removes draft/audit
history and preserves products. No configuration is seeded and no administrator
is assigned. Product creation, admin UI, publication and the live product selector
remain later slices. Sixteen added tests cover validation, HTTP authorization,
permission/session/CSRF rechecks, public isolation, audit rollback, concurrent
first saves and migration downgrade using isolated PostgreSQL schemas.

## Draft option audit reads (2026-10-12)

`GET /api/v1/admin/catalog/products/{product_id}/options/audits` requires
`catalog.manage` and returns no-store history scoped to that existing product.
Results include stored before/after option documents, actor/configuration/product
IDs, versions and timestamps, newest version first. `limit` defaults to 20 and
accepts 1–100; optional `before_version` is an exclusive positive integer cursor.
The response contains `items` and `next_before_version` (null at the end).
Use that cursor on the next read to avoid shifting pages when newer changes arrive.
An existing product with no history returns an empty page; a missing product is
404. No audit modification API is provided. The PostgreSQL regression covers
permissions, cursor ordering, actor/product identity, product isolation and bounds.

## Concurrent draft replacement verification (2026-10-12)

The two-connection PostgreSQL probe now starts writers together using a barrier
and covers both initial creation and replacement of a version-1 draft. Exactly
one writer succeeds; the other gets a version conflict. The final document must
match the winning submission, audit count must increase only once, and the last
audit's before/after snapshots must match the prior/winning documents. These
checks extend test coverage without changing runtime behavior.

## Public artwork descriptions (2026-10-12)

Migration 0010 introduces `catalog_artworks` with UUID identity, unique 160-character
slug, bilingual titles/descriptions and a publication flag defaulting to false.
It inserts no records. `GET /api/v1/catalog/artworks` returns published descriptions
ordered by slug/ID with page/page_size (1–100) and total. Detail reads at
`/artworks/{slug}` return identical public fields; draft/missing records share 404.
No price, stock, sales status, dimensions, media URL or purchasing eligibility is
inferred. Authoring, approved media provisioning and artwork sales remain separate.
The read flow uses application query ports and a SQL repository. Isolated
PostgreSQL tests cover publication isolation, pagination, details and downgrade.

The frontend renders these reads through the original ArtworksPage and
ArtworkDetailPage. Missing image/specification/commercial fields use the supplied
unavailable presentation; no demonstration artist, painting, frame, price or stock
is substituted. Default ordering follows the API, and purchasing/favorites remain
disabled until their contracts exist. This does not change the public response schema.

## Public bundle composition (2026-10-12)

Migration 0012 creates unseeded bundle descriptions and explicit component links.
Each SKU occurs once per bundle with a strictly positive quantity; repeated-unit
requirements use that quantity. Bundles reference existing shared SKUs and do not
own inventory. Public list/detail at `/api/v1/catalog/bundles` use bounded paging
and expose bilingual descriptions plus ordered component SKU codes, product titles
and quantities. Published bundles require at least one component and all component
SKUs/parent products published; otherwise they are absent/404. Components are
batch loaded for selected bundle IDs. No capacity, price, discount, reservation,
checkout or publication authoring is provided. Inventory must later aggregate
SKU demand across standalone and bundle lines before computing capacity/reserving.

The live bundle gallery/detail shows saved descriptions/components, unavailable
media and unconfirmed purchase details. Unknown or empty data is not replaced by
demo bundles. Commission and footer information routes are also connected; the
static footer pages explicitly identify unavailable tracking/contact/policies.
