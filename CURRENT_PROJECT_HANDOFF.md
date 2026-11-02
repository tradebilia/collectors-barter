

## Shared identity-first marketplace queries — November 2, 2026
- Repair: Mercari and TCGplayer now use the same shared marketplace search definition as eBay and Sold-Comps instead of maintaining a separate keyword builder.
- Guard: every query keeps a meaningful item identity anchor from the required item title when structured metadata alone would produce a metadata-only query such as `1997 mint Blu-ray`.
- Guard: placeholder grades such as `0.00` are removed, and video-game cosmetic condition labels are not appended to the search query.
- Regression coverage: Hercules Blu-ray, coins, Disney Pins, video games, Pokémon, and cross-source query contracts were rechecked. Focused query tests passed 29/29; broader marketplace adapter tests passed 121/121; TypeScript and production build passed.
- P0 remediation completed: this change preserves the existing custom database, the read-only database baseline, one shared query definition, universal/item-type filters, one ranking score, visual-review safeguards, valuation disposition gates, and full-image `object-contain` rendering.
- P1 performance and maintainability: provider adapters now have one source-neutral query contract, reducing category drift and making future fallback behavior easier to audit.
- Do not apply migrations, seed data, or destructive scripts. No database writes, credentials, provider configuration, deployment, or publishing changes were made.
