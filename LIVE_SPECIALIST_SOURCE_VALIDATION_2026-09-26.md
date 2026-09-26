# Live Specialist Source Validation — Two-Pass Matrix

**Date:** 2026-09-26
**Scope:** Trade Analyzer 2.0 isolated Test AI sandbox only.
**Authorization used:** The owner reported authorization to test each source until its public completed-item contract was understood, then run a different-item check.
**Boundaries observed:** Ordinary public page requests only; no login, account creation, form submission, purchase, CAPTCHA/access-control workaround, aggressive retry, automated collection, raw-page retention, database write, scheduler, or production change.

## Final result

| Final public-contract status | Sources | Meaning |
|---|---:|---|
| **Verified on two distinct items** | **16** | Two genuinely different public completed items supplied title, stable identifier/URL, explicit completed state, date, numeric price/currency, and source price-basis wording. |
| **Partial / inconsistent public contract** | **5** | A real result exists, but a required field is gated, absent, or not consistently available across public item routes. |
| **No public individual completed-item contract** | **1** | Public access exposes auction-level information but not a usable completed individual-lot result. |

> **Status:** Every source still remains **permission pending**, disabled in Test AI, remote-lookup-disabled, sandbox-only, and valuation-blocked. Technical validation does not authorize recurring collection or make a source eligible to affect a Tradebilia value.

## Two-pass source matrix

| Source | Category | Distinct item checks | Final status | Public contract / exact limitation |
|---|---|---|---|---|
| **NGC Auction Central** | Coins | 1986 Eagle S$1 MS (UCID 26J4); 1995-W Eagle Anniversary Set S$1 PF (UCID CFWX) | **Verified** | Both NGC *Prices Realized* pages exposed UCID, sale/lot, date, USD price, grade, and the stated hammer-plus-auction-house-commission basis. |
| **CoinArchives** | Coins | Public archive and auction record routes | **Blocked** | Public archive is auction-level; attempted records redirect to auctioneer sites and individual completed lots/prices are gated to **CoinArchives Pro**. No public item contract exists. |
| **CNG Past Auctions** | Coins | LOT_ID 207893 / Lot 6005 Denarius; LOT_ID 173558 / Lot 1 Tetradrachm | **Verified** | Both public lot pages supplied distinct IDs, title, explicit *Sold For*, date, USD price, grade/condition, and buyer-fee exclusion. |
| **GreatCollections Archive** | Coins | 1795 Capped Bust Eagle (GC 1350274); 1894-O Morgan Dollar (GC 1779627) | **Partial** | Archive cards can show a realization, but individual completed-item pages hide the numeric final price behind **Join**. The second item exposed only its $1 starting bid. A universal public per-lot price contract is not proven. |
| **Rumsey Auction Results** | Stamps | Sale 127 Lot 1001; Sale 127 Lot 2772, *United States Collection, 1847–2015* | **Verified** | The direct public lot route supplied title, stable sale/lot URL, *Realized* state, date, USD amount, and explicit 18% premium exclusion. |
| **Cherrystone Realizations** | Stamps | Auction 202503 Lot 1; Auction 202502 Lot 5001 | **Verified** | Both public result detail pages exposed title, stable auction/lot URL, sale date, dollar *Price Realized* amount, and available item details. |
| **Raritan Past Auctions** | Stamps | Auction 105 Lot 2; Auction 104 Lot 598 | **Verified** | Auction 104 Lot 598 publicly joined title, stable auction/lot key, *Sold for US$3,750*, date, and 15% premium exclusion. This confirmed the earlier missing title/currency was a route-specific problem, not a source-wide blocker. |
| **Omega Auctions** | Music | Beatles Autograph Book Lot 302; Sex Pistols *Never Mind the Bollocks* Lot 793 | **Verified** | A direct public completed-lot page exposed stable lot ID/URL, title, *Sold*, auction date, £1,100, and **Hammer Price** wording. |
| **Bertoia Auctions** | Vintage Toys | Spring Signature 2025 Lot 43; Holiday Exclusive 2024 Lot 24 | **Partial** | Official PDFs expose lot, date, dollar amount, and 20% premium-included wording; public catalog routes render unhydrated template placeholders rather than a reliable title-to-lot join or canonical completed-lot page. |
| **Morphy Auctions** | Vintage Toys | Hansel & Gretel Cast Iron Bank Lot 1001; Japanese Smoking Robot Lot 2414 | **Verified** | Both public closed-lot pages exposed title, stable ID, completed date, USD final price, **Final prices include buyers premium**, and condition. |
| **Theriault’s Archive** | Vintage Toys | Schoenhut Arabian Camel listing 87064; Iki-ningyo Peddler listing 706 | **Verified** | Both public archived records exposed title, stable listing/lot ID, sold state, event date, dollar amount, and available condition context. |
| **Propstore** | Movies | *Cast Away* Wilson Stock 139035; *Jurassic Park* Mosquito in Amber Lot 208869 | **Partial** | A public top-seller/results route exposes title, stable ID, *SOLD FOR*, date, and $403,200; ordinary completed lot pages gate the winning price behind login. The public price field is therefore inconsistent. |
| **Poster Auctions International** | Movies | *Die Rache im Goldtal* Lot 239; *Godzilla: King of the Monsters* Lot 129 | **Verified** | The official `posterauctions.com` archive—not the older client-rendered host—returned two public film-poster results with title, stable lot route, date, dollar result, and buyer-premium context. |
| **Bonhams Popular Culture** | Movies | *Forbidden Planet* Robby the Robot Lot 1070; Theda Bara as Cleopatra Lot 78 | **Verified** | Both public lot pages exposed title, stable auction/lot ID, date, *Sold for US$* result, and **inc. premium** wording. |
| **ComicConnect Sold Archive** | Comics | *Spider-Man: Redemption #3* cover prelim item 1107774; *New Warriors #68* half splash item 1107787 | **Verified** | Both public item pages exposed ID, title, explicit sold time/status, USD *Sold For* amount, grade, and premium wording. |
| **Heritage Auction Archives** | Comics | *Murder Incorporated #1* auction 7469 lot 92196; *Adventure Comics #78* auction 122132 lot 13020 | **Partial** | Both public pages supplied title, stable identifiers, sold date, grading/certification, and buyer-premium language—but numeric realized prices are consistently **Sign-in/Join-gated**. |
| **University Archives** | Autographs | G.H.W. Bush ALS Lot 6; Abigail Adams cover Lot 2 | **Verified** | Both public lots supplied title, stable URL, explicit *Sold* amount in USD, date, and available authentication/grading context. |
| **Swann Galleries** | Autographs | Warhol/Rauschenberg invitation Lot 1; Lafayette ALS Lot 18 | **Verified** | Both public lots supplied catalog/lot ID, title, auction-closed/sold state, date, USD amount, and **Sold Price includes Buyer’s Premium** wording. |
| **RR Auction** | Autographs | Flannery O’Connor document Lot 311; Jacob Grimm note Lot 292 | **Verified** | Both public lot-detail pages supplied title, stable lot ID/URL, closed state, date, USD *Sold For* amount, **Includes Buyers Premium**, and available PSA/DNA context. |
| **Alexander Historical Auctions** | Autographs | Adolf Hitler Lot 1; *Memphis Belle* Lot 9 | **Verified** | Both public historical lots supplied title, lot ID, closed auction date, USD *Sold* price, and condition/buyer-premium context. |
| **Goldin Video Game Auctions** | Video Games | Atari *Space Invaders* Lot 120; Atari *Pac-Man* Lot 121 | **Verified** | Both public lots exposed title, lot ID/URL, *Lot Sold* status, timestamp, dollar price/winning-bid fields, and Wata grade. The displayed total and explicit Winning Bid remain distinct fields. |
| **Hake’s Auction Results** | Disney Pins | Rapunzel Pin inventory 89764 / Lot 1886; Mickey Silver Pin route 282853 | **Partial** | The legacy Rapunzel LotDetail page supplied a full completed record. A different later public pin route supplied title, closed state, and price but not a retrievable end date or stable canonical page. The public contract is inconsistent. |

