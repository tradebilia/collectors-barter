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

Adaptive visual review uses batches of 20, stops after 3 accepted visual matches, and has a hard 30-image maximum. Matching grader-and-grade title candidates are prioritized before this cap is applied. Mismatches and unreviewed candidates remain visible as context/manual-review evidence.

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

## Cross-source analyzer-record transparency (2026-10-13)
The shared Evidence Review ledger now exposes bounded `Items sent to analyzer` records for each selected source. Sold-Comps, The Card API, specialist auction sources, ComicConnect, PCGS current-value auctions, and bounded specialist marketplaces attach the exact accepted records. Reference, guide, certification, asking-price, and unavailable sources explicitly show their non-market treatment rather than implying that a catalog or asking price is a completed sale. No database writes, migrations, provider credential changes, valuation-policy changes, or public-domain publication.

## eBay Active current-value evidence (2026-10-13)
Confirmed visual matches from the optional bounded eBay Active image review are represented as current-value market evidence in the shared Evidence Review ledger. They appear in the source’s `Items sent to analyzer` panel with price and identity-review provenance, while remaining distinct from completed-sale valuation candidates. Unmatched active listings remain context-only. Current-value evidence is asking-price evidence, not a completed sale, and must not be silently blended into completed-sale medians. The eBay Active visual-review result is lifted into the same parent Evidence Review data path so the provider panel and summary do not disagree.

## Evidence Review terminology (2026-10-14)
Evidence Review uses one plain-language glossary: **Returned records** means all price-bearing records received; **Sent to analyzer** means records classified as valuation, current-value, or historical evidence; **Held out** means completed records retained for review but not sent as evidence; and **Context / review** means asking prices, references, mismatches, unavailable data, and other non-evidence records. The analyzer-use section defines **Accepted for valuation**, **Current-value market evidence**, **Historical trend**, and **Context only** directly beside their counts. No database writes or public publication.

## Graded visual-match gate — October 14, 2026
A graded target may not enter visual analyzer evidence from holder, grader, character, or packaging similarity alone. The candidate must have a clearly verified numeric or descriptive grade in its title or visual-review rationale; if the grade is unreadable or cannot be confirmed against the target, the match is downgraded to `unreadable`/manual review. The adaptive three-match stop count uses this post-gate result, so unreadable-grade matches cannot consume the accepted-match quota. Added category-neutral regressions, including the AFA holder-without-grade case. No database writes, migrations, credential changes, or public publication.

## Progressive eBay Active gallery review — October 14, 2026
The eBay Active adapter now retains a bounded, deduplicated set of up to eight HTTPS image URLs per listing from the primary image plus returned thumbnail/additional image collections. Visual review remains progressive: the primary candidate image is reviewed first; additional gallery images are sent only when the first result is unreadable, low-confidence, explicitly uncertain, or a graded target lacks a grade in the candidate title. Gallery images may resolve grade, certification-label, front/back, edition, variant, or packaging uncertainty, but cannot override a clear contradiction. If the bounded gallery review remains uncertain or conflicting, the candidate stays manual-review/context-only. No database writes, migrations, credential changes, or public publication.

## Graded gallery evidence normalization — October 14, 2026
Equivalent graded-title formats such as `AFA 75`, `AFA 75+`, `AFA Graded 75`, and descriptive suffixes are normalized to the same numeric grade for the visual gate. When an initial visual result is unreadable but the candidate title and additional-gallery rationale explicitly confirm the target grader and equivalent grade, the server may promote it to a medium-confidence visual match. The promotion is blocked by explicit uncertainty, unreadable, obscured, cannot/ can't confirm, or conflicting language, and does not override objective identity conflicts. Added regressions for AFA 75+ normalization, explicit gallery-confirmed promotion, and unrelated-title-number rejection.


## Explicit ungraded-target visual safeguard — October 13, 2026

