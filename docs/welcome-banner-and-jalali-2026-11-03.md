# Welcome campaign and Jalali scheduling

Owner requested one active banner and Persian date-time controls on 2026-11-03.

- Existing WELCOME-NIL-100 coupon enabled on local and production: fixed 100000 IRT, first successful purchase only, customer limit one. Existing minimum and validity retained. Existing welcome banner enabled without scheduling bounds. No product-specific sale prices were invented or activated.
- Activation went through the existing audited domain save functions, version checks and operation receipts, using the existing admin actor. No credentials were printed or changed.
- Added reusable PersianDateTimePicker using native Intl Persian calendar, Saturday-first grid, month navigation and Tehran time. Dates persist as UTC ISO timestamps; optional banner dates can be cleared. Both banner and product-sale scheduling use it; English inputs retain Gregorian datetime controls, using Tehran local time.
- Five tests passed: Persian month boundary, valid day selection, UTC/Tehran time conversion, clear/required behaviour and public promotion rendering. TypeScript and production build passed.
- Production browser verified active welcome banner setting and the 1405 Aban calendar. Public API returns active=true and WELCOME-NIL-100. No order or payment was made.
- Release: /srv/nilart/releases/promotions-jalali-20261103. Frontend-only deployment; previous web image tagged before-promotions-jalali. Local also updated.
