# Tradebilia — Simple New-Session Handoff

**Read this document first. It is the one handoff document to use for the next session.**

## What Rich Decided

Tradebilia remains in its current Manus project. Rich has approved a **clone-only continuation path** for a new session: clone the GitHub repository into a separate development workspace and continue source-code work there. Do **not** create a replacement website, database clone, hosting migration, new deployment, or external storage move. Tradebilia is still under development and does not yet have independent hosting.

> A cloned workspace is intentionally separate from the live Tradebilia project. It may be used for code and GitHub work, but it must never be described as reattached to the live deployment, database, storage, or domain.

## First Five Minutes in the New Session

1. Read this file first, then read `todo.md` only through the **Session Transition Gate** section.
2. Clone GitHub into a new isolated folder: `gh repo clone tradebilia/collectors-barter /home/ubuntu/tradebilia-clone`.
3. Enter the clone and install the locked dependencies: `cd /home/ubuntu/tradebilia-clone && pnpm install --frozen-lockfile`.
4. Confirm GitHub is `tradebilia/collectors-barter`, branch `main`; do not overwrite or edit `/home/ubuntu/tradebilia-platform`.
5. Do not print, copy, commit, or request raw API keys, database URLs, encryption keys, or `.project-config.json`.

## Current Status

| Item | Current state |
|---|---|
| Live site | `https://tradebilia.manus.space` remains the active development site. |
| Current code checkpoint | `0e255ba5` — staging safety preparation; the next checkpoint should include this handoff document. |
| GitHub baseline | `d4befc5` on `main` — fail-closed staging safety controls and documentation. |
| Validation | 90/90 Vitest tests passed, TypeScript passed, and the production build passed. |
| Clone-only development | **Approved.** Source changes may be made and committed in the isolated GitHub clone only. |
| Separate-project migration | **Paused.** Do not resume unless Rich explicitly asks. |
| Staging safeguard | `TRADEBILIA_STAGING_MODE` exists for a future copied project. Leave it unset in the current project. |

## Next Work Item When Rich Says to Continue

Fix the **Messages alert bug**: a sender receives an unread-message alert for their own reply.

| File | Function | Required correction |
|---|---|---|
| `server/db.ts` | `sendInquiryReply` | Mark the inquiry unread only for the original inquiry sender—the recipient of the reply—not for the person sending the reply. |

Add a focused Vitest regression test, run applicable tests and TypeScript checks, update `todo.md`, and push a credential-safe GitHub commit. Report clearly that the code is in the isolated clone/GitHub and **has not changed the current live site**. Do not begin CGC/Test AI or change the production AI Analyzer unless Rich separately asks.

## Do Not Change Without Rich’s Specific Approval

Do not alter the live database configuration, deploy/attach a new domain, create or enable scheduled jobs, change provider credentials, modify production AI Analyzer behavior, or move customer media/storage. Do not create a new WebDev deployment from the clone. The older migration documents remain historical preparation only; this document controls the current direction.

## Exact Message Rich Can Use to Start the Next Session

> Read `CURRENT_PROJECT_HANDOFF.md` first. Clone `tradebilia/collectors-barter` into `/home/ubuntu/tradebilia-clone` and work only in that separate folder. Do not create a new WebDev deployment or migrate hosting/database. Then fix the Messages sender-alert bug described in the handoff document, add tests, and push a credential-safe GitHub commit. State clearly that the current live site remains unchanged.