When the selected item's structured metadata explicitly says `Is graded = No`, that value is authoritative for visual review. The shared visual filter now passes this constraint to the vision prompt, suppresses graded-target grade enforcement and additional-grade escalation, and prevents contradictory model wording from inventing a graded-target requirement. A narrow normalization may promote an `unreadable` review only when the rationale confirms both target and candidate are raw/ungraded and identifies a visual match; material identity conflicts remain manual review. Added regressions for authoritative ungraded handling, contradiction correction, conflict preservation, and prompt disclosure. No database writes, migrations, credentials, provider configuration, or public-domain publication were performed.

## Vintage-toy packaging-form identity gate — October 14, 2026

For vintage toys, graded status and numeric grade are not sufficient identity checks. When structured target metadata identifies the target as **carded/on-card/blister-card** or **loose/unboxed**, a marketplace candidate whose title explicitly declares the opposite packaging form is now marked as a high-confidence identity mismatch before vision review and retained as context/manual-review evidence. The visual prompt also requires the model to treat carded-versus-loose form as a mandatory gate when the target packaging form is known. Unknown packaging remains manual review rather than an inferred match. Added regressions for both directions and prompt disclosure. No database writes, migrations, credential changes, provider changes, or public publication.

## eBay Active visual-admission rule — October 14, 2026

When a selected target has a primary image, eBay Active image review now starts automatically instead of waiting for a manual button click. Active listings remain visible as asking-price context while the bounded review runs, but only visually confirmed matches can enter the Evidence Review as **current-value market evidence**. This prevents unreviewed active listings from being counted as analyzer-bound evidence. If the target has no image, the source remains context-only and the UI explains why. Completed sales and historical-trend classifications are unaffected. Added UI regression coverage; no database writes, migrations, credential or provider changes, or public-domain publication.

## Bounded visual-review runtime (2026-10-14)
- Visual provider calls now have a 20-second per-candidate timeout and a 120-second overall review deadline; the LLM request is aborted rather than left running indefinitely.
- A timed-out or deadline-limited run returns `completed_with_timeout`, reports the timeout/deadline in its note, and keeps unanswered candidates as required manual-review/context evidence. They cannot enter current-value or valuation evidence implicitly.
- The Test AI UI explains the two-minute bound and distinguishes completed visual results from candidates retained because review timed out or was incomplete.
- Regression coverage includes the timeout constants, abort path, status contract, and user-facing explanation. Validation passed: focused visual/UI tests 54/54, deterministic suite 322 files / 1,515 tests with 6 skipped (USPS credential probe excluded), TypeScript, production build, and diff hygiene.

## Decoupled eBay Active retrieval and visual review

The eBay Active Test AI path now separates fast market retrieval from the bounded AI image review. `getEbayData` returns the deterministic title/metadata-filtered asking-price context plus the bounded `visualReviewListings` payload and server-built target metadata without waiting for vision. The client then calls `reviewEbayVisualData` separately when a target image and candidate images exist. While that second request runs, asking-price context remains visible; only completed visual matches can be classified as current-value evidence. Timeouts and partial reviews remain fail-closed and cannot implicitly enter the analyzer. This avoids making the entire eBay panel appear stalled while the image-review model is processing.

Validation for this change: focused eBay/UI/visual-filter regressions 66/66 passed; deterministic suite 1,509 passed with 6 skipped and the unrelated external USPS credential probe excluded; TypeScript, production build, and diff hygiene passed. No database writes, migrations, credential changes, provider configuration changes, or public publication were performed.

## eBay Active visual-review POST transport repair — October 14, 2026

The separate `reviewEbayVisualData` operation must remain a tRPC **mutation**. The project’s ordinary query transport intentionally limits GET URLs to 2,000 characters; image-review candidates, gallery URLs, and target metadata can exceed that limit even in a batch of ten, causing the client-only error `Input is too big for a single dispatch` before the server or vision model can run. The review operation therefore uses POST with an explicit compact candidate DTO (primary image plus at most
two additional gallery images), preserving the existing maximum of 30 candidates, adaptive three-match stop, and one shared 120-second deadline. It must not be converted back to a query or widened to pass opaque eBay response fields.

