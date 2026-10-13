# Tradebilia — Current Project Handoff

> **Read this document first at the start of every new session.** It supersedes earlier session-status statements elsewhere in this repository. Historical migration, audit, and prior handoff documents are reference material only unless this document says otherwise.

## Current state — verified October 11, 2026

| Boundary | Verified state |
|---|---|
| P0 implementation checkpoint | `6648f1a2` — schema-boundary and dependency remediation; later work retains this P0 implementation |
| Active workspace | `/home/ubuntu/tradebilia-isolated-development` |
| GitHub | `tradebilia/collectors-barter` → `main`; always fetch `canonical/main` to obtain the current synchronized SHA rather than relying on an older handoff SHA |
| Public domains | `tradebilia.manus.space` and `tradebilia-d-bnuiylsx.manus.space` |
| Latest functional change | IGDB Video Game Catalog lookups use saved Game Title + Platform as blocking criteria; release year is non-blocking regional context. PriceCharting exact-grade, sale-derived coin-guide policy remains unchanged. |
| Latest validation | IGDB focused tests 5/5 passed; deterministic validation 307 files / 1,451 tests passed with external credential probes excluded; TypeScript, production build, `git diff --check`, and production audit passed. |
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

### PSA grade normalization exception — October 12, 2026

PSA whole-number normalization remains in force for Sports Cards. For Video Games only, PSA half-point grades are preserved in Sold-Comps and Test AI query previews: `7.5` remains `7.5` instead of becoming `8`. The server and shared client helper both receive the item category so this exception cannot broaden to PSA Sports Cards or unrelated categories.

### IGDB Video Game Catalog criteria — October 12, 2026

IGDB lookups now use the saved **Game Title** and **Platform** as the blocking identity criteria. The server resolves the platform through IGDB and includes its platform ID in the games query. The saved release year remains reference context only because IGDB's primary release year can reflect a different regional release; a title/platform match is accepted with an explicit year-difference note. IGDB remains read-only factual metadata and never contributes valuation, grading, certification, or stored data.

### PriceCharting Video Game UPC guard — October 12, 2026

The Parse.bot PriceCharting video-game endpoint requires a numeric UPC/barcode. Test AI now disables PriceCharting selection for a Video Games item without a valid 8–14 digit UPC, skips the tRPC request instead of creating a placeholder input, and states that no PriceCharting game request was generated. A real UPC remains eligible for `lookup_video_game_by_upc`; cross-category market movers are separate context and do not substitute for the game lookup.

Move to **P1 performance and maintainability** only after discussing the specific scope. The first candidate is splitting the oversized Test AI and Admin Dashboard frontend chunks, then addressing unbounded result-fetch patterns identified by the code-quality audit.

## Do not change without explicit approval

- Shared database records or schema
- Database migration execution, seed scripts, or deletion scripts
- Provider credentials, external OAuth configuration, payment settings, schedules, or notification delivery
- Hosting/domain reassignment or a new replacement project
- Trade Analyzer valuation behavior beyond the owner-approved **PriceCharting/Numista single 25% guide-anchor policy** and **PCGS 365-day current-value / older-history policy** documented above

## Quick continuation prompt

> Read `CURRENT_PROJECT_HANDOFF.md`, `SESSION_HANDOFF_GUIDE.md`, `HANDOFF_ADVERSARIAL_AUDIT.md`, and `P0_REMEDIATION_HANDOFF_2026-10-11.md`. Fetch `canonical/main` and verify it matches the local checkout before inspecting code. Use read-only database validation before any write-capable action. Do not run migrations, seeds, or destructive scripts. Maintain three-way synchronization: WebDev checkpoint, GitHub `main`, and the deployed Tradebilia domains.


## Recent validated Test AI safeguards — October 12, 2026

Adaptive visual review uses batches of 20, stops after 3 accepted visual matches, and has a hard 50-image maximum. Mismatches and unreviewed candidates remain visible as context/manual-review evidence.

