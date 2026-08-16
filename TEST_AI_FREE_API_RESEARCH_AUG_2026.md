# Test AI Data-Source Audit: No-Cost and Low-Risk Options

**Date:** August 16, 2026

**Scope:** Tradebilia’s commercial Test AI environment.
**Decision rule:** A source is only considered eligible when its documented access and reuse terms support Tradebilia’s use. A public website, a GitHub wrapper, a no-cost trial, or a Reddit recommendation is **not** permission to scrape, redistribute, or commercially reuse data.

## Executive conclusion

There are **two meaningful additions that can be evaluated now without adding a paid data subscription**: **TCGdex** for Pokémon-card identification metadata and, with a written confirmation of the current terms, **RAWG** for video-game identification metadata. Neither is a valuation, sales-comps, grading, or authentication source. The existing **Wikidata** and **Smithsonian Open Access** integrations remain the best confirmed no-cost reference sources already live in Test AI. Smithsonian CC0 records may be used commercially when the individual asset is designated CC0. [1]

> **Important distinction:** No new source discovered in this audit provides reliable, free, commercially cleared **market value**, **authentication**, or **grading-certificate validation** for Comics, Autographs, Disney Pins, Vintage Toys, Stamps, or NGC coins. General eBay/Sold-Comps remains the cross-category market evidence source; specialist data is either paid, approval-only, or lacks a public API.

| Decision | Source | Category coverage | What it contributes | Why it is safe or unsafe |
|---|---|---|---|---|
| **Evaluate first** | TCGdex | Pokémon | Card, set, number, rarity, types, attacks, rules text, legalities, variants, illustrator, and reference links. | The maintained card database declares an MIT license. It is factual catalog metadata, **not pricing**. Public image display must be separately reviewed. [2] |
| **Evaluate second, conditionally** | RAWG | Video Games | Title, platform, release date, developer, publisher, genre, ESRB, system and franchise metadata. | RAWG’s terms section permits commercial startup/hobby use below stated traffic thresholds with required active backlinks and no redistribution, but the same page’s pricing block calls its Free plan non-commercial. Obtain confirmation from RAWG before enabling it. [3] |
| **Already live** | Wikidata | Movies, Autographs; contextual research | Open factual linked-data reference metadata. | The current implementation is appropriately read-only and not used as valuation or authentication. [4] |
| **Already live** | Smithsonian Open Access | Stamps; historical contextual research | Museum record metadata and CC0 assets. | Commercial reuse is allowed only for assets designated CC0; non-CC0 assets require permission. [1] |
| **Optional scholarly addition** | Metropolitan Museum of Art Collection API | Historic toys, coins, printed material, and other artifacts | CC0 object data and selected public-domain media. | The Met says its open-access API data and public-domain images are available without permission or fee. It is not a collector catalog or value guide. [5] |
| **Optional scholarly addition** | Library of Congress Collections API | Comics-related print material, historic media, books, and artifacts | Searchable structured collection metadata. | The Library makes JSON data available specifically for machine-readable access; media rights vary record by record. [6] |

## What “free” means in this audit

**Parse.bot is not a free production data source.** It has a free account with 200 starter credits and a 5-request-per-minute limit, but every successful endpoint call consumes credits; paid plans begin at $30 per month. [7] Its marketplace is useful for experimentation, but that limited allowance is a trial budget rather than an indefinitely free commercial integration.

| Parse.bot endpoint or family | Data available | Cost/access reality | Recommendation for Test AI |
|---|---|---|---|
| **USA Coin Book** | US coin categories, series, mintage, grade reference values, active listings, melt values, and images. | 1 credit per successful request. Parse says explicitly that it is **not** an official USA Coin Book API; it is a managed third-party wrapper. [8] | **Do not add as a production source** without upstream permission. It is potentially useful for internal exploration only and does not replace PCGS or NGC certification data. |
| **Collectr** | Trading-card catalog identity, current and grade-specific prices, and historical snapshots. | 1–2 credits per request. Parse identifies it as a non-official wrapper over Collectr’s public data. [9] | **Defer.** It would overlap current card sources and needs upstream commercial-use confirmation. Do not treat its historical snapshots as current value. |
| **Brickset** | LEGO set search, themes, years, pieces, minifigures, designers, dimensions, and retail-price metadata. | Credit-metered; Parse identifies it as a non-official wrapper. [10] | **Defer.** It could be a narrow Vintage Toys reference source for LEGO only, but is not a free production option or a general vintage-toy catalog. |
| **TCGPlayer, Cardmarket, COMC, Beckett, Card Ladder, TCDB, PokémonTCG site wrappers** | Varying card listings, checklists, prices, or catalog data. | These are Parse marketplace adapters, so they consume credits and many are wrappers of non-public or limited public upstream data. [7] | **Do not automatically integrate.** Evaluate one source at a time only after upstream terms, data quality, overlap, and value treatment are reviewed. |

