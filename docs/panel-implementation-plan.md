# Complete NilArt panel implementation

Accepted on 2026-10-13. RFP v2 and ui-ux-design-spec define behavior and 129 views; design-reference defines presentation. Preserve Yekan Bakh and the shared dropdown. Extend reference patterns for missing screens. Sandbox-first; no inferred real stock, costs, prices, policies or successful external transactions. FUT-01–03 remain excluded.

## Dependency order

1. Identity/panel access: audited independent permission overrides, roles, restrictions, explicit first-admin bootstrap, password and sessions, verified-phone change, sandbox SMS, shared denied/expired/error states and private cache cleanup.
2. Catalog/media/content: bilingual CRUD and publication for collections/categories/products/SKUs/bundles/artworks; approved public content; versioned public/private media; artist records/settings; search, collection bundles and SEO/SSR.
3. Costing: units/materials/service rates, versioned BOM and SKU overrides, confirmed yield/waste, separate replacement cost, margin/fees/rounding, dependency review and manual price publication.
4. Stock/procurement/production/basic finance: ledgers/reservations, opening stock/adjustments, independent receipts/payments, moving weighted averages, fixed-version production, consumption/WIP/QC/waste, accounts/expenses/cash/liabilities.
5. Commerce: one persisted guest/customer cart, merge, component-derived bundle prices/capacity, RFP discounts, immutable order snapshots, shipping, transactional reservations, sandbox gateway verification and duplicate/ambiguous/late payment handling.
6. Customer/operations service: dashboard/orders/invoices, preferences/addresses/favorites, shipments/tracking, cancellation/inspection/returns and historical partial refunds, private downloads, support/notifications/audit.
7. Commission/artist: persisted private briefs/uploads, labeled sandbox analysis, difficulty/human review, versioned accepted quotes, assignment/deadlines/work/revisions/private delivery, actual costs, artist history/profile.
8. Finance/release readiness: settlement reconciliation without duplicate revenue, historical/replacement and estimated/realized profit, deduplicated collection reporting, cash/inventory/production reports, accountant exports, linked corrections, dashboards and restore/recovery verification.

## Completion contract

Each slice includes additive migrations, server permissions and ownership, exact Origin/fresh CSRF/session rechecks, version conflicts, atomic audits/outbox, generated OpenAPI/client types, original-reference UI and navigation, retained inputs and translated responsive states. Shared PostgreSQL services own stock/money; browser state is not authority. Exact decimal money and explicit currencies; historical snapshots remain immutable.

Map AC-01–22 to tests. Verify concurrency, rollback, repeated callbacks/refunds, stock aggregation, costing units, late payments, private files, revocation and assignment. Compare every page in fa/en and desktop/mobile. Page register must record routes/APIs/permissions and actual acceptance evidence; no fake dashboard records. Run appropriate backend/frontend/browser/build checks, update progress/handoff, commit and push to codex/foundation-ai-handoff. Remote CI is reported separately.

Production activation remains gated on approved business data, policies, providers/credentials and deployment configuration. Full RFP phase 2 is required. Existing prototypes remain disabled until their business workflow is connected.
