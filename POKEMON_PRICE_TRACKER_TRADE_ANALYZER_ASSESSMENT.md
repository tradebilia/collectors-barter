# Pokémon Price Tracker and the Tradebilia Trade Analyzer

**Assessment date:** 24 September 2026  
**Decision scope:** Tradebilia’s isolated Test AI sandbox only. This document does not authorize production deployment, a commercial integration, scraping, a plan purchase, or a change to the live Trade Room.

## Executive determination

**Pokémon Price Tracker (PPT) could add bounded value, but it should not presently be added as a live valuation authority.** Its strongest prospective contribution is Pokémon-specific identity assistance: normalized catalogue fields, exact set/card-number candidate generation, printing/condition dimensions, and an API title parser. Its potential marginal contribution to sold-price evidence is narrower because its documented raw-card pricing is TCGplayer-oriented and its graded-card sales are eBay-derived—the same underlying markets that Tradebilia already treats as completed-sale evidence or secondary/contextual sources. [1] [2] [3]

**Recommendation:** place PPT in a **source-opportunity register** and run only a small, authenticated, non-commercial, sandbox evaluation after recording the applicable access right. During that evaluation, use it as `identity_reference_assist` and `supplemental_sold_context`; classify its aggregate prices, trends, liquidity fields, Cardmarket data, ROI/EV outputs, and population data as `guide_context` only. Do not let any PPT result alter a Tradebilia median, confidence score, trade verdict, UI, production data set, or user-visible recommendation. This preserves the current posture that completed sales are authoritative, active asks are contextual, and identity matching plus cross-source deduplication are more urgent than broad-feed expansion. [1] [2] [3]

> **Bottom line:** PPT is a plausible *identity and contextual-evidence enhancement*, not a solution to the sandbox’s principal problem of exact, independently deduplicated completed-sale comparables. Its use is conditional on rights, authenticated schema validation, direct transaction provenance, and duplicate control.

## Scope, evidence standard, and classification

This assessment uses **only the supplied research results and the two supplied Tradebilia sandbox documents**. Statements labeled **Documented finding** summarize those materials; statements labeled **Recommendation** are this report’s proposed controls and are not claims that a capability has been tested. No PPT account was created, API key obtained, plan purchased, authenticated endpoint called, or provider agreement reviewed for this assessment. Therefore, advertised fields, tier enforcement, response completeness, and contractual fit remain unverified in Tradebilia’s environment. [4] [5] [6]

| Classification | Meaning in this assessment | Tradebilia treatment |
|---|---|---|
| **Authoritative valuation evidence** | A completed sale or qualifying bid-supported auction under the existing evidence rule, with the required provenance and an exact-enough identity match. [1] [2] | May drive the authoritative median only after normal admission and deduplication. |
| **Supplemental sold context** | A PPT Business-tier eBay record that retains inspectable underlying transaction provenance and passes exact identity and duplicate controls. The provider’s own source role is not independent merely because it supplies a record. [3] [4] | May be shown or retained for audit; it must not create another count of an existing transaction. |
| **Identity-reference assist** | Catalogue/search/parser data used to generate or reconcile candidates, not to prove identity, authenticity, condition, or realized value. [3] [7] | Supports matching; conflicts and uncertainty remain review-only. |
| **Guide/context only** | Provider aggregate values, price-history points, active listing/seller counts, trends, Cardmarket values, population data, and active listings. PPT describes some histories as interpolated and raw fields can be market or listing-side metrics. [3] [8] | Never drives the authoritative median or overrides a completed sale. |

## Current Tradebilia hierarchy and the incremental fit

### Documented baseline

Tradebilia’s current sandbox treats completed sales as authoritative. A bid-supported auction is authoritative only when it ends within one hour; ordinary active listings are asking-price context and must not be treated as realized value. When authoritative evidence is absent, the analyzer marks verified valuation unavailable rather than manufacturing a verified number from asks. [1] [2]

