# Test AI Cross-Category Evidence Policy — Implementation Verification

**Project:** Tradebilia isolated development sandbox  
**Date:** 2026-09-27  
**Status:** Verified sandbox-only implementation

## Purpose

This implementation addresses the highest-risk failure identified in the cross-category audit: **plausible market records being silently removed before an administrator can see why**. The shared policy now distinguishes uncertainty from contradiction:

| Evidence state | Treatment | Deterministic valuation use |
|---|---|---:|
| `valuation_eligible` | Completed sale with sufficiently aligned evidence | Yes |
| `warning_review` | Record retained, but one or more material fields are absent, ambiguous, or visually flagged | No |
| `contextual` | Useful historical, active, undated, or insufficient-identity evidence | No |
| `rejected_objective_conflict` | Explicit, explainable conflict such as a wrong stated grade, grader, card/issue number, sport, or invalid valuation semantics | No |

## Implemented changes

### 1. Lossless eBay Sold-Comps retrieval and audit ledger

- The completed-sale adapter now runs all bounded fallback query tiers and unions/deduplicates results. It no longer treats the first non-empty sports-card page or the first 100 raw results as complete retrieval.
- Every completed-sale candidate preserves source (`sold_comps` / eBay Sold-Comps), retrieval query, raw title, ID/URL, price, date, visual status, disposition, and reason code in a bounded response ledger.
- The Test AI Sold-Comps panel now shows retrieval coverage, valuation-eligible count, retained-review count, objective-conflict count, unreviewed visual count, and an expandable evidence ledger.
- UI display is no longer limited to the former 20 retained listings; the scrollable list and ledger expose the full bounded returned set.

### 2. Retain absence; reject only explicit conflicts

- Missing or unparsed grade, grader, card/issue/catalog number, player surname, or year is now **retained for review**, rather than deleted.
- Explicitly stated wrong recognized grader, grade, number, sport, or category-specific objective field remains excluded from valuation and recorded in the ledger.
- Completed eBay sports-card retrieval now applies the same card-number treatment as active eBay retrieval: a stated mismatch is excluded; an omitted number is retained for review.
- Year filtering is no longer a retrieval deletion rule. This prevents reissue, regional, manufacture, and release-year differences from hiding candidates. The engine can still classify a material stated difference downstream.

### 3. Vision is advisory across all visual source adapters

- The eBay Sold-Comps visual reviewer and the shared visual-source adapter no longer delete records solely from a high-confidence image mismatch.
- A visual mismatch becomes `warning_review` with the model rationale retained. It cannot support deterministic value unless other material evidence resolves the review condition.
- Candidate images outside the bounded review window remain marked `not_reviewed`; they are not represented as visually cleared.

### 4. Comparable-engine evidence handling

- Source disposition and reasons now carry through to comparable records.
- A visual mismatch alone produces contextual/manual-review evidence, not an irreversible rejection.
- Explicit wrong category number is a hard conflict. Missing number is review/context.
- Undeclared marketplace variant language (for example, a legitimate Disney Pin “Limited Edition”) is review/context rather than a blanket rejection. A declared target variant with an explicit conflicting sale variant remains a hard conflict.
- Existing deterministic gates still block active/asking, historical/undated, unknown-price-basis, duplicate, invalid-price, and non-completed records from valuation.

## Category impact

The shared policy applies to **all Test AI category adapters that use the common eBay, Sold-Comps, visual-source, and comparable-engine paths**: Sports Cards, Pokémon/TCG, Comics, Coins, Stamps, Video Games, Vintage Toys, Movies, Autographs, Disney Pins, and Music.

It improves cross-category safety immediately by preventing visual-only and missing-field deletion. It does **not** claim that all category-specific P1 identity gates are complete. The remaining work is to add structured validators for source-specific fields such as Pokémon set/finish, coin country/mint/variety, stamp Scott/item form, platform/region for games, Disney Pin event/edition-size, autograph signer/object/authenticator, and Music artist/catalog/format/pressing. Those controls should be added one category at a time with fixtures before they become valuation gates.

## Verification

Focused deterministic regression suite passed:

- **9 test files, 65 assertions**
- Covers explicit versus missing grade/company/number; bare comic issue formatting; all bounded sports-card query tiers; lossless year retention; source and visual mismatch retention; valuation exclusion for warning evidence; explicit number conflict; and non-destructive legitimate limited-edition handling.

Technical checks passed:

- `pnpm exec tsc --noEmit`
- `git diff --check`
- `pnpm run build` (prior to final provenance/year test pass; re-run is required at checkpoint and is part of final verification)
- Development server health: HTTP 200; no recent runtime exception output.

## Boundaries preserved

- Sandbox-only Test AI behavior.
- No database write, migration, seed, destructive operation, scheduler, production publication, domain change, user notification, or remote source write.
- No permission-pending specialist source was activated or queried.
