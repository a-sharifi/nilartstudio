import importlib.util
import json
import os
import subprocess
import tempfile
import unittest
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


@unittest.skipUnless(os.environ.get("NILART_RUN_BACKUP_INTEGRATION") == "1",
                     "Explicit Docker integration opt-in required")
class DockerBackupTests(unittest.TestCase):
    def test_real_restore_preserves_rows_constraints_and_sequences(self):
        image = os.environ["NILART_BACKUP_TEST_IMAGE"]
        with tempfile.TemporaryDirectory() as directory, backup.isolated_postgres(image) as source:
            backup.sql(source, """
                CREATE TABLE alembic_version (version_num text PRIMARY KEY);
                INSERT INTO alembic_version VALUES ('0008');
                CREATE TABLE parent (id serial PRIMARY KEY, name text UNIQUE NOT NULL);
                CREATE TABLE child (id serial PRIMARY KEY, parent_id int REFERENCES parent(id));
                INSERT INTO parent(name) VALUES ('هنر'), ('second');
                INSERT INTO child(parent_id) VALUES (1);
            """)
            output = Path(directory) / "backup"
            result = backup.backup_and_verify(source, output)
            self.assertTrue(result["verified"])
            self.assertEqual(result["migration"], "0008")
            counts = {entry["table"]: entry["rows"] for entry in result["tables"]}
            self.assertEqual(counts, {"alembic_version": 1, "child": 1, "parent": 2})
            self.assertEqual(json.loads((output / "verification.json").read_text()), result)
            self.assertEqual((output / "postgres.dump").stat().st_mode & 0o777, 0o600)
            self.assertEqual((output / "verification.json").stat().st_mode & 0o777, 0o600)
            with backup.isolated_postgres(image) as restored:
                backup.restore_archive(output / "postgres.dump", restored)
                self.assertEqual(backup.sql(restored, "SELECT name FROM parent WHERE id=1;"), "هنر")
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
