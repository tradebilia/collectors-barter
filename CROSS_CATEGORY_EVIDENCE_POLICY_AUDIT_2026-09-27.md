# Tradebilia Test AI — Cross-Category Evidence-Policy Audit

**Audit date:** 2026-09-27  
**Scope:** Reducer synthesis of the supplied Test AI category findings only. This is a policy and regression-audit report, not an implementation change.

## Executive policy decision

> **Shared principle:** Retain a candidate in the auditable evidence ledger unless there is an **objective, material conflict** or it is a duplicate/invalid valuation record. Missing, abbreviated, unparseable, visually uncertain, or provider-incomplete evidence is **uncertainty**, not contradiction.

This principle does **not** mean every retained item may influence value. Each record needs a separate and explicit role:

| Role | Meaning | May affect deterministic valuation? |
|---|---|---:|
| **Exact / near eligible** | Completed, dated, price-valid sale with required category identity anchors aligned and no material conflict | Yes |
| **Warning / review** | Plausible identity, but one or more relevant fields are absent, ambiguous, or incompletely normalized | No, until required gates are resolved |
| **Context only** | Historical, undated, active/asking, unknown provider semantics, insufficient identity, or otherwise useful non-current evidence | No |
| **Rejected** | Objective material identity conflict, duplicate observation, or invalid record for the stated evidence role | No |

A hard rejection should be a **field-level, auditable determination** (`field`, `target value`, `observed value`, `source`, `query`, and reason), not a generic low-score or a visual-model assertion. A cap, display slice, limited visual-review window, unavailable specialist source, or bounded provider page must never be represented as evidence absence or market completeness.

## Cross-category risk and decision matrix

