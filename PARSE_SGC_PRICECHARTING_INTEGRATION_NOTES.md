# Parse SGC and PriceCharting Integration Notes

## SGC certification lookup

Parse's public `gosgc.com` marketplace API exposes a single `POST search_cert` endpoint. It uses scraper ID `f63ad1cb-5b08-4e33-9ea8-573b416e936d`, authenticates through `X-API-Key`, and accepts a `cert_code` JSON field. The documented SGC code formats are seven digits for black labels and `XXXXXXX-XXX` for green or white labels. The structured response includes the card subject, card set, card number, grade, grade designation, population, higher-population count, sport, and grade date. Calls are read-only and consume Parse credits only upon success.

Source: <https://parse.bot/marketplace/99921454-a3e3-4a22-b688-835a51dff11e/gosgc-com-api>

## PriceCharting market pricing

Parse's public `pricecharting.com` marketplace API uses scraper ID `bbbbdc36-6d99-4a7a-8115-cf766b2497e3` and `X-API-Key` authentication. For Test AI, use its two-step Pokémon flow: `GET search_pokemon_cards?query=...` returns matching cards with `set_slug` and `card_slug`; `GET get_card_detail?set_slug=...&card_slug=...` returns grade-level prices and card metadata. The API also provides card sold listings and history, plus dedicated US coin search/detail endpoints. It is a managed Parse wrapper rather than PriceCharting's official API.

Source: <https://parse.bot/marketplace/dbe920d4-a96a-4ef2-a2ce-70111d203a1a/pricecharting-com-api>

## 130point completed sales

Parse's public `130point.com` marketplace API uses scraper ID `28d873f5-47d5-4c01-a275-e80c6b3fc610` and `X-API-Key` authentication. Its read-only `GET search_sold_items` endpoint accepts `query`, `sort`, `limit`, and `marketplace`. For Test AI, use `sort=BestMatch`, `limit=10`, and `marketplace=all` to return a bounded set of completed sales. Each item provides its price, currency, sale date, sale type, selling marketplace, title, image URL, and listing URL.

Source: <https://parse.bot/marketplace/e3b4a6b9-14b1-42bf-ae20-efd1b5728bdc/130point-com-api>

## Implementation guardrails

- Reuse `PARSE_BOT_API_KEY` server-side only; never expose it to the browser or write it to source control.
- Keep both integrations read-only and administrator-gated in Test AI.
- Do not change listings, trades, shipment records, notifications, or any market data.
- Surface provider status and actionable user-facing errors without echoing credentials or raw provider response bodies.
