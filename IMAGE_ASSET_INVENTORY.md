# Tradebilia Asset Inventory and Recovery Policy

## Purpose

This document defines how Tradebilia preserves visual assets across sessions without treating source control as a customer-media database. The word **session** here means a new task created inside this same Tradebilia project; it does not mean a newly initialized web project with a different storage namespace.

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

The archive was created from active project storage through the project server’s signed-asset route. A coverage comparison confirmed that all **46 remaining static source references** in `client/src`, `server`, and `shared` have a same-filename copy in the archive. On August 11, 2026, all 46 static paths also returned `200` in production.

## Evidence-Based Media Continuity Expectation

| Situation | Static backgrounds and title assets | Listing photographs and avatars |
|---|---|---|
| New session **inside this Tradebilia project** and same external database | No re-upload is expected because the current project paths resolve; confirm this in the new-session acceptance test. | No re-upload is expected because the external database retains the stored media URLs and the project storage proxy resolves them; confirm this in the new-session acceptance test. |
| New web project / changed project storage namespace | Restore static assets from the release archive into the new project, then update source paths. | Do not bulk re-upload. First preserve/migrate the external database media records and the original object storage, or use a planned media migration. |
| Wrong or empty `CUSTOM_DATABASE_URL` | Static source files may still render. | Listings, photo URLs, avatars, and other live data can appear missing because the records are in a different database. |

The prior re-upload work on August 4 was caused by missing **old project-storage paths**: a pre-restoration Comics background path now returns `403`, while its restored current-project replacement returns `200`. This is evidence of a project-storage migration/rebuild issue rather than routine chat-session loss. The required next-session test remains the final confirmation.

## Known Database-Backed Media Defect

A full public listing-detail audit reached 28 unique listing/owner media paths. Twenty-seven returned `200`; the following secondary listing photo returns `403`:

| Listing | Failing path | Required correction |
|---|---|---|
| `1110009` — Barry Sanders Score Rookie | `/manus-storage/listings/60003/1785287846412-ej9irj-1989-Barry-Sanders_bb0004c8.jpg` | Re-upload the correct image through the intended authenticated listing flow or remove the obsolete photo record safely; do not use an unrelated placeholder. |

This defect is unrelated to a new-session transition, but it must be addressed before calling media continuity fully seamless.

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
- Do not create a fresh web project for a routine continuation session; that new project will not automatically own this project’s object-storage namespace.
- Do not replace database-backed media URLs with placeholder images without confirming with Rich.
- Do not delete assets from object storage while their URL may still be stored in the external database.

## Related Records

The complete session architecture and acceptance checklist are in `SESSION_HANDOFF_GUIDE.md`. The next-session minimum workflow is in `NEXT_SESSION_QUICK_START.md`.
