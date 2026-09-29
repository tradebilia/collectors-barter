# Tradebilia Sandbox Trade Analyzer — Assessment of GPT-5.6 Sol Recommendations

**Date:** September 28, 2026  
**Author:** Manus AI  
**Scope:** The isolated, development-only Test AI sandbox. This assessment reviews the supplied GPT-5.6 Sol document against the current Analyzer 2.6 code. It makes **no code, database, source-activation, or deployment change**.

## Bottom line

I agree with the **core direction** of Sol’s review. Its most important finding is real and should be treated as the next implementation priority:

> The analyzer currently receives marketplace observations from the browser, then gives some of those observations trusted defaults based on client-carried labels. The server still applies the identity, recency, visual-mismatch, and valuation gates, but it does not yet establish the original provider provenance itself.

This is not a cosmetic architecture concern. A record with an arbitrary `sourceId`, `saleStatus: completed`, `priceBasis: sold`, and no currency can currently become valuation-eligible. In a read-only admin sandbox, that does not create a public exploit by itself, but it is still the wrong trust boundary for an analyzer intended to make defensible trade recommendations.

The code also confirms a second concrete defect: **a missing currency is currently converted to USD** in both client normalization and server admission. This must fail closed instead.

I therefore agree with Sol’s proposed release order, with one important adjustment: do **not** require an AI image match for every direct comparable. Vision is valuable as an identity safeguard, but missing, unreadable, or unavailable photos must not silently discard otherwise strong structured completed-sale evidence. The correct policy is to distinguish **not required**, **required but not completed**, **confirmed**, **mismatch**, and **unreadable**. Where visual review is required, the sale remains retained for review rather than being erased.

## Evidence checked in the current code

The following findings are from direct review of the isolated sandbox code and read-only diagnostics.

| Finding | Current behavior | Why it matters |
|---|---|---|
| Unknown source can self-attest | Five synthetic observations with unknown source IDs, `completed`, `sold`, recent dates, and no currency produced **5 authoritative sales**, a **medium** evidence label, and a weighted value of **$1,003**. | The source-admission policy is not truly fail-closed. |
| Missing currency defaults to USD | `knownCurrency()` returns `USD` when a currency is absent. The client has the same `sale?.currency ?? 'USD'` fallback. | An unknown financial unit can enter a USD valuation. |
| Client transports trust-bearing fields | The browser sends `sourceId`, `saleStatus`, `priceBasis`, currency, disposition, and visual status in `leftHistoricalTrendSales` / `rightHistoricalTrendSales`. | A browser-provided label can influence server normalization before a server adapter has established provenance. |
| Canonical deduplication is useful but incomplete | Current logic collapses identical canonical URLs or sale IDs across adapters. | It covers exact duplicates well, but cannot distinguish probable from merely possible duplicates and has no explicit transaction identity. |
| Source balancing is adapter-based, not marketplace-based | One strongest record per `sourceId` is reserved, then the remaining records are filled by quality and recency. | Two aggregators reporting the same eBay market are treated as different sources unless exact deduplication catches the transaction. |
| Price affects selection ties | The tie-breaker is identity score, then recency, then **higher price**. | The outcome variable can decide which evidence enters the valuation set. |
| Small-sample outlier policy is too aggressive | The current IQR rule removed an extreme record at **N=5**. | A rare legitimate sale can be removed before enough evidence exists to justify an automatic statistical judgment. |
| Sold-Comps visual review is bounded at 20 | The Sold-Comps path slices visual candidates to the first 20, while other marketplace visual review can adaptively continue up to 100 candidates. | Sold-Comps needs the same explicit visual-state model and, when warranted, adaptive coverage. |
| Unsupported range uses zero fields | An unsupported `marketRange` currently returns `low: 0` and `high: 0`. | Zero can be misread as a real value and should be replaced by `null` with an explicit unsupported state. |
| Generic orchestrator has separate statistics | The generic `MarketDataOrchestrator` calculates its own averages, confidence, and zero-filled missing values. | It can drift from the Analyzer’s stricter completed-sale policy if it is ever used as a valuation path. |

## Recommendation-by-recommendation assessment

### Analyzer 2.7 — provenance and admission hardening

