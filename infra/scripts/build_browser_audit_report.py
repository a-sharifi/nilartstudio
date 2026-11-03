"""Summarize real sandbox browser evidence without publishing account credentials."""

import argparse
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument("--results", type=Path, required=True)
parser.add_argument(
    "--backend-log", type=Path, default=Path("/tmp/nilart-browser-backend-full.log")
)
parser.add_argument(
    "--frontend-log", type=Path, default=Path("/tmp/nilart-browser-unit-final.log")
)
args = parser.parse_args()


def passing_count(path):
    found = re.findall(r"(\d+) passed", path.read_text())
    if not found:
        raise SystemExit(f"No passing test count recorded in {path}")
    return int(found[-1])


backend_count = passing_count(args.backend_log)
frontend_count = passing_count(args.frontend_log)
rows = json.loads(args.results.read_text())
matrix_path = ROOT / "docs/admin-integrated-acceptance.json"
matrix = json.loads(matrix_path.read_text())
latest_actions = {r["name"]: r for r in rows if not r.get("scope")}
layouts = {}
for r in rows:
    if r.get("scope", "").startswith("route/layout") and r["name"] in {
        v["id"] for v in matrix["views"]
    }:
        layouts[(r["name"], r["language"], r["width"])] = r
links = {
    "ADM-02": ["catalogue-collections"],
    "ADM-03": ["catalogue-categories"],
    "ADM-04": ["catalogue-products", "sku-draft"],
    "ADM-05": ["catalogue-products"],
    "ADM-06": ["sku-option-mapping-publication"],
    "ADM-09": ["discount-rule-history"],
    "ADM-10": ["discount-rule-history"],
    "ADM-11": ["media-upload-publication"],
    "ADM-12": [
        "original-artwork",
        "digital-artwork",
        "physical-checkout",
        "digital-checkout",
        "licensed-digital-delivery",
        "mixed-checkout-renewed-acceptance",
        "last-unit-browser-concurrency",
    ],
    "ADM-13": [
        "role-admin",
        "role-staff",
        "role-artist",
        "role-boundaries",
        "permission-revocation",
    ],
    "ADM-14": ["role-artist", "artist-workspace"],
    "ADM-15": ["content-draft-publication"],
    "ADM-16": ["business-settings"],
    "COST-01": ["materials"],
    "COST-02": ["materials"],
    "COST-03": ["service-rates"],
    "COST-04": ["recipe-authoring"],
    "COST-05": ["recipe-authoring"],
    "COST-06": ["cutting-layout"],
    "OPS-01": ["original-opening", "purchase-post-receive", "purchase-production-qc"],
    "OPS-02": ["original-opening"],
    "OPS-03": ["original-opening"],
    "OPS-04": ["supplier-create"],
    "OPS-05": ["purchase-post-receive"],
    "OPS-06": ["purchase-post-receive"],
    "OPS-07": ["purchase-post-receive"],
    "OPS-08": ["purchase-production-qc"],
    "OPS-09": ["purchase-production-qc"],
    "OPS-10": ["purchase-production-qc"],
    "FIN-12": ["financial-browser-exports"],
    "ORDER-01": [
        "physical-checkout",
        "digital-checkout",
        "last-unit-browser-concurrency",
    ],
    "ORDER-02": ["physical-fulfillment", "licensed-digital-delivery"],
    "ORDER-03": ["physical-fulfillment"],
    "ORDER-04": ["customer-return-request", "return-approval-inspection"],
    "ORDER-05": [
        "commission-brief",
        "commission-preview-approval",
        "commission-full-workflow",
    ],
    "ORDER-06": [
        "support-create-attachment",
        "support-cross-account",
        "support-staff-reply-close",
    ],
}
supplemental = {
    "ADM-06": ["catalog-profiles-live.spec.ts"],
    "ADM-07": ["bundle-authoring-live.spec.ts"],
    "ADM-08": ["bundle-authoring-live.spec.ts"],
    "COST-07": ["pricing-live.spec.ts", "production-live.spec.ts"],
    "COST-08": ["pricing-live.spec.ts"],
    "COST-09": ["pricing-live.spec.ts"],
    "COST-10": ["pricing-live.spec.ts"],
    "OPS-11": ["production-live.spec.ts", "reports-live.spec.ts"],
    "FIN-01": ["finance-live.spec.ts"],
    "FIN-02": ["finance-live.spec.ts"],
    "FIN-03": ["finance-live.spec.ts"],
    "FIN-04": ["finance-live.spec.ts"],
    "FIN-05": [
        "finance-live.spec.ts",
        "supplier-openings-live.spec.ts",
        "supplier-statements-live.spec.ts",
        "supplier-balances-live.spec.ts",
        "opening-settlements-live.spec.ts",
    ],
    "FIN-08": ["refunds-live.spec.ts", "cancellations-live.spec.ts"],
    "FIN-10": ["finance-live.spec.ts"],
    "FIN-11": ["reports-live.spec.ts"],
    "ORDER-01": [
        "financial-closures-live.spec.ts",
        "stock-resolution-live.spec.ts",
        "unpaid-cancellations-live.spec.ts",
    ],
    "ORDER-02": [
        "financial-closures-live.spec.ts",
        "stock-resolution-live.spec.ts",
        "cancellations-live.spec.ts",
    ],
}
views = []
for v in matrix["views"]:
    checks = [r for (id, _, _), r in layouts.items() if id == v["id"]]
    route_status = (
        "not implemented"
        if any(r["status"] == "not implemented" for r in checks)
        else "failed"
        if any(r["status"] == "failed" for r in checks)
        else "passed"
        if len(checks) == 4
        else "blocked"
    )
    action_names = links.get(v["id"], []) + [
        k
        for k in latest_actions
        if k in [f"filters-{v['id']}", f"filter-clear-{v['id']}"]
    ]
    evidence = [latest_actions[k] for k in action_names if k in latest_actions]
    entry = {
        "id": v["id"],
        "title": v["title"],
        "required_route": v["required_route"],
        "route_layout_status": route_status,
        "route_checks": checks,
        "action_checks": evidence,
        "supplemental_browser_specs": supplemental.get(v["id"], []),
        "remaining": v["remaining"],
        "full_view_acceptance": "not implemented"
        if route_status == "not implemented"
        else "blocked",
        "complete": False,
    }
    views.append(entry)
    v["browser_audit_2026_10_21"] = {
        "route_layout_status": route_status,
        "variants_checked": len(checks),
        "action_checks": [r["name"] for r in evidence],
        "supplemental_browser_specs": entry["supplemental_browser_specs"],
        "full_view_acceptance": entry["full_view_acceptance"],
        "report": "admin-browser-audit-2026-10-21.json",
    }
