# Colnect CAPI and Tradebilia AI Trade Analysis

## Executive conclusion

**Colnect CAPI could improve the Tradebilia analyzer, but it should be added first as a sandbox-only catalog and visual-identity source.** It is especially promising for stamps, coins, banknotes, sports cards, video games, comics, and music records because it can return structured catalog identities, category-specific fields, catalog codes, and catalog images. Its image-search endpoint could also provide an additional candidate-identification path when a listing image is unclear.

CAPI should **not initially replace eBay completed sales as the analyzer’s authoritative valuation evidence**. Colnect’s documented marketplace endpoints expose sale listings and market-price history, but the available specification does not establish that every returned price is a completed arm’s-length transaction comparable to an eBay completed sale. Those results should therefore remain supplemental context until Colnect confirms the transaction semantics and Tradebilia validates coverage, recency, condition comparability, and sample size.

The recommended next step is to request CAPI access for a narrowly defined, non-production sandbox experiment. The first experiment should measure identity-match accuracy and field completeness for stamps, coins, sports cards, video games, comics, and music records. A second experiment can evaluate whether Colnect price context improves analysis quality without changing the deterministic valuation hierarchy.

## What CAPI provides

Colnect describes CAPI as a JSON-over-HTTPS API for querying information in its collectibles database. Requests use an application ID, a secret-derived HMAC-SHA256 request hash, and a current Unix timestamp in `Capi-Timestamp` and `Capi-Hash` headers. The API is accessed through `https://api.colnect.net` and requires an approved CAPI key. [1] [2]

The specification documents the following useful capabilities:

| Capability | What Tradebilia could receive | Analyzer value |
|---|---|---|
| Category discovery | Current Colnect categories and category-specific available actions | Helps route requests and avoid assuming every field exists in every category |
| Catalog filters | Countries, producers, series, years, themes, catalogs, currencies, face values, and systems, where supported | Narrows identity searches and improves query construction |
| Item lists | Item ID, series ID, producer ID, front and back picture IDs, description, catalog codes, and item name | Provides structured candidate identities rather than relying only on title text |
| Item details | Category-specific fields; optional field IDs and nested details | Adds temporary identity metadata such as catalog number, issue, country, year, producer, theme, or series |
| Global search | Text search across collectibles, optionally restricted to a category, with pagination | Supplies catalog candidates for ambiguous or incomplete listing titles |
| Catalog images | Thumbnail or full-size image URLs derived from picture IDs | Enables a second visual comparison against catalog candidates |
| Image search | Image URL, base64 image, or uploaded image; coin searches can use front and back images | Useful for image-assisted identification, especially for stamps, coins, and other cataloged objects |
| Market prices | Documented history of sale prices for selected items over a requested number of days | Potential supplemental price context, subject to transaction-semantics validation |
| Item sales | Sale records or offers with price, currency, expiry, seller country, quantity, link, condition, shipping, and payment fields | Useful for marketplace context and liquidity signals; not automatically authoritative completed-sale evidence |

CAPI item fields are category-dependent. The specification specifically advises calling the category `fields` action before interpreting the `item` response because field names and ordering vary by category. This is important for Tradebilia’s category-aware field table and prevents treating a field such as “catalog number” as if it had the same meaning across all categories. [2]

## Category fit for Tradebilia

Colnect’s current public catalog page displayed substantial coverage for several Tradebilia categories at the time of research. The displayed counts included approximately 1.64 million stamps, 208 thousand coins, 13.9 million music records, 51 thousand comics, 185 thousand video games, and 2.88 million sports cards. These counts are dynamic and should be treated as a snapshot rather than a guaranteed service level. [3]

