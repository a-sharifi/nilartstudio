# Admin browser audit — 21 October 2026

This is an evidence checkpoint, not approval of the complete integrated release. All 56 required admin routes were inspected in Persian/English at 1440 px and 390 px. **54 open working workspaces; gateway settlements and official profit reporting remain placeholders.** Route coverage does not establish complete feature coverage.

## Verified work

- Five dedicated accounts were registered through the browser: administrator, customer, second customer, operations and artist roles. Role grants used account management. Credentials and session files are private, outside the repository.
- Browser forms created collections, categories, products, SKU drafts, suppliers, materials, services, recipes, purchases, production batches, media, artwork, content, discounts, orders, shipments, support conversations and returns.
- Connected UI journeys covered purchase → receipt → recipe → production/QC; physical purchase → shipment/delivery; licensed digital purchase → private-file release → download; customer return → staff review → healthy inspection; commission brief → private preview → customer approval.
- Two independent browser checkouts raced for one original: exactly one succeeded and one conflicted. Explicit mixed checkout required renewed acceptance after changing address. Permission revocation rejected an already-open staff draft; another customer received 404 without private support content. Password changes revoked an older session.
- Browser filters were applied on 23 workspaces. CSV/XLSX downloads were initiated through the browser. All 12 customer panel routes were checked in both languages and sizes.
- Supplemental live browser suites covered weighted averages, price publication/staleness, finance/linked corrections, supplier balances/opening payments/statements, uncertain receipts, partial/full simulated refunds, cancellations, shortages and financial closure. Those suites use labeled API/imported-state fixtures for prerequisites.

## Fixed and retested


- Filter toolbars without submit handlers no longer reload the document and cancel New artwork navigation.
- Dropdown toggle buttons retain accessible names when a legacy select uses an external/wrapping label.
- Shared private requests serialize CSRF rotation with the associated command, preventing overlapping checkout reviews invalidating one another. Queued requests retain session-generation checks and are never automatically replayed.
- Required /admin/commissions/reviews alias opens the existing permission-controlled commission review workspace.
- Delivered physical items in a mixed order remain partially fulfilled and return-eligible while digital files await release.

## Validation

- Backend: **718 passed**. Frontend: **434 passed**; build, type checking and lint passed.
- 224 admin route/layout variants and 48 customer variants are recorded. Admin results: 216 working variants and 8 placeholder variants.
- Main remains on schema 0051; preview remains on 0054. Both readiness endpoints pass. Only isolated preview application images were updated.
- Screenshots and selected post-login traces are under `Frontend/test-results/browser-audit/`; traces are private and excluded from Git. Auth/password-change flows do not produce traces.

## Per-view evidence

Full-view acceptance is blocked unless every required behavior is verified. The table identifies observed actions without promoting partial workspaces to complete.

