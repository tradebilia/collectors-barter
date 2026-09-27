# Analyzer 2.0 Data-Flow Audit

**Project:** Tradebilia isolated development sandbox  
**Date:** 2026-09-26  
**Scope:** Verify that selected item data, market-source data, visual evidence, normalization, deterministic valuation, and AI narrative generation are captured and used in the correct order.

## Executive conclusion

The analyzer has a strong evidence-safety foundation, but it is **not yet fully correct end to end**.

The most important defect is a data-flow omission:

> The Test AI UI sends `leftSoldCompsMetrics` and `rightSoldCompsMetrics` to `analyzeItems`, but the deterministic market profiles are built from `leftHistoricalTrendSales` and `rightHistoricalTrendSales` only. Sold-Comps metrics are passed as aggregate context, not as individual comparable sales, and aggregate metrics are deliberately not allowed to create a verified valuation.

Therefore, Sold-Comps can appear in the source panel and in the prompt’s item summary, while its completed-sale prices do **not** enter the deterministic weighted value or final deterministic verdict.

The same issue affects the eBay active/sold distinction: eBay active metrics are correctly asking-price context, but the separate completed Sold-Comps records are not joined to the valuation-sales array.

## Verified current pipeline

1. **Item selection**
   - Test AI selects inventory/public items or certificate-backed items.
   - PSA, BGS, and CGC certificate modes synthesize a searchable item before eBay/Sold-Comps lookup.
   - PCGS is used for coin certification/Auction Prices Realized paths, but there is no generic cert-search synthesis for every grading company.

2. **Source lookup**
   - Active listings, Sold-Comps, HIPStamp, 130point, The Card API, Cardsight.ai, Lelands, Pristine, PCGS APR, catalog/reference sources, and RSS are queried according to source applicability.
   - Permission-pending sources remain disabled and do not make network requests.

3. **Evidence normalization**
   - `normalizeTestAiEvidence` classifies sources by role: completed-sale candidate, asking-price context, historical context, certification context, or reference context.
   - P0 identity rules check category-critical identifiers.
   - Material mismatches are surfaced as review flags.
   - Asking prices, certification/population data, reference metadata, RSS, historical, and undated records are explicitly prohibited from valuation.

4. **Visual identity review**
   - Images are sent only when the image toggle is enabled and the URL is HTTPS.
   - The visual review is identity/condition context, not value/authenticity evidence.
   - High-confidence visual mismatch removal is conservative: only high-confidence mismatches are removed; rough, unreadable, and unreviewed candidates are retained.
   - The shared visual source filter is used by the relevant active, Sold-Comps, 130point, and PWCC paths, but not every reference/catalog adapter needs or supports candidate-image filtering.

5. **Temporary visual field completion**
   - Missing fields can be filled temporarily from high-confidence image observations.
   - The applied fields are marked image-derived and are not persisted.
   - They can refine a temporary active-listing query, but active results remain asking-price context only.

6. **Deterministic valuation**
   - `buildMarketProfile` deduplicates records, requires dated completed records within 365 days, accepts only USD positive prices, scores identity/grade/company/variant matches, applies recency weighting, and performs IQR filtering.
   - A defensible range requires at least two accepted comparables.
   - `deterministicTradeComparison` requires defensible profiles on both sides before producing an item-worth-more/equal verdict.
   - The LLM is instructed to explain the deterministic profiles, not perform valuation math.

7. **Narrative AI**
   - The final JSON narrative receives item metadata, source metrics, evidence summaries, visual context, RSS context, temporary visual fields, and deterministic profiles.
   - The server overwrites the returned narrative verdict with the deterministic verdict.
   - Malformed narrative JSON falls back to a safe deterministic-summary response.

## Findings

### P0 — Completed Sold-Comps evidence is not included in deterministic valuation

**Evidence:**

- The client sends:
  - `leftSoldCompsMetrics`
  - `rightSoldCompsMetrics`
  - `leftHistoricalTrendSales`
  - `rightHistoricalTrendSales`
- The server builds profiles with:

```ts
buildMarketProfile(analysisLeftItem, leftHistoricalTrendSales, leftSoldCompsMetrics)
buildMarketProfile(analysisRightItem, rightHistoricalTrendSales, rightSoldCompsMetrics)
```

