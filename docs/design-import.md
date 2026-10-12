# Design source and fidelity

Source: `git@github.com:a-sharifi/DesignNilArtHomepage.git`.
Pinned revision: `70be0f616f75580f57116d3d001481b54f0e5a8c`.

`Frontend/src/design` retains the supplied React components and styles.
`design-reference` is a non-deployed comparison preview, without a nested Git repository.
The original source hashes are recorded in `design-source-manifest.json`.

Non-visual repairs: missing TypeScript property separators in ArtworkDetailPage,
CommissionsPage and ReferencesPage; div-specific ref typing in SecurityPage.
The reference Vite config omits Figma-host-only plugins so it can run independently.

Next.js renders a client-boundary compatibility shell because the export accesses
browser APIs during initialization. This is not full SSR migration: extracting route
layouts and server-rendering public catalog content remains a follow-up.
The supplied markup/CSS is preserved; API integration changes data sources, not styling.
Demo simulations must stay behind `NEXT_PUBLIC_DEMO_MODE=true`. Live mode must not
claim success for unimplemented auth, payment, inventory or private-panel flows.

# Artwork relocation

| Before | Now (outside Git) |
|---|---|
| daftar | ../design-prints/notebooks |
| bookmarks | ../design-prints/bookmarks |
| switch-stickers | ../design-prints/stickers |
| branding | ../design-prints/branding |

Directories were renamed on the same filesystem, without transforming individual files.
`artwork-manifest.json` records post-move sizes and SHA-256 fingerprints for subsequent
verification. No pre-move hash manifest was captured; this is not a claim of a before/after
cryptographic comparison. Temp upload/download directories and the old virtual environment
remain at the workspace root. Artwork is not copied into public website assets.
# Auth integration update — 2026-10-12

`AuthPage.tsx` and `PasswordForm.tsx` accept an optional live sign-in callback. The
original components, CSS selectors, icons and form hierarchy remain in use. Live
mode hides demo banners/preview controls, restricts country selection to supported
Iranian numbers. The SMS request form reports unavailability until a provider is configured. Copy for
actual status replaces simulation copy; success requires API session confirmation.
Vite reference files remain unchanged. No imported CSS file changed in this update.
Mobile browser QA exposed an implicit grid min-content track overflowing at 390px.
`Frontend/src/styles/design-compatibility.css` constrains that track to
`minmax(0, 1fr)`; original 480px desktop column, components and tokens are retained.

Subsequent auth integration reuses `OtpRequestForm`, `VerifyPage` and
`RegistrationPasswordPage` through optional API callbacks. Demo defaults remain
for the Vite reference; live controls never simulate acceptance or session creation.
Actual challenge metadata, grant expiry and password policy replace fixture values.
The auth shell, markup classes, icons and original CSS remain the design source.

`LogoutPage` now also accepts live logout/status callbacks. Its original shell,
actions, responsive dialog and styling are retained; simulated save/status controls
are absent in live mode. Success text reflects confirmed server revocation, and
cross-tab status is revalidated against the API rather than trusted as authorization.

Profile integration reuses `ProfilePage` inside the supplied `DashboardPage` shell.
Live mode hides fixtures and preview tools, leaves unread counts unknown and
removes the fictitious support indicator. Original CSS is unchanged. API-owned
values and explicit conflict replacement drive the original form. Other customer
panel routes remain blocked until implemented; shared browser-back/draft lifecycle
work is still pending, not silently simulated.

