# Tradebilia Trade Analyzer: Add-Inventory Field Gap Assessment

**Assessment date:** 25 September 2026  
**Scope:** All active Add Inventory category and item-type definitions—**11 categories and 45 item types**—reviewed against the current Test AI evidence model, certification routing, comparable filters, image-review safeguards, and currently connected source contracts.  
**Decision status:** Report only. **No Add Inventory schema, database, production Trade Room, source eligibility, or valuation logic was changed.**

## Executive conclusion

**Yes—some additional user-entered fields would materially improve the Trade Analyzer.** The important gap is not a lack of generic information or additional seller-entered market prices. It is **physical identity precision**: enough structured information to reject a clearly wrong comparable before its price can influence the discussion.

The review identified **82 category-and-item-type extensions**, but they should **not** be interpreted as 82 new always-visible form fields. They reduce to nine controlled field families, most of which should appear only for the affected item type and only when relevant. The most valuable additions are: exact edition/printing/subset identifiers; material condition exceptions such as restoration, Details/problem status, raw defects, and seal integrity; physical configuration and contents; grade-label qualifiers; and capped constituent manifests for valuable items inside lots or sets.

> **Core principle:** An explicit conflict should reject an exact comparable. A missing candidate field is **unknown**, not a contradiction. Unknown data reduces confidence or permits only a near/contextual comparison; it must not be silently treated as a match.

The first implementation step should **not** be adding new form controls. It should be making the analyzer consistently normalize and use the strong data it already collects—title, item type, set/series, edition, condition, grade, grading company, certification number, variant, sealed/completeness status, and photos. New fields add value only when they are connected to category-specific query construction and exact/near/contextual/rejected comparable gates.

## How the review was performed

The active field-definition modules were converted into a code-derived snapshot, then compared to the sandbox’s source applicability matrix, selected-item normalization, source contracts, visual field-completion rules, visual comparable filter, and deterministic market-evidence rules. The review deliberately excludes shipping and dimensions, except where dimensions are already native to an original-art object. It also distinguishes seller-entered facts from external evidence.

| Data class | What belongs there | Analyzer treatment |
|---|---|---|
| **Existing intake field** | Listing identity, condition, item type, known edition/variant, graded status, company, grade, certificate number, completeness, photos | Normalize aliases and values; use material fields in the category identity object and comparable gate. Do not add a synonymous duplicate field. |
| **Proposed intake field** | A seller-observable physical fact that meaningfully separates one market object from another | Controlled values, conditional display, and an **Unknown** option. Preserve the entered fact; never silently replace it with an image or source response. |
| **Source-derived observation** | Sale status, sold or asking price, catalog/provider response, listing URL, population, guide value, source timestamp, visual/OCR suggestion | Keep in the evidence layer with provenance and confidence. It must not become a seller assertion or direct proof of value/authenticity. |
| **Future-integration-only data** | Certification-verification result, specialist-catalog resolution, auction archive result, provider status | Do not create an input that implies the provider is connected. Add provider-specific routing only after access, terms, response contract, and evidence role are approved. |

This boundary matters for existing sandbox sources. Pokémon Price Tracker requires exact card-name, set, and collector-number agreement before its detail or population context is used; its prices and histories remain context, not valuation input.[3] HIPStamp similarly treats physical stamp format as an identity boundary: a loose single, hinged block, sheet, and lot cannot be treated as the same market object.[4]

## Existing field coverage

The current field model is already stronger than a title-only marketplace intake. The table below summarizes the active scope reviewed.

