# Test AI Source Research and Validation Record

## Scope

The user has deferred a unified valuation engine, persistent source snapshots, and storage-heavy provider monitoring. Current work is limited to read-only provider validation. No Tradebilia shipment, trade, member, or provider data is changed by these checks.

## Parse.bot source model

Parse.bot marketplace APIs are third-party managed REST wrappers over public website data, not official data-provider APIs. They must not be used to circumvent NGC, CGC, carrier, or other provider access controls.

### Current Tradebilia adapters

| Source | Current Test AI coverage | Validation status |
|---|---|---|
| PSA via Parse.bot | Certificate identity, PSA estimate, Grade 1–10 population, total population, and recent sales | Read-only published check passed with certificate `69225215`: 2022 Pokémon Japanese Sword & Shield Dark Phantasma #074 FA/Gengar, GEM MT 10, PSA estimate $116, total graded 23,887, and three recent sales. |
| BGS via Parse.bot | Certification details, grade, subgrades, label color, population, and optional price guide | Adapter and regression coverage exist. A fresh live check needs an owner-supplied, publicly verifiable BGS certificate; no test certificate is recorded. |
| SGC via Parse.bot | Certification identity, grade, designation, population, and higher population | Published checks returned `5445321`: 1980 Topps #482 Rickey Henderson, grade 6, EX/NM, population 1,905, higher 7,065. One immediate repeat briefly reported temporary unavailability, but the bounded retry after the restored provider deployment returned the same record. Treat the source as live while retaining normal upstream-error handling. |
| PriceCharting via Parse.bot | Pokémon grade-price table | Endpoint returned live values, but its title-level result matched Mega Charizard X ex rather than the selected 1999 Shadowless Charizard PSA 9. It is research-only until a future exact-match selection step exists. |
| 130point via Parse.bot | Completed trading-card sale records across marketplaces | Endpoint returned live data, but the Charizard query returned 1,000 broad matches spanning unrelated years, sets, grades, and products. It is raw research only until matching/filtering is improved. |

The unused PSA endpoints are not worthwhile for the current one-certificate Test AI screen. They provide set discovery, full set population tables, single-spec population drill-down, price-guide set discovery, and category navigation—not material data missing from the existing per-certificate output.

### Potential future Parse validations

- **Collectr:** Product search/detail/bulk lookup, current market value, grade-specific pricing, and price history. It adds a product ID, catalog group/set, card number, rarity, image, raw-versus-graded comparison, grade-specific pricing across PSA/BGS/CGC/TAG/ACE/AGS, sealed-product catalog coverage, and a market-price time series. It does not add certificate verification, population reports, individual seller listings, shipping/seller data, or individual auction/sale records. Current Tradebilia sources already cover the latter functions through grading adapters, eBay active listings, Sold-Comps, and 130point. The strongest future benefit is exact catalog matching before pricing; it could reduce broad title-level matches from PriceCharting and 130point. Do not add it now because it is a third-party Parse wrapper with material overlap and the user has deferred bulk collection pricing. Source: https://parse.bot/marketplace/e9b4ef46-2252-4f98-829e-b4dc96816aa8/app-getcollectr-com-api
- **USA Coin Book:** Coin reference data, series/detail, active listings, melt values, and most-valuable lists. Potential complement to official PCGS data, but not an official coin-source API. Source: https://parse.bot/marketplace/00dbc222-468f-42fa-9a65-41e8e8c496f9/usacoinbook-com-api

## Official certification sources

### PCGS

The official PCGS CoinFacts adapter is enabled and read-only. Published Test AI returned 1926 $10, MS65, population 558, higher 93, guide value $4,000, PCGS number 8882 for certificate `25651776`.

### NGC

Official public verification requires a certification number and grade selection. It may show the certified description, grade, and images. No documented public developer API or permission for automated extraction was found. Do not scrape. Use an official external-link fallback until NGC grants written commercial/API or data-licensing permission.

- Verification: https://www.ngccoin.com/certlookup/
- Contact: https://www.ngccoin.com/contact/

### CGC

CGC public verification covers comics/magazines, cards, video games, and home video with a certificate number or holder QR code. Its comics research suite includes a census, certification database, and grader notes. Public lookup is throttled; CGC staff state API data access requires approval as a CGC Authorized Dealer. Do not scrape or use an unapproved wrapper.

- Verification: https://www.cgcgrading.com/en-US/verify
- Research: https://www.collectiblesgroup.com/comics/cgc-research/
- Access statement: https://boards.cgccomics.com/topic/529622-personal-app-developer-looking-for-api-access-understanding/

## Market and carrier checks

- eBay active listings returned current Charizard PSA 9 offers in published Test AI.
- Sold-Comps returned a 1979 O-Pee-Chee Wayne Gretzky PSA 9 completed sale and Charizard completed-sale examples.
- USPS OAuth credentials work, but third-party tracking is blocked pending USPS MID/service-provider authorization. Do not retry until authorization or approval for an official USPS.com-link fallback.
- UPS OAuth and CIE tracking were validated previously using UPS’s repeatable test input. A real production number is still needed for a fresh live shipment-data check.
- FedEx live tracking was user-confirmed after credentials were configured. A fresh validation needs another real tracking number.
- DHL Unified Tracking uses the correct `DHL-API-Key` contract and is active in Test AI; a real DHL number is still needed for shipment-data validation.
