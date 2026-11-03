# Integrated admin release — implementation progress

The requested release is **in progress, not complete**. `admin-integrated-acceptance.json` is the canonical56-view/AC-01–22 checklist. Existing historical notes do not supersede this matrix. Final main rollout is held until mandatory acceptance passes.

## Browser audit continuation — 2026-10-22

Latest server follow-up: pinned SKU mappings now supply authoritative basket option labels/UUID selections, which existing checkout acceptance and order snapshots preserve. Real browser zero-charge order `3f7f9917-7180-43f6-a5e0-d3d936cfe3c1` retains Small/کوچک after reviewed mapping v3 publication. Full backend suite 721 passed, zero skipped; preview API/worker/scheduler rebuilt, main unchanged. Synthetic SKU now explicitly priced 0 IRT with physical 100g profile v1 and approved gallery; one unit committed to this unshipped test order, admin basket empty. This supersedes the older historical-label gap below; remaining multi-SKU/financial/artist/release gaps still apply.

Latest correction: public authored options now load frozen published SKU mappings from the existing API, with identity validation, bounded request concurrency and safe fallback for incompatible historical definitions. QA mapping v2 has selectable Small and intentionally unsupported QA Large; browser draft isolation/review/publication/fa/en checks pass. 11 focused tests, build/lint pass, preview web rebuilt. This supersedes the raw-SKU-only display gap below; AC-03 exact notebook/stock transitions and server-side historical option labels still remain open. Main unchanged.

Basket follow-up: live quantity/reload/edit/invalid-zero/Persian-digit/remove-undo checks pass against real preview. Fixed demo disclosure/accessibility label on live basket rows; 7 focused tests, lint/build pass and preview rebuilt. Retained preview admin basket has synthetic RSV-e7134e0e quantity 3. Newly confirmed gap: current published QA Size/Small mapping is not rendered as authored public option families; AC-03 remains blocked. See audit for exact action limits.

Follow-up: synthetic product memberships now persist across two collections and one category, and populated public filters return the same product/SKU. Corrected live collection cards using demo pricing/favorites and false out-of-stock labels for missing prices; locale links now explicit. Browser fa/en retest, 8 focused tests, lint and build pass. AC-01/02 shared stock-changing purchase remains open because this SKU lacks a published price. See the audit follow-up for exact evidence.

See `admin-browser-audit-2026-10-22.md`. Fixed shop URL filters being discarded against the empty loading catalogue. Real-browser English/Persian reloads and selective chip removal pass in preview; 3 focused tests, production build and typecheck pass. Main untouched; populated collection acceptance and the previously recorded release gaps remain open.

## Browser audit — 2026-10-21

[Audit and per-view evidence](admin-browser-audit-2026-10-21.md) records 224 admin layout variants, 48 customer variants and connected real-browser actions. Five test roles and their synthetic records were created only in preview. Fifty-four required routes load their workspaces; settlement/profit remain placeholders. The required commission review alias now reaches the existing preview-review workflow, while assessments/quotes/artist assignments remain incomplete. Fixes cover default filter submission, dropdown accessibility, CSRF-command races and partial mixed-order fulfillment/returns. Backend718/frontend434 pass; no migration or main rollout. Full-view and release acceptance remain false.

## Baseline

Main schema0051;692 backend and412 frontend tests passed before extension. Existing dirty workspace was preserved. No main business records or private files were changed.

## Catalogue stage under verification

Migration0052 adds isolated managed bundle documents and immutable command revisions, with no backfill. Bundle definitions support bilingual drafts, explicit publish/unpublish, components/allowed choices, repeated-component aggregation, collections, approved immutable gallery versions/ordering/alt text, fixed/percentage discounts, packaging/service costs and explicit coupon stacking. Drafts retain the prior published definition. Legacy bundles are projected into reviewed drafts without inventing missing gallery/costs. Internal costs remain private.

New admin contracts: `/api/v1/admin/catalog/bundles`, `/{id}`, `/{id}/history`, `/{id}/commands/{operation_id}` and bounded SKU/collection/approved-media choices. Commands use fresh catalogue permissions, versions, actor-bound exact receipts, catalogue/media locks, atomic audit/outbox and uncertain-result recovery. Public gallery delivery uses approved immutable media versions; unpublishing media revokes public access. Percentage previews and server quotes use matching half-up micro-unit rounding; existing fixed discounts stay compatible.

The shared bundle editor is available on bundle/package aliases. BOM/material edit reference aliases and the standalone cutting workbench are connected to existing costing behavior. Cutting approval still belongs in a saved recipe revision; this does not complete family templates or every COST-06 requirement.

Verification so far:696 backend and417 frontend tests passed; build/typecheck/lint passed before the final mobile layout adjustment. New focused cases cover draft/publication isolation, duplicates, percentage quote, private costs/files, media versions/revocation, permissions, rollback and receipt recovery. A restored-copy migration preserved every pre-existing public table; private backup `backups/pre-integrated-catalogue-20261020T132853Z.dump`.

The live editor journey passed draft→publish→lost response→receipt recovery→replay→reload. Mobile review found an inherited role-form layout issue; the responsive document-form fix is under verification. No complete bundle/browser acceptance is claimed yet.

## Preview environment

The isolated demo is now on0054 (artwork authoring and settings-backed checkout);0052/0053 were the preceding bundle/profile checkpoints. Use compose.yaml + demo.override.yaml + integrated-preview.override.yaml, project nilart-demo and .env.demo. API/worker/scheduler tag `nilart-demo-api:integrated-catalogue`; web tag `nilart-demo-web:integrated-catalogue`. Main remains on its existing stable images/schema0051. Preview images must be rebuilt as stage changes progress; do not run the regular demo updater and unintentionally replace preview services with old tags.

