# Test AI Evidence-Normalization Inventory

**Inventory date:** 2026-08-18
**Scope:** Existing administrator-only Test AI flows. This is an internal code-contract inventory, not a claim that any provider independently verifies value or authenticity.

## Current Item Inputs

Every inventory selection supplies a listing title, normalized category, condition, optional grade, optional certification company, optional owner estimate, and category-specific `itemDetails`. Existing query helpers already normalize the custom-manufacturer fallback and resolve a valid year from `year`, `releaseYear`, or `manufactureYear`. The new layer must reuse these conventions and must not mutate the persisted listing.

## Provider Evidence Contracts

| Evidence class | Current providers | Existing result characteristics | Required normalization treatment |
|---|---|---|---|
| Current market research | eBay Active Listings | Query, filtered listing rows, currency, asking prices, and aggregate metrics. | Keep separate as **asking-price research**, never a completed-sale fact. |
| Completed-market research | Sold-Comps, 130point, PWCC/Fanatics | Dated or undated sales, sale/source fields, and optional metrics. | Retain dates and recency. Historical and undated results remain context, not current-value averages. |
| Card certification | PSA, BGS, SGC | Identity fields, grade, certification, and population; BGS may include subgrades. | Compare only relevant card fields and preserve grader-specific terminology. |
| Coin certification | PCGS CoinFacts | Coin identity, grade, population, guide/auction values, and image metadata. | Compare coin-specific identity fields; do not treat PCGS guide data as a universal market conclusion. |
| Pokémon reference | TCGdex, PriceCharting | Card name, set, number, variants, and reference or market-guide fields. | Use set/card number/variant for identity. Keep PriceCharting prices distinct from TCGdex facts. |
| Video Game reference | IGDB, RAWG | Canonical title, platform facts, and release-year context. | Treat platform mismatch as material. Preserve RAWG’s global-versus-listing-year discrepancy rather than resolving it automatically. |
| Museum and linked-data reference | Smithsonian, Wikidata | Category-specific factual metadata only. | Do not manufacture value, certification, or authenticity conclusions. |

## Category Identity Rules

| Category | High-value identity fields | Applicable specialist evidence today | Known limitation preserved by normalizer |
|---|---|---|---|
| Sports Cards | Player, year, manufacturer, card number, grade, grader | PSA, BGS, SGC, 130point, PWCC, eBay/Sold-Comps | No source is a universal pricing authority. |
| Pokémon | Card name, set, card number, variant, language, grade | TCGdex, PriceCharting, PSA/BGS/SGC, 130point, PWCC, eBay/Sold-Comps | Historical sales require date context. |
| Coins | Country, denomination, year, mint mark, grade, certification | PCGS, eBay/Sold-Comps | NGC remains unavailable pending official approval. |
| Comics | Series, issue, variant, publisher, grade | eBay/Sold-Comps | No active official CGC source. |
| Video Games | Canonical title, platform, edition, regional year, grade | IGDB, RAWG, eBay/Sold-Comps | Global reference release dates may differ from regional listing dates. |
| Stamps | Country, catalog number, denomination, issue year, grade | Smithsonian, eBay/Sold-Comps | Smithsonian is reference metadata, not a price or certificate source. |
| Movies | Title, edition, format, release year, grade | Wikidata, eBay/Sold-Comps | Wikidata provides metadata only. |
| Autographs | Signer, signed-item type, authentication company, certificate | Wikidata, eBay/Sold-Comps | No active official autograph-authentication partner source. |
| Disney Pins | Character, series, event, edition size, pin number | eBay/Sold-Comps | No active licensed specialist pin source. |
| Vintage Toys | Brand, line, character, year, version, condition or grade | eBay/Sold-Comps | No active broad specialist catalog source. |

## Design Constraints Derived From the Inventory

The shared summary can normalize **listing identity and evidence type**, but it cannot declare that independently fetched records describe the same physical object unless category-specific material fields align. It must surface unavailable, not-found, or conflicting evidence as such. It will be displayed beside, not instead of, each existing provider panel and will not auto-select a provider or invoke the Trade Room.
