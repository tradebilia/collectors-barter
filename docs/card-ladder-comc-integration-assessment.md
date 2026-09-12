# Card Ladder and COMC Test AI Integration Assessment

## Card Ladder — Official-source findings

Card Ladder’s public materials position Sales History as a subscription feature for researching historical card sales. Its help documentation says the data can include seller feedback, images, listing type, and a current estimated value. The documented search UI supports certification-number lookup and filters for price, date, platform, listing type, seller ID, and verification status. Sources: https://www.cardladder.com/pro-features/sales-history and https://cardladder.zendesk.com/hc/en-us/articles/23672925718935-How-to-Search-Sales-History.

The published pricing page lists Pro at $20 per month or $200 per year and places all-time sales history, Card Ladder value, advanced search, compare, population reports, and related research features behind the Pro tier. Source: https://www.cardladder.com/pricing.

The current Terms of Use, dated December 30, 2024, permit personal, non-commercial use only and prohibit commercial reproduction, database population, scraping, automated retrieval, data mining, and reverse engineering unless Card Ladder provides advance written authorization. Source: https://www.cardladder.com/terms.

### Initial implication

Card Ladder could be a high-value Test AI completed-sales source for sports and trading cards, especially because its documented search filters map well to inventory attributes and grade/certification workflows. However, a personal Pro subscription, browser login, private endpoint, or scraper would not be an acceptable Tradebilia integration path. Any implementation requires a written commercial data license or partner API/feed agreement that expressly permits server-side retrieval, display, caching, attribution, and Test AI use.

Card Ladder’s homepage claims 100M+ historical sales covering sports, TCG, and non-sports cards, sourced from eBay, Goldin, Heritage, Fanatics, and other named marketplaces. It also says a research team vets thousands of sales daily and that the platform has population reports from PSA, BGS, SGC, and CGC. Source: https://www.cardladder.com/.

## COMC — Research pending

COMC’s official History Points documentation confirms that it offers historical-sales data for a per-product, time-limited account entitlement. It says one History Point is spent when a user clicks an asking price, and that the entitlement covers all conditions of that product for 24 hours. COMC states it intentionally withholds price information while an item remains in its possession, but once shipped calculates the buyer’s all-in purchase price (including apportioned shipping) for the historical data. Source: https://comc.zendesk.com/hc/en-us/articles/6036952365595-What-are-History-Points-and-How-are-they-Used.

COMC’s User Agreement says it may provide suggested retail/listed/wholesale prices and past sales data as informational content. The page is currently CAPTCHA protected in the browser, but the public text was available for review and requires further targeted review for automated-access and commercial-reuse terms. Source: https://www.comc.com/UserAgreement.

COMC’s Sales Chart documentation describes a signed-in account feature that exposes quarterly sale quantities for a specific card across the past four years. Its associated Sales Data pop-out requires History Points and, according to the documentation, shows only the highest-ever sold price rather than a full sale-by-sale history. Source: https://comc.zendesk.com/hc/en-us/articles/7154073803163-The-COMC-Sales-Chart.

The User Agreement says COMC owns its technology, images, data, marks, and related intellectual property; it also prohibits unauthorized reproduction, publication, further distribution, and public exhibition of provided materials or information. Source: https://www.comc.com/UserAgreement.

### Initial implication

COMC has potentially useful shipped-sale evidence and current marketplace signals for cards and related collectibles, but its History Points design is an account entitlement, not an announced server-to-server developer product. A Tradebilia integration must not consume a member’s points, account session, or browser access. It would require COMC’s written commercial authorization for a partner API/feed, including completed-sale rights, current-listing rights, display/caching terms, attribution, image rights, request limits, and support.

The public COMC Suggested Prices page was protected by a Cloudflare challenge during this review. Its public search snippet says COMC analyzes historical sales to provide Suggested Retail, Listed, and Wholesale pricing, but this unverified snippet should not be treated as an integration specification. No public COMC developer portal or partner API documentation was found in the official-domain searches performed for this assessment.

## Parse.bot is not an authorization substitute

