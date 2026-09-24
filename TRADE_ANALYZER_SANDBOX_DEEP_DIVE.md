# Tradebilia Sandbox Trade Analyzer: Deep-Dive Assessment

**Date:** 2026-09-24  
**Scope:** Test AI sandbox only; no production Trade Room behavior was changed.  
**Author:** Manus AI

## Executive conclusion

The sandbox has progressed beyond a simple price lookup. It now has a meaningful evidence-control layer: category-aware source eligibility, eBay active and sold-comparable paths, image-based identity review, temporary field completion, visual filtering of candidate listings, certification routing, RSS market context, tolerant response handling, and a deterministic comparable engine.

The main remaining weakness is not the number of feeds. It is **item identity precision**. A collectible may be worth radically different amounts because of a variant, issue number, parallel, release, region, condition state, certification company, qualifier, restoration status, completeness, or provenance detail. The analyzer must therefore improve the structured identity and condition record before adding more broad news or asking-price sources.

The most urgent data focus is:

1. **Sports Cards** — parallel, serial-number, autograph/relic, grade, qualifier, and certification matching.
2. **Pokémon / TCG** — set, collector number, language, finish, promo/stamp, sealed state, and grade matching.
3. **Coins** — date/mintmark, variety, strike, problem status, designation, certification, and provenance.
4. **Comics** — exact issue, printing, variant, restoration, page quality, label, and CGC/CBCS certification.
5. **Autographs and Stamps** — authentication or expertization must precede valuation.

All eleven categories need additional structured data, but they do not need the same type of data. The category-by-category priorities are documented below.

## What is already implemented in the sandbox

### Evidence and valuation controls

The sandbox currently distinguishes active asking prices from completed sales. It also recognizes the approved near-closing auction exception: an auction is authoritative only when it has bids and is scheduled to end within one hour. Ordinary active listings remain contextual and are not treated as realized value.

The comparable engine now rejects known grade conflicts and known grading or authentication-company conflicts even when the listing title looks similar. It also applies visual filtering conservatively across the supported market sources. High-confidence visual mismatches can be removed, while uncertain, unreadable, or provider-failure cases are retained rather than silently discarded.

The result panel now exposes a comparable audit. It shows accepted and excluded candidates, scores, reasons, and a four-part sufficiency checklist covering identity confidence, recent sales, grade/condition confidence, and market stability. This is an important transparency improvement because a user can see why the result is weak instead of receiving only a number.

### Identity and image review

The sandbox can request multimodal identity review. It can also perform a separate, controlled visual-field completion pass for missing metadata. High-confidence visible or OCR-supported fields can temporarily improve the market query without overwriting the listing. Existing listing fields are preserved, conflicts are surfaced for review, and image-derived guesses are not treated as authentication or direct valuation evidence.

A final image-to-candidate comparison is available for sold-comparable results. This addresses the previously observed failure mode in which an unrelated object, such as a game cartridge appearing for a console search, could influence the result.

### Certification and reference sources

The current source registry contains live or controlled paths for the following areas:

