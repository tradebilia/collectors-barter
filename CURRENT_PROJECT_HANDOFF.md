

## Ungraded movie query refinement — November 2, 2026
For Movies, cosmetic condition is no longer appended to the shared marketplace search query when the item is ungraded. This prevents terms such as `mint`, `new`, or `excellent` from narrowing the Hercules Blu-ray search instead of identifying the movie. Movie identity and format remain in the primary query, and the existing title-first fallback sequence remains unchanged. Graded categories and non-movie category behavior remain preserved. Movie-query, fallback, marketplace, and UI regressions passed 126/126; TypeScript and diff hygiene passed. No database, migration, seed, destructive, credential, provider, deployment, or publishing changes were made.
