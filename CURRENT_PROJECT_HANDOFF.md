

## Weiss Autographs signed-object gate repaired — November 4, 2026

The Weiss specialist mapper now applies the shared `autographMarketExclusionReason` gate using the canonical `buildVisualTargetMetadata` contract before a completed lot can enter `sales`. A Weiss lot that says `Photo`, `Photograph`, `Photos`, or `Pictures` is therefore retained as context-only when the target is a signed baseball; it has `identityMatched: false`, `valuationEligible: false`, and cannot affect valuation. The shared object vocabulary now recognizes singular and plural photo wording across marketplace sources.

Added a Barry Bonds regression proving a completed `Barry Bonds Autographed Baseball Photos` lot is not admitted for a `Barry Bonds signed baseball` target. Weiss specialist tests passed **44/44**, shared Autographs visual-filter tests passed **205/205**, TypeScript passed, production build passed, and `git diff --check` passed. No database, migration, seed, destructive, credential, provider, deployment, or publishing changes were made. P0 safeguard markers and database protections remain unchanged.