Visual verification in the isolated WebDev preview used the saved Transformers Megatron G1 AFA 60 item: the eBay response was received, the POST review completed for 10 candidates, 1 visually matched current-value record and 9 visible mismatches were rendered, and the expandable **View image checks** panel displayed the individual results. No database writes, migrations, credentials, provider configuration changes, or public publication were performed.

## Approved identity-field expansion — October 14, 2026
Rich approved every recommendation in `FIELD_GAP_AUDIT_2026-10-14.md`, with one explicit condition preserved: **Grade Qualifier / Label Designation appears only when Is Graded = Yes for Sports Cards and Pokémon**.

Implemented with no database migration or writes:

- **Video Games:** recommended `UPC / EAN (if printed on packaging)` field. The existing PriceCharting identifier gate now accepts normalized UPC, EAN, and GTIN aliases while retaining the 8–14 digit validation and no-invention rule.
- **Coins:** recommended `Strike / Designation (as printed on holder)` field, kept separate from the numeric grade.
- **Sports Cards and Pokémon:** conditional recommended `Grade Qualifier / Label Designation`; a graded candidate cannot become a confirmed visual match unless the target qualifier is explicitly confirmed by its title or review images.
- **Comics:** conditional recommended `Certification Label Status` and `Label Notation / Restoration Detail`. A stated target label status must be explicitly confirmed before a visual match can be accepted.
- **Stamps:** recommended optional `Perforation`, `Watermark`, and `Overprint / Surcharge` inputs.
- **Sports Cards:** the pre-existing serial-number input is now labelled `Serial Number / Print Run (example: 10/100)`. The metadata gate compares only print-run denominators, so different individual serial numerators do not incorrectly reject otherwise comparable cards.
- **Music:** no duplicate form field was added. Existing `pressingDetails` is used only when it contains a structured matrix/runout-like identifier, avoiding free-form descriptive query noise.

All added structured values are normalized into the Test AI item details, feed provider queries only where useful, and trigger pre-vision context/manual-review treatment only when a candidate explicitly conflicts. Missing provider evidence remains unknown rather than being inferred. Regression coverage includes field presence and layout placement, structured queries, alias normalization, conflict/omission behavior, grade qualifier, comic label status, visual-gallery escalation, and prompt wording.

Validation for this change must include the full deterministic suite (external USPS credential probe excluded), TypeScript, production build, source-manifest consistency, dependency audit, secret scan, and diff hygiene. No migrations, seed scripts, provider credential/configuration changes, scheduled writers, external notifications, database writes, or destructive actions are permitted.

## Embedded high-resolution grading adjudication — October 15, 2026

For a **graded target** whose initial candidate image review returns `mismatch`, Test AI performs one bounded, fail-closed high-resolution adjudication before retaining that result. The retry is intentionally independent: it does not repeat or rely on the first-pass conclusion. For an eBay image URL only, the server promotes the URL to the `s-l1600` variant, fetches at most **2 MB** of a valid JPEG/PNG/WebP within **6 seconds**, and supplies those exact bytes to the vision model as a data URL. If that bounded retrieval fails, the retry safely falls back to the promoted HTTPS URL; non-eBay hosts are never server-fetched by this feature.

This resolves a real provider-fetch discrepancy observed for the PSA 9.0 Super Mario Bros. 3 candidate: the displayed eBay thumbnail was `105 × 140`, while the promoted provider image was `1200 × 1600` and visibly showed the PSA slab, PSA label, 9.0 grade, CIB form, and matching front art. A one-candidate end-to-end filter check with the exact target and provider candidate returned a high-confidence `match` with all required structured visual evidence true. The correction preserves the mandatory grade/identity gate, does not change valuation policy, and fails closed for missing, oversized, invalid, or unreviewable images.

