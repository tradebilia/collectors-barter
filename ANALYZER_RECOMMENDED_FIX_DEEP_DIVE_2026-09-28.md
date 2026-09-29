# Tradebilia Analyzer — Second-Pass Deep Dive and Recommended Fix Plan

**Date:** 2026-09-28  
**Scope:** Isolated Test AI sandbox and deterministic analyzer only  
**Baseline:** Analyzer 2.5 hardening checkpoint plus canonical cross-source deduplication checkpoint

## Executive conclusion

The analyzer is materially safer than the version reviewed by Claude, but the safest next step is **not another broad category-gate expansion**. The highest-value fix is to close the remaining **data-integrity and fail-closed gaps** at the boundary between marketplace retrieval, client normalization, and server valuation.

The recommended sequence is:

1. Make the server the sole authority for valuation evidence assembly.
2. Make eligibility fail closed when sale semantics are missing or ambiguous.
3. Finish the parser corrections that currently exclude valid evidence.
4. Make Sold-Comps visual review follow the same graded/raw and review-state policy as other marketplace paths.
5. Harden narrative failure handling and untrusted-text boundaries.
6. Upgrade valuation statistics and calibration only after the evidence pipeline is trustworthy.

This order matters. Improving the mean, range, or confidence score before fixing evidence provenance can make the analyzer appear more precise while still valuing the wrong records.

## Current project understanding

The project is a development-only WebDev workspace for Tradebilia. The Test AI route is administrator-protected and uses a deterministic server-side comparable engine. Marketplace adapters retrieve evidence, the client currently assembles historical-sale payloads, and the server builds analysis snapshots, market profiles, trade comparisons, and narrative context. The LLM is intended to explain the result, not determine the result.

The prescribed architecture documents `PROJECT_CONTEXT.md`, `AI_RULES.md`, `ROADMAP.md`, `NEXT_SESSION_PROMPT.md`, `DATABASE_SCHEMA.md`, `API_ARCHITECTURE.md`, and `KNOWN_ISSUES.md` are not present in the current workspace. `CURRENT_PROJECT_HANDOFF.md` is present and remains the available project handoff. The attempted all-remote refresh could not access the artifact-backed `origin` because it requested credentials; the authenticated `canonical` and `github` remotes were reached before the command stopped on `origin`.

## What is already fixed since Claude’s review

Claude reviewed checkpoint `4342a872`, not the current implementation. The following findings are now substantially addressed:

- Universal identity-state extraction for raw versus graded records.
- Grader and grade conflicts.
- Parallel and variant signals.
- Autograph signals.
- Lot and bundle conflicts.
- Negative listing signals such as reprint, proxy, case-break, damaged, altered, and restored.
- Category gates for Sports Cards, Pokémon, Comics, Coins, Stamps, Video Games, Music, Disney Pins, Vintage Toys, Autographs, and Movies.
- Subtype checks for toy forms and variants, autograph inscriptions, and movie media/poster/prop distinctions.
- A five-accepted-sale and evidence-quality floor before a definitive trade comparison.
- Range-first comparison rather than midpoint-only winner selection.
- Evidence disposition and reason transport through the analysis input.
- A server-built analysis snapshot used for profile, prompt, and UI output.
- Adaptive visual review beyond the first 20 candidates.
- Price and inline rationale display for visual-review rows.
- Canonical cross-source deduplication using normalized URLs and shared item IDs.
- Audit-ledger retention of duplicate and uncertain records.

These changes raise the analyzer well above Claude’s original 4.0/10 assessment. They do not yet justify treating it as an autonomous appraisal engine.

## Findings that remain material

### 1. The server does not yet fully own the evidence assembly

The client still normalizes provider payloads and sends the historical-sale array to the server. The server validates the shape, but it still accepts client-supplied identity-gate summaries and provider semantics.

This creates a trust-boundary problem:

- Retrieval-time disposition can differ from valuation-time disposition.
- A provider row can be re-created with a default status or price basis.
- Client-side caps can occur before the server sees the complete evidence set.
- A client can submit a material identity flag that the server did not independently derive.

The current schema now preserves `evidenceDisposition`, `evidenceReasons`, and visual fields. That is a meaningful improvement, but transport preservation is not the same as server authority.

**Recommended fix:** Create one server-owned `NormalizedMarketEvidence` contract. Each provider adapter should return raw provider data plus adapter provenance. The server should perform normalization, status classification, price-basis classification, identity comparison, deduplication, and valuation selection. The client should send only selected item identity, source-selection options, and optional user-entered cash terms.

**Acceptance tests:**

- A client-supplied `saleStatus: completed` cannot override an adapter record whose status is active or unknown.
- A warning-review record cannot re-enter valuation because the client omitted its disposition.
- A provider record with no known price basis is retained in the ledger but excluded from valuation.
- The same server snapshot is produced regardless of whether the client reorders or truncates provider rows.

### 2. Eligibility is still too permissive when sale semantics are absent

The current completed-sale candidate logic still allows a dated record to enter the candidate path when status and price basis are absent. A null currency is also effectively treated as USD in parts of the profile path. This is the most important remaining fail-open defect.

