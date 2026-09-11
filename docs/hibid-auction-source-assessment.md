# HiBid Auction-Source Feasibility Assessment

**Decision:** **Do not incorporate, execute, copy, or adapt either reviewed project into Tradebilia.** Both approaches acquire HiBid data through methods that conflict with HiBid’s published Terms of Use, and neither repository grants a software license for code reuse. No HiBid integration code has been added to Tradebilia.

## Executive assessment

The two projects demonstrate that HiBid auction information can be technically observed, but that is not the same as having a production-safe, authorized data source. The RiseHaza project points to a hosted scraper that advertises proxy-based automated extraction. The CarsonKopec project is a browser extension that calls an undocumented GraphQL endpoint and intercepts a logged-in user’s in-memory bearer token. Both are unsuitable for Tradebilia’s server-side Test AI product.

HiBid’s own Terms allow access for auction participation and viewing items for potential bidding or purchase, but explicitly prohibit scraping, automated data collection, copying or commercial reuse of Auction Information, and bypassing access restrictions. The terms apply to both current and historical auction information. [1]

> **Practical conclusion:** The technical ideas are interesting, but the data-access methods are not an acceptable foundation for Tradebilia.

## Repositories examined

| Project | Observed design | Useful insight | Blocking concern | Integration decision |
|---|---|---|---|---|
| [RiseHaza/hibid-auction-listings-scraper][2] | A one-commit GitHub repository whose README links to a paid Apify actor for HiBid lot and search-result extraction. The linked actor advertises keyword/URL scraping, retries, residential proxies, and structured output. [2] [3] | It identifies a sensible auction-evidence shape: auction house, lot identifier, bid, closing date, sale state, location, and source URL. | Its advertised mechanism is automated scraping, including residential proxies to avoid detection. That conflicts directly with HiBid’s published restriction on scraping and automated means. It also has no declared software license. | **Reject.** Do not run or integrate it. |
| [CarsonKopec/Auction-Tracker][4] | A Chrome extension, not a server data service. Its HiBid adapter sends requests to an undocumented GraphQL endpoint and its MAIN-world script intercepts the bearer token used by the user’s HiBid page. [4] | Its general concepts—normalized lot records, explicit staleness, error handling, and read-only presentation—are reasonable design ideas for an **authorized** data connector. | It relies on token capture and non-public request behavior. It has one commit, no releases, no declared license, and an architecture incompatible with a shared server-side Test AI source. | **Reject.** Do not copy code, request user tokens, or replicate the access method. |

## Why direct incorporation is not viable

### 1. HiBid’s written restrictions are explicit

HiBid prohibits web scraping, web harvesting, web data extraction, robots, spiders, data-mining tools, automated means of access, and commercial reuse or redistribution of its Auction Information. It also prohibits bypassing measures used to prevent or restrict access. [1]

The RiseHaza actor advertises precisely the prohibited behavior: scalable data extraction and proxy use. The CarsonKopec extension accesses HiBid through reverse-engineered GraphQL calls and captures an authentication token from page traffic. Even if either happens to work today, production use would be exposed to access loss, account issues, data-rights claims, and user-security concerns.

### 2. The projects are not reusable open source

Neither reviewed repository declares a license or includes a license file. GitHub’s own guidance states that, without a license, default copyright rules apply and others may not reproduce, distribute, or create derivative works. [5]

That means Tradebilia should not copy their implementation, even apart from the HiBid access restrictions. We can independently apply broad product principles—such as labeling stale results and maintaining read-only behavior—but not reuse their code or proprietary data-access mechanics.

### 3. The data would need careful market interpretation

Even with an authorized feed, active auction bids should not be treated as final market value. A current bid can change before closing and may exclude buyer’s premium, tax, shipping, reserve effects, or auction-house-specific terms. Closed-lot results are more useful evidence, but still require a confirmed final-price field, sale date, grade/condition match, auction state, and clear attribution.

| Evidence type | Appropriate Test AI treatment | Must not be presented as |
|---|---|---|
| Open auction current bid | **Live auction signal** with close time, auction house, and clear “not final” treatment | A completed comp or a valuation conclusion |
| Closed auction with confirmed hammer/final result | **Completed auction evidence** with sale date and source link | Proof of universal market value |
| Auction lot with an estimate only | **Seller/auction estimate** | A sale price |
| Any result without a confirmed data license | Not displayed or stored by Tradebilia | A production Test AI source |

## Recommended path: an authorized, read-only connector

The correct next step is to contact HiBid/402 Ventures or Auction Flex and request written authorization for a Tradebilia data integration. The request should seek a documented API or data-feed agreement that explicitly covers search, display, retention, source attribution, rate limits, current lots, closed results, and commercial use in a collector marketplace.

If authorization is granted, Tradebilia should implement a new server-side source that uses only the approved credential and documented endpoint. It should never accept a member’s HiBid credentials, bearer token, or browser session data. The provider connector should remain **read-only** and should not create bids, prefill bids, track user auctions, or scrape the public website.

### Proposed approved-data contract

| Field | Purpose in Test AI |
|---|---|
| `source` and `sourceUrl` | Attribute the authorized HiBid result and allow a collector to open the original lot. |
| `lotId`, `auctionHouse`, and `auctionTitle` | Establish source identity and prevent duplicate evidence. |
| `title`, `description`, `category`, and `lotNumber` | Support title/identity matching. |
| `auctionState`, `closeAt`, and `observedAt` | Distinguish live signals from completed evidence and show freshness. |
| `currentBid`, `hammerPrice`, `buyerPremium`, and `currency` | Present pricing truthfully, with incomplete values clearly flagged. |
| `shippingOffered` and location fields | Show collector-relevant logistics without treating them as price data. |
| `matchScore` and match reasons | Explain why Test AI considers a lot relevant while allowing the collector to review it. |

### Release gates before implementation

1. Obtain written permission or a commercial data license that allows Tradebilia’s intended use.
2. Use only a documented provider contract and server-held credential; do not scrape, reverse-engineer, or capture user tokens.
3. Confirm rights for public display, deep links, screenshots/images, historical retention, and price analytics.
4. Treat open-auction bids separately from closed realized prices, including buyer-premium semantics.
5. Add provider-rate limiting, caching only within authorized retention limits, source attribution, failure telemetry, and tests for `not connected`, `no match`, `partial data`, and `rate limited` states.
6. Keep the feature read-only and behind an explicit source label such as **“HiBid auction evidence — authorized feed.”**

## Bottom line

The projects are useful **research references**, not integration candidates. The right move is an approved HiBid/Auction Flex data relationship. If that is unavailable, Tradebilia should not add HiBid auction data to Test AI rather than building a brittle, prohibited scraper around it.

## References

[1]: https://hibid.com/home/termsofuse "HiBid Terms of Use"
[2]: https://github.com/RiseHaza/hibid-auction-listings-scraper "RiseHaza HiBid Auction Listings Scraper"
[3]: https://apify.com/ecomscrape/hibid-auction-listings-scraper "Apify HiBid Auction Listings Scraper"
[4]: https://github.com/CarsonKopec/Auction-Tracker "CarsonKopec Auction Tracker"
[5]: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository "GitHub: Licensing a Repository"
