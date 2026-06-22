# Collectibles Trading Platform - Field Specifications (Current)

Collectibles Trading Platform - Complete Category, Item Type, and Field Specification

> **Purpose:** This is the current implementation list for the Add Item flow with all recent updates. Category is the first dropdown. Item Type is the second dropdown. The selected Item Type determines the fields shown. Dropdown Fields lists exact dropdown options. If Supports Other = Yes, show the corresponding Other Field Name when the user selects Other.
>
> **Note:** Photos, Description, and Shipping Available have their own dedicated sections and are NOT listed in the category-specific fields below.

#### Category and Second Dropdown Summary

**Category (First Dropdown) | Item Types (Second Dropdown)**
Sports Cards | Single Card, Unopened Product, Set, Collection/Lot
Comics | Single Comic, Original Art, Collection/Lot
Video Games | Game, Console, Accessory, Collection/Lot
Vintage Toys | Action Figure / Doll, Vehicle, Playset, Board Game / Puzzle, Plush / Stuffed Toy, Electronic Toy, Model / Kit, Die-Cast Car, Collection/Lot
Stamps | Single Stamp, Stamp Set / Sheet, Collection/Lot
Coins | Single Coin, Coin Set, Paper Money / Banknotes, Collection/Lot
Movies | Individual Movie, Box Set, Collection/Lot
Autographs | Signed Item, Collection/Lot
Disney Pins | Individual Pin, Pin Set, Collection/Lot
Pokemon | Single Card, Unopened Product, Set, Collection/Lot

---

## Sports Cards

**SECOND DROPDOWN OPTIONS: Single Card, Unopened Product, Set, Collection/Lot**

### Single Card

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Conditional|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Is Graded = No||
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Sport|Dropdown|Required|Baseball, Basketball, Football, Hockey, Soccer, Racing, Wrestling, Golf, MMA, Tennis, Multi-Sport, Other|Yes|Custom Sport|Always||
|Player|Text Input|Required||No||Always||
|Year|Number Input|Required||No||Always||
|Manufacturer|Dropdown|Required|Topps, Bowman, Panini, Upper Deck, Fleer, Donruss, Score, Leaf, Other|Yes|Custom Manufacturer|Always||
|Set Name|Text Input|Recommended||No||Always||
|Card Number|Text Input|Recommended||No||Always||
|Parallel / Variation|Text Input|Optional||No||Always||
|Rookie Card|Dropdown|Recommended|Yes, No|No||Always||
|Autograph|Dropdown|Recommended|Yes, No|No||Always||
|Relic / Memorabilia|Dropdown|Recommended|Yes, No|No||Always||
|Serial Numbered|Dropdown|Recommended|Yes, No|No||Always||
|Serial Number|Text Input|Conditional||No||Serial Numbered = Yes||
|Is Graded|Dropdown|Required|Yes, No|No||Always|If Yes, reveal grading fields, and remove condition dropdown is not active (cant input). If No, user needs to select from Condition dropdown box|
|Grading Company|Dropdown|Conditional|PSA, BGS, SGC, CGC Cards, TAG Grading, HGA, Arena Club, Degree, ACE, ISA, GMA, Rare Edition, FCG, MNT, KSA, PGA, RCG, OnlyGraded, Diamond, CGA, TRCG, Pokegrade, Tree Frog, AP, PRO, GEM, GAI, PCI, WCG|No||Is Graded = Yes||
|Grade|Text Input|Conditional||No||Is Graded = Yes||
|Certification Number|Text Input|Conditional||No||Is Graded = Yes||

### Unopened Product

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Sport|Dropdown|Required|Baseball, Basketball, Football, Hockey, Soccer, Racing, Wrestling, Golf, MMA, Tennis, Multi-Sport, Other|Yes|Custom Sport|Always||
|Year|Number Input|Required||No||Always||
|Manufacturer|Dropdown|Required|Topps, Bowman, Panini, Upper Deck, Fleer, Donruss, Score, Leaf, Other|Yes|Custom Manufacturer|Always||
|Product Name|Text Input|Required||No||Always||
|Product Format|Dropdown|Required|Pack, Rack Pack, Box, Case|No||Always||
|Product Type|Dropdown|Recommended|Hobby, Jumbo, Retail, Blaster, Mega, Hanger, Cello, Rack, Other|Yes|Custom Product Type|Always||
|Factory Sealed|Dropdown|Required|Yes, No|No||Always||
|Authenticated|Dropdown|Required|Yes, No|No||Always||
|Authentication Company|Dropdown|Conditional|BBCE, PSA, iCert, RVP, Other|Yes|Custom Authentication Company|Is Authenticated = Yes||
|From A Sealed Case|Dropdown|Conditional|Yes, No|No||Is Authenticated = Yes||

