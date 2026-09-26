# Free Market-Data Deep Dive for Tradebilia

**Date:** 2026-09-26  
**Scope:** The categories identified as needing stronger market evidence beyond Tradebilia’s current sources. The focus was genuinely free or publicly viewable completed-sale data, not asking prices, catalog values, or market-news commentary.

## Bottom line

There are useful free/public market records for every under-covered category, but almost none of the specialist sources provides a documented, unrestricted API or a license for automated commercial reuse. Public visibility is not the same as permission to scrape, retain, redistribute, or use records in a background valuation service.

The strongest immediate approach is a **rights-conscious sandbox layer**:

- Use open or explicitly reusable data where available.
- Use public auction pages only for small, user-directed or manually curated fixtures unless the auction house grants written permission.
- Keep completed sales separate from estimates, active listings, original retail prices, guide values, and merchant buyback offers.
- Preserve the source’s price basis: hammer price, buyer-premium-inclusive realized price, unknown basis, currency, date, lot number, and grouped-lot status.
- Never let an unlicensed or weakly identified source silently influence deterministic valuation.

## Priority matrix

| Category | Priority | Best free/public market source | What it contributes | Recommended sandbox posture |
|---|---:|---|---|---|
| Coins | High | NGC Auction Central; CoinArchives | Certified U.S. auction records; ancient/world hammer results | Manual or permissioned query pilot; request reuse permission before retention or automation |
| Stamps / philately | High | Rumsey; Cherrystone | Lot-level Scott/catalog identity, condition, certificates, realized prices | Best next specialist-source candidates, but permission before systematic collection |
| Music collectibles / vinyl | High | Discogs identity data; Omega Auctions | Strong release identity; specialist vinyl auction results | Use Discogs CC0 catalog data for matching; keep sales-history use permissioned/manual |
| Vintage toys | High | Bertoia; Morphy; Theriault’s | Public price-realized PDFs and antique-toy lot pages | Small provenance-rich seed set; retain premium basis and source links |
| Movies / film memorabilia | Medium | Propstore; PAI; Bonhams | Screen-used props, costumes, posters, provenance, realized prices | Manual proof of concept or licensed integration |
| Comics | Medium | ComicConnect; Heritage | Sold issue/variant/grade/service/date/price records | Manual lookup only unless written automation/data permission is obtained |
| Autographs / signed memorabilia | Medium | University Archives; Swann; RR Auction | Sold lots with inscriptions, provenance, authentication and premium fields | Hand-curated sandbox fixtures; license for recurring use |
| Video games | Medium | Goldin; Heritage; Hake’s | High-end sealed/graded auction results | Human-facing or permissioned lookup; do not treat retailer buyback offers as sales |
| Disney Pins | Medium | Hake’s; Heritage | Sparse but genuine realized prices for rare/high-end Disneyana | Supplemental exceptional-item layer, not a category-wide price feed |

## Category findings and free-source recommendations

### Coins — high priority

**NGC Auction Central** is the best first public lookup candidate for U.S. certified coins. It exposes auction-house, lot, date, grade, price, and normalized NGC identity fields. **CoinArchives** is the strongest free complement for ancient and world coins, with recent catalog and hammer-price records.

CNG, Stack’s Bowers, GreatCollections, and Heritage also contain genuine closed-auction records, but this research did not verify a free public API, bulk download, or open reuse license. GreatCollections in particular should not be scraped: its archive has access and terms constraints, and its content requires written permission for reuse. Treat NGC and CoinArchives as bounded, user-directed research candidates until permission is obtained.

- NGC Auction Central: https://www.ngccoin.com/auction-central/us/
- CoinArchives FAQ and archive: https://www.coinarchives.com/faq.php
- CNG past auctions: https://www.cngcoins.com/PastAuction.aspx?AUCTION_ID=238&BACK_URL=%2F

### Stamps / philately — high priority

**Rumsey Auctions** is the strongest candidate for a sandbox pilot. Its public catalog and prices-realized pages connect lot IDs to Scott numbers, condition, certificates, descriptions, sale IDs, and realized amounts. Its results pages identify omitted lots and state the buyer-premium treatment.

