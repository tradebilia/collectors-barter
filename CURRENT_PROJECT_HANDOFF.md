# Current Project Handoff

## P0 remediation completed
The P0 remediation is completed and the project remains in the isolated development workspace. Do not apply migrations, seed scripts, destructive scripts, or production cutover actions from this workspace.

## P1 performance and maintainability
Continue source-only, reversible changes with focused tests, full regression checks, and diff hygiene. Preserve the existing custom database configuration and use a read-only database baseline before database-related work.

## Vintage Toys ranking and caps — October 30, 2026
Implemented the approved marketplace/eBay-only Vintage Toys ranking models for Action Figure / Doll, Board Game / Puzzle, Electronic Toy, LEGO, Model / Kit, Playset, Plush / Stuffed Toy, and Vehicle. Each comparable item type now receives a source-neutral relevance score from its available identity, product, format, condition, completeness, packaging, and age signals. Missing provider fields remain unknown and do not reduce the score. Score bands cap visual review at 8, 6, 4, 2, or 0 candidates; capped candidates remain context-only. Collection/Lot remains governed by the universal non-comparable restriction and receives no item-type ranking or visual analysis.

Validation passed: focused Vintage Toys and shared visual-filter tests 186/186; source-role/applicability/UI boundary tests 40/40; TypeScript; production build; preview health HTTP 200. The complete suite passed 344 files / 4 intentionally skipped and 1,869 tests / 7 skipped before two documentation bookkeeping checks were repaired. No database, migration, credential, provider, deployment, or domain changes.

## Autographs / Signed Item market-range workflow — October 30, 2026
Implemented the approved marketplace/eBay-only Autographs / Signed Item workflow as market-range research rather than exact visual matching. Structured searches now include signer, signed item type, autograph category, authentication company, and inscription when supplied. Signed Item candidates receive a source-neutral relevance score using signer (40), signed item type (30), authentication company (20), and inscription (10), then remain ranked context-only evidence with price metrics; no Signed Item candidate is sent to visual analysis. Collection/Lot remains universally non-comparable and is not allowed into this path. Grading/reference sources remain outside the marketplace/eBay filter contract.

Validation passed: focused visual-filter tests 169/169; TypeScript; production build; full deterministic suite 346 passed / 4 skipped files with 1,874 passed / 7 skipped tests; diff hygiene and safeguard audit passed. No database, migration, credential, provider, deployment, publishing, or domain changes.
