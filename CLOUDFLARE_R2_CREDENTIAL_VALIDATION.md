# Cloudflare R2 Public-Media Credential Validation

**Date:** 2026-08-17

## Security outcome

The initially created R2 token was exposed in a chat screenshot and was immediately revoked at the user’s direction. A replacement R2 token was created and entered only through secure project settings. No credential value, endpoint value, access-key identifier, or secret key is recorded in this document, source control, application source, or project logs.

## Scope

| Item | Status |
|---|---|
| Token permission | Object Read & Write |
| Token bucket scope | `tradebilia-public-media` only |
| Private-evidence bucket access | Not granted |
| Domain/DNS/account-administration access | Not granted |
| Validation operation | Signed S3-compatible list request limited to one object |
| File upload, overwrite, copy, or deletion | Not performed |
| Database update or existing media URL change | Not performed |

## Validation result

The secure R2 credential smoke test completed successfully. The test authenticates through a signed, read-only S3-compatible request against `tradebilia-public-media`, proves the replacement credentials and endpoint are valid, and cannot create, alter, delete, migrate, or expose media. The test is deliberately scoped to a maximum one-object listing response.

## Current boundary

Cloudflare R2 is **integrated for approved public media and static artwork**. Public listing photos and avatars use `media.tradebilia.com`; the approved static site artwork set uses `assets.tradebilia.com`. The public-media adapter uses the separate public-media credential, while the static migration used its separate static-only credential. Neither credential value is recorded here.

Private report evidence remains deliberately outside public Cloudflare buckets. It continues to use the protected managed-storage path under `reports/{userId}/...`, where server-side ownership validation rejects cross-user attachments.

## Historical implementation decision

The staged public-media implementation and reversible migration were separately approved and completed after this credential validation. The remaining storage decision is whether a distinct **private** Cloudflare evidence implementation is ever needed; it must not reuse either public bucket or public hostname.