- The comparable engine only scores individual `sales` records. `aggregateMetrics` is used for an unverified median/context warning when no accepted sales exist; it is intentionally not allowed to establish a supported valuation.
- The client’s historical-sales arrays include 130point, The Card API, Cardsight.ai, Lelands, Pristine, and PCGS APR, but do not include Sold-Comps listings.

**Impact:**

A user can enable Sold-Comps, see valid completed prices, and still receive `Insufficient Evidence` or a valuation based on another source only. The UI and narrative may imply that Sold-Comps was part of the analysis even when it did not affect the deterministic value.

**Required correction:**

Normalize every eligible Sold-Comps listing into the same `MarketSale` contract and append it to the corresponding historical-sales array before calling `analyzeItems`, or add a separate typed completed-sales input that the server merges before profile construction. Preserve source ID, sale ID, title, price, currency, ended date, URL, and explicit `saleStatus: completed` only when the adapter has verified completed status.

Add a regression test proving that changing only a Sold-Comps completed-sale price changes the deterministic profile/value gap, while changing only active eBay or HIPStamp asking metrics does not.

### P0 — Evidence review flags do not block or downgrade deterministic comparable acceptance

`leftEvidenceSummary` and `rightEvidenceSummary` are passed to the server and included in the LLM prompt, but `buildMarketProfile` receives only the item and sales. Material source mismatch flags are not passed into the comparable engine.

**Impact:**

A source can report a material mismatch (for example, wrong coin denomination/material, wrong game platform, wrong comic issue, or wrong card number), the UI can display “Review before comparing,” yet an individual sale with a strong title-token match can still be accepted by the deterministic engine.

**Required correction:**

Create a typed `identityGate` derived from the normalized evidence summary. At minimum:

- `materialReviewRequired: boolean`
- `materialFlags: string[]`
- `sourceAlignmentStatus: aligned | conflicted | unavailable`

When a material conflict exists, either reject affected source records or force the profile to `supported: false` until the conflict is resolved. Do not silently let the LLM decide whether a conflict matters.

### P1 — Source counts and valuation records are represented by different contracts

The evidence panel counts completed records from source payloads, while the comparable engine counts only the normalized sales array. These counts can disagree.

Examples:

- Sold-Comps can show three completed records in `evidenceSufficiency` while the deterministic profile has zero authoritative sales.
- PCGS APR counts dated auction rows, but profile title matching depends on the synthetic title and may reject or context-only classify rows.
- Lelands/Pristine use `completed` flags for sales but their source-specific fields are not normalized centrally before profile scoring.

**Required correction:**

Use one server-side normalization layer that produces both:

- the evidence summary counts, and
- the exact `MarketSale[]` consumed by `buildMarketProfile`.

The UI should render counts from the same normalized response used for valuation, not independently derive counts from raw provider payloads.

### P1 — Sales are capped to ten records in the analyzer input

The tRPC schema limits each historical-sales array to `.max(10)`. The comparable engine has deduplication, weighting, and IQR protection, so capping before valuation can discard useful evidence and distort liquidity/velocity.

**Required correction:**

Raise the cap to a documented bounded limit after server-side normalization, or send a compact normalized sample plus source-level counts. Keep a hard upper bound for payload safety, but do not silently discard records without exposing the truncation in `valuationWarnings`.

### P1 — Source provenance is not retained in the final comparable audit for every path

`MarketSale` supports source ID, sale ID, URL, and marketplace, but several source mappings rely on provider fields or synthetic defaults. The final UI audit should show source, sale ID/lot ID, date, price basis, and whether the row was visually reviewed.

**Required correction:**

Require a normalized provenance object for each sale:

- source ID and display label
- provider record/lot ID
- canonical source URL
- completed-status basis
- price basis (`realized`, `closed`, `asking`, `guide`, or `unknown`)
- currency
- visual-review status
- identity-match classification and exclusion reason

### P1 — `closed` is not treated as completed even where a provider uses “closed” for a realized auction

`isCompletedSaleCandidate` accepts only `saleStatus` absent or `completed`; `closed` is rejected. This is safe but may undercount auction sources whose documented terminal state is “closed” and whose final price is realized.