| Data area | Current sandbox coverage | Assessment |
|---|---|---|
| eBay active listings | Live across categories | Useful for supply and asking-price context, not realized valuation. |
| eBay sold-comps path | Live across categories | Useful, but exact identity and sale-status filtering remain the main quality constraint. |
| CGC Comics | Live for Comics with CGC/CGC Comics certification routing | The certificate and population path is useful; it must remain separate from value evidence. |
| PSA, BGS, SGC | Live through Parse.bot paths in the sandbox | Useful for certificate and population context, subject to provider response quality and access terms. |
| PCGS CoinFacts | Live for Coins | Strong reference and certification context for PCGS material; NGC remains a gap. |
| 130point sales | Live for Sports Cards and Pokémon/TCG | Valuable cross-market sold context, but records must be deduplicated against other sources. |
| PWCC / Fanatics Collect | Live for Sports Cards and Pokémon/TCG | Useful specialist sold context; dated results should not become an unqualified current average. |
| PriceCharting | Live for Pokémon/TCG in the sandbox | Secondary guide/context signal; it must not be counted as independent from underlying marketplace data without deduplication. |
| TC Gdex | Live reference for Pokémon/TCG | Identification metadata only, not valuation or authentication. |
| IGDB and RAWG | Live reference sources for Video Games | Catalog metadata only; they do not supply collectible-condition or completed-sale evidence. |
| Discogs | Live reference source for Music | Release metadata only; exact pressing and condition remain unresolved without additional fields. |
| Wikidata | Live reference source for Movies and Autographs | General factual metadata only; not provenance, authentication, or value. |
| Smithsonian National Postal Museum | Live reference source for Stamps | Historical/reference metadata only; not stamp authentication or realized price. |
| NGC, CBCS, Heritage, GoCollect, Comic Book Realm | Placeholder or not yet live in the sandbox | Important pending source opportunities, but they require access and terms validation before implementation. |

### Market-news context

The RSS registry contains **140 feeds across eleven categories**. Current counts are:

| Category | Feeds |
|---|---:|
| Comics | 12 |
| Sports Cards | 16 |
| Vintage Toys | 17 |
| Video Games | 14 |
| Pokémon / TCG | 7 |
| Movies | 13 |
| Autographs | 9 |
| Disney Pins | 11 |
| Music | 17 |
| Stamps | 10 |
| Coins | 14 |

The RSS layer is appropriately treated as context. It can provide category-level direction, identify an article about the exact item, and explain possible demand events. It must not select a comparable, create a dollar value, or override the deterministic market evidence.

## Pending improvements in priority order

### 1. Establish a common evidence contract

Every market observation should carry the same minimum provenance fields before it can enter the comparable engine:

- Source name and source type.
- Stable listing, lot, or transaction identifier.
- Source URL or permitted evidence reference.
- Capture timestamp and sale date when different.
- Status: sold, active, unsold, passed, cancelled, withdrawn, estimate, or unknown.
- Price semantics: realized price, hammer price, buyer's-premium-inclusive price, asking price, offer, or guide value.
- Currency and treatment of shipping, tax, buyer's premium, and fees.
- Quantity and lot composition.
- Raw title, description, image references, and condition text.
- Normalized identity fields and match confidence.

Without these fields, the analyzer cannot reliably distinguish a completed sale from an ask, an auction estimate, an unsold lot, a multi-item lot, or a duplicated cross-post.

### 2. Make identity fields hard comparable gates

The current title and metadata improvements are useful, but the next phase should formalize category-specific identity keys. A comparable should be classified as **exact**, **near**, **contextual**, or **rejected**. Exact and near matches should require explicit evidence for the fields that materially determine value. A title-only match should never be enough for high-confidence valuation.

The engine should also distinguish a missing field from a negative field. For example, a listing that does not mention a sport is not necessarily a conflicting sport, but a listing that explicitly says “Basketball” must not enter a Baseball comparison set.

### 3. Add structured condition, completeness, and provenance

Condition is currently available in broad item metadata, but the next improvement should model condition as a category extension rather than a single text field. Examples include raw versus graded, sealed versus opened, complete versus incomplete, restoration, defects, accessories, label generation, autograph grade, page quality, and problem grades.

Images should support this process, but vision should produce reviewable observations and uncertainty, not an automatic authentication decision. The analyzer should state when the most important condition field is unknown and lower confidence accordingly.

### 4. Improve sold-data quality and deduplication

The sandbox has multiple sold-data paths. This is useful only if observations from the same underlying transaction are not counted multiple times. The engine should maintain a transaction fingerprint based on source, listing or lot ID, normalized title, sale date, seller or venue when permitted, price, and image or description similarity.

The analyzer should also keep separate cohorts for:

- Exact identity and exact grade.
- Exact identity with adjacent grade.
- Same release or issue but unknown grade.
- Related identity only.
- Active asking-price context.
- Historical or guide context.