| Sol recommendation | Assessment | Current status | Recommended response |
|---|---|---|---|
| 1. Move valuation-source acquisition fully behind the server | **Agree — highest priority.** | Not implemented. The client transports observations to `analyzeItems`. | The browser should send item identity, selected source IDs, and trade terms only. The server should invoke enabled adapters, validate their raw output, normalize observations, and stamp provenance. |
| 2. Stop trusting client-declared sale status and price basis | **Agree.** | Partially implemented. The server normalizer checks these fields, but unknown sources can still self-declare `completed` and `sold`. | Derive status and price basis only from a server-owned adapter contract and validated provider fields. |
| 3. Treat missing currency as unknown | **Agree — immediate P0 correction.** | Not implemented. Missing currency defaults to USD in the client and server. | Use `null` / `unknown`; preserve the record as context with “sale currency is unknown.” |
| 4. Authenticate source identity through provenance, not a string | **Agree.** | Not implemented. `sourceId` is a client-carried string. | Add a server-generated provenance envelope containing adapter ID/version, fetch time, provider record ID, canonical URL, query fingerprint, and payload hash. |
| 5. Use one canonical observation model | **Agree, with incremental delivery.** | Partial. `MarketSale` plus server normalization is a good start, but the generic standardized-sale model and Analyzer model differ. | Introduce a shared canonical observation contract first. Migrate adapters one at a time rather than rewriting the whole analyzer. |
| 6. Validate raw provider responses before normalization | **Agree.** | Partial and adapter-specific. Some adapters normalize permissively and use defaults. | Add a strict schema and fixtures for each live adapter. Invalid rows should enter the ledger as quarantined/context evidence, not disappear. |
| 7. Persist adapter, normalizer, and policy versions | **Agree.** | Partial. Snapshot version `2.6.0` exists, but per-observation adapter/normalizer/policy versions do not. | Add version fields to the provenance envelope and display them in the full audit ledger. |

### Analyzer 2.8 — transaction identity, market independence, and price semantics

| Sol recommendation | Assessment | Current status | Recommended response |
|---|---|---|---|
| 8. Improve cross-source transaction deduplication | **Agree.** | Partially implemented. Exact canonical URLs and exact sale IDs are deduplicated. | Add separate `observationId`, `canonicalTransactionId`, and duplicate statuses: exact, probable, possible, and unique. Collapse only exact/probable duplicates automatically. |
| 9. Separate data provider from origin marketplace | **Agree.** | Not implemented. Source balancing uses adapter/source IDs. | Store `sourceAdapter` and `originMarketplace`. Base diversity and concentration on the origin marketplace and canonical transaction, not on the number of aggregators. |
| 10. Make price basis economically comparable | **Agree — high priority.** | Partial. The system has broad `sold`, `closed`, and `realized` labels. Some adapters mention hammer pricing, but the contract cannot express buyer premium, shipping, tax, or accepted offer. | Use specific canonical price bases and inclusion flags. Do not mix hammer and buyer-premium-inclusive prices without a defensible conversion. |
| 11. Distinguish visual review not required from not performed | **Agree with modification.** | Partial. Current states include `match`, `rough_match`, `mismatch`, `unreadable`, and `not_reviewed`. | Add `visualRequirement: not_required | required` separately from `visualResult`. Do not blanket-block all unreviewed sales; require review only for documented high-risk identity cases. |

### Identity and sale-form work

| Sol recommendation | Assessment | Current status | Recommended response |
|---|---|---|---|
| 12. Make item identity structured and category-specific | **Agree.** | Partial. Category gates exist for all supported categories, but parsing and policy remain concentrated in one large comparable engine. | Gradually extract category parsers into modules that return explicit facts, unknowns, conflicts, and evidence origin. Keep the central engine focused on policy and selection. |
| 13. Preserve explicit, parsed/inferred, and missing identity states | **Agree.** | Partial. The code distinguishes many missing versus conflict cases, but it does not consistently store whether a fact was explicit provider data, parsed title text, or vision/OCR inference. | Add a field-evidence wrapper with `value`, `evidenceMethod`, and `source`. Structured provider fields should outrank parsed titles. |
| 14. Strengthen certification-number handling | **Agree.** | Partial. Certificate fields exist for autographs and some source adapters, but no consistent grader-specific validator/provenance rule exists. | Use certification IDs strongly only when structured or extracted by constrained grader-specific formats. Never treat an arbitrary long title number as a certificate. |
| 15. Treat lots, sets, collections, boxes, and cases as first-class forms | **Agree.** | Partial. Universal identity handling recognizes a lot/bundle, and some categories have form gates. | Replace the boolean with `saleForm` and `lotQuantity`. Extend fixtures across every category, especially stamps, toys, coins, comics, and autographs. |

### Analyzer 2.9 — valuation calibration and trade comparison

