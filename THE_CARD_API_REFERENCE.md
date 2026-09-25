# The Card API reference for the Tradebilia Test AI sandbox

**Verified:** 2026-09-25  
**Purpose:** Read-only, sandbox-only market and catalog integration for Sports Cards and Pokémon/TCG. No production Trade Room behavior is changed by this reference.

## Official sources

- Product and plan overview: <https://www.thecardapi.com/>
- Developer documentation: <https://www.thecardapi.com/docs>
- Terms of Service: <https://www.thecardapi.com/terms>

## Authentication and bases

| API area | Base URL | Authentication |
|---|---|---|
| Market sales | `https://thecardapi.com/api/v1/market` | `x-market-api-key: <key>` |
| Catalog | `https://www.thecardapi.com/api/v1/catalog` | `x-market-api-key: <key>` |
| MCP | `https://www.thecardapi.com/api/mcp` | `Authorization: Bearer <key>` |

The sandbox secret is server-side only: `THE_CARD_API_KEY`. It is never exposed to a browser, logs, source code, test output, or user-facing payload.

## Sales API

`GET /sales` returns normalized completed sale records. Relevant query filters include full-text `q`, platform, listing type, date range, price range, category (`sports`, `tcg`, `non_sport`), graded/raw state, grader, grade, print-run range, and pagination cursor.

Documented platforms include eBay, TCGplayer, Goldin, Lelands, SCP Auctions, Hake’s, and REA. Each sale can include:

- stable sale `id`, platform, listing type, raw title, sale date/timestamp, price, currency, price-confirmation flag, bid count, image/thumbnail/listing URL;
- certificate, condition, grade, grader, full grading company, auto-grade flag, qualifier flag/value, label, and autograph grade;
- when catalog-matched: player, manufacturer, card set, card number, year, season, league, sport, team, features, and print run;
- shipping price and category.

### Price semantics that must not be mixed silently

- eBay `price` is documented as an all-in buyer price.
- `best_offer` sales report the actual accepted price; `original_price` is the pre-negotiation asking price where supplied.
- Goldin `price` is documented as **hammer price only**, excluding buyer premium.
- `price_confirmed: false` is a fast-settle estimate pending confirmation and must remain context until confirmed.

### Tradebilia evidence policy

The adapter must pass individual, dated, positive-price, `price_confirmed: true` sales into the existing completed-sale gate with provider source ID, stable sale ID, source platform, listing URL, and price semantics. The comparable engine remains responsible for exact/near/contextual/rejected classification, identity readiness, grade/company conflict rejection, recency, USD treatment, duplicate suppression, and IQR filtering.

The Card API must never bypass these safeguards or use catalog data, unconfirmed prices, active asks, historical-only records, or price aggregates as a deterministic Tradebilia valuation.

## Catalog API

The catalog includes 16.6M+ cards across 331K+ sets and 15 sports, with permanent typed identifiers:

- `UCID` / `UC-` for a card;
- `USID` / `US-` for a set;
- `UPID` / `UP-` for a player;
- `UFID` / `UF-` for a set family.

Catalog searches support set ID, player ID, card number, set name, text query, sport, year, rookie flag, and auto flag. Returned card identity can include UCID, set ID/name, parent set ID/name, card number, subject, rookie flag, auto flag, and print run. Parallels/inserts link to their parent product.

Catalog availability is plan-gated: Builder with the catalog add-on (500 records/day), Pro (2,000 records/day), or Enterprise. The adapter must surface plan-gated access rather than retrying or pretending catalog identity was confirmed.

## Rights and storage boundaries

The provider permits paid-plan users to operate commercial applications, display market/catalog data within their product, cache under their plan’s limits, and create derived analytics and valuation algorithms. It prohibits reselling or redistributing the underlying records or catalog data as a standalone dataset, exposing a bulk-extractable public API, and training a substitute/competing model without written agreement.

Free access is evaluation/non-commercial only, has a 3-day rolling sales lookback, and cannot persist responses. The sandbox therefore uses bounded, on-demand requests only. Any production rollout requires confirmation of an appropriate paid plan, current lookback, storage allowance, and licensing fit.
