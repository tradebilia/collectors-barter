# Layout Reference Design - Sports Cards / Single Card

**Status:** ✅ LOCKED IN - Approved by Rich

This document serves as the reference design for all item type layouts in Tradebilia.

## Configuration Details

### Sports Cards - Single Card Layout

**File:** `client/src/lib/layoutConfigs/layouts/sports_cards_single_card.ts`

#### Required Fields Section
- **Grid:** 2 columns
- **Gap:** gap-6
- **Padding:** p-4
- **Fields:** 12 total (all using half column span)
  1. Listing Title
  2. Trade Value
  3. Sport
  4. Player Name
  5. Year
  6. Manufacturer
  7. Is Graded
  8. Condition
  9. Serial Number
  10. Grading Company (conditional on Is Graded = Yes)
  11. Grade (conditional on Is Graded = Yes)
  12. Certification Number (conditional on Is Graded = Yes)

#### Recommended Fields Section
- **Grid:** 2 columns
- **Gap:** gap-6
- **Padding:** p-4
- **Fields:** 7 total (all using half column span)
  1. Quantity
  2. Set Name
  3. Card Number
  4. Rookie Card
  5. Autograph
  6. Relic / Memorabilia
  7. Serial Numbered

#### Optional Fields Section
- **Grid:** 1 column
- **Gap:** gap-6
- **Padding:** p-4
- **Fields:** 1 total (using full column span)
  1. Parallel Variation

### Conditional Field Placement
- `isGraded`: Conditional fields appear to the **right** of parent field
- `signed`: Conditional fields appear to the **right** of parent field
- `sealed`: Conditional fields appear to the **right** of parent field

## Key Design Principles

1. **2-Column Layout for Required/Recommended** - Provides good balance between field density and readability
2. **Half Column Spans** - Each field takes up half the available width, creating a clean 2-column grid
3. **Consistent Spacing** - gap-6 provides adequate breathing room between fields
4. **Single Column for Optional** - Reduces cognitive load for less important fields
5. **Conditional Fields on Right** - Grading fields appear to the right of "Is Graded" for logical flow

## Approval History

- **Date:** June 26, 2026
- **Approved By:** Rich
- **Status:** Locked In
- **Notes:** All formatting looks good - ready to apply to other item types

---

## Next Steps

1. Apply this reference design pattern to all other item types
2. Customize column counts and field ordering as needed per category
3. Maintain consistent spacing and conditional field placement across all categories
