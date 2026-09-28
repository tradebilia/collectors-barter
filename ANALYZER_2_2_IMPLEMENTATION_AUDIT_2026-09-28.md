# Tradebilia Test AI — Analyzer 2.2 Implementation Audit and Grade

**Date:** 2026-09-28  
**Scope:** Isolated Test AI sandbox only. This review covers the deterministic comparable engine, evidence ledger, trade comparison, and administrator-facing audit interface. It does not change live marketplace workflows, database data, production domains, credentials, or provider configuration.

## Overall grade: **8.2 / 10 — B+**

The sandbox analyzer is now a strong, explainable **decision-support system**. It correctly separates realized-sale valuation evidence from asking-price and reference context. It retains uncertain evidence for review instead of silently dropping it. It also makes a more conservative trade conclusion when two supported value ranges overlap.

The grade is not higher because category-aware comparability is still incomplete outside Sports Cards, Pokémon, Comics, and Coins. The system also has not yet been calibrated against a private set of historically verified trades. It should not be treated as an appraisal engine or an autonomous recommendation system.

> **Main conclusion:** The core valuation path is materially safer than before. The remaining risk is no longer mainly hidden filtering. It is incomplete category coverage, incomplete real-world benchmark validation, and the limits of available market data.

## What was implemented and re-checked

### Category-specific direct-comparable gates

The comparable engine now emits a structured category-identity result for every Sports Card, Pokémon, Comic, and Coin sale. The result lists confirmed fields, missing fields, and explicit conflicts. A record can have one of four outcomes: `direct_confirmed`, `needs_review`, `objective_conflict`, or `not_applicable`.

For the supported categories, a sale can enter direct valuation only when the relevant anchors are sufficiently present and aligned. Sports Cards require confirmation of player, year, manufacturer, and card number when those fields are supplied. Pokémon requires card name, set, and card number. Comics requires series, issue, and publisher. Coins require denomination and year, while non-United States country data is checked when supplied.

This does **not** delete sparse records. A title that omits a required field is retained as contextual review evidence. An explicit wrong issue number or card number remains visible but is blocked from direct valuation. Year differences remain review context rather than automatic rejection because reissues and regional releases can legitimately use different years.

### Range-first trade conclusions

The deterministic comparison no longer calls one item more valuable solely because its weighted midpoint is higher. It first checks whether the two completed-sale ranges overlap.

If the ranges overlap, the verdict is now **“Ranges Overlap — Evidence is Indeterminate.”** The UI shows the shared dollar band and explains that a midpoint difference is not proof that either side is worth more. A directional conclusion is made only when one complete supported range sits above the other. If either side lacks a defensible range, the result remains **“Insufficient Evidence.”**

This same server-computed conclusion is supplied to the narrative layer as read-only context. The model is instructed not to recalculate or override it.

### Full comparable-use ledger

The Test AI comparable audit now contains a collapsible **Full valuation-use ledger**. Every returned record receives a visible use label and an exact reason:

- **Used in direct valuation** means it was a completed sale, passed identity checks, and survived source-balanced selection.
- **Secondary evidence only** identifies grade- or certification-adjacent records.
- **Matched but omitted by source-balanced cap** identifies otherwise eligible records that were not selected under the transparent bounded-cap rule.
- **Context / review only** identifies incomplete, historical, active, undated, or otherwise non-valuation records.
- **Excluded from direct valuation** identifies objective conflicts, duplicate observations, or invalid records.

Each ledger row also displays the category-gate status, confirmed fields, review fields, conflicts, source, sale status, price basis, and visual-review state when available.

## Independent scenario re-check

An independent read-only scenario harness exercised the actual comparable engine after the implementation. It confirmed all four intended outcomes:

| Scenario | Expected result | Verified result |
|---|---|---|
| Fully identified 1996 Topps Kobe Bryant #138 PSA 10 sale | Direct valuation eligible | Accepted with `direct_confirmed` identity and `direct_comparable` use |
| Sparse Kobe Bryant PSA 10 sale without year, manufacturer, or card number | Retained but not valued | `needs_review`, contextual, with the missing anchors named |
| Uncanny X-Men #138 sale against an issue #137 target | Retained but blocked | `objective_conflict`, rejected from direct valuation, with the wrong issue named |
| Two supported price ranges that overlap from $180 to $220 | No false winner | “Ranges Overlap — Evidence is Indeterminate” with the overlap band shown |