**Required correction:**

Normalize provider-specific statuses before the generic engine. Convert `closed` to `completed` only when the adapter proves that the record is a finalized sale with a final price. Keep unverified closed/ended listings as context.

### P2 — Visual filtering is conservative but operationally non-transparent in final value output

The visual filter keeps unreviewed candidates when the provider is unavailable. This is the correct safety default, but the deterministic profile does not expose the visual filter status directly in its comparable records.

**Required correction:**

Attach `visualReviewStatus` and `visualReviewNote` to normalized sale records or profile diagnostics so the result clearly states whether visual filtering was applied, skipped, unavailable, or not applicable.

### P2 — Image field completion is correctly temporary but can influence query refinement without a compact audit trail

The server marks temporary image-derived fields in prompt context, and the UI shows fields used. The refined active metrics are included as asking-price context. This is safe, but the final result should also expose the exact query, fields, and returned count in a structured diagnostics panel.

### P2 — Narrative prompt asks for claims that may exceed available evidence

The prompt requests population rarity, grade-cliff analysis, replacement cost, known fakes/restoration risks, and future price scenarios. The prompt contains safety rules, but many categories do not have the required specialized evidence in the deterministic payload.

**Required correction:**

Require each requested claim to be evidence-backed or explicitly labeled unavailable. Future-potential ranges should not be generated from unsupported narrative knowledge alone. Prefer `not assessable from selected sources` over plausible-sounding unsupported estimates.

## What is working correctly

- The final verdict is overwritten with the deterministic verdict rather than trusting the LLM’s verdict.
- Owner estimates and aggregate asking-price medians cannot create a supported deterministic valuation.
- Active eBay/HIPStamp data is labeled asking-price context.
- Historical and undated sales are excluded from current-value calculation.
- USD and positive-price gates are enforced.
- Duplicate sales are suppressed.
- Grade, grading company, variant, year, platform, denomination, and other identity conflicts are considered in comparable scoring.
- PCGS coin grade prefixes such as `MS65` are handled as alphanumeric identity.
- Image review is isolated to the Test AI sandbox and does not persist listing changes.
- Provider failures fall back conservatively instead of fabricating values.
- Permission-pending specialist sources remain disabled and valuation-blocked.

## Recommended implementation order

1. **Unify completed-sale normalization** and feed Sold-Comps into the deterministic `MarketSale[]` path.
2. **Pass material evidence gates into profile construction** so visible conflicts can block valuation.
3. **Add a single server-side normalized analysis snapshot** containing source counts, records, provenance, and diagnostics.
4. **Raise or redesign the ten-sale input cap** with explicit truncation warnings.
5. **Expose provenance and visual-filter status per comparable.**
6. **Constrain unsupported narrative fields** such as future ranges and grade cliffs to evidence-backed or explicitly unavailable outputs.
7. Add end-to-end fixtures for at least:
   - sports card + Sold-Comps
   - coin + PCGS APR with silver/gold conflict
   - video game + platform mismatch
   - comic + issue/variant mismatch
   - stamp + single stamp versus hinged block
   - item with no completed sales but active asking listings only

## Verification performed

The current analyzer regression baseline passes:

- `server/testAiAnalyzerInput.test.ts`: 8 tests
- `server/testAiComparableEngine.test.ts`: 12 tests
- `server/testAiP0Evidence.test.ts`: 4 tests
- `server/testAiEvidenceNormalization.test.ts`: 14 tests

**Total: 38 tests passed.**

These tests validate the intended safety contracts, but they do not currently catch the Sold-Comps omission or material-evidence-gate bypass. Those tests should be added before calling the analyzer fully correct.

## Rating

- **Evidence safety and separation:** 8/10
- **Identity guardrails:** 7/10
- **Source coverage:** 7/10
- **Data-flow correctness into deterministic valuation:** 5/10
- **Explainability/provenance:** 6/10
- **Overall current sandbox analyzer:** **6.5/10**

The analyzer is a solid guarded prototype, not yet a fully reliable multi-source valuation pipeline. The P0 fix is to ensure every completed-sale source that the UI reports is actually normalized into the same deterministic valuation input, with material identity conflicts able to block that source from valuation.
