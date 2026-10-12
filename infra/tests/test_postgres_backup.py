import hashlib
import importlib.util
import json
import os
import subprocess
import tempfile
import unittest
from contextlib import nullcontext
from pathlib import Path
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location(
    "postgres_backup", Path(__file__).parents[1] / "scripts" / "postgres_backup.py"
)
backup = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(backup)


class BackupTests(unittest.TestCase):
    def test_existing_output_is_never_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            original = output / "postgres.dump"
            original.write_bytes(b"existing private backup")
            with patch.object(backup, "run") as runner:
                with self.assertRaises(FileExistsError):
                    backup.backup_and_verify("source", output)
                runner.assert_not_called()
            self.assertEqual(original.read_bytes(), b"existing private backup")

    def test_failed_dump_removes_partial_archive_without_success_report(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "backup"
            image = subprocess.CompletedProcess([], 0, stdout=b"sha256:test\n")
            with patch.object(backup, "run", side_effect=[image, RuntimeError("dump failed")]), \
                 self.assertRaises(RuntimeError):
                backup.backup_and_verify("source", output)
            self.assertEqual(list(output.iterdir()), [])
            self.assertEqual(output.stat().st_mode & 0o777, 0o700)

    def test_server_errors_are_not_echoed(self):
        error = subprocess.CompletedProcess([], 1, stderr=b"private customer content")
        with patch.object(backup.subprocess, "run", return_value=error):
            with self.assertRaisesRegex(RuntimeError, "operation failed") as result:
                backup.run(["docker", "exec"])
            self.assertNotIn("private customer", str(result.exception))

    def test_restore_failure_removes_only_the_created_container(self):
        commands = []

        def run(arguments, **kwargs):
            commands.append(arguments)
            return subprocess.CompletedProcess([], 0, stdout=b"postgres\n")

        with patch.object(backup, "run", side_effect=run), \
             patch.object(backup.subprocess, "run", return_value=subprocess.CompletedProcess([], 0)), \
             patch.object(backup, "sql", return_value="1"), self.assertRaises(RuntimeError), \
             backup.isolated_postgres("sha256:test") as target:
            self.assertTrue(target.startswith("nilart-restore-"))
            raise RuntimeError("restore failed")
        create = commands[0]
        self.assertIn("none", create)
        self.assertIn("/var/lib/postgresql/data:rw,size=1g", create)
        self.assertNotIn("-p", create)
        self.assertNotIn("--volume", create)
        self.assertEqual(commands[-1], ["docker", "rm", "-f", target])

    def saved_fixture(self, directory):
        archive = Path(directory) / "postgres.dump"
        archive.write_bytes(b"trusted fixture")
        report = {"verified": True, "sha256": hashlib.sha256(archive.read_bytes()).hexdigest(),
                  "postgres_image": "sha256:" + "a" * 64, "migration": "0008", "tables": []}
        (Path(directory) / "verification.json").write_text(json.dumps(report))
        return report

    def test_changed_archive_is_rejected_before_docker_and_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            self.saved_fixture(directory)
            archive = Path(directory) / "postgres.dump"
            archive.write_bytes(b"corrupted")
            with patch.object(backup, "isolated_postgres") as restore:
                with self.assertRaisesRegex(RuntimeError, "checksum"):
                    backup.verify_existing(Path(directory))
                restore.assert_not_called()
            self.assertEqual(archive.read_bytes(), b"corrupted")
            self.assertTrue((Path(directory) / "verification.json").exists())

    def test_invalid_report_image_is_rejected_before_docker(self):
        with tempfile.TemporaryDirectory() as directory:
            result = self.saved_fixture(directory)
            result["postgres_image"] = "untrusted:latest"
            (Path(directory) / "verification.json").write_text(json.dumps(result))
            with patch.object(backup, "isolated_postgres") as restore:
                with self.assertRaisesRegex(RuntimeError, "report is invalid"):
                    backup.verify_existing(Path(directory))
                restore.assert_not_called()

    def test_inventory_mismatch_is_rejected_without_rewriting_report(self):
        with tempfile.TemporaryDirectory() as directory:
            self.saved_fixture(directory)
            report = Path(directory) / "verification.json"
            original = report.read_bytes()
            with patch.object(backup, "isolated_postgres", return_value=nullcontext("target")), \
                 patch.object(backup, "restore_archive"), \
                 patch.object(backup, "inventory", return_value={"migration": "0009", "tables": []}), \
                 self.assertRaisesRegex(RuntimeError, "inventory does not match"):
                backup.verify_existing(Path(directory))
            self.assertEqual(report.read_bytes(), original)

    def test_invalid_row_count_is_rejected_before_docker(self):
        with tempfile.TemporaryDirectory() as directory:
            result = self.saved_fixture(directory)
            result["tables"] = [{"schema": "public", "table": "private", "rows": True}]
            (Path(directory) / "verification.json").write_text(json.dumps(result))
            with patch.object(backup, "isolated_postgres") as restore:
                with self.assertRaisesRegex(RuntimeError, "inventory is invalid"):
                    backup.verify_existing(Path(directory))
                restore.assert_not_called()

    def test_invalid_row_fingerprint_is_rejected_before_docker(self):
        with tempfile.TemporaryDirectory() as directory:
            result = self.saved_fixture(directory)
            result["tables"] = [{"schema": "public", "table": "private", "rows": 1,
                                 "rows_sha256": "invalid"}]
            (Path(directory) / "verification.json").write_text(json.dumps(result))
            with patch.object(backup, "isolated_postgres") as restore:
                with self.assertRaisesRegex(RuntimeError, "fingerprint is invalid"):
                    backup.verify_existing(Path(directory))
                restore.assert_not_called()

    def test_same_count_different_fingerprint_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            result = self.saved_fixture(directory)
            result["tables"] = [{"schema": "public", "table": "private", "rows": 1,
                                 "rows_sha256": "a" * 64}]
            report = Path(directory) / "verification.json"
            report.write_text(json.dumps(result))
            original = report.read_bytes()
            changed = {"migration": "0008", "tables": [{"schema": "public", "table": "private",
                        "rows": 1, "rows_sha256": "b" * 64}]}
            with patch.object(backup, "isolated_postgres", return_value=nullcontext("target")), \
                 patch.object(backup, "restore_archive"), \
                 patch.object(backup, "inventory", return_value=changed), \
                 self.assertRaisesRegex(RuntimeError, "inventory does not match"):
                backup.verify_existing(Path(directory))
            self.assertEqual(report.read_bytes(), original)


@unittest.skipUnless(os.environ.get("NILART_RUN_BACKUP_INTEGRATION") == "1",
                     "Explicit Docker integration opt-in required")
class DockerBackupTests(unittest.TestCase):
    def test_real_restore_preserves_rows_constraints_and_sequences(self):
        image = os.environ["NILART_BACKUP_TEST_IMAGE"]
        with tempfile.TemporaryDirectory() as directory, backup.isolated_postgres(image) as source:
            backup.sql(source, """
                CREATE TABLE alembic_version (version_num text PRIMARY KEY);
                INSERT INTO alembic_version VALUES ('0012');
                CREATE TABLE parent (id serial PRIMARY KEY, name text UNIQUE NOT NULL);
                CREATE TABLE child (id serial PRIMARY KEY, parent_id int REFERENCES parent(id));
                INSERT INTO parent(name) VALUES ('هنر'), ('second');
                INSERT INTO child(parent_id) VALUES (1);
            """)
            output = Path(directory) / "backup"
            result = backup.backup_and_verify(source, output)
            saved_report = (output / "verification.json").read_bytes()
            self.assertEqual(backup.verify_existing(output), result)
            self.assertEqual((output / "verification.json").read_bytes(), saved_report)
            self.assertTrue(result["verified"])
            self.assertEqual(result["migration"], "0012")
            counts = {entry["table"]: entry["rows"] for entry in result["tables"]}
            self.assertEqual(counts, {"alembic_version": 1, "child": 1, "parent": 2})
            self.assertEqual(json.loads((output / "verification.json").read_text()), result)
            self.assertEqual((output / "postgres.dump").stat().st_mode & 0o777, 0o600)
            self.assertEqual((output / "verification.json").stat().st_mode & 0o777, 0o600)
            with backup.isolated_postgres(image) as restored:
                backup.restore_archive(output / "postgres.dump", restored)
                self.assertEqual(backup.sql(restored, "SELECT name FROM parent WHERE id=1;"), "هنر")
                original = backup.inventory(restored)
                self.assertEqual(original["tables"], result["tables"])
                backup.sql(restored, "UPDATE parent SET name='changed' WHERE id=1;")
                changed = backup.inventory(restored)
                old_parent = next(row for row in original["tables"] if row["table"] == "parent")
                new_parent = next(row for row in changed["tables"] if row["table"] == "parent")
                self.assertEqual(old_parent["rows"], new_parent["rows"])
                self.assertNotEqual(old_parent["rows_sha256"], new_parent["rows_sha256"])
                backup.sql(restored, "UPDATE parent SET name='هنر' WHERE id=1;")
                self.assertEqual(backup.inventory(restored), original)

                self.assertEqual(backup.sql(restored,
                    "INSERT INTO parent(name) VALUES ('next') RETURNING id;"), "3\nINSERT 0 1")
                with self.assertRaises(RuntimeError):
                    backup.sql(restored, "INSERT INTO child(parent_id) VALUES (999);")
            self.assertEqual(backup.sql(source, "SELECT count(*) FROM parent;"), "2")
            with backup.isolated_postgres(image) as corrupt_target:
                invalid = Path(directory) / "invalid.dump"
                invalid.write_bytes(b"not a PostgreSQL archive")
                with self.assertRaises(RuntimeError):
                    backup.restore_archive(invalid, corrupt_target)


if __name__ == "__main__":
    unittest.main()