Only the first cohort should normally drive a high-confidence value. Adjacent or related cohorts may widen a range, but they should be displayed as such.

### 5. Add recency and liquidity analysis

The current median and spread logic is a good base. It should be expanded with sales age, sale cadence, number of unique sellers or venues, active supply, sell-through where available, and the number of qualifying observations in the exact cohort.

A high median with one sale is not the same as a stable median with twelve independent sales. The UI should display “thin market,” “stale market,” or “high dispersion” rather than allowing a single exceptional transaction to look authoritative.

### 6. Improve certification routing

The certification workflow should be generalized as a source-routing table:

| Grading or authentication company | Category or item family | Identifier required | Data source role |
|---|---|---|---|
| CGC Comics | Comics and selected pop-culture paper collectibles | CGC cert number | Certification, label, grade, population context |
| PSA | Sports Cards, Pokémon/TCG, selected autographs | PSA cert number | Certification, grade, population context |
| BGS | Sports Cards and Pokémon/TCG | BGS cert number | Certification, grade, subgrades, population context |
| SGC | Sports Cards and Pokémon/TCG | SGC cert number | Certification, grade, population context |
| PCGS | Coins | PCGS cert number | Certification, grade, population and price-guide context |
| NGC | Coins | NGC cert number | Pending certification and census path |
| CBCS | Comics | CBCS cert number | Pending certification and population path |
| JSA, PSA/DNA, BAS | Autographs | Provider-specific ID | Pending authentication/provenance paths |
| AFA/CGA or equivalent | Applicable vintage toys | Provider-specific ID | Pending graded-toy verification path |

If the stored certificate is blank, the sandbox should attempt image review only when the listing has an image. The result should clearly state whether the number came from listing metadata or image OCR, and it should not overwrite the listing.

## Category-by-category data assessment

### Sports Cards — critical priority

**What is needed most:** sport, athlete, year, manufacturer, set, subset or insert, card number, parallel, serial-numbered print run, rookie designation, autograph or relic status, language, raw versus graded state, grader, grade, qualifier, subgrades, and certificate status.

**Why:** A same-player or same-base-card match can be economically wrong when the card is a different parallel, autograph, relic, serial run, qualifier, or grading-company product. The current sports criteria and sport-token filtering are useful, but the next gate should ensure that explicit conflicts on card number, parallel, serial status, autograph, relic, and grade exclude a candidate.

**Data priority:** exact completed sales first; certification and population second; catalog/checklist normalization third; news only as context. The sandbox already has the strongest multi-source market foundation here through sold comps, 130point, PWCC/Fanatics, and grading paths. It now needs stricter identity and deduplication more than more feeds.

**Recommended next implementation:** add a sports-card identity object and tests for base card versus parallel, raw versus graded, autograph versus non-autograph, serial-number mismatch, and exact sport mismatch.

### Pokémon / TCG — critical priority

**What is needed most:** Pokémon name, set or expansion, collector number and denominator, language, release era, rarity, finish, promo or stamp, first edition or unlimited status, raw versus graded state, and sealed-product versus single-card status.

**Why:** The official Pokémon TCG database demonstrates the depth of the catalog taxonomy: card type, rarity, expansion, illustrator, mechanics, and other attributes are distinct fields.[3] A title such as “Charizard” is not an identity key.

**Data priority:** official catalog reconciliation, exact sold records, PSA/CGC/BGS/SGC certification and population context, then PriceCharting or TCGplayer as separately labeled context. Avoid double-counting PriceCharting-derived observations with underlying eBay observations.

**Recommended next implementation:** build an expansion-plus-card-number identity key and add hard exclusions for language, finish, promo/stamp, sealed configuration, and grade mismatch.

### Coins — critical priority

**What is needed most:** country or issuer, denomination, date, mintmark, series, composition, strike or finish, variety attribution, error or pattern status, exact grade, designation, problem grade, certification number, CAC/CACG status, and provenance.