For Pokémon/TCG, the sandbox already documents an eBay sold-comps path, 130point sales, PWCC/Fanatics sold context, PriceCharting as secondary guide/context, TC Gdex identification metadata, and certification routing. It identifies the required Pokémon identity dimensions as expansion/set, collector number and denominator, language, finish, promo/stamp, sealed state, raw-versus-graded state, grader, and grade. It also explicitly prioritizes transaction fingerprints and source deduplication across sold-data paths before adding new sources. [1]

### Comparison with PPT

| Tradebilia priority / rule | PPT’s documented potential | Assessment of incremental value | Required classification |
|---|---|---|---|
| **Exact Pokémon identity first** | PPT documents card IDs, `tcgPlayerId`, set IDs/names, card number, language, printing/variant, condition fields, and a title-parsing API that returns candidates and a confidence score. [3] [7] | **Meaningful potential value.** These fields could improve intake normalization and make wrong-match rejection more systematic, especially for English/Japanese twins, printing variants, and graded records. They do not independently prove an item’s physical identity. | `identity_reference_assist` |
| **Completed sales are authoritative** | PPT describes graded-card sales as eBay-derived and documents individual listing details only at Business/Enterprise. Its aggregate methodology is proprietary and includes filtering and, for sparse histories, interpolation. [3] [8] | **Conditional, limited incremental value.** A directly attributable, exact-grade eBay sale could be useful supplemental context. A PPT average, chart point, or market field cannot substitute for a primary completed-sale observation. | `supplemental_sold_context` only after admission |
| **Active asks are contextual** | The raw schema reportedly includes `low`, active listing count, and seller count, while price fields can be TCGplayer market-style metrics. [3] [8] | **Useful only as supply/context diagnostics.** Do not recast these fields as sold comparables or mix them into a realized-sale median. | `guide_context` |
| **Deduplicate overlapping feeds** | PPT states that it uses eBay, TCGplayer, and Cardmarket; the sandbox already recognizes overlap risk with eBay and PriceCharting. [1] [3] [8] | **High risk if unmanaged.** The same underlying eBay transaction can otherwise be counted via eBay, 130point, PriceCharting, PWCC/Fanatics mirrors, and PPT. The new feed may reduce confidence rather than improve it if it inflates count or narrows a median artificially. | Deduplicate before any statistics |
| **Certification/population supports context, not value proof** | PPT documents per-grader/grade signals and GemRate-sourced population fields, but says not every card has population data. [3] | **Contextual value only.** Population can inform a scarcity discussion after a grade is independently established; missing data must remain missing, not zero. | `guide_context` |
| **Identity and condition gates precede source expansion** | PPT supports raw/graded dimensions, named graders, grades, printings, and condition-specific data, while warning that a primary market field may use a lower available condition. [3] [8] | **Potentially helpful only after hard gates exist.** The provider does not remove the need to lock exact printing, condition, grade, qualifier, and sealed configuration. | Gate input, not a shortcut |

## What PPT can and cannot establish

### Documented strengths relevant to the sandbox

PPT publicly documents a Pokémon-specific API covering cards, sets, sealed products, population reports, exports, and title parsing. Its supplied research materials describe 50,000+ English and Japanese cards, daily updates, condition-specific historical pricing, printing-aware records, graded eBay sales, and a parser capable of extracting fields such as card name, set, card number, variant, grade/condition, and match confidence. [3] [7]

The provider’s published model distinguishes several useful data categories: standard raw-card pricing is described as TCGplayer data, graded-card data as eBay sales, Cardmarket EUR data as a beta paid feature, and population data as GemRate-sourced. This category separation is analytically better than an unlabeled single guide number **if** Tradebilia persists the source and semantics of each field. It does not demonstrate that all headline prices have one consistent formula or that a raw price is a completed-sale comparable. [3] [8]

PPT also documents per-grade sale counts, average values, grade-specific history, sales velocity, outlier flags, and—on Business plans—sold-listing fields such as listing ID, title, price, sold date, format, Best Offer status, and shipping. These fields could enable an audit-oriented adapter **only if the actual licensed response exposes stable underlying identifiers, canonical references, transaction status, and sufficient identity attributes.** The public materials do not prove that a Tradebilia subscription would receive all of those fields in a usable form. [3] [4] [6]

