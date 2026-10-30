

## Vintage Toys item-type filters — October 30, 2026

Implemented the approved marketplace/eBay-only Vintage Toys identity filters across the shared visual-source pipeline. Comparable item types now have conservative item-type and identity gates for Action Figure / Doll, Board Game / Puzzle, Electronic Toy, LEGO, Model / Kit, Playset, Plush / Stuffed Toy, and Vehicle. The filters compare only explicit candidate evidence such as names, brands, franchises, set numbers, years, packaging, completeness, working state, accessories, and related item-specific fields. Missing provider fields remain unknown and do not cause exclusion. Explicit mismatches are retained as context-only before visual review. Collection/Lot remains governed by the universal non-comparable restriction and does not receive item-type filtering or analysis.

Validation passed: focused Vintage Toys and shared visual-filter tests 176/176; source-role/applicability/UI boundary tests 40/40; TypeScript; production build; preview health HTTP 200; and full deterministic suite 346 files passed / 4 intentionally skipped, 1,861 tests passed / 7 skipped. No database, migration, credential, provider, deployment, or domain changes.
