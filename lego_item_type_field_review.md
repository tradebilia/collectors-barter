# LEGO Item Type Under Vintage Toys

## Pre-Implementation Field Review

**Status:** Proposal for review only. No application changes are included in this document.

## Executive recommendation

Add **LEGO** as an item type under **Vintage Toys**, then reveal a LEGO-specific form based on a second field called **LEGO Listing Type**. The listing type should distinguish **Set**, **Minifigure**, **Individual Part**, **Part/Lot**, **Gear or Accessory**, **Book/Instructions**, and **Custom/MOC**. This is preferable to creating many separate top-level item types because the parent category remains simple while the form can ask the right questions for the actual item.

This structure follows how major LEGO catalog systems separate item types. BrickLink’s catalog and collection tools distinguish sets, parts, minifigures, gear, books, and catalogs, while its condition rules treat sets differently from parts and minifigures.[1] [2] LEGO itself identifies sets through a set number and identifies individual elements through element or design numbers.[3] The fields below therefore treat identity, completeness, condition, and authenticity as separate concepts rather than combining them into one generic condition field.

## How this fits Tradebilia’s current listing model

Tradebilia’s current Vintage Toys forms already use a common sequence of **Listing Title**, **Trade Value**, **Condition**, **Photos**, and **Quantity**, followed by item-specific fields. The current toy definitions also use **Packaging Type**, **Complete**, **Accessories Included**, and the shared conditional **Is Graded → Grading Company → Grade → Certification Number** flow. The LEGO design should preserve that vocabulary and add LEGO-specific fields below the common fields.

The project’s existing field guidance also indicates that photos are required, conditional fields should appear immediately after the field that triggers them, and quantity fields should default to `1`. LEGO-specific fields should follow the same rules. Shipping-related weight and dimensions should remain in the existing shipping section rather than being added to the LEGO identity section.

## Requirement levels

| Level | Meaning in the proposed form |
|---|---|
| **Required** | The user cannot submit the listing without it for the applicable LEGO listing type. |
| **Recommended** | The field is strongly useful for accurate identification, search, valuation, or trading, but the user may submit without it. |
| **Optional** | The field provides additional detail but should not slow down ordinary listings. |
| **Conditional** | The field appears only after a triggering choice. Its own requirement level is shown in the conditional tables below. |

## Section 1 — Common listing information

These fields should be shared with the existing Add Inventory workflow rather than duplicated as LEGO-only fields.

| Field | Level | Applies to | Recommendation and rationale |
|---|---:|---|---|
| **Category** | Automatic | Every LEGO listing | Set automatically to `Vintage Toys`; do not ask the user to reselect it. |
| **Item Type** | Required | Every LEGO listing | Add `LEGO` to the Vintage Toys item-type dropdown. |
| **Listing Title** | Required | Every LEGO listing | Keep the existing field. Suggest the official set, minifigure, or part name when known, but do not auto-fill without user confirmation. |
| **Trade Value** | Required | Every LEGO listing | Keep the existing currency field. This is the user’s proposed trade value, not an automatic appraisal. |
| **Photos** | Required | Every LEGO listing | Require at least one real photo. For sets, the first image should ideally show the actual set or box rather than only a catalog image. |
| **Quantity** | Recommended, default `1` | Every LEGO listing | Keep the existing editable quantity field and default it to `1`. Quantity is especially useful for parts, minifigures, and lots. |
| **Condition** | Required or conditional | Every LEGO listing | Use a LEGO-specific condition flow described below. For sets, condition should be paired with completeness and packaging rather than used alone. |
| **Description / Seller Notes** | Recommended | Every LEGO listing | Include a free-text area for disclosures that do not fit structured fields: substitutions, odor, restoration, storage, missing parts, box wear, or provenance. |

## Section 2 — LEGO identity and classification