| Tradebilia category | CAPI fit | Recommended use | Main caution |
|---|---|---|---|
| Stamps | **Very strong** | Catalog identification, country/producer/year/catalog filtering, image search, catalog-number enrichment, supplemental market context | Condition, perforation, gum, centering, cancellation, and provenance may not be fully captured by catalog identity alone |
| Coins | **Very strong** | Country, denomination, year, mint, variety, catalog identity, front/back image search, supplemental price context | Grade, strike, surface, toning, authentication, and slab data still require dedicated numismatic or grading evidence |
| Banknotes | **Strong** | Catalog identity, issuer/country/year/denomination fields, image matching, supplemental market context | Condition and rarity premiums may not be represented consistently |
| Sports cards | **Strong for identity; moderate for valuation** | Player/card/set/catalog matching, sport-specific filters, image candidates, supplemental market context | Colnect catalog identity does not replace PSA/BGS/SGC cert data, population reports, or verified sold comps |
| Video games | **Strong for identity; moderate for valuation** | Platform/system, title, publisher/series, edition, catalog image matching, supplemental marketplace context | Complete-in-box, seal quality, regional version, grading company, and game-condition details can dominate price |
| Comics | **Moderate to strong for identity; limited for graded valuation** | Series, issue, publisher, variant, catalog identity, image matching, contextual metadata | CGC/CBCS certificate, census, page quality, restoration, key-issue status, and completed graded sales remain separate evidence |
| Music records | **Strong for catalog identity; moderate for valuation** | Release, artist/series, catalog identity, image matching, marketplace context | Pressing, matrix/runout, condition, sleeve completeness, and regional variant often determine value |
| Pokémon/TCG | **Potentially useful** | TCG catalog identification and image candidates if the CAPI category and field coverage match the specific card | Dedicated TCG sources and graded-card evidence should be benchmarked first; do not assume sports-card fields transfer |
| Vintage toys, movies, autographs, Disney pins, and other categories | **Uneven** | Use only after checking whether the relevant Colnect category has an action set and suitable fields | Coverage may be sparse or semantically different from Tradebilia’s item types; no broad assumption should be made |

Colnect’s category list also includes many specialized collecting categories outside Tradebilia’s current core categories. That breadth could help future catalog expansion, but it is not by itself evidence that every category has the same field depth or marketplace activity. The specification explicitly states that not all actions are available in all categories. [2]

## Image search and visual identity

Image search is the strongest differentiated feature for the current sandbox. Colnect documents image search using an image URL, base64-encoded image, or uploaded image. The coin category can additionally accept front and back images in one request. The response includes candidate IDs and image-distance metrics such as difference, average, perceptual, and best-match results. [2]

Colnect’s user-facing guidance recommends a clear, high-resolution crop containing only the item, with the item aligned similarly to its catalog image. It warns that blurred, pixelated, skewed, rotated, or cluttered images reduce recognition quality. [4]

For Tradebilia, this means CAPI could complement the existing visual review and sold-candidate filter in three ways:

1. It could propose catalog candidates when title metadata is incomplete.
2. It could provide a catalog image for a second visual comparison.
3. It could add structured fields only when the candidate match is sufficiently strong and the field is visibly or catalogually supported.

The result should remain a **temporary evidence suggestion**, not an automatic listing update. A catalog match identifies an item or likely catalog record; it does not authenticate ownership, grade, condition, rarity, or the exact variant unless those facts are separately supported.

Image search is disabled by default in CAPI and is documented as available with payment per call. This makes it unsuitable for unconditional image calls on every analyzer request. It should be opt-in in the sandbox, rate-limited, and measured against the existing image-review path. [2]

## Market evidence and valuation fit

CAPI documents `market_prices` as a history of sale prices for selected items from transactions opened in the last requested number of days. It also documents `item_sales`, which returns price, currency, expiry date, seller country, quantity, listing link, seller, shipping methods, payment methods, and condition. [2]

These endpoints could add useful context about:

- Whether a catalog item has any marketplace activity.
- The distribution of listed or transacted prices on Colnect.
- The available condition labels and currencies.
- Geographic seller coverage and possible regional-market differences.
- Liquidity or scarcity signals when there are very few or many records.

However, the documented response does not by itself resolve several questions that matter to Tradebilia’s evidence hierarchy:

- Whether every `market_prices` observation represents a completed transaction rather than a listing or other marketplace event.
- Whether prices are normalized for shipping, fees, taxes, lots, and currency conversion.
- Whether condition labels are comparable across categories and platforms.
- How many observations are recent, unique, and independently comparable.
- Whether marketplace activity is representative of the North American market relevant to a Tradebilia user.

Tradebilia currently treats completed sales as authoritative and ordinary active asking prices as context only. Colnect should initially be placed in the same **context-only tier** unless Colnect confirms the transaction semantics and a controlled benchmark demonstrates comparable reliability. It must not silently alter the deterministic value gap or verdict.

## Licensing, access, and operational constraints