| Category | Principal current failure mode | Objective hard-reject signals | Retain with warning / review signals |
|---|---|---|---|
| **Sports Cards** | Card number, set, and parallel are not consistently queried or hard-gated; same-surname and wrong-number comps can score through. Strict company/grade title filters also lose sparse valid sales. | Explicit different player; year; manufacturer; set; card number; named parallel/variation; single-card vs unopened/non-card type; explicit different required grader or grade; invalid/duplicate/non-completed valuation sale. | Missing number/year/set/grader/grade; plausible player alias; unresolved generic “parallel/refractor”; cropped/missing/unreadable image; condition presentation differences; historical/undated record as context. |
| **Pokémon / TCG** | `setName` and `finishVariant` are critical but absent from robust query/scoring gates; an explicit wrong number or same name/number from another set can survive generic overlap. | Explicit different card number, set/catalog identity, print/finish/edition/language, product form, or known required grader/grade; invalid/duplicate/non-completed valuation sale. | Missing set/number in marketplace title; year/era convention difference; omitted grader/grade; incomplete variant wording; photo/crop/slab/background differences; unreadable image. |
| **Comics** | Router exact-number parsing can discard a valid sparse title; comparable engine lacks universal series/publisher/issue/variant hard conflicts. PGX is a UI-supported but parser-missing grader. | Explicit different series/title, issue, publisher, confirmed printing/variant, required grader/grade, or comic vs lot/non-comic object; invalid/non-realized valuation sale. | Omitted/unparseable issue marker; uncertain volume/variant; missing provider/grade; title alias; image/crop/slab-photo differences; historical/undated thin-market sale as context. |
| **Coins** | Generic title query and minimal P0 readiness (denomination + year) permit country/mint/variety/material/strike contamination and can miss niche matches. | Explicit different country/issuer, denomination, date, mint mark, variety/design, material, proof/strike, coin type, or known grader/grade; invalid/duplicate valuation sale. | Absent country/mint/variety; unparsed/adjectival grade; omitted/aliased company; holder/toning/scratch/photo differences; incomplete title. |
| **Stamps** | Scott number, country, denomination, item form, and philatelic state are not category-gated; generic grade/company filters can erase ordinary ungraded stamps. | Explicit different Scott/catalog number, country/issuer, denomination, authoritative issue year, single vs set/sheet/block/lot/cover, or specified watermark/overprint/perforation/error conflict. | Missing catalog/country fields; MNH/MH/used/hinged/gum wording; incomplete variety detail; scan/front-back/certificate crop; ungraded sale; unclear sale semantics as context. |
| **Video Games** | Generic comparable scoring does not compare platform, item type, region, edition, sealed/CIB, or model/UPC. Router year filter can reject valid regional/re-release sales. | Explicit wrong object class (software vs console/accessory), platform, model/UPC, required region/edition, declared sealed/CIB/complete requirement, or known grader/grade conflict. | Omitted platform/year/edition/company/grade; global-versus-regional release-year difference; unmapped platform alias; packaging/crop/condition differences; unreadable image. |
| **Vintage Toys** | Only toy name is P0 critical; no post-query brand/model/item-type/packaging/completeness gate, so lexically similar but different toys can value. | Explicit different object class, toy/model/set/catalog number, brand/manufacturer, franchise/line, accessory-only/lot status, required packaging/completeness, reissue/reproduction, or known grade/company conflict. | Missing year/brand/model; franchise/character synonym; manufacture-versus-release-year ambiguity; loose/boxed unknown; ungraded sale vs graded target; photo angle/crop/condition differences. |
| **Movies** | Same-title cross-format, edition, region, and sealed/open records have no deterministic category gate; visual mismatch can destructively remove a text-aligned sale. | Explicit different title/entity/remake, format, required edition, region/release version, sealed/open state, or known grader/grade conflict. | Incomplete title/format/edition/region/sealed wording; plausible title alias; release-year ambiguity; cover-art/crop/background differences; absent grade/company. |
| **Autographs** | Narrow grader regex misses major authenticators; scorer does not independently gate signer, signed object, authenticator, or certificate. Generic slab-grade logic is inappropriate for most autographs. | Explicit different signer, signed-object class, certificate number, required authenticator, or non-completed/non-realized valuation sale. | Signer alias/initial/accent; vague item type; missing authenticator/certificate; uncertain inscription; photo/crop/background; raw/non-graded autograph. |
| **Disney Pins** | Broad character/name query and generic scoring omit pin number, series/event, edition size, and single-vs-lot rules; generic `limited` logic can reject good records. | Explicit different pin number/design, series/event, LE/open-edition status or edition size, single pin vs set/lot/quantity, or wrong object type. | Incomplete pin title; aliases/punctuation; absent series/event/edition fields; backstamp unreadable; condition/backing-card/photo differences; visual uncertainty. |
| **Music** | Generic market query and scorer do not enforce artist, catalog, format, label, country, or pressing; common-title releases can cross-contaminate. | Explicit different artist/release, object type (single/LP/box set/etc.), catalog number, format, target-defining country/pressing/edition, or known grade/company conflict. | Featured-artist/alias punctuation; missing catalog/pressing; regional-year distinction; incomplete label/format wording; sleeve/record/crop differences; unknown grader/company. |

### Evidence-integrity rules common to every category

The following are **valuation eligibility**, not item-identity, determinations: explicit completed/closed sale status, realized/sold price basis, positive normalized price, dated sale, supported currency normalization, deduplication, provenance, and current-window recency. A failed eligibility rule should normally route a record to **context** rather than delete it. Explicit active/asking, invalid/nonpositive price, duplicate sale observation, or known non-sale status must not enter deterministic valuation.

## Ranked implementation plan

### 1. Establish a shared, lossless evidence ledger and policy result contract — **P0**

Before changing category matching, make every provider candidate durable in the Test AI response/audit model. Record source, source ID/URL, raw and normalized fields, retrieval query/tier, price/status/date semantics, dedupe fingerprint, structured field comparisons, visual-review state, disposition, and reason codes. Dispositions must distinguish `rejected_objective_conflict`, `warning_review`, `context_only`, `valuation_eligible`, `omitted_by_cap`, and `not_visually_reviewed_window`.