| Sol recommendation | Assessment | Current status | Recommended response |
|---|---|---|---|
| 16. Use median or weighted median as primary value | **Agree.** | Not implemented. `weightedValue` is a recency-weighted mean; median is secondary. | Make median or deterministic weighted median the primary displayed center. Keep the weighted mean as a diagnostic and flag material disagreement. |
| 17. Make outlier treatment sample-size aware | **Agree.** | Not implemented. IQR currently operates at N=5. | Use no automatic statistical deletion below five records. At N=5–9, flag suspicious observations for review. Use robust filtering only with a documented larger-sample policy. |
| 18. Remove sale price from selection tie breaking | **Agree — straightforward correction.** | Not implemented. Higher price is the final selection tie-breaker. | Use stable canonical transaction ID after identity score, recency, source quality, and visual completeness. Add price-invariance tests. |
| 19. Add source/marketplace concentration controls | **Agree.** | Partial. Source-balanced reservation exists, but no cap or concentration diagnostic exists. | Add independent marketplace count, largest marketplace share, and a cap that applies only when there are multiple independent marketplaces. |
| 20. Rename and enrich the market range | **Agree.** | Partial. The system exposes min/max, median, IQR, and a weighted value, but calls min/max the market range. | Label it **Observed Accepted Sale Range**. Add a middle-50% typical band when sample size permits. |
| 21. Replace fixed sale-count certainty with an evidence-sufficiency gate | **Agree.** | Partial. Five sales are required for a definitive verdict and the profile also checks spread/identity. | Keep the count floor, but add independence, price-basis compatibility, recency, visual requirement state, and structured identity completeness to one deterministic sufficiency decision. |
| 22. Use dynamic recency windows for illiquid collectibles | **Agree with a conservative policy.** | Not implemented. Sales older than 365 days are context only. | Use 0–365 days first. Permit 366–730 days only when current evidence is insufficient, the category is demonstrably illiquid, and the UI clearly marks the extended window. Never silently mix it into a “current” valuation. |
| 23. Keep contextual aggregates separate from valuation | **Agree.** | Mostly implemented. Aggregate medians do not create a verified value. | Preserve this separation, but prevent unsupported fields from looking numeric in every result type and UI path. |
| 24. Do not use zero as a missing-value sentinel | **Agree — targeted correction.** | Not implemented. Unsupported market ranges use zero low/high fields. | Change unsupported low/mid/high to `null`, keep `supported: false`, and add arithmetic guards. |
| 25. Improve final comparison beyond simple min/max overlap | **Agree.** | Partial. The analyzer has overlap band, range gap, midpoint difference, and cash-adjusted range checks. | Add overlap amount/ratio and typical-band overlap. Use documented “narrow” versus “substantial” language only if backed by explicit thresholds. |

### Engineering and validation recommendations

| Sol recommendation | Assessment | Current status | Recommended response |
|---|---|---|---|
| 26. Keep generic orchestrator from becoming a second valuation engine | **Agree.** | Not implemented. The generic orchestrator calculates separate averages, confidence, and zero-filled missing values. | Restrict it to acquisition or migrate it to emit canonical observations into the same Analyzer admission and profile pipeline. |
| 27. Run statistics only on validated populations | **Agree.** | Partial. The Analyzer profile uses selected direct comparables, but the generic orchestrator has separate validation/count risks. | Create `validSales` once per path and use it for all counts, percentiles, medians, and confidence measures. |
| 28. Add adversarial and invariance tests | **Strongly agree.** | Partial. Many good identity, duplicate, raw/graded, and visual tests exist. Missing tests include spoofed source identity, absent currency, price-basis incompatibility, required-visual state, shuffled order, and price-invariance selection. | Build these tests as the acceptance criteria for Analyzer 2.7–2.9. |
| 29. Build a benchmark/calibration corpus | **Agree.** | Not implemented. | Create version-controlled, credential-free fixtures spanning each category and known-good/known-bad evidence outcomes. Use it before changing gates or parser rules. |
| 30. Keep AI outside deterministic valuation | **Agree, and it is substantially implemented.** | Mostly implemented. AI is used for vision/OCR assistance and narration; deterministic profiles, ranges, and fallback narratives remain server-computed. | Preserve this policy. The new provenance boundary must also ensure that AI cannot establish a trusted sale, completion status, price basis, or source identity. |

## Where Sol is correct, but the implementation needs a Tradebilia-specific adjustment

### Visual review must remain lossless

Sol correctly distinguishes visual review that is **not required** from review that was **required but not performed**. I agree with that distinction. I do not agree with a blanket rule that every direct comparable must have a positive AI visual confirmation.

