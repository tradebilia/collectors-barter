# Tradebilia New-WebDev Migration Readiness Report

**Prepared:** August 11, 2026
**Purpose:** Define a controlled migration from the current Tradebilia WebDev project to a new, independent WebDev project after Manus Support confirmed that a fresh Project task cannot attach to the active published WebDev checkout, controls, storage namespace, and deployment configuration.

> **Decision:** This is not a normal session handoff. It is a **new-WebDev migration**. No replacement project should be created or published until the blocking items in this report have an approved migration design and verification plan.

## 1. Executive Conclusion

The Tradebilia source code can be reproduced from GitHub. The official **Make a Copy** route is the supported way to create an independent WebDev project from the current project: it copies source code and is documented to copy secret definitions/values, but it starts with an independent project, fresh platform database, no publishing/domain state, and no GitHub integration. Every copied secret and every live-data connection must still be independently verified through secure settings. [2]

The live business data can remain available only if the new application is intentionally and securely connected to the same external `CUSTOM_DATABASE_URL`. The current project’s deployment bindings, project object-storage namespace, static asset paths, listing media, avatars, GitHub integration linkage, and domain publication state are **not automatically transferred** to the independent WebDev project.

The largest migration risk is media. The external database stores relative `/manus-storage/...` paths, but those paths resolve through the current WebDev project’s object-storage proxy. A new WebDev project has a separate storage namespace. Connecting the new application to the same live database without a media migration strategy will make existing listing photos and avatars point to the old project namespace. Updating those database paths before the old site is retired can break media on the current production site.

The safe path is therefore a staged migration with explicit go/no-go gates, a media strategy, a reversible domain cutover, and a documented rollback path. Every customer-media transfer must be driven by a **checksum-backed binary manifest**, not by a visual-only listing scrape or database URL substitution.

## 2. Evidence Sources and Confidence Levels

| Evidence | Finding | Confidence |
|---|---|---|
| Rich-provided Manus Support response, August 2026 | No documented method binds a fresh Project task to the existing live WebDev project. | **Confirmed by Support** |
| Official Manus Projects documentation | Projects distribute shared instructions/files to new tasks; they are not documented as a way to attach a task to an active WebDev runtime. [1] | **Documented** |
| Official Manus Make a Copy documentation | A copy transfers source code and is documented to transfer secrets, but starts with a fresh database, no publishing/custom domains, no GitHub connection, and independent project state. [2] | **Documented; secret presence still requires secure verification** |
| Current production media audit | 46 active static paths, 25 listing-photo records across 15 listings, and 4 avatar records currently use `/manus-storage/...` paths. | **Directly measured** |
| Current GitHub release | 46 active static design assets are preserved in `tradebilia-static-assets-2026-08-11.tar.gz` with a recorded SHA-256 checksum. | **Directly verified** |
| Current application code | Runtime and Drizzle migration configuration prefer `CUSTOM_DATABASE_URL` over the Manus-managed `DATABASE_URL`. | **Directly inspected and tested** |

## 3. Transferability Matrix

| Boundary | Transfers to a new WebDev project? | Required migration action | Migration risk |
|---|---|---|---|
| Source code, tests, schema, documentation | **Yes** — via current GitHub `main` or Make a Copy source transfer. | Lock a known GitHub commit; verify TypeScript, tests, and production build in the new project. | Low if GitHub baseline is locked. |
| GitHub automatic integration | **No** — official documentation says it is not copied. [2] | Obtain an approved project-to-repository linking/cutover procedure before attaching any new project to `tradebilia/collectors-barter`. Do not assume both projects may safely auto-sync the same branch. | **Blocked** pending a supported linking model or an intentionally separate migration repository. |
| External `CUSTOM_DATABASE_URL` records | **Not automatically copied by Make a Copy**; the new app can intentionally reconnect to the same external database. | Securely supply the exact intended external connection; confirm host/database identity, schema, and backup before any write. | High if an incorrect or empty database is used. |
| Manus-managed database | Copy creates a fresh schema/database state. [2] | Do not treat it as Tradebilia’s live database and do not seed it as a substitute. | High risk of apparent data loss/confusion. |
| Static backgrounds, title graphics, logos | **No automatic project-storage transfer.** | Restore 46 static assets to the new project from the verified release archive; capture the new URLs and update code only after validation. | Medium; archive provides recovery, but new URLs must be verified. |
| Listing photographs | **No automatic project-storage transfer.** | Export/manifest all 25 current binary files and metadata, calculate SHA-256 per binary, upload to an approved durable media target, and maintain an old-to-new mapping. | **Critical**; `listingPhotos.imageUrl` and `listingPhotos.fileKey` point to old relative paths. |
| Member avatars | **No automatic project-storage transfer.** | Export/manifest all 4 current avatar binaries and metadata, calculate SHA-256 per binary, and map `userProfiles.avatarUrl`/`avatarKey` and `users.avatarUrl`. | **Critical**; same path/namespace issue as listing photos. |
| User-uploaded documents/other media | Not proven to be fully represented by the public audit. | Perform a database/media manifest before cutover for `listingPhotos.imageUrl`, `listingPhotos.fileKey`, `userProfiles.avatarUrl`, `userProfiles.avatarKey`, `users.avatarUrl`, `draftListings.photos`, `tradeComplaints.photos`, `tradeReviews.photos`, and `userReports.evidence`. | High until every populated field has a checksum-backed manifest or approved exception. |
| Secrets and API credentials | A Make a Copy is documented to transfer secrets, but a separately created project must be treated as needing secure re-establishment. [2] | Verify names and presence through secure settings; never place raw values in GitHub or handoff files. Test external APIs in the unpublished new project. | High for OAuth, Twilio, eBay, Parse.bot, Sold-Comps, Resend, PayPal, and encryption keys. |
| `ENCRYPTION_KEY` / `JWT_SECRET` | Must remain compatible if existing encrypted provider tokens/session data are to remain usable. | Verify secure parity with the existing production values before cutover; do not rotate during initial migration. Plan user reauthentication even if parity succeeds. | High; mismatches can invalidate token decryption and sessions. |
| Built-in Forge credentials/storage | New project receives its own platform-scoped configuration. | Validate Forge LLM and storage behavior in the new project; do not assume access to old project storage. | High for relative `/manus-storage` URLs. |
| OAuth redirect configuration | Not automatically guaranteed by a new domain/project. | Update eBay, Facebook, LinkedIn, and other provider callbacks only after the target URL/domain is finalized. | Medium to high. |
| Published status and domain | **No** — official documentation says copies start unpublished and do not inherit custom-domain settings. [2] | Keep the old production project live until the new project passes acceptance; plan cutover for both current hostnames: `tradebilia.manus.space` and `tradebilia-vauewtpb.manus.space`. | High; premature cutover can cause outage. |
| Browser sessions, local logs, `node_modules`, `/tmp` | No. | Reinstall and reauthenticate; never rely on sandbox files as backups. | Low. |

