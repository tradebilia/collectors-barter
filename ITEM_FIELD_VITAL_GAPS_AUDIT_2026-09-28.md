# Tradebilia Item-Field Vital Gaps Audit

**Date:** 2026-09-28  
**Scope:** Sandbox inventory field definitions and Analyzer 2.5 identity requirements  
**Conclusion:** The field system is broad, but several high-value identity fields are either missing or classified too weakly. The most important issue is not a lack of fields everywhere; it is that fields used to distinguish market comparables are sometimes only **recommended**, optional, or represented only inside free-text titles.

## Second-pass verification and corrections

The first pass was directionally useful but overstated several gaps. After checking the active aggregator, the generated definitions, the dedicated photo validation, and the analyzer identity rules, the findings should be read as follows:

| Finding from the first pass | Verified status |
|---|---|
| Music catalog number, label, country, release year, and edition are missing | **Incorrect.** These fields already exist in `fieldDefinitionsMusic.ts`, mostly as recommended fields. The real improvement is to add barcode/matrix/runout fields and promote catalog/pressing identity when applicable. |
| Autograph authentication fields are missing | **Incorrect for signed items.** Signer, authentication status, company, type, and certificate number already exist. The remaining gap is structured provenance, signature location/date, and mixed-lot authentication composition. |
| Comic variant, volume, publication year, signatures, and original-art details are missing | **Incorrect.** These fields already exist. The issue is that some are recommended or optional even though they materially affect comparability. Provenance and a structured release/edition identifier remain genuine additions. |
| Pokémon single-card photos are missing | **Not a user-facing omission.** The generated definition omits `photos`, but the inventory hook always validates photos through its dedicated photo panel. This is a definition consistency issue, not a missing upload capability. |
| LEGO trade value and photos are missing | **Incorrect.** Both are present in the LEGO definition and photos are also validated through the dedicated panel. LEGO’s real gap is that set number is only recommended, while piece count, retirement status, and packaging state are optional. |
| Stamp grade, gum, and centering are missing | **Incorrect.** These fields are already present and required for single stamps. Genuine additions are stamp form, perforation, watermark, and a normalized mint/used/hinged state. |
| Coin mint mark, variety, composition, weight, and diameter are missing | **Incorrect.** They already exist, mostly as recommended fields. The genuine additions are strike/finish, mintage, and a catalog/reference number; mint mark and variety should be promoted when applicable. |
| Movie format, edition, region, and sealed state are missing | **Incorrect.** Format and sealed state exist; edition and region also exist as optional fields. A UPC/catalog identifier and structured packaging/completeness fields are the remaining gaps. |
| Video-game edition is missing from every item type | **Partly correct.** The active game form does not have a dedicated edition field, while the analyzer can interpret edition evidence. Region is present but recommended, and model/product identifiers are missing for some item types. |

This correction is important because the implementation plan should not duplicate fields that already work. The first implementation slice should focus on **promotion, normalization, and the genuinely missing identifiers** listed below.

### Newly confirmed structural issue

`ALL_FIELD_DEFINITIONS` does not itself list Music, LEGO, or the individual Disney Pin flow, but `useAddInventoryForm` correctly merges it with `REMAINING_FIELD_DEFINITIONS`. Therefore, these categories are reachable in the active form. This is not currently a user-facing omission, but it creates two sources of truth and should eventually be consolidated to reduce maintenance risk.

## Priority summary

### P0 — should be corrected before relying on automated valuation

1. Add a structured **photo-role model** for front, back, slab, certificate, label, box, and accessories. A generic required `photos` field is not enough for reliable visual comparison.
2. Promote the following identity fields to required when the item type supports them: sports-card card number, comic variant/volume where declared, coin mint mark or variety when applicable, video-game region/edition for region-sensitive releases, and music catalog/pressing identity for collectible releases.
3. Add explicit **raw versus graded**, **sealed versus opened**, **complete versus incomplete**, and **single versus lot** state fields wherever those states materially affect value. Some forms have these fields, but several lots and category-specific flows only capture them in notes or make them optional.
4. Add a structured **market identity / catalog identifier** field for categories whose market data depends on a catalog system: Scott number for stamps, catalog or matrix number for music, set/product number for Pokémon, model or product number for games and toys, and reference number for paper money.
5. Correct the grading flow so grading company, grade, and certification number are conditional on `Is Graded = yes` in every item type. Several collection/lot and category flows currently define grading fields inconsistently, even where a lot may contain mixed graded and raw items.

