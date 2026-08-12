# Tradebilia New-WebDev Migration Quick Start

> **Critical platform limitation:** Manus Support confirmed that a fresh Project task cannot be documented as attaching to the current published Tradebilia WebDev checkout, controls, storage namespace, deployment, and live configuration. This is now a **controlled migration to an independent WebDev project**, not a normal session handoff.

> **Stop condition:** Do not create the replacement project, move media, update the external database, attach a domain, alter OAuth callbacks, or resume feature work until Rich approves the gates in `NEW_WEBDEV_MIGRATION_READINESS_REPORT.md`.

## 1. Read the Migration Package in Order

Before any migration action, read these documents in order:

1. `NEW_WEBDEV_MIGRATION_READINESS_REPORT.md` — controlling migration decision and gates.
2. `SESSION_HANDOFF_GUIDE.md` — current-project architecture, credential registry, database facts, and recovery reference.
3. `IMAGE_ASSET_INVENTORY.md` — static asset release and customer-media constraints.
4. `HANDOFF_ADVERSARIAL_AUDIT.md` — historical audit evidence and the failed fresh-task conclusion.
5. The **Session Transition Gate** in `todo.md`.

## 2. Do Not Treat a Fresh Task as a Continuation

Project shared files can be available in a fresh task while the active WebDev checkout and controls are not. Do **not** create a new website merely to work around that limitation, manually clone a replacement checkout, point a new application at the live database, or re-upload media without an approved migration plan.

The only approved project-creation path is the independent-project/Make a Copy route described in the migration report, after all pre-creation gates are met. Keep that new project unpublished and without a production domain until it passes staging acceptance.

> **Do not create the replacement project yet.** First satisfy every Gate 0–4 prerequisite in the migration report and obtain Rich’s written approval.

## 3. Preserve the Migration Baseline

Before migration execution, preserve these records without exposing raw values:

| Boundary | Required baseline |
|---|---|
| Code | Approved GitHub `main` commit, clean content comparison, passing TypeScript/tests/build. |
| Live data | Confirmed external `CUSTOM_DATABASE_URL`, provider backup/point-in-time recovery evidence, schema/migration ledger, and relational-integrity report. |
| Static design assets | GitHub release `tradebilia-static-assets-2026-08-11` with SHA-256 `182292f179319e64610d25c273018df8d3665c225b34870335d0c0651a78528c`. |
| Customer media | A checksum-backed manifest and old-to-new mapping for every populated media field. Do not place customer images in GitHub. |
| Security | Required secret names, exact `ENCRYPTION_KEY`/`JWT_SECRET` compatibility, OAuth callback plan, and external API test plan—without printing values. |
| Cutover | GitHub-link decision, both-domain cutover plan, scheduled-writer pause/resume plan, maintenance mode, and tested rollback plan. |

## 4. Current Measured Media Inventory

The last read-only external-database inventory measured 25 listing-photo records across 15 listings and 4 profile-avatar records, all using current-project `/manus-storage/...` paths. Legacy user avatars, draft photo payloads, complaint photos, review photos, and user-report evidence payloads were empty at measurement time. These counts must be rerun immediately before migration.

## 5. Required Gates Before Replacement-Project Creation

1. Rich selects an approved media strategy: user-owned independent storage (recommended) or a scheduled maintenance-window cutover.
2. Every media binary is exported and SHA-256 checked, with exceptions explicitly approved.
3. The live external database has a verified backup, integrity report, schema/migration check, and rollback procedure.
4. The three existing scheduled writers—draft cleanup, referral digest, and trade reminders—have a documented pause/resume plan.
5. Manus/GitHub/domain support questions are resolved: new-project repository linkage, both current hostnames, and provider callback behavior.
6. Rich explicitly approves creation of the independent unpublished project.

## 6. Security Rules

Never copy, attach, print, or commit raw secrets. The local `.project-config.json` is platform-generated runtime metadata and is not a handoff source. **Do not open, copy, attach, print, or commit it.** Verify secret presence through secure settings only. Do not rotate encryption/session keys during initial migration; key parity must be verified before any live-data cutover.

## 7. Approval Requirement

The first migration action begins only after Rich approves the selected media strategy and all readiness gates. The old project remains live and unchanged until the replacement project passes staging acceptance and a reversible domain/database/media cutover has been approved.