The Sold-Comps panel has a dedicated **Accepted for valuation candidates** section showing only completed eBay records already marked `evidenceDisposition: valuation_eligible` with a positive price. This is source-gate acceptance, not a guarantee of final analyzer comparable selection.

For sports-card targets with item type `card_set`, an explicit individual graded-card marketplace title (for example, a card number followed by `PSA 10`) is downgraded to `warning_review` and cannot enter the valuation-eligible list. It remains available in the evidence ledger for audit context. The set-form regression passed 14/14 focused tests. No database writes, migrations, credential changes, or valuation-policy changes.


The sports-card set-form safeguard was broadened after a live review found shorthand single-card titles still entering the accepted list. It now recognizes numbered cards such as `#536`, rookie/RC, autographed/auto, and labels such as `GEM MINT 10`, while excluding explicit set titles and recognizing alternate set item types including `set` and `*_set`. These candidates are downgraded to `warning_review` and remain audit context only.


Image review now explicitly enforces sports-card set-versus-single-card form as a mandatory identity gate. When the target metadata identifies a set, the visual prompt requires mismatch for a visibly individual card against a visibly multi-card/set presentation, and requires unreadable/manual review when form cannot be determined; it must not treat an uncertain form as a match.


Sports-card set searches now use the structured identity order year, manufacturer, sport, and set name. For example, a 1985 Topps baseball Topps Traded set produces `1985 Topps Baseball Topps Traded Set`; player/card-number criteria are not substituted for the set identity. This rule is shared by Sold-Comps and complementary eBay query tiers.

## High-value Sold-Comps price-safety gate — October 13, 2026

For a user-entered trade value **above $10,000**, a Sold-Comps completed-sale candidate may enter source-level valuation evidence only when its positive sold price is between **25% and 250%** of that stated trade value, inclusive. For example, a $20,000 stated value admits $5,000 through $50,000; values below $5,000 or above $50,000 remain visible as context-only evidence and cannot affect the analyzer. The gate is inactive at or below $10,000 so lower-value items retain the existing evidence behavior. The shared evaluator is category-neutral and has regression coverage across Coins, Sports Cards, Comics, Video Games, and Stamps.

The server applies this gate in `annotateSoldComparableCandidate` using the shared `shared/testAiSoldCompSafety.ts` evaluator. Excluded records receive a precise `high-value price safety gate:` reason, remain in the evidence ledger, and are not included in Sold-Comps metrics or the **Accepted for valuation candidates** section. The Sold-Comps panel states whether the gate is active, shows the calculated bounds, and reports the number of records excluded by it. This is an outlier safeguard, not an identity substitute: identity, grade, form, date, currency, duplicate, visual, and final comparable gates still apply.

## Current-run source outcomes and public parity stamp — October 13, 2026

The Test AI **Evidence Review** now includes a current-run source-outcome summary derived from the same normalized evidence ledger used by the analyzer. For each selected source it clearly shows returned market records, source-level eligible candidates, completed records held out as context/review, and unavailable/timed-out checks. This is intentionally a per-page-run diagnostic, not a provider scorecard or historical reliability rate; it writes no database telemetry and retains no provider payload, listing, certificate, or user data. The UI is isolated in `client/src/components/test-ai/SourceRunOutcomeSummary.tsx` as the first small, behavior-preserving Test AI module extraction; future splits must continue one verified component/rule at a time.

The production build now generates the safe static path `/tradebilia-build.json`. It contains only `sourceCommit`, `sourceTreeState`, and `builtAt`. The file is generated by `scripts/write-build-stamp.mjs`, ignored by Git, and must never contain an API key, database detail, URL, token, credential, or user data. Public parity is confirmed only when its `sourceCommit` matches GitHub `main` **and** its `sourceTreeState` is `clean`; a dirty/unavailable stamp is an explicit non-match, not a successful parity assertion. The managed `/__manus__/version.json` remains platform metadata and is not a Git-commit parity authority.
