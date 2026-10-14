# Tradebilia Item-Field Gap Audit

**Date:** October 14, 2026  
**Scope:** Search identity, deterministic pre-vision filtering, visual-review precision, and comparable quality in the Test AI analyzer.  
**Status:** Approved implementation completed in the isolated development project on October 14, 2026. The documented form, query, metadata-conflict, visual-review, and regression safeguards now apply; no database migration was required.

## Bottom line

After re-checking the inventory forms, the Test AI query builders, the current metadata-conflict gate, and external primary-source documentation, I recommend a **small, focused set of changes**.

> Do not add a large number of generic fields. The highest return comes from adding three category-specific identifiers and making several already-collected fields operational in searching and pre-vision filtering.

The most important finding is that **two fields are already expected by the search logic but cannot currently be entered in the relevant inventory forms**:

1. **Video Game UPC / EAN / barcode**
2. **Coin designation**

Those are genuine gaps. Several other proposed items are not missing fields; they are existing fields that should be used more consistently by the analyzer.

---

## Verified recommendations

| Priority | Category | Action | Why it improves matching | Current state | Recommendation |
|---|---|---|---|---|---|
| **P0** | Video Games | Add **UPC / EAN** | A barcode identifies a specific retail product/release, reducing same-title / wrong-platform / wrong-edition matches. PriceCharting documents UPC as a product identifier and notes that it is particularly useful for recent games. | The query logic already recognizes `upc` and `barcode`, but the Video Game form has neither field. | Add an optional `upc` field, labeled **UPC / EAN (if printed on packaging)**. Use it as the preferred PriceCharting product key; keep the existing title + platform rule as the fallback for older games without a barcode. |
| **P0** | Coins | Add **Designation / Strike** | Numeric grade alone does not identify a PCGS/NGC coin. Strike and designation details can distinguish MS vs PR vs SP, CAM vs DCAM, PL/DPL, First Strike, and relevant details/label conditions. | The structured coin query already reads `designation`, but the Coin form does not provide it. | Add an optional `designation` field, labeled **Strike / Designation (as printed on holder)**, with free-text examples: `PR`, `SP`, `CAM`, `DCAM`, `PL`, `DPL`, `FS`, `FB`, `FH`, `Details – Cleaned`. Keep it separate from the numeric Grade field. |
| **P1** | Sports Cards and Pokémon | Add **Grade Qualifier / Label Designation** only when graded | A PSA 8 (OC) is not the same comparable as a plain PSA 8. Likewise, black-label / pristine / autograph or other label distinctions can materially change market matches. | Grade has a short maximum length; it should remain numeric, and there is no dedicated qualifier field. | Add optional `gradeQualifier`, shown only when **Is Graded = Yes**. Examples: `OC`, `ST`, `PD`, `OF`, `MK`, `Authentic`, `Black Label`, `Pristine`. It must be explicitly supplied or visibly confirmed — never inferred from a title alone. |
| **P1** | Comics | Add **Certification Label Status** only when graded | A blue/universal book, a Qualified book with a defect, a Restored book, and a Conserved book are not interchangeable comparables even if the numeric grade is identical. | Comic forms have company, grade, and certificate number, but no structured certification-label status. | Add `certificationLabelStatus`: `Universal`, `Qualified`, `Restored`, `Conserved`, `Signature Series`, `Other`. For `Restored` / `Conserved`, add an optional short **Label notation / restoration detail** field. |
| **P1** | Sports Cards | Improve the **existing Serial Number** field rather than adding a duplicate field | A serial number such as `10/100` tells the analyzer both the card’s individual number and the print-run denominator. | `Serial Numbered` and `Serial Number` already exist, but the label does not explicitly ask for the complete fraction and the query aliases do not currently treat `parallelVariation` as the canonical parallel term. | Rename helper text to **Serial Number / Print Run (example: 10/100)** and validate the `number/total` pattern when used. Also map the existing `parallelVariation` field into the canonical `parallel` / `variant` search and metadata-gate aliases. |
| **P2** | Stamps | Add **Watermark**, **Perforation**, and **Overprint / Surcharge** | Visually similar stamps can be different catalog issues and values because of these characteristics. | Stamps already have country, year, Scott number, grade, denomination, mint/used status, hinge status, gum, and certification fields. They lack these three specific identifiers. | Add them as optional structured fields. Do not make them mandatory because many users will not know them. Use values only when explicitly entered or clearly visible. |
| **P2** | Music | Use existing **Pressing / Matrix Notes** operationally before adding a new field | Matrix/runout differences can identify a distinct physical release, but Tradebilia already has a `pressingDetails` field. | Music already captures artist, release title, label, catalog number, year, country, edition, format, and a pressing/matrix notes field. | Do **not** add a second matrix field now. Instead, add `pressingDetails` as a cautious exact-release signal in source queries and pre-vision conflict review when it contains a clearly formatted matrix/runout value. |