| Category | Item types reviewed | Existing identity strengths that should be activated before adding fields |
|---|---|---|
| Sports Cards | Single Card; Set/Card Set; Unopened Product; Collection Lot | Sport, player, year, manufacturer, set, card number, parallel, serial, rookie, autograph/relic flags, grade and certification data |
| Pokémon / TCG | Single Card; Set; Unopened Product; Collection Lot | Card name, set, collector number, edition/era, finish/variant, special attributes, language on Single Card, grade and certification data |
| Comics | Single Comic; Original Art; Collection Lot | Comic title, issue, publisher, volume/year, variant, signature, graded state; creator/page details for art |
| Coins | Single Coin; Paper Money; Coin Set; Collection Lot | Country, denomination, year, mint mark, variety, composition, serial/signature for paper money, grade and certification data |
| Stamps | Single Stamp; Stamp Set; Collection Lot | Country, Scott number, year, denomination, mint/used, hinged, sheet type, grade and certificate data |
| Autographs | Signed Item; Collection Lot | Signer, signed-item type, inscription, authentication company/type/certificate and lot-level signer/authentication context |
| Video Games | Game; Console; Accessory; Collection Lot | Title/platform/year/region, CIB/case/manual/sealed state, console model/functionality/components, accessory identity/functionality |
| Vintage Toys | Action Figure; Board Game; Electronic Toy; LEGO; Model Kit; Playset; Plush; Vehicle; Collection Lot | Toy name, brand, year, franchise, packaging, completeness, accessories, functionality, LEGO set number, generic grade/certificate fields |
| Movies | Individual Movie; Box Set; Collection Lot | Title, physical format, release year, edition, region, sealed state, count and generic grading fields |
| Disney Pins | Single Pin; Pin Set; Collection Lot | Pin name, character, series, year, event, open/limited edition, AP/PP, backstamp and backer-card data |
| Music | Vinyl; CD; Cassette; 8-Track; Other Format | Artist, release title, label, catalog number, country, year, edition, media/packaging condition, playback status, format-specific details |

The full code-derived current-field inventory is available in the supporting snapshot.[1]

## Recommended field patterns

The following are reusable patterns. They should only be added to the named item types—not added globally to every category.

| Field pattern | Analytical reason | Rule for comparable admission |
|---|---|---|
| **Printed identity identifier** | A manufacturer code, SKU, UPC/EAN, barcode, NSS number, catalog identifier, or equivalent often separates otherwise identical-looking releases. | Exact token match when both target and candidate expose it; an explicit conflict rejects exact admission. |
| **Edition, printing, subset, series, or variant** | A base card versus insert, first printing versus reprint, coin strike, toy revision, or game reprint can have a separate market. | Explicit mismatch rejects exact admission; omitted source information remains unknown. |
| **Language, release market, or distribution channel** | Language, direct-market/newsstand, regional release, or release channel can describe distinct product cohorts. | Reject only explicit incompatible values. |
| **Physical form and configuration** | A loose game, box-only item, digital code, sealed product configuration, stamp block, movie subtype, or accessory bundle is a different market object. | Incompatible form is a hard exclusion; do not collapse mixed lots or components into a complete single-item cohort. |
| **Condition, alteration, and seal integrity** | Broad condition does not capture restoration, Details/problem grading, raw defects, repair, reseal concern, functionality, or playback. | Explicit straight-versus-problem, intact-versus-damaged/reseal, restored-versus-unrestored, or working-versus-fault conflict is segregated or rejected. |
| **Completeness and material contents** | A simple Yes/No often cannot describe expected components, missing items, or valuable constituents inside a set or lot. | Exact cohort requires compatible declared contents. Partial or unknown manifests remain near/contextual evidence only. |
| **Grading-label detail** | A numeric grade alone does not always express a qualifier, designation, subgrades, seal notation, or Details label. | Company, grade, and explicit designation/qualifier conflicts become separate cohorts or exclusions. |
| **Authentication, expertization, and provenance risk** | Authentication scope, expertization, coverage of a lot, or a scrapper concern can materially affect confidence. | Improves segregation and confidence, but does **not** authenticate an item without a permitted provider-backed route. |

## Category-by-category field recommendations

The recommendations below identify **only fields that are absent or insufficiently structured today**. Where a category already has a semantic equivalent, the action is to normalize and use it—not create another input.

