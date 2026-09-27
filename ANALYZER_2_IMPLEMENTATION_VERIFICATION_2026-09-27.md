# Analyzer 2.1 Reliability Implementation and Verification

**Project:** Tradebilia isolated development sandbox  
**Author:** Manus AI  
**Date:** September 27, 2026

## Conclusion

The Test AI trade analyzer now has a stronger, auditable path from source observations to its final comparison. The implementation removes the earlier risk that one early or prolific source could dominate the limited comparable set. It also makes cash terms explicit, preserves sale provenance, blocks more invalid market records, and prevents an ambiguous Music catalog result from silently becoming identity evidence.

The result remains a **sandbox-only decision aid**. It does not authenticate items, does not turn active asking prices into completed sales, and does not treat a language-model narrative as the source of the numeric verdict. The deterministic market profiles remain the authority for the displayed valuation range and trade verdict.[1] [2]

## Implemented safeguards

### One versioned analysis snapshot now drives the result

Each side of a comparison is now assembled into a server-side **Analyzer 2.1 snapshot**. The snapshot records its version and generation time, the deterministic market profile, source status and role, material review flags, and the visual-review outcome counts. The same snapshot is used for the narrative prompt and for the result screen. This prevents the explanatory narrative from being based on a different set of facts than the visible valuation evidence.[3]

### Comparable sales are selected by quality and source balance

The analyzer accepts up to 48 eligible sales for valuation. It first retains the strongest accepted sale from each contributing source, then fills the remaining places by identity score and recency. Every excluded record remains visible in the audit with a reason. The result shows received, deduplicated, eligible, identity-accepted, selected, and cap-omitted counts per source.

This means a long response from one marketplace cannot silently push out supporting evidence from another marketplace simply because it arrived first.[1]

### Completed-sale acceptance is more strict

A record can affect a deterministic market range only when it is dated, within one year, completed, priced in USD, has a positive price, and reaches an exact or near identity match. The analyzer now also excludes a record whose provider explicitly reports an **unknown price basis**. Active listings, asking prices, undated records, historical-only records, duplicate observations, known grade or grading-company mismatches, and variant or pressing conflicts remain context or are rejected.[1]

A visual review marked **mismatch** now hard-rejects a comparable even when its title looks otherwise exact. This closes the gap where a visibly unrelated item could have remained in the valuation path after a successful title match.[1]

### Material identity conflicts halt deterministic valuation

The evidence review can now hand a material-conflict gate to the comparable engine. When selected sources disagree on a key identity field, the analyzer keeps the records available for review but withholds the deterministic valuation range. The result states that identity review is required rather than producing an apparently precise number from incompatible evidence.[1] [2]

### Cash is shown as a transparent trade term

The sandbox now accepts an optional recorded cash adjustment and identifies which side contributed it. The analyzer calculates the before-and-after midpoint difference and whether the two sale ranges overlap after the entered cash amount. When no cash amount is entered, it can show a range-based balancing reference only when both sides already have defensible completed-sale ranges.

The wording explicitly states that this is a transparency aid, not a payment instruction, fairness guarantee, or appraisal.

### Music metadata must be selected when Discogs returns more than one release

For Music, an exact single Discogs result may supply reference metadata. When multiple release candidates are returned, the Evidence Review now displays an explicit **Confirm exact release / pressing** selector. Until an administrator chooses a result, Discogs data remains unaligned context. The choice applies only to the current sandbox run. Discogs metadata never becomes valuation or authentication evidence.[2]

### Narrative output is evidence-bound

The model response now has a stricter response contract. The deterministic verdict, completed-sale counts, source labels, confidence limits, and cash terms come from the server-side calculation. The narrative can explain those facts but cannot replace them with ungrounded values or a different verdict.[4]

## Verification performed

The full targeted Analyzer 2.1 suite passed after implementation:

| Verification area | Result |
|---|---:|
| Unified snapshot, cash-term, and source-balance fixtures | Passed |
| Comparable identity, recency, duplicate, visual-mismatch, and price-basis gates | Passed |
| Evidence normalization and material-conflict handoff | Passed |
| Music exact-release and ambiguity handling | Passed |
| Analyzer request and UI contract checks | Passed |
| Visual sold-filter contract checks | Passed |
| Focused total | **57 tests passed across 6 files** |
| TypeScript | **Passed** |
| Production build | **Passed** |
| Diff whitespace validation | **Passed** |

The production build still reports the existing large JavaScript chunk warning. It is a performance optimization notice, not a build or runtime failure. No migration, seed script, destructive database operation, external source activation, production deployment, or scheduled process was introduced.

## Remaining operating limits

The analyzer still depends on the coverage and reliability of the selected providers. It correctly lowers or withholds deterministic confidence when completed, identity-matched evidence is absent. It does not invent missing market data.

The source snapshot records the source statuses and the time the analysis was generated. It does not persist a cross-run historical cache of every provider response. That was intentionally left out because it would create a data-retention design decision beyond this sandbox reliability change.

A rendered unauthenticated preview was captured after the update. It redirected to the public homepage because Test AI is admin-only. The authenticated Test AI layout therefore needs a normal administrator run-through to confirm the new cash field, source-selection diagnostics, and Discogs release selector visually with live sandbox data. The code path, type check, focused regression suite, and production bundle all passed.

## References

[1]: file:///home/ubuntu/tradebilia-isolated-development/server/testAiComparableEngine.ts "Deterministic comparable engine and valuation gates"
[2]: file:///home/ubuntu/tradebilia-isolated-development/shared/testAiEvidenceNormalization.ts "Evidence normalization and material identity review"
[3]: file:///home/ubuntu/tradebilia-isolated-development/server/testAiAnalysisSnapshot.ts "Versioned analyzer snapshot and cash-aware trade terms"
[4]: file:///home/ubuntu/tradebilia-isolated-development/server/testAiResponse.ts "Evidence-bound analyzer narrative response contract"