| Field | Level | Applies to | Recommended values or input |
|---|---:|---|---|
| **LEGO Listing Type** | Required | Every LEGO listing | `Set`, `Minifigure`, `Individual Part`, `Part/Lot`, `Gear or Accessory`, `Book/Instructions`, `Custom/MOC`. |
| **Set Number** | Conditional required | Set, sealed product, or known official product | Text input. Accept historic and modern formats, including sequential variants such as `1234-1` when applicable. LEGO states that set numbers appear on boxes and instructions and are used to locate official instructions.[3] |
| **Set Name / Official Product Name** | Recommended; required for a set when set number is unknown | Set or official product | Text input. Allow `Unknown` only when the seller genuinely cannot identify it. |
| **Theme / Product Line** | Recommended; required for searchable set listings | Set, minifigure, part, or lot when known | Searchable dropdown with an `Other` option. Examples include City, Castle, Space, Star Wars, Technic, Friends, Icons, Ideas, DUPLO, Classic, and licensed themes. LEGO’s own instruction search supports theme and year searches, and Brickset organizes sets by themes and years.[4] [5] |
| **Subtheme / Series** | Optional | Set, minifigure, or part when applicable | Useful for subthemes such as a specific Star Wars era, Castle faction, Collectible Minifigure series, or seasonal release. |
| **Release Year** | Recommended | Official sets and products | Four-digit year or `Unknown`. Brickset uses release year and retirement year as primary browsing dimensions.[5] |
| **Retirement Status** | Optional | Sets and official products | `Current`, `Retired`, `Unknown`, or `Not Applicable`. This is market/product status, not physical condition. Do not require sellers to know it. |
| **Edition / Variant** | Optional | Products with variants | Text or dropdown for regional packaging, alternate release, promotional version, reissue, or known variant. |
| **LEGO Element Number** | Conditional recommended | Individual part, minifigure component, or newer product where known | Text input. LEGO explains that elements have unique element numbers, while many parts also have design numbers.[3] |
| **Design ID / Part Number** | Conditional recommended | Individual part or component | Text input. Pair with color because a design number alone may not identify the exact part/color combination. |
| **Color** | Conditional recommended | Individual part, part lot, gear, or color-specific minifigure component | Searchable LEGO color selector, with `Mixed` for lots. Avoid free text when a controlled list is available. |
| **Character / Figure Name** | Conditional recommended | Minifigure | Text input, with optional series or theme. A minifigure is not adequately identified by the parent set alone. |
| **Figure Number** | Optional | Minifigure | Text input when a catalog number is known. |

## Section 3 — Set composition and completeness

These are the most important fields for LEGO sets. BrickLink explicitly separates set condition from a complete/incomplete sub-condition and says that a complete used set must contain the parts needed for the models, while missing instructions, stickers, packaging, or parts must be disclosed according to the applicable condition.[1]

| Field | Level | Trigger | Recommendation |
|---|---:|---|---|
| **Set Status** | Required | Set | `Sealed`, `Opened/Unbuilt`, `Built`, `Disassembled`, `Partially Built`, or `Unknown`. This is clearer than trying to infer everything from a generic condition field. |
| **Completeness** | Required | Set | `Complete`, `Nearly Complete`, `Incomplete`, or `Unknown`. Do not use only Yes/No because “nearly complete” is common and materially different from a random incomplete lot. |
| **Advertised Piece Count** | Recommended | Known official set | Number from the official product/catalog record when known. Do not treat this as proof that the seller’s used set is complete. |
| **Seller-Verified Piece Count** | Optional | Used or inventoried set | Number actually counted or verified by the seller. This should be distinct from advertised piece count. |
| **Missing Piece Count** | Conditional recommended | Completeness = Incomplete or Nearly Complete | Nonnegative integer. Show immediately after Completeness. |
| **Missing Pieces Description** | Conditional required | Completeness = Incomplete | Textarea describing important missing parts, minifigures, stickers, printed parts, or unique elements. |
| **Replacement / Non-Original Parts** | Conditional recommended | Set is used, incomplete, or rebuilt | `None known`, `Some replacements`, `Many replacements`, or `Unknown`, followed by a description when not `None known`. |
| **Minifigures Included** | Recommended | Set | `All original`, `Some original`, `None`, or `Unknown`. |
| **Minifigure Count** | Conditional recommended | Set | Show when the set includes minifigures or the seller selects `Some original`/`All original`. |
| **Specific Missing Minifigures** | Conditional recommended | Set incomplete or minifigure status not complete | Textarea or repeatable entries for character/name and figure number if known. |
| **Extra Pieces Included** | Optional | Set | `Yes`, `No`, or `Unknown`. Extra parts should not be confused with the parts required to complete the model. |
| **Alternate Models Included** | Optional | Set with alternate builds | `Yes`, `No`, or `Not Applicable`. Useful for vintage sets and sets with multiple official models. |

## Section 4 — Packaging, instructions, stickers, and accessories

