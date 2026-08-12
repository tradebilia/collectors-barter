# Tradebilia Migration Prerequisite Evidence

**Status:** Read-only evidence collection in progress. This document is **not** authorization to create a new WebDev project, attach a domain, modify production data, transfer secrets, or begin Phase B2 cutover.

## 1. Baseline Revalidation

| Control | Evidence recorded | Result |
|---|---|---|
| Source baseline | GitHub `main` was fetched and locked at `04df09f` during the revalidation checkpoint. | Confirmed |
| Handoff package | The five controlling handoff documents and the Session Transition Gate were reread. The shared-file copies match the repository copies by SHA-256. | Confirmed |
| Production continuity | `https://tradebilia.manus.space` loaded normally with its expected public marketplace identity and listings. | Confirmed |
| Runtime database selection | `server/db.ts` explicitly selects `CUSTOM_DATABASE_URL` before the Manus-managed database URL. | Confirmed in source |
| Static recovery archive | GitHub release `tradebilia-static-assets-2026-08-11` verified against SHA-256 `182292f179319e64610d25c273018df8d3665c225b34870335d0c0651a78528c`. | Confirmed |

## 2. External Database Media Inventory

The platform database query surface returned empty media tables. A separate **read-only** connection explicitly using `CUSTOM_DATABASE_URL` returned the expected live-media baseline below. This confirms that staging must be cloned from the external Tradebilia database—not from the new project’s fresh platform database.

| Source field | Populated records | Related records | Manifest state |
|---|---:|---:|---|
| `listingPhotos` | 25 | 15 listings | 25 source binaries retrieved and checksummed |
| `userProfiles.avatarUrl` | 4 | 4 profiles | 3 source binaries retrieved and checksummed; 1 source object is inaccessible |
| `users.avatarUrl` | 0 | 0 | No binary workload |
| `draftListings.photos` | 0 | 0 | No binary workload |
| `tradeComplaints.photos` | 0 | 0 | No binary workload |
| `tradeReviews.photos` | 0 | 0 | No binary workload |
| `userReports.evidence` | 0 | 0 | No binary workload |

The local, non-repository evidence workspace contains a checksum-backed source manifest with these results:

| Manifest metric | Value |
|---|---:|
| Total database-backed media records | 29 |
| Retrieved and SHA-256 checksummed binaries | 28 |
| Explicit source-unavailable exceptions | 1 |
| Unique retrieved binaries | 28 |
| Manifest file SHA-256 | `7731f36909246b19130582fa7d35271f65b5851e596ba4c198a8cbc93bed5e5d` |

> **Blocking exception:** One legacy profile-avatar record is still present in the external database, but its current production `/manus-storage/...` route returned HTTP `403`. It has no checksum or staging target yet. It must be restored from a provider-supported object-storage export/backup, deliberately removed under a separate authorization, or otherwise resolved with an approved exception before the exact-snapshot gate can pass.

The manifest and retrieved binaries are deliberately retained outside the source repository. Customer media must not be committed to GitHub.

### Database Integrity Baseline

A separate read-only integrity report was generated using `CUSTOM_DATABASE_URL`; it is retained only in the local migration evidence workspace. The report’s SHA-256 is `95c6d5d44401da6320c69f6f0540beba129708a2c8dcc91f9bf4547a71bd75dc`, and its six-table schema fingerprint is `53eccdefa0d1b25b34f38ef2cfaac0d8910bb74d4f551ae347c82fdc4b8af0b1`.

| Integrity measure | Result |
|---|---:|
| Users | 3 |
| User profiles | 4 |
| Listings | 15 |
| Listing photos | 25 |
| Orphaned listing-photo records | 0 |
| Orphaned listing records | 0 |
| Orphaned user-profile records | 1 |

> **Additional blocker:** The single source-unavailable avatar belongs to the single orphaned profile record. It must remain untouched in production unless Rich separately authorizes a cleanup. The staging clone must retain the record until the media exception is restored or an approved exception/correction is documented.

## 3. Scheduled Writer Baseline

All three current project-level Heartbeat writers are enabled. They remain enabled in the current production project because no cutover or maintenance window has been approved.

| Writer | Callback | Schedule | Required Phase B1 action |
|---|---|---|---|
| Draft cleanup | `/api/scheduled/cleanupExpiredDrafts` | Daily at 03:00 UTC | Do not create or enable in staging |
| Referral digest | `/api/scheduled/referralDigest` | Monday at 13:00 UTC | Do not create or enable in staging |
| Trade reminders | `/api/scheduled/tradeReminders` | Daily at 04:30 UTC | Do not create or enable in staging |

## 4. Current Go/No-Go Assessment

| Gate | Status | Required next evidence |
|---|---|---|
| Locked source and static recovery baseline | Ready | Use the approved GitHub commit and verified static archive for the future copy. |
| External database clone | Blocked | A provider-supported writable isolated staging clone from a named production snapshot, with row-count, integrity, and write-isolation proof. |
| Customer-media transfer | Blocked | Resolve the one unavailable avatar; then record destination object URLs and verify every checksum from an independent project context. |
| Integration isolation | Blocked | A staging override matrix for email, SMS, payments, OAuth, analytics, and API side effects. |
| GitHub/project bootstrap | Blocked | An explicit choice of a separate migration repository or a provider-supported safe linkage procedure. |
| Domains and callbacks | Blocked | Written non-production hostname/OAuth criteria and a later both-domain rollback plan. |

## 5. Safety Rules Still in Force

The current production project remains the live system of record. Do not create the replacement project, attach either production hostname, point an application at the live external database, modify existing media paths, change OAuth callbacks, or enable the scheduled writers in any staging environment. A separate written approval is required after every row in the go/no-go table is evidenced.
