# LEGO Under Vintage Toys — Field Grid Review

**Status:** Review only. No LEGO fields have been implemented.

This document reorganizes the LEGO proposal into the exact review structure requested: **Required**, **Recommended**, **Optional**, and **Conditional** fields. The design uses Tradebilia’s existing listing sections and separates LEGO sets, minifigures, individual parts, lots, gear/accessories, books/instructions, and custom/MOC listings.

> **Recommended architecture:** `Vintage Toys → LEGO → LEGO Listing Type`
>
> The listing type controls which conditional fields appear. This avoids forcing a loose minifigure, mixed brick lot, sealed set, and custom build through the same long form.

## 1. Required Fields

These are the fields that should appear in the **Required Fields** section. Some apply to every LEGO listing; others are required only for a particular LEGO Listing Type and are therefore repeated in the conditional grid later.

| Tradebilia section | Field label | Applies to | Proposed input | Why it is required |
|---|---|---|---|---|
| Basic Information | **Item Type** | All LEGO listings | Fixed value: LEGO | Establishes the specialized LEGO workflow under Vintage Toys. |
| Basic Information | **LEGO Listing Type** | All LEGO listings | Dropdown | Determines whether the user is listing a set, minifigure, part, lot, gear, book/instructions, or MOC. |
| Basic Information | **Listing Title** | All LEGO listings | Text | Required for search, display, trade proposals, and inventory identification. |
| Value | **Trade Value** | All LEGO listings | Currency | Existing marketplace requirement; represents the user’s proposed trade value, not an automatic appraisal. |
| Images | **Photos** | All LEGO listings | Image upload | At least one actual item photo is needed for condition and authenticity review. |
| Inventory | **Quantity** | All LEGO listings | Number, default `1` | Needed for inventory semantics; the user may edit the default value. |
| Condition | **LEGO Condition** | All LEGO listings | Dropdown | A LEGO item cannot be accurately offered without a basic physical-condition statement. |
| Grading | **Is Graded** | All LEGO listings | Yes/No dropdown, default `No` | Preserves Tradebilia’s established grading architecture without implying that ordinary LEGO requires professional grading. |
| Set Details | **Set Number** | Official sets and known official products | Text | LEGO identifies sets by set number on the box and instructions; this is the strongest set identifier.[1] |
| Set Details | **Completeness** | LEGO sets | Dropdown | A used set must not be presented ambiguously as complete or incomplete. |
| Minifigure Details | **Minifigure Completeness** | Minifigure listings | Dropdown | Distinguishes a complete minifigure from one missing accessories or components. |
| Part Details | **Authenticity / Compatibility** | Individual parts and part lots | Dropdown | Prevents buyers from assuming that all loose parts are genuine LEGO. |
| Minifigure Details | **Authenticity / Compatibility** | Minifigure listings | Dropdown | Distinguishes genuine LEGO figures from custom, modified, or unknown figures. |
| Lot Details | **Mixed Lot Description** | Mixed brick or part lots | Textarea | A lot cannot be identified adequately by a generic title alone. |
| MOC Details | **MOC Status** | Custom/MOC listings | Dropdown | Distinguishes original custom designs, modified official sets, fan designs, and unknown status. |
| Book / Instructions | **Book or Instruction Type** | Books/instructions | Dropdown | Identifies whether the listing is an instruction booklet, catalog, magazine, activity book, or reference book. |
| Grading | **Grading Company** | If Is Graded = Yes | Dropdown | Required only when the item is declared graded. |
| Grading | **Grade** | If Is Graded = Yes | Text | Required to record the actual grade assigned by the named company. |
| Grading | **Certification Number** | If Is Graded = Yes | Text | Required when available for a graded item’s traceability. |

### Required condition values

The existing generic condition vocabulary should be expanded for LEGO rather than relying only on Mint, Near Mint, Excellent, and similar terms.