## Category and item-type findings

The sections below list fields that should be added or promoted. “Required Fields” means the field should be required for a reliable identity match. “Recommended Fields” means it should be requested for stronger market evidence but may legitimately be unknown. “Optional Fields” are useful enrichment fields that should not block inventory creation.

## Sports Cards

| Item type | Section | Needed field | Reason |
|---|---|---|---|
| Single Card | Required Fields | Card Number | It is currently recommended, but card number is one of the strongest identity anchors and should be required when the card has a standard number. |
| Single Card | Recommended Fields | Structured parallel / variation subtype | The current free-text variation field is not enough to distinguish refractor, color, insert, short print, image variation, and serial-numbered versions. |
| Single Card | Conditional Required Fields | Serial Number | Required when `Serial Numbered = yes`; otherwise the analyzer cannot distinguish `/10`, `/25`, and ordinary copies. |
| Single Card | Recommended Fields | Card language | Important for Pokémon, international issues, and some modern releases; it is currently absent from the sports-card form. |
| Set | Required Fields | Set identifier or product number | Set name alone can be ambiguous across releases and years. |
| Set | Recommended Fields | Release configuration | Add number of cards, parallel/insert coverage, and whether the set is factory sealed. The current missing-card fields do not fully describe a partially complete set. |
| Unopened Product | Required Fields | Set identifier | Product name and manufacturer do not always uniquely identify a box or pack release. |
| Unopened Product | Recommended Fields | Pack/box count and product configuration | Needed to compare hobby boxes, retail boxes, blasters, tins, and loose packs accurately. |
| Collection/Lot | Required Fields | Graded/raw mix status | `Includes Graded Cards` is optional, but a mixed lot must identify whether graded cards are present before market data is compared. |
| Collection/Lot | Recommended Fields | Approximate condition distribution | A lot of mostly raw cards with one graded card should not be compared with a uniformly graded lot. |

## Pokémon

| Item type | Section | Needed field | Reason |
|---|---|---|---|
| Single Card | Required Fields | Language | The analyzer already treats language as identity context, but the field is only recommended. English, Japanese, Korean, and other language versions can have materially different values. |
| Single Card | Recommended Fields | Card rarity | Rarity is currently recommended and should be captured consistently because it helps distinguish cards with similar names and numbers. |
| Single Card | Recommended Fields | Finish / variant subtype | Holo, reverse holo, cosmos, cracked ice, promo, first edition, and similar finishes should be structured rather than left to title text. |
| Single Card | Recommended Fields | Card release year or era | The current form has an edition/era field, but a structured release year is useful for reprints and similarly named cards. |
| Unopened Product | Required Fields | Product configuration quantity | A booster box, loose pack, ETB, tin, and collection box should carry a standardized unit or pack count. |
| Unopened Product | Recommended Fields | Set code / product number | Set name alone is not always enough to identify a sealed product. |
| Set | Recommended Fields | Set code and total set size | A set name and year do not always identify a language-specific or regional release. |
| Collection/Lot | Required Fields | Language/era mix status | A mixed-language or mixed-era lot must be explicit before averaging market evidence. |
| Collection/Lot | Recommended Fields | Graded/raw count and sealed-product count | The current boolean does not describe the composition of a mixed lot. |

## Comics

