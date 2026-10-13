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

## Design-reference test data (2026-10-12)

An explicit user-requested local import adds five collections, four categories and
four products from the pinned design reference. Published descriptions include a
bilingual test-data notice; sample price/stock/options are not imported. No SKUs
or commercial records are created. See `fixtures/README.md` for the opt-in importer,
transaction rollback and existing-slug protection. Startup/migrations remain unseeded.

## Published bundle frontend layout (2026-10-12)

Live bundle list/detail routes use reference bundle cards and the original detail
layout. Descriptions and explicit component quantities/codes come from the existing
API. Missing commercial/media fields stay unknown; prototype notebook options,
capacity calculations, discounts and cart callbacks are not invoked. No API/schema
or data changes accompany this presentation correction.

## Published product detail frontend (2026-10-12)

The original product-detail layout consumes product details and published SKU
reads. It rejects foreign SKU ownership and malformed exact prices, shows explicit
SKU codes without inferring notebook specifications, and keeps purchases disabled
because no stock/purchasing contract exists. Products without SKUs remain visible.
Prices stay decimal strings; no API/schema or catalog-data changes are included.

## Explicit versioned SKU price authoring (0013)

GET/PUT `/api/v1/admin/catalog/skus/{sku_id}/price` target an existing SKU.
Both require `catalog.manage`. PUT additionally requires exact Origin, current
CSRF, and transactionally locked/rechecked session, account and role grants.
No accounts/roles are created or elevated by this slice.

PUT accepts exactly `{version, price}`. Price is either explicit null (unknown)
or `{amount: decimal-string, currency: IRT|IRR}`. Amount accepts nonnegative values
below 10^18 with at most six decimal places; floats, exponent notation, partial
money, extra fields and excessive precision are rejected before PostgreSQL rounds.
Zero is an explicitly authored price, never a substitute for unknown.

Initial version is 0; stale writes return 409. Writers lock the SKU, check the
version, update its existing price, increment the separate version and append an
audit in one transaction. Reads obtain price/version in one statement. Audit
records include actor, SKU/product IDs, versions, UTC timestamp and before/after
prices; no credentials/tokens are stored. Audit failure rolls back price/version.
Migration 0013 adds only the version and audit tables. Downgrade removes those
new tables while preserving SKUs and their prices.

Updating an existing published SKU changes its public price through the existing
public response contract; it does not publish a draft SKU or option configuration,
create SKUs, calculate prices, infer stock, enable purchasing or change proposals.
No actual application prices were entered. SKU creation/publication, option mapping,
inventory, admin UI and audit browsing are subsequent slices.

The opt-in local Cats bundle fixture is documented in `fixtures/README.md`.
It adds explicit test composition and unpriced test SKUs, independently of any
production SKU authoring/publication workflow. Reference illustrations are
frontend assets associated by exact reference slugs; no image, price or inventory
is inferred by the public API.

### Protected SKU price history

`GET /api/v1/admin/catalog/skus/{sku_id}/price/audits` requires a current session
with `catalog.manage`. Results contain audit ID, SKU/product/actor IDs, UTC time,
previous/current versions and exact before/after price snapshots. An explicit
null price remains unknown; credentials and session tokens are excluded.

Newest versions come first. `limit` defaults to 20 (1–100);
`before_version` is an exclusive positive version cursor. Continue using
`next_before_version`; null means the page is exhausted. New writes between
pages do not shift the older-version cursor. An existing SKU with no price
changes returns an empty page; a missing SKU returns 404. Unauthorized callers
receive 401/403 before catalog lookup. Every response is private/no-store.

This reads existing audit records without changing prices, publication, stock,
or fixture data. No migration is needed: migration 0013 already supplies the
unique `(sku_id, version)` audit index. Generated OpenAPI/client types include
the endpoint and typed decimal-string snapshots. Admin UI and production SKU
creation/publication remain subsequent slices.

### Unpublished SKU authoring

Migration `0014` adds independent SKU authoring versions and audits. Price
versions remain independent. `POST /api/v1/admin/catalog/products/{product_id}/skus`
accepts only an explicit, trimmed `code` (1–160 characters) and returns 201 with
`sku_id`, `product_id`, `code`, `published:false` and `version:1`. Codes are globally
unique; duplicates return 409. Products must already exist. Each request creates
only its submitted SKU, with null price and currency.

`GET /api/v1/admin/catalog/skus/{sku_id}` reads authoring metadata. Existing SKUs
without an authoring version report zero. `PUT` on that path accepts `version`
and `code`; stale versions return 409 and successful edits increment the version.
Published SKU codes cannot be edited through this endpoint (409). Neither product
ownership, publication, price nor option selections can be supplied in these
bodies; additional fields are rejected. Publication and mapping draft combinations
to published SKUs remain separate work.

All endpoints require `catalog.manage`. Writes additionally check exact Origin,
fresh CSRF and transactionally recheck locked session/account/roles. SKU/code
changes, versions and before/after audit records commit together. A failed audit
rolls back creation or editing. Audits record actor, product/SKU, UTC timestamp
and versions; the creation snapshot has JSON null `before`. Public endpoints
continue to hide unpublished SKUs, and authoring supplies no inventory or
purchasing eligibility. No application SKUs are automatically created by migration.

### Explicit unpublished SKU option mappings

