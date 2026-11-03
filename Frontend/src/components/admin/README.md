# Shared admin interface

Use these components for every live admin page. They share the existing warm NilArt palette, typography and dropdown system; business handlers and permission checks remain in feature modules.

- `AdminFilters`: semantic form with a responsive filter toolbar. Place search, selectors and actions together; preserve existing submit/filter behavior. Inputs have consistent 40px desktop/44px mobile heights.
- `AdminButton`: labeled primary/secondary commands with optional leading icon; `size="sm"` for compact secondary controls. Native submit behavior is preserved unless `type="button"` is supplied.
- `AdminAction`: icon-only row action. Pass a translated label as children for its accessible name, tooltip and native title. Use `as="a"` with `href` for navigation/download links, and `tone="danger"` for destructive actions. It defaults to a non-submit button.
- `AdminTable`: composable semantic table with a keyboard-focusable horizontal scroll container. Preserve `thead`/`tbody` structure. Mobile action columns remain visible while other columns scroll.
- `AdminDataTable<T>`: typed column renderers, stable row keys, caption and explicit column headers. Mark action columns with `action: true`.

Icon names: edit, view, external, history, delete, download, options, review, copy, refresh, search, close, add. Never use an unlabeled icon, a clickable span, or raw text action links inside a data table. Keep main create/save commands labeled; row commands use icons.

Adopted across the live admin feature components, including catalogue, accounts, orders/support, costing/recipes, discounts, suppliers, stock, media, content and settings. The price-review queue uses `AdminDataTable`; list filters for catalogue/accounts/support are consolidated into the shared toolbar.

On narrow screens, shared tables render each record as a labeled card. Column labels are derived from the existing semantic headers, including after language or result changes. Row actions stay in their own footer instead of overlapping data. Keep table headers meaningful and use `AdminAction` for record commands. Filter fields use a two-column mobile grid, with search and grouped commands spanning both columns.