---

## Why these fields are justified

### 1. Video Game UPC / EAN — highest-priority new form field

This is the clearest missing field because the application already has code support for it:

- `shared/testAiCriteria.ts` recognizes `upc` and `barcode` for Video Game queries.
- The Video Game form currently does **not** collect either value.
- The current PriceCharting safety guard already avoids issuing its game-price request without a valid 8–14 digit UPC. Adding the field lets valid games use the supported provider path instead of being unnecessarily blocked.

PriceCharting’s API documentation explicitly supports lookup by **UPC**, describes it as convenient for recent systems, and also warns that older consoles may not have UPCs. That matches the right product behavior:

- **If UPC/EAN is available:** use it as the preferred exact product identifier.
- **If it is not available:** do not invent one; retain the title + platform catalog lookup and keep PriceCharting gated as it is today.

### 2. Coin Designation / Strike — a direct form/query mismatch

The Coin form correctly collects country, denomination, year, mint mark, variety, composition, weight, diameter, grading company, grade, and certification number. However, it does not collect a coin’s **designation** even though the Test AI structured query already reads a `designation` field.

That is an operational gap, not a speculative feature request.

PCGS explains that label differences include:

- strike type: **MS**, **PR**, **SP**;
- surface/designation details: **CAM**, **DCAM**, **PL**;
- release or strike designations such as **First Strike**; and
- problem/Details conditions such as cleaning or damage.

A field named **Strike / Designation (as printed on holder)** captures these facts without attempting to make the user become a numismatist. It should remain optional and must not be guessed by the AI.

### 3. Grade Qualifier / Label Designation — separate from Grade

The current Grade fields are designed for values such as `8`, `9.5`, `MS65`, or `90`. They should **not** be overloaded with long grade-label phrases.

PSA states that a qualifier means the card otherwise meets the numeric grade but fails one criterion; its examples include **OC**, **ST**, **PD**, **OF**, and **MK**. That means a `PSA 8 (OC)` should not be treated as a plain `PSA 8` comparable.

The correct design is:

- keep `grade` as the numeric/primary grade;
- add `gradeQualifier` only for graded items;
- use it as a material identity gate only when the target and candidate both explicitly disclose it;
- leave absence of a qualifier **unknown**, not equivalent.

This avoids both false matching and unnecessary rejection of listings whose labels cannot be read.

### 4. Comic Certification Label Status — separate from the numeric grade

CGC’s own label guide distinguishes Universal, Qualified, Restored, Conserved, Signature Series, and other label states. A Qualified label can retain a higher numeric grade while noting a significant defect; a Restored label identifies repair; a Conserved label identifies preservation work.

Therefore, a simple numeric Grade + CGC/CBCS company is not sufficient for safe comparable identity when that information is available.

This should be a structured dropdown rather than buried in a description field. The visual reviewer can compare it when it is readable, but it must fail closed to **manual review/context** when the label state is not readable.

### 5. Sports-card Print Run — improve an existing field

The form already has:

- `Serial Numbered` — Yes/No
- `Serial Number` — free text

So a new duplicate “edition size” field is not needed. The improvement is to request the full fraction, for example **10/100**.

