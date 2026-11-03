#!/usr/bin/env python3
"""Publish the owner's information pages through authenticated, audited commands."""
import argparse
import http.cookiejar
import json
from pathlib import Path
import urllib.error
import urllib.request
from uuid import uuid4

parser = argparse.ArgumentParser()
parser.add_argument("content", type=Path)
parser.add_argument("--origin", required=True)
parser.add_argument("--credentials", required=True, type=Path)
parser.add_argument("--api-endpoint", choices=["http://api:8000", "http://127.0.0.1:8000"])
parser.add_argument("--publish", action="store_true")
args = parser.parse_args()
if not args.origin.startswith(("https://", "http://127.0.0.1:", "http://localhost:")):
    raise SystemExit("HTTPS or loopback origin required")
pages = json.loads(args.content.read_text())
if not pages or not set(pages) <= {"about", "contact", "terms", "privacy", "faq", "buying-guide", "returns"}:
    raise SystemExit("Unexpected information page slug")
jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
csrf = ""

def request(path, body=None, method="GET"):
    headers = {"Accept": "application/json", "Origin": args.origin}
    if body is not None:
        headers["Content-Type"] = "application/json"
    if csrf:
        headers["X-CSRF-Token"] = csrf
    if args.api_endpoint:
        headers["Cookie"] = "; ".join(f"{cookie.name}={cookie.value}" for cookie in jar)
    req = urllib.request.Request((args.api_endpoint or args.origin) + path,
        data=None if body is None else json.dumps(body).encode(), headers=headers, method=method)
    try:
        with opener.open(req, timeout=40) as response:
            return json.load(response)
    except Exception:
        raise RuntimeError(f"Content operation unconfirmed: {method} {path}") from None

credentials = json.loads(args.credentials.read_text())
csrf = request("/api/v1/auth/login/password", {"phone": credentials["phone"], "password": credentials["password"]}, "POST")["csrf_token"]
for slug, content in pages.items():
    path = f"/api/v1/admin/content/{slug}"
    current = request(path)
    if current["content"] == content and current["published_revision"]:
        print(slug, "already published", current["version"])
        continue
    if not args.publish:
        print(slug, "ready for publication", "current version", current["version"])
        continue
    operation = str(uuid4())
    receipt_path = f"{path}/versions/{operation}"
    intent = {"expected_version": current["version"], "action": "publish", "content": content,
        "reason": "Owner-requested bilingual information pages and updated public Qazvin contact address"}
    try:
        result = request(receipt_path, intent, "PUT")
    except RuntimeError:
        # Recover a lost response without repeating the publication command.
        result = request(receipt_path)
    if result["content"] != content or result["action"] != "publish" or result["revision_id"] != operation:
        raise RuntimeError(f"Publication receipt mismatch: {slug}")
    print(slug, "published", "version", result["version"])
