# Tradebilia — Current Project Handoff

> **Read this document first at the start of every new session.** It supersedes earlier session-status statements elsewhere in this repository. Historical migration, audit, and prior handoff documents are reference material only unless this document says otherwise.

## Current state — verified October 11, 2026

| Boundary | Verified state |
|---|---|
| P0 implementation checkpoint | `6648f1a2` — schema-boundary and dependency remediation; later work retains this P0 implementation |
| Active workspace | `/home/ubuntu/tradebilia-isolated-development` |
| GitHub | `tradebilia/collectors-barter` → `main`; always fetch `canonical/main` to obtain the current synchronized SHA rather than relying on an older handoff SHA |
| Public domains | `tradebilia.manus.space` and `tradebilia-d-bnuiylsx.manus.space` |
| Latest functional change | PriceCharting exact-grade, sale-derived coin-guide policy remains unchanged; coin lookups now have a 15-second server timeout, no automatic retries, fresh-on-mount query behavior, and a visible manual retry so stale 401s cannot remain indefinitely. |
| Latest validation | 306 deterministic Vitest files / 1,446 tests passed (external credential probes excluded); focused PriceCharting tests 21/21 passed; TypeScript, production build, `git diff --check`, and production audit passed with two low findings. |
| Dependency audit | No **high** or **critical** production findings remain. Two low findings remain for later review. |

## Coverage tracker confirmation — October 11, 2026

**Coins — Numista Coin Catalog** is confirmed as a **Match** in the Test AI source coverage tracker. It remains a read-only Numista catalog/reference integration: validated USD catalogue estimates may enter the analyzer only as a capped 25% secondary guide anchor, never as completed-sale evidence.

## Approved PCGS Auction Prices Realized policy

## Owner-requested source removal — October 11, 2026

**CNG Past Auctions has been removed from the active Test AI sandbox.** It is no longer selectable, applicable to Coins, queryable through the specialist router, registered as a canonical adapter, or included in provider-health checks. Historical research/audit notes remain unchanged for recordkeeping only; they are not active source configuration.

**CoinArchives has also been removed from the active Test AI sandbox.** It is no longer selectable, applicable to Coins, queryable through the specialist router, registered as a canonical adapter, or included in provider-health checks. Historical research/audit notes remain unchanged for recordkeeping only; they are not active source configuration.

## Approved PriceCharting coin-search rule — October 11, 2026

For the read-only **Parse.bot PriceCharting Coins** lookup, the server constructs the provider query from only three saved coin fields, in this exact order: **four-digit year**, optional **one-letter mint mark**, then **variety**. For example, `1903 Morgan` has no stored mint-mark letter; `1903 S Morgan` includes `S`. The listing title, country, denomination, composition, grader, grade, certificate number, condition, and other fields are never sent in this provider query. The Test AI panel displays the resulting query.

## Approved PriceCharting sale-derived guide policy — October 11, 2026

PriceCharting’s published U.S.-coin methodology describes grade-specific **current market prices** calculated from filtered historic completed sales. The approved sandbox treatment is deliberately bounded:

1. Only a **Coins** result with a positive PriceCharting value at the listing’s exact declared certified grade may qualify. Numeric-only, mapped, missing, mismatched, or non-coin grade values remain context only.
2. A qualifying value is a **sale-derived aggregate guide**, not an individual dated transaction. It contributes at most **25%** as the one secondary analyzer guide anchor and never creates a completed-sale record, current-value sale count, or historical-trend row.
3. The server rechecks the PriceCharting source, Coins category, positive amount, exact-grade flag, and the declared target grade before it can affect the analyzer, then chooses **one** guide anchor. An exact-grade PriceCharting coin guide takes precedence over Numista’s catalogue anchor; Numista remains visible as reference. The two guide values are never stacked or allowed to exceed the 25% cap.
4. Verified, dated, identity-compatible completed sales remain the primary 75% baseline. With no accepted completed-sale baseline, the selected guide is explicitly labeled provisional and not market-supported.

The owner explicitly approved this Trade Analyzer behavior:

