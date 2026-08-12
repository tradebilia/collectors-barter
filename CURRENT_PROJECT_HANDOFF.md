# Tradebilia — Simple New-Session Handoff

**Read this document first. It is the one handoff document to use for the next session.**

## What Rich Decided

Tradebilia remains in its current Manus project. Rich has approved a **separate development WebDev project** built from the GitHub repository and securely connected to the existing custom database so the next session can work with the same accounts, listings, items, trades, and messages. Do **not** create a public replacement website, attach a production domain, migrate hosting, clone the database, or move external storage. Tradebilia is still under development and does not yet have independent hosting.

> The cloned workspace is a separate development project and domain, but it is authorized to use the existing custom database **only after secure configuration and read-only validation**. This preserves the existing Tradebilia accounts and items, but it means any unguarded database write from the clone could affect current development data.

## First Five Minutes in the New Session

1. Read this file first, then read `todo.md` only through the **Session Transition Gate** section.
2. Create a separate **development-only** WebDev project from the GitHub repository. Keep its default temporary domain; do not publish or attach `tradebilia.manus.space`.
3. Clone GitHub into the development project’s workspace: `gh repo clone tradebilia/collectors-barter /home/ubuntu/tradebilia-clone`, then run `cd /home/ubuntu/tradebilia-clone && pnpm install --frozen-lockfile`.
4. In the new development project’s secure settings, add **only** the existing `CUSTOM_DATABASE_URL` through the secret-input flow. Never print it, place it in `.env`, commit it, or ask Rich to paste it into chat. Configure `ENCRYPTION_KEY` only if the approved work needs existing encrypted integration tokens.
5. Confirm GitHub is `tradebilia/collectors-barter`, branch `main`; do not overwrite or edit `/home/ubuntu/tradebilia-platform`.
6. Before any write-capable task, perform a read-only database connection and count validation against the custom database. The last verified baseline was 3 users, 4 user profiles, 15 listings, 25 listing photos, 1 inquiry, and 1 trade proposal. Stop and report any mismatch; do not run migrations, seed scripts, delete scripts, or feature flows that write data until Rich explicitly approves the specific action.
7. Do not print, copy, commit, or request raw API keys, database URLs, encryption keys, or `.project-config.json`.

## Current Status

| Item | Current state |
|---|---|
| Current development URL | `https://tradebilia.manus.space` is the active Tradebilia development site. |
| Current code checkpoint | Use the most recent checkpoint shown in the current Tradebilia project before any transition. |
| GitHub baseline | `tradebilia/collectors-barter`, branch `main`; verify the latest commit immediately before cloning. |
| Validation | The last full validation passed 91/91 Vitest tests and TypeScript; rerun relevant checks after any change. |
| Shared-database clone development | **Approved with safeguards.** A separate development WebDev project runs the GitHub clone and uses the existing custom database only after secure secret configuration and read-only validation. |
| Separate-project migration | **Paused.** Do not resume unless Rich explicitly asks. |
| Staging safeguard | `TRADEBILIA_STAGING_MODE` exists for a future copied project. Leave it unset in the current project. |

## Next Work Item When Rich Says to Continue

Fix the **Messages alert bug**: a sender receives an unread-message alert for their own reply.

| File | Function | Required correction |
|---|---|---|
| `server/db.ts` | `sendInquiryReply` | Mark the inquiry unread only for the original inquiry sender—the recipient of the reply—not for the person sending the reply. |

Add a focused Vitest regression test, run applicable tests and TypeScript checks, update `todo.md`, and push a credential-safe GitHub commit. Report clearly whether the task made any database writes; do not assume the clone is disconnected from live data. Do not begin CGC/Test AI or change the production AI Analyzer unless Rich separately asks.

## Do Not Change Without Rich’s Specific Approval

Do not alter the current database configuration, publish/attach a production domain, create or enable scheduled jobs, change provider credentials, modify production AI Analyzer behavior, or move customer media/storage. Do not publish the separate development project. Do not run database migrations or destructive/seed scripts against the shared custom database. The older migration documents remain historical preparation only; this document controls the current direction.

## Exact Message Rich Can Use to Start the Next Session

> Read `CURRENT_PROJECT_HANDOFF.md` first. Create a separate development-only WebDev project from `tradebilia/collectors-barter`, keep its temporary domain, then clone it into `/home/ubuntu/tradebilia-clone`. Securely configure the existing `CUSTOM_DATABASE_URL` only through the new project’s secret settings, then perform a read-only connection/count validation before any write. Do not publish, attach a production domain, migrate hosting/database, run migrations, seed scripts, or destructive scripts. Then fix the Messages sender-alert bug described in the handoff document, add tests, and push a credential-safe GitHub commit. Report every database write explicitly.
