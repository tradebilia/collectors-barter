# CollectAIO API Assessment for Tradebilia’s Trade Analyzer

**Date:** 2026-09-24  
**Author:** Manus AI  
**Decision scope:** CollectAIO at `collectaio.com`, assessed as a potential market-data and catalog-enrichment provider for Tradebilia. This report does **not** assess the unrelated `collect.ai` accounts-receivable platform. Its OAuth, rate-limit, and receivables claims must not be attributed to CollectAIO. [15]

## Executive conclusion

**Decision: NO-GO for a production or customer-facing integration now.** Tradebilia should not ingest, retain, display, or calculate on CollectAIO data in production until CollectAIO gives **written commercial authorization** that expressly permits Tradebilia’s intended customer-facing use, data retention and caching, attribution, downstream display, and handling of marketplace records, seller data, images, and source-derived material. CollectAIO’s published terms limit public and consumer-Pro API use to documented, personal or internal purposes and prohibit commercial datasets, paid customer-facing use, and specified redistribution without a separate written agreement. [1] [4]

**Conditional technical recommendation: GO for a non-production, contract-gated pilot only.** If written rights are obtained, implement a small, server-side, feature-flagged adapter for **Pokémon/TCG, sports cards, and comics**. Use it first for catalog resolution and variation/condition/grade normalization. Admit an underlying CollectAIO listing into Tradebilia’s authoritative sold cohort only when the record is attributable, explicitly sold, exactly identity-matched, permitted by contract, and deduplicated against Tradebilia’s direct and specialist sources. Treat CollectAIO Value, guide signals, price-history points, and active listings as separately labeled context—not verified transaction value.

This split decision follows the evidence. CollectAIO has a technically useful, documented, read-only catalog and market-evidence interface. Its methodology also aligns with Tradebilia’s central distinction between completed sales and active asks. However, it is a **price guide and portfolio tracker**, not a transactional marketplace or an appraisal service. Its values are market estimates and its visible evidence can be derived from sources that Tradebilia already uses, especially eBay. The API therefore cannot be treated as an independent source of realized sales, and its public terms make commercial production use a gating issue rather than an implementation detail. [3] [4] [13] [14]

> **Operating rule:** A CollectAIO market estimate is never a substitute for Tradebilia’s deterministic completed-sale or qualifying near-closing-auction gate. A CollectAIO-mediated eBay observation is not independent of Tradebilia’s direct eBay evidence.

## What CollectAIO is—and is not

CollectAIO describes itself as a **collectible price guide and portfolio tracker**. It separates completed sales, active listings, source guides, variants, and confidence labels. Its stated CollectAIO Value is a market estimate rather than an appraisal, offer, or investment recommendation. Its methodology assigns completed sales the strongest evidentiary role, treats active listings as seller-intent/ask context, and identifies source guides as contextual inputs. Possible source-guide signals include TCGPlayer, Cardmarket, StockX, and LEGO condition-specific values. [3] [6]

This makes CollectAIO potentially useful for two Tradebilia functions: resolving a user-entered object to a canonical catalog/variation lane, and presenting provenance-rich market context beside Tradebilia’s own valuation logic. It does **not** document a way to create or manage marketplace listings, synchronize seller inventory or orders, authenticate an object, or transact through the API. The published OpenAPI inventory contains only `GET` operations and no documented webhook or callback interface. That supports the limited conclusion that write operations, webhooks, and event delivery are **not documented in the public contract**; it does not rule out a private partner capability. [1] [2]

## Documented API surface and data model

The published OpenAPI 3.1 schema lists the API host as `https://www.collectaio.com`. The public interface is unauthenticated and read-only for discovery and item retrieval. Search requires free-text `q`; its documented bounds are `page` 1–1,000 and `per_page` 1–96. A canonical item is addressed by slug. Bulk public lookup accepts up to 200 comma-separated slugs, and the public sitemap can return up to 5,000 entries per request. [1] [2] [7]