| View | Required route | Route/layout | Action evidence |
|---|---|---|---|
| ADM-01 | `/admin` | passed | Route/read evidence only; full action acceptance blocked |
| ADM-02 | `/admin/collections` | passed | catalogue-collections |
| ADM-03 | `/admin/categories` | passed | catalogue-categories |
| ADM-04 | `/admin/products` | passed | catalogue-products, sku-draft |
| ADM-05 | `/admin/products/:id/edit` | passed | catalogue-products |
| ADM-06 | `/admin/products/:id/variants` | passed | sku-option-mapping-publication |
| ADM-07 | `/admin/bundles` | passed | filters-ADM-07 |
| ADM-08 | `/admin/bundles/:id/edit` | passed | bundle-authoring-live.spec.ts |
| ADM-09 | `/admin/discounts` | passed | discount-rule-history, filters-ADM-09, filter-clear-ADM-09 |
| ADM-10 | `/admin/discounts/:id/edit` | passed | discount-rule-history |
| ADM-11 | `/admin/media` | passed | media-upload-publication, filters-ADM-11 |
| ADM-12 | `/admin/artworks` | passed | original-artwork, digital-artwork, physical-checkout, digital-checkout, licensed-digital-delivery, mixed-checkout-renewed-acceptance, last-unit-browser-concurrency, filters-ADM-12 |
| ADM-13 | `/admin/users` | passed | role-admin, role-staff, role-artist, role-boundaries, permission-revocation |
| ADM-14 | `/admin/artists` | passed | role-artist, artist-workspace |
| ADM-15 | `/admin/content` | passed | content-draft-publication |
| ADM-16 | `/admin/settings` | passed | business-settings |
| COST-01 | `/admin/materials` | passed | materials, filters-COST-01, filter-clear-COST-01 |
| COST-02 | `/admin/materials/:id/edit` | passed | materials |
| COST-03 | `/admin/service-rates` | passed | service-rates, filters-COST-03, filter-clear-COST-03 |
| COST-04 | `/admin/boms` | passed | recipe-authoring, filters-COST-04, filter-clear-COST-04 |
| COST-05 | `/admin/boms/:id/edit` | passed | recipe-authoring |
| COST-06 | `/admin/costing/cutting` | passed | cutting-layout |
| COST-07 | `/admin/costing` | passed | filters-COST-07, filter-clear-COST-07 |
| COST-08 | `/admin/pricing/:sku` | passed | pricing-live.spec.ts |
| COST-09 | `/admin/pricing/reviews` | passed | filters-COST-09 |
| COST-10 | `/admin/pricing/reviews/:id` | passed | pricing-live.spec.ts |
| OPS-01 | `/admin/inventory` | passed | original-opening, purchase-post-receive, purchase-production-qc, filters-OPS-01 |
| OPS-02 | `/admin/inventory/:item/movements` | passed | original-opening |
| OPS-03 | `/admin/inventory/adjustments/new` | passed | original-opening |
| OPS-04 | `/admin/suppliers` | passed | supplier-create, filters-OPS-04, filter-clear-OPS-04 |
| OPS-05 | `/admin/purchases` | passed | purchase-post-receive, filters-OPS-05 |
| OPS-06 | `/admin/purchases/:id` | passed | purchase-post-receive |
| OPS-07 | `/admin/purchases/:id/receipts/new` | passed | purchase-post-receive |
| OPS-08 | `/admin/production` | passed | purchase-production-qc, filters-OPS-08 |
| OPS-09 | `/admin/production/:id` | passed | purchase-production-qc |
| OPS-10 | `/admin/production/:id/qc` | passed | purchase-production-qc |
| OPS-11 | `/admin/waste` | passed | filters-OPS-11 |
| FIN-01 | `/admin/finance` | passed | filters-FIN-01 |
| FIN-02 | `/admin/finance/movements` | passed | filters-FIN-02 |
| FIN-03 | `/admin/finance/accounts` | passed | filters-FIN-03 |
| FIN-04 | `/admin/finance/expenses` | passed | filters-FIN-04 |
| FIN-05 | `/admin/finance/balances` | passed | filters-FIN-05 |
| FIN-06 | `/admin/finance/payments` | passed | Route/read evidence only; full action acceptance blocked |
| FIN-07 | `/admin/finance/settlements` | not implemented | Route/read evidence only; full action acceptance blocked |
| FIN-08 | `/admin/finance/refunds` | passed | filters-FIN-08 |
| FIN-09 | `/admin/reports/profit` | not implemented | Route/read evidence only; full action acceptance blocked |
| FIN-10 | `/admin/reports/cashflow` | passed | finance-live.spec.ts |
| FIN-11 | `/admin/reports/inventory` | passed | reports-live.spec.ts |
| FIN-12 | `/admin/finance/export` | passed | financial-browser-exports |
| ORDER-01 | `/admin/orders` | passed | physical-checkout, digital-checkout, last-unit-browser-concurrency, filters-ORDER-01, filter-clear-ORDER-01 |
| ORDER-02 | `/admin/orders/:id` | passed | physical-fulfillment, licensed-digital-delivery |
| ORDER-03 | `/admin/shipments/:id` | passed | physical-fulfillment |
| ORDER-04 | `/admin/returns/:id` | passed | customer-return-request, return-approval-inspection |
| ORDER-05 | `/admin/commissions/reviews` | passed | commission-brief, commission-preview-approval, commission-full-workflow, filters-ORDER-05, filter-clear-ORDER-05 |
| ORDER-06 | `/admin/support` | passed | support-create-attachment, support-cross-account, support-staff-reply-close |
| ORDER-07 | `/admin/audit` | passed | filters-ORDER-07, filter-clear-ORDER-07 |

## AC-01–22

