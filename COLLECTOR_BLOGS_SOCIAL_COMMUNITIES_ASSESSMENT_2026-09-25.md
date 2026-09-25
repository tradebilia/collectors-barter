# Collector Blogs and Social Communities Assessment

**Research date:** 2026-09-25  
**Current RSS registry:** 222 unique feeds

## Decision

Yes, several blogs and social communities would benefit Tradebilia, but they should be treated as a **curated discovery and context layer**. They can surface identification leads, variants, counterfeit or alteration warnings, grading questions, release information, provenance leads, and collector-interest signals.

They should **not** populate completed-sale evidence, comparable sales, valuation, final authentication, final grade/condition, provenance conclusions, or fraud findings. Forum posts, asking prices, trade discussions, offers, polls, and social consensus are not verified transaction records.

## Highest-value sources

### Disney Pin Forum

- Official site: <https://www.disneypinforum.com/>
- Pin Comparison: <https://www.disneypinforum.com/forums/pin-comparison.32/>
- Pin Guides & FAQs: <https://www.disneypinforum.com/forums/pin-guides-faqs.24/>
- Comparison RSS: <https://www.disneypinforum.com/forums/pin-comparison.32/index.rss>
- Discussion RSS: <https://www.disneypinforum.com/forums/disney-pin-discussion.3/index.rss>

**Value:** Strong item-level identification, variant, backstamp, scrapper/counterfeit, unauthorized-pin, release, and condition-care context.

**Recommendation:** Retain the two already-registered focused RSS feeds with strict relevance filtering and link-only output. Do not crawl marketplace forums, republish full posts/images, or use asking prices and trade outcomes.

### Collectors Universe Forums (PCGS/PSA)

- Forum: <https://forums.collectors.com/>
- U.S. Coin Forum: <https://forums.collectors.com/categories/u-s-coin-forum>
- U.S. Coin RSS: <https://forums.collectors.com/categories/u-s-coin-forum/feed.rss>
- Trading Cards & Memorabilia: <https://forums.collectors.com/categories/sports-cards-memorabilia-forum>
- Autographs RSS: <https://forums.collectors.com/categories/autographs-forum/feed.rss>
- PCGS message boards: <https://www.pcgs.com/messageboards>

**Value:** Cross-category specialist discussion covering coins, sports cards, autographs, memorabilia, grading, counterfeit slabs, authentication-policy changes, unusual variants, and issuer-release leads.

**Recommendation:** The sandbox now includes the official U.S. Coin and Trading Cards & Memorabilia RSS feeds, alongside the already-registered Autographs RSS. They remain contextual discovery feeds and should receive human review before any alert is surfaced. Do not bulk-ingest the entire forum.

### Net54Baseball

- Forum: <https://www.net54baseball.com/>
- RSS: <https://www.net54baseball.com/external.php?type=RSS2>
- Alteration/forgery archive: <https://www.net54baseball.com/forum/content/archivecenter.html>

**Value:** Particularly strong for pre-war and vintage baseball-card identification, set variations, alterations, trimming, soaking, printing-process issues, fakes, and reprints.

**Recommendation:** Retain its existing RSS as a manual discovery queue. Prioritize the specialist reference/archive pages and narrowly scoped research leads. Exclude B/S/T posts, live auctions, WTB/FS, offers, payment details, asking prices, and seller claims.

## Useful but manual-only sources

### Elite Fourum — Pokémon / TCG

- Site: <https://www.elitefourum.com/>
- Categories: <https://www.elitefourum.com/categories>
- Grading: <https://www.elitefourum.com/c/grading/23>
- Articles and guides: <https://www.elitefourum.com/c/articles-guides-resources/7>
- Existing RSS: <https://www.elitefourum.com/latest.rss>

Useful for Pokémon card variants, misprints, language/print-run questions, collector guides, grading discussions, counterfeit leads, and links to official release news. The existing RSS is already registered. Keep it human-reviewed because it also contains price opinions, deals, WTB posts, collection showcases, and speculation.

### CoinTalk — Coins

- Site: <https://www.cointalk.com/>
- Existing RSS: <https://www.cointalk.com/forums/-/index.rss>
- What’s it Worth: <https://www.cointalk.com/forums/whats-it-worth/>
- Auctions: <https://www.cointalk.com/forums/auctions/>

Useful for coin attribution, world/ancient/error-coin leads, grading terminology, counterfeit-risk discussions, and collector questions. The existing RSS is already registered. Keep it as a manual watchlist only. Do not use What’s It Worth, Auction Listings, For Sale, Want Lists, Trades, or price chatter as valuation evidence.

### Reddit r/gamecollecting — Video Games

- Community: <https://www.reddit.com/r/gamecollecting/>
- Rules: <https://www.reddit.com/r/gamecollecting/about/rules/>
- Existing RSS: <https://www.reddit.com/r/gamecollecting/.rss>

Useful for physical-game collecting themes, completeness/CIB questions, preservation, unusual editions, and collector-interest signals. The existing RSS is already registered. It is predominantly haul, pickup, display, and collection-photo content, so it should remain a low-priority link-only manual watchlist.

## Safe operating rules

1. Preserve source name, title, date, URL, category, attribution, and review status. Keep excerpts short and link back to the original post.
2. Allow community content to create research tickets for identification, variant, counterfeit-risk, alteration, condition, release, or provenance leads.
3. Require independent corroboration before presenting a lead as fact. Use official issuers, grading/authentication services, auction-house records, documentary provenance, or other authoritative sources.
4. Block all community content from valuation, completed-sale, comparable-sale, final-authentication, final-grade, provenance-conclusion, and fraud-finding pipelines.
5. Exclude buy/sell/trade boards, WTB/FS posts, asking prices, estimates, offers, bids, payment details, personal information, generic chatter, and unverified allegations.
6. Do not republish full user posts or images. Community terms and copyright rules apply.

## Bottom line

The best additions are **Disney Pin Forum**, **Collectors Universe**, and **Net54Baseball**. Disney Pin Forum remains tightly filtered official RSS because its two feeds are topic-specific. The sandbox now also includes the official Collectors Universe U.S. Coin and Trading Cards & Memorabilia feeds; they remain context-only and should be human-reviewed. Net54Baseball is more valuable as a human-reviewed research queue. Elite Fourum, CoinTalk, and r/gamecollecting are useful, but their existing feeds already cover them and their noise level makes automated ingestion inappropriate.

## References

- [1]: https://forums.collectors.com/ "Collectors Universe Forums"
- [2]: https://www.pcgs.com/messageboards "PCGS Message Boards"
- [3]: https://www.net54baseball.com/ "Net54Baseball"
- [4]: https://www.net54baseball.com/forum/content/archivecenter.html "Net54Baseball Archive Center"
- [5]: https://www.disneypinforum.com/ "Disney Pin Forum"
- [6]: https://www.elitefourum.com/ "Elite Fourum"
- [7]: https://www.cointalk.com/ "CoinTalk"
- [8]: https://www.reddit.com/r/gamecollecting/ "Reddit r/gamecollecting"