## 4. Media Migration Is the Primary Go/No-Go Gate

### Current measured inventory

| Media class | Current count | Storage pattern | Status |
|---|---:|---|---|
| Active static design assets | 46 | Current project `/manus-storage/...` | Release-backed and checksum-verified. |
| Listing photo records | 25 | All use `/manus-storage/...` | Binary export and old-to-new mapping required. |
| Listings with photos | 15 | Database `listingPhotos` records | Mapping/update plan required. |
| Avatar records | 4 | All use `/manus-storage/...` | Binary export and old-to-new mapping required. |
| Draft listings with photo payloads | 0 | `draftListings.photos` at measurement time | No current draft-photo migration workload, but include the field in the manifest. |
| Legacy `users.avatarUrl` records | 0 | `users.avatarUrl` at measurement time | Include the field in the manifest; no current binary workload. |
| Complaint photo payloads | 0 | `tradeComplaints.photos` at measurement time | Include the field in the manifest; no current binary workload. |
| Review photo payloads | 0 | `tradeReviews.photos` at measurement time | Include the field in the manifest; no current binary workload. |
| User-report evidence payloads | 0 | `userReports.evidence` at measurement time | Include the field in the manifest; no current binary workload. |

### Why simply reconnecting the database is unsafe

The new application can read live listings from the external database after `CUSTOM_DATABASE_URL` is restored, but every `listingPhotos.imageUrl`, `listingPhotos.fileKey`, `userProfiles.avatarUrl`, and related media field currently references the old project’s storage namespace. Relative `/manus-storage/...` URLs must be treated as nonportable across an independent project: the new project’s storage/proxy behavior must be verified after restoration, and the old project storage must not be assumed to remain addressable through the new runtime.

Updating all paths in the live database before the old project is retired creates a split-brain period: the old production site can lose its media while the new site gains it. Therefore, a migration cannot safely proceed without one of the approved strategies below.

## 5. Required Migration Strategy Decision

### Strategy A — User-owned, project-independent object storage (**recommended**)

Export current static/user media into storage owned by Tradebilia, such as an approved external object-storage/CDN account. Update the application to serve durable absolute URLs or a controlled media domain. Validate the change on the current project first, then create the new WebDev project. This decouples customer media from Manus project namespaces and gives both old and new applications a shared media source during the transition.

| Advantages | Costs / prerequisites |
|---|---|
| Lowest cutover risk; avoids split-brain media paths; portable to future hosts. | Requires Rich’s storage-provider decision, secure credentials, application changes, comprehensive media export/import, and validation. |

### Strategy B — Scheduled maintenance-window media cutover

Keep the old project live while the new project is prepared against a read-only or cloned database. At an approved maintenance window, export/upload all media to the new project, verify new storage objects return `200`, place the application in read-only maintenance mode, pause scheduled writers, update database media URLs through an idempotent version-controlled migration with an audit log, verify the new project, and move the domains. The old project’s media may no longer work after database path updates, so rollback requires a database restoration or a proven backward-compatible media mapping—not merely retaining old code.

| Advantages | Costs / prerequisites |
|---|---|
| Avoids an external storage provider in the short term. | Requires downtime or a carefully controlled maintenance window; rollback is more complex; full media manifest and transaction plan are mandatory. |

