# Analyzer 2.0 Re-Review and Recommended Next Work

**Project:** Tradebilia isolated development sandbox  
**Date:** 2026-09-27  
**Scope:** Re-review the Analyzer 2.0 after the completed Sold-Comps and material-conflict fixes. The review covers market-data flow, comparable selection, category identity, narrative safety, evidence provenance, and validation coverage.

## Bottom line

The recent work fixed two material weaknesses: completed Sold-Comps records now enter the deterministic comparable array, and a material identity conflict now prevents the engine from presenting a supported valuation. Those are meaningful improvements.

The next priority should **not** be adding more sources. The current architecture needs a single, traceable evidence snapshot and stronger controls over what the narrative AI is permitted to claim. Until those are added, the deterministic dollar range is safer than the surrounding commentary, liquidity labels, future-potential ranges, and negotiation advice.

> **Recommendation:** Build a server-side, provenance-preserving analysis snapshot and make every qualitative claim either data-derived, source-cited, or explicitly unavailable. Do this before expanding category sources.

## Current assessment

| Area | Rating | Assessment |
|---|---:|---|
| Separation of sold prices and asking prices | 8.5/10 | Active and asking-price data is excluded from deterministic valuation. |
| Completed-sale valuation flow | 7.5/10 | Sold-Comps now participates, but client-side ordering can still exclude later sources at the 30-record cap. |
| Identity and conflict protection | 7/10 | Stronger after the new material gate, but generic title scoring does not yet enforce every category’s critical identifiers. |
| Evidence provenance and auditability | 6/10 | Source IDs exist internally, but the final comparable audit omits source URL, sale ID, price basis, and visual-review status. |
| Narrative safety and explainability | 5.5/10 | The deterministic verdict is protected, but narrative fields can still make unsupported qualitative or forward-looking claims. |
| Category readiness | 6.5/10 | Sports cards, Pokémon, coins, comics, video games, and stamps have stronger contracts. Music is not fully wired into evidence normalization. |
| Overall sandbox decision support | **7.5/10** | Strong guarded sandbox analyzer. It should remain decision support rather than an appraisal or autonomous trade recommendation. |

## What is now working correctly

The analyzer now passes completed eBay Sold-Comps records into the same `MarketSale[]` path used by the deterministic comparable engine. A completed, dated, positive USD sale must still pass identity, recency, duplicate, and outlier gates before it affects a value. Active listings, owner estimates, reference data, certification/population information, RSS articles, and undated or historical records remain context rather than valuation evidence. [1] [2]

The material identity gate is now meaningful. If evidence normalization finds a material discrepancy, such as a conflicting coin denomination, grade, platform, card number, or variant, the profile is marked unsupported and the trade verdict becomes insufficient evidence. This is a sound conservative behavior. [1] [2]

The sandbox also distinguishes image review from authentication and valuation. Visual input can confirm visible details or request manual review, while the deterministic engine remains responsible for price math. This remains the correct architectural boundary. [1]

## The highest-priority remaining work

### 1. Replace source-order truncation with balanced comparable selection

The client builds one array by concatenating 130point, The Card API, Cardsight.ai, Lelands, Pristine, PCGS auction records, and then Sold-Comps. It then takes the first 30 records. Because Sold-Comps is appended last, an earlier source with many records can occupy the full cap. A user could enable Sold-Comps and still have its records omitted before the deterministic engine sees them.

This is not a reason to remove the safety cap. It is a reason to apply the cap **after** normalization, deduplication, identity screening, and source balancing.

Implement a deterministic selection policy:

1. Normalize every candidate into one shared completed-sale contract.
2. Reject non-completed, undated, non-USD, duplicate, and obvious identity-conflict candidates.
3. Preserve a small recent quota for every source that produced valid sales.
4. Rank the remaining records by exactness, recency, and source reliability.
5. Cap the final selection at 30 records.
6. Return diagnostics: returned, rejected, sampled, used, and omitted counts by source.

This prevents any single source from silently crowding out another and makes the final range explainable.

### 2. Build one server-side analysis snapshot

