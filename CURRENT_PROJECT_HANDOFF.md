## P0 remediation completed

The current project’s P0 remediation is completed. The marketplace analyzer remains subject to the existing identity, evidence, source-boundary, privacy, and Collection/Lot safeguards.

## Migration and database safety

Do not apply migrations, seed scripts, destructive scripts, or production database writes from this development-only task. The existing custom database remains protected, and any database work requires the documented read-only database baseline and explicit approval gate.

## P1 performance and maintainability

P1 performance and maintainability work remains bounded by focused tests, TypeScript validation, production-build validation, and diff review. Provider-specific marketplace behavior must remain source-safe and must not weaken marketplace versus grading/reference boundaries.

## Standard marketplace search definition — October 31, 2026

Added one source-neutral category/item-type search definition used by eBay Active and Sold-Comps, with the same structured identity fields routed into 130point, Parse.bot auction searches, COMC, TheCardApi, and Hake’s. It covers category-specific fields for Sports Cards, Comics, Video Games, Movies, Autographs, Pokémon, Vintage Toys, Disney Pins, Stamps, Music, and Coins; Autographs retain their `autograph` designation and market-context-only behavior, while Original Art retains its similar-items market-range behavior. Existing provider-specific URL/API formatting and bounded fallback tiers remain intact where required by tested source contracts, including Goldin and HIPStamp. Collection/Lot and grading/reference source boundaries were not changed.

## Goldin specialist routing — October 31, 2026

Goldin’s compatible category queries now begin from the shared marketplace search definition for Autographs, Movies, and Coins. Goldin’s established provider-specific query policies remain intact for Sports Cards, Pokémon, Video Games, Comics, and Vintage Toys, including grading exclusions, comic signer fallback behavior, vintage-toy field restrictions, and bounded fallback queries. Added regression coverage for the shared Autographs designation and structured identity fields. Validation passed: Goldin specialist tests 41/41, TypeScript, production build, and diff checks. No database, migration, credential, provider configuration, deployment, or publishing changes.

## Remaining specialist routing — October 31, 2026
Completed the next specialist routing phase. Weiss, TCGplayer via ReefAPI, Comic Book Realm fallback search, Nate Sanders keyword search, and ComicConnect now begin from the shared category/item-type search definition while preserving their source-specific URL/API formats and bounded fallback behavior. Hake’s, LCG, and Goldin were confirmed already routed through the shared definition. Restored provider-specific safeguards for Parse.bot 130point and TheCardApi: structured identity fields are required, title-only fallback remains blocked, and TheCardApi’s tested identity-query formatting remains unchanged. Updated the source fingerprint manifest for the shared module and added Nate Sanders shared-query regression coverage. Validation passed: focused specialist/ComicConnect/Hake’s 63/63, repaired build-stamp/130point/TheCardApi contracts 20/20, TypeScript, production build, and diff checks. Full deterministic suite reached 345 passing / 4 skipped files with 1,898 passing / 7 skipped tests; one unrelated Hake’s live-adapter test timed out under the suite’s 5-second test limit, while the focused Hake’s suite passed 7/7. No database, migration, credential, provider configuration, deployment, or publishing changes.

## Custom source search controls — October 31, 2026
Added a responsive Custom Source Search panel to each Test AI item column. An administrator can choose any enabled eBay, marketplace, grading, or reference source and submit a separate text search without replacing the standard category/item-type query. The protected router procedure supports safe free-text dispatch for eBay Active, Mercari Sold-Comps, TCGplayer Sold-Comps, TCGdex, Wikidata, Smithsonian, IGDB, and RAWG. Sources that require structured identifiers or provider-specific contracts return an explicit unsupported message rather than receiving an incompatible query. Collection/Lot searches remain blocked universally; custom results are context-only and never bypass marketplace filters, grading/reference boundaries, or visual-analysis safeguards. Validation passed: focused source/UI/router tests 72/72, TypeScript, production build, and diff checks. No database, migration, credential, provider configuration, deployment, or publishing changes.
