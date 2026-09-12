# Provisional Test AI Category Source Candidates

This working note preserves candidate providers returned by parallel research. It is **not an implementation recommendation** until official access, data rights, field semantics, and commercial use terms are individually verified.

| Category cluster | Candidate sources | Potential role | Current access assessment | Key caveat |
|---|---|---|---|---|
| Sports cards, Pokémon/TCG, non-sports cards | PSA, eBay, TCGplayer, SportsCardsPro / PriceCharting | Certification, active/completed sales, TCG identity, pricing | PSA and eBay have official developer materials; TCGplayer and SportsCardsPro require provider-specific commercial confirmation | Keep eBay/sales records deduplicated; do not assume consumer-tier data may be reused commercially. |
| Comics, vintage toys, movies, Disney pins | eBay, HobbyDB, CGC, Heritage Auctions, Pin & Pop | Sales, catalog identity, certification, high-end archives, pin catalog | Licenses/partner terms must be confirmed per provider | CGC/Heritage/HobbyDB consumer tools do not establish server-side commercial data rights. |
| Coins, banknotes, stamps | PCGS, Colnect, Scott Catalogue, Numista, eBay, Heritage Auctions | Certificate/census data, catalog identity, stamp numbers, market evidence | PCGS public API is documented; catalog and auction use may be licensed | Scott numbers and high-value auction data are proprietary; do not scrape. |
| Music | Discogs, MusicBrainz, eBay, Heritage Auctions | Pressing identity, release metadata, market evidence, high-end sale context | Discogs is already integrated for catalog metadata; MusicBrainz/eBay/auction use remains provider-specific | Identity data and commercial pricing data are separate; require exact pressing selection before comparison. |
| Video games | PriceCharting, IGDB, PSA/WATA, eBay, CGC Video Games, MobyGames | Pricing, edition/platform identity, grading, current/market evidence | Existing PriceCharting/IGDB paths should be verified for commercial limits before expanded use | Sealed/CIB/loose and region/platform variants cannot be blended. |
| Autographs / memorabilia | PSA, Beckett Authentication, JSA/CCG, eBay, Heritage Auctions | Certification, signature identity, current/complete sales, high-end comparables | Direct authorization and/or provider API required | Image or certificate matches are evidence, not a final authenticity determination. |

## Candidate sources requiring direct provider confirmation

1. **Card Ladder** — strongest prospective card/TCG completed-sale source; requires commercial data license.
2. **TCGplayer** — potentially valuable for TCG catalog and marketplace coverage; access availability and commercial terms must be confirmed.
3. **SportsCardsPro / PriceCharting** — possible multi-market pricing and sales data; verify exact data provenance, commercial rights, and duplication with current sources.
4. **HobbyDB / Pin & Pop** — catalog data that could strengthen vintage toys and Disney pins; verify license and completeness before treating as market evidence.
5. **Heritage Auctions** — useful rare-item/archive coverage but must be a direct commercial agreement; no scraping.
6. **Scott Catalogue / Colnect / Numista** — catalog identity candidates for stamps/coins; confirm rights to display/copy identifiers and images.
7. **MusicBrainz** — potential Music identity cross-check; ensure license compatibility for live/commercial use.
8. **Beckett Authentication / JSA / CGC Video Games / WATA** — use only through officially supported verification or commercial access.

## Verified access notes

### TCGplayer

TCGplayer’s official API terms state that an organization seeking API access must submit an application explaining its intended use and requested content. The page also says that API access is granted or denied in TCGplayer’s discretion. Its terms restrict redistribution or end-user availability of TCG content for commercial purposes unless TCGplayer expressly approves that use. Therefore, TCGplayer is valuable for Pokémon/TCG identity and market data only if Tradebilia obtains an approved commercial agreement that explicitly permits member-facing Test AI display, caching, and analysis. Sources: https://docs.tcgplayer.com/docs/getting-started and https://help.tcgplayer.com/hc/en-us/articles/360061115874-TCGplayer-API-Terms-Conditions.

### PriceCharting

PriceCharting’s official API documentation confirms that its paid API returns **current item values** and condition/grade-specific prices across video games, cards, comics, Funko Pops, LEGO, and coins. It explicitly says that its API and CSV products do **not** support historic prices or historic sales. It is therefore a useful licensed **current guide-value / identity-context** source, especially for video-game loose/CIB/new/graded distinctions, but it should not be presented as a completed-sale feed or merged into a completed-sale statistic. Source: https://www.pricecharting.com/api-documentation.

### Numista

