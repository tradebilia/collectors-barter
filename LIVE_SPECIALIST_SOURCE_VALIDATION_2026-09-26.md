# Live Specialist Source Validation

**Date:** 2026-09-26  
**Scope:** One authorized, bounded, read-only public completed-item check per source.  
**Limits:** Maximum three ordinary public page requests per source; no login, account creation, form submission, CAPTCHA bypass, robots/access-control workaround, retry loop, data retention, or database write.

## Result summary

| Result | Count | Meaning |
|---|---:|---|
| **Technically verified** | 13 | A public completed record exposed title, stable URL/lot ID, explicit closed/sold/realized status, date, price/currency, and usable price-basis wording. The source remains **permission pending** and disabled in Test AI. |
| **Partially validated** | 6 | A real result was reachable, but a required item field was gated or missing within the three-request cap. |
| **No usable completed item in the capped test** | 3 | The public route did not yield an individual completed lot with the required evidence fields within the cap. |

> **Important:** A “technically verified” result proves a public page can expose the minimum data for one item. It does **not** activate recurring collection or allow any result to influence valuation. Every source remains disabled until full written permission and the source-specific activation gate are recorded.

## Source-by-source results

| Source | Category | Tested completed item | Outcome | What the public test returned | Roadblock / activation note |
|---|---|---|---|---|---|
| **NGC Auction Central** | Coins | [1986 Eagle S$1 MS, NGC UCID 26J4](https://www.ngccoin.com/auction-central/us/silver-eagles-1986-date-pscid-203/auctions/1986-eagle-s1-ms-ucid-26J4) | **Technically verified** | NGC historical *Prices Realized* row: Heritage sale 132330 / lot 27848; 2023-07-19; $1,320; MS69; price wording says hammer plus auction-house commission. | Build around UCID history and preserve the exact NGC price-basis wording. |
| **CoinArchives** | Coins | Public record route `r.php?a=664` | **No usable item** | FAQ confirms archived prices realized are hammer prices excluding buyer fee. | Tested record redirected to a future third-party schedule rather than a stable completed lot. Validate a direct individual historical lot in a new authorized test. |
| **CNG Past Auctions** | Coins | [Anonymous 179–170 BC AR Denarius, lot 6005](https://www.cngcoins.com/Lot.aspx?LOT_ID=207893&BACK_URL=%2fPastAuction.aspx%3fAUCTION_ID%3d238%26BACK_URL%3d%252F) | **Technically verified** | LOT_ID 207893; explicit *Sold For $800*; 2026-09-24 close; VF; buyer fee explicitly excluded. | Public PastAuction/Lot contract is suitable for a bounded adapter. |
| **GreatCollections Archive** | Coins | [1795 Capped Bust Gold Eagle, GC 1350274](https://www.greatcollections.com/Coin/1350274/1795-Capped-Bust-Gold-Eagle-9-Leaves-PCGS-MS-63-CAC-Green-Ex-Pogue-Simpson-Collections) | **Technically verified** | Public archive card gave *Sold for $2,711,250*; item page gave GC ID, PCGS MS-63+ CAC, cert number, ended time, and fee wording. | Detail page hides amount behind Join; use archive-card realization field only after explicit authorization and preserve basis as not conclusively known. |
| **Rumsey** | Stamps | [Sale 127, Lot 1001](https://www.rumseyauctions.com/pr/sale/127) | **Partially validated** | *Prices Realized*, Dec. 9–11 2025; lot 1001; $350; prices exclude 18% premium. | Sale result lacks individual title, grade/certificate, and stable lot URL. Validate the linked chapter/lot view under a renewed test limit. |
| **Cherrystone** | Stamps | [Auction 202503, Lot 1](https://www.cherrystoneauctions.com/_auction/results.asp?auction=202503&lotnum=1) | **Technically verified** | U.S. 1847 5c red brown; 2025-03-18/19; *Price Realized $300*; fresh/v.f.; 1983 Alcuri certificate. | Build around `auction` + `lotnum`; keep the source’s `Price Realized` phrase and currency mapping provenance. |
| **Raritan** | Stamps | [Auction 105, Lot 2](https://www.raritanstamps.com/PastAuc/PR105.php) | **Partially validated** | Nov. 13–14 2025; lot 2; 110.00; prices exclude 15% premium. | Results page has no title or currency; pair with an authorized archived catalogue/lot detail. |
| **Omega Auctions** | Music | [Fully Signed Beatles Autograph Book, Lot 302](https://www.omegaauctions.co.uk/news-media/news/lindsay-brown-time-has-told-me-50-years-of-music-auction-results/) | **Partially validated** | News result says *Sold for £6,600*, estimate £3,000–5,000, authenticated by Roger Epperson. | Article lacks a canonical completed-lot URL and actual sale date; validate its linked auction catalogue and lot page. |
| **Bertoia** | Vintage Toys | [Spring Signature Auction 2025, Lot 43 PDF](https://www.bertoiaauctions.com/pdf/prices-realized/signature-spring-auction-march-2025-prices-realized.pdf) | **Partially validated** | Lot 43, March 15 2025, $96,000; stated 20% buyer premium included. | Public rendered catalogue returned client template rather than lot title/URL. Require an approved lot-detail/API contract. |
| **Morphy** | Vintage Toys | [Hansel & Gretel Cast Iron Still Bank](https://auctions.morphyauctions.com/HANSEL___GRETEL_CAST_IRON_STILL_BANK-LOT663867.aspx) | **Technically verified** | Lot 1001, catalog 695; bidding and auction close dates; $270 USD; final prices include buyer premium; condition Very Good Plus. | Individual completed-lot contract is ready for a conservative adapter. |
| **Theriault’s** | Vintage Toys | [Schoenhut Arabian Camel, listing 87064](https://www.theriaults.com/events/listing/87064/8-american-wooden-arabian-camel-by-schoenhut) | **Technically verified** | Lot 151; *Ended* and *Sold*; Sep. 11/12 2026; $275; condition; stable listing ID. | Preserve `Highest Bidder`/`Sold` wording; price basis not explicitly hammer/all-in. |
| **Propstore** | Movies | [Cast Away Wilson, Stock 139035](https://propstore.com/product/cast-away/chuck-nolands-tom-hanks-hero-screen-matched-wilson/) | **Partially validated** | Sold Jan. 11 2023; catalog 299 / lot 80269; title, provenance, estimate, COA, *Incl. Buyer’s Premium*. | Public page gates numeric sold price behind login. Requires a permitted authenticated or licensed result feed. |
| **Poster Auctions International** | Movies | Titans of Terror 2026 results route | **No usable item** | Public price-guide terms explain buyer-premium-included results and status conventions. | Results page exposed *Past Items (0)*, with no individual movie-lot record. Obtain a direct historical lot/result URL. |
| **Bonhams** | Movies | [Robby the Robot suit and Jeep](https://www.bonhams.com/auction/24465/lot/1070/the-iconic-original-robby-the-robot-suit-and-jeep-from-forbidden-planet/) | **Technically verified** | Auction 24465 / Lot 1070 W; Nov. 21 2017; *Sold for US$5,375,000 inc. premium*. | Public completed-lot pattern supports a low-rate adapter. |
| **ComicConnect** | Comics | [Spider-Man: Redemption #3 cover prelim, item 1107774](https://www.comicconnect.com/item/1107774) | **Technically verified** | Sold on Sep. 17 2026; *Sold For $212.75*; VF 8.0; Marvel; stable item ID; premium wording. | Preserve displayed `Sold For` rather than infer hammer price. |
| **Heritage (Comics)** | Comics | [Murder Incorporated #1, auction 7469 / lot 92196](https://comics.ha.com/itm/golden-age-1938-1955-/crime/murder-incorporated-1-fox-features-syndicate-1948-cgc-fn-65-cream-to-off-white-pages/a/7469-92196.s) | **Partially validated** | Title, lot/auction IDs, sold date, CGC FN+ 6.5/cert, premium wording. | Numeric sold price is sign-in gated. Public contract is metadata-only unless a licensed price feed is authorized. |
| **University Archives** | Autographs | [G.H.W. Bush ALS, Lot 6](https://www.universityarchives.com/auction-lot/g-h-w-bush-als-as-vice-president-psa-gem-mint-10_ed84a299c5) | **Technically verified** | Sold $220; Feb. 21 2024; PSA Gem Mint 10 / PSA-DNA and Reznikoff provenance; stable lot URL. | Keep `Sold` price-basis as unspecified. |
| **Swann** | Autographs | [Warhol/Rauschenberg signed invitation, catalog 2735 Lot 1](https://www.swanngalleries.com/auction-lot/artists-andy-warhol-and-robert-rauschenberg-exhib_441db79027) | **Technically verified** | Auction closed; sold $889; Apr. 9 2026; *Sold Price includes Buyer’s Premium*. | Public detail page is technically sufficient; leave condition/authentication null unless explicit. |
| **RR Auction** | Autographs | [Flannery O’Connor signed document, Lot 311](https://www.rrauction.com/auctions/lot-detail/351366807490311-flannery-oconnor-document-signed-for-o-henry-award-winning-story-greenleaf/?cat=0) | **Technically verified** | Auction 749; closed Sep. 16 2026; sold $1,669; includes buyer premium; PSA/DNA pre-certified. | Public lot-detail contract is sufficient. |
| **Alexander Historical** | Autographs | [Adolf Hitler, Lot 1](https://www.alexautographs.com/auction-lot/adolf-hitler_11041dea23) | **Technically verified** | Auction closed Dec. 4 2024; sold $4,500; detailed condition; source terms separately state 25% buyer premium. | Preserve `Sold` basis; do not infer hammer versus all-in. |
| **Goldin** | Video Games | [1978 Atari Space Invaders Wata 9.4/A++](https://goldin.co/item/1978-2600-atari-usa-space-invaders-sealed-video-game-wata-9-4-aq9ac1) | **Technically verified** | Lot 120; *Lot Sold*; Dec. 9 2021 timestamp; displayed $1,080 plus explicit $900 *Winning Bid*; Wata grades. | Keep displayed total and winning bid as separate fields; price basis for displayed total is not explicit. |
| **Hake’s** | Disney Pins | Results application / Past Auctions route | **No usable item** | Legacy selector referenced Disney Online Only auction; current route said *No Auction Available*. | Obtain one known completed Disney-pin lot URL or approved public query contract before adapter work. |

## Technical readiness count

**Technically ready for a source-specific, read-only adapter after written permission:**

- NGC Auction Central
- CNG Past Auctions
- GreatCollections Archive (archive-card result only; amount partly gated on detail)
- Cherrystone
- Morphy
- Theriault’s
- Bonhams
- ComicConnect
- University Archives
- Swann
- RR Auction
- Alexander Historical
- Goldin

**Needs a second authorized public-record test or licensed access before adapter implementation:**

- CoinArchives, Rumsey, Raritan, Omega Auctions, Bertoia, Propstore, Poster Auctions International, Heritage, Hake’s

## Evidence-policy outcome

Every source remains sandbox-only and **disabled**. The test did not add any public record to Tradebilia, run a recurring/background job, create a database record, modify a user listing, or influence a trade valuation. If activated later, only individual dated, explicit completed sales that pass full item identity, grade, date, currency, duplicate, visual, format, and source-price-basis gates may become valuation candidates.