| Field | Level | Trigger | Recommendation |
|---|---:|---|---|
| **Packaging Type** | Required | Set or official product | Reuse the existing concept but expand values to `Factory Sealed`, `Opened Box`, `Box Only`, `Polybag`, `No Original Packaging`, `Loose`, or `Other`. |
| **Original Box Included** | Recommended | Set | `Yes`, `No`, `Damaged`, or `Unknown`. The box should not determine whether a used set is complete. |
| **Box Condition** | Conditional recommended | Original Box Included = Yes or Damaged | `Excellent`, `Good`, `Fair`, `Poor`, or `Not Applicable`, plus notes for tears, crushing, tape, writing, or water damage. |
| **Original Bags Sealed** | Conditional recommended | Packaging Type = Opened Box | `All sealed`, `Some sealed`, `None sealed`, or `Unknown`. |
| **Instructions Included** | Recommended | Set | `Original paper instructions`, `Digital instructions only`, `Both`, `Not included`, or `Unknown`. LEGO provides official instruction lookup by set number, so digital availability should not be represented as original paper instructions.[4] |
| **Instruction Condition** | Conditional optional | Paper instructions included | `Excellent`, `Good`, `Fair`, `Poor`, or `Not Applicable`. |
| **Sticker Sheet Status** | Recommended | Set that originally used stickers | `Unapplied complete`, `Applied`, `Partially applied`, `Missing`, `Damaged`, or `Not Applicable`. BrickLink’s set guidance treats stickers as part of the completeness disclosure.[1] |
| **Sticker Condition** | Conditional recommended | Stickers are applied or included | `Excellent`, `Good`, `Worn`, `Peeling`, `Discolored`, or `Not Applicable`. |
| **Original Accessories Included** | Recommended | Set, gear, or product with accessories | `All`, `Some`, `None`, or `Unknown`. Use description for important accessories. |

## Section 5 — Condition and physical state

LEGO condition should not rely on vague terms such as “like new.” BrickLink specifically advises sellers not to use “Like New” or “As New” as a substitute for its condition system and requires disclosure of excessive wear, discoloration, scratches, and other marks.[1]

| Field | Level | Trigger | Recommended values |
|---|---:|---|---|
| **LEGO Condition** | Required | Every LEGO listing | For sets: `Sealed`, `New/Open Box`, `Used - Excellent`, `Used - Good`, `Used - Fair`, `Used - Poor`, or `For Parts`. For non-set items: `New`, `Used - Excellent`, `Used - Good`, `Used - Fair`, `Used - Poor`, or `For Parts`. |
| **Brick Wear** | Recommended | Used set, part, or lot | `Minimal`, `Normal play wear`, `Heavy wear`, `Scratched`, `Cracked`, `Discolored/Yellowed`, or `Mixed`. |
| **Cracked or Stress-Marked Parts** | Recommended | Used set, part, or lot | `None known`, `Present`, or `Unknown`; show a description and photo request when `Present`. |
| **Discoloration / Yellowing** | Recommended | Older or used LEGO | `None known`, `Some pieces`, `Significant`, or `Unknown`. |
| **Sticker / Print Wear** | Conditional recommended | Item has stickers or decorated parts | `None`, `Minor`, `Significant`, `Missing`, or `Unknown`. |
| **Smoke, Odor, Water, or Mold Exposure** | Recommended disclosure | Used set, lot, or collection | `None known`, `Present`, or `Unknown`, with detail when present. This is a trust and trade-safety disclosure rather than a collector identity field. |
| **Storage / Display History** | Optional | Any used item | `Stored`, `Displayed`, `Played with`, `Mixed`, or free text. Displayed minifigures should not automatically be represented as new; BrickLink treats displayed minifigures as used.[1] |

## Section 6 — Minifigure-specific fields

| Field | Level | Trigger | Recommendation |
|---|---:|---|---|
| **Minifigure Completeness** | Required | LEGO Listing Type = Minifigure | `Complete`, `Incomplete`, or `Unknown`. BrickLink says minifigures may only be listed as complete in its standard marketplace flow; incomplete figures should be broken down or clearly custom-described.[1] |
| **Accessories Included** | Recommended | Minifigure | `All original`, `Some`, `None`, or `Unknown`. |
| **Accessory Details** | Conditional recommended | Accessories = Some or All original | Text or repeatable entries for capes, weapons, tools, hair, headgear, shields, or other accessories. |
| **Print Condition** | Recommended | Minifigure | `Excellent`, `Minor wear`, `Heavy wear`, `Faded`, or `Unknown`. |
| **Cracks / Damage** | Required when present | Minifigure | `None known`, `Cracked`, `Damaged`, or `Unknown`, plus notes and photos when present. |
| **Custom or Genuine LEGO** | Required | Minifigure | `Genuine LEGO`, `Custom figure`, `Modified genuine LEGO`, or `Unknown`. |

