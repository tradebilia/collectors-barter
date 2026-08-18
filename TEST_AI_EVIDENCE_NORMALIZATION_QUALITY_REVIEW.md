# Test AI Evidence-Normalization Quality Review

**Decision date:** 2026-08-18
**Decision:** **Keep the implementation.** The evidence supports a measurable clarity and safety improvement over the prior provider-panel-only presentation.

## What Changed

The Test AI page now adds a deterministic **Evidence Review** above the unchanged source panels for each selected item. It gathers only administrator-selected provider results, normalizes category-relevant listing identity fields, separates market evidence by type and recency, and surfaces unresolved discrepancies. The existing source panels, manual source selection, provider contracts, database, and Trade Room behavior remain unchanged.

The same bounded summary is supplied to the existing Test AI analysis prompt as source-attributed context. It explicitly instructs the analysis not to silently resolve a discrepancy, use reference metadata as value, or treat historical or undated records as current-value averages.

## Acceptance Review

| Criterion | Evidence | Result |
|---|---|---|
| Category coverage | Fourteen deterministic fixtures exercise all ten Tradebilia categories, including category-specific field sets and unrelated-field isolation. | Passed |
| Identity mismatch handling | Pokémon card-number mismatch and NES-versus-SNES platform mismatch produce a material review flag rather than a false comparison. | Passed |
| Contextual date handling | A listing’s 1990 regional release and RAWG’s 1988 global first-release date remain distinct and visible; the date is not treated as an identity failure. | Passed |
| Market-recency separation | 130point and PWCC outputs keep recent, historical, and undated record counts separate. No current-value average is produced. | Passed |
| Custom-field correctness | The existing `Other` selection behavior is respected: a custom manufacturer or grading company is used only when the corresponding selector is `Other`. | Passed |
| Provider preservation | The original panels and manual Test AI source selection remain in place; the new review is additive. | Passed |
| Analysis guardrail | The prompt receives bounded source-attributed context with explicit instructions not to convert reference or historical evidence into a valuation. | Passed |
| Live reference and market samples | Controlled live checks returned an exact TCGdex match, a meaningful PriceCharting mismatch, RAWG global-versus-regional context, separate 130point/PWCC recency buckets, and no-record outcomes without false confirmation. | Passed |

## Live Findings That Demonstrate Improvement

The controlled Pokémon sample confirmed the practical value of the new review. TCGdex matched Base Set Charizard number 4, while a broad PriceCharting query returned a different Mega Charizard X record without a matching card number or set. Before normalization, an analyst had to notice this discrepancy across separate panels. The new review presents it as a material comparison issue rather than allowing it to blend into price evidence.

The Video Game sample showed the same improvement. RAWG confirmed the requested NES platform for *Super Mario Bros. 3* while reporting its 1988 global first-release year; the listing records a 1990 regional release year. The review retains both facts and flags the difference as contextual rather than overwriting either value.

The card-market sample returned two recent and eight historical 130point records, while PWCC returned ten historical records. The normalized output keeps those facts distinct and does not calculate an artificial current average from older sales.

## Known Limits

Normalization cannot create specialist evidence where no approved source exists. A no-record result from IGDB or Smithsonian is disclosed as source coverage only; it is not treated as a negative conclusion about the item. The feature also does not replace an analyst’s review of exact edition, condition, certification, variant, or market comparability.

## Keep-or-Rollback Conclusion

The new summary meets the documented acceptance criteria without modifying raw provider panels or automatic valuation behavior. It makes wrong or incomplete comparisons easier to identify, provides the Test AI analysis with explicit limitations, and preserves the user-approved manual workflow. The implementation should therefore be retained. The restore baseline remains checkpoint `a4d4ec24` if a future regression requires rollback.

## Final Validation

TypeScript completed without errors. The complete regression suite passed with 82 test files and 264 tests, plus one intentionally skipped file and four intentionally skipped tests. The production build also completed successfully. The build emitted the project’s existing large-client-chunk advisory; it does not indicate a normalization error and remains a separate performance optimization opportunity.