| Item type | Section | Needed field | Reason |
|---|---|---|---|
| Single Comic | Required Fields | Variant status | `Variant Cover` is recommended, but variant status can materially change value and should be required as yes/no/unknown. |
| Single Comic | Recommended Fields | Volume / series numbering | Needed to separate similarly titled series and reboots. It is currently optional. |
| Single Comic | Recommended Fields | Publication date or issue year | Publication year is recommended; month/date or a more precise release identifier would improve matching for sequential issues. |
| Single Comic | Recommended Fields | Cover artist and writer | Useful for key issues and variant identification when issue number and title are insufficient. |
| Single Comic | Recommended Fields | Interior/page count or edition identifier | Helps distinguish facsimiles, reprints, newsstand editions, and special printings. |
| Original Art | Required Fields | Provenance status | Artist and art type are present, but provenance is not. Provenance strongly affects market value. |
| Original Art | Recommended Fields | Certificate of authenticity issuer and number | `COA Included` is not enough to assess reliability. |
| Original Art | Recommended Fields | Published-page status and publication details | The current fields capture whether it is a published page, but not publication title, issue, and page reference as a structured group. |
| Collection/Lot | Required Fields | Graded/raw composition | `Includes Graded Comics` is optional, but this distinction is required for meaningful lot comparisons. |
| Collection/Lot | Recommended Fields | Key-issue and signed-item counts | Notable titles alone do not quantify the value-driving contents. |

## Coins and Paper Money

| Item type | Section | Needed field | Reason |
|---|---|---|---|
| Single Coin | Required Fields | Strike/finish | Proof, business strike, specimen, and related finishes can represent different markets. |
| Single Coin | Recommended Fields | Mint mark | It is currently recommended, but it is a core identity field for many United States coins. Make it required when the denomination/year has mint variants. |
| Single Coin | Recommended Fields | Variety designation | Make it required when the user selects a known variety or when the source identifies one. |
| Single Coin | Recommended Fields | Mintage | Useful for explaining scarcity and separating otherwise similar issues. |
| Single Coin | Recommended Fields | Reference/catalog number | PCGS/NGC numbers, Red Book numbers, or another catalog identifier improve cross-source matching. |
| Single Coin | Recommended Fields | Metal composition confirmation | The current composition field is recommended; it should be strongly encouraged because it prevents gold/silver misidentification. |
| Coin Set | Required Fields | Denominations and composition summary | Set name, year, and set type are not enough to identify what is actually included. |
| Coin Set | Recommended Fields | Mint facility, finish, and packaging type | Proof and mint sets can be confused when packaging and finish are absent. |
| Paper Money | Required Fields | Series designation | Year alone does not uniquely identify a banknote. |
| Paper Money | Recommended Fields | Friedberg/catalog number | This is the principal market identifier for many banknotes. |
| Paper Money | Recommended Fields | Serial-number prefix and replacement-note status | A serial number alone does not capture prefix, star note, or replacement-note value. |
| Paper Money | Recommended Fields | Seal/color and signature combination | These can materially distinguish otherwise similar notes. |
| Collection/Lot | Required Fields | Country/region composition and approximate date range | A mixed collection needs more than a country list to support market comparisons. |
| Collection/Lot | Recommended Fields | Graded/raw count, precious-metal count, and notable-key-item count | These composition fields are more useful than a single `Includes Graded Coins` boolean. |

## Stamps

| Item type | Section | Needed field | Reason |
|---|---|---|---|
| Single Stamp | Required Fields | Stamp format/form | Single, block, sheet, booklet pane, plate block, and first-day cover are different markets. The current fields do not fully encode this. |
| Single Stamp | Required Fields | Condition form: mint hinged, mint never hinged, used, or cancelled | `Mint / Used` and `Hinged` are separate, but the combined market state should be explicit and mutually consistent. |
| Single Stamp | Recommended Fields | Scott catalog suffix/variety | Scott number alone may not distinguish watermark, perforation, color, or variety. |
| Single Stamp | Recommended Fields | Perforation, watermark, gum, and centering details | These are essential for higher-value stamps; gum and centering exist, but perforation and watermark are missing. |
| Single Stamp | Recommended Fields | Certificate issuer and certificate number | Certification number exists, but the issuer should be tied to a structured certificate record. |
| Stamp Set/Sheet | Required Fields | Sheet/block/pane form and count | `Sheet Type` exists, but the definition should distinguish full sheet, pane, block, booklet pane, and plate block. |
| Stamp Set/Sheet | Recommended Fields | Scott range or catalog number range | A set description without catalog identifiers is difficult to compare. |
| Collection/Lot | Required Fields | Raw/graded and mint/used composition | A lot with mixed states must not be averaged as if it were homogeneous. |
| Collection/Lot | Recommended Fields | Hinged/block/sheet composition | This directly addresses the significant price difference between a single stamp and hinged blocks or larger formats. |