Parse.bot publicly describes itself as a web-scraping API. Its Card Ladder marketplace page explicitly says it is an independent REST wrapper, not an official Card Ladder API. The page advertises card search, values, certificate lookup, detailed sales, and index endpoints, but it does not establish that Card Ladder grants commercial redistribution rights to downstream users. Source: https://parse.bot/marketplace/5554022d-8a04-46d0-b2c5-56f3b5abcea2/cardladder-com-api.

This conflicts with Card Ladder’s published personal/non-commercial use rule and its prohibition on database population and automated collection without written authorization. Therefore, Tradebilia should not use Parse.bot’s Card Ladder endpoint unless Card Ladder separately gives Tradebilia written authorization covering this exact use. A Parse.bot subscription or API key alone is insufficient.

The Parse.bot COMC listing returned a 404 during this review. It should not be considered an available, stable, or authorized integration channel. Source checked: https://parse.bot/marketplace/9e6225ee-52f3-42c6-a13c-35d4c5902c662/comc-com-api.

## Authorized outreach routes

Card Ladder’s published Terms and pricing pages list `contact@cardladder.com` for questions. COMC’s official Contact Us page directs inquiries to `staff@comc.com` and its Help Center request form. Neither route is advertised as a public developer portal, so the initial request should explicitly ask for a commercial data license or approved partner API/feed. Sources: https://www.cardladder.com/terms, https://www.cardladder.com/pricing, and https://www.comc.com/ContactUs.

The inquiry should request written confirmation of: (1) server-to-server credential type; (2) eligible datasets and field definitions; (3) completed-sale versus active-listing rights; (4) display, caching, and retention rights; (5) mandatory attribution and image restrictions; (6) rate limits and bulk-use rules; (7) error/support/change-notice expectations; and (8) a clear commercial Test AI/Trade Analyzer use grant. No code should be written or provider credentials requested until these conditions are documented.

## Comparative assessment for Test AI

| Decision factor | Card Ladder | COMC | Test AI implication |
|---|---|---|---|
| **Best category fit** | Sports cards, Pokémon/TCG, and non-sports cards | Sports cards and adjacent collectibles listed in COMC’s marketplace | Card Ladder is the broader strategic fit for the existing Sports Cards and Pokémon Test AI paths. |
| **Completed-sale depth** | Card Ladder claims 100M+ historical sales across many marketplaces, including eBay, Goldin, Heritage, and Fanatics, with daily vetting. | COMC offers shipped-sale history, but its documented user view emphasizes a highest-ever sale and a four-year quarterly quantity chart. | Card Ladder has the clearer potential to add robust cross-market comparable sales. COMC looks supplementary rather than a primary comps source. |
| **Exact-match signals** | Official user interface supports certificate-number lookup and filtering by date, price, platform, listing type, seller, and verified status. | The reviewed official material describes data access at the product/listing level, but not an equivalent public exact-cert or grade-matching API. | Card Ladder is better suited to grading-company, grade, certificate, card number, player, set, and variation matching. |
| **Incremental value beyond eBay** | High, but must deduplicate: it includes eBay plus auction and marketplace coverage not present in a single eBay source. | Moderate for direct COMC marketplace evidence; lower for sale-history breadth based on the documented consumer feature. | Card Ladder can materially improve comp coverage; COMC should not be used to inflate a valuation with duplicate or unshipped activity. |
| **Current asking-price evidence** | Not the principal value proposition in the public materials reviewed. | Potentially useful for active COMC asking-price inventory, if licensed. | Asking prices must remain labeled as asks, never as sold comps or fair-trade proof. |
| **Official public developer path found** | No official public developer portal, API documentation, or data-license page was found in the official sources reviewed. | No official public developer portal, API documentation, or partner data-feed documentation was found in the official sources reviewed. | Do not build against private endpoints, browser sessions, account entitlements, or independent wrappers. |
| **Contractual posture** | Personal, non-commercial access only; commercial reuse, database creation, scraping, data mining, and automated collection are prohibited without advance written approval. | COMC owns the applicable images and data and prohibits unauthorized reproduction, publication, further distribution, and public exhibition. | Both require a direct written commercial agreement before implementation. |
| **Recommended priority** | **Priority 1, conditional on a license** | **Priority 2, conditional on a license** | Pursue Card Ladder first; consider COMC only if commercial terms and data fields are favorable. |

