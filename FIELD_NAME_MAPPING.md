# Field Name Mapping: Master List (Title Case) ↔ Codebase (camelCase)

This document maps field names from the Master Field List (using Title Case) to their corresponding camelCase names used in the codebase. Use this as a reference when working with the system.

**Note:** All 463 fields match perfectly between the Master List and the codebase. The only difference is the naming convention:
- **Master Field List:** Uses Title Case (e.g., "Listing Title", "Trade Value", "Is Graded")
- **Codebase:** Uses camelCase (e.g., "listingTitle", "tradeValue", "isGraded") - JavaScript/TypeScript standard

---

## Naming Convention Rules

To convert from Master Field List to codebase field names:

1. **Remove spaces and special characters** → join words together
2. **First word lowercase, subsequent words capitalized** → camelCase
3. **Special cases:**
   - "Is Graded" → `isGraded`
   - "Grading Company" → `gradingCompany`
   - "Certification Number" → `certificationNumber`
   - "Original Box Included" → `originalBoxIncluded`
   - "Toy Name / Character" → `toyNameCharacter` (slash removed, both parts included)
   - "Relic / Memorabilia" → `relicMemorabilia`
   - "Parallel / Variation" → `parallelVariation`

---

## Common Fields (Used Across All Categories)

These fields appear in most item types:

| Master Field Name | Codebase Field Name | Input Type | Requirement |
|---|---|---|---|
| Listing Title | `listingTitle` | text | Required |
| Trade Value | `tradeValue` | currency | Required |
| Condition | `condition` | dropdown | Required/Conditional |
| Quantity | `quantity` | number | Recommended |
| Photos | `photos` | image-upload | Required |

---

## Grading-Related Fields

Used when "Is Graded = Yes":

| Master Field Name | Codebase Field Name | Input Type | Requirement |
|---|---|---|---|
| Is Graded | `isGraded` | dropdown | Required |
| Grading Company | `gradingCompany` | dropdown | Conditional |
| Grade | `grade` | dropdown | Conditional |
| Certification Number | `certificationNumber` | text | Conditional |

---

## Category-Specific Field Mappings

### Sports Cards

**Single Card:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Sport → `sport`
- Player Name → `player`
- Year → `year`
- Manufacturer → `manufacturer`
- Set Name → `setName`
- Card Number → `cardNumber`
- Parallel / Variation → `parallelVariation`
- Rookie Card → `rookieCard`
- Autograph → `autograph`
- Relic / Memorabilia → `relicMemorabilia`
- Serial Numbered → `serialNumbered`
- Serial Number → `serialNumber`
- Is Graded → `isGraded`
- Grading Company → `gradingCompany`
- Grade → `grade`
- Certification Number → `certificationNumber`

**Unopened Product:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Sport → `sport`
- Year → `year`
- Manufacturer → `manufacturer`
- Product Name → `productName`
- Product Format → `productFormat`
- Product Type → `productType`
- Factory Sealed → `factorySealed`
- Authenticated → `authenticated`
- Authentication Company → `authenticationCompany`
- From A Sealed Case → `fromASealedCase`

**Set:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Sport → `sport`
- Year → `year`
- Manufacturer → `manufacturer`
- Set Name → `setName`
- Set Type → `setType`
- Missing Cards → `missingCards`
- Missing Card Details → `missingCardDetails`
- Number of Cards in Set → `numberOfCardsInSet`

**Collection/Lot:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Sport → `sport`
- Approximate Card Count → `approximateCardCount`
- Years Included → `yearsIncluded`
- Manufacturers Included → `manufacturersIncluded`
- Notable Players → `notablePlayers`
- Notable Cards → `notableCards`
- Includes Graded Cards → `includesGradedCards`

---

### Comics

**Single Comic:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Comic Title → `comicTitle`
- Issue Number → `issueNumber`
- Publisher → `publisher`
- Volume → `volume`
- Publication Year → `publicationYear`
- Variant Cover → `variantCover`
- Variant Description → `variantDescription`
- Key Issue → `keyIssue`
- First Appearance → `firstAppearance`
- Character Name → `characterName`
- Signed → `signed`
- Is Graded → `isGraded`
- Grading Company → `gradingCompany`
- Grade → `grade`
- Certification Number → `certificationNumber`

**Original Art:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Artist Name → `artistName`
- Artwork Title → `artworkTitle`
- Publisher → `publisher`
- Comic Series → `comicSeries`
- Issue Number → `issueNumber`
- Page Number → `pageNumber`
- Art Type → `artType`
- Medium → `medium`
- Year Created → `yearCreated`
- Signed By Artist → `signedByArtist`
- COA Included → `coaIncluded`
- Dimensions → `dimensions`
- Framed → `framed`
- Original Published Page → `originalPublishedPage`