| Category | Proposed field extension | Applies to | Priority | Why it is useful to the analyzer |
|---|---|---|---|---|
| **Sports Cards** | Subset / insert name | Single Card | Critical | Separates base cards from named inserts, short-print subsets, and insert families that can otherwise share player, year, manufacturer, and card-number-like text. |
|  | Language / market edition | Single Card; Set; Unopened Product | High | Prevents domestic and international editions from entering one exact comparable cohort. |
|  | Grading-label qualifier / label detail | Graded Single Card | High | Preserves value-relevant qualifiers and label distinctions that a generic grade cannot express. |
|  | Four-aspect raw-condition observations | Ungraded Single Card | High | Captures centering, corners, edges, and surface separately from broad condition. |
|  | Autograph format and relic provenance/material | Single Card when applicable | High | Separates on-card/sticker/cut signatures and game-used/player-worn/manufactured/relic configurations. |
|  | Seal-integrity condition | Unopened Product | High | Separates intact factory seal from damaged or suspected-reseal condition. |
| **Pokémon / TCG** | Language / market | Set; Collection Lot; Unopened Product | High | Single Card already has language; non-single product needs the same release-cohort discriminator. |
|  | Set-completeness scope | Set | High | Distinguishes a base/numbered set from a master set with reverse holos, secrets, promos, or other expected components. |
|  | Graded-card manifest | Set; Collection Lot | High | Gives material slabs their own card, grader, grade, and certificate identity rather than using a generic “includes graded cards” flag. |
|  | Grade qualifier / BGS subgrades | Graded Single Card | High | Prevents same-numeric-grade but materially different label products from being treated as exact. |
|  | Raw defects / alteration flags | Ungraded Single Card | High | Captures creases, dents, whitening, surface wear, stains, trimming, restoration, and unknown state. |
|  | Product configuration / pack count and seal integrity | Unopened Product | High | Separates different sealed configurations, included promos, and a clean seal from damaged/suspect seal state. |
| **Comics** | Printing / edition designation | Single Comic; key comic rows in lots | Critical | Separates original/first printing, later print, reprint, and facsimile. |
|  | Restoration / conservation status | Single Comic; Original Art; key lot rows | Critical | Prevents restored/conserved material from sharing an exact cohort with unrestored material. |
|  | Key-comic manifest | Collection Lot | Critical | Captures the issues and graded key books driving lot value, with per-comic condition/certification identity. |
|  | Graded branch for Original Art | Original Art | Critical | Original Art currently needs a conditional is-graded, company, grade, and certificate group for encapsulated art. |
|  | Structural completeness / material-defect status | Single Comic; key lot rows | High | Separates complete copies from missing-page, clipped-coupon, detached/replaced-cover, or other structurally incomplete copies. |
|  | Distribution type and UPC/barcode | Single Comic; key lot rows | High | Captures direct-market/newsstand and another visible edition-resolution key. |
|  | Published-page cover date | Original published page | High | Disambiguates relaunched or repeated series titles beyond issue and page number. |
| **Coins** | Coin or paper-money series / issue | Single Coin; Paper Money; Coin Set | Critical | Adds an exact identity key beyond country, denomination, date, and title. |
|  | Strike / finish | Single Coin; Coin Set | Critical | Separates business strike, proof, specimen, and finish cohorts. |
|  | Grading designation / qualifier | Single Coin; Paper Money | Critical | Preserves grade-label details such as designations and paper-money qualifiers. |
|  | Problem / alteration / Details status | Single Coin; Paper Money | Critical | Prevents cleaned, repaired, damaged, altered, or Details material from entering a straight-grade cohort. |
|  | Error, pattern, replacement-note attribution | Single Coin; Paper Money | High | Keeps error coins, patterns, and star/replacement notes separate from ordinary issues. |
|  | CAC/CACG status | Certified Single Coin | High | Preserves a material certified-coin market distinction while remaining a user-declared status unless verified later. |
|  | Set completeness and graded-constituent manifest | Coin Set; Collection Lot | High / Critical | Describes missing/substituted coins and lets valuable slabbed constituents retain their own PCGS routing data. |
|  | Group metal classification and documented pedigree note | Coin Set; Collection Lot | High / Medium | Helps separate bullion-heavy/mixed groups and keep exceptional-provenance claims visible but unverified. |
| **Stamps** | Physical configuration | Single Stamp; Collection Lot | Critical | Explicitly distinguishes loose single, pair/strip, block, sheet, cover/piece, and mixed lot. |
|  | Perforation and watermark | Single Stamp; Stamp Set | Critical | Resolves varieties that may otherwise share country, year, denomination, and broad catalog identity. |
|  | Variety/error attribution and paper/printing type | Single Stamp; Stamp Set | High | Prevents normal issues from sharing cohorts with material varieties, overprints, papers, or printing variants. |
|  | Cancellation type | Single Stamp; Stamp Set | High | Separates CTO, postal cancellation, pen cancellation, uncancelled, and unknown states. |
|  | Alteration/repair status and expertizing service | All Stamp types | High | Makes regumming, reperforation, repairs, thinning, or expert-review claims explicit without treating them as verified. |
| **Autographs** | Authentication scope / method | Signed Item; constituents in lots | Critical | Separates witnessed/provider opinion/issuer authentication/generic COA/unsupported claims. |
|  | Authentication coverage manifest | Collection Lot | Critical | Prevents one authenticated minor item from implying the whole lot—or its important signer—is authenticated. |
|  | Signature count | Signed Item; Collection Lot | High | Separates single-signature from multi-signature objects. |
|  | Underlying signed-item identity and edition/substrate | Signed Item; notable lot constituents | High | Adds the specific edition, title, team/event, year, brand/model, or signed surface needed to compare the physical item—not just its signer. |
|  | Signature condition and conditional provider-issued autograph grade | Signed Item; eligible lot constituent | High / Medium | Keeps fading, smudging, placement, and a true autograph grade separate from overall item condition. |
|  | Evidence-class provenance summary | Signed Item; Collection Lot | Medium | Supports confidence explanation for documented acquisition/auction/estate history without treating it as authentication. |
| **Video Games** | Product code / catalog number | Game | Critical | Distinguishes physical releases that title, platform, and year cannot resolve. |
|  | Physical item form / media type | Game | Critical | Separates cartridge/disc, loose media, box-only/manual-only, digital code, reproduction/homebrew, and parts/repair. |
|  | Edition / release configuration and language | Game; Console | High | Captures reprint/budget lines, special hardware variants, color/storage, pack-ins, and language. |
|  | Tested functional status | Game | High | Separates tested working, tested fault, untested, and parts/repair without inferring operation from a photo. |
|  | Seal grade / seal qualifier | Graded and sealed Game | High | Preserves a grading-label distinction that is separate from the item grade. |
|  | Manufacturer part/model number and required component configuration | Accessory | High | Separates revisions and accessories that require a receiver, dongle, power supply, memory unit, or similar component. |
|  | Structured contents / graded-item manifest and required photos | Collection Lot | Critical / High | Lets high-value contents and slabs be reviewed; Collection Lot currently needs a dedicated photo requirement. |
| **Vintage Toys** | Manufacturer SKU / catalog number | Most individual types except LEGO | Critical | Adds the strongest missing printed identity key; LEGO set number already fills this role. |
|  | Series / wave / edition | Most individual types | Critical | Separates releases with identical names but different production runs and contents. |
|  | Variant / mold / deco / package revision | Figure, electronic toy, model kit, playset, vehicle | Critical | Captures economically material configuration differences. |
|  | Scale / figure size and release market | Figure/Vehicle; most individual types | High | Separates size and regional packaging/release cohorts. |
|  | Originality / alteration status | Most individual types | High | Discloses reproduction/replacement parts, repaint/restoration, customization, or mixed components. |
|  | Component detail and packaging seal/opening state | Types where existing completeness is insufficient | High | Extends a simple packaging or accessory flag into a usable condition/completeness discriminator. |
| **Movies** | Collectible subtype | Individual Movie; Box Set; Collection Lot | Critical | Blocks home video, poster/paper, prop/costume, signed memorabilia, production-used, and mixed forms from sharing a title-only cohort. |
|  | Physical release identity | Individual Movie; Box Set | Critical | Captures distributor/label plus catalog number, UPC/EAN, or NSS number for exact physical release matching. |
|  | Contents/component manifest | Box Set; Collection Lot; special editions | High | Distinguishes complete multi-disc/bonus-component releases from incomplete objects. |
|  | Media condition and playback status | Home-video subtype | High / Medium | Separates media wear and tested functionality from broad listing condition. |
| **Disney Pins** | Single Pin condition profile | Single Pin | Critical | Requires an actionable condition gate and observable defect flags rather than relying only on title and image. |
|  | Official Disney product identifier | Single Pin; Pin Set | Critical | Provides the strongest user-observable exact identity key for visually similar pins. |
|  | Release channel/year and declared edition size | Single Pin; Pin Set | High / Critical | Separates Parks, Store, D23, Cruise Line, event, and other releases; records issuer-declared run size without confusing it with population. |
|  | Pin mechanics / format | Single Pin; Pin Set | High | Captures spinner, slider, hinged, dangle, pin-on-pin, jumbo/mini, mystery, and chaser differences. |
|  | Authenticity/scrapper risk with basis | All Pin types | High | Lowers confidence and segregates concern without claiming authentication. |
|  | Original set packaging/display status and notable-pin manifest | Pin Set; Collection Lot | High | Captures the components and materially valuable pins driving an aggregate set/lot. |
| **Music** | Barcode / UPC / EAN | All physical recording formats | High | Separates exact physical release from an artist/title or release-group match. |
|  | Matrix / runout / mould code | Vinyl; CD; Cassette | High | Distinguishes pressing, mastering, and manufacturing variations; retain the raw inscription and use close-up photo support. |
|  | Factory-sealed/opened status | All physical recording formats | High | Prevents opened/raw records from being treated as exact sealed comparables. |
|  | Number of media units | All physical recording formats | High | Separates single, multi-disc, multi-record, box, and set configurations. |
|  | Original inner-sleeve / printed-insert completeness | Vinyl | Medium | Extends the existing CD/cassette insert fields to value-relevant vinyl inserts. |

