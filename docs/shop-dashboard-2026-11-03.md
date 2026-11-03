# Shop monitoring dashboard — 2026-11-03

`/fa/admin` and `/en/admin` now use the shop dashboard, rather than aliasing the stock list. `/admin/stock`, purchases and finance pages remain intact.

## Monitoring

- Cards: paid item sales, orders created, paid orders, average item value per paid order. Equal-length preceding-period comparisons; no fabricated percentages when the previous value is zero.
- Native SVG daily sales area / order columns with exact focus/hover values and accessible daily table. Payment-state distribution and top-five item quantities use historical order snapshots.
- Inclusive Tehran dates, Today/7/30/90-day presets and a Jalali custom calendar (1–93 days). Live orders are the default; sandbox and combined modes are explicitly labelled. Shared date-time picker gained dateOnly support without changing promotion scheduling defaults.
- Current-state actions: paid orders awaiting shipment, open cancellation/return requests, low/out-of-stock published variants, missing prices and incomplete published shipping profiles. Stock threshold configurable from0–1000. Product links retain the exact SKU.
- Current inventory/actions remain separate from period charts; recent orders are scoped to their creation date. No traffic/conversion/profit figures are invented.

## Source semantics

New read-only GET `/api/v1/admin/shop-dashboard`; no migration. `from_date`, `to_date`, `scope=live|sandbox|all`, `low_stock`.

Order count/status/recent orders use created_at. Paid sales, units and paid count use receipt.issued_at and paid/partially_refunded/refunded states. Missing/malformed/naive legacy receipt dates are excluded from paid metrics. Item sales = immutable quantity×unit_amount minus line discount, IRR÷10 normalized to Toman; these are before refunds and exclude separate shipping/additional tax, while tax embedded in item prices remains. They are not net revenue or profit.

Inventory and catalogue only include published parent products and SKUs; low count is positive availability≤threshold, out-of-stock is availability≤0. Shipping completeness reads the published SKU profile, not the latest draft.

Authenticated permission masks: orders.read_all or finance.read may read aggregates; recent orders and current order queues require orders.read_all; inventory requires inventory.manage; catalogue readiness requires catalog.manage. Customer-only and anonymous requests are denied. No-store responses; frontend clears private state on session changes and discards obsolete requests.

## Validation / release

- 5 PostgreSQL tests: time attribution/boundaries, live/sandbox separation, IRR, malformed receipts, permissions, zero periods, date bounds and stock/catalogue readiness.
- 10 frontend tests: chart accessibility/actual numbers/empty states, scope/date/threshold filters, private-state clearing and Jalali date-only support. TypeScript/production build passed.
- Local and production released via `/srv/nilart/releases/shop-dashboard-20261103`; previous images tagged before-shop-dashboard. Focused backend package and current production main registration only; existing deployment routes preserved. No database migration, orders, payments or inventory writes.
- Production browser verified live defaults,7-day scope, sandbox labelling, threshold0 removing low-stock matches,14 published products,62 published variants, and empty real order charts. Direct DB read confirmed no customer_orders rows at verification time; no sample orders were seeded.