### Set

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Sport|Dropdown|Required|Baseball, Basketball, Football, Hockey, Soccer, Racing, Wrestling, Golf, MMA, Tennis, Multi-Sport, Other|Yes|Custom Sport|Always||
|Year|Number Input|Required||No||Always||
|Manufacturer|Dropdown|Required|Topps, Bowman, Panini, Upper Deck, Fleer, Donruss, Score, Leaf, Other|Yes|Custom Manufacturer|Always||
|Set Name|Text Input|Required||No||Always||
|Set Type|Dropdown|Required|Factory Set, Complete Hand-Collated Set, Partial Set|No||Always||
|Missing Cards|Dropdown|Conditional|Yes, No|No||Set Type = Partial Set||
|Missing Card Details|Text Area|Conditional||No||Missing Cards = Yes||

### Collection/Lot

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Sport|Dropdown|Recommended|Baseball, Basketball, Football, Hockey, Soccer, Racing, Wrestling, Golf, MMA, Tennis, Multi-Sport, Mixed, Other|Yes|Custom Sport|Always||
|Approximate Card Count|Number Input|Required||No||Always||
|Years Included|Text Input|Recommended||No||Always||
|Manufacturers Included|Text Area|Recommended||No||Always||
|Notable Players|Text Area|Recommended||No||Always||
|Notable Cards|Text Area|Recommended||No||Always||
|Includes Graded Cards|Dropdown|Optional|Yes, No|No||Always||

---

## Autographs

**SECOND DROPDOWN OPTIONS: Signed Item, Collection/Lot**

### Signed Item

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Signer|Text Input|Required||No||Always||
|Signed Item Type|Dropdown|Required|Jersey, Helmet, Gloves, Shoes, Equipment, Photo, Memorabilia, Other|Yes|Custom Signed Item Type|Always||
|Authentication Included|Dropdown|Required|Yes, No, Mixed|No||Always|CHANGED TO REQUIRED|
|Authentication Company|Dropdown|Conditional|PSA, JSA, Beckett, Other|Yes|Custom Authentication Company|Authentication Included = Yes|MOVED TO REQUIRED SECTION|
|Authentication Type|Dropdown|Conditional|Full Signature, Partial Signature, Inscription, Other|Yes|Custom Authentication Type|Authentication Included = Yes|MOVED TO REQUIRED SECTION|
|Certificate Number|Text Input|Conditional||No||Authentication Included = Yes|MOVED TO REQUIRED SECTION|
|Autograph Category|Dropdown|Recommended|Sports, Entertainment, Politics, Historical, Other|Yes|Custom Autograph Category|Always||
|Inscription Present|Dropdown|Recommended|Yes, No|No||Always||
|Inscription Text|Text Input|Conditional||No||Inscription Present = Yes||

### Collection/Lot

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Number of Items|Number Input|Required||No||Always||
|Signers Included|Text Area|Recommended||No||Always||
|Item Types Included|Text Area|Recommended||No||Always||
|Years Included|Text Input|Recommended||No||Always||
|Authentication Included|Dropdown|Recommended|Yes, No, Mixed|No||Always||

---

## Disney Pins

**SECOND DROPDOWN OPTIONS: Individual Pin, Pin Set, Collection/Lot**

### Individual Pin

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Park / Event|Text Input|Recommended||No||Always||
|Series|Text Input|Recommended||No||Always||
|Edition|Text Input|Recommended||No||Always||
|Year|Text Input|Recommended||No||Always||
|Pin Name|Text Input|Required||No||Always||

### Pin Set

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Set Name|Text Input|Required||No||Always||
|Number of Pins|Number Input|Required||No||Always||
|Park / Event|Text Input|Recommended||No||Always||
|Series|Text Input|Recommended||No||Always||
|Year|Text Input|Recommended||No||Always||

### Collection/Lot

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Number of Pins|Number Input|Required||No||Always||
|Parks / Events Included|Text Area|Recommended||No||Always||
|Years Included|Text Input|Recommended||No||Always||

---

## Pokemon

**SECOND DROPDOWN OPTIONS: Single Card, Unopened Product, Set, Collection/Lot**

