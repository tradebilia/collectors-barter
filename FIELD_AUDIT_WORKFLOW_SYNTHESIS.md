# Field Audit Workflow Synthesis

**Status:** Internal synthesis; no application source files changed.  
**Scope:** Eleven category reviews reconciled against the current field snapshot and the isolated-sandbox analyzer assessment. This report distinguishes **existing intake fields**, **proposed intake fields**, **source-derived observations**, and **future-integration-only data**.[1] [2]

## Decision summary

The central finding is consistent across all categories: the analyzer’s main limitation is **identity precision and comparable admission**, not a lack of broad market feeds. The recommended response is a small set of controlled, conditional fields that identify the physical collectible, its material condition or completeness exception, and any material constituent. These fields must be consumed by category-specific normalization, query construction, and exact/near/contextual/rejected comparable gates. Adding fields without that workflow does not improve valuation safety.

The current schema already contains substantial baseline data. Reuse and normalize existing title, type, identity, raw-versus-graded, company, grade, certificate, condition, sealed, completeness, and photograph fields before creating synonymous inputs. Market observations, provider results, catalog IDs, prices, population figures, URLs, and scores remain outside seller-entered inventory. The analyzer should explicitly return **insufficient exact evidence** when required identity or condition data is unknown.

> **Admission rule:** An explicit normalized conflict rejects an exact comparable. A missing candidate field is **unknown**, not a negative assertion. Unknown identity, condition, or completeness lowers confidence and may allow only near or contextual evidence.

## Field-state model and workflow requirements

| Field state | Definition | Treatment in the workflow |
|---|---|---|
| **Existing intake field** | A field already in the active inventory schema, such as title, condition, photos, grade, grading company, certificate number, edition, set name, or catalog number where applicable. | Normalize aliases and values; include material values in the category identity object and comparable gate. Do not duplicate it under a new label. |
| **Proposed intake field** | A new seller-entered field recommended below. | Use controlled values, an **Unknown** state, and conditional visibility. Preserve the entered value; do not replace it with visual or provider output. |
| **Source-derived observation** | A sale status, realized price, listing ID/URL, provider response, population result, guide value, catalog match, RSS signal, or visual/OCR observation. | Store in the evidence/result layer with provenance, timestamp, and confidence. It cannot become an owner assertion or independently establish value or authenticity. |
| **Future-integration-only data** | A provider verification, certification lookup, specialist catalog resolution, or auction/archive record for which no approved live route presently exists. | Do not add a result/status input merely to imply the integration exists. Add provider-specific routing only after access, terms, source contract, and evidence role are approved. |

Every proposed field should follow these implementation rules:

1. **Identity first.** Build one normalized identity object per category and item type. A query may use high-confidence temporary visual/OCR suggestions, but those suggestions remain non-persistent and reviewable.
2. **Explicit conflict before score.** Reject known contradictions for the category’s material identity, physical form, grade/problem state, condition, completeness, or authentication scope before similarity scoring.
3. **Controlled condition extension.** Add structured defect, seal, restoration, alteration, functionality, or completeness states only where they describe a material exception that broad condition does not capture.
4. **Lots remain lots.** For heterogeneous sets and lots, use capped repeatable manifests for material constituents. Do not attach one certificate, grade, authentication claim, or exact comparable to the aggregate.
5. **Evidence remains separate.** Completed sales and qualifying near-closing bid-supported auctions can be valuation evidence. Active asks, catalog/reference data, population, guide data, RSS, and owner trade value remain context.
6. **Regression coverage is mandatory.** Each field family needs fixtures that demonstrate rejection of the known wrong-comparable case, including base versus insert, first printing versus reprint, straight grade versus Details/problem, sealed versus damaged/reseal concern, and single item versus different lot composition.

## Cross-category field families

These are reusable **field patterns**, not a directive to add every field to every form. Apply them only to the item types named in the category plan. Existing equivalent fields should be reused.

