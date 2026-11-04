# Tradebilia Category / Item-Type Filter Reference

**Prepared:** October 30, 2026  
**Scope:** Marketplace and eBay comparison pipeline  
**Purpose:** Permanent reference for the identity filters, ranking models, visual-review caps, and intentional exceptions used by the Tradebilia analyzer.

> This document describes the current implemented behavior. It is not a recommendation list or a promise that missing provider data will be filled in. When a provider does not supply a field, the field remains **unknown** and does not automatically exclude the candidate.

---

## 1. Universal rules applied before category-specific rules

These rules apply to every marketplace/eBay visual-source candidate before the category/item-type logic runs.

| Universal rule | Behavior |
|---|---|
| Collection/Lot | Always non-comparable. No provider lookup, ranking, visual review, or trade analysis is allowed. The UI must state that the item is not comparable. |
| Raw vs. graded/certified | An explicit raw-versus-graded contradiction is held out of visual review. Ordinary condition differences are not automatically treated as identity mismatches. |
| Grading company | If the target is graded/certified, a different explicitly declared grading company is held as context-only. Video Games preserve the approved PSA↔WATA equivalence. |
| Numeric grade | If the target has an explicit grade, a different explicit grade is held as context-only. Missing grade data remains unknown. |
| Unique certificate/holder IDs | Certificate numbers, serials, QR codes, barcodes, and holder tracking IDs identify an individual specimen and are ignored as identity requirements. |
| Quantity | A candidate explicitly declaring multiple items is not comparable to a target quantity of one. |
| Duplicate provider record | Duplicate provider references are retained as context-only and are not sent to visual review twice. |
| Explicit contradiction | A declared contradiction is retained as context evidence and is not sent to the initial visual queue. Ambiguous or missing data is not treated as a contradiction. |
| Source boundary | These marketplace/eBay filters, scores, and caps do not control grading or reference applications. Those sources keep their separate role and contract. |
| Cap overflow | Candidates outside an item type’s visual cap remain visible with their score/rank as context-only evidence; they are not silently deleted. |

---

## 2. Ranking and cap conventions

### Standard visual-review cap

The standard cap is based on the highest ranked candidate score for the target item type:

| Score | Maximum candidates sent to visual review |
|---:|---:|
| 90–100 | 8 |
| 80–89 | 6 |
| 70–79 | 4 |
| 60–69 | 2 |
| Below 60 | 0 |

A candidate’s score is the sum of the applicable fields it matches. Unknown fields do not add points and do not subtract points.

### Item-specific cap exceptions

| Item type | Cap bands |
|---|---|
| Comics / Single Comic | 90–100: 10; 80–89: 8; 70–79: 6; 60–69: 4; 50–59: 2; below 50: 0 |
| Sports Cards / Single Card | 90–100: 10; 80–89: 8; 70–79: 6; 60–69: 4; 50–59: 2; below 50: 0 |
| Sports Cards / Set | 85–100: 10; 70–84: 6; 60–69: 3; 50–59: 2; below 50: 0 |
| Sports Cards / Unopened Product | 90–100: 10; 75–89: 6; 65–74: 3; 55–64: 2; below 55: 0 |
| Comics / Original Art | No visual cap; market-range context only |
| Autographs / Signed Item | No visual cap; market-range context only |

---

# 3. Category and item-type details

## Comics

### Single Comic

**Identity filter fields:** comic title/series, issue number, grade, grading company, variant/cover description, publisher, publication year, Direct versus Newsstand distribution, original versus facsimile/reprint, and signed status. An individual comic is also protected from obvious non-single forms such as lots, collections, or sets.

**Important rules:** ordinary title wording differences are tolerated; explicit issue-number conflicts, distribution conflicts, facsimile/reprint conflicts, and graded/raw conflicts are held before visual review. Grading company and grade are scored separately. Unique certification IDs are ignored.

**100-point ranking model:** comic title 20; issue number 20; grade 15; grading company 10; variant 10; publisher 10; publication year 5; distribution type 5; facsimile/original 3; signed status 2.