The evidence panel and the valuation engine currently derive related facts through separate client-side mappings. That means source count, evidence sufficiency, and the final comparable list can still diverge. The current design works, but it remains vulnerable to a new adapter being displayed without being normalized for valuation, or vice versa.

Create a typed `AnalysisSnapshot` on the server for each selected item. It should contain:

- normalized item identity and readiness;
- every source request status;
- normalized completed-sale candidates;
- asking-price and reference context kept separately;
- per-record inclusion or exclusion decision;
- material identity gate;
- normalized market profile; and
- truncation and visual-review diagnostics.

The Evidence Review card, comparable audit, deterministic profile, and LLM prompt should all read from that one snapshot. This is the largest reliability improvement available because it removes multiple parallel interpretations of the same provider payload.

### 3. Make the narrative layer evidence-bound

The deterministic engine controls the verdict, but the LLM still generates liquidity notes, grade-cliff commentary, future-potential dollar ranges, strengths, risks, trade fairness, and negotiation advice as free-form text. Those fields are displayed directly. The prompt includes sensible rules, but prompts alone cannot guarantee that every future price range or replacement-cost statement has evidence.

Replace the current free-form narrative contract with a strict structured response. Each claim should include:

- the statement;
- a classification of `data-derived`, `source-cited`, or `not-assessable`;
- the supporting comparable or source IDs when available; and
- a confidence level.

Use a JSON schema response format and validate it with Zod on the server. Derive liquidity, stability, sale velocity, and deterministic value language directly from `MarketProfile`, rather than allowing the LLM to supply competing labels. If grade-cliff data, replacement cost, or future-range evidence is not present, the UI should say **“Not assessable from selected sources.”**

The LLM should explain the evidence. It should not invent forward-looking numbers, dollar negotiation adjustments, rarity conclusions, or authentication risks.

### 4. Add category adapters to the comparable engine

The engine has strong generic controls, but its direct comparable scoring mainly uses title-token overlap, year, card or issue number, variant language, grade, and grading company. Those are not enough for every category.

Create category adapters that emit normalized identity assertions from both the target item and the provider record. Require the adapter to confirm the fields that actually determine comparability:

| Category | Required comparable assertions |
|---|---|
| Coins | country, denomination, year, mint mark, metal/composition, variety, certification company, grade |
| Stamps | country, catalog number, denomination, single versus block, hinged/gum status, condition, certification |
| Video games | product type, platform, region, edition, complete-in-box or sealed status, grader, grade |
| Comics | series, issue number, volume, variant, printing, restoration/label status, grader, grade |
| Music | artist, release title, catalog number, label, country, release year, format, pressing/edition, condition |
| Sports cards and Pokémon | player/card name, set, number, year, parallel or finish, certification company, grade |

A sale should not become an exact or near comparable simply because its title shares enough words. The adapter must either positively align the material fields or explicitly leave the sale contextual.

### 5. Complete Music evidence normalization before relying on Music analysis

Music is correctly represented in the P0 identity rules, and Discogs provides useful identity metadata. However, `testAiEvidenceNormalization.ts` does not include a Music-specific entry in `CATEGORY_FIELDS` or `MATERIAL_FIELDS`. It falls back to a generic title, grader, and grade view. The Discogs result is also not incorporated as an aligned evidence observation in the same way as other specialist sources. [3] [4]

Before treating Music analysis as reliable, add Music-specific evidence normalization and map Discogs fields into it. The minimum fields should be artist, release title, catalog number, record label, country, release year, edition or pressing, and format. For vinyl, pressing and condition are material; an original pressing and a later reissue should not share a valuation pool.

### 6. Preserve full provenance in the final comparable audit

The engine receives source ID, sale ID, URL, and marketplace, but `ComparableMatch` retains only source ID. The final user-facing audit therefore shows a title, price, score, and reason without the stable record identity needed to verify the sale.

Add these fields to every final comparable row:

- source label and source ID;
- completed-status basis;
- provider sale or lot ID;
- canonical URL;
- sale date and price basis such as `realized`, `closed`, or `asking`;
- currency;
- identity classification and reasons;
- visual-review state; and
- inclusion or exclusion result.

This creates the evidence ledger that lets an administrator or user understand exactly why a sale moved the range.

## Important follow-up controls

