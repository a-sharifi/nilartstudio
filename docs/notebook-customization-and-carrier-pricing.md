# Notebook customization and carrier pricing — 2026-11-02

This supersedes the former flat-rate shipping calculation for future checkouts. Existing orders retain their accepted totals and shipping policies.

## Owner-approved local data

- The two bookmark variants currently present in this local database now sell for 150,000 IRT each. Each has one physical unit valued at 30,000 IRT. Versioned price audits and inventory movements record the change; historical orders and movements were not rewritten. No additional bookmark designs were silently imported.
- Twenty published SKU profiles now have estimated dimensions and weights. Bookmarks use 10 × 5 × 0.3 cm, 50 g. The owner explicitly permitted estimates rather than measurements.
- Notebook paper weight = paper area in m² × GSM × sheet count. Sizes come from the selected catalogue combination (A3/A4/A5/A6); sheet counts come from that combination, falling back to 40 for sketchbooks and 80 for ruled notebooks. GSM comes from documented product specifications/slug, otherwise 127 for sketchbooks and 80 for ruled notebooks. These fallbacks are estimates, not measurements.
- Cover estimate: two 2 mm boards (3 mm when selected), density 700 kg/m³; 25 g for binding. Paper caliper estimate 0.12 mm at 100 GSM, scaled by GSM; an additional 2 mm accommodates binding. SKU editor fields allow staff to replace estimates with measurements and clear the estimate flag.
- Existing sticker-sheet dimensions use 12.7 × 10 × 0.2 cm and estimated 20 g.
- Initial parcel policy: estimated 100 g packaging and 1 cm padding on each side, editable per shipping method in business settings. These are explicit initial assumptions and should be checked against actual packed goods.

## Checkout shipping

The active shipping method now has `carrier=tapin`. Its base and per-kg values are unused; there is no manual price fallback. The prior free-shipping threshold above 2,000,000 IRT remains in effect. Tax, return and stock-reservation policies are preserved.

The server stacks item dimensions conservatively, adds padding, and picks the smallest fitting box offered by Tapin. Products, counts, weights, destination codes, insured service and packaging weight are sent to Tapin's public v2 check-price endpoint. Paid per-unit values account for applied coupon allocations. Provider rial totals are converted to toman explicitly.

Read-only carrier I/O runs through the authenticated, CSRF-protected shipping-quote endpoint after releasing account/basket/catalogue/settings locks. Quotes are cached for five minutes, bound to account, basket contents, published profile revisions, address, discount and shipping settings. Checkout review only consumes a matching unexpired quote; no carrier call occurs during final acceptance. Changed or expired terms require a new review. No registration, payment or stock movement occurs when requesting a quote. The accepted quote and package geometry are frozen in the order's checkout terms.

Tapin remains disabled and unconfigured while the shop is inactive. Therefore live rates cannot yet be verified and physical checkout remains unavailable rather than charging an invented postage amount. Carrier responses, access failures, destination ambiguity, missing dimensions and unavailable boxes are surfaced as unavailable quotes.

## Custom notebook requests and portfolio

Customer entry: `/fa/commissions/notebook` (English equivalent available). Notebook product pages link to it with the selected SKU. A signed-in customer can choose the notebook, request a custom cover or execution of an existing digital design, describe the idea and upload up to three private reference images. Submission uses the existing durable commission receipt and exact-retry mechanism. The notebook SKU/title/code and design type are pinned in the brief and displayed to both customer and staff.

Requests are explicitly for review and quotation; no purchase, inventory reservation or final custom-design price is inferred. Existing artwork approval does not implicitly become notebook purchase approval.

Six public cover derivatives were prepared from `/home/ez/Documents/nilart/merged/nilartstudio/design-prints/notebooks/special-design`: Maryam & Ali, Sadra & Sepideh, Mahsa, Delvin, Rana & Javad, and Saadi. Source reference photographs, original print files, PDFs and ZIP packages remain private.

Portfolio images use the existing approved media library and published collection profile (`fb08c6fa-0620-4cc1-8bd4-47effb18342f`). Staff can add/remove/reorder images and edit bilingual captions with the gallery editor at `/fa/admin/collections/fb08c6fa-0620-4cc1-8bd4-47effb18342f/profile`. The commissions administration page links directly to this editor. Media revocation is respected by public gallery reads.

## Validation and remaining activation

Database integration tests cover disabled carrier behavior without flat fallback, smallest fitting box, exact rial/toman conversion, frozen rates, caching/expiry, changed destinations and pinned notebook request identity/idempotency. All 70 backend tests passed, including the existing settings, media, profile, checkout, commission and Tapin tests. Frontend tests cover portfolio/guest login, chosen notebook submission, uncertain-request locking and existing affected forms. Production build, lint and route checks are part of the local verification.

Live acceptance still requires the owner to activate Tapin and supply backend Shop ID/token, then verify a carrier quote and actual packed weight/label. Existing real-payment/dispatch gates are unchanged.

Official documentation: https://api.tapin.ir/api/v2/public/doc/?fn=order_check_price ; https://api.tapin.ir/api/v2/public/doc/?fn=post_order_packing_box_list ; https://api.tapin.ir/api/v2/public/doc/?fn=province_tree .
