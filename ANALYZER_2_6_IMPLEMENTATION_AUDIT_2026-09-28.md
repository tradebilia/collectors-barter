# Tradebilia Test AI — Analyzer 2.6 Implementation Audit

**Date:** September 28, 2026  
**Scope:** The isolated, development-only Test AI sandbox (`/test-ai`)  
**Snapshot version:** `2.6.0`  
**Data policy:** No migrations, database writes, inventory edits, source activations, schedules, notifications, production deployment, domain change, or social posting was performed.

## Executive conclusion

Analyzer 2.6 materially improves the trustworthiness of a valuation **before** any completed-sale observation is allowed to influence it. The system now treats browser-provided marketplace rows as observations—not as valuation truth—and applies a server-owned admission decision for status, price basis, date, currency, visual mismatch, and review disposition.

It also improves recall for a few common, bounded marketplace-title formats, makes the visual grader-versus-raw rule explicit in Sold-Comps vision review, prevents narrative-provider outages from failing an otherwise deterministic analysis, and gives administrators a concrete explanation for each confidence label.

> **Updated sandbox grade: 91/100 — A- for deterministic evidence handling and auditability.**
>
> This is an implementation-quality grade for the current sandbox analyzer, not a guarantee that every external marketplace result is present or correct. Live provider availability, source coverage, and market-specific metadata completeness still limit any real-world valuation.

## What changed

| Area | Analyzer 2.6 behavior | Why it matters |
|---|---|---|
| Server-owned sale admission | `normalizeAnalysisMarketSales` runs immediately before both analysis snapshots. It normalizes and gates status, price basis, date, recency, currency, visual verdict, and existing evidence disposition. | A UI/client payload cannot simply label an unknown or active record as `valuation_eligible` and have it enter the deterministic value. |
| Known completed-sale adapters | The server recognizes fixed semantics for Sold-Comps, 130point, The Card API, Cardsight.ai, Lelands, Pristine, and PCGS auction results. | Known completed-sale adapters retain their expected sold/realized semantics while unknown records fail closed into context/review. |
| Lossless non-valuation evidence | Active, undated, stale, non-USD, unknown-basis, visual-mismatch, and explicitly review-only observations remain in the audit ledger with their precise server reason. | Valid-looking data is not silently deleted; it simply cannot change the direct valuation until it is defensible. |
| Sold-Comps provenance transport | The Test AI client now preserves Sold-Comps sale ID, completed-sale basis, visual status/rationale, and evidence disposition/reasons when sending the analysis request. | The server can make its decision with the source’s existing audit facts instead of losing them during client normalization. |
| Parser recall | The comparable engine recognizes a comic issue written as a bare number immediately before a grading phrase, including a bounded publisher word in between; it also recognizes `1921 S Mint` coin wording and prevents `unhinged` from being misread as `hinged`. | More true matches are retained without broadly guessing at years, grades, or unrelated numbers. |
| Graded vs. raw vision policy | The Sold-Comps visual-review instruction now explicitly declares graded/slabbed vs. raw/ungraded packaging a mandatory identity gate. | A raw collectible and a visibly slabbed collectible cannot be accepted as the same presentation merely because their title words overlap. |
| Narrative resilience | If the narrative model is unavailable, malformed, or rate-limited, the deterministic comparison, profiles, warnings, ranges, and ledger still return with a schema-compliant fallback explanation. | An LLM outage cannot turn a completed deterministic analysis into a general analysis failure. |
| Prompt boundary | Listing, provider, RSS, visual, and historical strings are wrapped as explicit untrusted reference-data blocks before narrative generation. | External content is visually and instructionally separated from the analyzer’s rules; it cannot be treated as an instruction source. |
| Outlier treatment | IQR outliers are excluded from weighted value, ranges, recency counts, and definitive evidence counts, but remain visible in the ledger with their own reason. | A single anomalous price no longer distorts a valuation while administrators can still inspect it. |
| Confidence explanation | Each market profile now exposes count, 90-day activity, price-spread/stability, and outlier treatment as `confidenceReasons`, displayed in the Test AI evidence panel. | “Low,” “medium,” and “high” confidence labels are explainable rather than opaque. |

