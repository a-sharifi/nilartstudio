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
Profile reads are ordered so an older response cannot overwrite a newer account
check. Account changes and denied access clear the previous owner's draft, conflict
data, status and pending navigation. Responses from saves started before that
change are ignored. Temporary read failures preserve the draft; focus revalidation
and explicit retry recover it without silently replacing unsaved input. Concurrent
conflict checks use the latest read and retain explicit replacement semantics.
The existing design's own links and beforeunload warn about unsaved edits. A
persistent Next layout provider now connects the live profile's existing guard to
browser Back/Forward. Rejected traversals restore the current entry without
unmounting the form; explicit consent replays the original destination, including
multi-entry jumps. Pending saves block traversal. Temporary read failures keep
draft protection active. The provider preserves Next's internal history state and
does not add duplicate entries when the user chooses to stay.

Current browsers' Navigation API indices include native fragment entries. The
fallback for browsers without that API tracks application-created history entries;
arbitrary untracked fragment history in those older browsers is outside that
fallback's guarantees. Reload and cross-document navigation use the browser's
beforeunload confirmation (subject to normal browser user-activation requirements).
Language changes with dirty inputs require confirmation before discarding edits;
no drafts or private profile values are persisted in browser storage/history.

Remaining: shared session/private-cache lifecycle, navigation guards for future private forms,
audit, verified phone change and optional email policy. Other panel sections remain
unconnected rather than exposing fixture transactions. No generic replacement page
is deployed and no real customer profile has been seeded.

The shared session lifecycle now invalidates profile reads/saves across verified
session boundaries and clears drafts on verified logout or owner changes. A
payload-free tab hint, focus, visibility restoration or BFCache restoration asks
for an authenticated profile reload; hints never grant access or establish logout.
Temporary errors preserve existing draft behavior. A 403 hides this profile but
does not claim the whole session has expired.

Session expiry (401) during CSRF bootstrap or profile save now advances the shared
session lifecycle and clears registered auth memory. A late bootstrap denial from
an older revision cannot invalidate a newer account or issue a profile write.
