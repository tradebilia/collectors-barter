# ComicConnect Analyzer Admission — 2026-10-01

## Scope

ComicConnect Sold Archive is an authorized, comics-only completed-sale source in the Test AI sandbox. This note records the transition from context-only display to deterministic analyzer admission for verified completed sales.

## Admission policy

A ComicConnect record may enter the analyzer only when all of the following are true:

- The record is identity-matched to the selected comic’s series/title and issue.
- Publisher, grade, and explicit comic identity gates do not produce a conflict.
- Publication-year evidence matches, including a candidate year range that contains the target year.
- The provider marks the record as completed/sold.
- The record has a valid positive USD price and a valid completed-sale date.
- The server attaches and verifies canonical provenance for the record.
- The record uses the `sold` price basis.

Records that fail identity or completion checks remain visible in the evidence review as mismatches/context. Records older than 36 months remain historical trend context rather than current-market valuation evidence.

## Buyer-premium treatment

ComicConnect’s buyer-premium inclusion is not assumed. The analyzer preserves this as `unknown` and does not silently gross-up or discount the sold amount. The source is admitted because the record is an explicit sold-archive amount rather than an auction `realized` amount requiring a confirmed premium treatment.

## Query and UI behavior

- ComicConnect uses its bounded query ladder and automatic title/issue search.
- Search queries remain visible in the sandbox.
- The Comics–ComicConnect Sold Archive test result is recorded as a confirmed match.
- The source button outline turns green for the confirmed match; selection fill behavior is unchanged.
- ComicConnect UI copy distinguishes current/extended valuation candidates from older historical context.

## Implementation areas

- `server/comicConnectMarketData.ts` — completed-sale flags, sold price basis, identity admission, and time-window behavior.
- `server/testAIRouter.ts` — server-side canonical provenance sealing for ComicConnect sales and context rows.
- `server/testAiCanonicalObservation.ts` — ComicConnect adapter contract and `sold` default price basis.
- `client/src/pages/TestAI.tsx` — transports ComicConnect sales into the analyzer and displays the updated policy.
- `shared/sandboxSpecialistSources.ts` — source metadata and valuation-candidate status.
- `server/comicConnectMarketData.test.ts` — completed-sale admission, identity, year-range, grade, and query regressions.
- `server/testAiSourceApplicabilityUi.test.ts` — confirmed green-outline source-result regression.

## Validation completed

- TypeScript: passed.
- Focused source-applicability tests: 15 passed.
- Full repository suite: 305 test files passed, 3 skipped; 1,263 tests passed, 6 skipped.
- Production build: passed; existing chunk-size warning remains informational.
- `git diff --check`: passed.
- No database writes, migrations, seeds, destructive scripts, secret changes, publication, or production-domain changes were performed.

## Backup and GitHub boundaries

The WebDev checkpoint is the project backup for the verified working state. GitHub stores source code and documentation only; secrets, database URLs, live database records, listing photos, avatars, and runtime object-storage contents are not committed.