**Visual cap:** 10 / 8 / 6 / 4 / 2 / 0 at score bands 90 / 80 / 70 / 60 / 50.

### Original Art

**Identity/context fields:** artist name, artwork title or character, art type, comic title/series, issue number, and publisher. Cover-sketch art uses the separate comic title and issue fields.

**Workflow:** this is not an exact visual-comparison item. Listings are ranked for market relevance and used to estimate a general market range. They are not sent to visual AI because different original artworks are not expected to be physically identical.

**100-point market-relevance model:** artist 30; artwork title/character 20; art type 20; comic title 15; issue number 10; publisher 5.

**Visual cap:** none. The output is market context only.

### Collection/Lot

Not comparable. No lookup, ranking, visual review, or trade analysis.

---

## Sports Cards

### Single Card

**Identity filter fields:** single-card form, player/athlete, year, manufacturer or set, card number, grading company, numeric grade, rookie status, autograph status, relic/memorabilia status, and serial-numbered status. Explicit sets, lots, collections, and multi-card listings are held out.

**100-point ranking model:** player 20; year 15; manufacturer/set 15; card number 15; grading company 10; grade 10; single-card form 5; rookie status 3; autograph status 3; relic status 2; serial-numbered status 2.

**Visual cap:** 10 / 8 / 6 / 4 / 2 / 0 at score bands 90 / 80 / 70 / 60 / 50.

### Set

**Identity filter fields:** set identity, year, manufacturer, set type, complete versus partial/missing cards, factory-sealed status, sport, and set form. Explicit individual cards are excluded as mismatches. Ambiguous titles that merely say “cards” are not automatically excluded.

**100-point ranking model:** set name 25; year 15; manufacturer 15; set type 15; missing cards/completeness 15; factory sealed 10; sport 5.

**Visual cap:** 10 at 85–100; 6 at 70–84; 3 at 60–69; 2 at 50–59; 0 below 50.

### Unopened Product

**Identity filter fields:** product name, product format (pack, rack pack, box, case), product type (hobby, jumbo, retail, blaster, mega, hanger, cello, rack), manufacturer/set, year, sealed/opened status, authentication status, authentication company, and From a Sealed Case (FASC) status. Explicit individual cards, sets, collections, and lots are excluded.

**Hard conflict examples:** a target authenticated by BBCE cannot be matched to an explicitly different authentication company; a target that is BBCE and FASC cannot be matched to a candidate that explicitly lacks BBCE or FASC; factory-sealed and opened/unsealed states conflict.

**100-point ranking model:** product name 20; product format 20; product type 15; manufacturer/set 15; year 10; authentication company 10; factory sealed 5; FASC 5.

**Visual cap:** 10 at 90–100; 6 at 75–89; 3 at 65–74; 2 at 55–64; 0 below 55.

### Collection/Lot

Not comparable. No lookup, ranking, visual review, or trade analysis.

---

## Vintage Toys

All eight comparable Vintage Toys item types use an item-type identity gate first, then their own field-weighted 100-point model and the standard 8 / 6 / 4 / 2 / 0 cap.