| Area | Documented endpoints and controls | Relevance to Tradebilia |
|---|---|---|
| Discovery and taxonomy | `GET /api/v2/search`, `/api/v2/search/suggest`, `/api/v2/browse/roots`, `/api/v2/browse/public_categories`, `/api/v2/browse/{slug}`, and `/api/v2/browse/{slug}/items` | Search candidates, traverse the public taxonomy, and identify a category/slug before item retrieval. |
| Public item retrieval | `GET /api/v1/items/public`, `/api/v1/items/bulk`, and `/api/v1/items/{slug}` | Retrieve canonical item metadata, variants, listings, summaries, and price-history information. Bulk lookup is a practical enrichment route after identity resolution. |
| Release and shared-goal data | `GET /api/v1/release_watch`, `/api/v1/release_watch/standouts`, and `/api/v1/card_collection_goals/shared/{token}` | Optional release/context features. Shared goals are deliberately published by a collector through an unguessable token and are not a general collection-data feed. |
| Token-gated Pro Data API | `GET /api/v1/data/products/{slug}`, `/api/v1/data/products?slugs=…` (up to 100), `/api/v1/data/products.csv?slugs=…`, `/api/v1/data/collection_goals`, and `/api/v1/data/collection_goals/{id}` | Exact current product-price retrieval and CSV export may be useful after authorization. Saved-goal endpoints are limited to the authenticated owner’s goals. |

The source material identifies normal output as JSON, while the product price export is explicitly CSV with one row per variation. A dated HTML report embed is mentioned in the developer guide but is not a general API response format. Search exposes page metadata and `items_has_next_page`; browse exposes page and total metadata. Shared and authenticated goal detail support `per_page` up to 500, with a default of 250. [1] [2]

### Fields that should be modeled, not flattened

Public search and browse results document fields including an item identifier, name or display name, canonical slug, image URL, price, market condition, release date(s), value label, value basis/basis label, confidence, source label, sample size, matched variation, primary browse category, and variation count. Search responses also return category matches/facets and search-quality information. [2] [7]

A public item response documents `id`, `name`, and `slug`; it can also contain description, UPC, MSRP, release date(s), category path, cover/preferred image URLs, source data, variations, listings, listing summaries, daily prices, and related items. A variation can carry a display price/source, CollectAIO Value, TCGPlayer price, StockX/Cardmarket signals, and grading fields. A listing includes its identifier, title, price, shipping, URL, market state, a flag showing whether it was included in price, and `sold_at`. A daily-price observation includes variation ID, date, price, basis, total listings, metadata, and update timestamp. [2] [8]

Observed live Pokémon data additionally included card language, set identity, collector number, rarity, finish, edition/variation identifiers, external product identifiers/URLs, refresh metadata, seller details, and inclusion/exclusion handling. These fields can be valuable, but the OpenAPI schema permits additional properties on several item, variation, and listing structures. They are therefore **observed fields, not a universal minimum contract**. The integration must tolerate missing, null, category-specific, and evolving properties. [2] [8]

Tradebilia should retain an immutable provider envelope rather than reducing a response to one numeric price. The minimum mapping should retain the CollectAIO item ID and slug; category and variation IDs; product identifiers such as UPC where present; source and basis; confidence; evidence URL; market state; provider capture time; sale date where present; freshness/update time; price and shipping semantics; currency; inclusion/exclusion status and reason; grade/provider/qualifier/certification indicators; and the raw source identifier needed for cross-source deduplication. This is a proposed Tradebilia data contract informed by the documented fields, not a claim that every CollectAIO record supplies every field. [2] [8]

## Category coverage: selective rather than universal

The public root directory currently shows nine broad lanes: Trading Card Games, Sports Cards, Video Games & Consoles, Collectibles & Toys, Tabletop & Miniatures, Books & Media, Coins & Bullion, Sneakers & Streetwear, and Wholesale & Lots. Root-lane presence should not be read as complete catalog or valuation coverage. The counts below are live audit snapshots from the supplied research dated 2026-09-24, not contractual coverage levels. [5]