| Field family | Existing baseline to reuse | Proposed extension and affected use | Comparable-admission rule |
|---|---|---|---|
| **Printed identity identifier** | Existing catalog/set/card numbers, LEGO set number, music catalog number, console model number, and certificate number. | Add an optional normalized/verbatim manufacturer code, SKU, UPC/EAN, barcode, NSS number, or equivalent only where an item-printed identifier is the missing precision key. | Exact-match token when both sides expose it; an explicit different identifier rejects exact admission. |
| **Edition, series, printing, subset, or variant** | Existing edition, variant, parallel, set, series, release year, and similar fields. | Add structured fields only for the unrepresented distinction: insert/subset, comic printing, coin series/strike, toy wave/mold/deco, game reprint line, pin mechanics, stamp variety, or movie subtype. | Explicit mismatch rejects exact admission; omission stays unknown. |
| **Language, release market, or distribution channel** | Existing region/language where present. | Add a controlled language or market value when it distinguishes an actual release cohort; use a direct-market/newsstand branch for comics and release channel for pins. | Exclude only explicit incompatible values. |
| **Physical form and configuration** | Existing format, packaging, CIB, sealed, sheet type, and product type fields. | Capture the form that changes the comparable object: game media form, stamp configuration, movie subtype, music unit count, sealed-product contents, or required accessory configuration. | Incompatible forms are hard exclusions; do not collapse parts, codes, loose components, or mixed lots into a complete physical cohort. |
| **Condition, alteration, and seal integrity** | Existing broad condition; existing raw/graded branch; existing factory-sealed/sealed fields. | Add focused observable flags for raw defects, restoration/conservation, problem/Details state, alteration/repair, seal integrity, signature condition, or media/playback state. | Known straight-versus-problem, intact-versus-damaged/reseal, restored-versus-unrestored, or functional-versus-fault conflicts segregate or reject cohorts. |
| **Completeness and material contents** | Existing complete, missing-item, count, case/manual, packaging, and accessory controls. | Add a scope or structured missing/component detail only where a current Yes/No field is insufficient. Use capped manifests for material constituents in lots, sets, box sets, and high-value bundles. | Exact cohort requires compatible declared contents; partial or unknown manifests are contextual/near evidence only. |
| **Grading-label detail** | Existing is-graded, company, grade, and certificate number. | Add qualifier/designation/subgrades, seal notation, or label detail where the numeric grade is insufficient. Never create a duplicate generic certification block. | Company, grade, and explicit qualifier/designation conflicts are distinct cohorts or exclusions. |
| **Authentication, expertization, and provenance risk** | Existing authentication company/type/certificate, COA, signature, and sealed-product authentication fields. | Capture scope/method, coverage by constituent, expertizing service, documented provenance class, or risk-based authenticity/scrapper concern where applicable. | These fields improve segregation and confidence; they never authenticate an item without a permitted provider-backed route. |
| **Operational state** | Existing tested/working controls for relevant toys, consoles, accessories, and music. | Add a controlled tested-working/tested-fault/untested/parts state where absent, especially physical games and home video. | Functional conflicts separate comparables; photographs do not prove unseen operation. |

## Category-specific proposed fields

The following is the compact category plan. Fields described as **existing** are implementation targets, not new schema work. All other named fields are proposed controlled and Unknown-capable additions unless a row explicitly says “manifest.”

