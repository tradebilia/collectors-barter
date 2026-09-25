# Pokémon Price Tracker API reference for the Tradebilia Test AI sandbox

**Verified on:** 24 September 2026  
**Primary documentation:** [Pokémon Price Tracker API v2](https://www.pokemonpricetracker.com/docs) and [OpenAPI schema](https://www.pokemonpricetracker.com/api/openapi)  
**Use boundary:** Read-only, manually enabled, Pokémon-only **Test AI sandbox** source. No production Trade Room behavior, database persistence, background synchronization, crawling, bulk export, or valuation change is authorized by this reference.

## Authentication and request controls

The API base URL is `https://www.pokemonpricetracker.com/api/v2`. All calls require a server-side Bearer token. The provider documents a credit-based rate limit and reports consumption and remaining credits in response metadata and rate-limit headers. Single-card requests must use an explicit `limit=1`; the provider bills the requested limit rather than the returned count. The adapter must honor `429` responses and `Retry-After` rather than retrying aggressively.

The sandbox must never expose `POKEMON_PRICE_TRACKER_API_KEY` in client code, browser requests, source control, test output, or logs.

## Read-only endpoints used by the sandbox

| Endpoint | Bounded use | Documented field groups | Sandbox treatment |
|---|---|---|---|
| `GET /cards` | Exact-query candidate search, `limit=1`; if that returns no record, one name-and-set fallback capped at `limit=3` | Card IDs; name; set; card number; rarity; card type; pricing summary; primary printing; images; response metadata | Candidate generation only; never identity proof or value evidence |
| `GET /cards/{id}` | One detail request only after exact name + set + card-number match | All basic card fields; TCGplayer links; Pokémon characteristics; prices; variants; printing list; timestamps; price history; eBay graded-sale aggregates; plan-gated individual eBay listings; Cardmarket; provider metadata | Source-attributed context only; values, histories, Cardmarket, and eBay aggregates cannot alter Tradebilia median, confidence, or verdict |
| `GET /population?tcgPlayerId=…` | One exact-candidate request only | Per-grader grade maps, totals, gem rates, graders tracked, higher-grade percentages, confidence, and timestamps | Context only. The provider documents Business access; `403` is displayed as unavailable, not as missing population |
| `POST /parse-title` | Documented API capability, not automatically invoked by the initial bounded adapter | Parsed card identity, grader / grade / condition and candidate confidence | Candidate assistance only if later enabled; fuzzy results cannot establish identity or valuation |

## Documented card-detail fields

The API documents that a detailed card response can include the following fields. The sandbox preserves the complete response under an expandable **Full provider payload** review block so it does not discard provider-added fields.

| Field group | Documented fields and examples | Evidence classification |
|---|---|---|
| **Identifiers and identity** | `id`, `tcgPlayerId`, `externalCatalogId`, `name`, `setId`, `setName`, `cardNumber`, `totalSetNumber`, `rarity`, `cardType`, `printingsAvailable` | Identity-reference assistance; exact listing agreement remains mandatory |
| **Card characteristics** | `pokedexNumbers`, `pokemonType`, `energyType`, `hp`, `stage`, `flavorText`, `attacks`, `weakness`, `resistance`, `retreatCost`, `artist` | Catalog context only |
| **Provider / image links** | `tcgPlayerUrl`, `imageUrl`, `imageCdnUrl`, `imageCdnUrl200`, `imageCdnUrl400`, `imageCdnUrl800` | Reference and visual-review context; never authenticity proof |
| **Current guide and supply context** | `prices.market`, `prices.low`, `prices.listings`, `prices.sellers`, `prices.recentSales`, `prices.primaryPrinting`, `prices.lastUpdated`, `prices.priceWasCorrected`, per-condition and per-variant price values | Guide / supply context only; never a completed-sale median input |
| **Variant and condition detail** | `variants[printing].printing`, `marketPrice`, `lowPrice`, `conditionUsed`; provider may expose `prices.conditions` / `prices.variants` | Context only; conditions and printing must match before comparison |
| **History** | `priceHistory.conditions`, `priceHistory.variants`, history points with dates, market, and possible volume; tracked conditions / variants; counts; earliest / latest timestamps; price ranges | Historical guide context only. Provider documents gap-filling interpolation, so points are not assumed to be observed sales |
| **Graded eBay context** | `ebay.updatedAt`, scrape/check timestamps, `salesByGrade`, outlier flags, sales velocity, aggregate history, total sales/value, grade coverage, date range; Business-tier `soldListings` may include listing ID, URL, title, price, date, listing type, Best Offer flag, shipping, currency, and scrape time | Aggregate and history remain context only. Individual eBay records must be provenance-complete and cross-source deduplicated before any later evidence proposal |
| **Cardmarket context** | `cardmarketPrices` headline values, variants, history, EUR prices, dates, product IDs | Guide context only; provider documents plan and language constraints |
| **Population** | `populationByGrader`, grade buckets, total population, total gems, combined gem rate, graders tracked, combined totals, percent higher, match confidence / score, fetched and updated times | Scarcity discussion only; never direct value evidence |
| **Provider audit metadata** | `metadata.count`, `total`, `limit`, `offset`, `hasMore`, `language`, includes, history window, API-call consumption / breakdown, plan restrictions, granularity flags; rate-limit headers | Displayed for test transparency; not trade evidence |
| **Lifecycle flags** | `needsDetailedScrape`, `lastScrapedAt`, `createdAt`, `updatedAt`, `dataCompleteness` where returned | Provider freshness / coverage context only |

## Access and rights constraints

The provider documents that Free and API plans are non-commercial / pre-launch. Business or Enterprise is required for commercial use, including marketplace or internal business analytics. Data may be cached to serve the integrator’s own first-party application on the applicable plan, but may not be resold, syndicated, redistributed as a data product, or exposed as a competing API or feed. The provider prohibits scraping and data mining without prior written consent. These constraints require the sandbox to use authenticated endpoints only and to avoid bulk exports or background collection.

## Non-negotiable analyzer guardrails

1. The source is manually enabled and available only for Pokémon/TCG items in Test AI.
2. A candidate must match listing card name, set, and card number exactly before a detail or population request is used as aligned context.
3. Guide prices, price history, supply counts, Cardmarket data, population figures, eBay aggregates, and provider estimates never alter valuation, confidence, or the trade verdict.
4. Individual eBay data, if the current plan returns it, remains provider-sourced contextual evidence until stable underlying transaction identifiers, sale semantics, exact identity, and cross-source deduplication are independently established.
5. A `403`, plan restriction, no result, or malformed provider field is displayed as coverage / access information rather than negative proof about the item.
6. No response is written to the listing, database, or production Trade Room.
