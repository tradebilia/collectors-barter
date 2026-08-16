# Category API Roadmap

## Current validated Test AI coverage

| Category | Current live or validated sources | Principal remaining gap |
|---|---|---|
| Sports Cards | eBay active listings, Sold-Comps, 130point, Parse PSA/BGS/SGC, PriceCharting | Canonical product/set matching rather than another price source. |
| Pokémon | Sports-card sources plus PriceCharting | Canonical card/set/rarity metadata and exact product identity. |
| Coins | Official PCGS CoinFacts, eBay/Sold-Comps where applicable | Global/raw coin catalog information; commercial catalog licensing is not free. |
| Comics | eBay/Sold-Comps where applicable | Canonical series, issue, creator, and variant metadata. |
| Vintage Toys | eBay/Sold-Comps where applicable | Product taxonomy and specialist catalog metadata. |
| Video Games | eBay/Sold-Comps where applicable | Game/platform/release metadata; no proven free commercial valuation source. |
| Stamps | eBay/Sold-Comps where applicable | Philatelic catalog data; free market-grade catalog access is not available. |
| Movies | eBay/Sold-Comps where applicable | Movie/format metadata; free commercial image licensing is not available. |
| Autographs | eBay/Sold-Comps where applicable | PSA/DNA, JSA, and BAS certification validation. |
| Disney Pins | eBay/Sold-Comps where applicable | Structured pin, series, and edition catalog data. |

## Verified no-cost and free-tier candidates

| Category | Candidate | Provides | Commercial fit and recommendation |
|---|---|---|
| Pokémon | Pokémon TCG API | Cards, sets, rarity, images, and searchable catalog metadata. | Technical access is free with optional developer key. Confirm current commercial/attribution conditions before public deployment. This is the best next metadata test because it solves exact card matching. https://docs.pokemontcg.io/ |
| Comics | Grand Comics Database | Series, issue, creator, publisher, and variant metadata. | Its data/schema are CC BY-SA 4.0; commercial use requires attribution and share-alike compliance. GCD distributions are better suited to a future stored catalog, which is deferred because persistent catalog storage is out of scope. https://www.comics.org/ https://creativecommons.org/licenses/by-sa/4.0/ |
| Stamps | Smithsonian Open Access / National Postal Museum records | Historic stamp images and descriptive museum metadata. | CC0 assets can be reused, but this is reference metadata—not a stamp-price guide. Good later as a supplemental catalog, not a valuation provider. https://www.si.edu/openaccess |
| Movies | Wikidata | Open factual title, release, cast, franchise, and format metadata. | CC0 structured data is usable without a commercial API fee, but it provides no proprietary poster rights or collectible valuation. Consider only for text metadata. https://www.wikidata.org/wiki/Wikidata:Data_access |
| Autographs | Official verification links | PSA/DNA, JSA, and BAS verification handoff. | No identified free commercial structured API. Use only official external verification links unless an authenticator grants approved API access. |
| Vintage Toys | BrickLink, limited to LEGO/brick products | Brick catalog and inventory data. | Potentially relevant only for LEGO; do not commit until its current developer and commercial terms are reviewed and approved. https://www.bricklink.com/v2/api/welcome.page |

## Sources that are not free-commercial implementation candidates

- IGDB is technically free but its documentation states the free API is for non-commercial usage; commercial projects require a partnership. It should not be used for public Tradebilia production without that permission. https://api-docs.igdb.com/
- TMDb’s free API is non-commercial; do not add it to a marketplace without a commercial license. https://developer.themoviedb.org/
- Numista’s free access is personal-use oriented; commercial catalog access is paid. https://en.numista.com/api/index.php
- Colnect and Stamp Auction Network require paid commercial arrangements for API/catalog access. https://colnect.com/en/help/collecting/colnect_api
- CGC, NGC, PSA/DNA, JSA, and BAS should not be scraped. Use official link-outs until each provider grants explicit data access.

## Recommended sequence

1. Validate the Pokémon TCG API for exact card and set matching only, subject to a short final commercial-terms review.
2. Add a no-storage, text-only Wikidata metadata lookup for Movies and Autographs if normalized title/person data becomes useful.
3. Defer GCD, Smithsonian, and any bulk catalog ingestion until Tradebilia is ready to allocate compliant storage and attribution handling.
4. Retain eBay active listings, Sold-Comps, 130point, and PriceCharting as the market-data layer. Do not add a second overlapping price source without a specific category gap.
