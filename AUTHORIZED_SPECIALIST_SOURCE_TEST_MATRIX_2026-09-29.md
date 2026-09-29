# Authorized Specialist Source Test Matrix — 2026-09-29

## Scope
Bounded, read-only public testing after Rich reported full permission to test the adapter code. No login, account creation, form submission, CAPTCHA/access-control workaround, raw-page retention, database write, scheduled collection, production activation, or publication was used.

## Result
Eight of sixteen sources passed the minimum public completed-item contract and are candidates for sandbox-only adapter implementation. Eight are reachable but partial and must remain context-only until their data contracts are resolved.

### Verified adapter candidates

| ID | Source | Category | Public route / key | Important fields and semantics |
|---|---|---|---|---|
| ngc | NGC Auction Central | Coins | https://www.ngccoin.com/auction-central/us/gold-dollars-1849-1889-pscid-54/auctions/1859-g1-pf-ucid-25E2 | NGC Universal ID, realized context, date, price, grade/service, auction/lot. Price is hammer plus commission; USD inferred from US route. |
| cng | CNG Past Auctions | Coins | https://www.cngcoins.com/Lot.aspx?LOT_ID=207893 | LOT_ID, title, Sold For, closing date/time, category, buyer-fee terms. Displayed amount excludes buyer fee; $→USD is source-specific inference. |
| rumsey | Rumsey Auction Results | Stamps | https://www.rumseyauctions.com/auctions/lot/125/2686 | Lot ID, title, Realized state, sale date, realized amount, sale/lot mapping. Excludes 18% buyer premium. |
| morphy | Morphy Auctions | Vintage Toys | https://auctions.morphyauctions.com/LOT_OF_3__TOY_SOLDIERS_SETS_IN_BOXES-LOT657693.aspx | Lot ID, closed date, title/category, final price, USD-symbol context. Final prices include buyer premium. |
| bonhams | Bonhams Popular Culture | Movies | https://www.bonhams.com/auction/27634/lot/122/goldfinger/ | Auction+lot ID, finished state, date, Sold for US$, category, inc. premium. |
| university_archives | University Archives | Autographs | https://www.universityarchives.com/auction-lot/john-adams-signed-receipt-handsomely-displayed_6c96393481 | Stable opaque lot ID, Sold, date, price, category/catalog, 25% direct / 28% LiveAuctioneers premium terms. |
| swann | Swann Galleries | Autographs | https://www.swanngalleries.com/auction-lot/artists-andy-warhol-and-robert-rauschenberg-exhib_441db79027 | Lot/URL suffix, Sold, date, USD display, Autographs category, Sold Price includes buyer premium. |

### Partial sources — keep out of valuation until fixed

| ID | Missing or inconsistent contract |
|---|---|
| cherrystone | Price Realized is strong but sold wording and hammer-vs-all-in basis are ambiguous; 15% commission terms need explicit mapping. https://www.cherrystoneauctions.com/_auction/results.asp?auction=202503&lotnum=1 |
| raritan | No title, explicit currency, per-item URL, or globally stable ID; auction-level date/category only; 15% vs 10% premium terms conflict. https://www.raritanstamps.com/PastAuc/ |
| theriaults | Sold listing exists but currency is symbol-only, price basis is unstated, and category is inferred. https://www.theriaults.com/events/listing/10046/dainty-french-bisque-poupee-with-bisque-arms-and-very-fine-antique-costume |
| poster_auctions | Stable token and premium-inclusive result exist, but reliable rendered sale date and concrete category are missing. https://auctions.posterauctions.com/lots/view/1-8RIJ3C/fantmas-1913 |
| comicconnect | Stable item ID and sold state exist, but currency/basis are not definitive and browse/detail timestamps conflict. https://www.comicconnect.com/item/1107774 |
| rr_auction | Stable ID, closed state, date, and premium-inclusive wording exist; currency and category are inferred from auction context. https://www.rrauction.com/auctions/lot-detail/351378607447333-david-bowie-signed-album-lodger/ |
| alexander_historical | Sold amount/date and premium terms exist, but USD and price basis are inferred/ambiguous; structured category is absent. https://www.alexautographs.com/auction-lot/adolf-hitler_11041dea23 |
| goldin | Sold state, date, category, displayed amount and winning bid exist, but currency and basis are undocumented; apparent 20% premium is inference only. https://goldin.co/item/1978-2600-atari-usa-space-invaders-sealed-video-game-wata-9-4-aq9ac1 |

### Owner-deferred after testing

| ID | Source | Current decision |
|---|---|---|
| omega_auctions | Omega Auctions | Its public test passed, but Rich removed it from the current sandbox source set on 2026-09-29. The historical test evidence remains recorded; no sandbox selection, request, display as an available source, or activation is permitted until Rich explicitly reactivates it. |

## Shared adapter requirements

- Use read-only public discovery and canonical item/lot routes.
- Require item-level sold/realized/closed evidence; never use estimates, opening bids, current bids, or auction-level completion as sales.
- Preserve source ID, stable source key, canonical URL, retrieval timestamp, raw date/time/timezone, category/taxonomy, and terms metadata.
- Model amount, currency, currency confidence, price basis, buyer-premium inclusion, shipping, and tax separately.
- Keep ambiguous currency, price basis, sale status, date, or identity as context-only.
- Attach server-signed canonical provenance before any record can enter valuation.
- Preserve passed, withdrawn, combined, reserve/consignor-bid, and ambiguous records in the audit ledger.
- GreatCollections and Heritage remain deferred by owner and are not tested or activated.

## Existing safety boundary
The current canonical signed adapter registry still contains only: Sold-Comps, The Card API, Cardsight.ai, Lelands, Pristine Auction, PCGS Auction Prices Realized, and 130point. This matrix is a test result, not a claim that the eight verified specialist sources are already valuation-enabled.
