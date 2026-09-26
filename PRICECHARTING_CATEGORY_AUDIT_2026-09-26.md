# PriceCharting / Parse.bot Category Capability Audit

Date: 2026-09-26

## Finding

The current Tradebilia sandbox is correctly limited to Pokémon card lookups. `server/parseMarketData.ts` calls only:

- `search_pokemon_cards`
- `get_card_detail`

The current UI, applicability rules, and query enablement all restrict this source to `pokemon`.

## Additional capability exposed by the current Parse.bot PriceCharting API

The current Parse.bot page lists 14 structured endpoints under scraper ID `bbbbdc36-6d99-4a7a-8115-cf766b2497e3`:

1. **US coins** — `list_coin_sets`, `get_coin_set`, `search_coins`, and `get_coin_detail`. The documented fields include set/coin identity, release date, mintage, and prices for ungraded, VF, AU, MS62, MS64, and MS66.
2. **Video games** — `lookup_video_game_by_upc`. This is barcode/UPC lookup, not a general title search endpoint. It returns title, platform, slugs, PriceCharting ID, and associated UPCs.
3. **Other TCG products** — `get_card_detail` and `get_pokemon_card_set` are documented as accepting Pokémon and other TCG sets such as Riftbound when the correct set/card slugs are already known. The page does not document a general non-Pokémon card search endpoint.
4. **Cross-category market intelligence** — `get_big_movers` covers games, cards, and coins. It returns market movers and is contextual market intelligence, not an item-specific comparable lookup.
5. **Pokémon-specific coverage** — search, sets, batch sets, sold listings, price history, trending cards, and current grade prices remain the deepest and most directly searchable part of this API.

## Categories shown on the PriceCharting website but not exposed as a complete searchable Parse.bot adapter

PriceCharting’s public website also shows video games, comics, Funko Pops, LEGO sets, Pokémon cards, coins, and sports cards through its broader site ecosystem. The current Parse.bot PriceCharting endpoint page does **not** document complete item-search/detail endpoints for comics, Funko Pops, LEGO, or sports cards. Those should not be treated as supported by this sandbox source without a separate verified endpoint contract.

## Tradebilia fit

- **Highest-value next addition:** US coins. Tradebilia currently has a Coins category and PCGS coverage; PriceCharting would add non-certification price-guide context and standardized grade buckets. It must remain separate from PCGS APR completed-sale evidence.
- **Second:** video games by UPC, but it needs a UPC field or a visual/barcode extraction step. The endpoint does not support a normal title-only query.
- **Conditional:** other TCG sets, only after verifying slug discovery and exact set/card identity. Do not broaden the source to all card categories based only on the website’s navigation.
- **Context only:** big movers and trending data. These can inform market conditions but should not create item-level valuation evidence.

## Sources

- Parse.bot PriceCharting API: https://parse.bot/marketplace/dbe920d4-a96a-4ef2-a2ce-70111d203a1a/pricecharting-com-api
- Official PriceCharting API documentation: https://www.pricecharting.com/api-documentation
- PriceCharting category directory: https://www.pricecharting.com/
- PriceCharting video-game category: https://www.pricecharting.com/category/video-games