**Why:** Date and denomination alone are unsafe. Small differences in mintmark, variety, strike, designation, problem status, or eye appeal can create a major price difference.

**Data priority:** completed auction records from specialist venues, PCGS and NGC certification/census data, and issuer specifications. PCGS is live in the sandbox, but NGC remains a meaningful gap. Population reports must remain service-specific; they are not total surviving population.

**Recommended next implementation:** add a coin identity key and a separate designation/problem-grade model. Add tests that prevent a cleaned or details-grade coin from entering a straight-grade cohort.

### Comics — critical priority

**What is needed most:** publisher, normalized series, volume and year, issue number, printing, variant, cover type, direct/newsstand status where applicable, UPC or barcode, raw versus slabbed status, grader, grade, label, restoration or conservation, page quality, and pedigree or provenance.

**Why:** CGC population data is now integrated and useful for certification context. CGC itself states that its population report reflects collectibles graded by the CCG companies and is not an indicator of value or rarity.[2] The population result therefore cannot compensate for weak issue, variant, condition, or sold-comparable matching.

**Data priority:** exact issue/variant identity and condition first; CGC/CBCS certification second; attributable completed sales third; market news fourth. The most important pending sources are CBCS verification, NGC-equivalent paths only where relevant, and permitted specialist auction or comic-sales data.

**Recommended next implementation:** add an issue/printing/variant identity object and tests for reprint versus original, variant versus regular cover, raw versus CGC, restored versus unrestored, and page-quality mismatch.

### Autographs — critical priority

**What is needed most:** signer identity, signed item type, medium, dimensions, single versus multi-signed, inscription, personalization, witnessed versus opinion authentication, provider, certificate or hologram, chain of custody, signature condition, and provenance.

**Why:** A generic COA or signer name does not establish authenticity. The same signer can have very different values depending on item, authentication scope, inscription, signature strength, and provenance.

**Data priority:** authentication and provenance before valuation. Candidate future providers include PSA/DNA, JSA, BAS, MLB, Fanatics, and Upper Deck verification paths, but each requires provider-specific access and must not be represented as a generic universal certificate source.

**Recommended next implementation:** add an authentication-scope model and prevent an unverified COA from being treated as equivalent to a provider-verified certificate or witnessed item.

### Stamps — critical priority

**What is needed most:** issuing country, date, denomination, catalog number, perforation, watermark, paper, gum, shade, plate or position, variety or error, cancellation, postal-history format, expert certificate, and alteration status.

**Why:** Visually similar stamps can differ materially by watermark, perforation, gum, cancellation, repair, or expert opinion. Catalog values and dealer asks are not realized transactions.

**Data priority:** licensed catalog identity, expertization and certificate records, and primary auction results. Smithsonian reference data is useful for context but does not replace philatelic expertization or completed-sale evidence.

**Recommended next implementation:** introduce stamp-specific identity and alteration fields, then add exact catalog-number and condition gates.

### Video Games — high priority

**What is needed most:** title, platform, region, language, publisher, product code, release date, format, original versus reprint, bundle or pack-in status, loose/CIB/sealed state, completeness, functionality, grading company, grade, and seal grade.

**Why:** Title-plus-platform is not enough. Regional releases, Player's Choice or Greatest Hits editions, bundles, reprints, box-only listings, damaged or untested copies, and graded sealed games should be separate cohorts.

**Data priority:** the current IGDB and RAWG paths provide catalog context only. The next market improvement requires approved completed-sale access, specialist auction evidence, and a certification/population route for graded games.

**Recommended next implementation:** add platform-region-format-release gates and a strong exclusion list for digital codes, reproduction/homebrew, box-only, manual-only, parts/repair, and untested listings.

### Vintage Toys — high priority

**What is needed most:** manufacturer, franchise or line, release year, region, subtype, character or model, series, wave, SKU, scale, package revision, variant, mold/deco details, accessories, original versus reproduction parts, loose/carded/boxed/sealed state, and functionality.