## GitHub and open-data findings

GitHub is valuable for **open datasets and maintained client libraries**, not for bypassing a provider’s protected site or terms. The strongest result is TCGdex. Its repository has an MIT-declared card database, over 1,000 GitHub stars, and recent maintenance activity. [2] That makes it materially different from a scraper or an unofficial API wrapper.

| Source | Access classification | Best use in Test AI | Constraints |
|---|---|---|---|
| **TCGdex** | **No-cost, commercially usable catalog data** | Resolve Pokémon card identity before comparing eBay, PriceCharting, PSA/BGS/SGC, or PWCC results. It can reduce wrong-set, wrong-number, wrong-rarity, and wrong-variant comparisons. | Keep it strictly factual. Do not imply a TCGdex record proves authenticity, condition, grade, market value, or ownership. Review artwork display before exposing image URLs. [2] |
| **TheGamesDB** | **Technically public; commercial data rights not confirmed** | Could provide game/platform/developer/publisher catalog matching. | The API and server code are accessible, but the available documentation does not clearly grant commercial rights for all underlying game data and artwork. Do not use until its operator confirms a commercial data license. [11] |
| **Grand Comics Database** | **Not eligible for commercial use** | None in production at present. | GCD describes itself as a non-commercial volunteer project and says its data files are available strictly for personal, non-commercial use. [12] |
| **Open-source scraping repositories** | **Not eligible** | None. | A repository’s code license does not grant rights to collect, redistribute, or commercialize data from the source website. Do not use GitHub projects to scrape CGC, NGC, USPS, Heritage, GoCollect, JSA, or other protected sources. |

## Community research: useful signal, not a license

Collector-community discussions were reviewed to understand practical source quality. A recent r/PokeInvesting discussion reports the same gap seen in the primary-source audit: official card-price access is commonly paid or unavailable and scraping is not an acceptable substitute. [13] Comic-collector discussion similarly centers on paid guides such as GoCollect, Comic Book Realm, CovrPrice, and eBay sold listings rather than a dependable free commercial API. [14]

The community evidence does **not** add a legitimate new free API. Its value is confirming the operational reality: cross-market sold listings are generally more available than specialist valuation feeds, while specialist feeds must be licensed.

## Sources that should remain excluded

| Source or category | Classification | Why Tradebilia should not integrate it now |
|---|---|---|
| **GoCollect** | Paid / enterprise integration | Its basic account is free, but the published plan matrix reserves customized API access for Enterprise. Its terms limit ordinary use to personal use and prohibit commercial exploitation and automated extraction without written consent. [15] [16] |
| **Comic Book Realm and CovrPrice** | No verified public commercial API | Useful collector websites, but no documented free commercial API was found. Do not scrape. |
| **Heritage Auctions** | No public API / scraping prohibited | Heritage forbids robots, spiders, screen scraping, database scraping, and commercial exploitation of its site data. Its separate image API is available only to contracted sales agents. [17] [18] |
| **NGC** | No public commercial API | NGC offers public manual verification and member/dealer features, but no documented public developer API for Tradebilia’s commercial certificate, census, or price-guide use was found. Keep official verification handoff only. [19] |
| **CGC, CBCS, PSA/DNA, JSA, BAS** | Dealer or partner approval required | Do not build an integration without written provider approval. In particular, CGC staff has stated that API access for certificate data is limited to Authorized Dealers. [20] |
| **Pin & Pop** | Approval plus $99 setup fee | Its specialist Disney-pin API is promising but not free: approval, a data license, end-user attribution, and a one-time setup fee are required. Images may not be publicly displayed. [21] |
| **Numista** | Personal-use / paid commercial access | Do not use as a commercial catalog without an appropriate license. |
| **Scrydex** | Paid | The former Pokémon TCG API route now points to a paid Scrydex offering; it is excluded by the project’s existing decision. |
| **IGDB and TMDb** | Non-commercial free tiers | The project has already correctly excluded both for Tradebilia’s commercial use. |
| **USPS public tracking pages** | Scraping prohibited / unreliable | Keep the approved official USPS.com tracking-link fallback. Do not scrape the public tracking website to bypass paid API access. |