| Item type | Identity filter fields | Ranking weights |
|---|---|---|
| Action Figure/Doll | Toy name/character, brand, franchise, year, packaging type, completeness, accessories | Toy name/character 30; brand 15; franchise 15; year 10; packaging 10; complete 10; accessories 10 |
| Board Game/Puzzle | Game/puzzle name, publisher/brand, year, completeness, instructions, box | Game/puzzle name 30; publisher/brand 15; complete 15; year 10; pieces 10; instructions 10; box 10 |
| Electronic Toy | Toy name, brand, year, tested status, working condition, battery compartment, sound/lights | Toy name 30; brand 15; tested 15; working condition 15; year 10; battery compartment 10; sound/lights 5 |
| LEGO | Set number, theme, completeness, packaging type, release year, piece count, minifigures, retired status | Set number 30; theme 20; complete 15; packaging 10; release year 10; piece count 5; minifigures 5; retired 5 |
| Model/Kit | Model/kit name, brand, scale, built/unbuilt state, completeness, instructions, year | Model/kit name 30; brand 15; scale 15; built/unbuilt 15; complete 10; instructions 10; year 5 |
| Playset | Playset name, brand, franchise, year, completeness, missing pieces, original box | Playset name 30; brand 15; complete 15; franchise 15; year 10; missing pieces 10; original box 5 |
| Plush/Stuffed Toy | Toy name/character, brand, franchise, year, tags attached, cleanliness/odor notes | Toy name/character 35; brand 20; tags 15; franchise 10; year 10; cleanliness/odor 10 |
| Vehicle | Vehicle name, brand, franchise, year, vehicle type, packaging type, working features | Vehicle name 30; brand 15; vehicle type 15; franchise 10; year 10; packaging 10; working features 10 |

**Additional rule:** explicit candidate item types that differ from the target are held context-only. Explicit complete/incomplete, missing-piece, opened/sealed, tested/untested, or working/not-working contradictions are retained outside the visual queue. Subjective general condition differences are not automatically hard exclusions.

### Collection/Lot

Not comparable. No lookup, ranking, visual review, or trade analysis.

---

## Video Games

### Game

**Identity filter fields:** game title, platform, release year, region, edition, product form, UPC/EAN, and explicit working condition. Product form includes sealed, CIB, boxed, loose, and related label states.

**100-point ranking model:** game title 30; platform 20; release year 15; region 10; edition 10; product form 10; UPC/EAN 5.

**Visual cap:** standard 8 / 6 / 4 / 2 / 0.

### Console

**Identity filter fields:** console name, model number, region, working condition, original box, cables, and controllers.

**100-point ranking model:** console name 30; model number 20; region 15; working condition 15; original box 10; cables 5; controllers 5.

**Visual cap:** standard 8 / 6 / 4 / 2 / 0.

### Accessory

**Identity filter fields:** accessory type, accessory name, compatible platform, manufacturer, working condition, and original packaging.

**100-point ranking model:** accessory type 25; accessory name 25; compatible platform 20; manufacturer 10; working condition 10; original packaging 10.

**Visual cap:** standard 8 / 6 / 4 / 2 / 0.

**Special grading rule:** the approved PSA↔WATA equivalence is retained for Video Games; other explicit grading-company conflicts remain protected by the universal rules.

### Collection/Lot

Not comparable. No lookup, ranking, visual review, or trade analysis.

---

## Stamps

### Single Stamp

**Identity filter fields:** Scott/catalog number, country, year, denomination, stamp format, mint/used status, hinge/gum status, perforation, watermark, and overprint/surcharge.

**100-point ranking model:** Scott number 25; country 15; year 15; denomination 10; format 10; mint/used 10; hinge/gum 5; perforation 5; watermark 3; overprint/surcharge 2.

**Visual cap:** standard 8 / 6 / 4 / 2 / 0.

### Stamp Set/Sheet

**Identity filter fields:** set name/description, country, year, sheet/set type, number of stamps, mint/used status, grade, grading company, and format. Individual stamps are not treated as equivalent to a set or sheet.

**100-point ranking model:** set name 25; country 15; year 15; sheet type 15; number of stamps 10; mint/used 8; grade 5; grading company 4; format 3.

**Visual cap:** standard 8 / 6 / 4 / 2 / 0.

### Collection/Lot

Not comparable. No lookup, ranking, visual review, or trade analysis.

---

## Coins

### Single Coin

**Identity filter fields:** country/issuing authority, year/date, denomination, mint mark, composition/metal, strike/finish/designation, variety, original versus replica/restrike status, grading company, and numeric grade when applicable.

**100-point ranking model:** coin title/series/type 20; year/date 15; denomination 15; mint mark 10; variety 10; numeric grade 12; grading company 8; designation/strike/finish 5; composition/metal 3; country/issuer 2.