**Why:** The difference between complete original, incomplete, reproduction-heavy, sealed, opened, working, and non-working can exceed the difference suggested by the title. No live specialist market or grading source is currently visible in the sandbox registry.

**Data priority:** identity and completeness first; specialist completed auctions second; graded-toy certification where applicable; news only as context. The existing RSS coverage is broad, but RSS does not solve the wrong-comparable problem.

**Recommended next implementation:** add toy-specific completeness and reproduction flags, then create an approved source adapter for specialist auction results if terms permit.

### Movies — high priority

**What is needed most:** collectible subtype, film title and release year, country, studio, original versus reissue, dimensions or format, catalog/NSS/UPC identifier, condition/restoration, provenance, certification, and sold status.

**Why:** “Movies” is a heterogeneous category. A poster, prop, costume, signed photo, VHS, Blu-ray, and production-used object cannot share a comparable pool merely because they reference the same film.

**Data priority:** cross-type blocking, provenance, and exact completed sales. Wikidata helps factual context for the film work, but not the physical collectible. The sandbox needs separate subtype logic before additional pricing sources.

**Recommended next implementation:** split Movies into poster, home video, prop/costume, signed memorabilia, and other subtypes, each with its own identity and condition fields.

### Disney Pins — high priority

**What is needed most:** official product or SKU, issuer and release channel, year, series, open-edition versus limited-release status, run size, set or blind-pack membership, pin mechanics, backstamp, authenticity evidence, scrapper/counterfeit risk, condition, and completeness.

**Why:** Character similarity is not enough. Channel, edition, set membership, variant, and authenticity are central. The current sandbox has RSS context but no live specialist Disney-pin catalog or completed-sale source.

**Data priority:** catalog identity and authenticity review first, individual completed sales second, liquidity third. Population should not be invented; issuer-declared run size is not a surviving population.

**Recommended next implementation:** add a pin identity and authenticity-review path, then evaluate a permitted catalog such as Pin & Pop or a manual-review workflow before any automated integration.

### Music — high priority

**What is needed most:** artist, release title, exact release or pressing, label, catalog number, country, release year, format, barcode, pressing plant, matrix/runout, edition or color, disc count, sleeve and insert completeness, and media/packaging condition.

**Why:** The current Discogs source provides release metadata, but a release group is not the same as a specific pressing. MusicBrainz provides structured artist, recording, release, release-group, label, barcode, and ISRC relationships, but its public service is subject to rate limits and commercial-use terms.[4]

**Data priority:** pressing-level identity and condition, followed by completed sales. Discogs active-market signals and eBay active listings remain asking-price context unless an approved sold-data path is added. For instruments and gear, a separate subcategory and source model is required.

**Recommended next implementation:** split Music into physical recordings, instruments/gear, and memorabilia. Add pressing and condition fields before using release-level matches.

## Which categories need more data most urgently?

### Tier 1: immediately focus data and matching work

**Sports Cards, Pokémon/TCG, Coins, and Comics** should receive the next engineering attention. They have a strong combination of market activity and severe value divergence between near-identical items. The sandbox already has several useful sources for these categories, so better identity gates, source deduplication, and certification routing can produce measurable improvement without waiting for every new API.

### Tier 2: add authenticity and specialist-market data

**Autographs and Stamps** need expert or provider-backed identity before their valuation can be trusted. The central issue is not feed volume. It is whether the offered item is authentic, correctly identified, and comparable to the sold record.

### Tier 3: add subtype and completeness modeling

**Video Games, Vintage Toys, Movies, Disney Pins, and Music** need subtype-specific schemas. Their current reference sources can help identify items, but generic category-level price logic is unsafe until the analyzer separates the major collectible forms and condition states.

## Data that can be added now without waiting for new credentials

The following work can proceed in the sandbox immediately:

1. Add category-specific identity schemas and hard comparable gates.
2. Add exact, near, contextual, and rejected comparable classes to the result contract.
3. Add sale-status and price-semantics fields to every source result.
4. Add transaction deduplication fingerprints across eBay, 130point, PWCC/Fanatics, and any future auction sources.
5. Add recency, unique-sale count, venue diversity, sale-age, and thin-market warnings.
6. Add category-specific missing-data checklists to the Test AI result panel.
7. Expand certificate routing to distinguish metadata cert IDs from image-read cert IDs and provider-specific result confidence.
8. Add regression fixtures for high-risk wrong matches in each category.
9. Keep RSS market context separate while adding explicit source availability, feed freshness, and article coverage diagnostics.
10. Add a provider and data-rights registry so a source cannot be marked “live” merely because a public page exists.

## Data that requires credentials, licensing, or approval

The following should not be implemented as assumed public feeds:

- eBay Product Research or any completed-sales product beyond the currently permitted sandbox path. eBay documents that Product Research provides up to three years of sales data, actual accepted Best Offer prices, sell-through, shipping metrics, and seller counts, but it is accessed through Seller Hub rather than being equivalent to the public Browse API.[1]
- Commercial catalog or price data such as GPA, TCGplayer partner data, Pin & Pop, WorthPoint, Scott, and commercial MusicBrainz arrangements.
- Automated or bulk use of auction archives from Heritage, Goldin, Stack's Bowers, GreatCollections, Hake's, Morphy, Propstore, ComicLink, Siegel, and similar sources.
- Bulk certification, population, or hologram lookups from PSA, CGC, CBCS, SGC, BGS, PCGS, NGC, CAC/CACG, JSA, BAS, MLB, Fanatics, Upper Deck, AFA, and related providers.
- Long-term storage or public display of source images and catalog-derived content where the source imposes attribution, share-alike, or non-redistribution restrictions.

## Recommended next build sequence

### Phase 1: evidence governance and regression safety

Create a shared observation contract, explicit sale-status taxonomy, price-semantics fields, provenance requirements, and cross-source deduplication. Add a test corpus of deliberately wrong comparables across the top four categories.

### Phase 2: identity and condition extensions

Implement category-specific identity objects for Sports Cards, Pokémon/TCG, Coins, and Comics. Add raw/graded, condition, completeness, restoration, and certification fields. Add strict hard exclusions and display the reason for every exclusion.

### Phase 3: liquidity and confidence

Add exact-cohort sale counts, age distribution, unique-venue counts, price dispersion, active supply, and thin-market warnings. Make “insufficient evidence” a first-class result rather than a fallback hidden behind an owner estimate.

### Phase 4: source expansion

Only after Phases 1–3, evaluate NGC, CBCS, specialist auction sources, MusicBrainz/pressing enrichment, Pokémon partner data, and category-specific authentication paths. Each adapter should have a source contract test, rights/access record, freshness behavior, and an explicit statement of whether its data is valuation evidence or context.

### Phase 5: production-readiness review

Do not move these sandbox improvements into production until the analyzer can show, for representative examples, that it rejects wrong issue, variant, grade, certification company, condition, subtype, and sale-status matches. Production rollout should require a documented accuracy review and a clear human-review path for high-value or low-confidence trades.

## Final assessment

The sandbox is now strong enough to test analyzer logic and evidence safety, but it is not yet a complete category-aware appraisal system. The next improvement should be **better structured data and stricter comparable admission**, not simply more RSS feeds or more active listings.

The most valuable near-term result is a transparent analyzer that sometimes says “insufficient exact evidence” for the right reason. That outcome is safer and more useful than a precise-looking number built from a similar title, an asking price, a population count, or an unrelated but visually attractive listing.

## References