| LEGO listing type | Required condition choices |
|---|---|
| Set | `Factory Sealed`, `New/Open Box`, `Used - Excellent`, `Used - Good`, `Used - Fair`, `Used - Poor`, `For Parts`, `Unknown` |
| Minifigure | `New`, `Used - Excellent`, `Used - Good`, `Used - Fair`, `Used - Poor`, `For Parts`, `Unknown` |
| Individual part or part lot | `New`, `Used`, `For Parts`, `Mixed`, `Unknown` |
| Gear/accessory | `New`, `Used - Excellent`, `Used - Good`, `Used - Fair`, `For Parts`, `Unknown` |
| Book/instructions | `New`, `Used - Excellent`, `Used - Good`, `Used - Fair`, `Poor`, `For Parts`, `Unknown` |
| Custom/MOC | `New Build`, `Displayed`, `Used`, `Incomplete`, `For Parts`, `Unknown` |

## 2. Recommended Fields

These should appear in the **Recommended Fields** section. They materially improve identification, search, valuation, or trade transparency, but a user should be able to submit without every one of them.

| Tradebilia section | Field label | Applies to | Proposed input | Why recommended |
|---|---|---|---|---|
| Identity | **Set Name / Official Product Name** | Sets and official products | Text | Provides a human-readable catalog identity when the number is known. |
| Identity | **Theme / Product Line** | Sets, minifigures, parts, lots | Searchable dropdown with Other | Themes are central to LEGO search and catalog browsing.[2] [3] |
| Identity | **Release Year** | Official sets/products | Number | Helps distinguish similar releases and supports vintage discovery. |
| Set Details | **Set Status** | Sets | Dropdown | `Sealed`, `Opened/Unbuilt`, `Built`, `Disassembled`, `Partially Built`, `Unknown`. |
| Set Details | **Advertised Piece Count** | Known official sets | Number | Records the catalog or box count; it does not prove a used set is complete. |
| Set Details | **Minifigures Included** | Sets | Dropdown | `All Original`, `Some Original`, `None`, `Unknown`. |
| Set Details | **Minifigure Count** | Sets with minifigures | Number | Makes the contents easier to evaluate. |
| Set Details | **Instructions Included** | Sets | Dropdown | `Original Paper`, `Digital Only`, `Both`, `Not Included`, `Unknown`. LEGO provides official instruction lookup by set number.[4] |
| Set Details | **Original Box Included** | Sets | Dropdown | `Yes`, `No`, `Damaged`, `Unknown`. Packaging should not be confused with completeness. |
| Set Details | **Sticker Sheet Status** | Sets that used stickers | Dropdown | `Unapplied Complete`, `Applied`, `Partially Applied`, `Missing`, `Damaged`, `Not Applicable`. |
| Set Details | **Extra Pieces Included** | Sets | Yes/No/Unknown | Separates extra parts from pieces needed to complete the model. |
| Set Details | **Original Accessories Included** | Sets, gear, products | All/Some/None/Unknown | Captures accessories that materially affect completeness or value. |
| Condition | **Brick Wear** | Used sets, parts, lots | Dropdown | `Minimal`, `Normal Play Wear`, `Heavy Wear`, `Scratched`, `Cracked`, `Discolored/Yellowed`, `Mixed`. |
| Condition | **Cracked or Stress-Marked Parts** | Used sets, parts, lots | Dropdown | `None Known`, `Present`, `Unknown`. Cracks should be disclosed because they affect usability and value. |
| Condition | **Discoloration / Yellowing** | Older or used LEGO | Dropdown | `None Known`, `Some Pieces`, `Significant`, `Unknown`. |
| Condition | **Smoke, Odor, Water, or Mold Exposure** | Used sets, lots, collections | Disclosure dropdown | `None Known`, `Present`, `Unknown`, with details if present. |
| Part Details | **Part Number / Design ID** | Individual parts and known components | Text | LEGO uses design numbers and element numbers to identify pieces.[1] |
| Part Details | **Color** | Parts, gear, color-specific components | Controlled color selector | Color is essential for exact part identification; use `Mixed` for lots. |
| Part Details | **Quantity** | Parts, minifigures, gear, lots | Number | Helps buyers understand whether the listing is one piece or a group. |
| Minifigure Details | **Character / Figure Name** | Minifigures | Text | A figure needs an identity beyond the set it came from. |
| Minifigure Details | **Accessories Included** | Minifigures | All/Some/None/Unknown | Accessories can materially affect the figure’s completeness. |
| Minifigure Details | **Print Condition** | Minifigures | Dropdown | `Excellent`, `Minor Wear`, `Heavy Wear`, `Faded`, `Unknown`. |
| Lot Details | **Approximate Quantity** | Mixed lots | Number or estimate | Helps distinguish a small group from a large collection lot. |
| Lot Details | **Themes Represented** | Mixed lots | Multi-select or text | Useful when the lot contains multiple LEGO themes. |
| MOC Details | **Official LEGO Parts Only** | Custom/MOC | Yes/No/Unknown | Clarifies whether compatible or custom parts are present. |
| MOC Details | **MOC Instructions Included** | Custom/MOC | Yes/No/Digital Only/Unknown | Important for buyers who want to rebuild the design. |
| MOC Details | **Custom Parts Used** | Custom/MOC | None/Some/Many/Unknown plus notes | Clarifies the degree of modification. |
| Books / Instructions | **Book or Product Number** | Books/instructions | Text | Useful for matching catalogs, manuals, and official publications. |
| Description | **Seller Notes** | All LEGO listings | Textarea | Captures substitutions, restoration, storage, provenance, and disclosures not represented by dropdowns. |