## What can be built after formal activation approval

The following **16 technically validated sources** can move to source-specific, rate-limited, read-only sandbox adapter work once the required written authorization and request contract are recorded:

1. NGC Auction Central
2. CNG Past Auctions
3. Rumsey Auction Results
4. Cherrystone Realizations
5. Raritan Past Auctions
6. Omega Auctions
7. Morphy Auctions
8. Theriault’s Archive
9. Poster Auctions International
10. Bonhams
11. ComicConnect
12. University Archives
13. Swann Galleries
14. RR Auction
15. Alexander Historical Auctions
16. Goldin Video Game Auctions

## Remaining technical/access blockers

| Source | Required resolution before a price-capable source adapter |
|---|---|
| **CoinArchives** | A permitted individual-lot results path, formal Pro/API/export access, or a licensed feed; public archive pages are auction-level only. |
| **GreatCollections** | A documented endpoint/feed that supplies a realization to a public/authorized detail record consistently; public detail pages gate final price. |
| **Bertoia** | A rendered public/API/PDF catalog mapping individual titles to realized lot numbers, plus explicit currency treatment. |
| **Propstore** | A source-sanctioned results feed or allowed authenticated export for ordinary lots; public top-seller data is not a universal contract. |
| **Heritage** | A licensed prices-realized feed/export or explicitly authorized access that provides the currently sign-in-gated numeric price. |
| **Hake’s** | A stable public legacy/current completed-lot route that reliably provides end date, canonical URL, price, and complete price-basis wording. |

## Evidence-policy outcome

No live source data was retained in Tradebilia, sent to users, stored in the database, scheduled, or allowed to influence a valuation. On activation, each source still must pass source-specific identity rules and Tradebilia’s existing completed-sale, date, currency, duplicate, visual, grade/company, format, and price-basis gates before an individual observation can become a valuation candidate.
