# Hake’s Historical Search Research — October 17, 2026

## Verified findings

The current adapter fetches `https://www.hakes.com/auctions/past`, takes the first four catalog links, and parses their first bounded lots without sending the structured query to Hake’s. This explains unrelated G.I. Joe results when the requested item is The Amazing Spider-Man.

Hake’s official past-auction page exposes closed auction catalog links, including the October 2026 G.I. Joe, October 2026 Comics and Art, Fall Political Americana, and September 2026 Pop Culture catalogs:

- [Hake’s Past Auctions](https://www.hakes.com/auctions/past)

Hake’s catalog pages accept a `search` query parameter. The verified request below returned one matching Amazing Spider-Man #238 catalog result from the October 2026 Comics and Art catalog:

- [Hake’s catalog search for Amazing Spider-Man #238](https://www.hakes.com/auctions/hakes-auctions/october-2026-comics-and-art-online-exclusive-auction-24756/catalog?search=The%20Amazing%20Spider-Man%20238%201983)

The global Hake’s `/search` route is not reliable for exact issue searches in this environment: `Amazing Spider-Man` returned 40 results, while `Amazing Spider-Man 238` returned zero. The catalog-level search is the verified path for exact historical catalog filtering.

Hake’s newer Bidsquare lot pages may show `Login for Price` even when the auction is closed, so the adapter must retain those matching lots as context with an explicit hidden-price reason rather than labeling them as unrelated or inventing a realized value:

- [Hake’s closed Amazing Spider-Man #22 lot](https://www.hakes.com/online-auctions/hakes-auctions/amazing-spider-man-22-march-1965-cgc-5-0-vg-fine-9870987)

Hake’s older archive pages can expose a public realized amount, including buyer-premium semantics. For example, an official archived Amazing Spider-Man lot reports a `$303.73` winning bid and states that it includes an 18% buyer’s premium:

- [Hake’s archived Amazing Spider-Man lot](https://www.hakes.com/Auction/ItemDetail/272166/AMAZING-SPIDER-MAN-COMIC-LOT-OF-71-ISSUES)

## Implementation boundary

Use the public past-auction catalog `search` parameter, limit the number of catalogs and detail pages, retain only identity-compatible lots, and inspect matching lot pages for explicit sold/realized/winning-bid text. Keep Hake’s records context-only and never add them to valuation.
