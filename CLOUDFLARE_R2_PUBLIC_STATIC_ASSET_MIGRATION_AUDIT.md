# Cloudflare R2 Public Static-Asset Migration Audit

**Completed:** 2026-08-17
**Scope:** Approved public, source-controlled/static site artwork only
**Destination:** `tradebilia-static` via `https://assets.tradebilia.com`
**Excluded:** Listing photos, profile avatars, private report evidence, database file records, and all secret values.

## Result

All **60 unique public static keys** referenced by the client at migration time were copied to `tradebilia-static`. Every successful copy was fetched from the public hostname using a cache-busted URL and SHA-256-checked against the exact uploaded bytes before it was counted as complete. The final validation consisted of an initial verified batch of **38** assets and a low-concurrency retry batch of the remaining **22** assets; the retry completed with **22 migrated and 0 failures**.

| Control | Verified outcome |
|---|---|
| Static R2 credential | Validated through the existing read-only smoke test; credentials were neither printed nor committed. |
| Object delivery | All 60 public static objects passed public-hostname SHA-256 verification. |
| Exact recovery sources | 12 legacy-unavailable files were restored only from exact-filename matches in the verified GitHub archive. |
| Other static sources | 48 files were copied from the current managed-storage route. |
| Client references | Literal static artwork URLs in `client/src` now use `https://assets.tradebilia.com/{key}`. |
| Email references | Static Tradebilia logo URLs in member-facing email templates now use `https://assets.tradebilia.com/{key}`. |
| Dynamic media | Listing photos and avatars remain on `media.tradebilia.com`; their migration and rollback paths remain unchanged. |
| Private evidence | Remains outside all public buckets and continues to use the existing protected storage path. |

## Exact-Source Recovery Safeguard

The legacy storage source returned HTTP 403 for some static assets. Rather than substituting similar artwork, the migration used only these exact filename matches from the checksum-verified `tradebilia-static-assets-2026-08-11` GitHub release archive:

```text
AutoBackground_77c0fc6a.png
Background_48b923f1.jpg
CoinsBackground_8f7db775.png
ComicsBackground_798a970b.webp
DisneyPinsBackground_68498869.webp
MoviesBackground_603eb7a8.png
PokemonBackground_d2f9e795.webp
SportsCardBackground_e2e711d1.webp
StampsBackground_1bb5af50.png
VideoGamesBackground_f9315289.webp
VintageToysBackground_a95e7b30.png
tradebilia_final_transparent_58812c5a.svg
```

The release archive checksum was verified before use:

```text
182292f179319e64610d25c273018df8d3665c225b34870335d0c0651a78528c
```

For continuity, the 46-file verified archive has been retained outside the deployable repository at:

```text
/home/ubuntu/webdev-static-assets/tradebilia-static-r2-recovery-archive/
/home/ubuntu/projects/tradebilia-website-edca9ae3/static-r2-recovery-archive/
```

## Reversibility and Operational Notes

This was a copy-and-reference migration: no legacy static object was deleted, no database row was changed, and no private object was moved. Reverting the source URL commit restores the prior managed-storage references; retained R2 copies can remain safely in place. The one-time migration and URL-refactor utilities will be removed before the release checkpoint, while this audit remains as the operational record.

## Release Verification Completed

The application-level validation completed after migration. TypeScript and the full regression suite passed, and the standard public domain was checked after deployment propagation. The homepage logo and hero background, Comics category title artwork, Member Directory title artwork, Report a Member title artwork, Profile title artwork, and Account Settings title artwork all rendered from `assets.tradebilia.com` on representative deployed routes. A follow-up source inventory found 60 unique static R2 URLs in client/email code, zero literal client static `/manus-storage/` paths, and HTTP 200 availability for every referenced static URL.
