# Tapin shipping preparation

The integration is disabled by default and has now been enabled in the local environment after read-only verification. No live registration has been performed. The current token, active shop, destinations, boxes and a real read-only price quote were verified locally on 2026-11-02; the production server still receives a browser security challenge. See [live verification](tapin-live-verification-2026-11-02.md). Customer checkout shipping now uses the dynamic carrier quote flow described in [notebook customization and carrier pricing](notebook-customization-and-carrier-pricing.md). The separate staff shipment quote does not retroactively alter an accepted order.

## Configuration and activation

Set these backend environment variables locally, without committing secrets:

- `NILART_TAPIN_ENABLED=false`
- `NILART_TAPIN_SHOP_ID=` (shop UUID)
- `NILART_TAPIN_TOKEN=` (raw API token, without a Bearer prefix)

After Tapin activates the shop, supply the credentials, enable the integration and restart the API. Staff with `fulfillment.manage` can check the connection in the shipment page. Never expose the token to the browser. Confirm the shop/detail active status during activation: the detailed endpoint documents status 1 as active, despite a contradictory overview table.

## Staff workflow

For a paid, packed, non-sandbox order, enter the actual recipient, destination codes, box, product weights and packaging weight. Their total must match the packed shipment weight. Fetch province/city and box references, request an optional carrier quote, then explicitly confirm initial registration. This uses `register_type: 0`; it does not request a barcode or dispatch the order automatically. Refresh after barcode creation in Tapin and download the sanitized printable HTML label.

Registration has a persisted operation key, a single active registration per shipment, version/payment checks and an audit trail. It is never automatically retried. A timeout leaves an unknown result: check Tapin's panel, then reconcile the existing numeric provider order ID. Reconciliation verifies recipient, destination, parcel and product details before binding it. Parcel edits/cancellation are locked while registration is pending, unknown or registered. Carrier status does not automatically move stock or mark an order dispatched/delivered.

## Remaining live acceptance checks

Once active, verify authentication, destination and box codes, actual price units, registration, barcode availability and printed label with a deliberately approved real shipment. Existing sandbox dispatch restrictions remain in place; this preparation does not enable real payment/dispatch globally. Test orders cannot be sent to Tapin. No actual shipment or label has been created during implementation.

## References

Official public v2 documentation: https://api.tapin.ir/api/v2/public/doc/ (shop_detail, province_tree, post_order_packing_box_list, order_check_price, order_register, order_detail, order_label). Authentication sends the raw token as `Authorization: YOUR_TOKEN`, without `Bearer`, per https://docs.tapin.ir/GetToken/. Provider HTML is sanitized: scripts, external resources and arbitrary styles are removed, so verify the final label with the carrier before operational use.

## Validation

Unit tests cover request mapping, currency conversion, inactive shop, authentication failures, ambiguous responses without retries, parcel matching and label sanitization. PostgreSQL integration tests cover disabled/sandbox/CSRF guards, persisted registration replay, duplicate prevention, status refresh, uncertain result reconciliation and parcel cancellation locking. These are mocked carrier tests, not proof of live carrier acceptance.