**Cherrystone** is a strong second source. Its public past-auction results connect auction/date/lot identifiers to catalog number, condition, certificate, description, image, and realized price. **Raritan** provides a useful public archive and downloadable price lists, but its lot-number/price format is weaker for exact identity unless an authorized catalog join is available.

No unrestricted official API or open-data license was verified. Siegel’s robots rules and Stamp Auction Network’s login/paid-access model make them unsuitable as free autonomous sources.

- Rumsey auctions: https://www.rumseyauctions.com/auctions
- Rumsey realized results: https://www.rumseyauctions.com/pr/sale/125
- Cherrystone archive: https://www.cherrystoneauctions.com/_auction/pr.asp
- Raritan archive: https://www.raritanstamps.com/PastAuc/

### Music collectibles and vinyl — high priority

**Discogs** is the most useful free foundation, but primarily for identity rather than unrestricted pricing. Its CC0 database dumps provide release IDs, barcodes, labels, catalog numbers, formats, countries, artists, and track data. That can materially improve exact matching before using sold evidence.

Discogs public release pages expose calculated marketplace sales history from recent transactions, but its API terms classify Marketplace data and sales history as restricted. Do not bulk-cache or republish that pricing without written authorization.

**Omega Auctions** is the best specialist public source for a small, attributable vinyl evidence set. Heritage and RR Auction are useful secondary sources for high-end signed records and music memorabilia. Normalize whether a figure is hammer-only or includes buyer’s premium.

- Discogs CC0 data: https://data.discogs.com/
- Discogs sales-history update: https://www.discogs.com/about/updates/sales-history-calculation-improvements-2023/
- Discogs API terms: https://support.discogs.com/hc/en-us/articles/360009334593-API-Terms-of-Use
- Omega Auctions example: https://bid.omegaauctions.co.uk/auction/lot/lot-96---punk-wave---lp-rarities-pack/?lot=74814&sd=1
- Heritage archives: https://www.ha.com/information/about-auction-archives.s
- RR Auction: https://www.rrauction.com/auctions/details/744-marvels-of-modern-music

### Vintage toys — high priority

**Bertoia Auctions** publishes public price-realized PDFs for specialist toy auctions. **Morphy Auctions** publishes public toy and general-collectibles price-realized PDFs and catalogs. **Theriault’s** provides public antique-doll and plaything lot pages. These are genuine completed-sale records, not asking prices or guides.

The PDFs and lot pages are suitable for a small, provenance-rich sandbox seed set. They are not a verified free bulk license. Preserve sale, lot, catalog, currency, buyer-premium basis, and grouped-lot status. Morphy’s checked price list explicitly documents a 23% premium/no-tax treatment.

- Bertoia past auctions: https://www.bertoiaauctions.com/toy-auctions/past-auctions/
- Morphy past auctions: https://morphyauctions.com/auctions/past-auctions/
- Morphy example price-realized PDF: https://morphyauctions.com/wp-content/uploads/2026/01/2026-June-2-3-Toys-PR.pdf
- Theriault’s archive: https://www.theriaults.com/events/archive

### Movies and film memorabilia — medium priority

**Propstore’s Sold Archive** is the best category-specific starting point for screen-used props, costumes, and production material. It contains rich identity and provenance, but archive prices are auction hammer-before-premium and the archive is not a verified reusable API.

**Poster Auctions International’s Price Guide** is a strong public reference for posters because it includes title, artist, date, variant, condition, lot/date, realized result, and unsold markers. **Bonhams** adds authoritative high-end comps with dimensions and provenance. Normalize the price basis carefully: Propstore may be hammer-only; PAI and Bonhams may include premium; LiveAuctioneers commonly presents hammer prices.

- Propstore FAQs / archive context: https://propstore.com/general-faqs-2/
- PAI price-guide usage: https://auctions.posterauctions.com/poster-price-guide-usage
- Bonhams example: https://www.bonhams.com/auction/24465/lot/1070/the-iconic-original-robby-the-robot-suit-and-jeep-from-forbidden-planet/