## Recommended implementation order

The next safe Test AI addition is **TCGdex metadata**, not another pricing feed. It directly addresses the current Pokémon gap: canonical card/set/rarity/variant identification before market and grading sources are selected. Build it as a manual, read-only Test AI source with no images at first, and use it only to make other queries more precise.

After that, seek a one-sentence written confirmation from RAWG that its current startup/hobby commercial provision applies to Tradebilia’s intended use. If confirmed, enable RAWG as a read-only video-game metadata source with the required backlink, traffic monitoring, and no data redistribution. Do not use it for game valuation, WATA/VGA verification, or authentication.

| Priority | Action | Value | Do not do |
|---|---|---|---|
| **1** | Add TCGdex as a manual Test AI Pokémon catalog lookup. | Improves exact matching across cards, sets, numbers, rarities, variants, and language facts. | Do not use it as a price, condition, grade, authenticity, or ownership signal. |
| **2** | Request RAWG commercial-use confirmation and, if confirmed, add game metadata lookup. | Improves game/platform/release-year matching and filters for eBay/Sold-Comps. | Do not show it as a collectible valuation or grading source. |
| **3** | Consider a Met/Library of Congress research panel only if collectors need historical context. | Adds credible primary-source background for selected heritage objects. | Do not convert museum records into price or authenticity conclusions. |
| **4** | Pursue provider partnerships only when scale justifies them. | Potential future coverage for CGC, NGC, comics pricing, autographs, and Disney pins. | Do not scrape or use unofficial wrappers without upstream permission. |

## Bottom line

The answer is **not** “there are many free price APIs waiting to be connected.” There are a few legitimate no-cost **metadata** options, and the most useful one for immediate Test AI work is **TCGdex**. **RAWG may be eligible for video-game metadata, but its same-page free-plan wording is inconsistent and should be clarified in writing first.** All other specialist gaps remain a licensing, partnership, or paid-data issue—not an engineering issue that a scraper or GitHub library should bypass.

## References

[1]: https://www.si.edu/openaccess/faq "Smithsonian Open Access FAQ"
[2]: https://github.com/tcgdex/cards-database "TCGdex cards-database repository"
[3]: https://rawg.io/apidocs "RAWG API documentation, plans, and terms"
[4]: https://www.wikidata.org/wiki/Wikidata:Data_access "Wikidata data access"
[5]: https://metmuseum.github.io/ "Metropolitan Museum of Art Collection API"
[6]: https://www.loc.gov/apis/ "Library of Congress APIs"
[7]: https://parse.bot/pricing "Parse.bot pricing"
[8]: https://parse.bot/marketplace/00dbc222-468f-42fa-9a65-41e8e8c496f9/usacoinbook-com-api "Parse.bot USA Coin Book API"
[9]: https://parse.bot/marketplace/e9b4ef46-2252-4f98-829e-b4dc96816aa8/app-getcollectr-com-api "Parse.bot Getcollectr API"
[10]: https://parse.bot/marketplace/684238fd-ae16-4466-800e-fcde003fbab1/brickset-com-api "Parse.bot Brickset API"
[11]: https://api.thegamesdb.net/ "TheGamesDB API documentation"
[12]: https://docs.comics.org/wiki/General_FAQ "Grand Comics Database General FAQ"
[13]: https://www.reddit.com/r/PokeInvesting/comments/1qykzy1/anyone_working_with_pok%C3%A9mon_pricing_data/ "r/PokeInvesting discussion on Pokémon pricing APIs"
[14]: https://www.reddit.com/r/comicbookcollecting/comments/acvaaw/comic_book_realm_anyone_use_it_how_good_is_it_in/ "r/comicbookcollecting discussion on Comic Book Realm"
[15]: https://gocollect.com/pricing "GoCollect pricing"
[16]: https://gocollect.com/terms-of-service "GoCollect Terms of Service"
[17]: https://www.ha.com/c/ref/website-use-agreement.zx "Heritage Auctions Website Use Agreement"
[18]: https://www.heritage-images.com/api-terms-and-conditions "Heritage Images API Terms and Conditions"
[19]: https://www.ngccoin.com/verify/ "NGC Certification Verification"
[20]: https://boards.cgccomics.com/topic/541624-api-for-accessing-card-and-image-data-from-cert-number/ "CGC forum: API access for certificate data"
[21]: https://pinandpop.com/docs/api/v1-pins "Pin & Pop API documentation"