CAPI requires prior application and written permission. The CAPI license is limited to the goals stated in the application, can be revoked, and must be used only through documented features and assigned keys. The terms also state that extracted content and content created from it remain subject to Colnect’s rights and may not be provided to third parties outside the approved application scope. [1] [5]

Colnect’s official CAPI help page states that CAPI is free for non-commercial use and that commercial pricing is determined case by case. The specification adds that Colnect may introduce payment requirements after an application exceeds 100,000 requests and that commercial-use pricing is negotiated per case. The application must visibly attribute Colnect as a source using the statement: “Catalog information courtesy of Colnect, an online collectors community.” [1] [2]

The API has several implementation requirements that matter for a WebDev integration:

- The application secret must remain server-side and must never reach the browser.
- Every request requires a timestamp and HMAC hash, so the integration belongs in a server-side tRPC procedure.
- The API documentation says the caller’s user-agent should identify the application and be longer than 15 characters.
- Category-specific IDs should not be cached for more than 24 hours because Colnect editors can change them.
- API keys may be revoked after four weeks of inactivity unless the application responds to periodic check-ups.
- Colnect’s CAPI help page states that CORS is not available, which reinforces server-side proxying rather than browser calls.
- The API should be treated as a licensed external dependency, not scraped from public pages.

## Recommended sandbox experiment

The most useful first experiment is not a full valuation integration. It is a controlled identity and evidence-quality comparison.

### Phase 1: access and contract validation

Request CAPI access using a description limited to the Tradebilia Test AI sandbox. Ask Colnect to confirm the permitted categories, image-search pricing, rate limits, caching rules, attribution requirements, whether commercial use applies to Tradebilia, and the exact semantics of `market_prices` and `item_sales`.

Before coding against production credentials, obtain sample responses for at least one stamp, coin, sports card, video game, comic, and music record. Confirm field names through the category `fields` endpoint and verify that item IDs, image IDs, catalog codes, and sale fields are stable enough for the experiment.

### Phase 2: catalog identity source

Add a sandbox-only source named **Colnect Catalog**. It should accept a title, category, item details, and optionally an image. It should return candidate catalog items, field-level matches, catalog IDs, source images, and confidence diagnostics. It should not write listing data.

Candidate acceptance should require agreement across multiple signals such as title tokens, category, year, catalog number, publisher or producer, and image similarity. Ambiguous candidates should remain visible as review candidates rather than being merged automatically.

### Phase 3: opt-in image search

Add a separate **Colnect Image Search** action that is only available when image review is enabled. The action should be rate-limited and should show that image-search usage may incur per-call cost. For coins, the sandbox should support optional front and back images.

The sandbox should compare Colnect candidates with the existing vision output and report whether Colnect added a new identifier, confirmed an existing identifier, disagreed with the existing identity, or returned no reliable match.

### Phase 4: supplemental market context

After identity accuracy is measured, test `market_prices` and `item_sales` as labeled supplemental evidence. Display observation count, date range, currency, condition, lot status, and whether each record is a listing or a completed transaction when that distinction is available. Do not feed Colnect prices into the authoritative value gap until the transaction semantics and comparable quality are validated.

## Decision

**Benefit: yes, with a constrained role.** Colnect is likely to improve Tradebilia’s identity completeness and visual catalog matching more than it improves the core dollar valuation. The expected benefit is highest for stamps and coins, followed by sports cards, video games, comics, and music records. Its marketplace data may add useful context but should be treated cautiously because the documented fields do not establish a platform-equivalent completed-sale dataset.

The appropriate implementation is therefore:

> **Add Colnect first as a sandbox-only catalog and optional image-search source. Evaluate its market endpoints separately as context. Do not allow CAPI to override grading-company data, certification lookups, visual mismatch filters, completed-sale medians, or the deterministic trade verdict.**

## References

[1]: https://colnect.com/en/help/collecting/colnect_api "Colnect API: Collectors Help and Support"
[2]: https://colnect.com/downloads/ColnectAPISpecification.docx "Colnect API Specification"
[3]: https://colnect.com/en "Colnect Collectors homepage and catalog coverage"
[4]: https://colnect.com/en/help/collecting/image_search "Colnect Image Search help"
[5]: https://colnect.com/en/help/collecting/terms_of_service "Colnect Terms of Service"

*Prepared by Manus AI. Research date: September 24, 2026.*

*This report is an integration assessment, not legal advice. Commercial licensing and data-use permissions should be confirmed directly with Colnect before implementation.*

