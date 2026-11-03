# Price proposals and explicit publication — 2026-10-19

The COST-08–10 increment connects exact BOM estimates to saved/reviewed price decisions. It does not complete the full admin release.

## Workflow and routes

`/admin/pricing/new` selects a named SKU with a recorded recipe; `/admin/pricing/:sku` starts a proposal for that SKU. `/admin/pricing/reviews` provides searched, status-filtered, cursor-paginated proposals, and `/admin/pricing/reviews/:id` provides review, revision, rejection, publication and immutable decision history. Existing `/admin/price-review` remains the rate/recipe dependency queue and links to the proposal workflow. Both appear under the pricing permission in the established sidebar. Shared filters, data tables, icon row actions, dropdowns, Yekan Bakh and fa/en desktop/mobile behavior are preserved.

Margin, fee, cost date, healthy output, allocated fixed selling cost per unit, rounding step/method and simulated discount are explicit inputs; no business defaults are invented. Blank or incomplete inputs cannot produce a final proposal. Rates/recipes must be complete, current, active and effective on the chosen cost date. IRT is the supported proposal currency; mixed/IRR input costs require explicit upstream setup rather than an assumed exchange rate.

`C = exact manufacturing cost per healthy output + allocated fixed selling cost per unit`, and `P = C / (1 − target_margin − percentage_fee)`. Calculation uses rational arithmetic and exact integer rounding to the chosen step, then recomputes actual margin/profit for the selected/custom price. Targets and fees must be nonnegative and sum below one. Tax and shipping are outside this base. A simulated discount shows its own discounted margin; it does not create a coupon, usage reservation or order. Cost snapshot rational numerators/denominators and resource versions remain recorded alongside decimal-string results.

Calculation is a private read, saving a proposal is not publication, and publication is a separate explicitly confirmed action. A revision recalculates and freezes a new reviewed snapshot; rejection requires a reason and changes no price. Posted decisions cannot be silently edited or deleted. Current inventory valuation, production actual costs and historical order snapshots are untouched. The ordinary SKU price repository/version/audit is reused when publishing; a second public-price store is not introduced.

## Integrity, authorization and recovery

Migration 0041 adds proposal and immutable decision-event tables. Each decision binds actor, proposal, expected version, full intent and a stable operation ID. Draft/revision also binds the fingerprint of the exact displayed calculation. A source change between preview/save rejects the save; changes to recipes, material/service versions, waste/yield calculations, current public price or dependent bundle composition reject later publication. A revision must be deliberately recalculated and saved before publishing changed inputs. Affected direct bundles are listed for review, never repriced silently.

Resource/recipe serialization, catalogue serialization and SKU row/version locking coordinate publication with source and price writers. Proposal state, public price/version/audit, domain audit and outbox commit together. Exact retries return the original immutable receipt and cannot duplicate price history. Historical proposals retain their original rates and margins after later edits. Source-dependent stale status is derived when reading pending proposals rather than rewriting their past events.

`pricing.publish` protects calculation, proposal reads and writes; Origin, CSRF, current session and permission are revalidated during writes. It is independent of `catalog.manage`. The legacy manual SKU-price write now also requires `pricing.publish`, preventing catalogue-only staff from bypassing the independent publication permission. Catalogue-only staff retain price viewing with disabled editing controls. Existing authorized manual-price URLs remain available; the proposal workflow provides the richer cost/reason/receipt process.

Rejected/conflicting writes retain inputs, with reload/comparison before revision. Unknown results freeze the exact operation for check/retry; private caches clear on identity changes, late responses are ignored and unsaved navigation is guarded. API and client contracts are regenerated under `/api/v1/admin/pricing`.

## Evidence and remaining scope

Six PostgreSQL workflows cover the margin/fee/fixed-cost/rounding formula, custom and simulated prices, no publication from previews/drafts, explicit publication/audit, exact retries, stale save/publication, reviewed edits, historical prices, independent permissions/CSRF, changed bundle quantities and deduplicated outbox processing. Client tests bind preview and receipt identity, full inputs, resulting status/fingerprint and uncertain-result handling.

A real isolated demo journey verifies explicit missing-value validation → preview → saved proposal with unchanged public-price record → explicit publication → deliberately lost successful response → own receipt recovery/exact replay with one price audit. It then changes a rate, verifies blocked publication, reviews a new pinned recipe revision, saves an edited proposal and rejects it without changing the prior public price. Published snapshots remain unchanged. Persian/English desktop/mobile views are checked at 390/1440px. Synthetic records are restricted to `nilart-demo`.

Restored-copy migration verifies complete stock, purchase, production, SKU and price-audit snapshots remain unchanged, and the new proposal tables start empty. The private pre-migration backup is retained.

COST-08–10 remain connected_partial: reusable family margin/fee/BOM policies, group decisions, automatic expiry/scheduled review, bundle cost/discount/packaging proposals and publication, full replacement-versus-realized profit comparison and complete integrated acceptance remain pending. Selected-date estimate validity is explicit; this stage does not implement scheduled future price activation. The broader catalogue/media, reservation/checkout, fulfillment/refund and artist-workspace dependencies remain in the release register. Production activation and FUT-01–03 remain excluded.

Deployment verification (2026-10-19): main and isolated demo are at schema 0041 with the pricing build. Main proposal/event tables remain empty; synthetic pricing decisions are confined to demo. Guest proposal reads return 401/no-store and fa/en proposal routes return 200/no-store. Ten demo pricing events were published and processed once at the worker check. Final verification: 627 backend tests, 358 frontend tests, production build/type checking/lint, 15 existing/permission browser checks and one real pricing browser journey passed.
