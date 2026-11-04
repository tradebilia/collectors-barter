

## Disney Pins descriptive-title identity repair — November 4, 2026

Corrected the individual-pin identity gate so generic title words such as `Disney`, `Trading`, and `Pin` do not cause a false pin-name conflict. A target’s meaningful pin-name words must now be present in the candidate title, allowing descriptive catalog/event prefixes such as `2011 Walt Disney World Pin 84196 WDW` and `Disney Trading Pin -` while retaining hard conflicts for different names/characters and collection, lot, bundle, or mixed-group listings.

Added regressions for both screenshot-style candidates, a wrong-character candidate, and the retained collection/lot exclusion. Validation passed: visual-filter tests **208/208**, TypeScript, production build, diff check, and forbidden-path audit. No database, migration, seed, destructive, credential, provider, deployment, publishing, or domain changes were made.