| Tradebilia category | Public-audit indication | Assessment for Tradebilia |
|---|---|---|
| **Pokémon / TCG** | Pokémon Cards showed **38,419 items** and **245 subcategories**. The lane supports set organization, cards, sealed products, promos, Japanese packaging, raw/graded variants, and collection workflows. | **Best initial fit.** Use for catalog/set/card-number/variation resolution; preserve language, finish, promo/stamp, sealed-versus-single, and grading distinctions as hard identity gates. |
| **Sports cards** | Sports Cards showed **4,452 items** across **11 subcategories**: hockey, baseball, basketball, football, non-sport, UFC, soccer, tennis, wrestling, racing, and golf. | **Useful but not proven comprehensive.** It is a credible enrichment source, not a replacement for specialist sports-card databases or direct sale evidence. |
| **Comics** | Comic Books showed **179 items** total, including **60 direct items** and **21 subcategories**. The category describes issue/printing/cover/edition/grade/restoration/completeness distinctions and credits Grand Comics Database reference data. | **Pilotable for exact-item normalization; shallow catalog risk.** Require issue, volume/year, printing, variant, direct/newsstand, grade, restoration, and page-quality gates. |
| **Coins** | Coins & Bullion showed **29 items** and **7 subcategories**, focused on U.S. lanes such as American Eagles, U.S. Mint releases, Morgan & Peace Dollars, graded U.S. coins, Buffalos, and cents. A representative American Eagle record had no listings or daily-price history. | **Defer broad use.** At most, test narrowly as contextual enrichment; it does not establish date/mintmark/variety/designation/problem-grade/NGC coverage. |
| **Music** | A Music category showed **748 items**. Search evidence indicates physical music releases/records, sometimes with low-confidence ask-only readings. | **Selective and contextual only.** No evidence establishes meaningful instruments, memorabilia, or music-autograph coverage. |
| **Vintage toys** | Collectibles & Toys was broad (**52,132 items**, **25 subcategories**) and includes lines such as Hot Wheels, action figures, and Funko. No dedicated vintage-toy lane was found. | **Do not treat as a vintage-toy catalog.** A broad toy lane does not demonstrate vintage identity, completeness, or grading coverage. |
| **Video games** | Video Games & Consoles showed **78 items** and **4 subcategories**, heavily concentrated in Nintendo. | **Exploratory only.** This is not evidence of broad platform, CIB, sealed, or graded-game valuation depth. |
| **Movies** | Exact movie search surfaced two Movies categories totaling **7 items**, mixing VHS and Funko-related objects. | **Unsupported for film-media valuation.** The lane is shallow and heterogeneous. |
| **Stamps** | No public philately category was found. Exact `stamps` search returned two LEGO products whose names contained the word. | **Unsupported.** Treat this as a coverage gap, not a negative search result that proves no tangential record exists. |
| **Autographs** | No dedicated autograph category was found. Hits were principally autograph trading cards rather than stand-alone memorabilia. | **Unsupported for authentication/provenance.** Do not use as an autograph-memorabilia authority. |
| **Disney pins** | No dedicated pin category was found; exact search returned a Disney Loungefly backpack rather than a pin. | **Unsupported.** |

The category conclusion is deliberately conservative. Pokémon/TCG, sports cards, and comics have enough evidence to justify a limited test of catalog normalization and transparent evidence presentation. Category presence does not establish full recall, data recency, or enough independent sold comparables for valuation. The other Tradebilia lanes still need their own specialist schemas and source strategy. [5] [6] [9] [10]

## Access, price, limits, licensing, and operating constraints

| Topic | What the reviewed official materials document | Decision implication |
|---|---|---|
| Public access | Discovery/search/browse/item endpoints are unauthenticated and read-only. | “Public” describes accessibility, not commercial reuse permission. Keep all retrieval server-side. |
| Pro authentication | Pro endpoints use `Authorization: Bearer <CollectAIO access token>` issued through Integrations. Product access requires `catalog:read`; saved-goal access requires `collection:read`. A no-token Pro request returned HTTP 401 with a Bearer challenge. | Never expose a token in a client, prompt, logs, or mobile build. Use a server-side secrets manager. |
| Published limit | The developer page states **120 calls per five minutes per token**. Browser origins are generally not CORS-permitted. | Add rate limiting, bounded retries, timeouts, circuit breaking, and an adapter cache only if a commercial agreement permits caching. |
| Pagination bounds | Search/browse use page 1–1,000 and `per_page` 1–96. Public sitemap supports `per` up to 5,000; public bulk item lookup accepts up to 200 slugs; Pro product bulk lookup accepts up to 100. | Batch only canonical, approved slugs. Do not crawl indiscriminately or create a commercial mirror. |
| Pricing and quotas | The reviewed public materials did **not** establish Pro pricing, a free tier, commercial price, broader quota, uptime/latency SLA, or request-volume SLA. | Obtain price, volume allowance, support, service level, and overage terms in writing before forecasting cost or dependencies. |
| Licensing and redistribution | Published terms prohibit consumer-token resale/sublicensing, a retained commercial dataset, paid customer-facing product use, and redistribution of raw marketplace records, seller data, images, source feeds, or third-party material without a separate written commercial agreement. | This is the production blocker. Written approval must cover the exact data elements, retention, display, calculation, attribution, deletion, and downstream use proposed by Tradebilia. |
| Writes and events | Only `GET` methods are published. No webhook, callback, create, update, delete, OAuth exchange, API-key flow, or marketplace-transaction flow is documented. | Do not design inventory, order, seller, or real-time synchronization around CollectAIO. Poll only if contractually permitted and operationally justified. |