The safe rule should be:

- `saleStatus === completed` or an explicitly approved equivalent is required.
- `priceBasis` must be `realized`, `sold`, or an explicitly supported `closed` basis.
- Currency must be known and supported, or the record must be retained as context.
- A missing field is uncertainty, not permission to value.

**Recommended fix:** Change `isCompletedSaleCandidate` to return a structured eligibility result instead of a boolean. The result should include `eligible`, `disposition`, and reason codes. Unknown status, unknown price basis, unsupported currency, invalid date, and non-positive price should be retained with the appropriate non-valuation disposition.

**Acceptance tests:**

- Missing status and missing price basis never produce a supported valuation range.
- `closed` is accepted only when the adapter explicitly identifies a realized closed sale.
- EUR and GBP records remain visible in the ledger and are either converted through a documented rate or marked context-only.
- Null currency is not silently treated as USD.

### 3. Several parser fixes are still high-value and low-risk

The category gates are broader now, but common marketplace formats still need normalization. These bugs create false negatives: valid evidence is retained as review-only or disappears before the ledger.

Recommended parser corrections:

- Pokémon card numbers: support `4/102`, `004/102`, and equivalent fraction formats.
- Comics: support bare issue numbers when the title structure clearly identifies the issue, while excluding years and decimal grades.
- Coins: support `1c`, `1¢`, `one cent`, `penny`, `$1`, dollar, and denomination-specific wording without collapsing dollars into cents.
- Coins: support mint marks in `1932 S`, `1932S`, and hyphenated forms.
- Toys: add word boundaries so `car` does not match `carded`, `cardback`, or `shipping`; do the same for `ship` and `plane`.
- Toys: normalize `12-back`, `12 back`, `12back`, `20-back`, and similar release variants.
- Music: treat an absent pressing as unknown rather than as a conflict; only compare pressing details when a real pressing signal is present.
- Video games: recognize `CIB`, `complete in box`, `boxed`, and platform-specific packaging without requiring a literal word such as `game` or `cartridge`.

**Acceptance tests:** Every parser test should cover a positive match, an explicit conflict, and missing wording. Missing wording must produce review/context rather than a hard conflict or silent omission.

### 4. Sold-Comps visual review is still not fully aligned with the shared visual policy

The active-listing visual path treats graded-versus-raw packaging as mandatory. The Sold-Comps path has a different prompt and does not consistently apply the same packaging gate. The Sold-Comps schema also caps `candidateIndex` at 20 even though adaptive review can process later candidate windows.

Other limitations remain:

- `rough_match`, `unreadable`, and `not_reviewed` are not all translated into a uniform valuation disposition.
- Review-window limits must never be interpreted as visual clearance.
- Candidate titles are embedded in the model prompt without a strong structured data delimiter.

**Recommended fix:** Consolidate both visual paths on one shared `VisualIdentityReview` contract. Use a separate candidate ID rather than a positional index. Candidate IDs should remain stable across adaptive batches. Apply the same graded/raw, object-type, and uncertainty rules to active and Sold-Comps evidence.

**Acceptance tests:**

- Candidate 21 and later can be reviewed and transported without schema rejection.
- A graded target and raw candidate produce a visible warning/review or objective conflict according to the policy.
- An unreadable or unreviewed candidate never becomes a visually accepted candidate by default.
- Visual mismatch alone does not erase evidence unless an independently supported objective conflict exists.

### 5. Narrative provider failure still needs a deterministic fallback boundary

The main analyzer narrative call is still outside a complete provider-error `try/catch`. Malformed JSON has a fallback, but a provider exception can reject the mutation and prevent the user from seeing the deterministic result.

**Recommended fix:** Wrap only the narrative call and parsing path in a narrow error boundary. Always return:

- Server-computed profiles.
- Server-computed comparison and verdict.
- Evidence ledger.
- A clearly labeled narrative-unavailable message.

The fallback must not fabricate market claims. It should state that the deterministic result completed but narrative interpretation was unavailable.

**Acceptance tests:** Mock provider timeout, quota error, malformed JSON, empty content, and schema mismatch. All should return the deterministic analysis response with a narrative-unavailable flag.

### 6. Prompt and narrative safety needs a stronger contract

The current system has a basic untrusted-data instruction, but listing titles, RSS content, visual rationales, and provider text still enter the prompt as ordinary interpolated text. This is insufficient protection against prompt injection or unsupported narrative claims.

**Recommended fix:**

- Wrap every external string in explicit data delimiters.
- Length-limit titles, excerpts, rationales, and provider messages.
- Escape or serialize external values as JSON rather than interpolating prose.
- Validate narrative prices against server-approved values.
- Reject unsupported claims about rarity, authenticity, population, or market direction.
- Keep source references limited to the server-provided allow-list.

This should be treated as a safety and correctness issue, not merely a wording improvement.

### 7. Valuation statistics still need a second-stage hardening pass

The five-sale floor reduces the largest risk, but the underlying value estimator still has weaknesses:

- The range is still the observed minimum and maximum, not a statistically calibrated interval.
- The weighted mean can be misleading in bimodal markets.
- The small-sample quantile method is weak for three or four observations.
- Selection can be influenced by a price tie-break.
- Source concentration is exposed but does not fully gate a verdict.
- Confidence semantics are still mainly count-based.

