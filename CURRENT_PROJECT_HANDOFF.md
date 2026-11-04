

## Disney Pins descriptive-title identity repair — November 4, 2026

Corrected the individual-pin identity gate so generic title words such as `Disney`, `Trading`, and `Pin` do not cause a false pin-name conflict. A target’s meaningful pin-name words must now be present in the candidate title, allowing descriptive catalog/event prefixes such as `2011 Walt Disney World Pin 84196 WDW` and `Disney Trading Pin -` while retaining hard conflicts for different names/characters and collection, lot, bundle, or mixed-group listings.

Added regressions for both screenshot-style candidates, a wrong-character candidate, and the retained collection/lot exclusion. Validation passed: visual-filter tests **208/208**, TypeScript, production build, diff check, and forbidden-path audit. No database, migration, seed, destructive, credential, provider, deployment, publishing, or domain changes were made.


## Disney Pins collection false-positive repair — November 4, 2026

Narrowed the shared Disney Pins lot gate so the marketplace word `collection` is not treated as proof of multiple items. Provider labels such as eBay `Collection/Lot` are now treated as ambiguous unless supported by an explicit quantity or stronger multi-item evidence. True lots remain context-only when the title or metadata states a lot, bundle, mixed group, multipack, collection lot, a quantity greater than one, or an explicit set quantity. Also corrected a year edge case so titles such as `2002 Pin` are not interpreted as two thousand two pins.

Added regressions for the screenshot-style single-pin titles `Disney Pin HKDL Eeyore Name Tag Mystery Collection` and `UK Disney Store Winnie the Pooh Eeyore and Piglet Christmas 2002 Pin E7`, while retaining the `Disney Pin Collection Lot of 5` exclusion. Validation passed: visual-filter tests **208/208**, TypeScript, production build, diff check, and protected-path audit. No database, migration, seed, destructive, credential, provider, deployment, publishing, or domain changes were made.


## Disney Pins shared pre-visual Collection/Lot label repair — November 4, 2026

Completed the end-to-end repair after authenticated preview verification showed that eBay’s broad `Collection/Lot` structured label still pushed a single named pin into the shared pre-visual holdout. The shared filter now ignores only that exact provider label for Disney single-pin targets, including the stored `single_pin` alias, while preserving explicit title evidence for lots, bundles, pairs, sets, quantities, and collection lots. The Disney identity gate applies the same narrow exception so both admission layers agree.

Added a full filter regression proving a single named pin with eBay `Collection/Lot` metadata reaches visual review, while an explicit `Set of 2` remains context-only. The Disney test correctly verifies the required two-pass visual adjudication. Validation passed: focused end-to-end regression **1/1**, full visual-filter suite **209/209**, marketplace/adapter/Sold-Comps regressions **127/127**, TypeScript, production build, diff check, and protected-path audit. No database, migration, seed, destructive, credential, provider, deployment, publishing, or domain changes were made.


## Centralized marketplace quantity parser repair — November 4, 2026

Fixed a router-level false positive that classified the Eeyore listing `Disney Sitting Eeyore Pooh 2008 Pin C4` as a 2,008-item lot because the old parser treated any number before `Pin` as a quantity. Added one shared marketplace quantity parser and reused it in the eBay/Sold-Comps pre-visual path and the shared visual filter. Four-digit release years from 1700–2099 are ignored as quantities, while explicit quantities such as `Set of 2 Pins`, `Collection Lot of 3`, and `3 Cars` remain protected as multi-item listings.

Added the exact Eeyore regression: the candidate remains eligible in `assessSoldCompsPreVisionCandidates`, while real multi-item titles remain excluded. Validation passed: Sold-Comps/router tests **61/61**, shared visual-filter tests **210/210**, TypeScript, production build, diff check, and forbidden-path audit. No database, migration, seed, destructive, credential, provider, deployment, publishing, or domain changes were made.


## Disney Pins exact-image adjudication fail-closed repair — November 4, 2026

The shared visual pipeline now treats the AI visual comparison as the authority for whether the target and candidate are the same specific pin. The Disney Pins instructions explicitly reject same-character, same-series, or shared-backing-card reasoning when the artwork, pose, silhouette, shape, edition, event/set design, or layout differs. The independent high-resolution Disney adjudication is mandatory for every apparent match.

Removed the unsafe admission fallback that allowed a complete initial Disney match to enter valuation when the independent retry failed or returned no usable decision. Those records remain visible as context/manual-review evidence with an explicit admission reason and cannot enter valuation. Added regression coverage for the unavailable-retry case and strengthened the prompt contract. Validation passed: shared visual-filter tests **210/210**, Sold-Comps tests **61/61**, TypeScript, production build, diff check, and protected-path audit. No database, migration, seed, destructive, credential, provider, deployment, publishing, or domain changes were made.