CollectAIO’s terms and developer guide should be interpreted together. A public endpoint does not override the use restrictions in the terms. In particular, “internal research” and a user-visible Tradebilia trade-analysis feature are materially different uses. Tradebilia should obtain a written agreement before even retaining provider data beyond a tightly controlled technical proof of concept. [1] [4]

## Data-quality, valuation, and legal risks

**Derivative-source and duplicate risk.** A CollectAIO item can expose eBay historical sales and active listings as well as guide signals from TCGPlayer, Cardmarket, StockX, or other sources. Therefore, a CollectAIO eBay observation may duplicate Tradebilia’s direct eBay feed, 130point results, PWCC/Fanatics evidence, or a future specialist adapter. A provider-level source name is insufficient. Deduplicate on original marketplace/venue, stable listing or lot ID where available, normalized URL, exact sale date, title/variation, price/shipping semantics, quantity, and other permitted fingerprints before a record reaches a comparable cohort. [3] [8] [13]

**Estimate versus transaction risk.** Completed sales are the provider’s strongest signal. Active listings can be ask-only. Source guides and CollectAIO Value are context. Daily price points and source-specific summaries may be useful trend signals, but they are not automatically attributable single-sale observations. Tradebilia must not reclassify any of these derived fields as a realized comparable merely because the API returns a price. [3] [8] [14]

**Identity and condition risk.** A catalog match does not establish an exact market match. The documented schema can carry useful distinctions such as variation, language, set, collector number, finish, grade scale/value/provider/qualifier, and certification flag, but availability is category- and item-dependent. An integration must separate missing fields from confirmed matching fields. A sports-card parallel, a Pokémon finish or language, a comic printing/restoration state, or a coin designation can make a superficially similar sale economically invalid. [2] [8] [13]

**Coverage, sparsity, and recency risk.** Counts are live snapshots. Numerous categories are shallow or unsupported, and a valid item can lack listings, daily prices, UPC, grade data, or a current value. CollectAIO does not publish a complete source-by-source coverage matrix, refresh service-level agreement, matching precision/recall benchmark, or category-by-category recency guarantee in the reviewed materials. Treat its confidence labels as provider signals to preserve and test, not as independently validated certainty. [1] [2] [5]

**Contract and data-rights risk.** The highest nontechnical risk is misuse of marketplace records, seller information, images, source feeds, or a retained dataset. Rights to retrieve a public response are not demonstrated rights to republish it, place it in a paid tool, retain it, or calculate a customer-facing valuation. The agreement must resolve rights for raw and derived data separately. [4]

**Availability and integration risk.** CollectAIO documents a rate limit and a browser-origin constraint, but no public uptime, latency, or volume SLA in the reviewed materials. The provider should never become a single point of failure: timeout or denial must return Tradebilia to its current evidence path with a clear provider-availability diagnostic. [1] [13]

## Comparison with Tradebilia’s current source and evidence controls

Tradebilia’s current live design already separates eBay completed sales from active asks and only treats bid-supported auctions ending within one hour as authoritative when no sale exists. The server, not the language model, calculates the verified value gap. It also has direct and controlled source paths for eBay, 130point, PWCC/Fanatics, selected grading/certification sources, PCGS CoinFacts, and catalog/reference sources such as TCGdex, IGDB/RAWG, Discogs, Wikidata, and the Smithsonian National Postal Museum. Several sources are intentionally reference-only or context-only. [13] [14]

| Current Tradebilia capability | CollectAIO contribution | Boundary Tradebilia must preserve |
|---|---|---|
| Direct eBay sold and active evidence | May supply useful listing-level evidence and provider filtering/summary fields. | Do not count a CollectAIO eBay record as independent of direct eBay. Active asks remain context. |
| 130point and PWCC/Fanatics for sports/TCG | Can improve candidate catalog/variation resolution before specialist queries. | Deduplicate identical underlying transactions and keep specialist source provenance. |
| PriceCharting and other guide/context signals | Adds CollectAIO Value, source labels, basis, confidence, and history as a reconciliation layer. | A guide/estimate/history point never becomes an authoritative sale without attributable transaction evidence. |
| TCGdex, IGDB/RAWG, Discogs, Wikidata, Smithsonian metadata | Can provide a richer collectible catalog, images, UPCs, variation lanes, and category taxonomy in stronger CollectAIO lanes. | Metadata assists query construction but does not establish authenticity, condition, or value. |
| CGC, PSA, BGS, SGC, PCGS and future authentication routes | Exposes some grade/provider/qualifier/certified fields. | A CollectAIO indicator is not an independent certification verification. Keep certification routing and certificate-level checks separate. |
| Deterministic trade-gap and LLM guardrails | Can enrich explanation and evidence review. | The LLM must not use a CollectAIO estimate to override the server-computed verified gap. |

