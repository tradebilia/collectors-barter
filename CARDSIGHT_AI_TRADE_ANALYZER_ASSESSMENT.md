# Cardsight.ai and the Tradebilia Trade Analyzer

*Assessment date: September 25, 2026*

## Recommendation

**Yes — add Cardsight.ai as a manually enabled, sandbox-only source for Sports Cards and Pokémon / TCG.** It would materially improve the Test AI sandbox's ability to resolve a card's exact identity, separate completed auction evidence from asking prices, account for parallels and grading, and show population context.

It should **not** replace the current eBay, The Card API, Pokémon Price Tracker, or visual-review paths. Cardsight's data overlaps with eBay and other card-market providers, so the correct design is to use it as an independently displayed, source-attributed evidence feed. Only its individually dated, completed-auction records that pass the existing identity, grading, duplicate, recency, and visual safeguards may become candidate valuation evidence.

> The recommended next step is a bounded sandbox pilot, not a production Trade Room rollout. A pilot should validate actual account access, current coverage, duplicate rates against existing eBay-derived sources, and API-credit use on representative Tradebilia listings.

## What Cardsight.ai can contribute

Cardsight exposes a REST API authenticated with `X-API-Key`. Its public OpenAPI description includes card image identification, catalog search, historical pricing, active marketplace listings, and population-report endpoints. The relevant card catalog spans baseball, football, basketball, hockey, MMA, Pokémon TCG, Magic: The Gathering, and One Piece TCG. [1] [2]

### Exact card identity

The image-identification endpoint can detect one or more cards in a submitted image and returns a confidence label, card result, grading object, processing time, and advisory messages. Cardsight says it supports cards in sleeves, top loaders, and graded slabs, and supports PSA, BGS, SGC, CGC, and TAG slab identification. [1] [3]

This is valuable because the analyzer currently depends on listing metadata plus a general visual review. A card-specialist identification result could resolve an exact catalog card ID, card number, set/release, and parallel before a market query begins. It is particularly useful for cards whose title is incomplete or whose visual design distinguishes a base card from a parallel.

The result must remain **review-only** until it agrees with the listing or has high confidence and visible/OCR-supported evidence. It must never overwrite a member's inventory record automatically, authenticate a card, or verify that a slab or certificate is genuine.

### Historical market records with variant and grade separation

`GET /v1/pricing/{card_id}` returns historical records organized into raw and graded sections. The graded sections are grouped by grading company and grade. Each underlying record includes title, USD price, end date, original marketplace source, listing type, URL, image URL, and parallel ID/name. Cardsight describes `auction` as a completed-auction result and `fixed`/Buy It Now as a seller asking price. [2] [4]

That structure is valuable for the analyzer because it directly supports the evidence rules already in use:

| Cardsight record | Tradebilia evidence role |
|---|---|
| Dated completed auction, exact card/parallel/grade match | Candidate completed-sale evidence after all existing P0 admission checks |
| Fixed-price or Buy It Now history | Context only; never a deterministic value or trade verdict input |
| Active marketplace auction or fixed-price listing | Context only, except a qualifying near-closing bid-supported auction under the existing approved eBay rule |
| Parallel or grade mismatch | Exclude from valuation; display only if useful as an explanatory comparison |
| Population count | Scarcity context only; never a dollar-value input |

Cardsight's listing image and source URL are especially useful for the sandbox's last-stage visual comparable filter and for user-facing traceability. [2]

### Population context

Cardsight has a card, set, and release population API. At card level it reports total population, base-versus-parallel breakdowns, grading-company and grading-type groups, grades, ordinary population, qualified population, and the company's last-sync timestamp. Its listed grading-company coverage is PSA, BGS, CGC, SGC, and TAG. [5]

This would improve scarcity context for graded sports cards and Pokémon / TCG without changing the analyzer's valuation hierarchy. For example, the sandbox could report that an exact parallel has a low PSA 10 population, while plainly stating that population is not proof of demand or a direct price calculation.

### Current availability and bid/ask context

`GET /v1/marketplace/{card_id}` returns active auctions and fixed-price listings, separated into raw and graded sections. Records include source, price, listing URL, image, seller condition text, end date, bid count, and parallel information. [6]

This can make the sandbox's active-listing panel more precise, particularly when showing the current market spread for the exact catalog card and grade. It remains **asking-price context**, not realized value.

## Fit by Tradebilia category

| Tradebilia category | Value of Cardsight | Reason |
|---|---|---|
| **Sports Cards** | **High** | Exact catalog card/parallel identity, image-based ID, graded price groups, completed-auction records, active availability, and population context directly address the category's biggest analysis needs. |
| **Pokémon / TCG** | **Medium–high** | Adds visual matching, exact parallel/set resolution, grade-separated records, and population context. It overlaps materially with the existing Pokémon Price Tracker integration, so it should be used for corroboration and coverage expansion rather than double-counted evidence. |
| **Future Magic: The Gathering / One Piece support** | **Potentially high** | Cardsight documents catalog coverage for both, and its price-data page says market data is live for One Piece. This matters only if Tradebilia formally supports these as inventory subcategories or categories. [1] [2] |
| Comics, coins, stamps, vintage toys, video games, music, autographs, Disney pins, movies | **No direct value** | Cardsight is a trading-card platform. It does not close current market-data gaps for these categories. |

## Where it overlaps — and why that matters