### Comics — medium priority

**ComicConnect’s public sold search** is the strongest manual completed-sales reference found. It exposes title/run, issue, publisher, grading company and grade, descriptive qualifiers, sold timestamp, amount, and stable item URL. **Heritage’s archive** is a high-quality member research source for scarce and graded comics.

Neither source was cleared for autonomous free ingestion. **PriceCharting** can be useful as an eBay-derived guide/trend layer, but it should not be confused with independent auction evidence, and its API is not a free public completed-sales archive.

- ComicConnect sold search: https://www.comicconnect.com/browse?filtertype=Sold&title=action%20comics&issue=&comments=&publisher_id=&genre=&creator=&pedigree=&min_grade=&max_grade=&listing_type=2&button=&advanced_search_on=1
- ComicConnect agreement: https://www.comicconnect.com/article/user-agreement
- Heritage comics archive: https://www.ha.com/hm20992
- Heritage website agreement: https://www.ha.com/c/ref/website-use-agreement.zx

### Autographs and signed memorabilia — medium priority

**University Archives** is the best high-identity public archive for a limited hand-curated fixture set. **Swann Galleries** has particularly clear sold-price semantics and states when displayed prices include buyer’s premium. **RR Auction** provides rich inscription, condition, provenance, and authentication fields. **Alexander Historical Auctions** is a useful specialist supplement for historical material.

University Archives and Alexander show sold values but the checked pages did not establish whether the displayed amount includes premium. Store `price_basis=unknown` until confirmed. PSA/PSA-DNA certificate verification is useful identity context, never market pricing.

- University Archives: https://www.universityarchives.com/auctions/past-auctions/
- Swann archive: https://www.swanngalleries.com/auction-catalog/autographs_7E7HIRSESY
- RR Auction past auctions: https://www.rrauction.com/auctions/auction-calendar/cron/past
- Alexander Historical Auctions: https://www.alexautographs.com/past-auctions/
- PSA certificate verification: https://www.psacard.com/cert

### Video games — medium priority

**Goldin’s sold-items view** is the best human-facing source for high-end sealed and graded games. Its result strings can contain year, platform/region, release or production variant, sealed state, grader, grade, bid count, end time, and ended price. **Heritage** and **Hake’s** are complementary auction archives.

Retailer buyback lists such as DKOldies are not completed-sale evidence. They can be labeled as timestamped merchant-offer or floor signals only, and only if permission allows their use. Goldin and Heritage prohibit automated extraction in their agreements, so use direct links or obtain a data license.

- Goldin sold results: https://goldin.co/buy/?Category=Video%20Games&number_of_lots=96&page=1&show_only=Sold%20Items&sort=Highest_Bids
- Goldin agreement: https://goldin.co/useragreement
- Heritage video-game archive: https://www.ha.com/heritage-auctions-schedule.s?category=video-games&view=past
- Hake’s example: https://www.hakes.com/LotDetail.aspx?inventoryid=10157
- DKOldies buyback list: https://www.dkoldies.com/sell-video-games/

### Disney Pins — medium priority

Disney pins have genuine free/public auction evidence, but it is sparse and skewed toward rare or exceptional pins and grouped lots. **Hake’s** is the best first source for public realized prices. Its checked record exposed closed date, lot ID, title, PinPics ID, grade/condition, dimensions, release context, estimate, bid count, and buyer-premium-inclusive realized price.

**Heritage** is a useful second source for rare Disneyana, prototypes, awards, and provenance-rich material, but individual prices may require a free account and many records are multi-item lots. PinPics and Pin & Pop are valuable identity catalogs, not valuation feeds; their terms require permission or prohibit scraping. Do not use them as free automated sources without written approval.

- Hake’s auction results: https://www.hakes.com/auctionresults.aspx
- Hake’s verified lot: https://www.hakes.com/LotDetail.aspx?inventoryid=89764
- Heritage Art of Disney archive: https://www.ha.com/c/search.zx
- PinPics terms: https://pinpics.com/termsandconditions
- Pin & Pop terms: https://pinandpop.com/terms

