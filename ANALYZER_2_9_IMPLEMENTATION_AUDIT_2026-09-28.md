# Tradebilia Test AI — Analyzer 2.9 Implementation Audit

**Date:** 2026-09-28  
**Author:** Manus AI  
**Scope:** Isolated Test AI sandbox only. No database migration, production publishing, external marketplace activation, customer-data change, scheduled process, notification, payment, or domain change was made.

## Conclusion

Analyzer 2.9 implements the accepted GPT-5.6 Sol recommendations that could be safely completed inside the existing Test AI sandbox. The central result is a fail-closed valuation path: a browser may display a marketplace row, but it cannot make that row become valuation evidence. Only a short-lived, server-signed canonical observation from a registered completed-sale adapter can influence the deterministic value.

The analyzer now reports a **median primary value** from accepted completed sales, while retaining the recency-weighted calculation as a diagnostic. It makes duplicate certainty, marketplace concentration, unknown marketplace origin, visual-review requirements, buyer-premium uncertainty, outlier policy, typical middle band, and range overlap visible in the evidence ledger and collector-facing summary.

## What Changed

### Server-owned canonical observations

`server/testAiCanonicalObservation.ts` introduces a single canonical observation contract for valuation-bearing marketplace records. It records normalized price, currency, completed-sale status, status basis, price basis, source record identifier, normalized URL, origin marketplace, review state, auction economics, adapter version, policy version, acquisition time, query fingerprint, payload hash, and canonical transaction identifier.

The server signs each normalized observation with a short-lived HMAC reference. The analysis route verifies that reference before it rebuilds the market sale. A browser-provided source, price, currency, completion status, or price basis therefore cannot self-attest its way into a valuation. Expired, modified, missing, or unsigned observations remain in the audit but are classified as context only.

Seven valuation-bearing adapters are registered in the canonical contract: Sold-Comps, The Card API, Cardsight.ai, Lelands, Pristine Auction, PCGS Auction Prices Realized, and 130point. The adapter registry records the expected completed-sale semantics and price basis for each source. A missing provider fact is no longer turned into an admissible fact by a client-side or broad server fallback.

### Evidence admission and price economics

`server/testAiMarketEvidence.ts` is now the single server-owned admission boundary immediately before snapshot creation. To be valuation eligible, a record must have verified provenance, a positive price, an explicit USD currency, a completed status, a known sold/closed/realized price basis, a dated record inside the allowed recency policy, and an acceptable visual state.

Auction records with a realized price but an unknown buyer-premium inclusion are retained as context only. Records with unknown or non-USD currency are also retained without being converted to USD. This prevents mixed economic definitions from contaminating the deterministic value.

The analyzer allows a narrow 366–730 day **illiquid-market extension** only after a current-window verified sale is unavailable and only for designated scarce-market categories. The record is explicitly labeled as extended recency rather than silently treated as current evidence.

### Duplicate certainty and marketplace independence

The comparable engine now distinguishes three duplicate outcomes. Exact duplicates are suppressed from valuation. Documented probable duplicates are also suppressed. Possible duplicates remain visible and are not silently removed. Every decision is shown in the administrator evidence ledger.

The selection routine is price-invariant. A sale price cannot determine which otherwise comparable record is selected. It selects by identity quality, recency, source distribution, and stable identifiers rather than by a value that could skew the resulting estimate.

The market profile now counts independent **origin marketplaces** separately from sources. Records whose origin is unknown do not establish independence. They are counted and disclosed as unknown-marketplace records, and marketplace concentration is marked unavailable when they prevent a reliable concentration calculation.

### Visual-review policy

The visual-review contract now explicitly distinguishes a record that is not required to have image review from a record that is required to have image review. An image-bearing record outside a bounded review window is not treated as a silently accepted match. It is retained with the review-required state.

Sold-Comps now uses the shared adaptive review behavior rather than a fixed-window visual shortcut. The raw-versus-graded packaging gate is mandatory for sold comparable review, and visual mismatches, unreadable images, and not-yet-reviewed required images remain traceable without destroying the source record.

### Robust valuation and transparent trade comparison

The **primary deterministic value** is the median of accepted post-policy completed sales. The recency-weighted mean remains visible only as a diagnostic. This makes the primary value more resistant to a small number of high or low observations.

Outlier policy is explicit. With fewer than five selected completed sales, automatic IQR exclusion is not applied. With five to nine sales, suspicious tails are flagged but retained. Automatic IQR exclusion begins only at ten selected sales, and every exclusion remains visible in the ledger.

Trade comparison now reports the observed accepted-sale range, the typical middle band, raw-range overlap, typical-band overlap, median midpoint difference, and range gap. The collector summary uses the phrase **observed accepted-sale range** so it does not imply that active listings or unverified context are realized sales.

### Parser and architecture safeguards

The comparable parser received bounded recall improvements for bare comic issue formats and coin mint-mark formats. These changes preserve the evidence-retention policy: clear conflicts are blocked from valuation, while ambiguous records remain reviewable.

A new architecture-boundary regression ensures that Test AI does not invoke the generic market-data orchestrator as a second valuation engine. The Test AI route normalizes evidence server-side and creates an analysis snapshot through the canonical pipeline.

## User-visible Sandbox Result

In the Test AI user summary, a collector now sees the observed accepted-sale range, primary median value, typical middle band, confidence, and the number of direct completed sales used. The technical evidence section below it identifies the weighted diagnostic, independent marketplaces, unknown-marketplace records, outlier policy, duplicate certainty, and exact reasons a record was used, retained for review, or withheld from value.

> A valuation is now an explainable decision made from verified observations. It is not an average of whatever the browser happened to return.

## Validation

The Analyzer 2.9 focused regression suite passed **91 tests across 14 files**. The suite covers signed observation integrity and expiry, browser-spoof rejection, currency and price-basis admission, required visual review, raw-versus-graded conflicts, exact/probable/possible duplicates, price-invariant selection, marketplace independence, median-first valuation, outlier calibration, recency extension, parser recall, trade-range overlap, active-listing metric isolation, and UI audit terminology.

TypeScript validation passed. The production build passed. The development server returned HTTP 200. The build retains the existing chunk-size warning only.

The repository-wide suite now reports **9 unrelated pre-existing failures** and **1,163 passing tests** with 6 skipped. The failures are in homepage phrase/layout, Coming Soon, profile integration layout, owner interaction, review-before-shipping, responsive layout, and USPS screenshot contracts. Analyzer-owned failures found during this work were corrected before final validation.

## Residual Limits

This implementation does not activate permission-pending sources. Those sources remain outside the live valuation registry until written authorization, adapter-specific source validation, and a separate activation review are complete.

The canonical observation layer validates normalized provider facts and signed provenance. It does not replace future source-specific schema fixtures, live sample validation, or data-quality monitoring. Adapter version values are present in the evidence contract so future adapter upgrades can remain traceable.

The analyzer continues to preserve uncertain evidence in the ledger. It fails closed for value when a source cannot establish the facts required for an economically comparable completed sale.

## References

[1]: https://github.com/tradebilia/collectors-barter "Tradebilia collectors-barter repository"
[2]: https://platform.openai.com/docs "OpenAI platform documentation"