## Priority sequence

### P0 — Improve matching controls before expanding forms

Normalize and consume the existing field values that the form already captures. Implement per-category identity objects, exact/near/contextual/rejected result classes, sale-status and price-semantics controls, transaction deduplication, and explicit unknown-versus-conflict behavior. Add regression fixtures showing that high-risk wrong comparables are rejected. This work is more important than any new input because a field cannot improve analysis until it affects matching.

### P1 — Highest-leverage identity gates

Start with **Sports Cards, Pokémon / TCG, Comics, and Coins**, because these categories already have comparatively rich inventory data and stronger current market/certification context. The first new inputs should be Sports Card subset/qualifier detail; Pokémon set scope/product configuration/graded-card manifest; Comic printing/restoration/completeness/distribution/key-comic manifest; and Coin series/strike/designation/problem/graded-constituent data.

### P2 — Physical condition, seal, operational state, and component completeness

Add controlled defect, restoration, repair, seal, functionality/playback, physical-form, and content fields. Build capped manifests for valuable constituents in sets, lots, and box sets. This tier also includes required overview and key-item photos for Video Games Collection Lots.

### P3 — Authentication and expertization modeling

Add Autographs authentication scope and coverage, Stamps expertizing/alteration information, and Disney Pin authenticity-risk disclosure. These fields improve comparable segmentation and confidence wording; they do **not** authenticate an item or create a new provider connection.

