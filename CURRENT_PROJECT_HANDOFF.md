

## Clean-start source coverage whitelist corrected — November 4, 2026

Corrected the prior over-broad change. Historical `SOURCE_TEST_RESULTS` entries remain preserved for auditability, but `SOURCE_COVERAGE_CONFIRMED_MATCHES` now strictly allows only these three Movie paths into the Current matching column: `movies:ebay_active`, `movies:sold_comps`, and `movies:mercari_sold_comps`. Every other category/source pair is Pending until separately retested. The global reset flag is not used; the clean-start whitelist itself enforces the intended state.

Validation passed: source applicability UI tests **38/38**, TypeScript, production build, whitelist audit, reset-reference audit, diff check, and forbidden-path audit. No database, migration, seed, destructive, credential, provider, deployment, publishing, or domain changes were made.