## Sources that should not be treated as free autonomous feeds

The research specifically ruled out several tempting but unsuitable paths:

- **WorthPoint:** paid, trial-limited, personal-research-only, and non-commercial under its terms.
- **LiveAuctioneers:** valuable result pages, but its terms prohibit automated access and copying without permission.
- **Disney official pages:** retail/catalog information, not market valuation data; terms restrict automated extraction and commercial use.
- **PinPics and Pin & Pop:** strong identity catalogs, but their terms require permission or prohibit scraping/data mining.
- **My Pin Collection:** sold data is visible in some contexts, but free versus paid market-data entitlements are inconsistent, and much of the evidence appears eBay-derived and duplicative of current Tradebilia coverage.
- **GreatCollections:** valuable coin archive, but no public documented API was found; access, robots, Cloudflare/CAPTCHA, member gating, and terms make autonomous scraping inappropriate without a written agreement.

## Best next steps for the sandbox

1. **Add Rumsey and Cherrystone as permission-gated stamp research adapters** if written-use permission is available. Their identity fields are strong enough to support the existing stamp format and P0 identity gates.
2. **Add NGC Auction Central as a manual/user-directed coin lookup** and pair it with the existing PCGS/coin identity logic. Keep NGC summary averages and current listings out of completed-sale evidence.
3. **Use Discogs CC0 dumps as a local music identity resolver**, not as an unrestricted pricing feed. This is the clearest legally reusable foundation found.
4. **Seed a small, manually curated toy dataset from Bertoia and Morphy PDFs** with explicit source URLs, lot IDs, premium basis, and grouped-lot flags.
5. **Do not add autonomous scraping** for ComicConnect, Heritage, Goldin, Hake’s, Propstore, PAI, Swann, RR, LiveAuctioneers, PinPics, Pin & Pop, or GreatCollections without written permission or a documented license/API.
6. **Keep all research-only or permission-pending sources in Context until the source is authorized and the record passes exact identity, completed-sale, date, currency, duplicate, and visual checks.**

## References

[1]: https://www.ngccoin.com/auction-central/us/ "NGC Auction Central"
[2]: https://www.coinarchives.com/faq.php "CoinArchives FAQ"
[3]: https://www.rumseyauctions.com/auctions "Rumsey Auctions"
[4]: https://www.cherrystoneauctions.com/_auction/pr.asp "Cherrystone Past Auction Results"
[5]: https://data.discogs.com/ "Discogs Data Dumps"
[6]: https://support.discogs.com/hc/en-us/articles/360009334593-API-Terms-of-Use "Discogs API Terms of Use"
[7]: https://www.bertoiaauctions.com/toy-auctions/past-auctions/ "Bertoia Past Auctions"
[8]: https://morphyauctions.com/auctions/past-auctions/ "Morphy Past Auctions"
[9]: https://propstore.com/general-faqs-2/ "Propstore Auction Archive and FAQs"
[10]: https://auctions.posterauctions.com/poster-price-guide-usage "Poster Auctions International Price Guide Usage"
[11]: https://www.comicconnect.com/browse?filtertype=Sold&title=action%20comics&issue=&comments=&publisher_id=&genre=&creator=&pedigree=&min_grade=&max_grade=&listing_type=2&button=&advanced_search_on=1 "ComicConnect Sold Search"
[12]: https://www.swanngalleries.com/auction-catalog/autographs_7E7HIRSESY "Swann Autographs Auction Archive"
[13]: https://goldin.co/buy/?Category=Video%20Games&number_of_lots=96&page=1&show_only=Sold%20Items&sort=Highest_Bids "Goldin Video-Game Sold Items"
[14]: https://www.hakes.com/auctionresults.aspx "Hake’s Auction Results"
[15]: https://www.greatcollections.com/Auction-Archive/top "GreatCollections Auction Archive"
[16]: https://www.greatcollections.com/terms "GreatCollections Terms"