**Collection/Lot:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Includes Graded Comics → `includesGradedComics`
- Number of Comics → `numberOfComics`
- Major Titles Included → `majorTitlesIncluded`
- Publishers Included → `publishersIncluded`
- Years Included → `yearsIncluded`

---

### Video Games

**Game:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Game Title → `gameTitle`
- Platform → `platform`
- Release Year → `releaseYear`
- Region → `region`
- Complete In Box → `completeInBox`
- Original Case Included → `originalCaseIncluded`
- Manual Included → `manualIncluded`
- Sealed → `sealed`
- Is Graded → `isGraded`
- Grading Company → `gradingCompany`
- Grade → `grade`
- Certification Number → `certificationNumber`

**Console:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Console Name → `consoleName`
- Model Number → `modelNumber`
- Region → `region`
- Original Box Included → `originalBoxIncluded`
- Cables Included → `cablesIncluded`
- Controllers Included → `controllersIncluded`
- Working Condition → `workingCondition`
- Is Graded → `isGraded`
- Grading Company → `gradingCompany`
- Grade → `grade`
- Certification Number → `certificationNumber`

**Accessory:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Accessory Type → `accessoryType`
- Manufacturer → `manufacturer`
- Platform → `platform`
- Region → `region`
- Working Condition → `workingCondition`
- Is Graded → `isGraded`
- Grading Company → `gradingCompany`
- Grade → `grade`
- Certification Number → `certificationNumber`

**Collection/Lot:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Approximate Item Count → `approximateItemCount`
- Includes Graded Games → `includesGradedGames`
- Platforms Included → `platformsIncluded`
- Notable Games / Consoles → `notableGamesConsoles`

---

### Vintage Toys

**Action Figure / Doll:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Toy Name / Character → `toyName`
- Brand → `brand`
- Franchise → `franchise`
- Year → `year`
- Accessories Included → `accessoriesIncluded`
- Complete → `complete`
- Packaging Type → `packagingType`
- Is Graded → `isGraded`
- Grading Company → `gradingCompany`
- Grade → `grade`
- Certification Number → `certificationNumber`

**Vehicle:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Vehicle Name → `vehicleName`
- Vehicle Type → `vehicleType`
- Brand → `brand`
- Franchise → `franchise`
- Year → `year`
- Packaging Type → `packagingType`
- Working Features → `workingFeatures`

**Playset:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Playset Name → `playsetName`
- Brand → `brand`
- Franchise → `franchise`
- Year → `year`
- Complete → `complete`
- Missing Pieces → `missingPieces`
- Original Box Included → `originalBoxIncluded`
- Instructions Included → `instructionsIncluded`

**Board Game / Puzzle:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Game / Puzzle Name → `gamePuzzleName`
- Publisher / Brand → `publisherBrand`
- Year → `year`
- Complete → `complete`
- Missing Pieces → `missingPieces`
- Number of Pieces → `numberOfPieces`
- Box Included → `boxIncluded`
- Instructions Included → `instructionsIncluded`

**Plush / Stuffed Toy:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Toy Name / Character → `toyNameCharacter`
- Brand → `brand`
- Year → `year`
- Tags Attached → `tagsAttached`
- Cleanliness / Odor Notes → `cleanlinessOdorNotes`

**Electronic Toy:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Toy Name → `toyName`
- Brand → `brand`
- Franchise → `franchise`
- Year → `year`
- Working Condition → `workingCondition`
- Original Box Included → `originalBoxIncluded`
- Instructions Included → `instructionsIncluded`

**Model / Kit:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Model Name → `modelName`
- Brand → `brand`
- Scale → `scale`
- Year → `year`
- Complete → `complete`
- Missing Pieces → `missingPieces`
- Original Box Included → `originalBoxIncluded`
- Instructions Included → `instructionsIncluded`

**Collection/Lot:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Approximate Item Count → `approximateItemCount`
- Notable Items → `notableItems`
- Franchises Included → `franchisesIncluded`
- Years Included → `yearsIncluded`

---

### Stamps

**Single Stamp:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Country → `country`
- Issue Year → `issueYear`
- Denomination → `denomination`
- Stamp Type → `stampType`
- Is Graded → `isGraded`
- Grading Company → `gradingCompany`
- Grade → `grade`
- Certification Number → `certificationNumber`

**Stamp Set / Sheet:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Country → `country`
- Issue Year → `issueYear`
- Set Name → `setName`
- Number of Stamps → `numberOfStamps`
- Complete → `complete`

