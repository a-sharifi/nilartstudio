"""Generate the API contract without starting a server or touching business data."""
import json
from pathlib import Path

from nilart.bootstrap.main import app

destination = Path(__file__).resolve().parents[2] / "packages/api-client/openapi.json"
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(json.dumps(app.openapi(), ensure_ascii=False, indent=2) + "\n")
