# Free Test AI Source Audit — Working Notes

## Scope and guardrails

This audit evaluates data sources for **Tradebilia’s commercial Test AI environment**. A candidate is not eligible merely because a website is publicly searchable or an open-source wrapper exists. It must have a documented lawful access path compatible with commercial use. No protected-site scraping is proposed or permitted.

## Findings preserved during primary-source review

| Source | Preliminary status | Evidence captured | Practical implication |
|---|---|---|---|
| RAWG Video Games Database | **Potentially eligible, pending successful primary-document retrieval** | The live documentation endpoint returned a Cloudflare origin timeout during review on 2026-08-16, so its stated thresholds and terms are not treated as fully validated yet. | If current terms confirm the published commercial free-tier conditions, it could add video-game title, platform, release-date, developer, publisher, genre, rating, and artwork metadata. It would not provide grading, authentication, or collectible-market value. |
| Grand Comics Database | **Potentially eligible for reference metadata only** | The GCD site describes itself as a nonprofit, volunteer-built open database covering printed comics. Its site presented an anti-bot CAPTCHA for this session; the exact reuse path must therefore be confirmed from its licensing documentation. | It could help normalize comic series, issue, creator, publisher, and variant identity. It is not a real-time valuation or grading source. Any use must honor its data license, attribution, and share-alike obligations. |

## Current conclusion

**RAWG is currently the strongest verified no-cost commercial candidate for video-game reference metadata**, subject to visible RAWG backlinks, a 100,000 monthly-active-user / 500,000 page-view threshold, and a prohibition on data redistribution. It can improve title, platform, release-date, developer, publisher, genre, and related factual matching; it does not provide collectible-market values, grading, or authentication.

The Grand Comics Database is **not** a commercial-use candidate. Its own FAQ states that downloadable database files are for personal, non-commercial use. GoCollect’s public free account is also not an API grant: its published pricing reserves customized API access for Enterprise, and its terms limit the service to personal use absent written consent.

The existing Smithsonian and Wikidata integrations remain the only confirmed no-cost, commercial-use reference sources already live in Test AI. The Library of Congress API is a further no-cost archival/reference candidate, although every asset’s rights statement must be checked before any media is shown.

## Additional verified findings

| Source | Access status | What it adds | Decision |
|---|---|---|---|
| Parse.bot USA Coin Book | **Free trial only; third-party wrapper** | US coin denomination and series structure, mintage, grade-based reference values, active marketplace listings, melt values, and images. | Do not treat as a free production source. The free Parse plan has 200 credits and endpoints cost credits per successful call. Parse explicitly says the wrapper is not an official USA Coin Book API. Obtain source-owner permission before production use. |
| Parse.bot Collectr | **Free trial only; third-party wrapper** | Trading-card catalog identity, sets, card numbers, rarity, current and graded prices, and price-history snapshots. | Potential Test AI comparison candidate only after upstream terms and commercial-use permission are confirmed. Parse bills each call and identifies the wrapper as non-official. |
| Pin & Pop | **Approval and paid setup required** | Disney-pin name, series, origin, edition, release year, and record URL. | Good future specialist catalog option, not a free option. Its published terms require approval, a license agreement, a one-time $99 setup fee, end-user attribution, and prohibit public display of supplied images. |
| Heritage Auctions | **Not a public API; no scraping** | Heritage has extensive auction-result data but does not offer it for this use. | Exclude. Heritage’s site agreement forbids screen scraping, robots, spiders, and commercial exploitation. Its separately published image API is restricted to contracted sales agents. |
| TheGamesDB | **Technically accessible, rights unclear** | Game, platform, genre, developer, publisher, region, and media endpoints. | Do not implement yet. The public API documentation and GPL-licensed server repository establish technical availability, but do not clearly license the underlying catalog data or artwork for Tradebilia’s commercial reuse. |
| TCGdex | **Eligible now for Pokémon factual metadata** | Multilingual Pokémon TCG sets and cards, including card identity, set, number, rarity, types, attacks, rules text, legalities, variants, illustrator, and reference image URLs. | Strong candidate for a read-only Pokémon catalog/reference panel. Its maintained `cards-database` repository states that the database is MIT-licensed. It is not a pricing, sales-comps, certification, or authentication source; image-rights and display treatment still require care. |
| Metropolitan Museum of Art Collection API | **Eligible now for archival reference data** | CC0 collection metadata and public-domain images for historical artifacts, including selected coins, toys, printed material, and other culturally significant objects. | Suitable as an opt-in scholarly reference source, not a product catalog or valuation engine. Restrict public images to records explicitly returned as public-domain / open-access and retain object/source links. |
| Library of Congress Collections API | **Eligible for metadata; asset-by-asset rights review required** | Structured bibliographic and collection metadata plus records spanning prints, photographs, comics-related material, films, books, and other cultural artifacts. | Useful for contextual research, not valuation or certification. Do not assume every associated image or media file has commercial rights. |
| Parse.bot Brickset | **Free trial only; third-party wrapper** | LEGO set catalog search, themes, year filtering, pieces, minifigures, designer, dimensions, and retail-price metadata. | A potentially useful LEGO subset for Vintage Toys, but it is not free at production scale and Parse identifies it as a non-official wrapper. Do not integrate without source-owner permission. |
| Reddit collector discussions | **Discovery evidence only** | Community reports that dependable card-price APIs are scarce and that scraping should not be used. | Do not use as license evidence. A recent r/PokeInvesting thread reinforces that official price access is often paid or unavailable; it does not justify scraping or third-party data reuse. |

## Next validation actions

The remaining review will validate official access terms for coin, autograph, grading, toy, and multi-carrier tracking providers; test the most viable source candidates in Test AI terms; and finish the GitHub/community recommendation assessment. Final recommendations will label each option as **eligible now**, **conditional on licensing/attribution**, **paid**, **non-commercial only**, **requires approval**, or **not a public API**.
