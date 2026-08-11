# Tradebilia Adversarial Handoff Audit Ledger

> **Purpose:** This ledger treats every continuity statement as untrusted until it is tied to reproducible evidence. It is not a setup guide. The new-session validation task must use it alongside `SESSION_HANDOFF_GUIDE.md`, `NEXT_SESSION_QUICK_START.md`, and `IMAGE_ASSET_INVENTORY.md`.

## Status Definitions

| Status | Meaning |
|---|---|
| **Proven** | Directly verified in the current project or production environment with reproducible evidence. |
| **Expected, not yet proven** | Supported by the architecture and current evidence, but requires a fresh in-project task to prove cross-session behavior. |
| **Blocked / unknown** | Cannot be safely established from the current session; the new task must stop and report it. |

## Claim Ledger

| ID | Continuity claim | Initial status | Evidence required | Required response if not proven |
|---|---|---|---|---|
| P-01 | The next task is created inside the existing **Tradebilia Website** project rather than a new WebDev project. | Expected, not yet proven | New task project context and shared-files panel show the existing project. | Stop; do not initialize a replacement project. |
| P-02 | The project folder is `/home/ubuntu/tradebilia-platform`. | Expected, not yet proven | Directory exists in the new task and contains the existing project checkout. | Stop and ask Rich to reopen the existing project. |
| R-01 | GitHub `main` contains the approved code and handoff documents. | Proven in the current audit; recheck in new task | Sanitized `github` remote identifies `tradebilia/collectors-barter`; content diff against `github/main` is empty. | Stop; do not merge, reset, force-push, or create a replacement repository. |
| R-02 | Shared handoff files are available to all tasks in this project. | Proven in the current audit; recheck in new task | Shared-files panel includes the three required documents. | Stop and report the missing files. |
| D-01 | Runtime uses the intended external database through `CUSTOM_DATABASE_URL`. | Proven in current production; recheck in new task | `/health` and dev logs identify the CUSTOM source without printing the URL; marketplace data is present. | Stop; do not substitute `DATABASE_URL`. |
| D-02 | Drizzle migration tooling prefers `CUSTOM_DATABASE_URL` when configured. | Proven by source review and regression test | `drizzle.config.ts` and `server/databaseConfig.test.ts` remain unchanged; no migration is run during validation. | Stop before any migration. |
| D-03 | Live data, listings, messages, and media metadata persist. | Proven currently; recheck in new task | Marketplace and representative protected views return expected non-empty live data after secure database verification. | Stop; do not seed or recreate data. |
| S-01 | Current static design assets resolve from project object storage. | Proven currently | All 46 active static paths returned `200` during the audit; test representative hero/title assets in the new task. | Use the release archive only after confirming the same project context. |
| S-02 | Current public listing and avatar media resolve. | Proven currently | All 27 retained public listing-detail/owner media paths returned `200` after the authorized cleanup; test representative listing and avatar paths in the new task. | Stop; verify project and external database before any media action. |
| S-03 | Static design assets can be recovered without using customer media as source files. | Proven currently | GitHub release `tradebilia-static-assets-2026-08-11` checksum matches `182292f179319e64610d25c273018df8d3665c225b34870335d0c0651a78528c`. | Do not bulk-copy listings or avatars into GitHub. |
| K-01 | Required secret names are known and raw values are absent from source control. | Proven for the current repository scan; secret availability is expected, not yet proven in the new task | Secure project configuration exposes required variable names; `.project-config.json` is Git-ignored/untracked/absent from GitHub history; GitHub scan finds no provider-formatted raw values. | Stop and request secure restoration; never request a raw value in source or documentation. |
| K-02 | Existing encrypted tokens and sessions remain compatible. | Expected, not yet proven | New task verifies presence of compatible `ENCRYPTION_KEY` and `JWT_SECRET`, then checks the authenticated flow without rotating either key. | Stop; do not rotate or replace either key. |
| I-01 | Current Test AI uses working eBay, Sold-Comps, and Parse.bot credentials when exercised. | Proven partly by current tests; recheck only if within approved validation scope | Required secrets are present; existing integration tests pass. | Do not change providers or AI behavior during validation. |
| I-02 | The active LLM resolver uses the platform Forge key; `TRADEBILIA_OPENAI_API_KEY` is deferred. | Proven by source review | `server/_core/llm.ts` continues returning Forge credentials; no model/provider configuration is changed. | Leave deferred until Rich approves pre-launch AI work. |
| O-01 | Browser cookies and local sandbox processes persist. | Blocked / unknown by design | Not required for a safe handoff. | Reauthenticate and reinstall/start local tooling as needed; do not treat absence as data loss. |
| A-01 | A fresh task in this same project can resolve static, listing, and avatar media without re-upload. | Expected, not yet proven | New-task acceptance check exercises representative paths before any change. | Stop and report; do not bulk re-upload media. |

## Strict Validation Rule

Until Rich confirms the new-task validation results, the validator must not edit source, alter database records, run migrations, modify secrets/connectors/deployment settings, re-upload/delete/move media, create checkpoints, or push to GitHub. Validation is evidence collection only.

## Current Audit Outcome — August 11, 2026

| Claim group | Result after this audit | Confidence boundary |
|---|---|---|
| Project, deployment, and GitHub access | **Proven in the current task.** The established project folder and project metadata exist; the sanitized GitHub remote identifies the intended repository; production `/health` returns `database: connected`; home returns `200`; and the recovery release returns `200`. | A new task must still prove that it was opened under the same project context. |
| Shared-file continuity | **Proven in the current task.** The three primary handoff files matched their durable project shared-file copies byte-for-byte before this final evidence file was added. | The new task must confirm that all four handoff files, including this ledger, appear in its shared-files panel. |
| Current live database path | **Proven in the current task.** `CUSTOM_DATABASE_URL` is present, differs from `DATABASE_URL`, the server logs only the redacted source name `CUSTOM`, `/health` reports connected, and runtime/migration code prefer the custom URL. | The new task must confirm that the same intended external target remains configured without printing it. |
| Current static and media storage | **Proven in the current task.** All 46 active static paths resolved to final `200` responses through signed redirects. The recovery archive checksum matched. Public listing detail and owner media retained after the authorized cleanup resolved in the prior 27-path audit. | Cross-session object-storage continuity remains **expected, not yet proven** until the new task resolves representative static, listing, and avatar paths. |
| Repository secret exposure | **Proven for Git tracking.** `.project-config.json` is ignored, untracked, absent from Git history and `github/main`; provider-formatted values were not found in source scans. | Local platform metadata still contains injected values and must never be opened or copied. Rotating any key that appeared in temporary drafts remains prudent before production launch. |
| Integration availability | **Partly proven.** Required variables are present; current tests validate Twilio and Sold-Comps paths. The resolver currently uses the platform Forge key. | Presence does not prove every third-party account is active or permitted. The new task must not run broader provider tests unless Rich approves their scope. |
| Encryption/session continuity | **Expected, not yet proven.** Current keys are present and source code validates their required formats. | A fresh task must verify compatible key presence and an authenticated flow without rotating either key. |
| Full seamless handoff | **Expected, not yet proven.** No current defect was found that requires re-uploading or data recreation. | Only the prescribed validation-only new task inside the existing Tradebilia Website project can prove this final claim. |
