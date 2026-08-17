# Cloudflare R2 Public-Media Migration Audit

**Migration date:** 2026-08-17

## Verified migration progress

The administrator-only, five-record-batch migration control copied each accessible legacy public image to `tradebilia-public-media`, fetched it back through `media.tradebilia.com`, verified its SHA-256 checksum, and only then updated the corresponding live database URL. Legacy objects were not deleted.

| Media type | Verified on R2 | Pending review | Status |
|---|---:|---:|---|
| Listing photos | 26 | 1 | Accessible records migrated; one legacy source is unavailable. |
| Avatars | 2 | 2 | Accessible records migrated; two legacy sources are unavailable. |
| Private report evidence | 0 | Not in scope | Not accessed or changed. |
| Static assets | 0 | Not in scope | Not accessed or changed. |

## Preserved failure boundary

Three sources were deliberately left unchanged because the migration control could not obtain a verified source image. All three return HTTP 403 with an XML error response from the legacy managed-storage delivery path: one listing-photo source and two avatar sources. The read-only avatar check found unavailable sources for user IDs `2` and `120003`. No failed record received an R2 URL, no R2 object was accepted as a replacement, and no legacy object was deleted.

Resolution will require a recoverable original image or a newly supplied replacement; the migration process will not fabricate, substitute, or scrape image content.

## Rollback

The admin Media Storage tab can restore migrated database URLs to their legacy paths without deleting any R2 object. This control is administrator-only and cannot access private evidence or static assets.
