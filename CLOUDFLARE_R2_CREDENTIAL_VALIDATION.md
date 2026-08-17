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

Cloudflare R2 is **prepared but not integrated**. Existing Tradebilia images continue to use their current storage URLs. No R2-backed upload, serving, migration, database update, asset hostname change, or production media behavior will be implemented unless the user explicitly approves the separate implementation phase.

## Required future decision

Before any code work begins, the user must approve the staged implementation plan: add the R2 storage adapter and new-upload path, validate it without migration, then decide separately whether to migrate existing public media in reversible batches. Private evidence remains a later, independently authorized phase.
