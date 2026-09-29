# Tradebilia Test AI — Analyzer 2.6 Implementation Charter

**Status:** Approved sandbox-only implementation

## Authorization and boundary

Rich approved implementation of the recommendations in the Analyzer Recommended Fix Deep Dive. This work is limited to the administrator-only Test AI trade-analysis sandbox.

The implementation must not change public marketplace pages, inventory records, item entry forms, trade negotiation, shipping, payment, email, provider credentials, external-source activation, database schema, database data, scheduled jobs, publishing, production domains, or customer media.

No migrations, seeders, destructive scripts, provider writes, notifications, payments, or database writes are authorized.

## Current development phase

The sandbox has completed broad identity-gate expansion, universal identity-state checks, evidence floors, user-summary work, and canonical cross-source duplicate suppression. The next phase is **evidence-integrity hardening**.

## Approved implementation stages

1. **Server-side eligibility normalization.** Reclassify every analysis sale with a structured fail-closed eligibility result. Missing or unsupported sale status, price basis, currency, price, or date cannot affect valuation, but remains auditable evidence.
2. **Parser recall repairs.** Correct high-value common marketplace formats without relaxing explicit-objective conflict gates.
3. **Visual-policy alignment.** Apply consistent graded/raw, review-state, and candidate-ID rules across Sold-Comps and marketplace visual review. Visual uncertainty remains non-destructive.
4. **Narrative resilience and data boundaries.** Return deterministic analysis when the LLM call fails and serialize external text as bounded, untrusted data.
5. **Valuation calibration.** Use robust, transparent statistics and stronger confidence explanations only after the evidence inputs are normalized.

## Non-goals for this implementation

This work does not move every provider retrieval call from the client to the server. Instead, it introduces a server-authoritative normalization and eligibility decision layer that does not trust the client’s classification defaults. A future architecture project may move provider orchestration server-side after all adapters share a compatible raw-evidence contract.

## Definition of done

The implementation is complete only when focused regressions cover eligibility, parser, visual, narrative-fallback, and valuation behavior; TypeScript and production build pass; runtime remains healthy; changed scope is limited to the Test AI analyzer and its tests; and a final sandbox audit records remaining limitations.

## References

[1]: /home/ubuntu/tradebilia-isolated-development/ANALYZER_RECOMMENDED_FIX_DEEP_DIVE_2026-09-28.md "Analyzer recommended fix deep dive"
[2]: /home/ubuntu/tradebilia-isolated-development/CURRENT_PROJECT_HANDOFF.md "Tradebilia development handoff"
[3]: /home/ubuntu/upload/Tradebilia_Analyzer_2.4_Independent_Review_for_Manus.md "Independent Analyzer 2.4 review"