Validation: focused visual/Sold-Comps regressions **83/83**, TypeScript, production build, full deterministic suite **318 files / 1,525 tests passed** with 3 credential-dependent files / 6 tests skipped, production dependency audit with no high/critical findings (2 low advisories), diff hygiene, and direct visual inspection of the promoted 1200 × 1600 eBay image. No database writes, migrations, seed scripts, credential/configuration changes, destructive actions, or public publication.

## Corrected PSA video-game label adjudication — October 15, 2026
The earlier handoff sentence that described the PSA 9.0 Super Mario Bros. 3 CIB candidate as a visual `match` was **not correct** and must not be relied on. Direct inspection of the exact promoted images confirmed that the target holder label reads **PSA 9.0 Sealed A** while the candidate holder label reads **PSA 9.0 CIB**. Both are slabbed, PSA-graded, and 9.0, but **Sealed and CIB are different video-game forms**; this candidate is therefore a high-confidence **mismatch for the correct identity reason**, not a raw/ungraded mismatch.

The focused high-resolution retry now uses GPT-5 with low reasoning only for graded-target initial mismatches, while the regular first pass remains GPT-5 mini. It explicitly reads target and candidate holder-label form designations before deciding. The live exact one-candidate production filter verification returned: target PSA 9.0 Sealed A; candidate PSA 9.0 CIB; all slab/grader/grade evidence true; final verdict `mismatch` because the forms differ. The raw $13 candidate remains a true graded-versus-raw mismatch. This does not relax valuation gates: unresolved target metadata versus label conflicts remain manual review.

Validation: focused visual/Sold-Comps regressions **84/84**, TypeScript, full deterministic suite **318 files / 1,526 tests passed** with 3 credential-dependent files / 6 tests skipped, production build, and audit with 2 low advisories only. No database writes, migrations, provider credential changes, or public publication.

## Sold-Comps visual-review row binding correction — October 16, 2026

- **Root cause of the contradictory Mario results:** the shared visual filter correctly bound model decisions to their original provider records, but the Sold-Comps annotation layer then re-looked-up reviews by the compacted visible-list position after declared identity conflicts had been removed. This could attach a neighbouring listing’s visual decision to the wrong card.
- **Correction:** `annotateSoldComparableCandidate` now treats visual fields carried on the listing (`visualReviewStatus`, rationale, and audit) as authoritative. Positional review input is fallback-only for legacy callers, and the post-filter `reviewByIndex.get(index)` lookup has been removed.
- **Live WebDev confirmation:** the $950 `Mario Bros. 3 NES Nintendo Game PSA Graded 9.0 CIB Complete In Box Oval Seal` row now retains its own result: both items are PSA 9.0 slabs, but the target label says **Sealed A** and the candidate label says **CIB**, so it is correctly a graded-form mismatch. The $13 loose-cart rows retain their own raw/ungraded mismatch or unreviewed status; they no longer inherit the $950 candidate’s decision.
- **Regression:** added a Sold-Comps test that simulates a carried per-record visual mismatch plus an unrelated positional fallback match, asserting that the record-bound decision wins and that the deleted positional lookup cannot return.
- **Validation:** focused 85/85; deterministic suite 318 files / 1,527 tests passed with 3 credential-dependent files / 6 tests skipped; TypeScript, production build, production audit (two low advisories only), diff hygiene, and live WebDev verification passed. No database writes, migrations, credential changes, provider changes, or public publication.

## Custom `Other` metadata resolution — October 16, 2026
- **Rule:** `Other` is a form selector, never valid identity or query text. Test AI resolves any stored `Other` selector through its validated `custom<FieldName>` companion (for example, `platform: Other` plus `customPlatform: Game Boy`). If no custom value exists, the field is omitted rather than guessed.
- **Coverage:** Resolution now applies before eBay Active and Sold-Comps direct query construction, the shared structured query builders, identity filtering inputs, and Evidence Review display. The Pokémon Silver test item now displays and queries `Game Boy` from its stored custom console value; it does not display or query `Other`.
- **Verification:** Focused criteria/evidence/Sold-Comps regressions passed 60/60, TypeScript passed, the full deterministic suite passed 318 files / 1,530 tests with 3 credential-dependent files / 6 tests skipped, the production build passed, and dependency audit found only 2 low advisories. No database writes, migrations, credentials, provider configuration changes, or public publication.

