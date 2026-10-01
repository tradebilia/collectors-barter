# Weiss Auctions — Public Source Validation

**Validated:** 2026-10-01  
**Scope:** Test AI sandbox only; bounded, read-only public requests. No login, account creation, form submission, CAPTCHA/access-control workaround, database write, caching, scheduled work, publication, or valuation admission.

## Public routes verified

| Purpose | Public route | Result |
|---|---|---|
| Auctioneer landing and highlights | `https://weissauctions.com/` and `https://weissauctions.com/past-auctions/` | HTTP 200 |
| Completed-auction index | `https://weiss.auction/auctions/completed` | HTTP 200 |
| Browser-visible completed catalog | `https://weiss.auction/auctions/1863966/lots?page=1` | HTTP 200; has a visible **Search lots** field |
| Public completed-lot title search | `https://api-frontend.nextlot.net/api/frontend/v1/sites/2218285/search/lots` | HTTP 200 JSON; no authentication required |

## Verified bounded request contract

The public browser page configures its own NextLot frontend at `https://api-frontend.nextlot.net/api/frontend/v1/sites/2218285`. The browser-visible lot search uses a `GET` to `/search/lots` with these query parameters:

```text
page_number=1
page_size=12
filters=text_search:<title>|auction_completes_at:-1
```

`auction_completes_at:-1` scopes the response to completed auctions. Tradebilia uses only one request, page 1, with a maximum of 12 candidates—no pagination, retries, login, or account access.

## Fields and price semantics

Each public result exposes:

- lot ID, lot number, auction ID, title, description, image URL, and quantity;
- `is_completed` for the lot and parent auction;
- the lot and auction completed timestamps;
- `leading_bid_amount_cents`;
- parent auction `currency_code` and auction name.

The result is admitted as **completed hammer-price context** only when the lot and its parent auction are both completed, a positive final leading bid, an auction-completed timestamp, and explicit `USD` currency are all present. The final leading bid is converted from cents to dollars.

The public completed auction endpoint also exposes `internet_buyer_premium_display_text` (18.0% on the verified catalog). Weiss's published terms describe the online buyer premium as additional to the hammer price. Tradebilia therefore labels the returned amount as a **final hammer bid**, sets buyer premium to **not included**, and does not calculate an all-in amount.

## Two live completed-item checks

| Item | Public record facts | Outcome |
|---|---|---|
| Columbian Exposition 1c to 30c Mint | Lot ID `53801602`, auction `1863966`, lot and auction completed, `USD`, `leading_bid_amount_cents: 6000` | Final hammer bid $60 |
| Marvel Incredible Hulk #2 (1962) CGC 5.5 | Lot ID `48137391`, auction `1803422`, lot and auction completed, `USD`, `leading_bid_amount_cents: 280000` | Final hammer bid $2,800 |

## Test AI policy

- Weiss is available only where a titled inventory item is otherwise eligible.
- Returned candidates receive deterministic identity and grade/company checks; mismatches remain visible as context with their exclusion reason.
- Every Weiss row remains **context-only** (`valuationEligible: false`). It cannot influence valuation, recommended trade terms, or the final AI conclusion.
- If the public request later returns HTTP 403, the established sandbox policy requires full removal from all marketplace selectors rather than a disabled display.
