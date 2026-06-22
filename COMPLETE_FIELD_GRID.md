# Complete Field Grid - All Categories & Item Types

This document provides a comprehensive grid of all fields for every category and item type in Tradebilia.

**Legend:**
- **Required** (*): Must be filled before submission
- **Recommended** (○): Should be filled for better listings
- **Optional** (◇): Nice to have
- **Conditional**: Only appears when a specific condition is met

---

## AUTOGRAPHS

### Signed Item

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Signer | text | Required | None |
| Signed Item Type | dropdown | Required | None |
| Autograph Category | dropdown | Recommended | None |
| Authenticated | dropdown | Required | None |
| Authentication Company | dropdown | Required | Authenticated = Yes |
| Authentication Type | dropdown | Required | Authenticated = Yes |
| Certificate Number | text | Required | Authenticated = Yes |
| Inscription Present | dropdown | Recommended | None |
| Inscription Text | text | Recommended | Inscription Present = Yes |

### Collection Lot

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Approximate Item Count | number | Required | None |
| Signers Included | text | Recommended | None |
| Notable Items | text | Recommended | None |

---

## COMICS

### Single Comic

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Comic Title | text | Required | None |
| Issue Number | number | Required | None |
| Publisher | text | Required | None |
| Year | number | Required | None |
| Number of Signatures | number | Recommended | None |
| Signed By | text | Recommended | Number of Signatures > 0 |
| Grade | dropdown | Required | None |
| Grading Company | dropdown | Required | None |
| Certification Number | text | Required | None |

### Original Art

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Art Title | text | Required | None |
| Artist Name | text | Required | None |
| Medium | text | Required | None |
| Year Created | number | Recommended | None |
| Dimensions | text | Recommended | None |
| Signed | dropdown | Recommended | None |
| Authenticated | dropdown | Required | None |
| Authentication Company | dropdown | Required | Authenticated = Yes |
| Certificate Number | text | Required | Authenticated = Yes |

### Collection Lot

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Approximate Item Count | number | Required | None |
| Publishers Included | text | Recommended | None |
| Notable Comics | text | Recommended | None |

---

## COINS

### Single Coin

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Country | dropdown | Required | None |
| Year | number | Required | None |
| Denomination | text | Required | None |
| Mint Mark | text | Recommended | None |
| Metal Composition | text | Recommended | None |
| Condition | dropdown | Required | None |
| Is Graded | dropdown | Required | None |
| Grading Company | dropdown | Required | Is Graded = Yes |
| Grade | dropdown | Required | Is Graded = Yes |
| Certification Number | text | Required | Is Graded = Yes |

### Coin Set

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Set Name | text | Required | None |
| Country | dropdown | Required | None |
| Year Range | text | Required | None |
| Number of Coins | number | Required | None |
| Condition | dropdown | Required | None |
| Complete | dropdown | Required | None |
| Original Packaging | dropdown | Recommended | None |

### Paper Money / Banknotes

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Country | dropdown | Required | None |
| Year | number | Required | None |
| Denomination | text | Required | None |
| Currency Type | dropdown | Required | None |
| Condition | dropdown | Required | None |
| Serial Number | text | Recommended | None |
| Rare Variant | dropdown | Recommended | None |

### Collection Lot

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Approximate Item Count | number | Required | None |
| Countries Included | text | Recommended | None |
| Notable Items | text | Recommended | None |

---

## DISNEY PINS

### Individual Pin

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Pin Name | text | Required | None |
| Pin Number | text | Required | None |
| Release Year | number | Recommended | None |
| Pin Type | dropdown | Recommended | None |
| Backed | dropdown | Recommended | None |
| Hard To Find | dropdown | Recommended | None |

### Pin Set

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Set Name | text | Required | None |
| Number of Pins | number | Required | None |
| Release Year | number | Recommended | None |
| Complete | dropdown | Required | None |
| Original Packaging | dropdown | Recommended | None |

### Collection Lot

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Approximate Item Count | number | Required | None |
| Themes Included | text | Recommended | None |
| Notable Pins | text | Recommended | None |

---

## MOVIES

### Individual Movie

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Movie Title | text | Required | None |
| Format | dropdown | Required | None |
| Release Year | number | Required | None |
| Edition | text | Recommended | None |
| Language | dropdown | Recommended | None |
| Sealed | dropdown | Recommended | None |

