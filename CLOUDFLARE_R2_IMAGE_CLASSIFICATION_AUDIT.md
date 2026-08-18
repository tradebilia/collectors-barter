# Cloudflare R2 Image Classification Audit

**Date:** 2026-08-18

## Summary

Cloudflare R2 now holds **all database-backed public listing photos and non-empty profile avatars**. It does not yet hold every image referenced by the application, because static site-owned artwork and private report evidence deliberately remain on their existing managed-storage paths pending their own approved migration phases.

## Current Image Classes

| Image class | Current location | R2 status | Why |
|---|---|---|---|
| Listing photos | `https://media.tradebilia.com/...` | **Complete** | Fresh audit: 28 of 28 rows use R2. |
| Non-empty public avatars | `https://media.tradebilia.com/...` | **Complete** | Fresh audit: 3 of 3 non-empty avatar rows use R2. |
| Static site artwork | `/manus-storage/...` | **Not yet migrated** | Hero backgrounds, title art, shared branding, integration logos, and UI assets still reference managed project storage. The source inventory identified `/manus-storage/` references in 45 application files. |
| Private report evidence | Managed private storage via `storagePut` | **Intentionally not migrated** | Evidence requires a separate private R2 implementation with signed authorization. It must never use the public `media.tradebilia.com` host. |
| Generated images | Managed project storage | **Not yet migrated** | The internal image-generation helper currently saves generated files through the managed storage helper. |
| External provider/brand imagery | Provider-controlled URLs or embedded source assets | **Mixed by design** | Third-party provider assets are not all Tradebilia-owned media and should be reviewed individually before copying. |

## Recommendation

The next appropriate R2 phase is **static site-owned artwork** only: copy and verify logo, hero, title, and owned integration asset files into `tradebilia-static`, then update their references to `assets.tradebilia.com` in reversible groups. Do not include private evidence, generated content, or third-party-owned brand artwork in that phase without separate approval and access-control review.