**Acceptance test:** No record disappears merely because of a filter, visual-window limit, display limit, raw retrieval cap, source failure, or 48-record selection cap. Rejection is explainable by a discrete objective reason.

### 2. Replace generic score-only acceptance with a shared three-state field comparator — **P0**

Implement a reusable comparator that classifies each field as **match**, **missing/unknown**, or **explicit conflict**. Explicit conflict outranks match; missing never becomes conflict. The comparable engine should only accept a category record into valuation after the category-required fields are both present enough and non-conflicting. Generic title-token score becomes supporting/ranking evidence, never a substitute for a known contradictory category field.

Shared hard conflicts: explicit wrong identity anchor, explicit required grade/company mismatch, wrong object class, duplicate, and invalid completed-sale evidence. Preserve raw sales even when excluded from valuation.

### 3. Separate retrieval breadth from valuation selection; publish coverage — **P0**

Do not stop an entire category search simply because the first non-empty query or first 100 raw items returned. Run documented progressive query tiers, union and deduplicate them, preserve per-tier coverage, and only then apply a documented valuation sampling cap. Do not imply completeness when a provider page, 20-item UI slice, 20-image review window, 100-raw boundary, 48-record cap, or disabled specialist source limits coverage.

**Priority correction examples:** Sports Cards eBay must not stop at the first non-empty candidate; all bounded Sold-Comps paths need query coverage diagnostics; Disney, Music, Coins, Stamps, Vintage Toys, and Movies require structured fallback tiers.

### 4. Move strict title-only grade/company filtering behind structured normalization — **P0**

When a target is graded/certified, parse provider structured fields first, then category aliases, then title tokens. **Explicit known mismatch** may hard-reject valuation. Missing, abbreviated, custom, or unrecognized provider/grade wording must remain in the ledger as warning/context, not be silently removed before identity review.

Unify and category-configure provider vocabularies: add **PGX** for Comics; recognize autograph authenticators such as **JSA, PSA/DNA, Beckett Authentication, Steiner, Fanatics, and Upper Deck**; and support Music **AMG/MGA** alongside applicable existing providers. Do not run generic numeric slab-grade gating for ordinary ungraded stamps or raw autographs.

### 5. Make visual review advisory and objective-conflict constrained — **P0**

Visual comparison is a safety aid for clear wrong object/type or independently corroborated visible contradiction; it is **not authentication**, grade verification, exact identity proof, or a reason to reject for crop, lighting, background, holder, cover art, condition, scan orientation, or missing/unreadable image. Preserve text-strong records carrying a high-confidence visual mismatch as `warning_review` unless an objective structured/text conflict also exists. Mark all unreviewed candidates beyond the window instead of treating them as visually cleared.

### 6. Add category-aware structured identity gates and normalizers — **P1**

Adopt shared comparator plumbing, then supply category schemas and aliases. Required anchors are summarized below.

| Category | Required valuation anchors / special exception |
|---|---|
| Sports Cards | Player + two strong card anchors; require known set/card number/parallel alignment when target supplies them. Normalize player aliases, card-number forms, sets, parallels, grader/grade. |
| Pokémon | Card name + exact set + card number; map `finishVariant`, edition, language, product form; year/era is contextual unless objectively distinct. |
| Comics | Series/title + issue + publisher; resolve volume/Roman/`#`/`No.` aliases; map printing/variant and PGX. Missing issue is review, not automatic deletion. |
| Coins | Country + denomination + year; require supplied mint/variety/material/strike; prioritize catalog/certificate IDs. |
| Stamps | Country + Scott number; compare denomination, issue year, item form and philatelic variety; handle MNH/MH/used/hinged as market segment warnings unless target makes them a hard requirement. |
| Video Games | Game title + platform; gate object type, model/UPC, region, edition, sealed/CIB/complete only when supplied; year normally contextual. |
| Vintage Toys | Toy name + supplied model or brand/item type; distinguish reissue/reproduction, lot/accessory, packaging, and completeness. Raise P0 readiness beyond name-only when these fields are supplied. |
| Movies | Title/entity + format; gate known edition, region, sealed state, and remake/release identity. |
| Autographs | Signer + signed object type; alias-aware signer matching; authenticator/certificate are confidence tiers unless explicitly contradictory/required. |
| Disney Pins | Pin name/design + available pin number/series/event; gate LE/open/edition size and single-versus-lot quantity. Map `limitedEdition` rather than generic `limited`. Fall back input title to `pinName` for P0. |
| Music | Artist + release title; catalog number outranks fuzzy title; compare format, pressing, label/country, and target-defining edition. |

