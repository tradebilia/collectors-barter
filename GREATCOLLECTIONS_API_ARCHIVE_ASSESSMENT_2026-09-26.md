# GreatCollections API and Archive Assessment

**Date:** 2026-09-26  
**Scope:** GreatCollections coin auction data for the Tradebilia Analyzer sandbox  
**Conclusion:** Do not implement scraping or background ingestion yet. GreatCollections exposes a large human-facing archive, but no public documented coin-auction API was found, full prices are member-gated in at least some records, automated access is technically unreliable, and GreatCollections publishes a broad prior-written-agreement requirement covering prices realized and images.

## Direct answer

### Is there an official GreatCollections coin API?

No public, documented API was found. The reviewed official archive, help, registration, terms, contact, sitemap, and app listings do not publish REST, GraphQL, XML, JSON, OAuth, API-key, webhook, developer, export, or partner-feed documentation. This is a high-confidence finding about the absence of a **published public API**. It does not prove that GreatCollections has no private partner feed or negotiated data-license arrangement.

The archive uses normal human-facing URLs such as:

- `https://www.greatcollections.com/Auction-Archive/top`
- `https://www.greatcollections.com/Auction-Archive/US-Coin-Prices/...`
- `https://www.greatcollections.com/Coin/{item-id}/{slug}`

These are web pages, not documented API endpoints. The official archive says it covers approximately 1.97 million certified U.S. and world coins and currency sold by GreatCollections, plus current listings, and that it is continually updated. It exposes search dimensions such as denomination, type, date, grading service, and grade. [1]

### Can the sold/archive pages technically be scraped?

**Technically, some page data is visible.** Archive and lot pages can expose title, grade, grading service, certification number, coin attributes, auction timing, bid count, lot identifiers, and image links in human-facing HTML. The site has stable category and lot URL patterns. Some archive rows show a price; others show `or Join (Free & Quick)`. GreatCollections’ registration page explicitly says free registration permits users to view past-sale prices and PhotoRecords. [1] [2]

**However, complete sold-price collection is not reliably available anonymously.** The site selectively gates realized prices behind free membership. Direct requests from the research environment also encountered a GreatCollections traffic-verification / Cloudflare managed challenge. A JavaScript browser session was likewise blocked by CAPTCHA. This means a repeatable unauthenticated bulk collector cannot be treated as dependable.

**The site also publishes crawler restrictions.** Its `robots.txt` disallows archive query paths, `/auction-archive`, several search/query paths, `/ajax.php`, member areas, and other high-volume or private paths. Robots directives are not a complete legal license, but they are a clear operational signal that automated collection must not ignore. [3]

### Does the user's internal-only use change the answer?

It changes **distribution exposure**, but it does not remove the source’s stated restriction. GreatCollections’ terms/footer state:

> “No content on the GreatCollections website (including coin/currency images and prices realized) may be copied, distributed, published or used in any way, in whole or in part, without prior written agreement from GreatCollections Auctions, LLC.” [4]

That language expressly includes prices realized and says “used in any way.” Based on that wording, internal background processing, a durable cache, an internal comparable-sale database, model training, and hidden server-side analysis should all be treated as requiring written permission unless GreatCollections confirms otherwise. This is a practical compliance assessment, not legal advice.

The terms separately say that GreatCollections photographs remain its property and direct image-use requests to `info@greatcollections.com`. Credit alone should not be assumed to authorize copying. [4]

## Data that appears available with permission/member access

A permissioned integration could potentially use a restricted set of fields such as:

- GreatCollections item/lot ID and canonical URL
- Listing title and coin type
- Year, mint, denomination, series, country, and other catalog attributes when present
- Grading service and grade
- Certification number when present
- CAC or other approval indicators when present
- Auction end/sale date
- Bid count and auction status
- Realized price, if the account/license permits it
- Image URLs only if explicitly licensed

The archive itself warns that coins with the same grade can realize different prices due to quality, eye appeal, rarity, and other factors. Therefore any GreatCollections data would still require Tradebilia’s existing identity, grade, date, duplicate, currency, and evidence gates. [1]

## Integration options

| Approach | Tradeoffs | Cost | Setup complexity |
|---|---|---:|---:|
| Request an official API or written data license | Most reliable and defensible; may provide structured fields, permitted volume, and price access. Requires an external response and possible commercial terms. | Unknown; negotiated | Medium |
| Build a permissioned, low-volume HTML adapter after written approval | Could use canonical archive/lot pages when no API exists; more brittle than an API and still subject to CAPTCHA, layout changes, login, and rate limits. | Engineering plus any access/licensing cost | High |
| Do not integrate GreatCollections; use existing PCGS APR and other permitted sources | No new rights or anti-bot risk; misses GreatCollections-specific coverage. | No new source cost | Low |

## Recommendation for Tradebilia

Do **not** add a scraper, background job, account automation, or hidden archive cache at this time. The correct next step is a written inquiry to GreatCollections asking whether they offer:

1. A public or partner API for auction/archive records;
2. A licensed data feed or export;
3. Permission to retrieve only structured coin fields and realized prices for internal, non-user-facing valuation analysis;
4. Permission to store normalized fields and retain them for a defined period;
5. Permission to use authenticated access programmatically, if required;
6. Any rate, volume, attribution, deletion, and image restrictions.

The official contact page provides `info@greatcollections.com`, `ian@greatcollections.com`, telephone `1-800-44-COINS` / `+1 949-679-4180`, and a confidential inquiry form with “Website Inquiry,” “Registration,” and “Other” subjects. [5]

Until written permission is obtained, the sandbox should show GreatCollections as **research candidate — not connected**, not as an active data source. If permission is granted, start with a read-only coin adapter that excludes images and personal/account data, stores only the agreed fields, uses conservative request limits, honors robots and access controls, and labels records as source-attributed completed-sale candidates only after exact identity matching.

## What was not done

- No GreatCollections login or account was created.
- No CAPTCHA, Cloudflare challenge, member gate, or access control was bypassed.
- No automated scraper or background process was deployed.
- No GreatCollections content, images, prices, or personal data was copied into Tradebilia.
- No database writes, migrations, production changes, or user-visible source integration were made.

## References

[1]: https://www.greatcollections.com/Auction-Archive/top "GreatCollections Auction Archive"
[2]: https://www.greatcollections.com/Register "GreatCollections Registration"
[3]: https://www.greatcollections.com/robots.txt "GreatCollections robots.txt"
[4]: https://www.greatcollections.com/terms "GreatCollections Terms and Conditions"
[5]: https://www.greatcollections.com/main-contact "GreatCollections Contact / Visit Us"