## Validation results

The implementation passed the analyzer-focused test suite: **38 assertions across 5 test files**. Those tests cover category gates, direct-versus-secondary comparable treatment, snapshot behavior, range overlap, and the new full audit ledger.

TypeScript passed with no errors. The production build passed. The development server returned HTTP 200. Git diff hygiene passed with no whitespace errors. The non-blocking build warning about large JavaScript chunks remains unchanged.

A complete repository test run found **1,109 passing tests, 11 failing tests, and 6 skipped tests** out of 1,126 total tests. The failing tests are in untouched homepage, Coming Soon, USPS, trade-room, integration-logo, responsive-layout, and prior audit-contract areas. No failure points to the analyzer files changed in this work. Because a full-suite baseline was not run immediately before this change, these failures should be treated as **unrelated by changed-file scope, not proven pre-existing**. They remain project cleanup work before claiming a fully green repository.

The browser was able to verify that the public site renders at desktop and mobile sizes. Test AI itself remained admin-protected in the browser session, so the new administrator-only ledger was validated through TypeScript, targeted UI contracts, and the server-side scenario harness rather than an authenticated browser render.

## What is strong now

The analyzer has a sound deterministic core. It keeps asking prices, reference data, and non-completed records outside valuation. It has source-balanced comparable selection, duplicate suppression, recency weighting, IQR outlier handling, evidence snapshots, visual-review provenance, and a visible ledger. It now distinguishes four important concepts that should never be conflated: direct comparables, grade/certification-adjacent evidence, uncertain context, and objective conflicts.

The new range-first logic is particularly important. It prevents a narrow-looking midpoint difference from being turned into a confident trade winner when the market evidence bands still overlap.

## Remaining issues before a higher grade

The largest remaining work is category coverage. The new structured gates are implemented only for Sports Cards, Pokémon, Comics, and Coins. Stamps, Video Games, Vintage Toys, Movies, Autographs, Disney Pins, and Music still need the same field-by-field comparator model. Music also needs complete Discogs-to-evidence normalization before the category should be considered valuation-ready.

The system still needs a private benchmark set of manually verified historical trades. That benchmark should measure whether the engine accepted the right sales, retained uncertainty correctly, rejected the wrong sales, and expressed a suitable confidence level. Without this benchmark, the code can be logically strong but not yet empirically calibrated.

The full repository test suite also needs cleanup. Although the 11 failing tests are outside this analyzer scope, a durable release process should return the entire repository to green before a production release.

Finally, the analyzer should continue to present its conclusions as support for collector judgment. Sparse sales, limited source access, provider quotas, marketplace title quality, regional variants, and changing liquidity still constrain any market estimate.

## Recommended next work

The safest next implementation is to extend the same lossless field comparator to **Stamps, Video Games, Music, and Disney Pins**, because their categories have clear material fields that materially change value. After that, add pure fixtures for the category-specific conflict grids and a small private historical-trade benchmark. The final cleanup task should resolve the 11 unrelated full-suite failures so every repository test is green.

## References

[1]: https://github.com/tradebilia/collectors-barter/tree/manus/trade-alert-instagram-fix-20260921 "Tradebilia collectors-barter isolated development branch"
[2]: https://github.com/tradebilia/collectors-barter/blob/manus/trade-alert-instagram-fix-20260921/server/testAiComparableEngine.ts "Deterministic comparable engine and range-first trade comparison"
[3]: https://github.com/tradebilia/collectors-barter/blob/manus/trade-alert-instagram-fix-20260921/client/src/pages/TestAI.tsx "Test AI comparable audit and valuation-use ledger"
[4]: https://github.com/tradebilia/collectors-barter/blob/manus/trade-alert-instagram-fix-20260921/CROSS_CATEGORY_EVIDENCE_POLICY_AUDIT_2026-09-27.md "Cross-category evidence-policy audit"