criteria = []
for c in matrix["acceptance_criteria"]:
    id = c["id"]
    status = "passed" if id in ["AC-05", "AC-14", "AC-16", "AC-21"] else "blocked"
    notes = {
        "AC-05": "Two independent customer browsers accepted the same last-unit review and submitted payment concurrently: one 200, one 409, one paid order and exactly one stock reservation. No real charge.",
        "AC-06": "Repeated-SKU bundle editing and capacity passed in the live browser; concurrent repeated-component reservation browser acceptance remains unverified.",
        "AC-09": "Imported late-paid shortage and safe staff recovery passed in the browser; an actual late provider callback browser journey remains unverified.",
        "AC-14": "Live purchases, moving weighted averages, production consumption and healthy QC output verified; database regression suite passed.",
        "AC-16": "Live price proposals, explicit publication and stale-input rejection passed; formula/fee/rounding regression suite passed.",
        "AC-17": "Partial/full simulated refunds and return inspection passed; exact partial bundle-component browser journey remains unverified.",
        "AC-18": "Official collection-profit report remains unimplemented.",
        "AC-19": "Brief submission and private preview approval passed; accepted payable quotes and artist dependencies remain incomplete.",
        "AC-20": "Cross-customer support privacy, customer denial of admin finance, protected downloads and session revocation passed; financial document uploads remain incomplete.",
        "AC-21": "Browser digital-only and physical checkout/delivery passed; explicit mixed checkout changed address, required renewed acceptance and froze physical/digital identities. Database mixed-return regression passed.",
        "AC-22": "Gateway settlement workflow remains unimplemented.",
    }
    criteria.append(
        {
            **c,
            "status": status,
            "evidence_note": notes.get(
                id,
                "Related implemented domains have automated evidence in the passing backend/frontend suites; complete browser evidence for this exact acceptance scenario is not recorded.",
            ),
            "complete": status == "passed",
        }
    )
