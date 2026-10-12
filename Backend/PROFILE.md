# Account profile foundation

`GET /api/v1/account/profile` reads the active session owner's profile.
`PUT /api/v1/account/profile` updates that same owner only. Both require explicit
self-account permissions. No route/body account identifier is accepted; extra
fields including phone, roles or account_id are rejected. Phone remains the
verified account phone and is read-only through this feature.

PUT requires the exact configured Origin and current session's CSRF token.
Clients can bootstrap CSRF with `/api/v1/auth/session/csrf` after reload.
Responses disable caching. A new profile has blank optional full_name and version
0; no name is inferred or seeded. First save creates version 1. Subsequent saves
must provide the current version; stale versions receive 409
`profile_version_conflict` without overwriting newer changes. Database uniqueness
protects competing first saves too.

Names are trimmed, optional, at most 120 Unicode characters and reject control
characters. Password, phone verification, role grants, email and addresses are
separate workflows. Migration `0008` adds versioned profiles without sample data.

The application use case depends on a repository port, not FastAPI/SQLAlchemy.
Tests use isolated PostgreSQL schemas and cover CSRF, stale versions, invalid
names, rejected mass assignment and a second account unable to read/overwrite the
first account's profile. These are not changes to real customer records.

The supplied ProfilePage is now connected at `/fa/account/profile` and
`/en/account/profile`, with real loading, denial, save and version-conflict states.
Demo records, preview controls and invented notification/support indicators are
absent in live mode. The adapter bootstraps CSRF and sends `X-Profile-Owner` as a
precondition: a different active account is rejected, never selected as a target.
Responses are owner-checked before use. Unknown PUT outcomes pause resubmission;
a read-only reload offers explicit replacement with the latest version.

Focus and logout broadcasts cause API revalidation, not assumed authorization.
The existing design's own links and beforeunload warn about unsaved edits. Native
browser-back interception is not yet integrated with the shared Next shell; do
not claim all history transitions preserve drafts. Language changes with dirty
inputs require confirmation before discarding edits; no drafts are persisted in browser storage.

Remaining: shared session/private-cache lifecycle, full navigation guard integration,
audit, verified phone change and optional email policy. Other panel sections remain
unconnected rather than exposing fixture transactions. No generic replacement page
is deployed and no real customer profile has been seeded.
