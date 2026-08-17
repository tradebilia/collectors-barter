# Cloudflare R2 Asset Storage Assessment

**Status:** Decision document only. **No Cloudflare account access, credentials, bucket creation, asset copy, database update, or application behavior change has been performed.**

## Recommendation

Cloudflare R2 is a **good fit** for Tradebilia’s long-lived visual assets. It would make the asset URLs independent of a particular WebDev project-storage namespace, which directly addresses the past risk of broken image URLs after a project rebuild or storage migration. It should be introduced as a **phased hybrid migration**, not as a one-time replacement of every image URL.

The lowest-risk first move is to use R2 for **static public design assets**—hero backgrounds, title graphics, logos, integration logos, and other site-owned artwork. After that is stable, new public listing photos and avatars can write to R2. Existing database-backed media should move last, in verified batches, with the current URLs left intact until each batch passes rendering and rollback checks.

## Current Tradebilia Asset Situation

| Asset group | Current delivery model | Continuity status | R2 treatment |
|---|---|---|---|
| Static hero backgrounds, title art, logos, and integration art | Project object storage at `/manus-storage/...` and source references | A GitHub recovery archive covers **46** active static source filenames. | Move first to a public R2 bucket and a stable custom asset domain. |
| Listing images | Project object storage; URLs stored in the live external database | Database and storage namespace must remain aligned. The existing audit checked **27** listing/owner media paths. | Write new photos to R2 after the static pilot; migrate existing photos by verified batch. |
| Member avatars | Project object storage; URLs stored in the live external database | Same database-backed dependency as listing images. | Move with public media after listing-photo upload validation. |
| Report evidence | Storage-backed but privacy-sensitive | Must not become public. | Keep separate in a private R2 bucket, delivered only through short-lived signed URLs. |

The current source has **141 explicit `/manus-storage/` references** and **5 storage-helper call sites**. That count is a scope indicator, not a count of distinct image files. The existing server helper uploads through the managed storage service and returns project-relative `/manus-storage/{key}` paths. A direct R2 migration therefore requires a narrow storage-provider layer rather than a blind URL search-and-replace.

## What Cloudflare R2 Provides

| Capability | Current documented behavior | Tradebilia implication |
|---|---|---|
| Free allowance | 10 GB-month of Standard storage, 1 million Class A operations, and 10 million Class B operations each month; direct R2 egress is free. [1] | The allowance is likely appropriate for an initial image library, but it is a monthly average-storage allowance—not an additional 10 GB every month—and must be monitored as listing photos grow. |
| Public delivery | Buckets are private by default. A custom domain can serve public media with cache, WAF, bot controls, and access options. `r2.dev` is explicitly non-production and rate-limited. [2] | Use an owned asset hostname such as `assets.tradebilia.com`; do **not** use `r2.dev` for production. |
| Direct browser upload | S3-compatible presigned `PUT` URLs grant temporary, object-specific upload permission without exposing storage credentials. [3] | The app can retain its current upload UX while issuing short-lived, MIME-restricted upload URLs from the server. |
| Encryption | R2 encrypts stored objects and metadata at rest with AES-256 and uses TLS in transit. [4] | This is an appropriate baseline, but it does not replace application authorization or backup procedures. |
| CORS | Browser uploads require a restrictive bucket CORS policy, even when the URL is valid. [5] | Allow only Tradebilia’s production and development origins, only the required methods and headers. |
| Deletion behavior | Emptying a bucket permanently deletes objects; removed objects cannot be recovered. [6] | R2 must not be treated as the only backup. Use a separate backup export and restrict delete credentials. |

## Recommended Architecture

```text
Public design media                 Public member-facing media                Private evidence
────────────────────                ──────────────────────────                ────────────────
R2 bucket: tradebilia-static        R2 bucket: tradebilia-public-media        R2 bucket: tradebilia-private-evidence
assets.tradebilia.com               assets.tradebilia.com/media                no public domain
hero/, titles/, logos/              listings/, avatars/                        reports/
public GET + cache                  public GET + cache                          signed GET only
content-hashed immutable keys       random keys + immutable URLs                signed PUT/GET + short expiry
```

The public buckets may use the same custom hostname with separate path prefixes, but **private evidence must remain in a separate private bucket**. A single public bucket is inappropriate for member-report evidence because bucket-level public delivery can expose any object whose key becomes known.

For public image writes, the application should generate non-guessable object keys, validate file type and size before issuing a presigned upload URL, set the intended `Content-Type`, and return the durable `https://assets.tradebilia.com/...` URL. Cloudflare advises treating presigned URLs as bearer tokens; they should therefore be short-lived and never be logged or stored in the database. [3]

## Implementation Plan

| Phase | Scope | Code and data impact | Risk | Rollback |
|---|---|---|---|---|
| 0. R2 foundation | Create three buckets, scoped API token, `assets.tradebilia.com`, CORS, cache policy, and backup procedure. | Configuration only; no site URL changes. | Low | Disable the custom domain or revoke the scoped token. |
| 1. Storage abstraction | Add an R2 provider behind the existing server upload interface; keep the managed-storage provider available. | Moderate server work and focused tests; secrets remain server-side. | Low–moderate | Select the existing provider; no existing records are changed. |
| 2. Static asset pilot | Copy a small, reversible set of hero/title assets and update their source manifest. | Small source-reference update; no database changes. | Low | Restore the previous `/manus-storage/` references. |
| 3. New public uploads | Route new listing photos and avatars to R2 while leaving old URLs untouched. | Upload endpoints and display helpers; no bulk rewrite. | Moderate | Switch new writes back; existing R2 URLs remain valid. |
| 4. Existing public-media migration | Copy, checksum, render-test, and update old listing/avatar URLs in small batches. | Controlled live-database URL updates; no schema migration required because existing URL columns can hold R2 URLs. | Moderate–high | Retain each old object and an old-to-new URL manifest until acceptance is complete. |
| 5. Private evidence | Move report evidence only after the private signed-download authorization flow is separately tested. | Sensitive access-control work. | High | Keep existing evidence storage active; migrate only after explicit verification. |