[1]: https://www.ebay.com/help/selling/selling-tools/product-research?id=4853 "eBay Product Research"
[2]: https://www.cgccomics.com/population-report/ "CGC Population Report"
[3]: https://www.pokemon.com/us/pokemon-tcg/pokemon-cards "Pokémon Trading Card Database"
[4]: https://musicbrainz.org/doc/MusicBrainz_API "MusicBrainz API"
[5]: https://www.comics.org/ "Grand Comics Database"
[6]: https://www.psacard.com/cert "PSA Certification Verification"
[7]: https://www.psacard.com/Pop "PSA Population Report"
[8]: https://www.pcgs.com/cert "PCGS Certification Verification"
[9]: https://www.ngccoin.com/population-report/ "NGC Census Population Report"
[10]: https://developer.ebay.com/develop/api/buy/browse_api "eBay Browse API"
[11]: https://www.tcgplayer.com/ "TCGplayer"
[12]: https://www.pricecharting.com/category/pokemon-cards "PriceCharting Pokémon Cards"
[13]: https://www.pinandpop.com/docs/api/v1-pins "Pin & Pop API documentation"
[14]: https://www.ha.com/information/about-auction-archives.s "Heritage Auctions Auction Archives"
[15]: https://www.comiclink.com/auctions/auctionschedule.asp "ComicLink Auction Results"
[16]: https://www.cbcscomics.com/verify-cbcscert/ "CBCS Certification Verification"
[17]: https://www.cbcscomics.com/population-report/ "CBCS Population Report"
[18]: https://www.gpanalysis.com/ "GPA Analysis"
[19]: https://www.mobygames.com/ "MobyGames"
[20]: https://www.discogs.com/developers/ "Discogs Developer Documentation"
[21]: https://www.siegelauctions.com/ "Robert A. Siegel Auction Galleries"
[22]: https://archive.stacksbowers.com/ "Stack's Bowers Auction Archive"
[23]: https://www.propstore.com/products/archive/ "Propstore Archive"
[24]: https://www.jsa-authentication.com/ "James Spence Authentication"
[25]: https://www.autographu.com/ "Autograph University"
[26]: https://www.reverb.com/price-guide "Reverb Price Guide"
[27]: https://www.usmint.gov/learn/coins-and-medals "United States Mint Coins and Medals"
[28]: https://www.gocollect.com/ "GoCollect"
[29]: https://www.comicbookrealm.com/ "Comic Book Realm"
[30]: https://www.pricecharting.com/ "PriceCharting"
[31]: https://tcg.pokemon.com/en-us/news/ "Pokémon Trading Card Game News"
[32]: https://www.disneystore.com/collectibles/pins/ "Disney Store Pins"
[33]: https://pinpics.com/aboutpinpics/ "PinPics About and Catalog Information"
[34]: https://www.worthpoint.com/ "WorthPoint"
[35]: https://www.scottstamp.com/ "Scott Stamp Catalog"
[36]: https://www.philatelicfoundation.org/ "The Philatelic Foundation"
[37]: https://stamps.org/services/stamp-authentication "American Philatelic Society Expertizing"
[38]: https://www.igdb.com/api "IGDB API"
[39]: https://rawg.io/apidocs "RAWG API"
[40]: https://www.wikidata.org/wiki/Wikidata:Data_access "Wikidata Data Access"
[41]: https://www.si.edu/openaccess "Smithsonian Open Access"
[42]: https://www.psacard.com/services/autograph-authentication "PSA/DNA Authentication"
[43]: https://www.mlbauthentication.com/ "MLB Authentication"
[44]: https://upperdeck.com/ud-authenticated/ "Upper Deck Authenticated"
[45]: https://www.cgccomics.com/ "CGC Comics"
[46]: https://www.cacgrading.com/ "CAC Grading"
[47]: https://www.afagrading.com/ "Action Figure Authority"
[48]: https://www.musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting "MusicBrainz API Rate Limiting"
[49]: https://www.tcdb.com/ "The Trading Card Database"
[50]: https://www.gocollect.com/ "GoCollect Graded Comic Analytics"

*Note: The report assesses the code and files present in the isolated Tradebilia sandbox. External sources are classified by documented role and access requirements; a publicly viewable page is not treated as permission for automated ingestion or as proof of a live connector.*
