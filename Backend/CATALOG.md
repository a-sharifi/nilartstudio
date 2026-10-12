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