CollectAIO is consequently best understood as a **supplemental catalog-resolution and evidence-presentation adapter**, not a replacement for Tradebilia’s evidence hierarchy. Its most differentiated value is likely to be canonical slugs, identity/variation context, and transparent provider-provided basis/confidence/freshness fields. Its least safe role is as a universal valuation feed. [1] [2] [3] [13] [14]

## Recommended evidence role and admissibility policy

Tradebilia should query CollectAIO only after it constructs an item’s category-specific identity key. Search results can nominate a candidate slug; the item detail can then confirm supported identity fields. The user-facing item should retain a clear “candidate match” state when those fields are incomplete or conflicting. A scan, image match, OCR value, or provider suggestion remains a suggested catalog match—not authentication and not automatic valuation evidence. [2] [6] [13]

Use the following policy if the commercial agreement explicitly permits the relevant use:

1. **Catalog and query enrichment.** Use canonical slug, product/UPC, category path, set/number, variation, language, and grade-related metadata to improve Tradebilia query construction. Preserve match confidence and unresolved conflicts.
2. **Authoritative comparable admission.** Admit only an original, attributable, contract-permitted underlying record with an explicit `sold` state; a stable transaction/listing/lot identifier or sufficiently traceable original URL; sale date; currency; quantity; price and shipping treatment; exact identity/condition/grade lane; and no duplicate in a higher-priority or existing source.
3. **Context-only signals.** Keep CollectAIO Value, source-guide values, TCGPlayer/Cardmarket/StockX/BrickLink-like signals, daily-price history, listing summaries, unmatched listings, and active asks outside the authoritative cohort. Label basis, source, confidence, freshness, and any ask-only status in the UI.
4. **Rejection behavior.** If original provenance, sale status, identity, grade/condition, or contractual right is unknown, exclude the record from the verified cohort. “Insufficient exact evidence” is the correct result; Tradebilia must not infer a match.

This policy is stricter than simply consuming a price field, but it preserves the current analyzer’s safety properties. It also supports a user-auditable explanation of why a piece of evidence was used, contextualized, or rejected. [3] [8] [13] [14]

## Implementation plan and decision gates

### Phase 0 — Commercial and governance gate (**required before production data use**)

Request written CollectAIO approval tailored to Tradebilia. The agreement should name permitted endpoints; rate/volume; commercial price; support/SLA; attribution; permitted user display; caching and retention; deletion; whether raw listings, seller data, images, source feeds, and derived observations may be stored or displayed; geographic/data-security terms; and whether observations may influence an advisory trade analyzer. Obtain a vendor contact’s confirmation that the proposed purpose is a permitted paid customer-facing use. **If any required right is absent or ambiguous, stop: NO-GO.** [1] [4]

### Phase 1 — Server-only adapter and contract tests

Build a read-only `CollectAIOAdapter` behind both a feature flag and a provider-rights registry. Perform all calls from the server or controlled build-time process because browser origins are generally not permitted. Store bearer credentials only in server-side secrets management. Enforce the published 120-calls-per-five-minutes-per-token limit with a token bucket, bounded retries, exponential backoff, timeout, circuit breaker, and observability. Do not implement a cache until the contract supplies a cache duration and purpose. [1]

Pin the adapter to the reviewed OpenAPI schema version and validate a narrow internal response contract that accepts unknown extra properties and nulls. Persist provider schema/version, response retrieval time, source freshness, canonical slug, variation ID, evidence date, basis, confidence, inclusion state, and original source URL/ID where contractually allowed. A provider outage, 401, 429, schema break, or missing field must degrade cleanly to Tradebilia’s existing evidence flow. [1] [2]

### Phase 2 — Fixture-controlled pilot in three lanes

