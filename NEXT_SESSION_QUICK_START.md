# Tradebilia — Next Session Quick Start

## Start here

1. Read `CURRENT_PROJECT_HANDOFF.md` first.
2. Read `SESSION_HANDOFF_GUIDE.md`, `HANDOFF_ADVERSARIAL_AUDIT.md`, and `P0_REMEDIATION_HANDOFF_2026-10-11.md`.
3. Run `git fetch canonical main` and verify the local checkout equals `canonical/main` before making any change.
4. Use the existing isolated workspace at `/home/ubuntu/tradebilia-isolated-development`; do not create a replacement project or reconnect secrets unless Rich specifically requests it.

## Current verified baseline

- P0 implementation checkpoint: `6648f1a2` (later work retains this implementation unchanged)
- GitHub repository: `tradebilia/collectors-barter`, branch `main` — fetch first for the exact current SHA
- Public domains: `tradebilia.manus.space` and `tradebilia-d-bnuiylsx.manus.space`
- Latest functional policy: signed, exact-grade PCGS Auction Prices Realized rows within 365 days are current-value candidates; older exact-grade PCGS rows are historical trend only; incomplete, non-USD, undated, and grade-mismatched rows are context only. PCGS compact month/year labels such as `10-2009` are normalized internally for this timing split while their exact original label remains visible. The provider panel and Evidence Review both consume the same server-approved PCGS bucket utility. A View All history response that is HTTP-successful but empty is retried once with the alternate configured PCGS credential; an unsuccessful or still-empty retry preserves the empty result without inventing evidence. The client uses `historyQueryVersion: 5` to refresh older cached empty responses.
- Latest validation: 320 Vitest files / 1,454 tests passed; TypeScript and production build passed; dependency audit has no high or critical findings.
- Shared database baseline: 3 users, 3 profiles, 48 listings, 74 listing photos, 1 inquiry reply, 6 trade proposals.

## Critical safety rules

- The workspace shares the custom database. Before any write-capable task, perform a fresh **read-only** baseline using confirmed table names.
- Do not execute `drizzle/0024_p0_music_category_schema.sql`. It is a reviewed pending artifact, not an approved database change.
- Do not run migrations, seed scripts, or destructive scripts without Rich’s explicit approval for that exact operation.
- Never print or commit raw credentials, database URLs, encryption/JWT keys, OAuth tokens, or `.project-config.json`.
- PCGS current-value rows use the provider’s realized amount **as reported**; buyer-premium treatment is not disclosed. Preserve this caveat and never relabel it as an all-in price.

## Synchronization policy

After approved code work, maintain all three surfaces together:

1. Save a WebDev checkpoint.
2. Push the exact checkpoint commit to GitHub `main`.
3. Confirm deployment to both public Tradebilia domains and compare public/local frontend assets when relevant.

## Recommended next discussion

The next unstarted phase is P1 performance and maintainability. Discuss scope before coding. Recommended first target: code-split the oversized Test AI and Admin Dashboard bundles, then address unbounded result fetching.

## Historical documents

`NEW_WEBDEV_MIGRATION_READINESS_REPORT.md` and the older migration-oriented quick-start material remain historical. They do not authorize a fresh-project migration, database copy, domain change, or media transfer.

## Historical migration guardrails — still binding

> **Critical platform limitation:** A fresh Project task cannot be documented as attaching to the active WebDev project, its deployment controls, its storage namespace, or its live configuration.

- **Do not create the replacement project yet.** Independent-project testing requires a complete writable staging snapshot first: an isolated writable staging database clone and replicated static/customer media.
- Never copy, attach, print, or commit raw secrets. `.project-config.json` is platform-generated metadata, not a handoff source: **Do not open, copy, attach, print, or commit it.**
- If a future migration is reconsidered, read `NEW_WEBDEV_MIGRATION_READINESS_REPORT.md` and obtain Rich’s explicit approval before any pre-creation or cutover action.