## Remaining release work

- Complete multi-collection/public catalogue media integration, remaining SKU recipe/publication dependencies and content presentation. Product/SKU profiles and original/print/digital artwork authoring now persist; their final all-view acceptance is still pending.
- Family BOM/templates/overrides, group/bundle pricing, supplier resource links/purchase units and remaining production/print/labor/obligation dependencies.
- Finish commission quote eligibility and private-print/production delivery dependencies, external sandbox financial adapters and final checkout/return acceptance. Settings-backed shipping/tax/policy review, physical/digital/mixed delivery and frozen-policy returns/refund bounds now operate in0054.
- Gateway/customer/artist obligations, sandbox settlement/refund adapters, financial supporting files, due terms/aging and official profit/export reports.
- Full commission quotes/assessment/assignment/artist workspace/finals, support assignment/priority, cross-domain dashboard/audit and safe worker recovery.
- Every56-view/AC-01–22 final permission, bilingual/mobile/keyboard and integrated browser journey; full restore/job recovery; final main rollout and documentation.


## Verified bundle preview checkpoint

Final source verification:699 backend /418 frontend tests, lint/typecheck/build, restored-copy0052 migration and two live demo browser journeys passed. The responsive layout, single/multiple unmapped SKU selection, ledger-backed capacity, price-publication permission, saved-version comparison/history and legacy-data readability are verified. API/client contracts regenerated. See `bundle-authoring.md` for exact scope and remaining dependencies. Source register now has54 connected_partial and2 missing views; no view is marked fully accepted by the integrated matrix. Main remains stable0051; only the isolated preview runs0052. Continue next with shared approved media/specification/weight/delivery profiles for products/SKUs and artwork authoring; do not duplicate the implemented bundle workflow.


## Catalogue profiles checkpoint — 2026-10-21

Implemented shared approved gallery selection and bilingual specifications for products, collections and SKUs, explicit SKU physical/digital delivery/weight/return metadata, isolated drafts/publication/history, fresh permissions, exact command recovery and atomic audit/outbox. Product detail consumes approved profiles and selected-SKU overrides. No legacy metadata was inferred. See `catalog-profiles.md` for contracts, evidence and limits.

The isolated preview alone runs0053; main remains0051 and healthy. Restored-copy migration preserved all existing fields. A real browser journey verified authoring, public rendering, receipt recovery, private drafts, cross-account denial and fa/en mobile/desktop widths. Final verification:686 backend tests passed in the full PostgreSQL run; the17 disposable Redis cases passed separately (703 distinct backend tests). The full frontend suite passed422 tests; the updated profile navigation file passed3 focused tests, including one added regression. Build, typecheck, lint and backend lint passed. Both real profile browser journeys passed in separate runs; fa mobile/en desktop screenshots were visually reviewed. The browser found a direct Back-button navigation bypass; that fix is deployed and covered by unit and browser checks. Main and preview readiness both returned ready.

Next dependencies: full artwork authoring and collection/list gallery rendering; settings-backed checkout must consume and freeze approved SKU delivery metadata. Checkout/shipping/tax/returns are not completed by metadata authoring. Continue the remaining integrated stages above; do not roll partial stages onto main.


## Artwork and checkout checkpoint — 2026-10-21 (0054)

Managed artwork listing/create/edit/draft/publication/history now distinguishes unique originals, SKU-backed prints and licensed digital editions. Shared approved media, independent pricing permission, exact receipt recovery, retained edits and immutable source/edition rules are in place. Originals use the existing one-unit ledger; print and standalone SKU demand aggregates; digital components retain paid allocations without physical stock movements. Public digital bundle availability also excludes physical stock requirements without inventing a capacity.

Checkout now requires an authoritative accepted review binding prices/options/components, owned address, approved profile revisions, business/policy versions, shipping/tax/discount and exact total. Missing rules remain unconfigured. New settings expose tax basis, shipping calculation/rounding, tax rounding and the supported refund policy. Digital-only checkout needs no address; mixed orders/bundles ship only physical demand. Orders freeze accepted policies/licenses, shipments use those policies, digital file release derives fulfillment through the existing protected-download system, and refunds bound proportional tax (including retained non-refundable shipping tax).

The restored-copy0051 →0054 migration preserved every existing public-table field and created no inferred profiles/artwork definitions. Private backup: `backups/pre-catalog-profiles-20261021T082729Z.dump`. The three real demo browser journeys passed original authoring→stock→checkout→QC/dispatch/delivery, digital checkout→protected release and print authoring→mixed checkout, including fa/en390/1440 layouts, keyboard/navigation, lost-save receipts, cross-account denial and historical terms. The completed free-payment journeys make no external provider call; nonzero amount/provider cases remain database-backed tests.

Catalogue/profile/artwork and file events are now validated by the deduplicating consumer. Thirteen older preview catalogue events were safely requeued with their original IDs; the subsequent unconsumed count was zero. Main remains healthy0051; only preview runs0054. See `artwork-checkout-integration.md` for detailed scope/evidence. Final source checks passed718 backend tests,430 frontend tests, typecheck, frontend/backend lint and production build. The final deployed preview passed all three live browser journeys. Persian mobile/English desktop artwork, checkout and customer order screenshots were visually reviewed. Public digital/mixed bundle capacity is covered by additional database/client contract tests. Main/preview readiness pass; schema remains main0051/preview0054.

Continue next with remaining family/group costing, resource/purchase/production dependencies, financial receivables/settlement and official profit, full artist/commission quotes/workspaces, support/operational queues and the all56-view/AC-01–22 final release acceptance. Do not redo the implemented artwork or checkout stages, reset demo resources, or roll partial stages onto main.
