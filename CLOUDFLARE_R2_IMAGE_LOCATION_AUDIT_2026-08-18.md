# Current Image Location Audit

**Audit date:** 2026-08-18
**Method:** Read-only aggregate inspection of the custom application database and literal client image-reference review. No media, database record, or Cloudflare object was changed.

## Current Public Tradebilia Media

| Image class | Current location | Verified result |
|---|---|---|
| Listing photos | `media.tradebilia.com` | 30 of 30 persisted listing photos are Cloudflare R2-hosted. |
| Profile avatars | `media.tradebilia.com` | 3 of 3 non-empty product profile avatars are Cloudflare R2-hosted. |
| Static heroes, title artwork, approved profile integration logos, generated public artwork, and email logo | `assets.tradebilia.com` | The approved 60-object public static migration remains complete; current source references use the static hostname. |
| Account-level avatar field | Not used for product avatar rendering | All 3 current account-level values are empty; the product uses `userProfiles.avatarUrl`. |
| Draft listing photos | No current records | There are no active draft-photo payloads to classify. |

## Images Outside Cloudflare

| Image or image class | Current location | Reason and disposition |
|---|---|---|
| Public-profile social and marketplace logos | `upload.wikimedia.org` | Six distinct brand marks—eBay, Facebook, LinkedIn, PayPal, Instagram, and X—remain direct third-party references on `PublicProfile.tsx`. This is a real static-asset exception and can be migrated as exact-source copies in a later approved maintenance step. |
| Missing-listing-photo fallback | `d2xsxph8kpxj0f.cloudfront.net` | One external placeholder is used only when a listing has no image. It is a real static-asset exception and can be copied exactly to `assets.tradebilia.com`. |
| Private report-evidence attachments | Protected `/manus-storage/reports/...` path when attachments exist | Deliberately not public Cloudflare storage. There are currently no report-evidence rows; future evidence must remain private unless a separate signed-access private-R2 design is approved. |
| Inline SVG artwork | Application source code | The animated Tradebilia mark is inline SVG, not an externally hosted image file. This is intentional and has no broken-link risk. |

## Conclusion

All current database-backed public collector imagery is Cloudflare-hosted. The remaining non-Cloudflare image references are limited to seven Public Profile brand-logo references representing six brands, one external no-image fallback, deliberately protected future report evidence, and inline SVG markup. The Public Profile brand marks and fallback are the only public display images that remain appropriate candidates for exact-source Cloudflare migration.
