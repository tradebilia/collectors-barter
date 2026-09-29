# Tradebilia Test AI — Analyzer 2.7–2.9 Implementation Charter

**Date:** September 28, 2026  
**Author:** Manus AI  
**Approval:** Rich approved implementation of the full GPT-5.6 Sol recommendation roadmap on September 28, 2026.  
**Scope:** The isolated development Test AI sandbox only. No production domain, database schema, inventory, trade, user, source activation, scheduler, notification, payment, or external-posting behavior is in scope.

## Project understanding and current phase

Tradebilia’s Test AI sandbox is a deterministic trade-analysis workspace. It must ingest completed-market evidence, preserve all uncertain evidence in an administrator-visible audit ledger, and calculate a reproducible market profile and range-first trade comparison. AI may assist visual identity review and narrative wording, but it must never create a sale, establish source trust, determine a price, or override an objective identity conflict.

The sandbox currently has category-specific identity gates, source-balanced intake, audit retention, visual-review provenance, exact canonical ID/URL deduplication, deterministic profiles, cash-aware range comparison, and a narrative fallback. The core remaining risk is the trust boundary: marketplace rows originate in server-side data-source procedures but are carried back to the analysis endpoint by the browser. Until the server verifies provenance for the precise observation that it values, a browser-provided label can still influence admission.

This implementation advances the current Analyzer 2.6 sandbox through three sequential releases. Each release is an internal code-and-test boundary, not a public deployment or source activation.

## Non-negotiable safeguards

The work must preserve the following rules.

1. No database write, migration, seed, deletion, scheduled job, notification, payment, social post, or provider-account action is permitted.
2. No new external marketplace source is activated. Existing sandbox sources remain read-only and permission-pending sources remain permission-pending.
3. Evidence is lossless. A row that cannot influence value remains visible with a deterministic disposition and reason.
4. No browser field can independently make an observation valuation-eligible.
5. Missing currency, unsupported currency, unknown status, unknown price basis, invalid record structure, and incompatible sale form fail closed into context/review evidence.
6. The deterministic profile and trade comparison remain reproducible when AI is disabled or unavailable.
7. Every behavior change receives focused regression coverage. A checkpoint and GitHub delivery occur only after validation and a final scope review.

## Analyzer 2.7 — provenance and evidence admission

Analyzer 2.7 will create a shared canonical-market-observation contract. It will include a server-generated provenance envelope with adapter identifier and version, origin marketplace, acquisition time, provider record ID, canonical URL, query fingerprint, and a payload hash. Observations returned by known read-only Test AI source procedures will carry a signed server-issued reference. The analysis route will verify that reference before trusting any valuation-bearing field.

The browser will continue to render marketplace data for the sandbox, but its returned sale rows will become display hints only. The analysis server will use verified canonical observation facts, not client-declared source status, currency, completion status, price basis, visual state, or disposition. This preserves the current UI while moving valuation trust behind a server-generated provenance contract.

Each known adapter will receive a strict, bounded input validator. Invalid or incomplete rows will become quarantined/context evidence with a source-specific reason. Currency will become nullable. Only explicitly recognized USD records may enter valuation until an auditable foreign-exchange policy is approved.

## Analyzer 2.8 — transaction identity and comparable economics

Analyzer 2.8 will add observation identity separately from canonical transaction identity. It will distinguish exact duplicates, probable duplicates, possible duplicates, and unique observations. Only exact and documented-probable duplicates may be automatically suppressed from direct valuation. Possible duplicates remain in the ledger for review.

The release will record the data adapter separately from the origin marketplace. Source diversity and concentration will be measured using independent marketplaces and canonical transactions rather than the number of aggregators. It will also add economically specific price-basis fields, buyer-premium/shipping/tax inclusion flags, sale form, lot quantity, and a separate visual-review requirement/result state.

## Analyzer 2.9 — statistical calibration and deterministic comparison

Analyzer 2.9 will use a robust primary central value, retaining recency-weighted mean as a diagnostic. It will make outlier treatment sample-size aware, remove price from intake tie-breaking, and make unsupported values null rather than zero. The profile will distinguish an observed accepted-sale range from a typical middle band and describe concentration, independence, price-basis compatibility, recency, identity quality, visual requirements, and dispersion through one deterministic evidence-sufficiency decision.

The final comparison will report overlap amount, overlap ratio, midpoint difference, and typical-band overlap. It will retain raw range values and avoid an opaque fairness score. Older sales may be used only through an explicit, clearly labeled illiquid-market extension policy and will not silently become current-market evidence.

## Implementation sequence

The work proceeds in this order because each later stage depends on the prior stage’s data contract.

1. Create canonical observation, provenance, source-registry, identity-evidence, certification, sale-form, price-basis, and visual-state contracts.
2. Update known marketplace procedures to issue validated server provenance and update the analysis route to accept only verified observations for value.
3. Extend audit ledger and source diagnostics with canonical transaction, duplicate state, adapter, origin marketplace, and detailed admission reasons.
4. Refactor comparable selection and profile statistics to use validated populations, independent marketplace controls, robust center/range calculations, and price-invariant ordering.
5. Add category identity modules incrementally while preserving the existing gate behavior under tests.
6. Add a version-controlled adversarial and calibration corpus. It must prove source spoofing, currency, price basis, visual requirement, duplicate, ordering, raw/graded, certification, lot form, and outlier behavior.
7. Validate source contracts, TypeScript, focused tests, full suite attribution, production build, isolated runtime health, diff hygiene, and side-effect absence. Then create a checkpoint and push the verified commit and documents.

## Acceptance criteria

The completed hardening pass is acceptable only when the following statements are true.

- An arbitrary browser row cannot become valuation-eligible by claiming a trusted source, completed status, price basis, or USD currency.
- Every valuation-eligible row carries valid server-established adapter provenance.
- Missing currency, unknown status, unknown price basis, invalid raw response, incompatible form, and failed required visual review are context/review evidence rather than silently deleted or valued.
- The same canonical observation set yields the same deterministic profile and trade comparison regardless of browser field order, arrival order, or AI availability.
- A duplicate sale reported by more than one adapter cannot receive multiple valuation votes.
- The profile clearly differentiates no supported value from a zero-dollar value.
- Every excluded or non-direct row remains visible in the administrator ledger with a deterministic reason.
- The full automated suite is either green or every remaining failure is independently reproduced, documented, and outside the changed analyzer scope.

## Documentation and references

This charter operationalizes the full recommendation-by-recommendation assessment in `GPT_5_6_SOL_RECOMMENDATION_ASSESSMENT_2026-09-28.md`. It preserves the sandbox-only boundary documented in `ANALYZER_2_6_IMPLEMENTATION_AUDIT_2026-09-28.md`.

## References

[1]: https://github.com/tradebilia/collectors-barter "Tradebilia collectors-barter source repository"