## Shared marketplace pre-vision gate for eBay Active — October 16, 2026
The eBay Active path now applies the same deterministic pre-vision safeguards already used by Sold-Comps: explicit lot/bundle/multipack/collection exclusion, the owner-approved high-value price range (25%–250% only when stated trade value is above $10,000), and condition-only/raw indicators such as Mint, Very Good, Excellent, and Tested when the target is graded. Video-game console conflicts are also checked using the canonical platform aliases. Active asking prices are read from the provider price object and the target's stated trade value is passed from Test AI into the protected request.

Excluded active candidates are removed before image comparison and retained in an explicit pre-vision audit payload with their reasons; the UI now shows the count and expandable reasons. Only the remaining candidates can enter the bounded visual-review queue. No database writes, migrations, credentials, provider configuration changes, or public publication were performed. Validation passed: focused 109/109, deterministic suite 324 files / 1,555 passed with 3 files / 6 credential-dependent tests skipped, TypeScript, production build, dependency audit with the existing 2 low advisories, and diff hygiene.

## RAWG and IGDB full metadata expansion — October 17, 2026
- **RAWG:** title-only catalog search remains the only lookup criterion. After selecting the best title match, the adapter performs a bounded RAWG detail request and retains the returned detail payload, including fields not promoted into the concise facts list. If the detail request fails, the search payload remains usable and the failure is recorded as non-fatal metadata enrichment.
- **IGDB:** title-only catalog search remains the only lookup criterion. The game query requests wildcard game fields plus expanded nested platform, genre, and involved-company fields, retaining the full provider response in `metadata` while preserving concise decision-oriented facts separately.
- **UI:** the Test AI RAWG and IGDB catalog cards show concise factual fields first and provide an explicit expandable **Show all returned ... metadata** viewer with the formatted JSON payload for field-by-field review. Platform and release year remain context only and are not sent as catalog search criteria.
- **Validation:** focused RAWG/IGDB/UI tests passed **32/32**; full deterministic suite passed **324 files / 1,557 tests** with 3 credential-dependent files / 6 tests skipped; TypeScript, production build, dependency audit, credential scan, and `git diff --check` passed. No database writes, migrations, seed scripts, provider credential/configuration changes, destructive actions, or public publication were performed.

## IGDB linked-metadata completion and visible catalog facts — October 17, 2026

The Test AI **IGDB Video Game Catalog** now retains the wildcard root Game record and expands supported linked relationships into usable objects rather than provider IDs. This includes cover artwork, screenshots, alternative titles, collections/franchises, engines, modes, companies, platforms, player perspectives, regional release dates, videos, websites, external-game identifiers, language support, related games, age ratings, and other supported relations. The catalog UI request remains **Game Title only**; platform and listing year remain context, and neither provider is valuation, grading, authenticity, condition, certification, or ownership evidence.

The provider rejected a first over-broad query with HTTP 400 because IGDB `tags` is a numeric tag array, not an expandable relation. The final query excludes that unsupported expander. Numeric provider-ID arrays are retained in the full payload disclosure but intentionally suppressed from the reviewer-facing summary so they cannot be mistaken for meaningful facts.

The Test AI catalog cards now keep their concise identity grid and add a visible **Extended catalog facts** section for usable returned fields such as summary, storyline, alternative titles, franchise/collection, engine, player perspective, languages, regional releases, related games, cover/media counts, external links/stores, and catalog ratings when available. The expandable **Show all returned … metadata** panel remains the full unmodified provider payload.

