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

Three sources were initially left unchanged because the migration control could not obtain a verified source image. All three returned HTTP 403 with an XML error response from the legacy managed-storage delivery path: one listing-photo source and two avatar sources.

The user subsequently supplied verified replacement originals for the Star Wars #1 listing and the `ktavani` avatar. Both uploads were written to `media.tradebilia.com`, checksum-verified before their database URL updates, and visually verified on their standard public pages. The user explicitly directed that Collector 2’s unavailable avatar remain unchanged; it was not replaced, copied, deleted, or migrated.

| Replacement | Destination | Verification |
|---|---|---|
| Star Wars #1 listing photo | `recovery/listings/1110010/StarWars1.png` | Public R2 checksum and listing-page rendering confirmed. |
| ktavani Islanders avatar | `recovery/avatars/120003/nhl-new-york-islanders-logo.png` | Public R2 checksum and profile-page rendering confirmed. |
| Collector 2 avatar | Legacy URL retained by user direction | No R2 object or database change. |

## New Upload Validation

On 2026-08-18, the user submitted a new rtavani listing, **2019 Pokemon Magikarp & Wailord** (reference ID `1170009`). Its newly created listing-photo record stores an immutable `https://media.tradebilia.com/new/listings/...` URL, and the standard public listing page rendered the R2-hosted image correctly. This confirms that future listing uploads are using the new R2 public-media adapter rather than the legacy project-storage path.

## Fresh Coverage Confirmation

A fresh read-only audit after the new listing and profile cleanup found **28 of 28** listing-photo records and **3 of 3** non-empty avatar records stored under `https://media.tradebilia.com/`. The audit found **zero** listing-photo or avatar URLs still pointing at `/manus-storage/` or `tradebilia.manus.space/manus-storage/`, and no other public-media URL provider. This confirmation covers database-backed public listing images and avatars only; it does not change the separately intentional static-asset and private-evidence storage boundaries.

## Post-Implementation Audit Confirmation

A subsequent read-only storage audit found **30 of 30** listing-photo records and **3 of 3** non-empty avatar records on `https://media.tradebilia.com/`, with zero legacy or alternate public-media URLs. An aggregate public-availability probe then verified all **33 of 33** database-backed public-media URLs returned successfully. These newer counts supersede the historical 28-listing snapshot above; no legacy object was deleted as part of the verification.

## Rollback

The admin Media Storage tab can restore migrated database URLs to their legacy paths without deleting any R2 object. This control is administrator-only and cannot access private evidence or static assets.
