# Dropdown

Controlled dropdown styled for NilArt. Reuse it for searchable collection choices
or simple selections. Original reference CSS files are unaffected.

```tsx
<Dropdown
  label="Collection"
  value={collection}
  onChange={setCollection}
  options={[{ value: "", label: "All collections" }, { value: "gorbe", label: "Cats" }]}
  autocomplete={true}
  placeholder="Search or choose a collection"
  emptyMessage="No matching collections"
/>
```

`autocomplete` defaults to `false`: a read-only selection with keyboard navigation.
Enable it to filter labels; text is never committed as a value. Arrow keys navigate,
Enter chooses, Escape cancels and Tab dismisses. Disabled choices are skipped.
Persian Arabic-form letters are normalized for matching. Layout inherits page RTL.
`disabled` prevents interaction; `name` adds a hidden input for form submission.
Labels, placeholders and empty messages should be localized by the caller.

Used in shop collection filters (searchable) and sorting (not searchable), including
the mobile filter dialog. The controlled onChange keeps existing query/draft logic.