### Material limitations

PPT does not publish collection methods, source arrangements, source coverage, reconciliation rules, weights, raw completed-sale sample size, lookback windows, matching error rate, duplicate policy, or detailed outlier thresholds. Its public statements therefore support use as an estimated, source-labeled signal, not an independently auditable valuation calculation. [4] [8]

The provider says sparse historical observations may be interpolated. A continuous chart point is consequently not proof of a sale on that day unless the licensed schema separately identifies it as an observed transaction. [4] [8]

For raw cards, the supplied research identifies a specific semantic risk: a primary `marketPrice` or `lowPrice` may fall back to the best available lower condition. A comparison without the actual `conditionUsed` or explicit condition column can produce a false signal. Similarly, the bulk `cards` export supplies a primary printing, so print-level comparisons require the `printings` export and a composite identity key. [4]

PPT’s parser is fuzzy matching. It can aid candidate generation but cannot establish visual-only distinctions, first edition/unlimited status, language, finish, promo/stamp, sealed configuration, authenticity, exact grade/qualifier, certification number, or raw condition beyond supported signals. An exact set-plus-number confirmation is still necessary before a parser output can move beyond review. [5] [7]

## Provenance, identity, and duplicate-control requirements

### Recommendation: retain a field-level provenance tuple

Before any PPT value or observation is stored in the sandbox, retain this minimum record rather than a bare `price`:

```text
provider, provider_version/plan, provider_record_id,
underlying_venue, canonical_transaction_id, canonical_source_url,
capture_timestamp, price_timestamp/sale_date, status, price_semantics,
currency, shipping/tax/fees treatment, quantity/lot composition,
raw_title, title-match confidence, normalized identity,
language, set_id/set_name, collector_number/denominator,
printing/finish, promo_or_stamp, edition, raw_or_graded,
condition_or_grader, grade, qualifier/designation, certification_id,
source_field, interpolation_or_estimate flag, population-match confidence
```

This recommendation translates Tradebilia’s existing common-observation contract and its documented need for source, stable transaction/listing ID, sale status, price semantics, exact identity, condition text, dates, currency, and lot composition. [1]

### Recommendation: use a two-stage Pokémon identity gate

1. **Reconcile the offered item first.** Require Tradebilia’s Pokémon object to include set/expansion, collector number and denominator, language, finish/printing, promo/stamp, raw/graded state, sealed/single state, and, where applicable, grader, exact grade, qualifier, and certification identifier. The existing sandbox document identifies these as material gates. [1]
2. **Use PPT only to propose or enrich a candidate.** Accept a parser or catalogue candidate automatically only where expansion/set plus collector number agree exactly and no hard-field conflict exists. Treat name-only, set-only, low-confidence, multi-candidate, or incomplete candidates as review-only. [5] [7]
3. **Reject hard conflicts.** Language, finish/printing, promo/stamp, edition, raw/graded state, sealed configuration, grader, grade, qualifier, or explicit set/number conflicts should reject a comparable rather than widen a price pool. This is a recommendation implementing the sandbox’s stated priority for hard identity gates. [1]

### Recommendation: deduplicate at the underlying-transaction layer

For any PPT record described as an eBay sale, first join on its stable eBay listing/item/transaction identifier. When that is unavailable, use a conservative candidate fingerprint: normalized exact identity; raw/graded, grader/grade/qualifier; sale date; realized price and currency; seller/venue where permitted; lot composition; normalized title; and image/description similarity where lawful and available. Preserve the cluster link among PPT, direct eBay, 130point, PriceCharting, PWCC/Fanatics, and any other mirror. Ambiguous collisions must be excluded from unique-sale counts and medians while retained in an audit cohort. This approach directly addresses Tradebilia’s stated duplicate-control requirement and PPT’s documented eBay-source overlap. [1] [3] [5]

## Rights, access, and verification blockers

### Documented access position

The supplied terms research says PPT provides a documented bearer-token API; every request requires a registered key, and public visibility does not make the data anonymously accessible. The provider’s Terms prohibit scraping or data mining without written consent, and the research found that robots directives are not permission to extract data. Therefore, a public-page crawl or an unauthenticated `/api/` attempt is not an acceptable Tradebilia integration path. [5] [6]

