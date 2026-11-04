

## Disney Pins descriptive-title identity repair — November 4, 2026

Corrected the individual-pin identity gate so generic title words such as `Disney`, `Trading`, and `Pin` do not cause a false pin-name conflict. A target’s meaningful pin-name words must now be present in the candidate title, allowing descriptive catalog/event prefixes such as `2011 Walt Disney World Pin 84196 WDW` and `Disney Trading Pin -` while retaining hard conflicts for different names/characters and collection, lot, bundle, or mixed-group listings.

Added regressions for both screenshot-style candidates, a wrong-character candidate, and the retained collection/lot exclusion. Validation passed: visual-filter tests **208/208**, TypeScript, production build, diff check, and forbidden-path audit. No database, migration, seed, destructive, credential, provider, deployment, publishing, or domain changes were made.


## Disney Pins collection false-positive repair — November 4, 2026

Narrowed the shared Disney Pins lot gate so the marketplace word `collection` is not treated as proof of multiple items. Provider labels such as eBay `Collection/Lot` are now treated as ambiguous unless supported by an explicit quantity or stronger multi-item evidence. True lots remain context-only when the title or metadata states a lot, bundle, mixed group, multipack, collection lot, a quantity greater than one, or an explicit set quantity. Also corrected a year edge case so titles such as `2002 Pin` are not interpreted as two thousand two pins.

Added regressions for the screenshot-style single-pin titles `Disney Pin HKDL Eeyore Name Tag Mystery Collection` and `UK Disney Store Winnie the Pooh Eeyore and Piglet Christmas 2002 Pin E7`, while retaining the `Disney Pin Collection Lot of 5` exclusion. Validation passed: visual-filter tests **208/208**, TypeScript, production build, diff check, and protected-path audit. No database, migration, seed, destructive, credential, provider, deployment, publishing, or domain changes were made.