**Collection/Lot:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Approximate Stamp Count → `approximateStampCount`
- Countries Included → `countriesIncluded`
- Years Included → `yearsIncluded`

---

### Coins

**Single Coin:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Country → `country`
- Year Minted → `yearMinted`
- Denomination → `denomination`
- Coin Type → `coinType`
- Is Graded → `isGraded`
- Grading Company → `gradingCompany`
- Grade → `grade`
- Certification Number → `certificationNumber`

**Coin Set:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Country → `country`
- Year Minted → `yearMinted`
- Set Name → `setName`
- Number of Coins → `numberOfCoins`
- Complete → `complete`

**Collection/Lot:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Approximate Coin Count → `approximateCoinCount`
- Countries Included → `countriesIncluded`
- Years Included → `yearsIncluded`

---

### Movies

**Individual Movie:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Movie Title → `movieTitle`
- Release Year → `releaseYear`
- Format → `format`
- Region → `region`
- Complete In Box → `completeInBox`
- Original Case Included → `originalCaseIncluded`

**Box Set:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Set Name → `setName`
- Release Year → `releaseYear`
- Format → `format`
- Number of Items → `numberOfItems`
- Complete → `complete`

**Collection/Lot:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Approximate Item Count → `approximateItemCount`
- Genres Included → `genresIncluded`
- Years Included → `yearsIncluded`

---

### Autographs

**Signed Item:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Item Type → `itemType`
- Signed By → `signedBy`
- Signature Authentication → `signatureAuthentication`
- Authentication Company → `authenticationCompany`
- Inscription → `inscription`
- Year Signed → `yearSigned`
- COA Included → `coaIncluded`

**Collection/Lot:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Approximate Item Count → `approximateItemCount`
- Notable Signers → `notableSigners`
- Authentication Status → `authenticationStatus`

---

### Disney Pins

**Individual Pin:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Pin Name → `pinName`
- Pin Number → `pinNumber`
- Release Year → `releaseYear`
- Series → `series`
- Franchise → `franchise`
- Rarity → `rarity`
- Original Backing Included → `originalBackingIncluded`

**Pin Set:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Set Name → `setName`
- Release Year → `releaseYear`
- Number of Pins → `numberOfPins`
- Complete → `complete`

**Collection/Lot:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Approximate Pin Count → `approximatePinCount`
- Franchises Included → `franchisesIncluded`
- Years Included → `yearsIncluded`

---

### Pokemon

**Single Card:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Card Name → `cardName`
- Set Name → `setName`
- Card Number → `cardNumber`
- Rarity → `rarity`
- Is Graded → `isGraded`
- Grading Company → `gradingCompany`
- Grade → `grade`
- Certification Number → `certificationNumber`

**Unopened Product:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Product Name → `productName`
- Product Type → `productType`
- Release Year → `releaseYear`
- Factory Sealed → `factorySealed`

**Set:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Quantity → `quantity`
- Set Name → `setName`
- Release Year → `releaseYear`
- Number of Cards → `numberOfCards`
- Complete → `complete`

**Collection/Lot:**
- Listing Title → `listingTitle`
- Trade Value → `tradeValue`
- Condition → `condition`
- Approximate Card Count → `approximateCardCount`
- Sets Included → `setsIncluded`
- Years Included → `yearsIncluded`

---

## How to Use This Document

1. **When reading the Master Field List:** Use this document to find the corresponding camelCase field name in the codebase
2. **When working with the codebase:** Use this document to understand what each camelCase field represents in the Master List
3. **When debugging form issues:** Cross-reference field names here to ensure consistency
4. **When adding new fields:** Follow the naming convention: Master List uses Title Case, codebase uses camelCase
5. **When querying the database:** Use the camelCase field names (they're stored as-is in the database)

---

## Quick Reference: Conversion Rules

| Master Format | Codebase Format | Example |
|---|---|---|
| Listing Title | listingTitle | "Listing Title" → `listingTitle` |
| Trade Value | tradeValue | "Trade Value" → `tradeValue` |
| Is Graded | isGraded | "Is Graded" → `isGraded` |
| Original Box Included | originalBoxIncluded | "Original Box Included" → `originalBoxIncluded` |
| Toy Name / Character | toyNameCharacter | "Toy Name / Character" → `toyNameCharacter` |
| Relic / Memorabilia | relicMemorabilia | "Relic / Memorabilia" → `relicMemorabilia` |

---

**Last Updated:** June 26, 2026  
**Status:** All 463 fields mapped and verified
