# Cloudflare R2 Image Classification Audit

**Date:** 2026-08-18

## Summary

Cloudflare R2 now holds **all database-backed public listing photos and non-empty profile avatars**, plus the approved static site artwork referenced by the application. Private report evidence remains intentionally outside all public Cloudflare buckets.

## Current Image Classes

| Image class | Current location | R2 status | Why |
|---|---|---|---|
| Listing photos | `https://media.tradebilia.com/...` | **Complete** | Read-only audit: 30 of 30 rows use R2 and all 30 public URLs returned HTTP 200. |
| Non-empty public avatars | `https://media.tradebilia.com/...` | **Complete** | Fresh audit: 3 of 3 non-empty avatar rows use R2. |
| Static site artwork | `https://assets.tradebilia.com/...` | **Complete** | All 60 distinct approved static keys referenced by client/email code migrated and returned HTTP 200 in the post-migration audit. |
| Private report evidence | Managed private storage via `storagePut` | **Intentionally not migrated** | Evidence requires a separate private R2 implementation with signed authorization. It must never use the public `media.tradebilia.com` host. |
| Generated images | Managed project storage | **Not yet migrated** | The internal image-generation helper currently saves generated files through the managed storage helper. |
| External provider/brand imagery | Provider-controlled URLs or approved static copies | **Mixed by design** | The approved Tradebilia integration-logo copies are in `assets.tradebilia.com`; provider-controlled imagery remains untouched. |

## Recommendation

The next appropriate R2 decision is **not another public migration**. Public media and approved static artwork are complete. Do not include private evidence, generated content, or provider-controlled imagery in a future Cloudflare phase without separate approval, a dedicated private credential, and signed authorization design.