Numista documents both free and paid API plans and allows applications to use its numismatic catalogue subject to an API license. The API requires visible N# identifiers and Numista attribution, confidential credentials, compliance with storage/caching limits, and no sublicensing or redistribution as a database/API/bulk download. Its permitted catalogue metadata cache is limited to seven days; identifiers may be retained indefinitely. Numista should therefore be considered a **coin identity and catalog metadata** source, not a market-value provider, and only after the paid plan/license terms are confirmed for Tradebilia’s commercial presentation. Source: https://en.numista.com/api/pricing.php.

### MusicBrainz

MusicBrainz’s official API guidance says that free web-service use is non-commercial and directs commercial users to commercial plans or direct contact. Its API is a music metadata catalog, not a completed-sale or market-price provider. It can be a valuable licensed identity cross-check for artist, release group, release, label, catalogue number, barcode, recording, and tracklist details, but it must not be represented as valuation evidence. Source: https://musicbrainz.org/doc/MusicBrainz_API.

### hobbyDB

hobbyDB’s official API page says its REST API provides database items, estimated values, subjects, and items for sale. It requests a project overview for cooperation and states that, unless a project creates significant traffic for hobbyDB, API use carries at least a $1,200 one-time setup fee plus monthly charges. It is therefore a credible **licensed catalog and current-market-context** candidate for Vintage Toys, LEGO, Funko-like collectibles, and possibly Disney Pins, but the estimated-value methodology, display rights, and category coverage should be verified before using it as any trade-comparison input. Source: https://help.hobbydb.com/support/solutions/articles/36000265069-access-to-the-hobbydb-api.

### GoCollect

The project contains a GoCollect credential but no active GoCollect Test AI connector. GoCollect’s public Data Sharing page documents CSV upload and API integration for contributing a user’s sales data after account registration; it does not, on that page, grant a general right to retrieve and redistribute GoCollect pricing data. The existing credential must therefore be treated as **scope unknown**, not as permission to add an outbound market-price lookup. Before using it, confirm the account plan, endpoint scope, member-facing display rights, retention limits, category coverage, and whether it supports retrieval rather than only data contribution. Source: https://gocollect.com/data-sharing.

## Prioritized source acquisition plan

The following is the recommended answer to “what external data should Test AI add next?” It is intentionally shorter than the universe of possible websites. A source is worth pursuing only when it improves **identity certainty**, **verified certification**, or **completed-sale coverage** for a category that eBay alone does not cover well.

| Priority | Source | Categories | What it adds | Acquisition decision |
|---:|---|---|---|---|
| **1** | **Direct PriceCharting API** | Video Games, Pokémon, Sports Cards, Comics, Funko, LEGO, Coins | Current condition/grade-specific guide values and product identity. Its docs cover loose, CIB, new/sealed, graded, and card-grade price fields. | Obtain a direct paid subscription and replace the present Parse.bot PriceCharting route; use only as `current guide value`, never completed-sale evidence. |
| **2** | **Card Ladder commercial feed** | Sports Cards, Pokémon/TCG, non-sports cards | Broad cross-market completed-sale research, certificate-aware matching potential, specialty-auction coverage. | Pursue a direct commercial agreement first. This is the strongest prospective comps source. |
| **3** | **GoCollect outbound-data agreement** | Comics, Pokémon, Video Games, Magazines, Concert Posters | Potential price-guide/market coverage in categories where Tradebilia already has a configured but unused credential. | First verify whether the existing account/key permits retrieval and member-facing display. Do not build until GoCollect confirms scope in writing. |
| **4** | **TCGplayer approved commercial API** | Pokémon, Magic, Yu-Gi-Oh!, and other TCGs | Canonical TCG product/catalog identity plus current marketplace context. | Submit an API application specifically requesting commercial member-facing Test AI display and cache rights. |
| **5** | **hobbyDB commercial API** | Vintage Toys, LEGO, Funko-like collectibles, Disney Pins | Product/catalog identity, estimated value context, and marketplace availability. | Request a proposal; use as identity/current context, not as a sold-comps source unless the feed explicitly supplies completed-sale records and rights. |
| **6** | **NGC / Numista approved access** | Coins, banknotes | NGC certification verification; Numista catalog identity, variety, denomination, and N# identifiers. | Add only with provider-approved server access. NGC strengthens trust; Numista strengthens catalog matching and requires attribution/caching compliance. |
| **7** | **Scott Catalogue / Colnect commercial rights** | Stamps | Scott-number or stamp-catalog identity; country, issue, denomination, variety. | Explore after coins. It will improve identity matching but does not by itself solve pricing. |
| **8** | **MusicBrainz commercial plan** | Music | Artist/release/label/catalog/barcode/tracklist cross-check beside Discogs. | Optional. Discogs remains the primary pressing identity source; MusicBrainz is a secondary metadata validator, not a pricing source. |
| **9** | **CGC / WATA / JSA / Beckett commercial verification** | Comics, sealed video games, autographs | Certificate/grade/authentication identity checks. | Pursue only by category demand. Treat every result as verification evidence, never a final authenticity decision. |
| **10** | **Heritage Auctions commercial archive feed** | High-value cards, comics, coins, memorabilia, music, movie collectibles | Specialty-auction completed-sale records and rare-item price ceilings. | Long-term partnership target. High value for rare items, but lower immediate coverage/ROI than the first five sources. |

