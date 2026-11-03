# Nilart public information pages

The owner requested publication of About, Contact, Purchase terms and Privacy with the new public Qazvin address and mobile contact. Bilingual approved copy lives in `content/site-pages.json`; these are published revisions in the existing content service, not hardcoded fallback policies. The four existing localized footer routes remain unchanged.

The page renderer follows the supplied reference: warm canvas, existing typography, restrained accent, generous title area, numbered sections, desktop contents sidebar and mobile scrolling topic links. About uses the existing brand logo. Contact has a callable mobile link. Body content remains text; only headings, paragraph breaks, simple bullet lists and safe explicit links are rendered. HTML and executable link schemes are never interpreted. Existing plain-text publications remain compatible.

Use `infra/scripts/publish-site-pages.py` with an explicit private credentials file, origin and `--publish` to apply the owner copy through normal authenticated, permission-checked, versioned content commands. Without `--publish` it only previews current versions. Matching already-published content is skipped; earlier revisions remain available in admin history. A lost response is recovered by reading its unique command receipt, without repeating the write. Credentials must never be added to source control.

Five focused frontend tests cover the published Persian contact details, English localization, contents navigation, unsafe links/HTML, unpublished state and existing plain copy. Type checking and focused lint passed. Production builds and browser verification are recorded in the implementation handoff.

Purchase copy preserves mandatory consumer rights and avoids inventing unconfigured shipping costs, dispatch dates, fixed refund times or blanket custom/digital exclusions. Legal reference for the eligible distance-purchase withdrawal period: [Electronic Commerce Act, Article 37, WIPO Lex](https://www.wipo.int/wipolex/en/legislation/details/7711). Public copy does not change checkout configuration or historical order policies.

## Release verification on 2026-11-01

Published all four pages on nilartstudio.ir and the isolated demo via the audited admin APIs. Public API responses matched the owner content exactly in both environments. Previous demo revisions were preserved. Persian contact and About were reviewed on desktop; Persian terms and English privacy were reviewed at 390 × 844. The section index moved to the expected anchor. The actual footer privacy link also opened its published copy correctly on the public domain. Evidence: `docs/verification/contact-public.png`, `contact-desktop.png`, and `terms-mobile.png`.