Live browser verification against the Resident Evil 2 test record passed: IGDB returned an expanded cover object, 15 expanded screenshot objects with `image_id`, expanded regional release-date records including platform, region, and release-status objects, and expanded language plus language-support-type objects. The rendered card showed readable facts including `Dec 10, 2024 · iOS · Worldwide · Full Release` before the 44-top-level-field full payload disclosure. Focused RAWG/IGDB/UI tests passed **33/33**; full deterministic validation passed **324 files / 1,558 tests** with **3 files / 6 tests skipped**; TypeScript, production build, `git diff --check`, credential scan, and production dependency audit passed (two existing low advisories only). The required read-only custom-database baseline was **3 users, 3 profiles, 54 listings, 80 listing photos, 1 inquiry reply, and 6 trade proposals**. No database writes, migrations, seed scripts, credential/configuration changes, destructive actions, or public-domain publication were performed.

The reviewer-facing extended-facts summary intentionally omits **Cover & Media** and **Links & Stores** at the user's request. Their underlying provider fields remain available in the expandable complete RAWG/IGDB payload, so no source metadata was discarded.

The reviewer-facing summary now also omits **Tags / Keywords** at the user's request. The complete provider payload remains unchanged. The source-coverage tracker records **Video Games → IGDB Video Game Catalog** and **Video Games → RAWG Video Game Catalog** as confirmed matches; both remain factual reference sources only and do not contribute valuation evidence.


## Manus breaking-news video generation for Social Content — October 17, 2026

The Completed Trade Social Content card's **Configure Video** button now starts an asynchronous Manus task instead of only saving a production brief. The browser polls the protected status procedure and attaches the returned MP4 URL to the browser-local draft when the task completes.

The server builds a 16:9, 25-second breaking-news anchor brief with the completed-trade script, requester and recipient names, commentary, official Tradebilia logo URL, and up to six public trade-item image references. Image attachments use the documented Manus `file` content-part schema.

`MANUS_API_KEY` is stored as a WebDev project secret and is read only by the server-side adapter. It is not bundled into client code, logged, or sent to the browser. A read-only `/v2/user.me` credential validation passed, and a mocked payload regression confirms the documented image attachment shape without starting a paid generation task.

Video generation does not publish to Facebook, Instagram, X, YouTube, or any other external platform. Approval and manual publishing remain separate; signed Manus artifact URLs are treated as runtime outputs and are not presented as permanent storage identity.

Validation: Manus credential/payload tests passed **2/2**, focused social-content regressions passed **21/21**, TypeScript passed, production build passed, and `git diff --check` passed. No database writes, migrations, seed scripts, destructive actions, or automatic social publishing were performed.


## Completed-trade breaking-news video autofill — October 17, 2026

The admin Social Content Configure Video workflow now receives seller and buyer display names from the protected completed-trade opportunity query. The listing owner/recipient is represented as the **seller** and the trade proposer/requester as the **buyer**. These names are stored in the browser-local completed-trade draft and prefilled into the editable video studio fields; manual edits remain effective when generation starts.

When the studio opens, blank anchor commentary is prepared from the actual completed trade: seller, buyer, cash-only versus item exchange, and the available traded-item titles. The commentary remains editable. The generation-status notice now explains the 16:9, 25-second American female news-anchor format, lip-synced dialogue, official Tradebilia logo, trade-item image references, asynchronous MP4 attachment, and manual-publishing safeguard.

The Manus task prompt now uses explicit Seller and Buyer labels rather than ambiguous Requester and Recipient labels. No database schema or database records were changed. Focused coverage passed 36/36; the deterministic suite excluding the unrelated external The Card API probe passed 324 files / 1,563 tests with 3 files / 6 tests skipped; TypeScript, production build, build-fingerprint manifest, diff hygiene, and production audit passed. The production audit retains the existing two low findings and no high/critical findings.

## TNN completed-trade breaking-news workflow — October 17, 2026

This entry supersedes the earlier generic 25-second breaking-news brief for completed-trade videos. The admin Social Content page now implements the user-approved **Tradebilia News Network (TNN)** workflow:

