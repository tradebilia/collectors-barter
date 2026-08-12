# Tradebilia — Simple New-Session Handoff

**Read this document first. It is the one handoff document to use for the next session.**

## What Rich Decided

Continue building **in the current Tradebilia Manus project**. Do **not** create a replacement website, database clone, hosting migration, new deployment, or external storage move. Tradebilia is still under development and does not yet have independent hosting.

> If a new task does not show the existing Tradebilia project controls, do not silently create a new WebDev project. Stop and tell Rich that the existing project is unavailable in that task.

## First Five Minutes in the New Session

1. Confirm that the task is attached to the existing **Tradebilia Website** project and that the live site is still `https://tradebilia.manus.space`.
2. Read this file, then read `todo.md` only through the **Session Transition Gate** section.
3. Confirm the project directory is `/home/ubuntu/tradebilia-platform`. If the directory or existing project controls are absent, stop and ask Rich; do not make a duplicate project.
4. Confirm GitHub is `tradebilia/collectors-barter`, branch `main`, and use the current working tree rather than cloning over it.
5. Do not print, copy, commit, or request raw API keys, database URLs, encryption keys, or `.project-config.json`.

## Current Status

| Item | Current state |
|---|---|
| Live site | `https://tradebilia.manus.space` remains the active development site. |
| Current code checkpoint | `0e255ba5` — staging safety preparation; the next checkpoint should include this handoff document. |
| GitHub baseline | `d4befc5` on `main` — fail-closed staging safety controls and documentation. |
| Validation | 90/90 Vitest tests passed, TypeScript passed, and the production build passed. |
| Separate-project migration | **Paused.** Do not resume unless Rich explicitly asks. |
| Staging safeguard | `TRADEBILIA_STAGING_MODE` exists for a future copied project. Leave it unset in the current project. |

## Next Work Item When Rich Says to Continue

Fix the **Messages alert bug**: a sender receives an unread-message alert for their own reply.

| File | Function | Required correction |
|---|---|---|
| `server/db.ts` | `sendInquiryReply` | Mark the inquiry unread only for the original inquiry sender—the recipient of the reply—not for the person sending the reply. |

Add a focused Vitest regression test, run the full suite, run TypeScript checks, visually verify Messages if practical, update `todo.md`, create a checkpoint, and push a credential-safe GitHub commit. Do not begin CGC/Test AI or change the production AI Analyzer unless Rich separately asks.

## Do Not Change Without Rich’s Specific Approval

Do not alter the live database configuration, deploy/attach a new domain, create or enable scheduled jobs, change provider credentials, modify production AI Analyzer behavior, or move customer media/storage. The older migration documents remain historical preparation only; this document controls the current direction.

## Exact Message Rich Can Use to Start the Next Session

> Read `CURRENT_PROJECT_HANDOFF.md` in the Tradebilia project first. Continue in the existing Tradebilia project only; do not create a new WebDev project or migrate hosting/database. Then fix the Messages sender-alert bug described in that handoff document, with tests and a checkpoint.