### P4 — Release-level precision for heterogeneous categories

Implement Video Game product/form/release controls; Vintage Toy SKU/wave/variant/originality controls; Movie subtype/physical-release identity; Disney Pin identifier/release/mechanics details; and Music barcode/runout/seal/media-count/insert completeness.

### P5 — Future provider and specialist source integrations

Only after the above foundations are in place should the project evaluate NGC, CBCS, autograph providers, AFA/CGA, specialist auction archives, Disney-pin catalogs, licensed stamp catalogs, or music pressing enrichment. No public page or user-entered field should be treated as proof that a connector is available.

## Fields and data that should not be added now

The following should remain outside Add Inventory because they are evidence-layer data, provider output, redundant, too subjective, or dependent on an unapproved integration:

| Do not add | Reason |
|---|---|
| Sold/asking price, sale date/status, listing/source IDs or URLs, sale counts, market averages, guide values, population/census, liquidity, sell-through, active supply, RSS/news sentiment | These require source provenance, classification, freshness, and deduplication. A seller assertion cannot become market evidence. |
| Provider verification result, catalog match, population result, grade-label lookup result, authentication outcome, or source timestamp | These are source-derived observations. They belong in a read-only evidence panel, not the item record. |
| Duplicate title, year, set, catalog/card number, manufacturer, format, raw/graded, company, grade, certificate, condition, sealed, photo, or completeness fields | The schema already contains many equivalents. Improve validation and analyzer consumption instead. |
| One generic certificate/grade for a multi-item lot | A lot needs a capped manifest for its material individually graded constituents; one certificate cannot represent the aggregate honestly. |
| Owner-entered authenticity verdict, visual-verification checkbox, subjective numeric raw grade, eye-appeal score, hype, investment potential, generic rarity score | These cannot be trusted as deterministic exact-comparable gates and would overstate what image review or the analyzer can know. |
| Source-specific IDs such as Pokémon Price Tracker, Discogs, MusicBrainz, Pin & Pop, PinPics, WorthPoint, Scott, or future provider IDs | They are either source-derived, rights-constrained, or imply an integration that is not currently connected. |
| Shipping, tax, fees, buyer premium, and physical dimensions (except existing original-art dimensions) | Excluded from this decision scope and not useful for identity, comparable admission, certification routing, or valuation confidence. |

