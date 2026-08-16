# Test AI Source Research Notes

## Parse.bot

Parse.bot describes its marketplace APIs as independent, managed REST wrappers over publicly available data, not official source APIs. Treat Parse sources as third-party data services and do not use them to circumvent provider access controls.

### PSA Card API

Source: https://parse.bot/marketplace/e4bff78d-ff22-4603-b9d3-e3cbb455544e/psacard-com-api

The documented PSA endpoints are `get_cert_details`, `search_population_report`, `get_population_report_by_set`, `search_price_guide`, `browse_population_categories`, `get_cert_sales`, `get_population_by_spec`, and `get_cert_full`. Test AI already uses the meaningful per-certificate capability: certificate identity, full population breakdown, and recent sales. The unused endpoints provide set-level discovery, full set population tables, a single-spec population drill-down, price-guide set discovery, and category navigation. They do not add meaningful data to the existing one-certificate Test AI card.

### Collectr API

Source: https://parse.bot/marketplace/e9b4ef46-2252-4f98-829e-b4dc96816aa8/app-getcollectr-com-api

The API exposes `search_products`, `get_product_details`, and `get_products_bulk`. It can return card/sealed-product catalog metadata, market price, grade-specific pricing by grader, and price-history snapshots. It is a potential later validation candidate for broad card-market coverage.

### USA Coin Book API

Source: https://parse.bot/marketplace/00dbc222-468f-42fa-9a65-41e8e8c496f9/usacoinbook-com-api

The API exposes coin categories, series and detail data, current marketplace listings, melt values, and most-valuable lists. It can add coin reference data, grade-based values, active offers, and metal-value context to official PCGS data. It is a potential later validation candidate, not an official coin-source API.

## NGC

Official certification lookup: https://www.ngccoin.com/certlookup/

NGC's public tool requires a certification number and a grade selection. It verifies the description and grade and may show holder images. NGC's app describes access to certification verification, census population data, US Coin Price Guide values, and images. Public lookup has anti-abuse limits. No documented public developer API was found. Do not scrape or automate NGC lookup. Use an official external verification link until written commercial/API or data-licensing permission is obtained. Official contact: https://www.ngccoin.com/contact/ (Service@NGCcoin.com).

## CGC

Official verification: https://www.cgcgrading.com/en-US/verify

CGC provides public verification for comics/magazines, cards, video games, and home video using a certification number or holder QR code. CGC Research describes a comics census, certification database, and grader notes: https://www.collectiblesgroup.com/comics/cgc-research/.

CGC staff stated that public lookups are throttled and API data access requires application and approval as a CGC Authorized Dealer: https://boards.cgccomics.com/topic/529622-personal-app-developer-looking-for-api-access-understanding/. Do not scrape or use an unapproved wrapper for CGC data.

## Read-only production validation on 2026-08-16

On https://tradebilia.manus.space/test-ai, the following sources returned data without changing Tradebilia shipment, trade, user, or provider data:

- eBay active listings returned three current Charizard PSA 9 offers.
- Sold-Comps returned a 1979 O-Pee-Chee Wayne Gretzky PSA 9 completed sale and Charizard completed-sales examples.
- Parse PriceCharting returned a grade-price table for a matching Charizard result.
- Parse 130point returned ten visible records from a broad Charizard query. The result was live but broad; some results did not match the selected card exactly.
- Parse SGC returned Rickey Henderson 1980 Topps #482, grade 6, designation EX/NM, population 1,905, and higher population 7,065 for certificate 5445321. A later immediate repeat returned a temporary unavailable response, so provider availability should be reported as intermittent until rechecked.
- Official PCGS CoinFacts returned 1926 $10 MS65, population 558, higher 93, guide value $4,000, PCGS number 8882 for certificate 25651776.
- Parse PSA returned a complete record for documented certificate 69225215: 2022 Pokémon Japanese Sword & Shield Dark Phantasma #074 FA/Gengar, GEM MT 10, PSA estimate $116, a Grade 1–10 population breakdown, 23,887 total graded, and three August 14, 2026 recent-sale records. This validates the currently used PSA certificate, population, estimate, and recent-sales workflow.
- Parse BGS has an implemented Test AI adapter, but there is no documented non-customer BGS certificate in the project validation record. A fresh read-only BGS recheck should use an owner-supplied publicly verifiable certificate rather than a guessed number.
- The live Parse 130point Charizard query returned data but was broad: 1,000 matches and visible results spanning unrelated Charizard products, sets, grades, and years. Treat it as a raw research source rather than a direct valuation output until matching/filtering logic is improved.
- The live Parse PriceCharting result was also a title-level match to Mega Charizard X ex rather than the selected 1999 Shadowless Charizard PSA 9. It confirms the endpoint works but also demonstrates the need for a later exact-match selection step before any user-facing valuation use.

## Deferred work

The user explicitly deferred a normalized valuation engine, persistent source snapshots, and storage-heavy provider monitoring. Current work remains read-only Test AI source validation.

## Carrier-tracking validation status

- **USPS:** OAuth credentials work, but third-party shipment tracking remains blocked by USPS authorization for the configured MID. The UI correctly explains that the supplied tracking number may still work at USPS.com. Do not retry production tracking until USPS grants the required service-provider access or the user approves an official USPS.com-link fallback.
- **UPS:** OAuth and the official Customer Integration Environment tracking check were previously validated with UPS's repeatable CIE test input. A real production shipment number is still required for live-data validation.
- **FedEx:** The user previously confirmed a live tracking response after credentials were configured. A fresh regression check requires another user-supplied real tracking number.
- **DHL:** Unified Tracking credentials were validated against the correct `DHL-API-Key` contract. The Test AI carrier selector is active; a real DHL number is still required for shipment-data validation.