Cardsight says its historical and active records are sourced from public marketplaces, with eBay as a primary source and Fanatics Collect and COMC contributing to its broader system. [2] The analyzer already retrieves eBay evidence, and the sandbox now has The Card API for Sports Cards/Pokémon and Pokémon Price Tracker for Pokémon / TCG.

That means a Cardsight record can represent the same original sale already seen through eBay, 130point, The Card API, or another provider. Treating those copies as separate comparable sales would artificially increase evidence count and confidence.

The existing P0 duplicate-sale safeguards should therefore be extended to use:

1. Original marketplace source;
2. Original listing URL when present;
3. Exact card/parallel/grade identity;
4. Sale date;
5. Price and normalized title; and
6. Listing image only as a conservative final mismatch screen.

Cardsight should contribute **coverage and provenance**, not extra weight for the same transaction.

## Coverage caution to resolve in a pilot

Cardsight's current price-data product page says market data is live for baseball, football, basketball, hockey, Pokémon TCG, and One Piece TCG. [2] Its FAQ also contains an older-looking statement that pricing is launching in beta with baseball first and that other sports will follow. [3]

Those statements conflict. The product page is more specific and appears newer, but this cannot be settled from marketing text alone. Before the source is relied upon, the sandbox pilot should run a small matrix of actual account-authorized lookups:

- Baseball, football, basketball, and hockey cards;
- Pokémon cards across base and parallel variants;
- Raw and PSA/BGS/SGC/CGC examples;
- A known exact sale already available through eBay; and
- An item with no market coverage.

The sandbox should surface returned coverage, source mix, returned dates, and provider messages rather than assuming every documented segment has reliable pricing.

## Recommended sandbox-only implementation

### 1. Add one opt-in source, not an automatic call

Add **Cardsight AI — Card ID, Pricing & Population** to the Test AI source catalog. It should appear only for Sports Cards and Pokémon / TCG and must remain manually enabled. This preserves API credits and makes source use explicit.

### 2. Resolve identity before querying prices

Use this ordered flow:

1. Normalize existing Tradebilia fields: year, manufacturer, set/release, card number, player/character, parallel, grader, and grade.
2. Search Cardsight's catalog for a candidate card ID.
3. If the listing image review is explicitly enabled, run card identification only then.
4. Accept a catalog ID only when the identity match is exact or clearly reviewed by the user.
5. Query price history with the resolved card ID and, where available, parallel and grade IDs.

The source panel should visibly show the matched catalog identity and any unresolved ambiguity before presenting market figures.

### 3. Keep evidence roles strict

Request historical pricing with auctions and fixed-price data visibly separated. Admit only qualified auction records to the deterministic comparable engine. Keep all fixed-price and active-marketplace results in the contextual evidence panel.

Population data should sit beside the grade/parallel identity and include the provider's `last_synced_at` timestamp. It must not increase a deterministic value, confidence, or trade verdict by itself.

### 4. Preserve traceability and licensing boundaries

Every displayed market observation should retain Cardsight's source, listing URL, date, grade/parallel context, and image link. The Terms permit use within an end-user application but prohibit creating a standalone market database. They permit only limited, short-term caching for operating the application, require refreshing or purging cached data, prohibit retaining entire databases or genre subsets, and require deleting cached data at the end of the service term. [7]

Tradebilia should therefore use a short-lived response cache, never write provider catalog or price history into persistent inventory fields, and never build a standalone historical-price archive from Cardsight responses.

### 5. Put an explicit credit budget in the source panel

Cardsight's published free tier provides 750 API calls per month; Pro provides 5,000 for $14.95 per month. The pricing page says all plans include the listed features, but the pilot must confirm which specific endpoints consume credits for the actual account. [8]

A sensible two-item sandbox run could use three to five provider calls per item: catalog resolution, historical pricing, optional population, optional active marketplace, and optional visual identification. That produces the following planning ranges:

| Calls per item | Calls per two-item analysis | Approximate free-tier two-item runs | Approximate Pro-tier two-item runs |
|---:|---:|---:|---:|
| 3 | 6 | 125 | 833 |
| 4 | 8 | 93 | 625 |
| 5 | 10 | 75 | 500 |

The image-identification step should be an explicit user action or a gated fallback, not part of every analyzer run.

## Bottom line

Cardsight.ai would be a **valuable addition for the card portion of the analyzer**, with the greatest immediate benefit to **Sports Cards** and a strong corroboration role for **Pokémon / TCG**. Its best qualities are exact card/parallel/grade organization, source-linked raw records, visual card identification, and population data.

It is not a universal collectible source, and it should not be treated as a second independent sale when it republishes an eBay transaction already found elsewhere. The right implementation is a sandbox-only, manually enabled pilot that measures real coverage and duplicates before any production decision.

## References

[1]: https://cardsight.ai/documentation/api-reference "Cardsight AI REST API reference"

[2]: https://cardsight.ai/solutions/price-data "Cardsight AI trading-card price data"

[3]: https://play.cardsight.ai/faq "Cardsight AI frequently asked questions"

[4]: https://play.cardsight.ai/endpoints/pricing "Cardsight AI historical pricing endpoint"

[5]: https://play.cardsight.ai/endpoints/population "Cardsight AI population reports endpoint"

[6]: https://play.cardsight.ai/endpoints/marketplace "Cardsight AI marketplace listings endpoint"

[7]: https://cardsight.ai/terms "Cardsight AI terms of service"

[8]: https://cardsight.ai/pricing "Cardsight AI API pricing and call limits"