Topps defines numbered cards as short-printed cards whose print run is specified on the card, using `10/100` as its example. That denominator is the part that helps distinguish a serial-numbered parallel from another parallel or base card.

This change should also include a code-alias correction: the inventory form uses `parallelVariation`, while the general structured-query builder looks for `parallel` / `variant`. The mapping needs to recognize the existing stored field so that information the user already provides can reduce false candidates before visual review.

---

## Items I specifically do **not** recommend adding now

| Not recommended now | Reason |
|---|---|
| **Repurpose Quantity as edition size / print run** | Quantity already means how many items the user owns or is listing. Changing its meaning would damage inventory accuracy. |
| **Use Description as an identity field** | The user’s instruction is sound: descriptions are inconsistent and can contain subjective or stale information. Continue treating them as non-authoritative context, not deterministic identity. |
| **A global generic “designation” field for every category** | Designation means different things in coins, cards, and comics. Category-specific fields are clearer and safer. |
| **A second Music matrix field** | `pressingDetails` already exists. First make that field operational and validate the user experience before duplicating it. |
| **Comic page-quality field as a P0 feature** | The research clearly supports label status/restoration as a material difference. Page quality may be useful to advanced collectors, but it was not verified as a current primary matching gap in the observed Test AI failures, so it should wait. |
| **UPC/EAN for every collectible category immediately** | UPC is high-value for Video Games because it connects directly to the current PriceCharting flow. Other categories should only add it after provider testing proves it improves a specific source path. |
| **LEGO set number as a new universal field** | The analyzer already recognizes `setNumber` for Vintage Toys/LEGO-style queries. Before adding a separate form field, confirm whether the relevant inventory subtype already captures it under its existing fields. |
| **Grading subgrades as an initial required field** | Subgrades can be useful, but the primary grade, grader, certificate, qualifier/designation, packaging, edition, and product identifier are more important first. |

---

## Existing fields that should be used more effectively before adding more inputs

These are implementation priorities, not form-expansion requests:

1. **Map all stored aliases into one canonical identity model.**
   - Example: `parallelVariation` must feed the same canonical value as `parallel` / `variant`.
   - Principle: a field cannot improve matching if the query builder and metadata conflict gate do not recognize its stored name.

2. **Use structured fields in this order:**
   1. required target identity;
   2. explicit material metadata conflicts;
   3. source title and structured candidate metadata;
   4. visual review only for candidates that remain plausible.

3. **Keep the present conservative rule:**
   - missing candidate information is not treated as a match;
   - an explicit conflict is retained as context/manual review;
   - the visual model should not override an objective metadata conflict.

4. **Do not broaden provider search terms merely because a field exists.**
   A field should become a query term only if it improves precision for that category and provider. Some fields are better used as post-retrieval exclusion gates.

---

## Recommended implementation order

### Phase 1 — direct, high-value fixes

1. Add **Video Game UPC / EAN** field.
2. Add **Coin Strike / Designation** field.
3. Add aliases so `parallelVariation` is consumed as canonical parallel/variant metadata.
4. Add deterministic tests for all three paths:
   - UPC exact lookup versus no-UPC fallback;
   - coin designation match/conflict/unknown;
   - sports-card parallel equality/conflict/omission.

### Phase 2 — label-state precision

5. Add **Grade Qualifier / Label Designation** for graded Sports Cards and Pokémon.
6. Add **Comic Certification Label Status** and optional restoration notation.
7. Extend the shared metadata-conflict gate and visual-review prompt with these fields.
8. Require explicit agreement for analyzer admission; otherwise keep candidates as context or manual review.

### Phase 3 — category specialist fields

9. Add optional Stamp **Watermark**, **Perforation**, and **Overprint / Surcharge**.
10. Make existing Music `pressingDetails` an exact-release signal when structured enough.
11. Test these fields against live provider behavior before making any one of them required.

---

## Acceptance criteria for every field added

A new form field should not be considered complete until all of these are true:

- It is displayed only for relevant item categories and conditional states.
- Its data is normalized into the selected Test AI item contract.
- It appears in the structured request only where that provider benefits from it.
- It is included in the shared metadata-conflict gate as an **explicit-conflict** check.
- It is included in the visual-review target metadata when it can be visibly verified.
- Missing candidate data stays **unknown/manual review**, not an implicit match.
- Tests cover: equal value, explicit mismatch, missing target value, missing candidate value, and source response with contradictory data.
- The Evidence Review explains why a candidate was excluded or held for review.

---

## Sources consulted

### Primary / authoritative sources

1. [PriceCharting API Documentation](https://www.pricecharting.com/api-documentation) — documents `upc` as a product parameter; distinguishes UPC-supported recent systems from older systems; documents title/console search fallback.
2. [PCGS: Understanding PCGS Abbreviations on Coin Holders](https://www.pcgs.com/news/cracking-the-code-understanding-pcgs-abbreviations-on-coin-holders) — strike types, designations, and problem-code distinctions.
3. [PSA Glossary: Qualifier](https://www.psacard.com/resources/lingo/q) — defines the OC, ST, PD, OF, and MK qualifier examples.
4. [CGC Labels](https://www.cgccomics.com/grading/labels/) — defines Universal, Qualified, Restored, Conserved, Signature Series, and related label states.
5. [American Philatelic Society: Expertizing Basics — Watermarks](https://stamps.org/News/News-Archives/c/collecting-insights/cat/exploring-stamps/post/ap-expertizing-basics-watermarks) — explains that watermark differences can receive separate catalog numbers and can materially affect value.
6. [Discogs Database Guidelines: Barcodes & Identifiers](https://support.discogs.com/hc/en-us/articles/360005054893-Database-Guidelines-5-Barcodes-Identifiers) — explains barcode, catalog/matrix, SID-code, and runout distinctions for physical music releases.
7. [Topps: Numbered](https://ripped.topps.com/definition/numbered/) — defines numbered cards and the print-run fraction, such as `10/100`.
8. [LEGO: Identifying Set and Piece Numbers](https://www.lego.com/en-ca/service/help-topics/article/identifying-lego-set-and-piece-numbers?age-gate=grown_up) — confirms set numbers are a direct product identifier, supporting the decision to verify existing set-number capture before adding a duplicate field.

---

## Implementation record

All approved changes from this audit are implemented as recommended fields in their relevant inventory forms, with the specified exception preserved:

- **Sports Cards and Pokémon**: `Grade Qualifier / Label Designation` appears **only when Is Graded = Yes**.
- **Video Games**: `UPC / EAN` normalizes UPC, EAN, and GTIN aliases and supports the existing bounded PriceCharting gate.
- **Coins**: `Strike / Designation` is a separate recommended field; it never alters the numeric grade.
- **Comics**: graded-only `Certification Label Status` plus conditional `Label Notation / Restoration Detail` capture label-state evidence.
- **Stamps**: optional `Perforation`, `Watermark`, and `Overprint / Surcharge` are recorded only when known.
- **Sports Cards**: the existing serial field now requests a full `number/print-run` fraction. The metadata gate compares print-run denominators, not individual serial numerators, so `10/100` and `11/100` remain potentially comparable while `10/100` and `2/99` do not.
- **Music**: no duplicate field was added; existing structured `Pressing / Matrix Notes` only enters a query when it contains matrix/runout-like evidence.

The shared gate remains conservative: explicit metadata disagreements are held out before vision; omissions stay unknown/manual-review rather than being guessed. For graded targets with an entered qualifier or comic label status, a candidate must explicitly confirm that same evidence in its title or review images before becoming a confirmed visual match.

## Final recommendation

Approve **Phase 1 first**. It gives Tradebilia the largest immediate improvement in search precision with the smallest form burden:

1. Video Game UPC/EAN;
2. Coin Strike/Designation;
3. existing Sports Card parallel/serial data made fully operational.

Then proceed to Phase 2 only after validating those fields against real Test AI searches. This preserves the project’s current safety-first design: fewer false positives reach the visual reviewer or analyzer, while candidates with incomplete information remain transparent context rather than being silently discarded.