## The sources Test AI should not add as market evidence

| Source class | Reason |
|---|---|
| Parse.bot / scraping wrappers | A wrapper’s API key does not grant Tradebilia the underlying marketplace’s rights. Replace it when a direct provider API is obtainable; do not expand its use. |
| Consumer subscriptions, account history, History Points, browser sessions, or private endpoints | They are user entitlements, not a license for Tradebilia to automate, cache, display, or redistribute data. |
| Catalog-only sources as “prices” | Discogs, MusicBrainz, Numista, and similar sources are primarily identity/metadata tools; they must not be treated as completed-sale evidence. |
| Current marketplace asks as “sold value” | Active eBay, COMC, TCGplayer, or hobbyDB listings show supply/asking context, not realized price. |

## Recommended acquisition order

1. **PriceCharting directly** — it has a documented paid API, can replace the non-direct PriceCharting route, and immediately expands useful current-value context across several categories.
2. **Card Ladder** — the best prospective completed-sale source for cards/TCG once licensed.
3. **Clarify GoCollect** — the project already has a key, so determine whether it supports legal outbound research before paying another provider.
4. **TCGplayer and hobbyDB** — add category-specialist identity/current-market breadth after their member-display terms are approved.
5. **NGC/Numista/Scott and verifier partnerships** — fill coin, stamp, and authentication gaps without pretending catalog data equals market value.
6. **Heritage and other auction-house feeds** — reserve for a later rare-item/elite-auction research layer.

## Category fit in plain language

| Tradebilia category | The next source that matters most | What it solves |
|---|---|---|
| Sports Cards | Card Ladder | More complete, cross-market, exact-grade completed sales. |
| Pokémon / TCG | Card Ladder, then TCGplayer | Completed-sale breadth plus canonical card/variant identity and live market context. |
| Comics | GoCollect, then CGC / Heritage | Comic-specific market context, grade/certificate identity, and rare auction comps. |
| Vintage Toys / LEGO | hobbyDB | Better product identity and current market context beyond generic title matching. |
| Disney Pins | hobbyDB, then a separately licensed pin catalog | Pin-series/edition identity is the gap; do not use generic estimates as sales comps. |
| Coins | NGC plus Numista; retain PCGS | A second major grader plus catalog/variety identification. |
| Stamps | Scott/Colnect license | Precise issue/catalog identity before any pricing comparison. |
| Music | Discogs first; MusicBrainz optional | Stronger pressing identification; market comps still depend on licensed sale sources/eBay sold evidence. |
| Video Games | Direct PriceCharting; then CGC/WATA verification | Loose/CIB/sealed/graded distinction and condition-specific guide context. |
| Autographs | PSA plus JSA/Beckett access | Authentication/certificate identity before pricing comparison. |
| Movies / Memorabilia | GoCollect or Heritage partnership | Specialty catalog and rare-auction evidence. |

### Decision rule

Do not add a provider because it has a recognizable name. Add it only if it is **authorized**, fills a category gap, exposes usable identity or price semantics, provides a stable ID/source URL for auditing, and does not merely duplicate current data.

## Non-negotiable source policy

Tradebilia must use direct provider authorization, documented APIs or commercial feeds, provider-held credentials, source attribution, and explicit display/caching rights. Consumer logins, purchased consumer entitlements, browser sessions, scraping, private endpoints, and independent wrappers are not acceptable production data paths.

## Official URLs to verify in the next research pass

- https://www.psacard.com/publicapi
- https://developer.ebay.com/
- https://docs.tcgplayer.com/
- https://www.sportscardspro.com/api-documentation
- https://help.hobbydb.com/support/solutions/articles/36000265069-access-to-the-hobbydb-api
- https://www.pcgs.com/publicapi/documentation
- https://colnect.com/en/help/collecting/capi
- https://en.numista.com/api/index.php
- https://www.discogs.com/developers
- https://musicbrainz.org/doc/MusicBrainz_API
- https://www.pricecharting.com/api-documentation
- https://api-docs.igdb.com/
- https://www.mobygames.com/info/api/
- https://www.beckett-authentication.com/verify-certificate
- https://www.ha.com/