| Category | Existing strengths to activate | Proposed identity/condition extension | Highest-value item types and workflow outcome |
|---|---|---|---|
| **Sports Cards** | Sport, player, year, manufacturer, set, card number, parallel, serial, rookie, autograph/relic flags, raw/graded state, company, grade, and certificate. | **Subset/insert name**; language/market edition; graded-label qualifier/detail; four-aspect raw-condition observations; autograph format; relic provenance/material; unopened seal integrity. | Single Card and Unopened Product. Reject base/insert, explicit language, qualifier, autograph/relic, or seal-state conflicts; preserve certification routing through existing company/certificate fields. |
| **Pokémon / TCG** | Single Card already carries name, set, collector number, edition/era, finish, special attributes, language, and grading fields. | Language/market for Set, Collection Lot, and Unopened Product; set-completeness scope; graded-card manifest; graded qualifier/BGS subgrades; raw defect/alteration flags; product configuration/pack count; seal integrity. | Sets, lots, and unopened product become configuration-aware; material slabs receive per-card routing. Do not duplicate Single Card language or card identity fields. |
| **Comics** | Single Comic has title, issue, publisher, volume/year, variant, signed, and graded fields; Original Art has creator/page context; lots have broad composition context. | **Printing/edition designation**; restoration/conservation status; key-comic manifest; Original Art graded branch; structural completeness/defect status; direct-market/newsstand distribution; UPC/barcode; published-page cover date. | Single Comic, Original Art, and comic lots. Reject original/reprint, restored/unrestored, distribution, and structural-completeness conflicts. Route art certification only when its new graded branch supplies a qualified company/certificate pair. |
| **Coins** | Single Coin has country, denomination, date, mint mark, variety, composition, raw/graded branch; Paper Money has denomination/date/serial/signature and grading inputs. | **Coin/Paper-Money series or issue**; strike/finish; error/pattern/replacement attribution; grading designation/qualifier; problem/alteration/Details status; CAC/CACG status; set completeness; graded-constituent manifest; group metal classification; evidence-backed pedigree note. | Single Coin, Paper Money, Coin Set, and Collection Lot. Separate straight from problem/Details material and route PCGS only through existing or manifest-level PCGS certificate data. NGC remains future integration work. |
| **Stamps** | Country, Scott number, year, denomination, mint/used, hinged, sheet type, grading fields, and photographs. | **Physical configuration**; perforation; watermark; variety/error attribution; paper/printing type; cancellation type; alteration/repair status; expertizing service. | Single Stamp, Stamp Set, and lots. Use exact catalog/physical conflicts as gates and downgrade unknown alteration/expertization. Existing certificate number may identify an expert certificate; no provider lookup is implied. |
| **Autographs** | Signer, signed-item type, inscriptions, authentication-present/company/type/certificate, broad lot signer summary, and photographs. | **Authentication scope/method**; per-constituent coverage manifest; signature count; underlying item/edition/substrate identity; signature condition; conditional provider-issued autograph grade; evidence-class provenance summary. | Signed Item and Collection Lot. Separate witnessed/provider opinion/issuer/COA/unsupported claims, and prevent one authenticated minor lot item from implying full-lot authentication. Provider verification remains future integration work. |
| **Video Games** | Game title/platform/year/region/CIB/case/manual/sealed/grading; Console model/functionality/components; Accessory identity/functionality/packaging; broad lot details. | **Product code**; game physical form/media type; edition/release configuration and language; game tested state; graded seal qualifier; accessory part/model number and required components; structured lot/graded-item manifest; required Collection Lot photos. | Game, Console, Accessory, and Collection Lot. Exclude digital codes, reproductions/homebrew, box-only/manual-only, parts/repair, and incompatible physical forms from standard-game cohorts. |
| **Vintage Toys** | Type-specific name, brand, year, many packaging/completeness controls, electronic functional checks, model scale, LEGO set number, and generic grading fields. | **Manufacturer SKU/catalog number**; series/wave/edition; variant/mold/deco/package revision; scale/figure size where absent; release market; originality/alteration status; missing/included component detail; packaging seal/opening state. | Individual toy types only. Reuse LEGO set number and existing completeness fields; do not pretend an aggregate Collection Lot has one exact identity. No active AFA/CGA route exists. |
| **Movies** | Title, format, release year, edition, region, sealed, broad condition, counts, and generic grading inputs. | **Collectible subtype**; physical distributor/label plus catalog/UPC/EAN/NSS identifier; complete component manifest; home-video media condition; playback/function status. | Individual Movie, Box Set, and Collection Lot. First block cross-type comparisons among home video, poster/paper, prop/costume, signed memorabilia, and production-used objects; defer subtype-specific detail until its source contract exists. |
| **Disney Pins** | Name, character, series, year, event, open/limited status, AP/PP, backstamp, backer-card, set completeness, and lot summaries. | **Single Pin condition profile**; official Disney product identifier; release channel/year; declared limited-edition run size; pin mechanics/format; authenticity/scrapper risk with basis; original set packaging/display status; notable-pin manifest. | Single Pin, Pin Set, and lots. The risk field lowers confidence and segregates concerns; it does not claim authentication. Specialist catalog and certification paths remain future work. |
| **Music** | Artist, release title, label, catalog number, country, year, edition, media/packaging condition, playback, format-specific booklet/inlay and vinyl details, plus generic grading inputs. | **Barcode/UPC/EAN**; matrix/runout/mould code; factory-sealed/opened state; number of media units; Vinyl original-inner-sleeve/printed-insert completeness. | All physical-recording formats, with matrix/runout chiefly for Vinyl, CD, and cassette. Build pressing-level gates; Discogs remains release metadata only and does not establish a sale or condition match. |

## Fields and data not recommended now

### Do not duplicate existing inventory inputs

Do not create aliases for established identity or certification fields. This includes titles, names, country/region where already captured, set/card/catalog identifiers, platform, year, manufacturer/brand, format, variant/parallel, raw-versus-graded state, grading company, grade, certificate number, condition, photographs, sealed status, and existing completeness controls. The correct work is validation, normalization, conditional visibility, and consumption in queries and gates.

Likewise, do not create a generic grade/certificate block for a multi-item lot. Use a constituent manifest when material individually graded objects need routing. Do not add a source-specific certificate field where the generic company-plus-certificate pair already provides the needed user assertion.

### Keep source-derived data out of intake

The following must remain evidence-layer observations rather than user-entered fields: sold and asking prices, sale date/status, source transaction/listing IDs and URLs, comparable counts, market averages, guide values, population/census totals, scarcity, liquidity, sell-through, active supply, RSS/news sentiment, provider-returned label details, verification status, catalog IDs from third parties, and source timestamps. These data require provenance, sale-status classification, deduplication, and role-specific presentation.

