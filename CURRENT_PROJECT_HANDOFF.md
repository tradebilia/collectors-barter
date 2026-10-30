
## Pokémon item-type filters — October 30, 2026
Implemented marketplace/eBay-only Pokémon identity filters for Single Card, Set, and Unopened Product. Single Card checks card name, set, card number, language, finish, Card Type / Mechanic, rarity, and edition/era. Set checks set identity, language, set status, and card count. Unopened Product checks product identity, set, product type, language, year, seal state, authentication, authentication company, and sealed-case/FASC status. Missing provider fields remain unknown and eligible; explicit contradictions remain context-only before visual review. Collection/Lot remains universally blocked from lookup, ranking, visual analysis, and trade analysis.

Added source-neutral Pokémon relevance scoring with 100-point models and the existing 8/6/4/2/0 visual-review cap bands for comparable item types. Focused visual-filter tests passed 172/172, TypeScript passed, production build passed, and diff checks passed. No database, migration, credential, provider, deployment, publishing, or domain changes.

## P0 remediation completed — preserved migration safeguards
The P0 remediation completed record remains active for this development project. Do not apply migrations, seed scripts, destructive scripts, or production writes. Any future work involving the existing custom database must begin with a read-only database baseline and an explicit approval gate. P1 performance and maintainability work remains separate from the migration decision and does not authorize creating a replacement project.
