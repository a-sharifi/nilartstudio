# Simple accounting and owner catalogue — 2026-10-31

The owner replaced the earlier broad accounting workflow with three everyday screens:

- `/fa/admin/stock` (also the admin, inventory and finance landing aliases): manual unit cost, selling price and counted stock per SKU. Reserved stock is shown separately and cannot be removed by a count.
- `/fa/admin/purchases`: supplier (optional), date, quantity, unit cost, total and retained purchase history. Choose a variant in the stock screen to record a purchase; it immediately increases its authoritative stock.
- `/fa/admin/finance/profit`: paid item sales after discounts/refunds, frozen dispatched inventory costs and recorded operating expenses. Tax/shipping are excluded. Purchasing inventory does not expense it twice. Incomplete fulfillment costs prevent a definitive profit total.

English equivalents use `/en/`. The sidebar shows these simple entries; earlier advanced routes and posted records remain available without deleting history. Migration `0055` adds manual cost versions and immutable simple command receipts. Exact decimal amounts remain server-authoritative. Expected versions, fresh permission/CSRF checks, operation IDs, audit/outbox writes and stock reservations remain enforced.

Editing unit cost revalues current unsold inventory through an appended movement, preserving historical fulfillment costs. Incoming purchases retain weighted-average inventory valuation; the latest entered unit cost is the next entry default. A purchase record does not claim that a bank payment happened. Repeated commands return the original receipt. Existing records are never reset by this release.

## Supplied originals

Three owner ZIPs in `/home/ez/Documents/nilart` were safely merged under `merged/nilartstudio/design-prints`. Duplicate identical paths were retained once; conflicting paths would stop extraction. Original archives remain unchanged.

`/home/ez/Documents/nilart/nilartstudio-combined.zip` contains all **1,861 unique files**, 4,750,629,915 compressed bytes. Every filename, original CRC and uncompressed size matches the input archives; `combined-verification.json` records this check.

Five collections: gorbe (گربه), roh (روح), gav (گاو), qolche (original supplied spelling), love (عشق). Each has two product families:

- Sketchbook: A3/A4/A5 × cream drawing 110 gsm, cream drawing 127 gsm, coffee kraft 100 gsm, dark kraft 70 gsm. The supplied back-cover metadata specifies 40 leaves.
- Ruled notebook: A3/A4/A5, writing paper, 80 leaves per supplied back cover.

This gives **10 products and 75 selectable variants**, with bilingual size/paper options. Each variant has its own front, interior and paper/back-cover gallery references. The collection and product galleries use approved immutable media revisions. Physical delivery weights and return terms remain explicitly unconfigured; no prices, costs or stock were invented.

`infra/scripts/prepare-owner-catalog.py` produces 120 display JPEGs (maximum 1600 px, quality 90) and smaller WebP derivatives (maximum 480 px, quality 65), plus a provenance manifest under `/home/ez/Documents/nilart/web-ready`. The supplied transparent logo is resized into `Frontend/public/brand/nilart-logo.webp`; homepage cover illustrations are original supplied artwork. Print PDFs, source art and production scripts are kept outside public assets.

Public media content accepts `?thumbnail=true`, returning a 480 px, quality-65 WebP. Product cards, collection cards and gallery thumbnails use this derivative; the main gallery and zoom use the higher-quality approved original derivative. Publication revocation is checked for both formats.

`infra/scripts/import-owner-catalog.py` imports through normal authenticated, audited application APIs. Stable import IDs and existing-record checks allow interrupted imports to resume. It uses one login CSRF token for its serialized commands, avoiding repeated session-bootstrap requests. The optional transport endpoint is limited to Docker API or loopback; the configured public Origin is still checked. Credentials are read from a private file and never printed.

## Verification

- 42 database-backed tests passed: simple entry/purchase, duplicate receipt, stale version, reserved stock, permission revocation, immutable prior costs, frozen sales profit, incomplete profit, stock ledger and approved media/profile workflows.
- WebP test verifies MIME type, 480×360 dimensions from a 1600×1200 original, smaller bytes, and revocation denial.
- Frontend type checking and targeted gallery/inventory checks pass; production images built and readiness verified.
- Real Chrome isolated-demo journey: QA variant cost 100,000, sale price 150,000, stock count 8; purchase two at 120,000 adds 240,000 purchase history and increases stock to 10 (one existing reservation remains). Reload and the purchase/profit screens corroborate the recorded outcome. Test amounts exist only in the isolated demo.
- Real owner catalogue imported in both isolated demo and public server; public collection API reports five published collections with approved covers. No synthetic financial records were imported into the public database.

The earlier full-release acceptance remains separate. Real SMS/payment integrations and missing shipping/policy configuration are not supplied or inferred by this change.

### Final browser verification — 2026-11-01

Confirmed the final deployed Persian stock table shows human-readable size/paper labels and compact icon actions, the English table retains recorded demo amounts, and the public A5/127-gsm gallery switches to its matching interior and back-cover revisions. Public WebP thumbnail returned a valid 340×480 image. Main schema is `0055`, with 75 owner SKUs and zero synthetic simple-accounting commands. Public readiness and all demo service health checks passed after the final build. The combined ZIP remains available at the path above.

### Bookmark addition — 2026-11-01

Imported the supplied latest branded bookmark sheets: gorbe/roh/gav v3 and qolche v4. Each contains three independently selectable designs; the transparent artwork was split into three equal sheet regions, alpha-trimmed and padded on white without redrawing or removing the supplied logo. Added four bookmark products, twelve SKU/design mappings, approved product and per-SKU images, and the Bookmarks category in both the public site and isolated demo. Display JPEGs and quality-65 WebP thumbnails are under `/home/ez/Documents/nilart/bookmarks-web-ready`; the originals remain unchanged. No Love bookmark source exists in the supplied archives, so none was invented. Costs, selling prices, stock, dimensions and shipping weight remain unset. The same simple stock/purchase/profit screens handle the new SKUs. Total catalogue: 14 products and 87 SKUs.

### Owner-confirmed names — 2026-11-01

Persian display names are now **غولچه** for `qolche` and **لاو** for `love`, including their notebook/sketchbook/bookmark titles and published product/SKU gallery alt text. Applied through versioned catalogue commands in public and isolated demo databases. Stable URLs, SKU codes, English names and historical order identities remain unchanged. Source preparation manifests use the confirmed Persian names for future imports.