Image/OCR candidates also remain temporary, reviewable observations. Do not persist an image-inferred identity, certificate, condition, authentication conclusion, or “visually verified” checkbox as seller data. A visible conflict can prompt review; it cannot silently overwrite the listing or prove authenticity, seal originality, restoration absence, provenance, or functionality.

### Defer fields whose value depends on a future source contract

Do not add fields that imply a live provider route where none exists. This includes Autographs provider-verification outcomes; sealed Pokémon product certificate/serial verification; Movies, Music, Video Games, Disney Pins, and Vintage Toys certification results; NGC and CBCS status; AFA/CGA status; and specialist catalog/guide identifiers such as Pin & Pop, PinPics, WorthPoint, Scott, Discogs, MusicBrainz, TCGplayer, or PriceCharting IDs. Existing general grading/authentication inputs can preserve a claim until an approved, provider-specific adapter is available.

Provider-derived population, registry, price-guide, or authentication results must remain context even after a connector exists. A source adapter needs documented access rights, an eligibility key, a response-provenance contract, error/freshness behavior, and a clear declaration of whether the result is identification, certification context, or market evidence.[2]

### Exclude low-signal or out-of-scope inputs

Do not add shipping, dimensions except where already native to an art item, taxes, buyer premiums, fees, generic rarity or investment scores, hype, team/legacy narratives, owner-entered authenticity verdicts, subjective raw numerical grades, eye-appeal scores, or unconstrained free-text condition narratives. Broad catalog metadata that does not form a reliable comparable gate—such as plot/cast, attack text, HP, mechanics, flavor text, genre, popularity, or generic biographies—also remains reference context rather than intake.

## Priority order

### P0 — Evidence and matching controls before form expansion

Implement the shared market-observation contract, sale-status and price-semantics taxonomy, transaction deduplication fingerprint, exact/near/contextual/rejected result classes, and explicit unknown-versus-conflict behavior. Normalize the **existing** company, grade, certificate, edition, condition, set, variant, and identifier fields. Add category regression fixtures before making any new field relevant to a result.

### P1 — Critical identity gates in the highest-leverage categories

Implement the normalized identity objects and hard comparable gates for **Sports Cards, Pokémon / TCG, Coins, and Comics**. First additions are Sports Card subset/insert and qualifier detail; Pokémon set scope, product configuration, and graded-card manifest; Coin series, strike, designation, problem status, and graded constituent manifest; and Comic printing, restoration, completeness, distribution, and key-comic manifest. This tier delivers the largest safety improvement because these categories already have stronger completed-sale and/or certification-context coverage.[2]

### P2 — Structured condition, completeness, and physical-form extensions

Implement cross-category controlled condition extensions: raw-card defects; seal integrity; alteration/repair; restored/conserved status; functional/playback state; physical configuration; and component completeness. Add capped manifests for the material contents of sets, lots, and box sets. Require the Video Games Collection Lot photo panel as part of this tier.

### P3 — Authentication and expertization modeling

Implement Autographs authentication scope and lot coverage, Stamps expertizing/alteration data, and risk-oriented authenticity handling for Disney Pins. These changes improve confidence and comparable segregation but do **not** enable provider verification. The result should visibly distinguish declared evidence from verified provider evidence.

### P4 — Subtype and release-level precision for heterogeneous categories

Implement Video Games product/form/release controls; Vintage Toys SKU/wave/variant/originality controls; Movies subtype and physical-release identity; Disney Pin identifier/release/mechanics fields; and Music barcode, runout, seal, media-count, and insert-completeness fields. These categories should return low confidence or insufficient exact evidence until the subtype and physical configuration agree.

### P5 — Provider and specialist-source expansion only after P0–P4

Evaluate NGC, CBCS, autograph providers, AFA/CGA, specialist auction archives, Disney-pin catalog access, licensed stamp catalogs, and music pressing enrichment only after approvals and source contracts are complete. No connector should be treated as live merely because a public page exists. Provider results must not bypass identity gates, provenance controls, or the completed-sale hierarchy.[2]

## Completion criteria

The field audit should be considered operational only when each implemented category can demonstrate that it: (1) retains and normalizes existing data without duplication; (2) distinguishes unknown from an explicit conflict; (3) rejects the category’s high-risk wrong comparable; (4) makes every material constituent of a lot independently reviewable; (5) keeps image and provider observations non-destructive and attributable; and (6) communicates when exact evidence is too thin to support a high-confidence value.

## References

[1]: file:///home/ubuntu/tradebilia-isolated-development/FIELD_AUDIT_CURRENT_INVENTORY_SNAPSHOT.md "Current Add Inventory Field Snapshot"
[2]: file:///home/ubuntu/tradebilia-isolated-development/TRADE_ANALYZER_SANDBOX_DEEP_DIVE.md "Tradebilia Sandbox Trade Analyzer: Deep-Dive Assessment"
