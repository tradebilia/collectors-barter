
## Pokémon / Single Card field split — October 30, 2026
Updated the Pokémon Single Card inventory form so Year remains required and the former combined Finish / Variant field is replaced by separate required Finish and Card Type / Mechanic fields. The Single Card layout now displays both controls independently. Shared P0 identity evidence, metadata conflict handling, structured marketplace queries, active and Sold-Comps query construction, comparable checks, visual-query allowlists, normalized evidence, and Cardsight identity mapping recognize the new field names while retaining legacy aliases for older records. Collection/Lot safeguards and marketplace/eBay-only boundaries were not changed.

Validation passed: focused Pokémon field/identity/comparable/evidence tests 70/70; TypeScript; production build; diff check. No database, migration, credential, provider, deployment, publishing, or domain changes.