### Normalize valid closed auction outcomes safely

The generic completed-sale gate only accepts `saleStatus: completed`. It intentionally treats `closed` as context. That is conservative, but some auction adapters may use `closed` for a finalized realized sale. Add source-specific status mapping before the generic engine. Convert `closed` to `completed` only when the adapter has proof of a final price and a finalized outcome. Otherwise keep it contextual.

### Make trade fairness cash-aware and separate from market value

The deterministic comparison answers only one question: which supported item value is higher. A real trade also depends on cash adjustment, shipping, platform/payment costs, liquidity, and uncertainty. Add a separate trade-terms model with an explicit cash amount and direction. The output should show:

- gross market-value comparison;
- cash-adjusted comparison;
- confidence-adjusted comparison; and
- an optional liquidity consideration.

Do not let a narrative “fair trade” label substitute for these calculations.

### Add a minimum data-quality rule for a tradable recommendation

A value range may be technically supported with two accepted sales, but that is still a fragile basis for a trade recommendation. Keep two sales as the minimum threshold for a bounded estimate, but require stronger conditions for a positive fairness recommendation. For example, require three or more recent accepted sales, at least one exact match, no material flags, and a non-low stability score. Otherwise show **“Value range available; trade recommendation requires more evidence.”**

## Validation plan

The current focused analyzer suites pass 42 tests. They verify important contracts, but most are unit tests or source-contract assertions. The next phase should add fixture-driven end-to-end snapshot tests that emulate each source response and verify the same outputs the UI will display.

The minimum fixture set is:

1. A sports card where Sold-Comps changes the range.
2. A coin where silver and gold candidates are separated.
3. An NES console where an Excitebike cartridge is rejected.
4. A comic where issue and variant mismatch are rejected.
5. A stamp where a single differs from a hinged block.
6. A music release where an original pressing differs from a reissue.
7. A source-overflow case where earlier adapters return more than 30 records, proving later valid Sold-Comps records still receive balanced consideration.
8. A no-sales case where asking prices remain context and no fairness recommendation is issued.
9. A material-conflict case where every valuation-facing output consistently reports review required.
10. A narrative-validation case where an unsupported future-price claim is rejected or transformed to not assessable.

After those fixtures pass, use a small private benchmark set of real historical trades. Record whether the analyzer accepted the right comparables, excluded the wrong ones, and expressed the correct level of confidence. Measure false inclusions before adding more providers.

## Recommended implementation sequence

1. **Balanced selection and truncation diagnostics.** This removes the immediate source-order bias risk.
2. **Server-side `AnalysisSnapshot` and provenance ledger.** This unifies every evidence-facing view.
3. **Evidence-bound narrative schema.** This prevents unsupported qualitative claims from weakening a sound valuation engine.
4. **Category-specific comparable adapters.** Start with coins, stamps, video games, and Music.
5. **Music evidence normalization and Discogs alignment.** Music should not be treated as ready until this is complete.
6. **Cash-aware trade-terms model.** Keep market value and negotiated fairness distinct.
7. **Fixture-driven end-to-end benchmark suite.** Use the results to decide whether additional sources will help.

## Recommendation in plain terms

The analyzer now has a better core. The next goal should be making every number and every written conclusion traceable back to a specific, accepted sale. Do not expand the source list yet. First ensure that selected sources cannot be dropped by ordering, that all categories have their own matching rules, and that the AI cannot present a confident prediction when the selected data does not support one.

## References

[1]: https://github.com/tradebilia/collectors-barter/blob/64cc3b4d7/server/testAIRouter.ts "Analyzer request, deterministic profile handoff, and narrative response handling"

[2]: https://github.com/tradebilia/collectors-barter/blob/64cc3b4d7/server/testAiComparableEngine.ts "Comparable engine, valuation gates, and deterministic trade verdict"

[3]: https://github.com/tradebilia/collectors-barter/blob/64cc3b4d7/shared/testAiP0Evidence.ts "Category-specific P0 identity readiness rules"

[4]: https://github.com/tradebilia/collectors-barter/blob/64cc3b4d7/shared/testAiEvidenceNormalization.ts "Evidence normalization fields and material review flags"