### 7. Correct readiness and valuation semantics — **P1**

P0 readiness is a **minimum valuation precondition**, not a claim that an under-described object is uniquely identified. Tighten readiness or add a category-specific `valuationIdentitySufficient` gate where current minimum fields are too weak: Sports Cards (player/year/manufacturer without card anchors), Coins (denomination/year without country), Vintage Toys (name only), and Disney Pins (title fallback missing). Require sufficient aligned anchors to value; retain under-specified evidence as review/context.

### 8. Retain source-balanced 48-record selection only as a transparent computation cap — **P2**

Source balancing may select the valuation sample, but must never erase accepted records or conceal source density. Expose selected count, accepted count, omitted-by-cap count and reasons by source, raw counts by query tier, visual-window counts, and specialist-source availability/permission state in UI/export.

## Required regression fixtures

Fixtures should be pure, deterministic tests with fixture records and no provider calls. Every fixture must assert **disposition**, **reason codes**, **valuation inclusion**, and **ledger retention** separately.

### Shared policy fixtures — required for all categories

1. **Three-state field comparison:** exact match, explicit conflict, and absent field for every material identity field; absent must warn/context, not reject.
2. **Evidence-role separation:** same record classified as current valuation eligible versus historical, undated, active/asking, unknown-price-basis, non-USD, invalid/nonpositive price, duplicate, and provider-error context. Verify non-eligible records remain auditable.
3. **Grade/company matrix:** explicit matching; explicit wrong recognized provider; explicit wrong grade; omitted company/grade; alias/abbreviation/custom provider; provider structured metadata versus sparse title. Only an explicit reliable contradiction rejects like-for-like valuation.
4. **Visual safety matrix:** exact text identity with crop/background/holder/scan/cover/condition differences; rough match; unreadable; missing image; provider failure; high-confidence wrong-object result; high-confidence visual mismatch without objective text conflict. Only the last case with an independently objective conflict may be hard-rejected.
5. **Caps and coverage:** 101+ raw candidates across query tiers, 21+ image-bearing candidates, 21+ returned/display candidates, and 49+ valuation-eligible candidates across multiple sources. Assert ledger preservation, `not_visually_reviewed_window`, query/source coverage, and `omitted_by_cap`; never call the capped result complete.
6. **Progressive retrieval:** strict query produces a non-empty but incomplete first page; later fallback produces a valid exact record. Assert all tiers execute under documented limits rather than first-nonempty termination.
7. **Audit provenance:** every retained/rejected/cap-omitted row carries source, query/tier, raw title/ID, objective comparison results, price/status/date basis, visual status, disposition, and reason.

### Category fixtures — required minimum coverage