Start with Pokémon/TCG, sports cards, and comics only. For each lane, create positive and deliberately wrong-match fixtures. The identity gate must at minimum test: Pokémon expansion/collector number, language, finish, promo/stamp, sealed-versus-single, and grade; sports card player/set/card number, parallel, serial number, autograph/relic, raw-versus-slabbed, grader/grade/qualifier; and comic series/volume/year, issue/printing, edition/variant, raw-versus-slabbed, grader/grade, restoration, and page quality. Missing fields must decrease confidence or produce insufficient evidence, never prove a match. [13]

Test every candidate for source/transaction duplication against direct eBay, 130point, PWCC/Fanatics, and any future adapters. Test sold, active, unknown, excluded, and ask-only states; inclusive versus exclusive shipping; currency; multi-item lots; stale sales; and fallback behavior. Assert that CollectAIO Value, guide, active, and history records cannot enter an authoritative cohort. [3] [8] [13] [14]

### Phase 3 — Evaluation, controlled rollout, and expansion decision

Compare direct-eBay-only results with CollectAIO-assisted results against hand-labeled fixtures. Measure exact-match precision, false admission, duplicate-removal performance, correct insufficient-evidence outcomes, latency, provider-error rate, and change in authoritative-cohort quality by lane. Keep Tradebilia’s deterministic verified-gap and language-model guardrail regression tests unchanged. The minimum release criterion should be **no worsening of authoritative-comparable precision**; any critical false admission, unlicensed data behavior, or duplicate sale counted twice blocks rollout. [13] [14]

If Phase 3 passes and contractual rights are in force, release only as an opt-in, feature-flagged supplement with an evidence panel that labels provider, source, basis, confidence, freshness, and “context only” status. Reassess coins separately. Do not expand to stamps, Disney pins, stand-alone autographs, vintage toys, video games, or movies on the strength of broad-category presence alone. [5] [13]

## Final recommendation

**No-go for production integration today; conditional go for a narrow technical pilot after written commercial approval.** CollectAIO is technically credible as a server-side, read-only enrichment adapter in Pokémon/TCG, sports cards, and comics. It can help Tradebilia normalize identity and present evidence context. It should **not** become a primary valuation authority, a transactional integration, a broad all-category source, or a commercial data store under the publicly documented terms.

Tradebilia should proceed only when three gates are simultaneously satisfied: (1) CollectAIO signs off in writing on the exact commercial use and data rights; (2) the adapter preserves source-level provenance, identity/condition lanes, and duplicate controls; and (3) the fixture pilot demonstrates no deterioration in authoritative comparable precision. Until then, retain the current Tradebilia source hierarchy and treat CollectAIO research as a prospective integration option rather than an enabled production provider.

## References

[1]: https://www.collectaio.com/developers "CollectAIO Developer Guide"
[2]: https://www.collectaio.com/openapi.json "CollectAIO Public API OpenAPI 3.1 Schema"
[3]: https://www.collectaio.com/methodology "CollectAIO Methodology"
[4]: https://www.collectaio.com/terms "CollectAIO Terms of Service"
[5]: https://www.collectaio.com/browse "CollectAIO Public Category Directory"
[6]: https://www.collectaio.com/about "About CollectAIO"
[7]: https://www.collectaio.com/api/v2/search?q=charizard&page=1&per_page=2 "CollectAIO Live Public Search Example"
[8]: https://www.collectaio.com/api/v1/items/sv-scarlet-violet-promo-cards-pikachu-with-grey-felt-hat-085 "CollectAIO Live Public Item Detail Example"
[9]: https://www.collectaio.com/sports-card-comps "CollectAIO Sports Card Comps"
[10]: https://www.collectaio.com/item/spawn-1-1992-first-print-direct-edition "CollectAIO Comic Item and Evidence Example"
[11]: https://www.collectaio.com/ "CollectAIO Product Overview"
[12]: https://apps.apple.com/us/app/collectaio-price-guide/id6775346959 "CollectAIO Price Guide App Store Listing"
[13]: file:///home/ubuntu/tradebilia-isolated-development/TRADE_ANALYZER_SANDBOX_DEEP_DIVE.md "Tradebilia Sandbox Trade Analyzer Deep-Dive Assessment"
[14]: file:///home/ubuntu/tradebilia-isolated-development/TRADE_ANALYZER_AI_DOCUMENTATION.md "Tradebilia Trade Analyzer AI, Market Data, Questions, and Evaluation"
[15]: https://collect.ai/ "collect.AI Accounts Receivable Platform"