### Box Set

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Set Name | text | Required | None |
| Number of Items | number | Required | None |
| Format | dropdown | Required | None |
| Complete | dropdown | Required | None |
| Original Packaging | dropdown | Recommended | None |

### Collection Lot

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Approximate Item Count | number | Required | None |
| Formats Included | text | Recommended | None |
| Notable Items | text | Recommended | None |

---

## POKÉMON

### Single Card

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | Is Graded = No |
| Pokémon Name | text | Required | None |
| Card Number | text | Required | None |
| Set Name | text | Required | None |
| Set Symbol | text | Recommended | None |
| Year | number | Required | None |
| Card Type | dropdown | Recommended | None |
| Is Graded | dropdown | Required | None |
| Grading Company | dropdown | Required | Is Graded = Yes |
| Grade | dropdown | Required | Is Graded = Yes |
| Certification Number | text | Required | Is Graded = Yes |

### Set

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Set Name | text | Required | None |
| Set Number | text | Required | None |
| Release Year | number | Required | None |
| Number of Cards | number | Required | None |
| Complete | dropdown | Required | None |
| Original Packaging | dropdown | Recommended | None |

### Collection/Lot

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Approximate Item Count | number | Required | None |
| Sets Included | text | Recommended | None |
| Notable Cards | text | Recommended | None |

### Unopened Product

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Product Name | text | Required | None |
| Set Name | text | Required | None |
| Product Type | dropdown | Required | None |
| Release Year | number | Required | None |
| Era | dropdown | Required | None |
| Factory Sealed | dropdown | Required | None |
| Authenticated | dropdown | Required | None |
| Authentication Company | dropdown | Required | Authenticated = Yes |
| From A Sealed Case | dropdown | Required | Authenticated = Yes |

---

## SPORTS CARDS

### Single Card

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | Is Graded = No |
| Player Name | text | Required | None |
| Card Number | text | Required | None |
| Set Name | text | Required | None |
| Year | number | Required | None |
| Sport | dropdown | Required | None |
| Card Type | dropdown | Recommended | None |
| Is Graded | dropdown | Required | None |
| Grading Company | dropdown | Required | Is Graded = Yes |
| Grade | dropdown | Required | Is Graded = Yes |
| Certification Number | text | Required | Is Graded = Yes |

### Set

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Set Name | text | Required | None |
| Set Number | text | Required | None |
| Release Year | number | Required | None |
| Number of Cards | number | Required | None |
| Complete | dropdown | Required | None |
| Original Packaging | dropdown | Recommended | None |

### Collection/Lot

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Approximate Item Count | number | Required | None |
| Sports Included | text | Recommended | None |
| Notable Players | text | Recommended | None |

### Unopened Product

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Product Name | text | Required | None |
| Product Type | dropdown | Required | None |
| Release Year | number | Required | None |
| Sealed | dropdown | Required | None |
| Factory Sealed | dropdown | Recommended | None |

---

## STAMPS

### Single Stamp

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Country | dropdown | Required | None |
| Year | number | Required | None |
| Denomination | text | Required | None |
| Condition | dropdown | Required | None |
| Mint/Used | dropdown | Required | None |
| Catalog Number | text | Recommended | None |
| Rarity | dropdown | Recommended | None |

### Stamp Set / Sheet

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Set Name | text | Required | None |
| Country | dropdown | Required | None |
| Year | number | Required | None |
| Number of Stamps | number | Required | None |
| Condition | dropdown | Required | None |
| Complete | dropdown | Required | None |

### Collection Lot

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Approximate Item Count | number | Required | None |
| Countries Included | text | Recommended | None |
| Notable Stamps | text | Recommended | None |

---

## VIDEO GAMES

### Game

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Game Title | text | Required | None |
| Platform | dropdown | Required | None |
| Release Year | number | Recommended | None |
| Region | dropdown | Recommended | None |
| Complete in Box | dropdown | Recommended | None |
| Manual Included | dropdown | Recommended | None |
| Original Case Included | dropdown | Required | None |
| Sealed | dropdown | Required | None |
| Is Graded | dropdown | Required | None |
| Grading Company | dropdown | Required | Is Graded = Yes |
| Grade | dropdown | Required | Is Graded = Yes |
| Certification Number | text | Required | Is Graded = Yes |

### Console

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Console Name | text | Required | None |
| Platform | dropdown | Required | None |
| Color | text | Recommended | None |
| Tested | dropdown | Required | None |
| Working Condition | dropdown | Required | None |
| Accessories Included | text | Recommended | None |
| Original Box Included | dropdown | Recommended | None |

