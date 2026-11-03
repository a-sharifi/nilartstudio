# Three owner-requested special offers

Enabled in production via audited marketing command `11df46dc-dc30-4a56-b074-dd93e58aa62b`, settings version 2 → 3. Owner requested some products in special offers; 10% off for seven days was stated before activation.

Window: 2026-11-03T07:48:22.594676Z through (exclusive) 2026-11-10T07:48:22.594676Z; Tehran 12–19 Aban 1405, 11:18.

| SKU | Base (toman) | Sale (toman) |
|---|---:|---:|
| NIL-GAV-BOOKMARK-1 | 150000 | 135000 |
| NIL-LOVE-NOTEBOOK-A5-WRITING-PAPER | 598000 | 538200 |
| NIL-QOLCHE-SKETCHBOOK-A5-KRAFT-DARK-70GSM | 298000 | 268200 |

Prechecks: parent and SKU published, available quantity at least one, sale price below base and above recorded unit/average inventory cost. Exact SKU prices and cost were checked again before applying. No catalogue base price, inventory or cost was rewritten; the promotion overlay expires automatically. Existing welcome banner/coupon and unrelated offers were preserved. Discount applies to the named SKU, not every variant. Existing checkout coupon eligibility/stacking was not changed.

Verified: public `/api/v1/promotions/sales` returns the three effective discounts; public SKU catalogue returns correct sale and original prices; production admin displays all three active cards with Jalali scheduling. No order/payment created. The equivalent owner SKU catalogue is absent locally, so these production-specific records were not seeded into the local test catalogue.