**Visual cap:** standard 8 / 6 / 4 / 2 / 0.

**Special rule:** unique certificate IDs are ignored. Explicit replica, counterfeit, facsimile, or restrike contradictions are held context-only when the target declares an original/authentic item.

### Coin Set

**Identity filter fields:** set name/series, year/date, country/issuing authority, set type, number of coins, original packaging, and set-versus-individual form. An explicit single coin is excluded from a set target.

**100-point ranking model:** set name/series 25; year/date 20; country/issuer 15; set type 15; number of coins 15; original packaging 10.

**Visual cap:** standard 8 / 6 / 4 / 2 / 0.

### Paper Money/Banknotes

**Identity filter fields:** country/issuing authority, denomination, year/date, note type/series/design/subject, numeric grade, grading company, signature status, and condition context.

**100-point ranking model:** country 20; denomination 20; year/date 15; title/series 15; numeric grade 12; grading company 8; signature 5; condition 5.

**Visual cap:** standard 8 / 6 / 4 / 2 / 0.

### Collection/Lot

Not comparable. No lookup, ranking, visual review, or trade analysis.

---

## Pokémon

### Single Card

**Identity filter fields:** card name, set, card number, language, finish, Card Type / Mechanic, rarity, and edition/era. Card Type / Mechanic and Finish are separate fields. Explicit sets, unopened products, collections, lots, bundles, and mixed groups are held out when declared.

**100-point ranking model:** card name 25; set name 20; card number 15; language 10; finish 10; Card Type / Mechanic 10; rarity 5; edition/era 5.

**Visual cap:** standard 8 / 6 / 4 / 2 / 0.

### Set

**Identity filter fields:** set name, language, set type/status (complete, master, partial, incomplete), card count, year, and packaging. An explicit individual card is not comparable to a set.

**100-point ranking model:** set name 35; set type 20; language 15; card count 15; year 10; packaging 5.

**Visual cap:** standard 8 / 6 / 4 / 2 / 0.

### Unopened Product

**Identity filter fields:** product name, set, product type/configuration, language, release year, factory-sealed status, authentication status/company, and FASC/from a sealed case. Explicit single cards, sets, collections, lots, or mixed groups are held out.

**100-point ranking model:** product name 20; set name 20; product type 20; language 10; year 10; factory sealed 10; authentication 5; FASC 5.

**Visual cap:** standard 8 / 6 / 4 / 2 / 0.

### Collection/Lot

Not comparable. No lookup, ranking, visual review, or trade analysis.

---

## Movies

### Individual Movie

**Identity filter fields:** movie title, format, release year, edition, region/region code, and sealed/opened status. Explicit box sets, series, collections, or lots are excluded.

**100-point ranking model:** movie title 30; format 20; release year 15; edition 15; region 10; sealed status 10.

**Visual cap:** standard 8 / 6 / 4 / 2 / 0.

### Box Set

**Identity filter fields:** box-set/series name, format, edition, movie count, and sealed/opened status. An explicit individual movie is not comparable to a box set.

**100-point ranking model:** box-set name 30; format 20; movie count 15; edition 15; sealed status 10; grading details 10.

**Visual cap:** standard 8 / 6 / 4 / 2 / 0.

### Collection/Lot

Not comparable. No lookup, ranking, visual review, or trade analysis.

---

## Music

### Vinyl Record, Cassette Tape, Compact Disc, 8-Track Tape, and Other Music Format

All five Music formats share the same 100-point model, but the format identity gate is format-specific.

**Identity filter fields:** exact media format, artist/performer, release/album title, record label, catalog number, country/pressing country, release year, edition/variant, pressing/matrix details, and packaging context. A candidate with an explicitly different format is held out.

**Condition safeguards:** factory sealed/new sealed versus opened is a material conflict. For Parts/Parts Only versus a normal item is a material conflict. Subjective condition labels such as Good, Very Good, Excellent, and Fair remain visual/context evidence rather than automatic hard exclusions.

