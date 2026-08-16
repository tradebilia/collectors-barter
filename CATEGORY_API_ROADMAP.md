# Category API Roadmap

## Current validated Test AI coverage

| Category | Current live or validated sources | Principal remaining gap |
|---|---|---|
| Sports Cards | eBay active listings, Sold-Comps, 130point, Parse PSA/BGS/SGC, PriceCharting, PWCC/Fanatics Collect | Canonical product/set matching rather than another price source. |
| Pokémon | Sports-card sources plus PriceCharting and PWCC/Fanatics Collect | Canonical card/set/rarity metadata and exact product identity; no verified free commercial source is currently available. |
| Coins | Official PCGS CoinFacts, eBay/Sold-Comps where applicable | Global/raw coin catalog information; commercial catalog licensing is not free. |
| Comics | eBay/Sold-Comps where applicable | Canonical series, issue, creator, and variant metadata. |
| Vintage Toys | eBay/Sold-Comps where applicable | Product taxonomy and specialist catalog metadata. |
| Video Games | eBay/Sold-Comps where applicable | Game/platform/release metadata; no proven free commercial valuation source. |
| Stamps | eBay/Sold-Comps and Smithsonian reference metadata | Philatelic catalog data; free market-grade catalog access is not available. |
| Movies | eBay/Sold-Comps and Wikidata reference metadata | Collectible-format data and commercial image licensing. |
| Autographs | eBay/Sold-Comps and Wikidata signer reference metadata | PSA/DNA, JSA, and BAS certification validation. |
| Disney Pins | eBay/Sold-Comps where applicable | Structured pin, series, and edition catalog data. |

## Verified no-cost and free-tier candidates

| Category | Candidate | Provides | Commercial fit and recommendation |
|---|---|---|
| Comics | Grand Comics Database | Series, issue, creator, publisher, and variant metadata. | CC BY-SA 4.0 requires attribution and share-alike compliance; defer until compliant catalog storage is approved. https://www.comics.org/ |
| Stamps | Smithsonian Open Access / National Postal Museum records | Historic images and descriptive museum metadata. | CC0 reference information, not a stamp-price guide. The selected National Postal Museum reference flow is implemented read-only. https://www.si.edu/openaccess |
| Movies | Wikidata | Open factual title, release, cast, franchise, and format metadata. | CC0 structured data is appropriate for text reference only, not valuation or proprietary images. The selected provider is implemented read-only. https://www.wikidata.org/wiki/Wikidata:Data_access |
| Autographs | Official verification links | PSA/DNA, JSA, and BAS verification handoff. | No identified free commercial structured API. Use official links until explicit provider access exists. |

## Sources that are not no-cost commercial implementation candidates

- IGDB and TMDb free access is non-commercial; do not use either in public Tradebilia production without a commercial agreement.
- The former Pokémon TCG API now directs developers to Scrydex; its Starter tier is paid, so it is not a no-cost candidate. https://scrydex.com/pricing
- Numista free access is personal-use oriented; commercial catalog access is paid.
- Do not scrape CGC, NGC, PSA/DNA, JSA, or BAS. Use official link-outs until written permission or API access exists.