- **Sports Cards:** explicit wrong card number/set/parallel/player/year/grader/grade rejects; missing card number or grader remains warning; `#1`, `1`, and `001` normalize; aliases such as Jr./III/initial/accent behave conservatively; single card versus pack/box/case is gated.
- **Pokémon:** same name/number from another set rejects; 1st Edition/Unlimited, Shadowless/Base, holo/reverse-holo, promo, language, and sealed product conflicts are explicit; missing year/era does not prevent set+number retrieval; `finishVariant` is read by comparison.
- **Comics — reported CGC example:** target and sale fixture for a **CGC Comics issue #2 at CGC 9.8**, including the bare marketplace form **`2 CGC 9.8`**, `#2`, `Issue 2`, and `No. 2`. Assert exact issue/company/grade alignment; explicit wrong issue/publisher/series/printing rejects; an omitted/unparseable issue marker is retained as review/context, not silently lost. Include the same set for **PGX** normalization and provider matching.
- **Coins:** country+denomination+year, mint, variety, metal, proof/business strike, and commemorative design conflict grid; PCGS/NGC `MS65`, `MS-65`, and `Mint State 65`; catalog/certificate priority; missing mint/grade remains contextual.
- **Stamps:** `Scott 572`, `Sc. 572`, and `#572`; exact country/Scott versus wrong Scott/country/denomination/year; single vs sheet/block/lot/cover; MNH/MH/used/hinged; watermark/overprint/perforation/error; ordinary ungraded stamp must avoid generic slab-grade deletion.
- **Video Games:** same title across NES/SNES/Genesis/PlayStation, game versus console/accessory, regional/re-release year, edition/region/model/UPC, sealed/CIB/loose; missing platform warning; alias resolution and non-destructive visual cases.
- **Vintage Toys:** same toy-name wrong brand/model/line/item class; figure/vehicle/playset/plush/lot/accessory; reissue/reproduction; boxed/loose/complete/incomplete; AFA/CAS/UKG aliases and ungraded comparable warning behavior.
- **Movies:** sequel/remake title identity; DVD/Blu-ray/4K/UHD/VHS aliases and conflicts; steelbook/collector/standard; region; sealed/open; cover-art/crop/unreadable visual cases; absent grade/company stays ledger-visible.
- **Autographs:** signer stage/legal/initial/accent aliases; photo/jersey/ball/puck/card object class; JSA, PSA/DNA, Beckett Authentication, Steiner, Fanatics, Upper Deck; certificate match/conflict/missing; `limited edition autograph` must not trip generic variant rejection.
- **Disney Pins:** pin number prefixes (`No. 123`, `#123`), series/event, LE 100/open edition, pinName fallback from input title, same character/different release, single pin versus set/lot/bundle, and legitimate `limited` language.
- **Music:** same title/different artist; artist/title/catalog match; catalog conflict; album/single/box set/soundtrack; vinyl/CD/cassette; original/reissue/remaster, mono/stereo, country/pressing; AMG/MGA/Rewind/custom grader behavior; sleeve versus record visual presentation.

## Acceptance criteria and boundaries

### Definition of done for the policy work

1. **No valid-looking candidate is silently removed for absence, ambiguity, title formatting, unrecognized alias, visual uncertainty, or a capacity window.** It receives warning/review/context unless an objective material contradiction is recorded.
2. **No record with an explicit material contradiction can enter exact/near valuation**, even if generic title overlap is high or an image looks similar.
3. **No visual verdict authenticates, grades, or alone proves/disproves identity.** Objective wrong-object conflicts must be separately explainable.
4. **No cap is mistaken for exhaustive market research.** Raw, reviewed, displayed, accepted, selected, and omitted counts are separately exposed.
5. **All new behavior is backed by deterministic regression fixtures** covering the common cases and the category fixtures above.

### Strict operational boundary

This audit is **sandbox-only and read-only**. It makes **no application source-code changes, database writes, schema changes, migrations, provider/API calls, authentication changes, production actions, or scheduled jobs**. Any implementation that follows must be separately reviewed, exercised against fixtures in an isolated sandbox, and authorized before it touches application data, external providers, or deployment environments.

## Audit conclusion

Across all reported categories, the recurrent defect is not a lack of cautiousness but an **asymmetric caution model**: generic text/grade/visual filters can prematurely remove incomplete yet plausible sales, while generic token scoring can retain explicitly different category identities when structured fields are absent from gates. The correct unifying policy is therefore: **retain uncertainty, reject demonstrable contradiction, and value only sufficiently aligned completed-sale evidence.**
