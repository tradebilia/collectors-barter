

## Video Games graded-game ranking enhancement — November 7, 2026
Approved Video Games / individual game ranking now uses a 100-point weighting that distinguishes graded games from otherwise equivalent ungraded games: game title 25, platform 20, release year 15, region 10, edition 10, product form 5, grading company 5, grade 5, and UPC/EAN 5. Grading-company and grade points accept structured candidate fields and recognized title-derived evidence such as `PSA 9.8`; PSA/WATA equivalence uses the existing Video Games grader-family rule. Console and accessory score models were not changed. Missing grading fields remain neutral and do not create penalties or hard conflicts.

Validation passed: visual-source-filter **239/239**, TypeScript, production build, `git diff --check`, and protected-scope review. The build emitted only the existing bundle-size warning. No database writes, migrations, seeds, destructive scripts, credential output or changes, provider configuration changes, valuation-gate changes, deployment, publishing, or production-domain changes. All P0 safeguards remain in force.