## Video Games

| Item type | Section | Needed field | Reason |
|---|---|---|---|
| Game | Required Fields | Edition/release type | Standard, limited, collector’s, greatest hits, black label, and reprint releases can have different values. It is currently only recommended through a broader field model. |
| Game | Required Fields | Region | Region is currently recommended, but PAL, NTSC-U, and NTSC-J differences are material. |
| Game | Recommended Fields | Product/catalog number | Useful for matching editions and reprints. |
| Game | Required Fields | Complete/sealed state | The current fields split CIB, case, manual, and sealed into recommendations. A normalized overall completeness state is needed. |
| Console | Required Fields | Model number and region | Model number is recommended, but it is a primary identity field for consoles and revisions. |
| Console | Recommended Fields | Colorway, revision, bundle contents, and serial range | These frequently affect value and should not rely on title text. |
| Accessory | Required Fields | Model/product number and compatibility | Accessory name and platform can be too broad to identify the actual item. |
| Accessory | Recommended Fields | Complete packaging and tested/working evidence | Working condition exists, but packaging completeness should be explicit. |
| Collection/Lot | Required Fields | Platform composition and sealed/CIB/raw composition | A lot’s market value depends heavily on this mix. |
| Collection/Lot | Recommended Fields | Count by platform and notable title count | One aggregate item count is insufficient for valuation. |

## Movies and Home Video

| Item type | Section | Needed field | Reason |
|---|---|---|---|
| Individual Movie | Required Fields | Edition/release subtype | Standard, steelbook, limited edition, first pressing, rental, and promotional versions can differ substantially. It is currently optional. |
| Individual Movie | Required Fields | Region | Region is currently optional and should be required when the format is region-sensitive. |
| Individual Movie | Recommended Fields | Barcode/UPC or catalog number | Title and format do not uniquely identify many releases. |
| Individual Movie | Recommended Fields | Packaging completeness and special features | Important for collectible physical media but currently absent as structured fields. |
| Box Set | Required Fields | Edition, region, and sealed state | A box-set name and format are not enough to distinguish releases. |
| Box Set | Recommended Fields | UPC/catalog number and complete contents | Number of movies alone does not establish whether all discs and inserts are present. |
| Collection/Lot | Required Fields | Format and sealed/open composition | `Formats Included` is only recommended and `Sealed Items Included` is optional; both materially affect value. |
| Collection/Lot | Recommended Fields | Platform/region composition and notable-title count | Mixed-format lots should not be valued from a single average. |

## Music

These recommendations apply to vinyl, cassette, compact disc, 8-track, and other formats unless stated otherwise.

| Item type | Section | Needed field | Reason |
|---|---|---|---|
| All music formats | Required Fields | Format-specific release identifier | Catalog number exists as recommended, but it should be required when the release has one. |
| All music formats | Recommended Fields | Country of pressing/release | Country exists as recommended and is important for regional pressings. |
| All music formats | Recommended Fields | Label and release year | These exist but should be promoted because artist/title alone can map to multiple releases. |
| All music formats | Required Fields when applicable | Edition/pressing identity | First pressing, reissue, mono/stereo, promotional, colored vinyl, and label variant should be structured. |
| Vinyl | Recommended Fields | Matrix/runout and pressing plant | The current pressing notes field is optional; matrix/runout is often the strongest physical-release identifier. |
| Vinyl | Recommended Fields | Media grade and sleeve grade separately | A single condition field cannot distinguish a valuable mint record in a damaged sleeve from a complete high-grade copy. |
| Cassette/CD/8-Track | Recommended Fields | Inlay, booklet, insert, and case condition | These are present in part, but the condition of the media and packaging should be separated. |
| All music formats | Recommended Fields | Barcode/UPC or label catalog number | Helps match Discogs and other market sources reliably. |