## Card Ladder: value and constraints

Card Ladder is potentially the most valuable additional **completed-sales evidence source** for Test AI’s Sports Cards and Pokémon paths. Its official site claims a large, cross-market sales database with coverage extending beyond eBay, and its official help documentation confirms that its user-facing search supports filters that map naturally to Tradebilia’s structured inventory fields: date, price, selling platform, listing type, seller, verification status, and certificate number with a grading company.[1] [2]

This would be especially useful when an eBay-only search has too few clean comps, or when a collectible’s strongest evidence sits in specialty auctions. It may also allow Test AI to surface source-platform diversity, a recent-sale distribution, and exact-card certification evidence. However, because Card Ladder says it includes eBay data, Test AI must deduplicate sales using source-platform, source-sale identifier/URL, date, price, and title before any summary is shown. Otherwise, one eBay sale may appear once from the current eBay/Sold-Comps flow and again from Card Ladder.

The downside is decisive: Card Ladder’s terms permit personal, non-commercial use only and forbid commercial reuse, systematic database creation, and automated collection without prior written authorization.[3] A Card Ladder Pro membership is therefore **not** an integration license. The independent Parse.bot wrapper is also unsuitable: it describes itself as an independent wrapper, not an official provider API.[4]

> **Recommendation:** Seek a Card Ladder commercial data agreement before building. If granted, make it a **sports-card and Pokémon completed-sales source**, not a generic all-category source and not a replacement for eBay. It should be introduced behind a provider feature flag with attribution, source links, sale-date display, duplicates suppressed, and a clear “market evidence, not a guarantee of value” notice.

### Minimum Card Ladder data contract to request

| Required field or right | Why Test AI needs it |
|---|---|
| Stable sale ID and canonical sale URL | Deduplicates sales already returned through eBay or other evidence providers. |
| Sale price, currency, sale date, and selling platform | Builds dated, source-labeled completed-sale evidence. |
| Listing title, card identity, year, set, card number, player/character, variation, and card type | Supports match scoring against Tradebilia inventory. |
| Grader, grade, certification number, and a verified indicator where available | Allows strict exact-grade and exact-cert analysis. |
| Listing type and price semantics | Distinguishes auction, fixed price, best offer, accepted offer, and other sales contexts. |
| Display, caching, retention, and commercial AI-use rights | Prevents a technically successful but contractually invalid integration. |
| Required attribution and image rights | Keeps Test AI compliant; omit images by default if image rights are not explicitly granted. |

## COMC: value and constraints

COMC can add a different kind of evidence: direct marketplace availability and shipped-sale context from a large consignment marketplace. Its official History Points documentation is careful about the price definition. It says COMC does not release sale prices while it still holds an item; after shipment, it calculates the buyer’s total purchase price, including apportioned shipping, for historical data.[5] This is stronger than treating a seller’s current asking price as a completed sale, but it still needs unambiguous labeling because the recorded price is an all-in buyer cost rather than simply the seller’s item proceeds.

COMC’s consumer sales chart provides quarterly sale quantity for the prior four years, while the History Points sales view provides the highest-ever sale price; the documentation does not describe a public sale-by-sale data feed for third parties.[6] That makes COMC’s documented historical product less useful for Test AI’s exact, recent-comp analysis than Card Ladder’s stated cross-market sales-history offering.

COMC’s User Agreement also reserves ownership of its images and data and prohibits unauthorized reproduction, publication, further distribution, and public exhibition.[7] Its official pages reviewed do not document a public developer API or commercial data feed. As a result, a COMC account, purchased History Points, a user’s account session, or an independent scraping wrapper must never be used as Tradebilia’s data path.

> **Recommendation:** Do not prioritize COMC for a Test AI build until an authorized commercial feed is available. If COMC offers one, use it as an **optional, separately labeled source**: current COMC listings as asking-price context and shipped COMC history as completed-sale context. Do not merge either silently into an eBay-based value statistic.

### Minimum COMC data contract to request

