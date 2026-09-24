# HIPStamp API reference for the Tradebilia sandbox

## Verified API contract

The official HIP eCommerce documentation states that HipStamp is accessed at `https://www.hipstamp.com/api`. The active-listings collection is `GET /listings`, not `/listings/active` in the current API implementation. Example:

```text
GET https://www.hipstamp.com/api/listings?limit=25&page=1
```

Authentication can use the `X-ApiKey` header or the `api_key` query parameter. Tradebilia uses the header so the key is not placed in request URLs.

Documented default limits are 10,000 requests per 24 hours and 10 requests per second per API key. The integration is read-only and sandbox-only.

## Observed active-listing response

The live response returned an object with `count`, `type`, `results`, `params`, and `facets`. Listing records included:

- `id`, `name`, `description`, `url`, `images`
- `listing_type`, `active`, `closed`, `quantity`
- `start_price`, `buyout_price`, `current_price`, `currency`
- `username`, `category_id`, `category_path`
- `start_time`, `created_at`, `duration`
- Stamp-specific fields including country, catalog number, stamp type, condition, centering, format, certificate flag, certificate grade, and topic

## Tradebilia source role

HIPStamp active listings are current asking-price and supply context. They are not completed-sale evidence. They must not directly set the deterministic valuation or verdict.

For Stamps, the query should prioritize catalog number, country, issue year when known, denomination, PSE/certification company, and grade. Candidate admission should preserve the exact listing URL, price, currency, listing type, seller, image, and stamp-specific fields. Only USD records with positive prices should enter the displayed price metrics; non-USD records remain excluded from USD metrics with a transparent diagnostic.

## Sold / closed-listing source

The API documents `GET /stores/{username}/listings/closed?show=sold` for closed listings marked sold. This is store-scoped rather than marketplace-wide. The sandbox therefore discovers a bounded set of matching active-listing stores first, then requests only those stores' closed listings with `show=sold`; the results are kept in a separate `HIPStamp Sold / Closed` source and are never combined with active asking prices. Buyer sales at `/sales` and seller sales at `/stores/{username}/sales/all` are account/store scoped and are not used as general market comparables.

The first native authorized test reached the closed-listing route but returned HTTP 401 for the configured API key. The source remains visible with the authorization error surfaced in the UI; no result is treated as sold evidence until the key has the required store-closed-listing permission. This is intentionally not represented as an empty market or a zero-value result.

## Terms and rights boundary

HIP eCommerce terms prohibit crawling, scraping, or spidering pages and state that API use is governed by the API documentation and API Terms of Use. Catalog content may be used solely in connection with HIP eCommerce listings, may be modified or revoked, and may contain third-party copyrighted or proprietary material. The sandbox adapter therefore uses the authorized API key, requests only the minimum page size needed for a lookup, does not scrape HTML pages, does not store HIPStamp data in the database, and labels the result as contextual asking-price evidence.

## Sources

- [HIP eCommerce API basics](https://hip-ecommerce.readme.io/reference/api-basics)
- [HIP eCommerce API documentation index](https://hip-ecommerce.readme.io/llms.txt)
- [Find active listings](https://hip-ecommerce.readme.io/reference/listings)
- [HIPStamp API field values](https://www.hipstamp.com/api-field-values)
- [HIPStamp terms](https://www.hipstamp.com/terms)
