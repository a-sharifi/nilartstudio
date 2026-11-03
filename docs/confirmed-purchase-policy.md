# Owner-confirmed purchase policy — 2026-11-02

Historical initial confirmation. Shipping and bookmark inventory were subsequently updated: see [notebook customization and carrier pricing](notebook-customization-and-carrier-pricing.md). Existing order snapshots retain these original terms.

Initially confirmed in this chat and applied to the local application:

- Product prices include 10% tax. No additional product tax is charged.
- Nationwide Iran delivery: 150,000 toman flat, no weight surcharge or limit.
- Free shipping strictly above 2,000,000 toman of discounted item subtotal, excluding shipping.
- Returns within 7 days after delivery, only with original product packaging unopened.
- Physical delivery and returnability for all current notebook, sticker and bookmark variants.
- Reserve available stock for 15 minutes. Existing failure/expiry release and stock checks remain authoritative.
- Explicitly authorized test inventory: one unit per variant, zero total valuation. Never use sale prices as inventory costs.

## Recorded local state

Business settings revision 1; 20 SKU opening movements (one unit and zero value each); 20 published physical-delivery commerce profiles. Operations use the existing local administrator identity for audit attribution and explicitly state the owner's local test setup in their reasons. No authentication credential or permission was changed. Existing sale prices, order history and commission pricing were preserved.

The local database was at migration 0051; existing project migrations were applied through 0057 before deploying current API code. Website and API were rebuilt using local runtime images.

## Calculation and compatibility

`tax_amount` remains the **additional** tax charge for compatibility with order totals, gross paid component shares and refunds. For inclusive prices it is zero; the included portion is frozen separately as `checkout_terms.policy.included_tax_amount` and displayed as included tax. For example 110,000 toman gross includes 10,000 toman tax, without adding another 11,000. Existing exclusive-tax historical orders are unchanged. Discounted gross subtotal determines both the included portion and free shipping. Frozen checkout fingerprints include the new tax/shipping policy.

Physical commerce-only SKU profiles can publish without gallery assets; media checks still apply to any supplied gallery. Missing weight is permitted only with configured flat, uncapped shipping. Weight-based or weight-capped checkout/stock review still requires measured weights. No weight or photograph was invented.

## Verification

- 35 settings/checkout/stock database tests passed before the commerce-profile extension; 5 catalogue-profile tests passed afterwards. The final checkout suite passed all 11 cases, including inclusive-tax totals, strict free-shipping threshold, accepted snapshots, and weight-free flat shipping versus blocked weight-based shipping.
- 14 checkout/address/settings frontend tests passed, plus a separate 10 settings/privacy-test run.
- All 6 business-settings browser scenarios passed, including lost acknowledgement, retry, conflict, permission and Persian mobile behavior.
- Production frontend build and backend lint passed.
- Live catalogue read/calculation verification passed for all 17 published priced variants: correct gross totals, shipping, zero added tax and available 15-minute stock reservation policy. Temporary address was rolled back; no payment or order was created.

## Remaining catalogue data

Three test variants still have no sale price and remain unavailable for checkout:
`TEST-DESIGN-CATS-BOOK`, `TEST-DESIGN-CATS-HARDCOVER`, `TEST-DESIGN-CATS-RULED`.
No sale price was guessed. No real gateway charge or external carrier operation was attempted.
