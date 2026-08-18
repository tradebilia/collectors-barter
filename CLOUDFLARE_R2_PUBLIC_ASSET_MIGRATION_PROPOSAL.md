# Cloudflare R2 Public Asset Migration Proposal

## Recommendation

There is **no technical reason to keep Tradebilia-owned public static artwork in managed project storage** once Cloudflare R2 is ready. Moving public hero backgrounds, title images, Tradebilia logos, owned UI art, and approved static integration logos to `tradebilia-static` is recommended because it gives these files stable `assets.tradebilia.com` URLs that do not depend on a WebDev storage namespace.

The current public listing-photo and avatar work is already complete: every database-backed public listing image and non-empty avatar now uses `media.tradebilia.com`. The proposed phase addresses the remaining public static artwork and future generated public images only.

## Eligible and Ineligible Classes

| Asset class | R2 recommendation | Destination | Boundary |
|---|---|---|---|
| Hero backgrounds, title art, Tradebilia logos, and owned UI artwork | **Migrate** | `tradebilia-static` via `assets.tradebilia.com` | Public, immutable, content-addressed keys. |
| Existing public listing photos and avatars | **Already migrated** | `tradebilia-public-media` via `media.tradebilia.com` | No further migration work required. |
| New generated public images | **Migrate when public persistence is intended** | `tradebilia-public-media/generated/` or a separately approved generated-public prefix | Store generation metadata and ownership in the database; do not use R2 as the metadata database. |
| Approved static third-party brand logos | **Migrate after source/rights review** | `tradebilia-static/brands/` | Use only copies Tradebilia is already authorized to display; preserve required trademark or attribution treatment. |
| Third-party remote imagery not owned or licensed for Tradebilia copies | **Do not copy by default** | Remain provider-controlled or be replaced with authorized artwork | Hosting a copy does not create redistribution rights. |
| Private report evidence | **Do not migrate in this public phase** | None | Never expose through `assets.tradebilia.com` or `media.tradebilia.com`; requires separately designed private signed access. |

## Why the Separation Matters

The reason not to move *every* image blindly is not storage capability. It is access control and rights. Public R2 buckets are correct for public visual assets. They are wrong for private evidence. Likewise, copying an official third-party logo that Tradebilia is already permitted to show is operationally reasonable; copying arbitrary third-party imagery from a remote service without confirmed usage rights is not.

## Required Preparation

The current secure R2 credentials are deliberately restricted to `tradebilia-public-media`. Static migration requires a **separate least-privilege R2 credential** with Object Read & Write access only to `tradebilia-static`. The public-media credential must not be broadened. No generated-image or brand-asset upload behavior will change until this separate static credential is securely configured.

## Safe Migration Order

1. Create a separate `tradebilia-static`-only R2 token and store its S3-compatible credentials through secure project settings.
2. Copy and checksum-verify owned static assets from the existing GitHub recovery archive or current managed storage to `assets.tradebilia.com` without changing source references.
3. Update hero/title/logo references in small visual groups, verify all affected public pages, and preserve legacy paths during the release.
4. Move already-approved static third-party brand logo copies after a file-level inventory confirms they are the same assets currently displayed.
5. Update the image-generation persistence helper only after agreeing which generated outputs should be durable public assets and which should remain temporary or private.

## Explicit Exclusions

This proposal does not delete any managed-storage object, change private report evidence, move database records unrelated to public asset URLs, or assume rights to copy third-party imagery. It retains the existing GitHub static-asset release as a recovery source even after R2 delivery is added.
