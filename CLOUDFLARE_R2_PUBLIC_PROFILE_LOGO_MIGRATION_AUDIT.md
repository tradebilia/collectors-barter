# Public Profile Logo Migration Audit

**Completed copy and source update:** 2026-08-18

## Scope

This migration copied only the exact six distinct Wikimedia logo files already displayed by `PublicProfile.tsx` to `tradebilia-static`. Facebook is referenced twice in the page, producing seven updated source references. No logo artwork was regenerated, edited, resized, recolored, or substituted. The existing CSS dimensions and alternate labels remain unchanged.

| Brand | Exact prior source | Cloudflare static URL | SHA-256 |
|---|---|---|---|
| Facebook | `upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_(2019).png` | `assets.tradebilia.com/public-profile-logos/Facebook_Logo_2019_9f37233f.png` | `da72288b67c0f431410c12a2be36c75e103135c60968fff710412b4e4f079b84` |
| PayPal | `upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg` | `assets.tradebilia.com/public-profile-logos/PayPal_6434033c.svg` | `bb230994469278cbe80e0336a575209516879ad6a5e8cc9233956e71747de578` |
| Instagram | `upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg` | `assets.tradebilia.com/public-profile-logos/Instagram_logo_2016_2d7f0690.svg` | `8060ef38a7f4c25ea5e8bf5df005a4472de35f56836c64442341a9e590591e56` |
| X / Twitter | Wikimedia metadata resolved the renamed exact source file | `assets.tradebilia.com/public-profile-logos/X_logo_2023_white_bdc2fda7.svg` | `f09b59f320840f8e74fc7df2f76bfb834250c2fb4f6de9c21a82842d827cf627` |
| eBay | `upload.wikimedia.org/wikipedia/commons/1/1b/EBay_logo.svg` | `assets.tradebilia.com/public-profile-logos/EBay_logo_0494719f.svg` | `a74b5e3fe552613af384eb20dfc082cd1a9a0e035a417d6df1ce760b6fac3967` |
| LinkedIn | `upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png` | `assets.tradebilia.com/public-profile-logos/LinkedIn_logo_initials_290575a9.png` | `5c40fb93330c26d04d51d04bcc6e1b21e69e3c2a3fa5cb5fd64e7e8869313aa7` |

## Verification

Each R2 object was fetched through `assets.tradebilia.com` with a cache-busting query and SHA-256-checked against the downloaded exact source bytes before source code was updated. Development Public Profile verification rendered the connected eBay, Facebook, and LinkedIn brand logos from the static hostname. The client regression test confirms all six static URLs and rejects retained Wikimedia Commons references.

Third-party OAuth profile photographs remain dynamic user-account content and were not part of this logo-only migration.
