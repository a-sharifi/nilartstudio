# Commission reference images

The live first step previously disabled image-based requests but still allowed selecting local files. Its shared validation then required a simulated upload receipt, so attaching an image could block even a text-based request.

Live image-based selection is now enabled. Valid local previews are automatically ready to continue; no demo-upload action is required. Both image-based and idea-based requests require a brief. Images remain in session memory through preferences and are sent only with final submission, as explained on the page. Refreshing before submission still clears the in-memory draft; this is not a persistent draft service.

Final submission supports up to three private JPEG/PNG/WebP references, each at most 5 MiB. The server verifies base64, actual image format, complete decoding, single-frame content and bounded dimensions. The selected primary reference must belong to the request. Metadata and SHA-256 fingerprints are frozen in the brief, while bytes are stored separately in `commission_references` by additive migration 0057. Reference bytes and commission submission commit together. Historical text-only receipts retain their original representation. Repeated submission IDs cannot silently alter a recorded request.

Customers can read only their own reference files; staff require fresh `commissions.manage`. Downloads use no-store, nosniff and validated raster media types. Customer and admin commission records show reference previews and the primary marker. Session rotation also invalidates image encoding before submission.

## Verification

- PostgreSQL: 13 commission/reference/review tests passed, including actual WebP persistence, duplicate submission, invalid-image and primary-selection rejection, customer ownership, staff permission revocation and unauthenticated access.
- Frontend: 22 flow, selection, customer and admin tests passed. The new selection test exercises the formerly disabled image radio and continues with an image plus brief without any simulated upload.
- TypeScript, targeted lint and production build checked before rollout.
