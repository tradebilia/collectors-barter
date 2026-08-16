# Test AI Source Research and Validation Record

## Scope

The user has deferred a unified valuation engine, persistent source snapshots, and storage-heavy provider monitoring. Current work is limited to read-only provider validation. No Tradebilia shipment, trade, member, or provider data is changed by these checks.

## Parse.bot source model

Parse.bot marketplace APIs are third-party managed REST wrappers over public website data, not official data-provider APIs. They must not be used to circumvent NGC, CGC, carrier, or other provider access controls.

### Current Tradebilia adapters

| Source | Current Test AI coverage | Validation status |
|---|---|---|
| PSA via Parse.bot | Certificate identity, PSA estimate, Grade 1–10 population, total population, and recent sales | Read-only published check passed with certificate `69225215`: 2022 Pokémon Japanese Sword & Shield Dark Phantasma #074 FA/Gengar, GEM MT 10, PSA estimate $116, total graded 23,887, and three recent sales. |
| BGS via Parse.bot | Certification details, grade, subgrades, label color, population, and optional price guide | Published read-only check passed with Parse.bot’s documented certificate `0016097088`: 2021 Donruss Optic Downtown! #10 Joe Burrow, final grade 10.0, gold label, 2023-09-19 grading date, subgrades 9.5/10/10/10, 0 higher, and 29 at grade. |
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

## Current validation conclusion

All currently actionable Test AI certification and market-data sources have been exercised through published read-only flows: eBay active listings, Sold-Comps, Parse PSA, Parse BGS, Parse SGC, Parse PriceCharting, Parse 130point, and official PCGS CoinFacts. The remaining carrier limits are input- or authorization-dependent: USPS requires service-provider authorization, while fresh UPS, FedEx, and DHL shipment reads require valid tracking numbers. No additional provider should be added until the user approves a specific data gap or provides an authorized carrier test input.

## Wikidata development check

The new administrator-only Wikidata reference provider is registered as a live Test AI source and visibly enabled in the development interface for an Autograph-category inventory item. It is explicitly labelled as read-only public metadata and does not expose price, certification, authenticity, valuation, or stored-data fields. The initial listing-title query was correctly revised to use the item’s stored signer field (`Donald Trump`) so public-entity matching is based on the collectible’s signer rather than marketplace listing language. The development result resolved Donald Trump’s linked Wikidata record and showed factual biographical metadata, including birth date, occupation, and nationality, with no valuation or certification output.

The same source was enabled for the available Movie-category inventory item (`Star Wars Graded CGC 9.4`) and resolved the linked Wikidata `Star Wars` reference record with descriptive franchise metadata and origin data. Both reference results visibly exclude price, certification, valuation, authenticity, and storage fields.

## Smithsonian Open Access development check

The configured Smithsonian Open Access key passed a read-only National Postal Museum API search. The new Test AI source is registered as a live Stamp-category-only reference provider and was enabled for the existing `1923 S2 US#572` stamp. A catalog-number-only lookup returned an unrelated Smithsonian Libraries record, so the integration was corrected before publication: it now uses the stamp listing title (`1923 S2 US#572 stamp`) and accepts only National Postal Museum-relevant records. An ambiguous or non-postal match is returned as an explicit not-found result, never as a misleading stamp reference.

The corrected published-development lookup returned the National Postal Museum record **“$2 United States Capitol single”** with date `1923`, place `United States of America`, and a linked official museum record at https://postalmuseum.si.edu/object/npm_2005.2001.257. The panel clearly remained a no-price, no-certification, no-authenticity, no-storage reference source.

The response-field audit found additional collector-facing reference data: Scott catalog reference, object number, printer, unused state, object type, material and dimensions, complete topical labels, collection grouping, and CC0 image-rights designation. The adapter now maps those fields while continuing to omit raw GUIDs, internal delivery-resource URLs, and administrative metadata.

The Wikidata field audit confirmed additional useful public claims beyond the original release/director/genre or signer birth/occupation fields. Movie records can provide creator, adaptation source, franchise, and original language. Autograph signer records can provide birthplace, sport, playing position, team history, and notable work or achievement. The adapter now maps these only when the public entity contains them, and the interface preserves full values rather than truncating long reference lists. No claim is presented as a valuation, certificate check, or authentication result. A final live visual recheck encountered a transient Wikidata endpoint timeout after earlier successful development lookups; the existing UI returns a clear temporary-unavailable state for that upstream condition.

After the expanded field implementation, TypeScript and all deterministic Smithsonian/Wikidata adapter and UI tests passed. A full suite and credential recheck then encountered network timeouts reaching several unrelated external services, including the Smithsonian and Wikidata public endpoints. These are upstream reachability failures rather than assertion or type failures; the credential had already been successfully validated before the timeout window.

The complete Wikidata entity audit confirmed that the source exposes substantially more than the selected Test AI fields, including identifier claims, editorial/catalog links, multilingual labels, media resources, internal relationship claims, references, and entity-specific details. Test AI intentionally maps only a collector-relevant subset. Potential future Movie additions are cast, screenwriter, producer, composer, cinematographer, editor, distributor, running time, premiere location, and awards. Potential future Autograph additions are awards and career-specific positions or offices only where category context warrants it. Personal, sensitive, administrative, identifier-only, or qualifier-dependent claims are intentionally excluded. The adapter also does not presently render Wikidata claim references or time qualifiers, because a simple list would strip necessary context such as team-history dates.

The 130point presentation now classifies dated completed-sale records into Recent (within 12 months), Historical (older than 12 months), and Undated groups. It makes no price average or valuation. The live Charizard recheck correctly placed 2014–2015 and early-2025 results under Historical context, together with an explicit statement that they are not current-value comparables. The source still requires manual confirmation of exact item, grade, and variant identity.

## PWCC / Fanatics Collect via Parse.bot

The Parse.bot PWCC Marketplace API is the relevant Fanatics Collect source because PWCC was rebranded as Fanatics Collect. Tradebilia uses its `search_listings` endpoint with `status=Sold`, a bounded page size of ten, and no write operations. A live development check for the existing Pokémon Charizard item returned 10 of 54,315 broad sold-listing matches. All returned records were older than 12 months and were therefore correctly rendered under **Historical context**, not as current comparables. The returned examples also included different Charizard variants and grades, confirming that this source must remain individual-record context requiring exact title, grade, and variant review; it must not generate an average or current valuation.
