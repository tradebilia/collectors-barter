# COMPREHENSIVE FIELD CAPTURE AUDIT & FIX LOG

## CRITICAL ISSUES FOUND

### Issue 1: Condition Field Hardcoded to "mint"
**Location:** AddInventory.tsx line 220
**Problem:** `condition: "mint"` ignores user's selection
**Fix:** Should be `condition: formData.condition || "mint"`

### Issue 2: shippingAvailable Not Sent to Backend
**Location:** AddInventory.tsx lines 216-227
**Problem:** Field is excluded from itemDetails but not sent separately
**Fix:** Need to add `shippingAvailable: formData.shippingAvailable` to submission

### Issue 3: estimatedValue vs tradeValue Naming
**Location:** AddInventory.tsx line 222
**Problem:** Form field is `tradeValue` but submission sends `estimatedValue`
**Fix:** Need to verify field name consistency

### Issue 4: certificationCompany & grade Duplication
**Location:** AddInventory.tsx lines 225-226
**Problem:** These fields might also be in itemDetails, causing duplication
**Fix:** Need to ensure they're not included in itemDetails

### Issue 5: Field Definition Requirement Levels Wrong
**Location:** fieldDefinitionsGenerated.ts
**Problems:**
- `variantDescription` marked as `recommended` should be `conditional`
- `characterName` marked as `optional` should be `conditional`
- Need to audit ALL categories for similar issues

---

## FIELD CAPTURE FLOW VERIFICATION

### For each field, verify:
1. ✓ Defined in field definitions
2. ✓ Included in currentFields based on category/itemType
3. ✓ Rendered in form
4. ✓ Captured in formData when user types
5. ✓ Included in submission payload
6. ✓ Correctly named in backend expectations

---

## CATEGORIES TO AUDIT

- [ ] Sports Cards (Single Card, Unopened Product, Set, Collection/Lot)
- [ ] Comics (Single Comic, Original Art, Collection/Lot)
- [ ] Video Games (Game, Console, Accessory, Collection/Lot)
- [ ] Vintage Toys (Action Figure, Vehicle, Playset, Board Game, Plush, Electronic, Model, Die-Cast, Collection/Lot)
- [ ] Stamps (Single Stamp, Stamp Set, Collection/Lot)
- [ ] Coins (Single Coin, Coin Set, Paper Money, Collection/Lot)
- [ ] Movies (Individual Movie, Box Set, Collection/Lot)
- [ ] Autographs (Signed Item, Collection/Lot)
- [ ] Disney Pins (Individual Pin, Pin Set, Collection/Lot)
- [ ] Pokemon (Single Card, Unopened Product, Set, Collection/Lot)

---

## SUBMISSION PAYLOAD TEMPLATE

```javascript
{
  title: formData.listingTitle,
  category: formData.category,
  itemType: formData.itemType,
  condition: formData.condition,  // NOT hardcoded!
  description: formData.description,
  estimatedValue: formData.tradeValue ? parseFloat(formData.tradeValue) : 0,
  photos: reorderedPhotos,
  itemDetails: getItemDetails(),  // All category-specific fields
  certificationCompany: formData.gradingCompany,
  grade: formData.grade,
  // MISSING: shippingAvailable
}
```

---

## GETITEMDETAILS() EXCLUSION LIST

Currently excludes: `['category', 'itemType', 'shippingAvailable', 'description', 'photos']`

**Should also exclude:**
- `listingTitle` (sent as `title`)
- `tradeValue` (sent as `estimatedValue`)
- `condition` (sent separately)
- `gradingCompany` (sent as `certificationCompany`)
- `grade` (sent separately)
- `certificationNumber` (sent separately? or in itemDetails?)

**Needs verification for each category**

