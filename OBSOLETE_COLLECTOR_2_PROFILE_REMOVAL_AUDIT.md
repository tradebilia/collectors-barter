# Obsolete Collector 2 Profile Removal Audit

**Date:** 2026-08-18

## Scope

The user directed the removal of the obsolete public profile at `/profile/2`. This audit was completed before deletion to avoid affecting an active account or related records.

## Read-Only Dependency Check

| Check | Result |
|---|---|
| Account in `users` with ID 2 | None found |
| Profile record in `userProfiles` with ID 2 | One orphaned profile record found |
| Relationship-dependent records using ID 2 | None found outside the profile record itself |
| Deletion condition | Exact orphaned profile identity and its unreachable legacy avatar URL |

## Removal Result

Exactly one orphaned `userProfiles` row was deleted. No active user account, listing, message, trade, review, report, static asset, R2 object, or other dependent record was changed. The inaccessible legacy avatar object was not accessed or deleted because no longer-referenced storage cleanup is outside this approved database-record removal.

## Public Verification

The standard public route `https://tradebilia.manus.space/profile/2` no longer resolves an active Collector 2 profile or exposes the prior avatar. The route contains only the shared page shell without profile content.
