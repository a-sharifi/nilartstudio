# PostgreSQL backup and isolated restore drill

This tool creates a logical backup of the running local PostgreSQL database and
verifies it in a new disposable container. It never restores into the source
container or an existing database. It requires Python 3.12, Docker and the running
PostgreSQL 17 service. Default source: `nilart-postgres-1`, database/user `nilart`.

```sh
make PYTHON=python3 backup-verify
```

The output is a new timestamped directory under ignored `backups/`. Override
`BACKUP_DIR` to use an existing private storage location and
`BACKUP_SOURCE_CONTAINER` if the Compose container was renamed. Direct usage:

```sh
python3 infra/scripts/postgres_backup.py \
  --source-container nilart-postgres-1 \
  --output-dir /private/existing-parent/new-backup-directory \
  --expected-migration 0008
```

The parent directory must exist; the output directory must not already exist.
The directory has mode 0700 and files have mode 0600. Artifacts contain private
application data; keep them outside Git and use approved encrypted off-host
storage and retention for production. This command provides neither encryption
nor upload/scheduling/retention. The locally verified drill is not a production
recovery approval.

The source is read only: `pg_dump --format=custom` captures one consistent
PostgreSQL database snapshot. The restore uses the source container's immutable
local image ID, no published ports, no network and a 1 GiB temporary memory
filesystem. It waits for the final PostgreSQL process, then runs `pg_restore`
with a single transaction, exit-on-error, no-owner and no-acl. Only its own
randomly named restore container is removed, including after failures. No
application volumes are removed. Docker operations have a five-minute timeout.
Large backups need a reviewed extension to these resource/time limits.

`verification.json` is written only after successful restoration and querying
all restored user tables, and after matching the expected Alembic revision.
It records table row counts, migration head, archive SHA-256 and source image ID;
it never records row contents or passwords. Existing output is never overwritten.
A failed drill removes its new dump/report rather than leaving a partial backup
labelled successful. Server error details are withheld from logs because database
errors can include private values. A failed output directory remains empty for
inspection; retry with a fresh path.

The inventory and archive checksum are evidence of successful restoration, not a
comparison against a separately queried live database: live writes can continue
while the dump runs. The integration fixture separately verifies actual restored
Persian data, generated sequence values and foreign-key enforcement, confirms the
source stayed unchanged, and rejects a corrupt archive.

Run lightweight safety tests:

```sh
make PYTHON=python3 test-infra
```

Run all five tests with real disposable PostgreSQL fixtures:

```sh
docker pull postgres:17-alpine
NILART_RUN_BACKUP_INTEGRATION=1 NILART_BACKUP_TEST_IMAGE=postgres:17-alpine \
  python3 -m unittest discover -s infra/tests -v
```

The GitHub infrastructure job runs the Docker integration test. Local execution
passed on 2026-10-12; remote CI status must be checked separately.

This covers one database. It does not verify cluster roles/ACLs, PostgreSQL WAL
or point-in-time recovery, Redis, RabbitMQ, MinIO/media, TLS secrets, configuration,
or complete application recovery. No production restore command is provided;
a production recovery runbook requires approved destinations, credentials,
retention, off-host storage and coordinated validation of all services.

References: [PostgreSQL 17 pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html)
and [PostgreSQL 17 pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html).
