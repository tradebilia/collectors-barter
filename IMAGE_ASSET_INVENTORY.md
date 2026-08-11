# Tradebilia Asset Inventory and Recovery Policy

## Purpose

This document defines how Tradebilia preserves visual assets across sessions without treating source control as a customer-media database.

| Asset class | Primary location | Recovery location | GitHub policy |
|---|---|---|---|
| Static design assets | Project object storage at `/manus-storage/...` | GitHub static-asset release | Archive only; do not change the app to serve from the repository by default. |
| Listing photos | Project object storage with URLs stored in the external database | External database backup and object-storage lifecycle | Never commit. |
| Member avatars | Project object storage with URLs stored in the external database | External database backup and object-storage lifecycle | Never commit. |
| Source code / vector fallbacks | GitHub repository | Git history and releases | Commit normally. |

## Verified Static Recovery Archive

| Field | Verified value |
|---|---|
| Repository | [`tradebilia/collectors-barter`](https://github.com/tradebilia/collectors-barter) |
| Release tag | [`tradebilia-static-assets-2026-08-11`](https://github.com/tradebilia/collectors-barter/releases/tag/tradebilia-static-assets-2026-08-11) |
| Archive | `tradebilia-static-assets-2026-08-11.tar.gz` |
| Checksum file | `tradebilia-static-assets-2026-08-11.tar.gz.sha256` |
| SHA-256 | `182292f179319e64610d25c273018df8d3665c225b34870335d0c0651a78528c` |
| Preserved static sources | 46 active source filenames |

The archive was created from active project storage through the project server’s signed-asset route. A coverage comparison confirmed that all **46 remaining static source references** in `client/src`, `server`, and `shared` have a same-filename copy in the archive.

## Repaired Broken Paths

The following unavailable object classes were audited. Their runtime dependency has been removed; do not restore them unless a future design task explicitly needs the original artwork.

| Former asset type | Repair |
|---|---|
| Five ranking title graphics | Replaced with accessible inline SVG title text in `RankingPageHero.tsx`. |
| Home hero wheel raster | Replaced with reusable inline SVG component `TradebiliaWheel.tsx`. |
| Two obsolete static Tradebilia logos | Replaced in source with a verified current Tradebilia logo asset. |
| Account Settings fallback title | Repointed to the existing `AccountSettingsTitle` asset. |

## Restore a Broken Static Asset

1. Confirm that the broken URL belongs to a static design asset—not a listing or avatar.
2. Download the release archive and checksum file from GitHub.
3. Verify the archive: `sha256sum -c tradebilia-static-assets-2026-08-11.tar.gz.sha256`.
4. Extract only the required source file.
5. Re-upload the static file through the project’s storage workflow and capture the resulting path.
6. Replace the source reference, write or update a focused test if behavior changes, and visually verify the affected page.
7. Checkpoint and push the repair to GitHub.

## Do Not Do These Things

- Do not bulk-copy live listing photographs, customer avatars, or uploaded records into GitHub.
- Do not assume an old `/manus-storage` path is unavailable solely because a new chat session starts.
- Do not replace database-backed media URLs with placeholder images without confirming with Rich.
- Do not delete assets from object storage while their URL may still be stored in the external database.

## Related Records

The complete session architecture and acceptance checklist are in `SESSION_HANDOFF_GUIDE.md`. The next-session minimum workflow is in `NEXT_SESSION_QUICK_START.md`.
