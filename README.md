# Nilart

**Continuing with another AI? Start with [AI-HANDOFF.md](docs/AI-HANDOFF.md).**
It explains implemented features, design constraints, test evidence, current
environment blockers and the recommended next steps. The full platform is not
yet production-ready.

Repository root is this `code` directory. Applications are `Backend/` and
`Frontend/`; requirements and progress are in `docs/`.

## Local development

Requires Python 3.12, Node 24, Docker, Compose 2.24.4+ and Make.
Copy `.env.example` to `.env` and fill five independent credentials. Passwords
must be URL-safe (hex recommended); MinIO password must have at least 8 characters.
Never commit `.env` or use development credentials in production.

```sh
make install
make up
make migrate
make check
```

Open http://localhost:8080. Only nginx publishes a port, on localhost;
`/api` forwards unchanged to API, `/` to web. All eight services have healthchecks.
Readiness: `/api/v1/health/ready`; catalog: `/api/v1/catalog/collections`.
Postgres, Redis, RabbitMQ, MinIO, API and web have no host-published ports.

`make down` preserves named data volumes. `make logs SERVICE=api` follows one
service; omit SERVICE for all. `make migrate` explicitly applies migrations;
startup never seeds or resets data. `make build` builds both applications and
worker. `make test`, `lint`, `typecheck`, and `api-client` use application-owned
checks/generator. `make check` combines test, lint, typecheck.
Python uses `Backend/.venv`; override `PYTHON=...` if needed.
`make help` lists commands. Typechecking runs backend mypy and frontend TypeScript.
`make api-client` runs the backend OpenAPI exporter then generates
`packages/api-client/schema.d.ts` with the installed frontend openapi-typescript.

After migrations, enable the optional outbox scheduler with
`COMPOSE_PROFILES=scheduler make up`. Run exactly one beat scheduler per
deployment; do not scale this service. The worker is always enabled, but periodic
outbox dispatch requires this profile. Production uses the same opt-in profile.

Design reference preview (installs dependencies but does not edit source files):

```sh
make design-reference
```

This runs the reference Vite React application on localhost.
Dockerfiles belong to application maintainers. Web uses Next standalone,
listens on `0.0.0.0:3000`, and must bake relative `/api` URLs into its build.

## Production

Use a separate protected environment file with fresh credentials, explicit
MINIO_BUCKET and PRODUCTION_BIND_IP, and absolute TLS_CERT_PATH/TLS_KEY_PATH
pointing to supplied full-chain/private-key PEM files. No secret has a built-in
default. Missing certificate paths fail instead of creating directories.

```sh
make ENV=production ENV_FILE=/absolute/path/production.env up
make ENV=production ENV_FILE=/absolute/path/production.env migrate
```

The override replaces localhost publishing with ports 80/443 on the chosen IP,
redirects HTTP to HTTPS and enables TLS 1.2/1.3 and HSTS. Renew certs externally,
then reload nginx. Credentials are container environment variables, not vault
secrets; restrict Docker access and environment-file permissions. Back up and
test restores of all named volumes before deployment.

MinIO is provisioned internally only. Bucket provisioning, least-privilege
application credentials and backend S3 integration remain deployment/application
work; current backend does not consume `NILART_S3_*` settings.
CI checks new paths assuming `code` is the Git checkout root.

The historical public MinIO image could not be pulled. Development builds the
pinned community source at `07c3a429bfed433e49018cb0f78a52145d4bedeb` instead.
This upstream is archived; the production override refuses to use this development
build and requires `MINIO_PRODUCTION_IMAGE` with a compatible, security-reviewed image.
Storage provider/security approval remains a release gate, not an automatic substitution.