### Single Card

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Conditional|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Is Graded = No||
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Sport|Dropdown|Required|Baseball, Basketball, Football, Hockey, Soccer, Racing, Wrestling, Golf, MMA, Tennis, Multi-Sport, Other|Yes|Custom Sport|Always||
|Player|Text Input|Required||No||Always||
|Year|Number Input|Required||No||Always|CHANGED TO REQUIRED|
|Manufacturer|Dropdown|Required|Topps, Bowman, Panini, Upper Deck, Fleer, Donruss, Score, Leaf, Other|Yes|Custom Manufacturer|Always||
|Set Name|Text Input|Recommended||No||Always||
|Card Number|Text Input|Recommended||No||Always||
|Parallel / Variation|Text Input|Optional||No||Always||
|Rookie Card|Dropdown|Recommended|Yes, No|No||Always||
|Autograph|Dropdown|Recommended|Yes, No|No||Always||
|Relic / Memorabilia|Dropdown|Recommended|Yes, No|No||Always||
|Serial Numbered|Dropdown|Recommended|Yes, No|No||Always||
|Serial Number|Text Input|Conditional||No||Serial Numbered = Yes||
|Is Graded|Dropdown|Required|Yes, No|No||Always|If Yes, reveal grading fields, and remove condition dropdown is not active (cant input). If No, user needs to select from Condition dropdown box|
|Grading Company|Dropdown|Conditional|PSA, BGS, SGC, CGC Cards, TAG Grading, HGA, Arena Club, Degree, ACE, ISA, GMA, Rare Edition, FCG, MNT, KSA, PGA, RCG, OnlyGraded, Diamond, CGA, TRCG, Pokegrade, Tree Frog, AP, PRO, GEM, GAI, PCI, WCG|No||Is Graded = Yes||
|Grade|Text Input|Conditional||No||Is Graded = Yes||
|Certification Number|Text Input|Conditional||No||Is Graded = Yes||
|Authenticated|Dropdown|Required|Yes, No|No||Always||
|Authentication Company|Dropdown|Conditional|PSA, BGS, SGC, CGC Cards, Other|Yes|Custom Authentication Company|Is Authenticated = Yes||
|From A Sealed Case|Dropdown|Conditional|Yes, No|No||Is Authenticated = Yes||

### Unopened Product

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Year|Number Input|Required||No||Always||
|Manufacturer|Dropdown|Required|Topps, Bowman, Panini, Upper Deck, Fleer, Donruss, Score, Leaf, Other|Yes|Custom Manufacturer|Always||
|Product Name|Text Input|Required||No||Always||
|Product Format|Dropdown|Required|Pack, Rack Pack, Box, Case|No||Always||
|Product Type|Dropdown|Recommended|Hobby, Jumbo, Retail, Blaster, Mega, Hanger, Cello, Rack, Other|Yes|Custom Product Type|Always||
|Factory Sealed|Dropdown|Required|Yes, No|No||Always||
|Authenticated|Dropdown|Required|Yes, No|No||Always||
|Authentication Company|Dropdown|Conditional|PSA, BGS, SGC, CGC Cards, Other|Yes|Custom Authentication Company|Is Authenticated = Yes||
|From A Sealed Case|Dropdown|Conditional|Yes, No|No||Is Authenticated = Yes||

### Set

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Quantity|Number Input|Recommended||No||Always|Default to 1.|
|Year|Number Input|Required||No||Always||
|Manufacturer|Dropdown|Required|Topps, Bowman, Panini, Upper Deck, Fleer, Donruss, Score, Leaf, Other|Yes|Custom Manufacturer|Always||
|Set Name|Text Input|Required||No||Always||
|Set Type|Dropdown|Required|Factory Set, Complete Hand-Collated Set, Partial Set|No||Always||
|Missing Cards|Dropdown|Conditional|Yes, No|No||Set Type = Partial Set||
|Missing Card Details|Text Area|Conditional||No||Missing Cards = Yes||

### Collection/Lot

|**Field Name**|**Input Type**|**Requirement**|**Dropdown Fields**|**Supports Other?**|**Other Field Name**|**Conditional Logic**|**Notes**|
|-|-|-|-|-|-|-|-|
|Listing Title|Text Input|Required||No||Always|User-editable title; may be auto-suggested from item details.|
|Trade Value|Currency Input|Required||No||Always|Estimated value for trade matching.|
|Condition|Dropdown|Required|Mint, Near Mint, Excellent, Very Good, Good, Fair, Poor|No||Always||
|Approximate Card Count|Number Input|Required||No||Always||
|Years Included|Text Input|Recommended||No||Always||
|Manufacturers Included|Text Area|Recommended||No||Always||
|Notable Players|Text Area|Recommended||No||Always||
|Notable Cards|Text Area|Recommended||No||Always||
|Includes Graded Cards|Dropdown|Optional|Yes, No|No||Always||

---

## Summary of Changes Made

### Field Requirement Updates
- **Pokemon / Single Card**: Year field changed from Recommended → **Required**
- **Autographs / Signed Item**: Authentication Included changed from Recommended → **Required**
- **All Categories**: Shipping Available moved to dedicated **Shipping section** (not in category-specific fields)
- **All Categories**: Description moved to dedicated **Description section** (not in category-specific fields)
- **All Categories**: Photos moved to dedicated **Photos section** (not in category-specific fields)

### Conditional Field Placement
- **Autographs / Signed Item**: Authentication conditional fields (Company, Type, Certificate Number) now appear in **Required section** when parent is required

### Custom "Other" Field Behavior
- All fields with `Supports Other = Yes` now have custom input bubbles positioned in 4th grid column
- Custom inputs inherit parent field's requirement level
- Progress bar includes custom "Other" fields when parent is required

### Form Layout
- Grid changed to 4 columns (was 3)
- Form width: `max-w-3xl` for balanced spacing
- Field labels: Single line (no wrapping)
- Custom inputs positioned to right of parent field

**Last Updated**: June 20, 2026
**Version**: 2.1 (Current Implementation - Cleaned)