## 3. Optional Fields

These should appear in the **Optional Fields** section. They provide useful context but should not make ordinary listings difficult to create.

| Tradebilia section | Field label | Applies to | Proposed input | Why optional |
|---|---|---|---|---|
| Identity | **Subtheme / Series** | Sets, minifigures, parts | Text or dropdown | Useful for advanced collectors but unnecessary for basic listings. |
| Identity | **Retirement Status** | Official sets/products | Current/Retired/Unknown/Not Applicable | Sellers may not know the current product status, and it can change over time. |
| Identity | **Edition / Variant** | Products with variants | Text or dropdown | Useful for regional packaging, reissues, promotional releases, or known variants. |
| Identity | **Element Number** | Parts/components | Text | Helpful for exact identification but not necessary for ordinary listings. |
| Identity | **Figure Number** | Minifigures | Text | Useful when known but too specialized to require. |
| Set Details | **Seller-Verified Piece Count** | Used or inventoried sets | Number | More useful than the advertised count, but counting may be impractical. |
| Set Details | **Alternate Models Included** | Sets with alternate builds | Yes/No/Not Applicable | Applies only to some vintage sets. |
| Set Details | **Box Condition** | Sets with original box | Excellent/Good/Fair/Poor | Relevant only when a box exists and the seller can assess it. |
| Set Details | **Instruction Condition** | Paper instructions | Excellent/Good/Fair/Poor | Additional detail beyond whether instructions are included. |
| Set Details | **Original Bags Sealed** | Opened-box sets | All/Some/None/Unknown | Useful for opened boxes but irrelevant to loose or built sets. |
| Condition | **Sticker or Print Wear** | Items with stickers or decorated parts | None/Minor/Significant/Missing/Unknown | Important for some items but not every LEGO listing. |
| Condition | **Storage / Display History** | Used items | Dropdown or text | Helpful context but not necessary for submission. |
| Condition | **Restoration or Cleaning Details** | Used or restored items | Textarea | Useful when applicable, but should remain a disclosure rather than a required barrier. |
| Value | **Original Retail Price** | Official sets/products | Currency | Useful for context but not a current valuation. |
| Value | **Market Reference** | Any listing | URL or text | May help explain trade value but should not be represented as an official appraisal. |
| Value | **Provenance** | Rare, signed, or notable items | Textarea | Useful for high-value items but unavailable for most listings. |
| Minifigure Details | **Accessory Details** | Minifigures with accessories | Text or repeatable entries | Lets the seller list capes, weapons, tools, hair, or headgear. |
| Part Details | **Element Number** | Parts where known | Text | Exact LEGO identification is valuable but not always available. |
| Book / Instructions | **Publication Year** | Books/instructions | Number | Useful for catalogs and manuals when known. |
| MOC Details | **Designer / Builder** | Custom/MOC | Text | Useful for attribution but not required for a personal creation. |
| MOC Details | **Parts List Included** | Custom/MOC | Yes/No/Digital Only/Unknown | Helpful for rebuildability but not essential to list a MOC. |
| Authentication | **Authentication Notes** | Graded, rare, custom, or unusual items | Textarea | Should never imply Tradebilia performed authentication unless it actually did. |

## 4. Conditional Fields and Triggers