> **No-go rule:** Do not create/publish the replacement project against the live external database until Rich approves one of these media strategies and a tested rollback procedure.

## 6. Proposed Controlled Migration Sequence

| Gate | Action | Required evidence | Stop condition |
|---|---|---|---|
| 0. Freeze and baseline | Pause feature changes; record GitHub commit; run tests/build; use the official data-backup process as instructed by Manus Support if changes continue before their cutoff. | Clean GitHub state, tests/build result, backup confirmation retained by Rich. | Any uncommitted or unpushed work. |
| 1. Choose media strategy | Rich selects Strategy A or Strategy B. | Written approval of storage/cutover approach. | No approved media strategy. |
| 2. Build complete media manifest | Inventory every named media field; download and SHA-256 checksum every binary from the old project; design old-to-new mapping and exception handling. | Manifest totals, checksums, inaccessible-file exception list, and source-to-target mapping. | Any missing binary or unexplained URL. |
| 3. Preserve and audit external database | Confirm provider backup and point-in-time recovery, correct target database, schema/migration ledger, SSL settings, row counts, foreign-key/orphan checks, and migration window. | Backup timestamp, schema fingerprint, relational-integrity and read-only baseline report. | Incorrect database, schema drift, failed integrity check, or unverified backup. |
| 4. Control concurrent writers | Identify/plan the three current scheduled writers—draft cleanup, referral digest, and trade reminders—and prevent old/new dual execution during cutover. | Written pause/resume and maintenance-mode plan. | Any uncontrolled scheduled or user write path. |
| 5. Create supported new project | Use the official independent-project/Make a Copy route only after Gates 0–4. Keep it unpublished and do not attach production domains. | New project identity, no production domain attached, secure settings review. | Auto-publish/domain or GitHub-link behavior is unclear. |
| 6. Restore code/config | Restore locked GitHub source; configure/verify all required secrets securely; confirm encryption/session key parity; test staging callback paths and external API health. | TypeScript/test/build passes; secret-presence and parity checklist; database source check; API/OAuth test report. | Missing critical secret, incorrect DB source, callback failure, or unverified GitHub link. |
| 7. Restore static/user media | Restore static assets; verify restored static/media objects return `200` before database updates; execute approved user-media migration with idempotent audited scripts. | 100% checksum-backed manifest coverage or approved exception list; new-path `200` evidence. | Any missing/corrupt media or unverified target object. |
| 8. Staging acceptance | Exercise anonymous, authenticated, admin, category, messages, account setup/Twilio, Test AI, merchant verification, scheduled-route safety, and error logs without publishing. | Acceptance test report and error-log review. | Functional/media/OAuth/background-write failure. |
| 9. Cutover | Lower external DNS TTL where applicable, pause scheduled writers/maintenance writes, attach both domains, update provider callbacks, and publish at an approved window. | DNS/domain, HTTPS, health, database, media, external API, and OAuth checks pass. | Any production smoke-test failure. |
| 10. Rollback window | Preserve old project/code, the old domain configuration, media mapping, and database point-in-time recovery plan; do not delete the old project. | Written rollback runbook and observation period. | No tested domain and database/media rollback path. |

## 7. Items That Must Be Confirmed Before Project Creation

1. **Supported GitHub workflow.** Official documentation says GitHub connection does not transfer to a copy. Confirm whether the new project should use a separate repository, whether the existing repository can be connected safely, or whether GitHub CLI becomes the temporary source-control path. Do not assume simultaneous automatic sync is safe.
2. **Custom-domain reassignment.** Confirm how **both** `tradebilia.manus.space` and `tradebilia-vauewtpb.manus.space` will move from the old project to the new project and whether the platform permits a no-overlap or maintenance cutover.
3. **Storage migration mechanics.** Confirm how static assets and all customer media will be uploaded to the new namespace while retaining exact database/media mappings and binary checksums.
4. **OAuth/callback plan.** Confirm which callback domains must change and whether each provider supports a temporary staging URL before production cutover.
5. **Background-write control.** Plan pause/resume for the three active Heartbeat jobs: nightly draft cleanup, weekly referral digest, and nightly trade reminders.
6. **Backup timing.** Follow Manus Support’s official backup/restoration instructions for service-change coverage; do not assume existing backup files cover later work.

## 8. Recommended Immediate Next Step

Do **not** start a new WebDev project yet. Rich should first choose the media strategy and obtain the unresolved platform answers in Section 7. After that decision, create a dedicated migration checklist and execute the migration in gates, with an explicit maintenance/cutover approval.

## References

[1]: https://manus.im/docs/features/projects "Manus Projects Documentation"
[2]: https://manus.im/docs/website-builder/make-a-copy "Manus Website Builder — Make a Copy"
[3]: https://manus.im/docs/website-builder/github-integration "Manus Website Builder — GitHub Integration"
[4]: https://manus.im/docs/website-builder/custom-domains "Manus Website Builder — Custom Domains"
[5]: https://github.com/tradebilia/collectors-barter/releases/tag/tradebilia-static-assets-2026-08-11 "Tradebilia Static Asset Recovery Release"