The supplied materials say Free access is intended for non-revenue personal, hobby, academic, and pre-launch development/testing use; commercial use—including internal business analytics, advertising-, affiliate-, subscription-, sale-, e-commerce-, or commercial-AI-supported use—requires Business or Enterprise access. They also say standard tiers prohibit resale, syndication, bulk redistribution, and opening a third-party data feed, while allowing reasonable private caching to power the integrator’s own first-party application on the appropriate plan. [5] [6]

The research package identifies an internal public-plan inconsistency: the pricing page says “Commercial use license” for Free/API while the Terms, licensing page, and API documentation state that commercial use needs Business/Enterprise. The Terms identify the stricter rule as controlling if the summary conflicts. The correct operational response is to follow the stricter rule and obtain written confirmation; it is not to select the more favorable marketing phrase. [4] [5] [6]

### Unverified claims and blockers

| Claim or dependency | What the supplied evidence supports | What remains unverified / blocker | Required disposition |
|---|---|---|---|
| **Licensed access** | PPT documents registered Bearer-token access and tiered plans. [5] [6] | No Tradebilia account, API key, purchase, authenticated response, or active entitlement was tested. [6] | No requests until the rights register records an explicitly permitted sandbox use. |
| **Commercial/product display right** | Supplied terms say commercial use needs Business/Enterprise and first-party display/caching can be permitted on the correct plan. [5] [6] | Whether Tradebilia’s exact sandbox, future product, user display, caching period, and data retention model are approved is not confirmed in writing. | Obtain written confirmation before any commercial or user-facing use. |
| **Individual transaction-level evidence** | Business/Enterprise documentation describes individual eBay sold-listing detail. [3] [4] | Actual response fields, stable IDs, canonical URLs, sale semantics, and availability at the subscribed tier have not been inspected. [6] | Treat as non-valuation-eligible until schema tests pass. |
| **Underlying data rights and indemnity** | Provider discloses non-affiliation with named sources and does not disclose source arrangements; supplied review found no public partner agreement, SLA, DPA, or data-license template. [4] [5] | A subscription does not establish upstream marketplace, image, trademark, or database rights for Tradebilia’s exact workflow. | Pause white-label, partner, resale, feed, SDK, or broad media usage pending signed terms and counsel review. |
| **Price calculation quality** | PPT describes aggregation, condition handling, filtering, daily data, and interpolation. [4] [8] | Weights, lookbacks, raw-sale counts, match and duplicate rules, outlier criteria, and calculation quality are undisclosed. [4] [8] | Keep aggregates/histories contextual, never authoritative. |
| **All advertised graders and coverage** | The materials specifically name PSA, CGC, BGS, and SGC; marketing says nine graders. [3] | The other graders, their coverage, and operational response schema were not specifically confirmed. | Do not assume nine-grader coverage. Verify each needed grader in a licensed response. |
| **History retention / Cardmarket scope** | Published materials describe plan-dependent history, Cardmarket EUR beta fields, and daily bulk exports. [3] [4] | The public pages contain inconsistent history wording and do not prove the specific scope needed by Tradebilia. [4] | Obtain written clarification before relying on these features. |
| **PPT as independent market evidence** | PPT identifies eBay, TCGplayer, and Cardmarket among its sources. [3] [8] | No evidence establishes independence from Tradebilia’s existing eBay/PriceCharting/other underlying transaction set. | Default to overlap; deduplicate before statistics. |

## Phased sandbox-only recommendation

The following is a **recommendation**, not a statement that work is already authorized or implemented. Each phase remains isolated from the production Trade Room and must leave its current evidence hierarchy unchanged.

### Phase 0 — Governance gate (no data retrieval)

Create a provider-rights register entry with the public terms version, intended purpose, revenue/non-revenue status, planned data classes, retention/caching approach, user-display boundary, prohibited redistribution paths, owner, and renewal/review date. Record the plan inconsistency and the fact that Tradebilia has no written confirmation. Do not call PPT until this gate identifies an expressly allowed non-commercial sandbox evaluation. [5] [6]