- **Eligibility:** a TNN option is shown only for a completed trade with at least **$1,000 aggregate estimated item value**. The browser receives only the opaque trade reference and threshold result needed to gate the UI; the protected server independently recomputes the same aggregate from the completed trade before either script drafting or generation. Neither the value nor cash amounts are sent to the model, displayed in the video UI, or narrated. A required read-only verification found five completed trades, with four eligible and one below threshold.
- **Studio prefill:** Configure Video starts with the completed trade’s seller and buyer display names, actual completed-trade items, a rotating homepage tagline, and the default 30-second TNN setting. Names are editable by the admin and can appear **only in spoken narration**, never in on-screen text.
- **Report formats:** 16:9 MP4, with 30 / 45 / 60-second selections. The pacing policy permits up to 2 / 4 / 6 specifically narrated and picture-in-picture items respectively. All remaining completed-trade items are acknowledged generically, with no invented details. The admin selects the item subset.
- **Anchors:** middle-aged, professional American newsroom anchors Max Tradebloski (male) and Sidney Tradewell (female). Solo reports alternate Max/Sidney; approximately one in four opens as an explicit duo report. The admin can select the current report’s anchor arrangement.
- **Script before video:** an internal model drafts a bounded, fact-locked script from only the selected completed-trade facts. Script validation rejects money/price language, direct contact or shipping details, unsupported assertions, missing selected-item mentions, missing generic acknowledgement of unselected items, or omission of either party’s spoken name. The admin reads the full script and then separately confirms generation.
- **Video direction:** the generation task instructs Manus to use Seedance 2.5 Pro when available, otherwise the best available Manus video model. It specifies a realistic modern TNN newsroom; a two-second original breaking-news sting; Tradebilia logo; headline strap **BREAKING NEWS FROM TRADEBILIA**; a subtle scrolling ticker containing one rotating homepage tagline; professional lip-sync; and the exact supplied item imagery in an upper-corner picture-in-picture panel synchronized to narration. It prohibits captions/subtitles, values, cash amounts, names as text, dates/locations/contact or shipping details, unprovided collectibles, and synthetic grade/value overlays.
- **Generation/review lifecycle:** no video task starts while a script is merely drafted. The workflow permits one explicitly confirmed initial task and one explicitly confirmed replacement for a draft, with one task running at a time. The browser polls only the protected task-status procedure. A returned MP4 is attached to the browser-local social draft for private review, download, and an internal Video Approval control. No social-platform account is connected, scheduled, contacted, or published by this workflow.

Implementation files are `client/src/components/SocialContentManagerTab.tsx`, `client/src/lib/socialContentManager.ts`, `server/tnnVideoScript.ts`, `server/manusVideoGeneration.ts`, and protected admin procedures in `server/routers.ts`. New and updated regressions cover eligibility, anchor rotation, item pacing, script validation, prompt privacy/graphics instructions, the local TNN UI lifecycle, and the source fingerprint manifest.

Validation before checkpoint/restart: focused TNN suite **45/45 passed**; complete deterministic suite **325 files / 1,568 tests passed** with **3 files / 6 credential-optional tests skipped** (the unrelated external `theCardApi` probe remained excluded); TypeScript, production build, production dependency audit (two existing low advisories only), secret scan, no-publishing scan, source-manifest test, and `git diff --check` passed. No migration, database write, seed script, destructive action, external social action, or real video task was performed.

**Post-checkpoint live verification:** After restarting the isolated WebDev server from the saved TNN checkpoint, the language service reported **no TypeScript errors**. The protected promotion handler returned the same opaque eligibility result as the direct server check (four eligible completed trades, one below threshold). A new browser-local draft created from an eligible trade displayed **Configure Video**; its opened studio prefilled Seller and Buyer, showed 30/45/60-second format choices, Max/Sidney/duo anchor choices, and the two actual trade items selected by default, with **Prepare TNN Script** as the next deliberate action. No script draft, video generation task, database write, or publishing action was triggered during this live verification.