| Criterion | Status | Evidence / remaining gap |
|---|---|---|
| AC-01 | blocked | Related implemented domains have automated evidence in the passing backend/frontend suites; complete browser evidence for this exact acceptance scenario is not recorded. |
| AC-02 | blocked | Related implemented domains have automated evidence in the passing backend/frontend suites; complete browser evidence for this exact acceptance scenario is not recorded. |
| AC-03 | blocked | Related implemented domains have automated evidence in the passing backend/frontend suites; complete browser evidence for this exact acceptance scenario is not recorded. |
| AC-04 | blocked | Related implemented domains have automated evidence in the passing backend/frontend suites; complete browser evidence for this exact acceptance scenario is not recorded. |
| AC-05 | passed | Two independent customer browsers accepted the same last-unit review and submitted payment concurrently: one 200, one 409, one paid order and exactly one stock reservation. No real charge. |
| AC-06 | blocked | Repeated-SKU bundle editing and capacity passed in the live browser; concurrent repeated-component reservation browser acceptance remains unverified. |
| AC-07 | blocked | Related implemented domains have automated evidence in the passing backend/frontend suites; complete browser evidence for this exact acceptance scenario is not recorded. |
| AC-08 | blocked | Related implemented domains have automated evidence in the passing backend/frontend suites; complete browser evidence for this exact acceptance scenario is not recorded. |
| AC-09 | blocked | Imported late-paid shortage and safe staff recovery passed in the browser; an actual late provider callback browser journey remains unverified. |
| AC-10 | blocked | Related implemented domains have automated evidence in the passing backend/frontend suites; complete browser evidence for this exact acceptance scenario is not recorded. |
| AC-11 | blocked | Related implemented domains have automated evidence in the passing backend/frontend suites; complete browser evidence for this exact acceptance scenario is not recorded. |
| AC-12 | blocked | Related implemented domains have automated evidence in the passing backend/frontend suites; complete browser evidence for this exact acceptance scenario is not recorded. |
| AC-13 | blocked | Related implemented domains have automated evidence in the passing backend/frontend suites; complete browser evidence for this exact acceptance scenario is not recorded. |
| AC-14 | passed | Live purchases, moving weighted averages, production consumption and healthy QC output verified; database regression suite passed. |
| AC-15 | blocked | Related implemented domains have automated evidence in the passing backend/frontend suites; complete browser evidence for this exact acceptance scenario is not recorded. |
| AC-16 | passed | Live price proposals, explicit publication and stale-input rejection passed; formula/fee/rounding regression suite passed. |
| AC-17 | blocked | Partial/full simulated refunds and return inspection passed; exact partial bundle-component browser journey remains unverified. |
| AC-18 | blocked | Official collection-profit report remains unimplemented. |
| AC-19 | blocked | Brief submission and private preview approval passed; accepted payable quotes and artist dependencies remain incomplete. |
| AC-20 | blocked | Cross-customer support privacy, customer denial of admin finance, protected downloads and session revocation passed; financial document uploads remain incomplete. |
| AC-21 | passed | Browser digital-only and physical checkout/delivery passed; explicit mixed checkout changed address, required renewed acceptance and froze physical/digital identities. Database mixed-return regression passed. |
| AC-22 | blocked | Gateway settlement workflow remains unimplemented. |

## Still blocked

- Gateway settlement (FIN-07) and official profit reporting (FIN-09).
- Full artist assignment/workspaces, assessments, accepted versioned quotes/payment eligibility and final commission delivery. Existing commission preview review works; this does not establish the unfinished workflow.
- Family BOM templates/group proposals, remaining catalogue/private-print integration, purchase-unit and production dependencies, financial attachments/aging/customer/artist balances and remaining report/export scope recorded in the acceptance matrix.
- Exact remaining browser scenarios include option incompatibility, coupon stacking/limits, actual unknown/late callbacks, partial bundle-component returns/refunds, overlapping collection totals and independent verification of every permission. Backend/contract tests supplement these gaps but are not presented as live browser proof.

See [machine-readable evidence](admin-browser-audit-2026-10-21.json) for each action, record ID, screenshot, view and acceptance mapping. Existing drafts, business data and historical records were preserved.

## Repeating the audit

Run the opt-in `full-panel-browser-live.spec.ts` against `http://127.0.0.1:18080` with `NILART_RUN_DEMO_TESTS=true` and `PLAYWRIGHT_BASE_URL` set to that exact origin. Use a fresh private `NILART_BROWSER_AUDIT_ACCOUNTS` path for a new dataset; retain that file for targeted reruns. Stages 08–12 and 16 depend on the preceding browser-created records. Do not run stages concurrently when they share fixture records.

Readiness must pass after rebuilding preview services before starting tests. Preserve `integrated-preview.override.yaml` when deploying preview images. Do not clear authentication throttles: reuse established sessions or wait for the existing windows. No main rollout is authorized by this audit.

Regenerate this report with `infra/scripts/build_browser_audit_report.py --results /tmp/nilart-browser-audit-results.json`. The source result file contains no passwords or session tokens.