### Accessory

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Accessory Name | text | Required | None |
| Platform | dropdown | Required | None |
| Accessory Type | dropdown | Required | None |
| Tested | dropdown | Required | None |
| Working Condition | dropdown | Required | None |
| Original Packaging | dropdown | Recommended | None |

### Collection Lot

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Platforms Included | text | Recommended | None |
| Approximate Item Count | number | Required | None |
| Notable Games/Consoles | text | Recommended | None |
| Includes Graded Games | dropdown | Optional | None |

---

## VINTAGE TOYS

### Action Figure / Doll

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Toy Name/Character | text | Required | None |
| Brand | text | Recommended | None |
| Franchise | text | Recommended | None |
| Character | text | Recommended | None |
| Year | number | Recommended | None |
| Packaging Type | dropdown | Required | None |
| Complete | dropdown | Recommended | None |
| Accessories Included | text | Recommended | None |
| Is Graded | dropdown | Required | None |
| Grading Company | dropdown | Required | Is Graded = Yes |
| Grade | dropdown | Required | Is Graded = Yes |
| Certification Number | text | Required | Is Graded = Yes |

### Electronic Toy

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Toy Name | text | Required | None |
| Brand | text | Recommended | None |
| Year | number | Recommended | None |
| Tested | dropdown | Required | None |
| Working Condition | dropdown | Required | None |
| Battery Compartment Condition | text | Recommended | None |
| Sound Works | dropdown | Optional | None |
| Lights Work | dropdown | Optional | None |

### Model Kit

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Model Kit Name | text | Required | None |
| Brand | text | Recommended | None |
| Scale | text | Recommended | None |
| Built or Unbuilt | dropdown | Required | None |
| Complete | dropdown | Recommended | None |
| Instructions Included | dropdown | Required | None |

### Plush / Stuffed Toy

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Toy Name/Character | text | Required | None |
| Brand | text | Recommended | None |
| Year | number | Recommended | None |
| Tags Attached | dropdown | Recommended | None |
| Cleanliness/Odor Notes | text | Optional | None |

### Vehicle

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Vehicle Name | text | Required | None |
| Brand | text | Recommended | None |
| Franchise | text | Recommended | None |
| Year | number | Recommended | None |
| Packaging Type | dropdown | Required | None |
| Vehicle Type | dropdown | Recommended | None |
| Working Features | text | Recommended | None |

### Playset

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Playset Name | text | Required | None |
| Brand | text | Recommended | None |
| Franchise | text | Recommended | None |
| Year | number | Recommended | None |
| Complete | dropdown | Required | None |
| Missing Pieces | text | Required | None |
| Instructions Included | dropdown | Required | None |
| Original Box Included | dropdown | Recommended | None |

### Board Game / Puzzle

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Game/Puzzle Name | text | Required | None |
| Publisher/Brand | text | Required | None |
| Year | number | Recommended | None |
| Number of Pieces | number | Recommended | None |
| Complete | dropdown | Required | None |
| Missing Pieces | text | Required | None |
| Instructions Included | dropdown | Required | None |
| Box Included | dropdown | Recommended | None |

### Collection Lot

| Field Name | Type | Requirement | Conditional Logic |
|---|---|---|---|
| Listing Title | text | Required | None |
| Trade Value | number | Required | None |
| Condition | dropdown | Required | None |
| Approximate Item Count | number | Required | None |
| Brands Included | text | Recommended | None |
| Franchises Included | text | Recommended | None |
| Notable Items | text | Recommended | None |

---

## COMMON FIELDS (All Categories)

These fields appear in every category's form:

| Field Name | Type | Requirement | Location |
|---|---|---|---|
| Photos | image-upload | Required | Dedicated Photos Section |
| Description | textarea | Required | Dedicated Description Section |
| Shipping Available | dropdown | Required | Dedicated Shipping Section |
| Quantity | number | Recommended | Optional Fields (if available) |

---

## Notes

- **Conditional fields** only appear when their condition is met
- **Required fields** must be completed before submission
- **Recommended fields** improve listing visibility and buyer confidence
- **Optional fields** are nice to have but not necessary
- All categories include Photos, Description, and Shipping sections
- Grading fields (Grading Company, Grade, Certification Number) appear conditionally based on "Is Graded" selection