Migration `0015` stores one mapping per SKU. GET/PUT
`/api/v1/admin/catalog/skus/{sku_id}/options` require `catalog.manage`; PUT also
uses exact Origin, fresh CSRF and locked session/account/role rechecks.

PUT accepts the current SKU authoring `version` and an explicit `mapping`:
`configuration_id`, `configuration_version`, `combination_code`. The configuration
must belong to that SKU's product, its draft version must match, the combination
must exist, and its code must exactly match the SKU code. Only that submitted
combination is mapped. One combination can belong to at most one SKU within a
configuration version. Clearing the previous association (`mapping:null`) frees
it for explicit reassignment. Missing SKU returns 404; foreign/missing combinations
return 422; stale versions, duplicate associations and published SKU edits return
409. Body omissions and extra fields are rejected.

The stored snapshot contains ordered bilingual options/values and the validated
selected combination. GET reads SKU metadata, snapshot and current draft version
in one database statement. `mapping.current` becomes false when the draft version
or SKU code changes; the original snapshot is retained. Even unrelated draft edits
require explicit review/remapping. Existing mapping snapshots are not silently
rewritten. PUT uses a product lock before a SKU lock to coordinate with option
authoring. Mapping/unmapping, shared SKU authoring version and actor/time/before/
after audit commit atomically. Price versions remain separate.

Published SKUs cannot be mapped/unmapped through this API. No public output changes,
publication, inventory, inferred prices or purchasing are added. Local fixtures
are preserved and remain unmapped. Subsequent reviewed publication must validate
mapping freshness while holding these same locks, and define a published snapshot
contract independently of mutable drafts.

### Product detail presentation

Migration 0016 stores validated bilingual product presentation documents separately
from SKU option drafts. Public product **detail** responses include optional
`presentation` only when both product and presentation are published; product list
responses are unchanged. A missing/unpublished presentation leaves the prior
product response unchanged. The document supplies intro, about, media kind/palette,
explicit gallery views, specification label/value rows, readable SKU option labels
and delivery copy. It includes no inferred prices, stock or purchase eligibility.

The local opt-in fixture and reproduction steps are in `fixtures/README.md`.
No authoring/publication endpoint for presentation content is added here.
Unpublished draft SKU mappings remain private and are never rendered as published
product option families. Frontend validates the presentation before using it,
retains exact decimal SKU prices, and uses the original ProductGallery and detail
CSS/layout. Gallery zoom and closing restore focus; bookmark/sticker galleries do
not render notebook interiors. Quantity/purchase remain disabled pending inventory.

## Complete reference bundle presentation and database homepage — 2026-10-13

Live bundle list/detail and homepage share the original bundle card layout.
Known reference bundles use all four original still-life/gallery views, native
zoom/modal, keyboard/swipe navigation and focus restoration. Details show the
explicit fixed composition with reference component visuals, product links,
share, delivery/conditions and related component cards. Component API records
now include the published product_slug from the SKU/product join. Unknown
reference media remains unavailable rather than guessed. Prices, discounts,
stock and purchasing stay unconfirmed; no cart/inventory contract was added.

The homepage reads published collections, categories, four reference product
picks and the first two bundles from the catalog API. Reference ordering and
palettes are preserved. Bundle loading/error/retry/empty states do not inject
sample results. Published artwork copy is read when available; an empty artwork
catalog remains visibly empty. No simulated favorites or purchases are offered.

The opt-in local bundle-set importer adds the everyday/keepsake bundles with
their ruled/hardcover notebook products, sharing the existing Cats sticker and
bookmark SKUs. All three bundles contain one notebook, two stickers and one
bookmark. Preflight identity conflicts reject the entire import; the caller's
transaction rolls back failures. Local totals are eight products, eight unpriced
SKUs, three bundles, five collections and four categories. No migration is needed;
head remains 0016. Fixture reproduction is in Backend/fixtures/README.md.

Validation: 256 backend tests with isolated PostgreSQL/Redis, 88 frontend tests
and 16 browser cases pass. Browser coverage includes actual database homepage
content/order, all bundle gallery views, zoom/focus, component links, retry/empty
states and Persian mobile without overflow. Desktop/mobile screenshots were
reviewed. Backend/frontend lint, mypy, frontend typecheck, generated OpenAPI/client
and production Docker build pass. All eight local services are healthy; all 42
reference CSS files remain byte-identical. Remote CI has not been verified.

## Published presentation option families — 2026-10-13

Presentation JSON optionally contains ordered option_groups with bilingual choice
labels/captions/helper, explicit option_combinations keyed by published SKU code,
and fixed_fact. Validation rejects duplicate family/value/code/combination identity,
foreign selections and incomplete combinations. This read presentation remains
separate from private draft option authoring/mapping. No migration or publication
endpoint is introduced. The local fixture is explicitly opt-in and adds no prices,
stock or purchasing capability; UI resolves only combinations with returned public
SKUs. Product list contract is unchanged. OpenAPI/client types include the optional
presentation fields. See fixtures/README.md for guarded test-data import.

### Local reference test prices

`nilart.bootstrap.design_test_prices --local-test-data --fixture fixtures/design-test-prices.json` explicitly prices ten existing TEST-REF notebook variants from the reference catalog (IRT). It requires local PostgreSQL and the reference test product marker, locks rows, preserves different existing prices, and runs in one transaction. Repeating the identical fixture is safe. These are sample prices, not approved retail prices or stock.
