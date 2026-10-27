# Tradebilia Adversarial Handoff Audit Ledger — Historical Current-Project Evidence

> **Supersession notice:** This ledger records the August 2026 audit of the **current** Tradebilia WebDev project. A fresh-task test and Manus Support response established that a new Project task receives shared files but cannot be documented as attaching to the active WebDev checkout, controls, storage, and deployment configuration. This ledger is therefore **not** a replacement-project bootstrap guide. Use `NEW_WEBDEV_MIGRATION_READINESS_REPORT.md` for every new-WebDev decision.

## Status Definitions

| Status | Meaning |
|---|---|
| **Proven in current project** | Directly verified in the current deployment, codebase, or durable artifact. |
| **Nonportable to new project** | Exists now but does not automatically transfer to an independent WebDev project. |
| **Blocked / requires migration gate** | Must be designed, approved, and verified before a replacement project is created or published. |

## Historical Findings

| Boundary | Historical finding | Status for new WebDev project |
|---|---|---|
| Project task continuity | Project shared files were available to a fresh task, but the active WebDev checkout/control surface was not. | **Blocked:** do not treat a fresh task as continuation. |
| GitHub source | Current code and handoff documents were synchronized to `tradebilia/collectors-barter` `main` after content checks. | **Transferable:** lock an approved commit; new-project GitHub integration requires a separate decision. |
| External database | Runtime and Drizzle migration configuration prefer `CUSTOM_DATABASE_URL`; production health was connected. | **Transferable only by secure intentional reconnection:** never substitute the platform database. |
| Static design assets | 46 active static paths returned `200`; deterministic backup release checksum verified. | **Nonportable:** restore to new storage and update references after verification. |
| Listing and avatar media | 25 listing-photo records and 4 profile avatars use current-project `/manus-storage/...` paths; historical public audit paths resolved after one authorized cleanup. | **Critical migration gate:** checksum-backed binary export, mapping, and controlled database/media update required. |
| User-media fields | Listing photos, profile/user avatars, draft payloads, complaint photos, review photos, and user-report evidence were identified in schema. | **Manifest gate:** enumerate all populated fields immediately before migration. |
| Secrets and encryption | Secret names were documented without raw values; `.project-config.json` is local ignored metadata. | **Security gate:** restore through secure settings and verify encryption/session key parity. |
| Integrations/OAuth | Twilio and Sold-Comps had current validation coverage; multiple providers use secret and callback configuration. | **Staging gate:** verify external APIs and callbacks before domain cutover. |
| Background writes | Three enabled Heartbeat jobs exist: cleanup expired drafts, referral digest, and trade reminders. | **Concurrency gate:** prevent dual writers during migration/cutover. |
| Domains | Current domains are `tradebilia.manus.space` and `tradebilia-vauewtpb.manus.space`. | **Cutover gate:** replacement project does not automatically inherit either domain. |

## Audit Conclusion

The current project was internally healthy at the time of audit, but a seamless fresh-task handoff was disproven. The safe replacement path is a gated migration that preserves the current project until source, database, media, secrets, integrations, scheduled writers, domains, and rollback controls are verified. See the migration readiness report for the authoritative sequence.

## Documentation and backup reconciliation — October 27, 2026

The earlier project-shared copies were older than the repository handoff set and contained conflicting continuation instructions. The repository versions were retained as the authority, the shared TNN asset records were preserved in the repository asset inventory, and the reconciled documents were mirrored back to project shared files.

Final evidence required for this reconciliation: the WebDev checkpoint is `f956d7c9`; GitHub `main` must match the final local commit; the working tree must be clean; and the five reconciled documents must have identical SHA-256 hashes in the repository and project-shared directory. No secret values are included.

## Stage 1 external-TiDB cutover safety — October 27, 2026

The runtime now defaults explicitly to the legacy Tradebilia target. New TiDB is selected only by `TRADEBILIA_DATABASE_TARGET=new` and its protected new URL; startup requires a verified-TLS connection and confirms the server-selected database name by read-only query. There is no automatic fallback, which prevents a failed new target from silently writing to another database.

`TRADEBILIA_MAINTENANCE_MODE=1` is mounted ahead of every application route and permits only `GET /health`; it blocks webhooks, OAuth, scheduled writers, tRPC, storage, and static requests with a non-cacheable `503`. This was compiled and tested in a temporary process. The live isolated-development runtime remains default-legacy with maintenance disabled. A future cutover still requires an exact Rich-approved activation window, health/attestation evidence, controlled smoke tests, a deliberate reopen decision, and a documented rollback to `legacy`; Stage 1 did not change a secret, activate new TiDB, migrate schema, or write application data.
