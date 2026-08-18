# Cloudflare R2 Storage Health Report

**Implemented:** 2026-08-18

## Purpose

The Admin Dashboard’s **Media Storage** tab now contains a read-only **Cloudflare Storage Health** panel. It gives administrators a concise operational view of the approved public Cloudflare storage implementation without exposing credentials, object keys, private-evidence records, or private-evidence URLs.

## Reported Health Signals

| Area | Reported information | Source and boundary |
|---|---|---|
| Public listing photos | Database total, R2-hosted count, and retained legacy-managed count | Aggregate `listingPhotos` query only. |
| Public avatars | Profile total, non-empty R2-hosted count, legacy-managed count, and empty-avatar count | Aggregate `userProfiles` query only. |
| Public-media delivery | One representative, server-selected R2 listing URL availability check | Boolean only; the URL and object key are never returned to the browser. |
| Static delivery | Two fixed public static sentinels checked through `assets.tradebilia.com` | Aggregate passed/total count only. |
| Public and static buckets | Credential-presence state, read-only reachability, first-page object count, and first-page byte total | S3-compatible `ListObjectsV2` with a maximum 1,000-object page. |
| Private evidence | Report count, evidence-bearing report count, and public-R2-reference count | Aggregate `userReports` query only. |

## Security and Data-Handling Guarantees

The health endpoint is protected by the application’s central `adminProcedure`; unauthenticated and non-administrator callers are rejected before any database or Cloudflare operation. The report has no write, copy, migration, delete, or URL-update path. It does not return R2 credentials, access-key identifiers, bucket endpoints, object keys, selected sample URLs, report evidence, or report attachment metadata.

Private report evidence remains outside public Cloudflare storage. The report only tests that no report-evidence payload references `media.tradebilia.com` or `assets.tradebilia.com`; it does not read evidence content or individual attachment details.

## Scope Limitation

Bucket counts and bytes are deliberately labeled as a **first-page sample**, not account-wide Cloudflare usage. This prevents a dashboard refresh from enumerating an unbounded public bucket. Full account-wide storage consumption remains the responsibility of the Cloudflare dashboard unless a separately approved analytics integration is added later.

## Validation

The authenticated development Admin Dashboard rendered the panel with real aggregate results: 30 of 30 listing photos on R2, 3 of 3 non-empty avatars on R2, protected private-evidence boundary, reachable public-media/static buckets, 33 public-media sampled objects, 60 static sampled objects, and two of two static delivery sentinels available. TypeScript, production build, focused health-report tests, and the full regression suite passed.