**100-point ranking model:** artist 25; release title 20; format 15; record label 10; catalog number 10; release year 8; country 5; edition 5; packaging included 2.

**Visual cap:** standard 8 / 6 / 4 / 2 / 0.

**Item-specific interpretation:**

- Vinyl Record: vinyl/LP/EP/45/pressing details must agree.
- Cassette Tape: cassette/audio-tape format must agree.
- Compact Disc: CD/compact-disc format must agree.
- 8-Track Tape: eight-track/8-track format must agree.
- Other Music Format: explicit non-listed format is preserved as its own context; a known conflicting format is still held out.

> Music has no Collection/Lot layout in the current registry, but the universal Collection/Lot block still applies if a Collection/Lot value is received.

---

## Autographs

### Signed Item

**Identity filter fields:** signer, signed item type, authentication company, inscription/personalization, and signed status where available. Autograph Category is not used in marketplace search construction.

**100-point market-relevance model:** signer 35; signed item type 25; autograph category 10; authentication company 20; inscription 10. This ranking field is separate from marketplace search construction.

**Workflow:** signed pucks, balls, photos, jerseys, helmets, books, and similar items are not expected to be physically identical. Results are used to establish a market range for similar signed items, not to claim an exact visual match.

**Visual cap:** none. Candidates are ranked market context only and do not enter visual AI.

### Collection/Lot

Not comparable. No lookup, ranking, visual review, or trade analysis.

---

## Disney Pins

### Individual Pin

**Identity filter fields:** pin name, character, series, year, pin-trading event, limited/open-edition status, artist proof, pre-production status, and backstamp information. Disney Pins are not treated as graded collectibles in this workflow; stale grading fields do not create mismatches.

**100-point ranking model:** pin name 25; character 15; series 15; year 10; pin-trading event 10; limited edition 10; open edition 5; artist proof 4; pre-production 3; backstamp 3.

**Visual cap:** standard 8 / 6 / 4 / 2 / 0.

### Pin Set

**Identity filter fields:** set name, complete/incomplete status, number of pins, series, included characters, limited-edition status, and missing pins. Individual pins are not comparable to a pin set.

**100-point ranking model:** set name 25; complete set 20; number of pins 15; series 15; characters included 10; limited edition 10; missing pins 5.

**Visual cap:** standard 8 / 6 / 4 / 2 / 0.

### Collection/Lot

Not comparable. No lookup, ranking, visual review, or trade analysis.

---

# 4. Operational behavior

1. Normalize provider fields first.
2. Apply universal safeguards.
3. Apply the category and item-type identity filter.
4. Rank remaining candidates using the item-type score.
5. Apply the applicable visual cap, if the item type uses visual review.
6. Send only the selected marketplace/eBay candidates to visual review.
7. Preserve filtered, capped, image-less, or low-score candidates as context-only evidence with their reason and score.
8. For Original Art and Signed Item, skip visual review and return ranked market-range evidence with price metrics.
9. Never run provider lookups or trade analysis for Collection/Lot.

# 5. Documented implementation status

| Coverage | Result |
|---|---:|
| Categories | 11 |
| Item types reviewed | 44 |
| Comparable item types | 34 |
| Comparable types with specific filters | 34 / 34 |
| Comparable types with ranking models | 34 / 34 |
| Comparable types with visual caps | 32 / 34 |
| Intentional market-range exceptions | 2 |
| Collection/Lot exceptions | 10 |
| Confirmed analyzer gaps | 0 |

The two comparable types without visual caps are **Comics / Original Art** and **Autographs / Signed Item**. They are intentionally market-range workflows, not visual-match workflows. All Collection/Lot types are intentionally excluded from the analyzer.

**Validation record at time of documentation:** focused visual-filter suite passed 173/173; TypeScript passed; prior full deterministic suite passed 1,877 tests with 7 skipped; no database, migration, credential, provider, deployment, or publishing changes were made for this documentation.