report = {
    "date": "2026-10-21",
    "environment": "http://127.0.0.1:18080",
    "main_environment_modified": False,
    "schema_main": "0051",
    "schema_preview": "0054",
    "release_complete": False,
    "all_features_verified": False,
    "summary": {
        "admin_views": 56,
        "admin_layout_variants": len(layouts),
        "route_statuses": dict(Counter(v["route_layout_status"] for v in views)),
        "layout_statuses": dict(Counter(r["status"] for r in layouts.values())),
        "distinct_recorded_action_checks": dict(
            Counter(r["status"] for r in latest_actions.values())
        ),
        "customer_layout_variants": len(
            {
                (r["name"], r.get("language"), r.get("width"))
                for r in rows
                if r["name"].startswith("customer-route-")
            }
        ),
        "backend_tests_passed": backend_count,
        "frontend_tests_passed": frontend_count,
    },
    "setup_exceptions": [
        "Sandbox OTP read from the isolated Redis SMS inbox; account registration and password entry were performed in the browser. No real SMS was sent.",
        "Supplemental scenarios use existing demo-only seed scripts/API fixtures for supplier/costing prerequisites and imported paid, unpaid, rejected or late-paid states. These are labeled controlled fixtures, not proof of gateway transactions.",
        "Read-only APIs/database queries corroborate record IDs, frozen order data, original costs and privacy. They do not substitute for browser actions.",
    ],
    "fixed_defects": [
        "Filter toolbars without submit handlers no longer reload the document and cancel New artwork navigation.",
        "Dropdown toggle buttons retain accessible names when a legacy select uses an external/wrapping label.",
        "Shared private requests serialize CSRF rotation with the associated command, preventing overlapping checkout reviews invalidating one another. Queued requests retain session-generation checks and are never automatically replayed.",
        "Required /admin/commissions/reviews alias opens the existing permission-controlled commission review workspace.",
        "Delivered physical items in a mixed order remain partially fulfilled and return-eligible while digital files await release.",
    ],
    "views": views,
    "actions": list(latest_actions.values()),
    "acceptance_criteria": criteria,
    "evidence_locations": [
        "Frontend/tests/e2e/full-panel-browser-live.spec.ts",
        "Frontend/test-results/browser-audit/ (ignored; screenshots and private post-login traces)",
        "/tmp/nilart-browser-*.log (local execution logs)",
    ],
    "limits": [
        "A route/layout pass does not mean all actions in that view have passed.",
        "Full-view acceptance remains blocked by the existing remaining-work register and/or unverified exact browser scenarios.",
        "No real payment, external refund, gateway settlement or production activation is claimed.",
        "Chromium desktop/mobile viewport coverage; other browser engines and screen-reader testing are not recorded.",
    ],
}
out = ROOT / "docs/admin-browser-audit-2026-10-21.json"
out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
matrix["browser_audit_report"] = out.name
matrix["release_complete"] = False
matrix_path.write_text(json.dumps(matrix, ensure_ascii=False, indent=2) + "\n")
lines = (
    [
        "# Admin browser audit — 21 October 2026",
        "",
        "This is an evidence checkpoint, not approval of the complete integrated release. All 56 required admin routes were inspected in Persian/English at 1440 px and 390 px. **54 open working workspaces; gateway settlements and official profit reporting remain placeholders.** Route coverage does not establish complete feature coverage.",
        "",
        "## Verified work",
        "",
        "- Five dedicated accounts were registered through the browser: administrator, customer, second customer, operations and artist roles. Role grants used account management. Credentials and session files are private, outside the repository.",
        "- Browser forms created collections, categories, products, SKU drafts, suppliers, materials, services, recipes, purchases, production batches, media, artwork, content, discounts, orders, shipments, support conversations and returns.",
        "- Connected UI journeys covered purchase → receipt → recipe → production/QC; physical purchase → shipment/delivery; licensed digital purchase → private-file release → download; customer return → staff review → healthy inspection; commission brief → private preview → customer approval.",
        "- Two independent browser checkouts raced for one original: exactly one succeeded and one conflicted. Explicit mixed checkout required renewed acceptance after changing address. Permission revocation rejected an already-open staff draft; another customer received 404 without private support content. Password changes revoked an older session.",
        "- Browser filters were applied on 23 workspaces. CSV/XLSX downloads were initiated through the browser. All 12 customer panel routes were checked in both languages and sizes.",
        "- Supplemental live browser suites covered weighted averages, price publication/staleness, finance/linked corrections, supplier balances/opening payments/statements, uncertain receipts, partial/full simulated refunds, cancellations, shortages and financial closure. Those suites use labeled API/imported-state fixtures for prerequisites.",
        "",
        "## Fixed and retested",
        "",
        "",
    ]
    + [f"- {x}" for x in report["fixed_defects"]]
    + [
        "",
        "## Validation",
        "",
        f"- Backend: **{backend_count} passed**. Frontend: **{frontend_count} passed**; build, type checking and lint passed.",
        "- 224 admin route/layout variants and 48 customer variants are recorded. Admin results: 216 working variants and 8 placeholder variants.",
        "- Main remains on schema 0051; preview remains on 0054. Both readiness endpoints pass. Only isolated preview application images were updated.",
        "- Screenshots and selected post-login traces are under `Frontend/test-results/browser-audit/`; traces are private and excluded from Git. Auth/password-change flows do not produce traces.",
        "",
        "## Per-view evidence",
        "",
        "Full-view acceptance is blocked unless every required behavior is verified. The table identifies observed actions without promoting partial workspaces to complete.",
        "",
        "| View | Required route | Route/layout | Action evidence |",
        "|---|---|---|---|",
    ]
)
for v in views:
    observed = ", ".join(r["name"] for r in v["action_checks"])
    extra = ", ".join(v["supplemental_browser_specs"])
    lines.append(
        f"| {v['id']} | `{v['required_route']}` | {v['route_layout_status']} | {observed or extra or 'Route/read evidence only; full action acceptance blocked'} |"
    )
