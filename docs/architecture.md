# Foundation architecture

Git root: the checkout directory. The original workspace called it `code/`.
Artwork was an external `design-prints/` sibling and is not included in this clone.

## Backend

FastAPI presentation → application queries/ports → domain value objects/entities.
SQLAlchemy repositories implement ports; Alembic owns PostgreSQL schema changes.
Catalog products have many-to-many collection/category membership; public queries
return each product once and exclude unpublished associations. Prices are exact
Decimal values serialized as strings. Availability is not inferred from files.

PostgreSQL is authoritative. Redis is cache/rate-limit infrastructure and RabbitMQ
is Celery's broker. The outbox inserts in the caller's transaction; confirmed
publication can redeliver, so consumers deduplicate transactionally. Both publication
attempts and consumer retries are bounded. Only infrastructure ping is currently handled;
business handlers, monitoring and manual retry UI remain future work.

## Frontend

Next.js App Router hosts the imported Figma React components under `src/design`.
All 42 source CSS files are preserved byte-for-byte. Public catalog pages use a
live-data adapter; Next navigation is used in live mode. Browser-dependent export
initialization remains behind a client-only compatibility boundary. SSR rendering
of catalog content and extraction of route-specific layouts are not yet complete.

The source preview is under `design-reference`, not deployed and not a nested Git repo.
Private routes and simulated transaction flows require explicit demo mode until real
backend authentication and business workflows are connected. Production does not
simulate successful purchases. Generated OpenAPI types live in `packages/api-client`.

## Local operation

Compose keeps services internal and publishes only nginx on localhost. Optional
`scheduler` profile provides one beat instance. A separate test-only override exposes
PostgreSQL on localhost:15432 for isolated integration tests; do not use it in production.
Development storage uses a pinned source build because public MinIO images were
unavailable. Production requires a reviewed storage image and externally supplied TLS.

No production launch, real SMS, payment, refund or print-asset publication is performed.
