# Tradebilia — Current Project Handoff

> **Read this document first at the start of every new session.** It supersedes earlier session-status statements elsewhere in this repository. Historical migration, audit, and prior handoff documents are reference material only unless this document says otherwise.

## Current state — verified October 11, 2026

| Boundary | Verified state |
|---|---|
| P0 implementation checkpoint | `6648f1a2` — schema-boundary and dependency remediation; later work retains this P0 implementation |
| Active workspace | `/home/ubuntu/tradebilia-isolated-development` |
| GitHub | `tradebilia/collectors-barter` → `main`; always fetch `canonical/main` to obtain the current synchronized SHA rather than relying on an older handoff SHA |
| Public domains | `tradebilia.manus.space` and `tradebilia-d-bnuiylsx.manus.space` |
| Latest functional change | Approved PCGS Auction Prices Realized current-value versus historical-trend policy, documented below |
| Latest validation | 319 Vitest files passed; 1,449 tests passed; 6 tests skipped. TypeScript, production build, `git diff --check`, and runtime-schema scan passed. |
| Dependency audit | No **high** or **critical** production findings remain. Two low findings remain for later review. |

## Approved PCGS Auction Prices Realized policy

The owner explicitly approved this Trade Analyzer behavior:

1. **Current value:** A signed PCGS Auction Prices Realized row can be sent as a current-value candidate only when it has the exact certified target grade, a positive USD amount, a completed status, and a valid auction date **within the last 365 days**.
2. **Historical trend:** An exact-grade PCGS row older than 365 days is retained solely for historical movement/trend context. It **cannot** become a current-value input through the general illiquid-market extension.
3. **Context only:** A PCGS row is context only when it is undated, incomplete, non-USD, or not the exact certified target grade.
4. **Price semantics:** PCGS reports a realized amount but does not disclose buyer-premium treatment in this endpoint. Recent, exact-grade candidates use that realized amount **as reported**; the analyzer/UI retain the buyer-premium caveat instead of claiming it is an all-in price.
5. **Server enforcement:** Exact-grade disposition is assigned before PCGS auction observations are signed. Browser code cannot promote a grade-mismatched row. The analysis narrative receives only server-classified historical rows for trend discussion.
6. **Sandbox transparency:** The PCGS panel and source ledger display separate counts for **Current-value candidates**, **Historical trend**, and **Context only**.

## P0 remediation completed

The P0 work is documented in [P0_REMEDIATION_HANDOFF_2026-10-11.md](P0_REMEDIATION_HANDOFF_2026-10-11.md).

1. **No application request path may create or alter database schema.** Runtime `CREATE TABLE` and `ALTER TABLE` helpers were removed from `server/db.ts`, as were their calls from `server/routers.ts`.
2. **Schema changes are migration-only.** A reviewed custom Drizzle migration, `drizzle/0024_p0_music_category_schema.sql`, records the Music enum alignment. It was **not applied** to the shared database.
3. **Regression protection exists.** `server/runtimeSchemaBoundary.test.ts` rejects `CREATE TABLE`, `ALTER TABLE`, and `DROP TABLE` in the runtime database and router modules.
4. **Dependency remediation is complete.** Patched compatible releases are locked for `mysql2`, `jsdom`, `proxy-addr`, `qs`, `source-map-js`, `undici`, and Express-compatible `path-to-regexp`.

## Shared database — strict safeguards

The isolated development project uses the existing custom database. Treat every server action as potentially connected to real development data.

- **Fresh read-only baseline:** 3 users, 3 profiles, 48 listings, 74 listing photos, 1 inquiry reply, and 6 trade proposals.
- **No database writes were made for the P0, Numista, denomination, visual-fallback, or PCGS policy work.** No migrations, seed scripts, deletion scripts, or schema SQL were executed.
- The deployed database does **not** expose an `inquiries` table; the current queryable inquiry-related table is `inquiryReplies`. Do not assume ORM/schema names exist in the shared database—inspect read-only first.
- Never print, copy, commit, or request raw database URLs, API keys, OAuth tokens, encryption keys, JWT secrets, or `.project-config.json`.

## Required workflow before code changes

1. Fetch `canonical/main`, verify the local checkout is clean, and read this file.
2. Read `SESSION_HANDOFF_GUIDE.md`, `HANDOFF_ADVERSARIAL_AUDIT.md`, and `P0_REMEDIATION_HANDOFF_2026-10-11.md`.
3. Before any write-capable work, run a read-only database baseline using confirmed table names.
4. Do not apply migrations, run seeders, or use destructive scripts without Rich’s explicit approval for the exact action.
5. For every completed code change: run focused tests, TypeScript, production build, full tests where scope warrants, security audit, and `git diff --check`.
6. Create a WebDev checkpoint, push the same commit to GitHub `main`, and verify public deployment parity. Treat these as one synchronization set.

## Next recommended work

Move to **P1 performance and maintainability** only after discussing the specific scope. The first candidate is splitting the oversized Test AI and Admin Dashboard frontend chunks, then addressing unbounded result-fetch patterns identified by the code-quality audit.

## Do not change without explicit approval

- Shared database records or schema
- Database migration execution, seed scripts, or deletion scripts
- Provider credentials, external OAuth configuration, payment settings, schedules, or notification delivery
- Hosting/domain reassignment or a new replacement project
- Trade Analyzer valuation behavior beyond the owner-approved **Numista 25% guide policy** and **PCGS 365-day current-value / older-history policy** documented above

## Quick continuation prompt

> Read `CURRENT_PROJECT_HANDOFF.md`, `SESSION_HANDOFF_GUIDE.md`, `HANDOFF_ADVERSARIAL_AUDIT.md`, and `P0_REMEDIATION_HANDOFF_2026-10-11.md`. Fetch `canonical/main` and verify it matches the local checkout before inspecting code. Use read-only database validation before any write-capable action. Do not run migrations, seeds, or destructive scripts. Maintain three-way synchronization: WebDev checkpoint, GitHub `main`, and the deployed Tradebilia domains.