| Required field or right | Why Test AI needs it |
|---|---|
| Explicit `asking` versus `completed_shipped` sale state | Prevents present listings from being misrepresented as sale evidence. |
| All-in buyer price versus seller proceeds definition | Allows the Test AI panel to state exactly what the historical price means. |
| Sale date, current status, stable item/product identifier, and canonical URL | Enables recency handling, duplicate detection, and auditability. |
| Item identity fields, grader, grade, certificate, and condition | Supports defensible item matching. |
| Current quantity/availability if licensed | Can be displayed as market liquidity context, not a valuation result. |
| Commercial display, retention, attribution, and image rights | COMC’s agreement makes these rights essential. |

## Recommended Test AI evidence model if a license is secured

The integration should use the same disciplined source model already applied to eBay: every record must retain its provider, source URL, source sale identifier, evidence type, exact-match confidence, date, price semantics, and freshness. The Trade Analyzer should never produce a single blended “value” by mechanically averaging all providers.

| Evidence type | Examples | How Test AI should handle it |
|---|---|---|
| **Completed sale** | Card Ladder licensed sale record; COMC licensed shipped sale; eBay sold result | Eligible for dated comp analysis after identity matching and deduplication. |
| **Active asking price** | COMC active listing; eBay fixed-price listing | Show separately as supply/asking context; never blend into completed-sale average. |
| **Provider estimate / guide value** | Card Ladder value or COMC suggested price, if licensed | Show as a provider estimate with methodology/source context; never represent it as a verified sale. |
| **Identity / certification evidence** | Certificate match, grade, card number, variation, population data | Raises or lowers match confidence; does not create a monetary value on its own. |

For Card Ladder, a reliable matching sequence would be: certificate number and grader when available; otherwise year + set + player/character + card number + variation + grading company + grade. For COMC, the integration should require a high identity threshold before treating a shipped sale as a comparable. Ambiguous title-only matches should remain visible as “possible matches,” not be included in a summary calculation.

## Bottom-line recommendation

| Provider | Build now? | Business value if licensed | Decision |
|---|---:|---:|---|
| **Card Ladder** | No — not until written commercial authorization and credentials are provided. | **High** for sports-card, Pokémon, and non-sports-card comps because of cross-market, certificate-aware research potential. | **Pursue first.** |
| **COMC** | No — not until written commercial authorization and credentials are provided. | **Medium** as a direct-marketplace supplement; its public historical feature appears more limited for exact recent-comp analysis. | **Pursue only after Card Ladder or if COMC offers unusually favorable licensed data rights.** |
| **Parse.bot wrappers** | No. | Technically broad but contractually unsuitable without each underlying provider’s direct written permission. | **Reject as a production source.** |

### Suggested outreach request

> Tradebilia operates a collector-to-collector marketplace with a read-only Test AI research tool. We are evaluating an authorized commercial integration that would display provider-attributed historical sale evidence for sports cards and TCGs. We do not intend to scrape your website, use consumer login credentials, consume user entitlements, or reproduce images without permission. Please let us know whether you offer a commercial API, data feed, or licensing arrangement that permits server-side retrieval, limited display, caching, provider attribution, and use within a trade-analysis experience. We would need documentation for available fields, rate limits, pricing, retention limits, and completed-sale versus active-listing rights.

## References

[1] [Card Ladder — homepage and coverage claims](https://www.cardladder.com/)

[2] [Card Ladder Help — How to Search Sales History](https://cardladder.zendesk.com/hc/en-us/articles/23672925718935-How-to-Search-Sales-History)

[3] [Card Ladder — Terms of Use](https://www.cardladder.com/terms)

[4] [Parse.bot — Card Ladder API listing](https://parse.bot/marketplace/5554022d-8a04-46d0-b2c5-56f3b5abcea2/cardladder-com-api)

[5] [COMC Help — History Points and historical sales](https://comc.zendesk.com/hc/en-us/articles/6036952365595-What-are-History-Points-and-How-are-they-Used)

[6] [COMC Help — Sales Chart](https://comc.zendesk.com/hc/en-us/articles/7154073803163-The-COMC-Sales-Chart)

[7] [COMC — User Agreement](https://www.comc.com/UserAgreement)
