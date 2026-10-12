# Commission request submission

Migration 0011 stores account-owned text briefs with a unique account/submission
UUID pair and UTC timestamp. POST `/api/v1/account/commissions` accepts
`submission_id`, `idea` (1–4000 characters), `changes` (0–2000), `style` and `size`
(1–300), and `execution` (`digital` or `handmade`). Required descriptions cannot
be blank. Extra fields, including caller-supplied account IDs, are rejected.

The endpoint requires account.write_self, exact Origin and fresh CSRF. It locks
and rechecks the session/account and role grants before inserting. Ownership comes
from the session. A receipt contains `id`, `created_at` and `awaiting_review`.
Identical replay returns the original receipt; changed data with the same owner's
submission UUID returns 409. The unique constraint prevents duplicate insertions.
All responses are no-store. No external message, financial write, quote or price
calculation is performed. Awaiting review means saved, not dispatched to an artist.

The original commission introduction, references/brief and preferences components
serve the live Persian/English routes (including /commissions aliases). The brief
step supports text only; image selection is disabled. Brief and preference
checkpoints stay in browser memory across Next route mounts, scoped to a verified
account, and clear on session changes or reload. They are not server drafts. The
final action submits for review and displays the stored receipt in the original
preferences layout; it never opens a simulated assessment or quote. Illustrative
style/dimension choices express customer wishes, not approved production offerings.

Client mutations
bootstrap CSRF, capture session revision and discard obsolete responses. Session
changes clear form/receipt memory. Uncertain submissions retain their ID and brief
for explicit retry; editing is disabled while the outcome is unknown. Successful
submission shows its stored request ID. No brief is persisted in browser storage.

Reference uploads, artist assignment/review, AI assessment, configured size/style
choices, quote acceptance, payment, cancellation and account request history remain
outstanding. Current size/style fields record customer preferences, not approved
production choices. No records or roles are seeded. Isolated PostgreSQL and mocked
frontend/browser tests verify the implemented submission contract.