## Section 7 — Individual part, lot, gear, book, and MOC fields

| Field | Level | Trigger | Recommendation |
|---|---:|---|---|
| **Authenticity / Compatibility** | Required | Individual part or lot | `Genuine LEGO`, `Mixed genuine and compatible`, `Compatible/non-LEGO`, or `Unknown`. This is important because a buyer may otherwise assume a loose lot is genuine LEGO. |
| **Part Number / Design ID** | Recommended | Part or known component | Use LEGO design number when available. |
| **Element Number** | Optional | Part where known | Useful for exact identification but should not block ordinary listings. |
| **Color** | Recommended | Part or color-specific lot | Controlled selector; use `Mixed` for a mixed lot. |
| **Quantity** | Recommended, default `1` | Part, minifigure, gear, or lot | Editable quantity. For a lot, this may represent the number of pieces or units, with a separate approximate-count note if needed. |
| **Part Condition** | Required | Part or lot | `New`, `Used`, `For Parts`, or `Mixed`. |
| **Mixed Lot Description** | Required | Part/Lot | Describe themes, approximate contents, minifigures, unusual elements, and whether sorting or counting was performed. |
| **Gear/Product Number** | Recommended | Gear or accessory | Text input when known. |
| **Book/Instruction Type** | Required | Book/Instructions | `Original Instructions`, `Catalog`, `Magazine`, `Activity Book`, `Reference Book`, or `Other`. |
| **Instruction/Product Number** | Recommended | Book/Instructions | Text input when known. |
| **MOC Status** | Required | Custom/MOC | `Original custom design`, `Modification of an official set`, `Fan design`, or `Unknown`. |
| **MOC Instructions Included** | Recommended | Custom/MOC | `Yes`, `No`, `Digital only`, or `Unknown`. |
| **Custom Parts Used** | Recommended | Custom/MOC | `None known`, `Some`, `Many`, or `Unknown`, with description when applicable. |
| **Official LEGO Parts Only** | Recommended | Custom/MOC | `Yes`, `No`, or `Unknown`. |

## Section 8 — Grading and authentication

Tradebilia’s existing Vintage Toys model already requires an **Is Graded** decision and conditionally displays **Grading Company**, **Grade**, and **Certification Number**. That pattern should be retained for LEGO, but the form should not imply that ordinary LEGO sets have a universally accepted industry grading standard.

| Field | Level | Trigger | Recommendation |
|---|---:|---|---|
| **Is Graded** | Required | Every LEGO listing | Default to `No`; require the user to choose `Yes` or `No`. |
| **Grading Company** | Conditional required | Is Graded = Yes | Use the current shared grading-company flow, but allow `Other`. |
| **Grade** | Conditional required | Is Graded = Yes | Text input because grading scales may differ. |
| **Certification Number** | Conditional required | Is Graded = Yes | Text input. |
| **Authentication / Verification Notes** | Conditional recommended | Is Graded = Yes or a rare/custom item | Describe what was authenticated and by whom. Do not call an item “Tradebilia authenticated” unless Tradebilia has actually performed that service. |

## Conditional logic and display order

The form should reveal conditional fields immediately after their trigger, not place every possible field in one long form. The recommended order is:

1. Common fields: Item Type, Listing Title, Trade Value, Photos, Quantity.
2. LEGO Listing Type.
3. LEGO identity fields relevant to that type.
4. For sets: Set Status, Packaging Type, Completeness, then the completeness-dependent fields.
5. LEGO Condition, followed by physical-condition disclosures.
6. Instructions, box, stickers, minifigures, and accessories.
7. Is Graded, followed immediately by grading fields if the answer is Yes.
8. Description and existing shipping/trade logistics.

The most important conditional rules are:

| Trigger | Fields that appear |
|---|---|
| LEGO Listing Type = Set | Set Number, Set Name, Theme, Release Year, Set Status, Packaging Type, Completeness, Piece Count, Minifigure Status, Instructions, Box, Stickers. |
| Set Number is unknown | Set Name remains required or recommended; identification notes and extra photos become recommended. |
| Completeness = Incomplete | Missing Piece Count, Missing Pieces Description, Replacement Parts, and completeness photos. |
| Completeness = Nearly Complete | Missing Piece Count, Missing Pieces Description, and replacement-parts disclosure. |
| Packaging Type = Factory Sealed | Box condition and seal condition; do not require seller-verified piece count. |
| Packaging Type = Opened Box | Original Bags Sealed, Build Status, and piece/completeness fields. |
| Original Box Included = Yes | Box Condition. |
| Instructions Included = Original paper instructions | Instruction Condition. |
| Stickers = Applied, Partially Applied, or Included | Sticker Condition. |
| LEGO Listing Type = Minifigure | Character, series/theme, figure number, completeness, accessories, print condition, cracks/damage, authenticity. |
| LEGO Listing Type = Individual Part or Part/Lot | Part/Design ID, element number, color, quantity, authenticity, part condition. |
| LEGO Listing Type = Mixed Lot | Lot description, approximate quantity, themes, minifigure count, authenticity mix, and condition mix. |
| LEGO Listing Type = Custom/MOC | MOC status, designer, instructions, custom parts, official-part status, and completion state. |
| Is Graded = Yes | Grading Company, Grade, Certification Number, and optional authentication notes. |

## What should not be required

The following should remain optional or recommended rather than mandatory: retired status, original retail price, current market reference, provenance, storage history, box condition when there is no box, seller-verified piece count for a sealed set, element number, design ID, subtheme, exact minifigure number, alternate models, extra pieces, and grading.

Making those fields mandatory would create friction for ordinary sellers and would be especially unreasonable for mixed lots, loose bricks, older sets with uncertain documentation, and custom builds. The form should require enough information to prevent material misrepresentation but allow a collector to list an item that is not fully cataloged.

## Recommended first-release required fields

For the first LEGO release, I recommend requiring only the following universally:

| Required field | Reason |
|---|---|
| Item Type = LEGO | Establishes the specialized flow. |
| Listing Type | Determines the applicable conditional fields. |
| Listing Title | Needed for search, display, and trade proposals. |
| Trade Value | Existing marketplace requirement. |
| At least one photo | Existing marketplace requirement and essential for condition disputes. |
| Quantity, default 1 | Needed for inventory semantics, but editable. |
| LEGO Condition | Required for every item. |
| Is Graded | Required to keep the existing grading architecture consistent; default `No`. |
| Set Number, when Listing Type = Set | The strongest official set identifier. |
| Completeness, when Listing Type = Set | Prevents a used set from being presented ambiguously. |
| Authenticity, when Listing Type = Individual Part, Part/Lot, or Minifigure | Prevents ambiguity between genuine LEGO and compatible/custom items. |
| Listing-type-specific identity | For example, character for a minifigure, part number for a part, and lot description for a mixed lot. |

## Recommended second-release enhancements

A later phase could add set-number lookup, official theme/year/piece-count suggestions, catalog matching, image-assisted identification, repeatable minifigure and missing-piece rows, and a structured part inventory upload. Those features should not be prerequisites for the initial LEGO item type.

## Final recommendation

The best first implementation is **Vintage Toys → LEGO → LEGO Listing Type**, with a compact required core and conditional sections. The key principles are to require identification only where it is meaningful, separate advertised piece count from seller-verified completeness, distinguish packaging from condition, and disclose authenticity for loose parts and lots. This gives serious LEGO collectors enough structure without forcing every seller to complete a cataloging exercise before listing.

## References

[1] [BrickLink — Item Condition Guidelines](https://www.bricklink.com/help.asp?helpID=102)

[2] [BrickLink — My Collection](https://www.bricklink.com/help.asp?helpID=2566)

[3] [LEGO — Identifying LEGO set and piece numbers](https://www.lego.com/en-us/service/help-topics/article/identifying-lego-set-and-piece-numbers)

[4] [LEGO — Building Instructions](https://www.lego.com/en-us/service/building-instructions)

[5] [Brickset — Sets database and browse dimensions](https://brickset.com/sets)

[6] [Brickset — Browse: sets, minifigures, parts, instructions, and inventories](https://brickset.com/browse)

[7] [BrickLink — Adding an Inventory](https://www.bricklink.com/help.asp?helpID=1103)