**Recommended fix:** Defer this until the evidence pipeline is complete, then implement:

1. A proper quantile method.
2. Median or trimmed mean as the default center.
3. MAD filtering only when the sample is large enough.
4. A mixed-market or bimodal warning.
5. Source-diversity and recency inputs to confidence.
6. Price-neutral selection when comparable scores tie.
7. A materiality margin so a tiny difference is not presented as practically meaningful.

Do not change the estimator before adding fixtures that prove the new behavior is safer than the current behavior.

### 8. User summary needs stronger evidence labeling

The current Recommended Trade Summary is a useful improvement, but it can still overstate weak evidence through labels such as supported range or typical value.

Recommended UI changes:

- Display sale count, date window, source count, and most recent sale date.
- Rename the range to `Observed sale range (N sales)`.
- Rename typical value to `Median of N accepted sales` if the median becomes primary.
- Replace static evidence badges with dynamic evidence states.
- Put material identity conflicts and provider failures first in the limitations list.
- State that fees, shipping, authentication, and restoration are not included unless explicitly modeled.
- State what additional evidence would change the conclusion.

### 9. Benchmarking is still missing

No private, adjudicated benchmark currently proves that the analyzer accepts the right records, rejects the wrong records, or predicts useful ranges.

Recommended benchmark phases:

- Start with 50 manually adjudicated records per high-volume category rather than waiting for a 300–500 record corpus.
- Label exact, adjacent, conflict, duplicate, uncertain, and invalid-sale cases.
- Measure identity precision before recall.
- Add holdout sale coverage testing.
- Add historical trade verdict examples.
- Add invariance tests for row order, duplicates, capped selection, and added valid evidence.

Scale to 300–500 records per category only after the fixture format and adjudication process are stable.

### 10. Repository readiness remains incomplete

The full repository has had unrelated failing tests. They should be separated into a baseline report and then resolved before any production-readiness claim. The current project also has a snapshot-version inconsistency: the latest hardening checkpoint is labeled Analyzer 2.5 in the work history, while `ANALYZER_SNAPSHOT_VERSION` remains `2.4.0`.

**Recommended fix:** Increment the snapshot version only after the next coherent contract change, then update its focused tests and audit documentation together. Record a fresh full-suite baseline and do not describe the repository as fully green until all failures are accounted for.

## Recommended implementation sequence

### Phase 1 — Evidence integrity and fail-closed behavior

Implement server-owned normalization and structured eligibility results. This phase prevents wrong or incomplete provider semantics from entering valuation and ensures every rejected or deferred row remains visible.

### Phase 2 — Parser recall repairs

Fix Pokémon fractions, comic bare numbers, coin denominations and mint marks, toy boundaries and variants, music pressing semantics, and video-game object forms. These fixes improve recall without weakening objective conflict handling.

### Phase 3 — Unified visual review

Use stable candidate IDs, unify active and Sold-Comps visual contracts, apply the graded/raw gate everywhere, and preserve explicit unreviewed status beyond the review window.

### Phase 4 — Narrative safety and resilience

Add the LLM error boundary, structured data delimiters, output claim validation, and adversarial prompt tests.

### Phase 5 — Statistical calibration

Replace weak small-sample statistics, remove cap tie bias, add source-diversity confidence, and build a benchmark harness.

### Phase 6 — User summary and release cleanup

Improve evidence labels, surface limitations, update the snapshot version, and return the full repository to green.

## Overall assessment

The current analyzer should be described as a **strong administrative evidence organizer with deterministic valuation safeguards**, not as an autonomous appraisal authority. The most important improvement is to ensure that every valuation input is authoritative, complete enough to classify, and fail-closed when semantics are missing.

The safest next coding task is **Phase 1: server-owned evidence normalization plus structured fail-closed eligibility**. It addresses the highest-impact remaining risk and provides the foundation required for every later statistical, visual, and benchmark improvement.

## References

[1]: /home/ubuntu/upload/Tradebilia_Analyzer_2.4_Independent_Review_for_Manus.md "Claude independent Analyzer 2.4 review"
[2]: /home/ubuntu/tradebilia-isolated-development/CROSS_CATEGORY_EVIDENCE_POLICY_AUDIT_2026-09-27.md "Tradebilia cross-category evidence-policy audit"
[3]: /home/ubuntu/tradebilia-isolated-development/server/testAiComparableEngine.ts "Deterministic comparable engine and valuation profile"
[4]: /home/ubuntu/tradebilia-isolated-development/server/testAiIdentityState.ts "Universal identity-state extractor"
[5]: /home/ubuntu/tradebilia-isolated-development/server/testAiAnalysisSnapshot.ts "Server-side analysis snapshot and cash-aware trade terms"
[6]: /home/ubuntu/tradebilia-isolated-development/server/testAIRouter.ts "Test AI retrieval, analysis, and narrative router"
[7]: /home/ubuntu/tradebilia-isolated-development/server/testAiVisualSoldFilter.ts "Sold-Comps visual review contract"