Tradebilia’s stated policy is to avoid silently deleting valid-looking evidence. Many legitimate sold records have no usable photo, a tiny thumbnail, a cropped slab, or source-side image restrictions. A proper visual state model should therefore do this:

1. Mark a visual review as **not required** when structured identity is sufficient and no high-risk ambiguity is present.
2. Mark it **required** for known risk cases such as raw-versus-graded ambiguity, an explicit variant/printing conflict, different object forms, or weak/missing critical identifiers.
3. Treat **confirmed** and a high-confidence **mismatch** differently. A mismatch becomes review evidence and cannot enter direct value. A lack of review becomes context/review only when review was required.
4. Preserve every non-valued record in the ledger with the exact reason.

That preserves the reliability benefit of visual review without turning model availability or image quality into a silent recall failure.

### Code organization should follow behavior hardening, not precede it

Sol’s proposed module structure is a sound destination. A wholesale folder rewrite now would create regression risk while the more important provenance bugs remain unresolved. The best route is to introduce the canonical observation contract and adapter registry first, then extract one category parser and one adapter at a time behind stable regression fixtures.

## Recommended implementation order

### First: Analyzer 2.7 — harden provenance and admission

This is the next work item I recommend implementing. It resolves the two defects proven by diagnostic: client-controlled source trust and missing currency defaulting to USD.

The release should create a server-side adapter registry. Each adapter must declare its identifier, version, supported categories, allowed currencies, raw-response validator, completion-status mapping, and price-basis mapping. The browser should submit source selections, not source observations. The server should fetch or reuse a server-owned source result, normalize it into a canonical observation, and assign the provenance envelope before the evidence gate runs.

The definition of done should include the following tests: an unknown client source cannot affect a valuation; spoofing `sold_comps` in the request cannot acquire trust; a missing currency is context only; an unsupported price basis is context only; and all excluded records remain visible in the audit ledger.

### Second: Analyzer 2.8 — transaction identity and comparable economics

This release should add observation identity, canonical transaction identity, provider-versus-origin-marketplace fields, duplicate certainty, and specific price basis. It should keep exact and probable duplicates out of direct value while retaining possible duplicates for manual review. It should measure marketplace concentration rather than merely counting source adapters.

At the same time, it should remove price from selection tie-breaking and replace the boolean lot flag with a category-aware sale-form contract.

### Third: Analyzer 2.9 — calibrated statistics and evidence sufficiency

This release should make median or weighted median the primary valuation center, make outlier policy sample-size aware, add observed-range and typical-band diagnostics, and introduce dynamic recency only for clearly labeled illiquid-market use cases. It should replace the current scattered count/spread logic with a single deterministic evidence-sufficiency decision that includes direct-match count, identity readiness, market independence, recency, price-basis compatibility, visual requirement state, and dispersion.

## Revised assessment of the current sandbox

The Analyzer 2.6 core remains strong in several areas. It has category-specific gates, audit retention, explicit context versus direct evidence, raw-versus-graded protection, deterministic profiles, canonical exact-duplicate suppression, IQR visibility, range-first trade conclusions, and an AI narrative fallback.

However, the two demonstrated provenance defects are material enough that I would **not treat the prior 91/100 A- grade as the final trust grade**. That score accurately reflected the quality of the deterministic engine and auditability after the Analyzer 2.6 pass, but it overstated the strength of the source-admission boundary.

My honest current assessment is:

- **Deterministic identity, ledger, and explainability:** 91/100.
- **Current end-to-end valuation-trust boundary:** 84/100, because the browser can still transport trust-bearing source assertions and missing currency defaults to USD.
- **Overall current sandbox trade-analyzer grade:** **86/100 (B+)** until Analyzer 2.7 is completed and the adversarial provenance tests pass.

This is not a statement that the sandbox is unreliable in ordinary use. The regular UI selects known sources and the server applies substantial filtering. It means the architecture should not yet be described as fully fail-closed against malformed, spoofed, or accidentally misnormalized source observations.

## Final recommendation

Proceed with **Analyzer 2.7 only** before adding more data sources or further tuning valuation thresholds. It fixes the largest remaining trust problem without changing inventory data, production behavior, or marketplace activation. Once the server owns provenance, the Analyzer can safely expand through the permission-pending source registry without allowing every new adapter to invent its own valuation semantics.

## References

[1]: https://github.com/tradebilia/collectors-barter "Tradebilia collectors-barter source repository"