## Implementation safeguards if approved later

Every approved extension should be conditional, controlled, and designed to preserve current Add Inventory behavior: fields should remain blank on a fresh form, show only when their parent selection makes them relevant, and be validated on both the client and server at submission. A user should never need to enter a value that is already captured by a stronger existing field.

For lots, manifests should be capped to material constituents rather than making users enumerate every object. Each manifest row should carry only enough identity to route a high-value component—such as title/name, series/set/number, physical form, condition/completeness status, and existing grade/company/certificate fields when applicable. The analyzer must treat unitemized remainder as uncertain lot context, not as proof that every constituent matches an exact comparable.

Visual review may suggest high-confidence visible or OCR-read facts temporarily for a sandbox query, but it must remain non-destructive and reviewable. It cannot prove authenticity, seal originality, restoration absence, provenance, physical function, or a missing component. Likewise, a future provider lookup can enrich identification or certification context only under an approved source contract; it cannot bypass the completed-sales evidence hierarchy.

## Recommendation

**Do not add all recommendations at once.** Approve the P0 matching/normalization work first, then a tightly scoped P1 schema and analyzer update for Sports Cards, Pokémon / TCG, Comics, and Coins. That sequence will produce the most visible reduction in wrong comparables while keeping the Add Inventory experience manageable. After a native sandbox comparison demonstrates that the new information excludes the intended mismatches without suppressing legitimate uncertain candidates, proceed to P2–P4 by category.

## References

[1]: [Current Add Inventory Field Snapshot](file:///home/ubuntu/tradebilia-isolated-development/FIELD_AUDIT_CURRENT_INVENTORY_SNAPSHOT.md)

[2]: [Trade Analyzer Sandbox Deep-Dive Assessment](file:///home/ubuntu/tradebilia-isolated-development/TRADE_ANALYZER_SANDBOX_DEEP_DIVE.md)

[3]: [Pokémon Price Tracker API Reference](file:///home/ubuntu/tradebilia-isolated-development/POKEMON_PRICE_TRACKER_API_REFERENCE.md)

[4]: [HIPStamp API Reference](file:///home/ubuntu/tradebilia-isolated-development/HIPSTAMP_API_REFERENCE.md)