## Coding Effort

The code is **moderately involved**, but it is concentrated rather than a rewrite. The high-value work is the storage-provider adapter, upload authorization, URL resolver, validation, and test coverage. The public static-asset pilot is comparatively simple; migrating database-backed listing photos and avatars is operationally more involved because each copied object must be verified before its database URL is changed.

No database schema migration is required for the recommended approach because the existing media URL fields can store a stable R2 URL. However, no batch database update should occur without an exportable manifest containing the record ID, prior URL, R2 key, checksum, copy outcome, and rendered verification result.

## Risks and Required Controls

| Risk | Why it matters | Required control |
|---|---|---|
| Accidental public exposure | Private report evidence must not share a public delivery path. | Separate private bucket; server-authenticated signed links only; no `r2.dev` access. |
| Accidental deletion | R2 deletions can be irreversible. [6] | Separate backup export, least-privilege tokens, no routine delete permission in the application token, and deletion review procedure. |
| Cost beyond the free allowance | Image traffic creates Class B reads; Cloudflare’s example shows high-read asset hosting can exceed the free operations allowance. [1] | Enable Cloudflare billing alerts and review storage/operation metrics monthly. Use cacheable immutable URLs. |
| Broken links during cutover | Existing database rows contain legacy storage URLs. | Dual-read migration, immutable new keys, manifest-driven batches, and retain old objects until acceptance. |
| Cache staleness | Replacing an object at the same public key may serve stale content. | Use content-hashed static keys and never overwrite media in place; purge deliberately only when needed. |
| Credential exposure | R2 API secrets can grant bucket access. | Store only in secure project settings; never ship credentials to the browser; issue presigned URLs from the server. |
| Vendor dependency | Asset URLs would depend on Cloudflare availability and account access. | Keep source asset archive in GitHub, maintain an R2 export/backup, and use R2’s S3-compatible API to preserve portability. |

## Decision Options

| Option | Recommendation | What it solves | What it does not solve |
|---|---|---|---|
| Keep current approach only | Not preferred as the long-term primary plan | The current GitHub static archive and managed storage recover many static assets. | A future project-storage namespace change can still require asset restoration. |
| R2 for static assets only | **Best first decision** | Makes site-owned backgrounds, titles, and logos durable across project rebuilds with minimal live-data risk. | Existing listing photos and avatars still depend on the current storage namespace. |
| R2 for static assets plus all future public uploads | **Recommended target after a successful static pilot** | New listing images and avatars become independent of the managed project storage. | Existing media still needs a cautious migration. |
| Full public and private media migration | Defer until prior phases are proven | Consolidates media storage under durable, controlled buckets. | Requires the greatest authorization, backup, and migration discipline. |

## What Is Needed Before Implementation

1. Your approval of the phased approach, beginning with static assets only.
2. A Cloudflare-managed domain or partial CNAME setup for an asset hostname such as `assets.tradebilia.com`.
3. A Cloudflare R2 account ID and a **least-privilege R2 API token** for the designated buckets; these would be requested only through secure project settings.
4. Confirmation that billing alerts should be enabled and who should receive them.
5. Agreement that no old managed-storage object or database URL will be deleted until the R2 version and a separate backup have been verified.

## GoDaddy Comparison

GoDaddy is suitable for retaining the `tradebilia.com` registration and can manage DNS records, but its current developer platform documents domain registration and DNS management rather than an R2-equivalent, S3-compatible object-storage service. [7] Its documented Web Hosting file storage is a cPanel file manager intended for a small number of manual uploads or FTP transfers. [8] That is not a safe replacement for application-managed media because it lacks the needed scoped object API, server-issued presigned uploads, separate public/private buckets, object-level access pattern, and durable media migration workflow.

| Service | Appropriate Tradebilia role | Not appropriate for |
|---|---|---|
| GoDaddy | Domain registration; keep ownership and billing there. | Serving as the main programmatic media object store. |
| Cloudflare R2 | Durable public and private file storage with separate buckets and server-controlled access. | Relational listing, trade, member, or message data. |
| Tradebilia database | Structured application records and media URL metadata. | Image, PDF, or evidence file bytes. |

The practical choice is to **keep the domain registered at GoDaddy** and use Cloudflare R2 only after the DNS zone is safely managed by Cloudflare or an alternative production-grade object-storage/CDN design is selected. Do not substitute GoDaddy shared-hosting file space for R2.

## References

[1]: https://developers.cloudflare.com/r2/pricing/ "Cloudflare R2 Pricing"
[2]: https://developers.cloudflare.com/r2/buckets/public-buckets/ "Cloudflare R2 Public Buckets"
[3]: https://developers.cloudflare.com/r2/api/s3/presigned-urls/ "Cloudflare R2 Presigned URLs"
[4]: https://developers.cloudflare.com/r2/reference/data-security/ "Cloudflare R2 Data Security"
[5]: https://developers.cloudflare.com/r2/buckets/cors/ "Cloudflare R2 CORS"
[6]: https://developers.cloudflare.com/r2/buckets/delete-buckets/ "Cloudflare R2 Bucket Deletion"
[7]: https://developer.godaddy.com/ "GoDaddy Developer API"
[8]: https://www.godaddy.com/help/upload-files-using-my-web-hosting-cpanel-file-manager-3239 "GoDaddy Web Hosting cPanel File Manager"
