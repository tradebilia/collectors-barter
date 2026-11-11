# eBay Active field audit — 2026-11-10

## Official provider documentation

Sources:

- eBay Browse API Search: https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search
- eBay Browse API Get Item: https://developer.ebay.com/api-docs/buy/browse/resources/item/methods/getItem

The Search endpoint returns active item summaries. The documented active-listing facts include `itemId`, `itemWebUrl`/affiliate URL, title, price/currency, condition, seller/category/aspects when requested, `buyingOptions`, and auction-related fields such as `bidCount`, `currentBidPrice`, and `uniqueBidderCount`. The Search API defaults to listings with `FIXED_PRICE`; auction listings can be included with a `buyingOptions` filter. The documentation also supports date sorting by listing origin date or scheduled end date. Get Item exposes additional active-listing detail and lists `itemCreationDate`, `itemWebUrl`, price, current bid, estimated availability and other live-state fields in its compact response.

These are listing facts, not proof of a completed sale. eBay Active does not provide a completed transaction price or a sale event for an active listing. An asking price or current bid must not enter the completed-sales primary valuation pool.

## Local adapter coverage

`server/ebayMarketplaceCandidate.ts` currently normalizes:

- provider identity: `itemId` (fallback `saleId`/`id`)
- listing URL: `itemWebUrl` (fallback `itemUrl`/`url`)
- title, condition, seller
- price and currency, including current bid fallback
- active status and `asking` price basis
- listing/end date aliases
- image aliases and item specifics/aspects/details

`server/testAIRouter.ts` also carries active listing type, bid count, unique bidders, current bid, item end date, metadata ranking, images, and item URL in the visual-review transport.

## Current Tradebilia behavior

The final completed-sale normalizer intentionally rejects active eBay rows from primary valuation because it requires `saleStatus === completed` and a sold/realized/closed price basis. This is correct for completed-sales valuation but the current generic blocker projection is misleading: it describes missing sale/provenance/approval facts as if an active listing failed a completed-sale admission test.

The desired policy is:

1. A visually and structurally matching eBay Active listing remains visible as current-market context.
2. Its asking price/current bid can contribute only a small, explicitly labeled current-market signal or narrative context, never the sold-comps primary value.
3. The UI should say “Current eBay listing context — not a completed sale; not used in primary valuation,” rather than “post-visual failure” or a chain of completed-sale blockers.
4. Provider identity, URL, price, currency, buying option, bid count, current bid, seller, condition and available active dates should be preserved for audit. Missing sale date is not a defect for an active listing; there is no sale event to date.
5. A true visual mismatch, missing/invalid price, unsupported currency, lot/bundle conflict, missing provider identity/URL, or failed visual execution remains a real blocker and should be reported separately.

No external provider requests or database writes were made during this audit.