**Exit criterion:** a documented non-commercial evaluation entitlement; no production traffic, public display, customer use, model training, crawling, bulk export, or third-party access.

### Phase 1 — Small identity/provenance experiment (authenticated; sandbox only)

If Phase 0 clears, submit a curated regression corpus of **20–30 internal test fixtures** through only documented, authenticated endpoints, one item at a time and below the applicable Free-tier limit. Do not scrape pages, enumerate the catalogue, use undocumented endpoints, invoke bulk export, or expose results to users. This bounded approach is consistent with the supplied guidance for pre-launch evaluation and with its warning that endpoints are authenticated and credit/rate limited. [5] [6]

The corpus should include deliberate collisions: English/Japanese twins; same-name cards with different set/number; holo/reverse/non-holo; promo/stamp; first-edition/unlimited; raw versus PSA/CGC/BGS/SGC grades; adjacent grade/qualifier; and sealed ETB/booster versus a single card. Store minimal evaluation output in the isolated sandbox with `non_authoritative` labels.

**Measure success by safety, not price uplift:** every accepted candidate should have required identity/provenance fields; every hard conflict should be rejected or quarantined; and any reported eBay ID should be clustered against already permitted evidence. A difference in displayed price is an offline diagnostic—not a trade recommendation.

### Phase 2 — Schema and duplicate-contract test (no valuation impact)

Inspect actual licensed responses only after Phase 1. Confirm whether individual eBay sale records contain the stable underlying transaction/listing ID, canonical source reference, sale date, sold/auction/BIN status, realized-price semantics, currency, shipping treatment, quantity/lot information, exact identity fields, raw/graded state, grader/grade/qualifier, and parser confidence. Fail closed if a material field is absent or ambiguously sourced.

Build an adapter test that proves it can (a) classify every field as provider aggregate, parsed listing, underlying venue observation, or inference; (b) generate a conservative transaction cluster; (c) suppress uncertain collisions from medians and unique-sale counts; and (d) leave all active asks, aggregates, populations, and interpolated history outside authoritative cohorts. The requirements are derived from Tradebilia’s common evidence contract and documented existing cross-source overlap. [1] [3] [8]

**Exit criterion:** a test report showing zero false-positive admissions within the collision corpus and an auditable duplicate cluster for every potential underlying eBay sale.

### Phase 3 — Offline shadow evaluation (still no live adapter)

Run the exact, deduplicated PPT results in a shadow cohort beside existing evidence. Do not change the deterministic fairness score, server median, confidence level, trade verdict, or user display. Compare only: candidate-identification recall, hard-conflict rejection, provenance completeness, duplicate rate, exact-cohort coverage, recency, and the number of genuinely new underlying completed sales. Tradebilia’s current workflow makes evidence completeness and comparable admission—not a larger count of source responses—the relevant success condition. [1] [2]

**Exit criterion:** measurable identity improvement or genuinely non-overlapping, provenance-complete transaction coverage without degradation in duplicate controls. If the result is merely another guide value or a mirror of existing eBay sales, retain no live-integration proposal.

### Phase 4 — Reassessment, not deployment

Only after Phases 0–3 should Tradebilia decide whether PPT merits a limited adapter proposal. A positive proposal must retain the classifications in this report: title/catalogue data as identity assistance, provider aggregates as context, and any eBay observations as supplemental context until they satisfy the existing authoritative sale contract. A separate commercial-rights decision, written provider clarification, security review for server-side keys, source-contract tests, and a production-readiness review would still be required before deployment. [1] [5] [6]

## Mandatory stop conditions

Stop the experiment, retain only a reason-coded audit record, and return **“insufficient exact evidence”** if any of the following occurs:

1. The intended activity is revenue-generating, internal-business, user-facing, advertiser- or affiliate-supported, or commercial-AI use without an active documented Business/Enterprise entitlement and written workflow confirmation. [5] [6]
2. The provider cannot confirm first-party Tradebilia caching/display rights, or the proposed design could be a partner feed, resale, syndication, white-label service, SDK, bulk data product, or substitute API. [5] [6]
3. The licensed schema lacks stable underlying IDs, canonical references, sale status/date, realized-price semantics, or the exact identity/condition fields needed for source-neutral deduplication.
4. A parser candidate lacks exact set-plus-number confirmation or conflicts on language, printing/finish, promo/stamp, edition, raw/graded state, sealed status, grader, grade, or qualifier. [1] [7]
5. An apparent sale clusters with an existing eBay-, 130point-, PriceCharting-, or PWCC/Fanatics-derived record and the collision cannot be resolved conservatively. [1] [3]
6. A value is interpolation-derived, aggregate/guide-only, population-only, stale, or an active ask but is presented as a completed sale. [3] [4] [8]
7. A request raises rights, rate-limit, data-quality, security, or retention concerns, or any false positive reaches a valuation-eligible cohort. [5] [6]

## Final answer

**Would Pokémon Price Tracker add value?** **Yes, conditionally—but primarily as a tightly controlled Pokémon identity and contextual-data layer, not as another broad price feed or a valuation authority.** Its documented catalogue granularity and title parser could help Tradebilia identify exact Pokémon candidates and flag material variants. Business-tier eBay records might eventually add supplemental sold context if the actual licensed schema preserves direct transaction provenance and survives strict cross-source deduplication. [3] [4] [7]

**Would it improve the analyzer today?** **Not through immediate integration.** Adding it now would create meaningful rights, semantics, provenance, and double-counting risk while the sandbox’s stated higher-priority work—hard Pokémon identity keys, condition/grade gating, a common observation contract, and transaction deduplication—remains the more direct path to reliable trade advice. [1] [4] [5]

**Recommended decision:** approve **only Phase 0 and, if rights permit, the small sandbox-only Phase 1 identity/provenance test**. Do not add PPT to the live valuation registry, completed-sale median, confidence calculation, or user interface unless later tests establish both contractual permission and a provenance-complete, deduplicated evidence path. In the meantime, preserve eBay completed sales as authoritative; treat active asks and PPT aggregate values as context; and prioritize exact identity matching and duplicate suppression.

## References

[1]: file:///home/ubuntu/tradebilia-isolated-development/TRADE_ANALYZER_SANDBOX_DEEP_DIVE.md "Tradebilia Sandbox Trade Analyzer: Deep-Dive Assessment"
[2]: file:///home/ubuntu/tradebilia-isolated-development/TRADE_ANALYZER_AI_DOCUMENTATION.md "Tradebilia Trade Analyzer: AI, Market Data, Questions, and Evaluation"
[3]: https://www.pokemonpricetracker.com/docs "Pokémon Price Tracker API Documentation"
[4]: https://www.pokemonpricetracker.com/licensing "Pokémon Price Tracker Licensing"
[5]: https://www.pokemonpricetracker.com/terms "Pokémon Price Tracker Terms of Service"
[6]: https://www.pokemonpricetracker.com/api-reference "Pokémon Price Tracker API Reference"
[7]: https://www.pokemonpricetracker.com/parse-title-api "Pokémon Price Tracker Parse Title API"
[8]: https://www.pokemonpricetracker.com/faq "Pokémon Price Tracker FAQ"
[9]: https://www.pokemonpricetracker.com/pricing "Pokémon Price Tracker Pricing"
[10]: https://www.pokemonpricetracker.com/pokemon-card-price-history "Pokémon Card Price History"
[11]: https://www.ebay.com/help/selling/selling-tools/product-research?id=4853 "eBay Product Research"
[12]: https://www.psacard.com/services/tradingcardgrading "PSA Trading Card Grading"
[13]: https://www.pokemon.com/us/pokemon-tcg/pokemon-cards "Pokémon Trading Card Database"

*Source note: The official API documentation, licensing page, and Terms of Service in references [3]–[5] were independently rechecked on 24 September 2026. No authenticated endpoint, paid plan, provider agreement, or production integration was tested. Other cited URLs were reviewed as supporting sources but should be revalidated at implementation time.*