## Autographs

| Item type | Section | Needed field | Reason |
|---|---|---|---|
| Signed Item | Required Fields | Authentication status and evidence type | Authentication company/type exist, but the workflow should distinguish authenticated, unauthenticated, pending, and disputed. |
| Signed Item | Required when applicable | Certificate/LOA number and issuer | Certificate number exists, but a letter of authenticity issuer and document reference should be represented explicitly. |
| Signed Item | Recommended Fields | Signature location and date | These can materially change desirability and help the visual reviewer compare the exact item. |
| Signed Item | Recommended Fields | Personalization/inscription details | Current inscription fields are optional; the analyzer should know whether the signature is personalized. |
| Signed Item | Recommended Fields | Provenance chain | Particularly important for high-value entertainment and historical autographs. |
| Collection/Lot | Required Fields | Authenticated/unauthenticated/mixed composition | A single recommended authentication field is insufficient for a lot. |
| Collection/Lot | Recommended Fields | Signer counts and item-type counts | The current text fields should be supplemented with structured counts. |

## Vintage Toys

| Item type | Section | Needed field | Reason |
|---|---|---|---|
| All individual toy types | Required Fields | Brand/manufacturer | It is recommended in many forms, but it is a major market identity anchor. |
| All individual toy types | Recommended Fields | Franchise/line, release year, and variant/colorway | These fields are often only recommended or missing and are important for comparable selection. |
| Action Figure/Doll | Required Fields | Character/model and release line | `Toy Name` exists, but character and line should be separately structured where applicable. |
| Board Game/Puzzle | Required Fields | Edition/year and complete/missing-piece state | Current completeness fields are good, but edition and exact component count are not strong enough. |
| Electronic Toy | Required Fields | Power/test state and battery-compartment condition | Testing exists, but battery leakage/corrosion status should be structured rather than only a note. |
| Model Kit | Required Fields | Scale and built/unbuilt state | Scale is only recommended even though it is central to market identity. |
| Playset | Required Fields | Set number and complete/missing-piece state | Playset name alone is too broad. |
| Vehicle | Required Fields | Scale, vehicle model, and variant | Vehicle type exists as recommended, but scale and model variant are missing. |
| Plush Toy | Recommended Fields | Tags, manufacturer code, size, and odor/smoke exposure | Tags exist, but size and manufacturer identifier are missing. |
| LEGO | Required Fields | Set number | It is currently recommended and should be required whenever known. |
| LEGO | Recommended Fields | Piece count, retirement status, minifigure inventory, and box/instruction state | These are mostly optional; they are material for collectible LEGO valuation. |
| Collection/Lot | Required Fields | Graded/raw and complete/incomplete composition | Current lot fields do not adequately distinguish a mixed toy lot. |

## Disney Pins

| Item type | Section | Needed field | Reason |
|---|---|---|---|
| Individual Pin | Required Fields | Edition status: open edition, limited edition, limited release, AP, or pre-production | Several booleans exist, but a normalized mutually exclusive release classification is missing. |
| Individual Pin | Required Fields when applicable | Edition size and pin number | Limited edition is not enough; edition size and number such as `123/500` are highly material. |
| Individual Pin | Recommended Fields | Backstamp and SKU/catalog number | Backstamp exists, but a structured SKU or catalog identifier is missing. |
| Individual Pin | Recommended Fields | Completeness of backer card and packaging | Backer card exists as optional; it should be recommended when the item was sold with one. |
| Pin Set | Required Fields | Edition classification and set identifier | Set name alone does not identify release type or exact set. |
| Pin Set | Recommended Fields | Edition size, pin numbers, and complete/incomplete status | `Missing Pins` exists, but pin-level identity is needed for partial sets. |
| Collection/Lot | Required Fields | Open/limited/AP/pre-production composition | A lot-level boolean is not enough to determine the value mix. |
| Collection/Lot | Recommended Fields | Character/series counts and backer-card composition | Useful for market matching and transparent valuation. |

