"""Read-only logical backup and isolated restore drill; Python standard library only."""

import argparse
import hashlib
import json
import os
import subprocess
import time
import uuid
from contextlib import contextmanager
from pathlib import Path


def run(arguments, **kwargs):
    result = subprocess.run(arguments, check=False, stderr=subprocess.PIPE, timeout=300, **kwargs)
    if result.returncode:
        # Server errors can contain private row data. Do not echo them into logs.
        raise RuntimeError(f"{arguments[0]} operation failed (exit {result.returncode})")
    return result


def sql(container, statement):
    return run(["docker", "exec", "-i", container, "psql", "-X", "-At",
                "-v", "ON_ERROR_STOP=1", "-U", "nilart", "-d", "nilart"],
               input=statement.encode(), stdout=subprocess.PIPE).stdout.decode().strip()


@contextmanager
def isolated_postgres(image):
    name = f"nilart-restore-{uuid.uuid4().hex}"
    created = False
    try:
        run(["docker", "create", "--name", name, "--network", "none",
             "--tmpfs", "/var/lib/postgresql/data:rw,size=1g",
             "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "-e", "POSTGRES_USER=nilart",
             "-e", "POSTGRES_DB=nilart", image], stdout=subprocess.PIPE)
        created = True
        run(["docker", "start", name], stdout=subprocess.PIPE)
        deadline = time.monotonic() + 60
        while time.monotonic() < deadline:
            process = run(["docker", "exec", name, "cat", "/proc/1/comm"],
                          stdout=subprocess.PIPE).stdout.strip()
            if process != b"postgres":
                time.sleep(1)
                continue
            ready = subprocess.run(["docker", "exec", name, "pg_isready", "-U", "nilart",
                                    "-d", "nilart"], check=False, stdout=subprocess.DEVNULL,
                                   stderr=subprocess.DEVNULL, timeout=10)
            if ready.returncode == 0:
                # initdb briefly starts a temporary server. Wait for final readiness.
                try:
                    sql(name, "SELECT 1;")
                    break
                except RuntimeError:
                    pass
            time.sleep(1)
        else:
            raise RuntimeError("Isolated PostgreSQL did not become ready")
        yield name
    finally:
        if created:
            run(["docker", "rm", "-f", name], stdout=subprocess.PIPE)


def restore_archive(archive, target):
    with archive.open("rb") as stream:
        run(["docker", "exec", "-i", target, "pg_restore", "-U", "nilart", "-d", "nilart",
             "--no-owner", "--no-acl", "--single-transaction", "--exit-on-error"],
            stdin=stream, stdout=subprocess.PIPE)


def inventory(target):
    # Only counts, object names and migration revision are reported, never row contents.
    tables = json.loads(sql(target, "SELECT coalesce(json_agg(json_build_array(schemaname, "
                            "tablename) ORDER BY schemaname, tablename), '[]') FROM pg_tables "
                            "WHERE schemaname NOT IN ('pg_catalog', 'information_schema');"))
    counts = []
    for schema, table in tables:
        identifier = '.'.join('"' + part.replace('"', '""') + '"' for part in (schema, table))
        counts.append({"schema": schema, "table": table,
                       "rows": int(sql(target, f"SELECT count(*) FROM {identifier};"))})
    revision = sql(target, "SELECT version_num FROM public.alembic_version ORDER BY version_num;")
    return {"migration": revision, "tables": counts}


def backup_and_verify(source, output, expected_migration="0008"):
    # A new private directory prevents accidental overwrite and keeps dumps out of logs.
    output.mkdir(mode=0o700, parents=False, exist_ok=False)
    archive = output / "postgres.dump"
    report = output / "verification.json"
    image = run(["docker", "inspect", "--format", "{{.Image}}", source],
                stdout=subprocess.PIPE).stdout.decode().strip()
    try:
        descriptor = os.open(archive, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "wb") as stream:
            run(["docker", "exec", source, "pg_dump", "-U", "nilart", "-d", "nilart",
                 "--format=custom"], stdout=stream)
        with archive.open("rb") as stream:
            digest = hashlib.file_digest(stream, "sha256").hexdigest()
        with isolated_postgres(image) as target:
            restore_archive(archive, target)
            result = inventory(target)
            if result["migration"] != expected_migration:
                raise RuntimeError("Restored migration does not match the expected revision")
        result.update({"verified": True, "sha256": digest, "postgres_image": image,
                       "scope": "one PostgreSQL database; excludes roles, ACLs and other services"})
        descriptor = os.open(report, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "w") as stream:
            json.dump(result, stream, indent=2)
            stream.write("\n")
        return result
    except BaseException:
        # Never leave a truncated dump or a success report after a failed drill.
        archive.unlink(missing_ok=True)
        report.unlink(missing_ok=True)
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-container", default="nilart-postgres-1")
    parser.add_argument("--output-dir", type=Path, required=True,
                        help="New directory under an existing parent; private artifacts retained")
    parser.add_argument("--expected-migration", default="0008")
    arguments = parser.parse_args()
    try:
        result = backup_and_verify(arguments.source_container, arguments.output_dir,
                                   arguments.expected_migration)
    except (RuntimeError, OSError, subprocess.TimeoutExpired) as error:
        parser.exit(1, f"Backup verification failed: {error}\n")
    print(f"Verified PostgreSQL restore: migration {result['migration']}, "
          f"{len(result['tables'])} tables. Private artifacts: {arguments.output_dir}")


if __name__ == "__main__":
    main()
