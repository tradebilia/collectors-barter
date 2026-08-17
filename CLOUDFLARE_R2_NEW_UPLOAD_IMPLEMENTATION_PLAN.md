# Cloudflare R2 New Public-Media Upload Plan

**Status:** Proposed implementation only. **No upload behavior, existing media URL, database record, static asset, or private-evidence path has been changed.**

## Confirmed Cloudflare Foundation

| Component | Status | Intended use |
|---|---|---|
| `tradebilia-static` | Prepared with `assets.tradebilia.com` | Future site-owned visual assets only. |
| `tradebilia-public-media` | Prepared with `media.tradebilia.com` | Future public listing photos and user avatars only. |
| `tradebilia-private-evidence` | Prepared with no public hostname | Reserved for a later, separately authorized private-evidence implementation. |
| R2 public-media credential | Securely validated | Scoped to the public-media bucket; no live media operation has been performed. |

## Audited Upload Paths

The current database layer routes public listing photos and avatars through a shared `uploadImage` helper in `server/db.ts`. New listing creation, listing edits that contain a new base64 photo, and profile/avatar updates call this helper. Each successful upload writes a storage key and URL to existing database URL fields. Report evidence uses a separate `uploadReportEvidence` path and will remain on the existing private storage path in this phase.

## Proposed Change

| Scope | Proposed behavior | Explicitly excluded |
|---|---|---|
| New listing photos | Upload only newly submitted photos to `tradebilia-public-media`, then store a stable `https://media.tradebilia.com/...` URL in the existing `listingPhotos` record. | Existing listing image URLs and records are not read, copied, changed, or deleted. |
| New avatars | Upload only a newly submitted avatar to `tradebilia-public-media`, then store its stable R2 URL in the existing profile field. | Existing avatar URLs remain untouched. |
| Static art | No behavior change in this phase. | Existing `/manus-storage/` static references remain in use. |
| Private report evidence | No behavior change in this phase. | No public domain, R2 write, or R2 read is added for private evidence. |

## Implementation Design

The server will retain the existing upload API and base64 validation contract. A small R2 public-media storage adapter will use the already validated S3-compatible credentials to generate non-guessable object keys, send server-side authenticated uploads, set the received MIME type, and return only the `media.tradebilia.com` URL. The existing managed storage helper will remain intact for report evidence and all legacy URLs.

This design does not require a database migration because the existing fields already store URLs. It is reversible for new writes: if R2 is unavailable, the upload will fail clearly rather than silently creating a half-record, and the existing managed-storage provider can be restored for future uploads without affecting media already uploaded to R2.

## Required Tests and Validation

1. Deterministic tests for key generation, MIME allow-listing, and signed R2 request construction without logging credentials.
2. Tests that new listing and avatar uploads select the R2 adapter while report evidence stays on the existing private path.
3. Tests that an existing image URL submitted during a listing edit remains unchanged.
4. One intentionally created, user-authorized development listing or avatar upload to R2, followed by browser rendering verification at `media.tradebilia.com`.
5. Full TypeScript and regression-suite checks, GitHub synchronization, checkpoint, and standard public-release verification.

## Approval Boundary

Implementation requires explicit approval because it will change the destination for **future** listing-photo and avatar uploads. It will not migrate existing media, delete any object, modify report evidence, or update static-asset URLs.