1. **Certificate-first identity:** For a PCGS-graded coin, use its PCGS certificate number first. CoinFacts confirms the certified item and retrieves the certificate-level Auction Prices Realized history before any broader item history is considered.
2. **Broader history only as a fallback:** If that certificate has no auction rows, use the confirmed PCGS item number and certified grade to retrieve the matching item/grade history, then the PCGS View All history. Never substitute a loose title search.
3. **Current value:** A signed PCGS Auction Prices Realized row can be sent as a current-value candidate only when it has the exact certified target grade, a positive USD amount, a completed status, and a valid auction date **within the last 365 days**.
4. **Historical trend:** An exact-grade PCGS row older than 365 days is retained solely for historical movement/trend context. It **cannot** become a current-value input through the general illiquid-market extension.
5. **Context only:** A PCGS row is context only when it is undated, incomplete, non-USD, or not the exact certified target grade.
6. **Price semantics:** PCGS reports a realized amount but does not disclose buyer-premium treatment in this endpoint. Recent, exact-grade candidates use that realized amount **as reported**; the analyzer/UI retain the buyer-premium caveat instead of claiming it is an all-in price.
7. **Server enforcement:** Exact-grade disposition is assigned before PCGS auction observations are signed. Browser code cannot promote a grade-mismatched row. The analysis narrative receives only server-classified historical rows for trend discussion.
8. **Shared classification:** `shared/testAiPcgsAuctionBuckets.ts` consumes the signed disposition rather than re-evaluating grade scope in the browser. This keeps the PCGS provider panel and Evidence Review in the same current-value, historical-trend, and context bucket.
9. **Sandbox transparency:** The PCGS panel and source ledger display separate counts for **Current-value candidates**, **Historical trend**, and **Context only** from that same shared bucket.
10. **PCGS compact dates:** PCGS returns some valid auction dates as month/year labels such as `10-2009` or `Mar-2025`. The adapter converts these only for internal evidence timing to the first UTC day of that month, keeps the original provider label for display, and marks the date as month-precision. This prevents valid dated PCGS rows from being misclassified as undated/context-only.
11. **Empty-history recovery:** Some PCGS View All requests can return HTTP 200 with no rows for one configured credential while the alternate credential returns the item history. The adapter performs one alternate-key retry only for that successful-empty response; if the retry fails or remains empty, it preserves the empty result. It never fabricates auction evidence. Test AI uses `historyQueryVersion: 5` so browsers refresh prior cached empty history responses.

## P0 remediation completed

The P0 work is documented in [P0_REMEDIATION_HANDOFF_2026-10-11.md](P0_REMEDIATION_HANDOFF_2026-10-11.md).

1. **No application request path may create or alter database schema.** Runtime `CREATE TABLE` and `ALTER TABLE` helpers were removed from `server/db.ts`, as were their calls from `server/routers.ts`.
2. **Schema changes are migration-only.** A reviewed custom Drizzle migration, `drizzle/0024_p0_music_category_schema.sql`, records the Music enum alignment. It was **not applied** to the shared database.
3. **Regression protection exists.** `server/runtimeSchemaBoundary.test.ts` rejects `CREATE TABLE`, `ALTER TABLE`, and `DROP TABLE` in the runtime database and router modules.
4. **Dependency remediation is complete.** Patched compatible releases are locked for `mysql2`, `jsdom`, `proxy-addr`, `qs`, `source-map-js`, `undici`, and Express-compatible `path-to-regexp`.

## Shared database — strict safeguards

The isolated development project uses the existing custom database. Treat every server action as potentially connected to real development data.

- **Fresh read-only baseline:** 3 users, 3 profiles, 48 listings, 74 listing photos, 1 inquiry reply, and 6 trade proposals.
- **No database writes were made for the P0, Numista, denomination, visual-fallback, PCGS, or PriceCharting policy work.** No migrations, seed scripts, deletion scripts, or schema SQL were executed.
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
- Trade Analyzer valuation behavior beyond the owner-approved **PriceCharting/Numista single 25% guide-anchor policy** and **PCGS 365-day current-value / older-history policy** documented above

## Quick continuation prompt

> Read `CURRENT_PROJECT_HANDOFF.md`, `SESSION_HANDOFF_GUIDE.md`, `HANDOFF_ADVERSARIAL_AUDIT.md`, and `P0_REMEDIATION_HANDOFF_2026-10-11.md`. Fetch `canonical/main` and verify it matches the local checkout before inspecting code. Use read-only database validation before any write-capable action. Do not run migrations, seeds, or destructive scripts. Maintain three-way synchronization: WebDev checkpoint, GitHub `main`, and the deployed Tradebilia domains.