Conditional fields should appear immediately after the field that triggers them. They should remain hidden when irrelevant, and the form should update silently when the trigger changes.

| Trigger field and value | Fields that appear | Status after appearing | Applies to |
|---|---|---|---|
| **LEGO Listing Type = Set** | Set Number; Set Name; Theme; Release Year; Set Status; Packaging Type; Completeness; Advertised Piece Count; Minifigure status; Instructions; Box; Sticker status | Set Number, Set Status, Packaging Type, and Completeness are required; the remaining fields are recommended unless noted below. | Sets |
| **LEGO Listing Type = Minifigure** | Character/Figure Name; Theme/Series; Minifigure Completeness; Accessories Included; Print Condition; Cracks/Damage; Authenticity | Character/Figure Name, Minifigure Completeness, and Authenticity are required; the remaining fields are recommended or conditional. | Minifigures |
| **LEGO Listing Type = Individual Part** | Part/Design ID; Element Number; Color; Quantity; Authenticity; Part Condition | Authenticity and Part Condition are required; Part/Design ID, Color, and Quantity are recommended. | Parts |
| **LEGO Listing Type = Part/Lot** | Approximate Quantity; Themes Represented; Color; Authenticity; Mixed Lot Description; Condition Mix | Authenticity, Mixed Lot Description, and Part Condition are required; the remaining fields are recommended. | Lots |
| **LEGO Listing Type = Gear or Accessory** | Gear/Product Number; Color; Quantity; Accessories/contents; Condition | Condition is required; number, color, quantity, and contents are recommended. | Gear/accessories |
| **LEGO Listing Type = Book/Instructions** | Book/Instruction Type; Product Number; Publication Year; Condition; Completeness | Book/Instruction Type and Condition are required; product number and year are recommended. | Books/instructions |
| **LEGO Listing Type = Custom/MOC** | MOC Status; Official LEGO Parts Only; Custom Parts Used; Designer/Builder; Instructions; Parts List; Completion State | MOC Status and condition are required; the remaining fields are recommended or optional. | Custom builds |
| **Set Number is unknown** | Set Name; Theme; Release Year; Identification Notes; additional identification photo prompt | Set Name becomes required or must be explicitly marked Unknown; notes and extra photo are recommended. | Sets |
| **Packaging Type = Factory Sealed** | Seal Condition; Box Condition; Original Bags Sealed | Seal Condition is recommended; box and bag details are optional or recommended depending on availability. Seller-verified piece count should not be required. | Sets/products |
| **Packaging Type = Opened Box** | Original Bags Sealed; Set Status; Completeness; Seller-Verified Piece Count | Set Status and Completeness remain required; bag and verified count are recommended. | Sets |
| **Packaging Type = Loose or No Original Packaging** | Original Box Included = No; Packaging Notes | No additional required field; packaging notes are optional. | Loose sets/parts |
| **Completeness = Incomplete** | Missing Piece Count; Missing Pieces Description; Replacement Parts; Completeness Photos; Missing Minifigures | Missing Pieces Description is required; count, replacement disclosure, and photos are recommended. | Sets |
| **Completeness = Nearly Complete** | Missing Piece Count; Missing Pieces Description; Replacement Parts | Missing Pieces Description is recommended but should be required if the seller knows what is missing. | Sets |
| **Minifigures Included = Some Original** | Minifigure Count; Included Figure Details; Missing Minifigures | Count is recommended; missing-figure details are recommended. | Sets |
| **Minifigures Included = All Original** | Minifigure Count; Figure Details | Count is recommended; details are optional unless a rare figure materially affects value. | Sets |
| **Original Box Included = Yes or Damaged** | Box Condition; Box Photos | Box Condition is recommended; photos are optional but strongly useful. | Sets |
| **Instructions Included = Original Paper** | Instruction Condition; Instruction Photos | Condition is recommended; photos are optional. | Sets |
| **Sticker Sheet Status = Applied, Partially Applied, or Included** | Sticker Condition; Sticker Photos | Sticker Condition is recommended; photos are optional but useful. | Sets |
| **Brick Wear = Cracked or Discolored** | Damage Details; Damage Photos | Damage Details is required when the condition is present; photos are recommended. | Used sets, parts, lots |
| **Cracked or Stress-Marked Parts = Present** | Affected Parts Description; Affected-Part Photos | Description is required; photos are recommended. | Used sets, parts, lots |
| **Accessories Included = Some or All Original** | Accessory Details | Recommended. | Minifigures, sets, gear |
| **Minifigure Completeness = Incomplete** | Missing Components; Missing Accessories; Damage Notes | Missing components and damage notes are required or recommended depending on what is missing. | Minifigures |
| **Authenticity = Custom, Modified, Mixed, or Unknown** | Authenticity Details; Compatible-Part Disclosure; Photos | Details are required for `Custom`, `Modified`, or `Mixed`; recommended for `Unknown`. | Minifigures, parts, lots, MOCs |
| **LEGO Listing Type = Mixed Lot** | Theme Mix; Approximate Quantity; Minifigure Count; Condition Mix; Sorting Status | Lot description is required; other fields are recommended. | Mixed lots |
| **MOC Status = Modification of Official Set** | Original Set Number; Modified Components; Original/Custom Parts | Original Set Number is recommended; modification details are recommended. | MOCs |
| **MOC Status = Original Custom Design** | Designer/Builder; Instructions; Parts List; Custom Parts Used | Designer is recommended; instructions and parts list are optional or recommended. | MOCs |
| **Is Graded = Yes** | Grading Company; Grade; Certification Number; Authentication Notes | Grading Company, Grade, and Certification Number are required; notes are recommended. | All listing types |
| **Is Graded = No** | Standard LEGO Condition | Required. Grading fields remain hidden. | All listing types |

