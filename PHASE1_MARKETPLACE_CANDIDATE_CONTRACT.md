# Phase 1 — Shared Marketplace Candidate Contract

Date: November 1, 2026
Baseline: commit `2fc2377ea` / pre-phase checkpoint `2fc2377e`

## Purpose

Create one lossless, source-neutral candidate shape for marketplace and eBay results. The contract will carry the same candidate identity, evidence, image, ranking, analyzer, and valuation status through retrieval, filtering, ranking, visual review, and display.

This phase is a maintainability and transport repair. It does not change search queries, score weights, filter rules, visual caps, valuation admission, source applicability, or Collection/Lot behavior.

## Current project understanding

The project currently has several useful but separate records:

- `MarketSale` carries valuation-oriented sale and evidence fields.
- `VisualSourceCandidate` carries visual-filter input and image aliases.
- `annotateSoldComparableCandidate` adds sold-comparable disposition and evidence.
- eBay, Sold-Comps, Mercari, specialist sources, and custom searches each assemble overlapping records with different field names.
- Ranking fields such as `metadataMatchScore`, `metadataMatchRank`, and `metadataMatchReasons` are present only on some paths.
- Provider metadata may arrive under `itemSpecifics`, `item_specifics`, `aspects`, `specifics`, or provider-specific fields.

The repeated defects came from converting between these shapes too early or dropping fields during a later mapping step.

## Proposed contract

The shared contract is a transport contract, not a new scoring system. It contains:

### Identity and source

- `candidateId`: stable provider ID when available, otherwise a deterministic local key.
- `sourceId` and `sourceLabel`.
- `providerRecordId`, `url`, and `retrievalQuery`.
- `title` and `normalizedTitle`.
- `rawMetadata`: lossless provider metadata retained for later category-specific readers.
- `structuredMetadata`: normalized provider fields when they are explicitly available.
- `titleEvidence`: normalized facts inferred from the listing title; inference is labeled separately from structured evidence.

### Images

- `imageUrl`: primary browser-displayable HTTP(S) image, when available.
- `imageUrls`: ordered available images, deduplicated without cropping or rewriting.
- `imageAvailability`: `available`, `missing`, or `invalid`.

### Market information

- `price`, `currency`, `date`, `saleStatus`, `priceBasis`.
- `marketplace`, `originMarketplace`, `seller`, and `lotQuantity` where supplied.
- `buyerPremium`, `shipping`, and `tax` where supplied.

### Decision state

- `universalFilter`: `passed`, `blocked`, or `unknown` plus reasons.
- `itemTypeFilter`: `passed`, `blocked`, or `unknown` plus reasons.
- `ranking`: one score/rank object or `not_assigned` with a reason. No second ranking state is introduced.
- `visual`: requirement, review status, rationale, and audit data.
- `valuation`: `eligible`, `context_only`, `rejected`, or `not_evaluated` plus reasons.
- `disposition`: one final machine-readable status for display and audit.

## Invariants

1. Collection/Lot remains universally non-comparable. It receives no lookup, filter, ranking, or analyzer dispatch.
2. Grading and Reference sources remain outside marketplace ranking and marketplace filters.
3. Only one category/item-type ranking score and rank may be assigned to a comparable marketplace candidate.
4. Missing metadata remains unknown. It is not converted into a conflict.
5. Explicit contradictory metadata can block or lower eligibility according to the existing rules.
6. Cosmetic condition is never treated as functional condition or sealed status.
7. Candidate image transport is lossless. UI presentation continues to use `object-contain`.
8. A candidate's rank and score remain bound to that candidate through filtering, visual review, exclusion, and display.
9. Existing valuation gates and provenance safeguards remain authoritative.
10. Provider-specific fields are preserved even when the shared contract cannot interpret them yet.

## Migration order

### Phase 1A — Contract and unit coverage

- Add the shared type and conservative normalizer under `shared/`.
- Add tests for aliases, image preservation, missing values, stable identity, and decision-state preservation.
- Do not change provider behavior yet.

### Phase 1B — First source adapter

- Route eBay Active candidate construction through the contract.
- Preserve the existing response keys as compatibility aliases during migration.
- Verify image, title, metadata, score, rank, analyzer status, and exclusion reason survive every visible eBay section.

### Phase 1C — Additional marketplace adapters

- Migrate eBay Sold-Comps, Mercari, TCGplayer, and specialist marketplace result assembly one source at a time.
- Keep grading/reference paths separate.
- Add a source-specific regression before each adapter migration.

### Phase 1D — UI and audit surface

- Use the contract for the shared candidate row and status display.
- Show evidence source labels and one final disposition.
- Capture desktop and mobile screenshots after the UI migration.

## Validation gates

Each sub-phase must pass:

- Focused source and contract tests.
- Full visual-source and ranking regressions relevant to the migrated path.
- TypeScript validation.
- Production build.
- `git diff --check`.
- Safeguard and handoff tests.
- Manual screenshot review where UI changes are included.

No database writes, migrations, seed scripts, destructive scripts, credentials, provider configuration, deployment, or publishing changes are permitted in this phase.