## Universal fields missing across the system

These should be implemented once and reused across categories instead of duplicated in every item form.

| Section | Universal field | Why it matters |
|---|---|---|
| Required Fields | Structured item identity status | A normalized status for `single`, `set`, `lot`, `raw`, `graded`, `sealed`, `opened`, and `unknown` prevents contradictory values from entering the analyzer. |
| Required Fields | Photo roles | Each uploaded image should be labeled as front, back, slab, certificate, packaging, label, accessory, or other. This is necessary for reliable AI image review. |
| Recommended Fields | Catalog/source identifiers | Store provider name, identifier type, identifier value, and lookup URL separately from the free-text title. |
| Recommended Fields | Provenance and authenticity status | Use `verified`, `user-reported`, `unknown`, `disputed`, or `not-applicable`, with supporting document/image references. |
| Recommended Fields | Variant/edition classification | Use a structured value plus free-text detail so the analyzer can distinguish known variants without over-rejecting unknown ones. |
| Recommended Fields | Completeness composition | For lots and sets, capture count of complete, incomplete, graded, raw, sealed, and opened items. |
| Optional Fields | Seller/source notes | Preserve source wording and unusual details without allowing notes to silently override structured identity fields. |
| Optional Fields | Acquisition provenance and prior sale reference | Useful for auditability, but it should not block listing creation. |

## Highest-value corrections in order

1. **Photo roles and identity-state fields.** This directly improves the image-review workflow and prevents a front-cover image from being compared with a certificate or packaging image.
2. **Sports-card card number and Pokémon language.** These are common causes of false comparables.
3. **Stamp form and hinged/block/sheet state.** This addresses the known single-stamp versus hinged-block price problem.
4. **Coin finish, mint mark, variety, composition, and banknote series/reference number.** These prevent materially different coins or notes from being grouped together.
5. **Video-game region, edition, model number, and completeness.** These are necessary for meaningful sold-comparable matching.
6. **Music catalog/matrix/pressing fields and separate media-versus-packaging condition.** These are needed to distinguish releases that share the same artist and title.
7. **Lot composition fields across every category.** Lots should not be treated as one homogeneous item when the contents are mixed.
8. **Conditional grading consistency.** Grading company, grade, and certification number should appear only when the item is graded, while mixed lots should use counts or composition fields rather than pretending the lot has one grade.

## Final assessment

The current field system is **strong in breadth but not yet fully market-identity complete**. Most categories have enough fields to create an inventory record, but several do not yet collect the minimum structured attributes needed to select trustworthy comparables. The largest reliability gains will come from promoting a small number of existing fields, adding catalog and variant identifiers, and adding universal photo and lot-composition structures. These changes should be implemented before adding more valuation formulas because better identity data will improve every downstream marketplace and deterministic-analysis step.

## References

[1]: file:///home/ubuntu/tradebilia-isolated-development/client/src/lib/formFieldDefinitions.ts "Tradebilia form field definitions and requirement tiers"
[2]: file:///home/ubuntu/tradebilia-isolated-development/client/src/lib/fieldDefinitionsGenerated.ts "Tradebilia generated category and item-type fields"
[3]: file:///home/ubuntu/tradebilia-isolated-development/client/src/lib/fieldDefinitionsMusic.ts "Tradebilia music-format fields"
[4]: file:///home/ubuntu/tradebilia-isolated-development/shared/testAiP0Evidence.ts "Tradebilia Analyzer P0 identity requirements"