## 5. Recommended first-release form layout

The first implementation should keep the form manageable. The universal Required Fields section should contain **Item Type, LEGO Listing Type, Listing Title, Trade Value, Photos, Quantity, LEGO Condition, and Is Graded**. After the user selects a LEGO Listing Type, the form should insert only the relevant required and recommended fields directly below that selection.

For a set, the first visible LEGO block should be **Set Number, Set Name, Theme, Release Year, Set Status, Packaging Type, and Completeness**. If the user selects Incomplete, the missing-piece fields should appear immediately beneath Completeness. If the user selects Is Graded = Yes, the grading fields should appear immediately beneath Is Graded.

This design keeps the required section honest: it does not require a set number from a loose brick lot, a minifigure count from a single part, or a box condition from an unboxed set. It also preserves Tradebilia’s existing form conventions: required fields should be visibly marked, validation should occur on both client and server, photos should be required with at least one image, and conditional controls should be hidden until relevant.

## 6. Fields that should not be required

The following should remain recommended or optional: retirement status, original retail price, current market reference, provenance, subtheme, seller-verified piece count for sealed sets, exact element number, exact figure number, alternate models, box condition when there is no box, storage history, and professional grading. These fields help advanced collectors but would create unnecessary friction for ordinary listings.

Shipping weight and dimensions should remain in Tradebilia’s existing shipping section rather than being added to the LEGO-specific field model.

## 7. Decision summary

The proposed LEGO form should use a compact universal required core and a type-driven conditional flow. The most important fields for a set are **Set Number, Set Status, Packaging Type, Completeness, and missing-content disclosure**. The most important fields for a minifigure are **identity, completeness, accessories, condition, and authenticity**. The most important fields for parts and lots are **part identification, color, quantity, condition, and genuine-versus-compatible disclosure**. The most important fields for MOCs are **MOC status, official-versus-custom parts, instructions, and modification details**.

This is the structure I recommend reviewing before implementation.

## References

[1] [LEGO — Identifying LEGO set and piece numbers](https://www.lego.com/en-us/service/help-topics/article/identifying-lego-set-and-piece-numbers)

[2] [BrickLink — Item Condition Guidelines](https://www.bricklink.com/help.asp?helpID=102)

[3] [BrickLink — My Collection item types](https://www.bricklink.com/help.asp?helpID=2566)

[4] [LEGO — Building Instructions](https://www.lego.com/en-us/service/building-instructions)

[5] [Brickset — LEGO sets database](https://brickset.com/sets)

[6] [Brickset — Sets, minifigures, parts, instructions, and inventories](https://brickset.com/browse)

[7] [BrickLink — Adding an Inventory](https://www.bricklink.com/help.asp?helpID=1103)