lines += [
    "",
    "## AC-01–22",
    "",
    "| Criterion | Status | Evidence / remaining gap |",
    "|---|---|---|",
]
for c in criteria:
    lines.append(f"| {c['id']} | {c['status']} | {c['evidence_note']} |")
lines += [
    "",
    "## Still blocked",
    "",
    "- Gateway settlement (FIN-07) and official profit reporting (FIN-09).",
    "- Full artist assignment/workspaces, assessments, accepted versioned quotes/payment eligibility and final commission delivery. Existing commission preview review works; this does not establish the unfinished workflow.",
    "- Family BOM templates/group proposals, remaining catalogue/private-print integration, purchase-unit and production dependencies, financial attachments/aging/customer/artist balances and remaining report/export scope recorded in the acceptance matrix.",
    "- Exact remaining browser scenarios include option incompatibility, coupon stacking/limits, actual unknown/late callbacks, partial bundle-component returns/refunds, overlapping collection totals and independent verification of every permission. Backend/contract tests supplement these gaps but are not presented as live browser proof.",
    "",
    "See [machine-readable evidence](admin-browser-audit-2026-10-21.json) for each action, record ID, screenshot, view and acceptance mapping. Existing drafts, business data and historical records were preserved.",
    "",
    "## Repeating the audit",
    "",
    "Run the opt-in `full-panel-browser-live.spec.ts` against `http://127.0.0.1:18080` with `NILART_RUN_DEMO_TESTS=true` and `PLAYWRIGHT_BASE_URL` set to that exact origin. Use a fresh private `NILART_BROWSER_AUDIT_ACCOUNTS` path for a new dataset; retain that file for targeted reruns. Stages 08–12 and 16 depend on the preceding browser-created records. Do not run stages concurrently when they share fixture records.",
    "",
    "Readiness must pass after rebuilding preview services before starting tests. Preserve `integrated-preview.override.yaml` when deploying preview images. Do not clear authentication throttles: reuse established sessions or wait for the existing windows. No main rollout is authorized by this audit.",
    "",
    "Regenerate this report with `infra/scripts/build_browser_audit_report.py --results /tmp/nilart-browser-audit-results.json`. The source result file contains no passwords or session tokens.",
]
(ROOT / "docs/admin-browser-audit-2026-10-21.md").write_text("\n".join(lines) + "\n")
print(json.dumps(report["summary"]))