## Server admission rules

A row may influence a deterministic value only when all of the following are true:

1. Its realized price is finite and positive.
2. Its currency is USD under the current no-conversion policy.
3. Its sale status is completed/closed or comes from a known completed-sale adapter.
4. Its price basis is sold, closed, or realized.
5. Its date is valid, non-future, and within one year.
6. It is not already marked review-only, context-only, rejected, cap-omitted, or outside a visual-review window.
7. It is not a visual mismatch.
8. It passes the existing universal/category-specific identity gates, duplicate suppression, source-balanced selection, and IQR outlier rule.

Anything else is preserved as **context/review evidence** with an exclusion reason.

## Updated confidence and valuation contract

- **Definitive trade verdict:** requires at least five clean accepted completed sales per side, in addition to the existing identity and range requirements.
- **Supported preliminary range:** still requires at least two clean accepted sales, no material source/identity conflict, and no excessive spread.
- **High confidence:** now additionally requires sufficient clean sample depth, direct identity evidence, and no excessive dispersion.
- **Outliers:** are not deleted. The full ledger labels them as excluded by the IQR rule.
- **Narrative:** can explain only the deterministic output; it does not produce values, verdicts, or unsupported facts.

## Validation performed

| Validation | Result |
|---|---|
| Focused Analyzer 2.6 tests | **90 passed** across 11 suites |
| TypeScript | **Passed** (`pnpm exec tsc --noEmit`) |
| Production build | **Passed** (`pnpm run build`) |
| Runtime health | **HTTP 200** from the isolated development server |
| Diff hygiene | **Passed** (`git diff --check`) |
| Side-effect review | No analyzer database writes, outbound notifications, publishing, scheduling, or destructive operations introduced |

### Repository-wide test status

The full repository run completed with **1,145 passed, 6 skipped, and 9 failed** tests. The nine failures are pre-existing stale UI-contract assertions outside the Analyzer 2.6 files: Coming Soon image/layout, homepage polish/phrase loop, integration-logo mobile layout, listing-owner dialog, general responsive layout, trade receipt/payment lifecycle, and the separate USPS screenshot sandbox. None exercise the evidence normalizer, comparable engine, visual Sold-Comps filter, narrative fallback, snapshot contract, or Test AI valuation UI changed in this implementation.

The production build retains the existing chunk-size warning only; it is not a build failure.

## Remaining limitations and next recommended work

1. **Server-owned source orchestration (highest priority):** the browser currently transports source observations to the protected Test AI analysis route. The new server admission layer prevents those rows from self-promoting into valuation, but the strongest long-term design is for the server to invoke enabled market adapters and build the observation bundle itself.
2. **Provider contract fixtures:** add recorded, credential-free fixtures for every market adapter’s status, currency, date, price-basis, and ID fields. This protects against upstream schema drift.
3. **Source-specific market coverage:** continue adding permitted completed-sale sources for categories that have thin evidence. Strong logic cannot compensate for an insufficient evidence supply.
4. **Optional currency policy:** retain the current USD-only valuation rule until an auditable FX source and sale-date conversion policy are selected.
5. **Admin calibration report:** periodically review accepted, review-only, duplicate, and outlier counts by category/source to tune parser and source behavior from real evidence rather than intuition.
6. **Resolve unrelated repository test drift:** repair the nine stale non-analyzer UI-contract tests so the complete repository suite is green.

## Files central to this implementation

- `server/testAiMarketEvidence.ts` — server-owned marketplace observation admission.
- `server/testAiComparableEngine.ts` — parser recall, outlier handling, confidence reasons, and valuation ledger behavior.
- `server/testAIRouter.ts` — server normalization before snapshots, narrative boundary, and fallback behavior.
- `server/testAiResponse.ts` — schema-compliant deterministic narrative fallback.
- `server/testAiVisualSoldFilter.ts` — explicit raw-versus-graded visual rule.
- `client/src/pages/TestAI.tsx` — Sold-Comps provenance transport and confidence-basis display.
- `server/testAiMarketEvidence.test.ts` and `server/testAiParserRecall.test.ts` — new adversarial regression coverage.
