# Tradebilia Asset Inventory and Recovery Policy

## Purpose

This document records current visual assets without treating source control as a customer-media database. Manus Support confirmed that a fresh task cannot be documented as attaching to the active WebDev project. For a replacement WebDev project, `NEW_WEBDEV_MIGRATION_READINESS_REPORT.md` controls the process: the static release archive covers design assets, while database-backed customer media requires a checksum-backed binary manifest and approved migration strategy.

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
| Current active WebDev project | Existing current-project paths were audited and resolve; use this document only as a recovery reference for that project. | Existing database records reference the current project storage paths. |
| Replacement WebDev project / changed storage namespace | Restore static assets from the release archive into the new project, verify new objects, then update source paths. | Do not bulk re-upload. First create a checksum-backed binary manifest and old-to-new mapping, then execute the approved media strategy with database and rollback safeguards. |
| Wrong or empty `CUSTOM_DATABASE_URL` | Static source files may still render. | Listings, photo URLs, avatars, and other live data can appear missing because the records are in a different database. |

The prior re-upload work on August 4 was caused by missing **old project-storage paths**: a pre-restoration Comics background path now returns `403`, while its restored current-project replacement returns `200`. This is evidence of a project-storage migration/rebuild issue rather than routine chat-session loss. The required next-session test remains the final confirmation.

## Authorized Database-Backed Media Cleanup

A full public listing-detail audit initially found one obsolete secondary photo record for listing `1110009` — **Barry Sanders Score Rookie** — that referenced a 403 storage object. Rich authorized removal rather than re-upload. A guarded transaction deleted exactly that one record, retained the working cover photo, and public detail no longer returns the obsolete path. The other **27 audited listing/owner media paths were rechecked and all returned `200`**.

This cleanup makes the current public media inventory internally consistent. It does not eliminate the replacement-project media migration requirement.

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
- Do not assume current `/manus-storage` paths are portable to a replacement WebDev project.
- Do not create a replacement WebDev project until the migration report’s media, database, secrets, GitHub, domain, scheduler, and rollback gates are approved.
- Do not replace database-backed media URLs with placeholder images without confirming with Rich.
- Do not delete assets from object storage while their URL may still be stored in the external database.

## Related Records

The current-project architecture and credential registry are in `SESSION_HANDOFF_GUIDE.md`. The replacement-project launch gates are in `NEW_WEBDEV_MIGRATION_READINESS_REPORT.md`; the historical audit evidence is in `HANDOFF_ADVERSARIAL_AUDIT.md`.
