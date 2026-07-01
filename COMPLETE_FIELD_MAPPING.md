# Complete Field Mapping Reference

## Listings Table - Core Fields

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| `id` | N/A | N/A | int | Auto-increment, primary key |
| `ownerId` | N/A | N/A | int | Foreign key to users table |
| `title` | `listingTitle` | Listing Title | varchar(160) | Required field |
| `category` | N/A | Category | enum | Set during item type selection |
| `itemType` | N/A | Item Type | varchar(50) | Set during item type selection |
| `condition` | `condition` | Condition | enum | mint, near_mint, excellent, very_good, good, fair, poor |
| `grade` | `grade` | Grade | decimal(5,2) | Numeric grade value (e.g., 9.5) |
| `certificationCompany` | `gradingCompany` | Grading Company | varchar(50) | **IMPORTANT:** Form uses `gradingCompany`, DB uses `certificationCompany` |
| `certificationNumber` | `certificationNumber` | Certification Number | varchar(100) | Grading company certification/reference number |
| `estimatedValue` | `tradeValue` | Trade Value | decimal(12,2) | Currency value in dollars |
| `description` | N/A | Description | text | Item description |
| `photos` | `photos` | Photos | N/A | Handled separately via listingPhotos table |
| `itemDetails` | Category-specific fields | Varies | JSON text | Stores all category-specific fields as JSON |
| `status` | N/A | Status | enum | active, traded, archived |
| `isActive` | N/A | Is Active | tinyint | 1 = active, 0 = inactive |
| `featured` | N/A | Featured | tinyint | 1 = featured, 0 = not featured |
| `signatures` | `signatures` | Signatures | JSON text | Array of signature names (for autographs) |
| `viewCount` | N/A | View Count | int | Auto-incremented on page views |
| `createdAt` | N/A | Created At | timestamp | ISO string format |
| `updatedAt` | N/A | Updated At | timestamp | ISO string format |

---

## Category-Specific Fields (Stored in itemDetails JSON)

### AUTOGRAPHS

#### Autographs - Signed Item

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Item title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Item condition |
| N/A | `photos` | Photos | array | Item photos |
| N/A | `quantity` | Quantity | number | Number of items |
| N/A | `signer` | Signer | string | Name of person who signed |
| N/A | `signedItemType` | Signed Item Type | string | Type of item signed (jersey, photo, etc.) |
| N/A | `autographCategory` | Autograph Category | string | Category (sports, entertainment, politics, etc.) |
| N/A | `authenticationIncluded` | Authentication Included | string | Yes/No |
| N/A | `authenticationCompany` | Authentication Company | string | COA provider (PSA/DNA, JSA, etc.) |
| N/A | `authenticationType` | Authentication Type | string | Type of authentication |
| N/A | `certificateNumber` | Certificate Number | string | COA number |
| N/A | `inscriptionPresent` | Inscription Present | string | Yes/No |
| N/A | `inscriptionText` | Inscription Text | string | What is inscribed |

#### Autographs - Collection Lot

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Collection title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Overall condition |
| N/A | `photos` | Photos | array | Collection photos |
| N/A | `numberOfSignedItems` | Number of Signed Items | number | Count of signed items |
| N/A | `signersIncluded` | Signers Included | string | Notable signers |
| N/A | `authenticationIncluded` | Authentication Included | string | Yes/No |
| N/A | `notableItems` | Notable Items | string | Description of notable items |
| N/A | `itemTypesIncluded` | Item Types Included | string | Types of items in collection |

---

### COINS

#### Coins - Single Coin

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Coin description |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `country` | Country | string | Country of origin |
| N/A | `condition` | Condition | enum | Coin condition |
| N/A | `photos` | Photos | array | Coin photos |
| N/A | `quantity` | Quantity | number | Number of coins |
| N/A | `denomination` | Denomination | string | Face value (e.g., $1, 25¢) |
| N/A | `year` | Year | string | Year minted |
| N/A | `mintMark` | Mint Mark | string | Mint mark (e.g., P, D, S) |
| N/A | `variety` | Variety | string | Coin variety/type |
| N/A | `composition` | Composition | string | Metal composition |
| N/A | `weight` | Weight | string | Weight in grams |
| N/A | `diameter` | Diameter | string | Diameter in mm |
| N/A | `isGraded` | Is Graded | string | Yes/No |
| N/A | `gradingCompany` | Grading Company | string | PCGS, NGC, ANACS, ICG, SEGS, SGS, Other |
| N/A | `grade` | Grade | string | Grade value |
| N/A | `certificationNumber` | Certification Number | string | Grading cert number |

#### Coins - Coin Set

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Set title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `country` | Country | string | Country of origin |
| N/A | `condition` | Condition | enum | Overall condition |
| N/A | `photos` | Photos | array | Set photos |
| N/A | `quantity` | Quantity | number | Number of sets |
| N/A | `setName` | Set Name | string | Official set name |
| N/A | `year` | Year | string | Year issued |
| N/A | `setType` | Set Type | string | Type of set |
| N/A | `originalPackagingIncluded` | Original Packaging Included | string | Yes/No |
| N/A | `numberOfCoins` | Number of Coins in Set | number | Coin count |

#### Coins - Paper Money / Banknotes

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Bill description |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `country` | Country | string | Country of origin |
| N/A | `condition` | Condition | enum | Bill condition |
| N/A | `photos` | Photos | array | Bill photos |
| N/A | `approximateCoinCount` | Approximate Coin Count | number | Number of bills |
| N/A | `countriesIncluded` | Countries Included | string | Countries represented |
| N/A | `yearsIncluded` | Years Included | string | Year range |
| N/A | `notableCoins` | Notable Coins | string | Notable items |
| N/A | `includesGradedCoins` | Includes Graded Coins | string | Yes/No |

#### Coins - Collection Lot

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Collection title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `country` | Country | string | Primary country |
| N/A | `condition` | Condition | enum | Overall condition |
| N/A | `photos` | Photos | array | Collection photos |
| N/A | `approximateCoinCount` | Approximate Coin Count | number | Total coins |
| N/A | `countriesIncluded` | Countries Included | string | Countries in collection |
| N/A | `yearsIncluded` | Years Included | string | Year range |
| N/A | `notableCoins` | Notable Coins | string | Notable items |
| N/A | `includesGradedCoins` | Includes Graded Coins | string | Yes/No |

---

### COMICS

#### Comics - Single Comic

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Comic title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Comic condition |
| N/A | `photos` | Photos | array | Comic photos |
| N/A | `quantity` | Quantity | number | Number of copies |
| N/A | `comicTitle` | Comic Title | string | Official comic title |
| N/A | `issueNumber` | Issue Number | string | Issue #, volume |
| N/A | `publisher` | Publisher | string | Publisher name |
| N/A | `volume` | Volume | string | Volume number |
| N/A | `publicationYear` | Publication Year | string | Year published |
| N/A | `variantCover` | Variant Cover | string | Variant description |
| N/A | `keyIssue` | Key Issue | string | Yes/No - first appearance, etc. |
| N/A | `firstAppearance` | First Appearance | string | Character/item first appearance |
| N/A | `signed` | Signed | string | Yes/No |
| N/A | `signatures` | Signatures | array | Array of signer names |
| N/A | `isGraded` | Is Graded | string | Yes/No |
| N/A | `gradingCompany` | Grading Company | string | CBCS, CGC Comics, PGX Comics, Other |
| N/A | `grade` | Grade | string | Grade value |
| N/A | `certificationNumber` | Certification Number | string | Grading cert number |

#### Comics - Original Art

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Art title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Art condition |
| N/A | `photos` | Photos | array | Art photos |
| N/A | `quantity` | Quantity | number | Number of pieces |
| N/A | `artistName` | Artist Name | string | Artist name |
| N/A | `artworkTitle` | Artwork Title | string | Artwork title |
| N/A | `publisher` | Publisher | string | Publisher |
| N/A | `artType` | Art Type | string | Type of art (cover, page, sketch, etc.) |
| N/A | `medium` | Medium | string | Medium used (ink, pencil, etc.) |
| N/A | `yearCreated` | Year Created | string | Year created |
| N/A | `signedByArtist` | Signed By Artist | string | Yes/No |
| N/A | `coaIncluded` | COA Included | string | Yes/No |
| N/A | `dimensions` | Dimensions | string | Size (e.g., 11x14) |
| N/A | `framed` | Framed | string | Yes/No |
| N/A | `originalPublishedPage` | Original Published Page | string | Page number if published |
| N/A | `comicSeries` | Comic Series | string | Comic series name |
| N/A | `issueNumber` | Issue Number | string | Issue number |
| N/A | `pageNumber` | Page Number | string | Page number |

#### Comics - Collection Lot

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Collection title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Overall condition |
| N/A | `photos` | Photos | array | Collection photos |
| N/A | `numberOfComics` | Number of Comics | number | Total comics |
| N/A | `publishersIncluded` | Publishers Included | string | Publishers in collection |
| N/A | `majorTitlesIncluded` | Major Titles Included | string | Notable titles |
| N/A | `yearsIncluded` | Years Included | string | Year range |
| N/A | `includesGradedComics` | Includes Graded Comics | string | Yes/No |

---

### SPORTS CARDS

#### Sports Cards - Single Card

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Card title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Card condition |
| N/A | `photos` | Photos | array | Card photos |
| N/A | `quantity` | Quantity | number | Number of cards |
| N/A | `cardName` | Card Name | string | Player/subject name |
| N/A | `cardNumber` | Card Number | string | Card set number |
| N/A | `sport` | Sport | string | Sport type |
| N/A | `player` | Player | string | Player name |
| N/A | `year` | Year | string | Card year |
| N/A | `manufacturer` | Manufacturer | string | Card manufacturer |
| N/A | `rookieCard` | Rookie Card | string | Yes/No |
| N/A | `parallelVariation` | Parallel / Variation | string | Variation type |
| N/A | `isGraded` | Is Graded | string | Yes/No |
| N/A | `gradingCompany` | Grading Company | string | PSA, BGS, CGC Cards, SGC, etc. |
| N/A | `grade` | Grade | string | Grade value |
| N/A | `certificationNumber` | Certification Number | string | Grading cert number |

#### Sports Cards - Card Set

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Set title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Overall condition |
| N/A | `photos` | Photos | array | Set photos |
| N/A | `quantity` | Quantity | number | Number of sets |
| N/A | `setName` | Set Name | string | Official set name |
| N/A | `year` | Year | string | Year released |
| N/A | `manufacturer` | Manufacturer | string | Manufacturer |
| N/A | `numberOfCardsInSet` | Number of Cards in Set | number | Card count |
| N/A | `completeSet` | Complete Set | string | Yes/No |
| N/A | `missingCards` | Missing Cards | string | List of missing cards |

#### Sports Cards - Unopened Product

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Product title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Product condition |
| N/A | `photos` | Photos | array | Product photos |
| N/A | `quantity` | Quantity | number | Number of products |
| N/A | `productName` | Product Name | string | Product name |
| N/A | `year` | Year | string | Year released |
| N/A | `manufacturer` | Manufacturer | string | Manufacturer |
| N/A | `sealed` | Sealed | string | Yes/No |
| N/A | `fromASealedCase` | From A Sealed Case | string | Yes/No |
| N/A | `factorySealed` | Factory Sealed | string | Yes/No |

#### Sports Cards - Collection Lot

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Collection title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Overall condition |
| N/A | `photos` | Photos | array | Collection photos |
| N/A | `numberOfCardsInSet` | Number of Cards in Set | number | Total cards |
| N/A | `sport` | Sport | string | Sport type |
| N/A | `yearsIncluded` | Years Included | string | Year range |
| N/A | `notableCards` | Notable Cards | string | Notable items |
| N/A | `includesGradedCards` | Includes Graded Cards | string | Yes/No |

---

### VIDEO GAMES

#### Video Games - Game

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Game title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Game condition |
| N/A | `photos` | Photos | array | Game photos |
| N/A | `quantity` | Quantity | number | Number of copies |
| N/A | `gameTitle` | Game Title | string | Official game title |
| N/A | `platform` | Platform | string | Gaming platform |
| N/A | `releaseYear` | Release Year | string | Year released |
| N/A | `publisher` | Publisher | string | Publisher |
| N/A | `genre` | Genre | string | Game genre |
| N/A | `complete` | Complete | string | Yes/No - complete in box |
| N/A | `originalBoxIncluded` | Original Box Included | string | Yes/No |
| N/A | `manualIncluded` | Manual Included | string | Yes/No |
| N/A | `isGraded` | Is Graded | string | Yes/No |
| N/A | `gradingCompany` | Grading Company | string | WATA, VGA, CGC Video Games, etc. |
| N/A | `grade` | Grade | string | Grade value |
| N/A | `certificationNumber` | Certification Number | string | Grading cert number |

#### Video Games - Console

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Console title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Console condition |
| N/A | `photos` | Photos | array | Console photos |
| N/A | `quantity` | Quantity | number | Number of consoles |
| N/A | `consoleName` | Console Name | string | Console model |
| N/A | `releaseYear` | Release Year | string | Year released |
| N/A | `manufacturer` | Manufacturer | string | Manufacturer |
| N/A | `color` | Color | string | Console color |
| N/A | `originalBoxIncluded` | Original Box Included | string | Yes/No |
| N/A | `controllersIncluded` | Controllers Included | string | Yes/No |
| N/A | `cablesIncluded` | Cables Included | string | Yes/No |
| N/A | `workingCondition` | Working Condition | string | Fully working, partially working, etc. |

#### Video Games - Accessory

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Accessory title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Accessory condition |
| N/A | `photos` | Photos | array | Accessory photos |
| N/A | `quantity` | Quantity | number | Number of items |
| N/A | `productName` | Product Name | string | Accessory name |
| N/A | `platform` | Platform | string | Compatible platform |
| N/A | `manufacturer` | Manufacturer | string | Manufacturer |
| N/A | `originalBoxIncluded` | Original Box Included | string | Yes/No |
| N/A | `workingCondition` | Working Condition | string | Fully working, etc. |

#### Video Games - Collection Lot

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Collection title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Overall condition |
| N/A | `photos` | Photos | array | Collection photos |
| N/A | `platformsIncluded` | Platforms Included | string | Platforms in collection |
| N/A | `yearsIncluded` | Years Included | string | Year range |
| N/A | `notableGamesConsoles` | Notable Games / Consoles | string | Notable items |
| N/A | `includesGradedGames` | Includes Graded Games | string | Yes/No |

---

### VINTAGE TOYS

#### Vintage Toys - Plush / Stuffed Toy

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Toy title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Toy condition |
| N/A | `photos` | Photos | array | Toy photos |
| N/A | `quantity` | Quantity | number | Number of items |
| N/A | `toyName` | Toy Name / Character | string | Character/toy name |
| N/A | `brand` | Brand | string | Brand/manufacturer |
| N/A | `releaseYear` | Release Year | string | Year released |
| N/A | `originalBoxIncluded` | Original Box Included | string | Yes/No |
| N/A | `tagsAttached` | Tags Attached | string | Yes/No |

#### Vintage Toys - Electronic Toy

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Toy title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Toy condition |
| N/A | `photos` | Photos | array | Toy photos |
| N/A | `quantity` | Quantity | number | Number of items |
| N/A | `toyName` | Toy Name / Character | string | Character/toy name |
| N/A | `brand` | Brand | string | Brand/manufacturer |
| N/A | `releaseYear` | Release Year | string | Year released |
| N/A | `workingCondition` | Working Condition | string | Fully working, etc. |
| N/A | `batteryCompartmentCondition` | Battery Compartment Condition | string | Condition of battery area |
| N/A | `lightsWork` | Lights Work | string | Yes/No |
| N/A | `soundWorks` | Sound Works | string | Yes/No |

#### Vintage Toys - Model Kit

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Kit title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Kit condition |
| N/A | `photos` | Photos | array | Kit photos |
| N/A | `quantity` | Quantity | number | Number of kits |
| N/A | `modelKitName` | Model / Kit Name | string | Kit name |
| N/A | `brand` | Brand | string | Manufacturer |
| N/A | `releaseYear` | Release Year | string | Year released |
| N/A | `scale` | Scale | string | Model scale |
| N/A | `builtOrUnbuilt` | Built or Unbuilt | string | Built or unbuilt |
| N/A | `originalBoxIncluded` | Original Box Included | string | Yes/No |
| N/A | `instructionsIncluded` | Instructions Included | string | Yes/No |

#### Vintage Toys - Action Figure / Doll

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Figure title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Figure condition |
| N/A | `photos` | Photos | array | Figure photos |
| N/A | `quantity` | Quantity | number | Number of figures |
| N/A | `characterName` | Character Name | string | Character name |
| N/A | `franchise` | Franchise | string | Franchise/brand |
| N/A | `releaseYear` | Release Year | string | Year released |
| N/A | `originalBoxIncluded` | Original Box Included | string | Yes/No |
| N/A | `accessoriesIncluded` | Accessories Included | string | Included accessories |

#### Vintage Toys - Vehicle

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Vehicle title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Vehicle condition |
| N/A | `photos` | Photos | array | Vehicle photos |
| N/A | `quantity` | Quantity | number | Number of vehicles |
| N/A | `vehicleName` | Vehicle Name | string | Vehicle name |
| N/A | `brand` | Brand | string | Manufacturer |
| N/A | `releaseYear` | Release Year | string | Year released |
| N/A | `scale` | Scale | string | Model scale |
| N/A | `originalBoxIncluded` | Original Box Included | string | Yes/No |

#### Vintage Toys - Playset

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Playset title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Playset condition |
| N/A | `photos` | Photos | array | Playset photos |
| N/A | `quantity` | Quantity | number | Number of sets |
| N/A | `playsetName` | Playset Name | string | Playset name |
| N/A | `brand` | Brand | string | Manufacturer |
| N/A | `releaseYear` | Release Year | string | Year released |
| N/A | `complete` | Complete | string | Yes/No - all pieces |
| N/A | `missingPieces` | Missing Pieces | string | List of missing pieces |
| N/A | `originalBoxIncluded` | Original Box Included | string | Yes/No |

#### Vintage Toys - Board Game / Puzzle

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Game/puzzle title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Game condition |
| N/A | `photos` | Photos | array | Game photos |
| N/A | `quantity` | Quantity | number | Number of games |
| N/A | `gamePuzzleName` | Game / Puzzle Name | string | Game/puzzle name |
| N/A | `brand` | Brand | string | Manufacturer |
| N/A | `releaseYear` | Release Year | string | Year released |
| N/A | `complete` | Complete | string | Yes/No - all pieces |
| N/A | `missingPieces` | Missing Pieces | string | List of missing pieces |
| N/A | `originalBoxIncluded` | Original Box Included | string | Yes/No |
| N/A | `instructionsIncluded` | Instructions Included | string | Yes/No |

#### Vintage Toys - Collection Lot

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Collection title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Overall condition |
| N/A | `photos` | Photos | array | Collection photos |
| N/A | `numberOfPieces` | Number of Pieces | number | Total items |
| N/A | `brandsIncluded` | Brands Included | string | Brands in collection |
| N/A | `yearsIncluded` | Years Included | string | Year range |
| N/A | `notableItems` | Notable Items | string | Notable items |

---

### POKEMON

#### Pokemon - Unopened Product

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Product title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Product condition |
| N/A | `photos` | Photos | array | Product photos |
| N/A | `quantity` | Quantity | number | Number of products |
| N/A | `productName` | Product Name | string | Product name |
| N/A | `year` | Year | string | Year released |
| N/A | `sealed` | Sealed | string | Yes/No |
| N/A | `fromASealedCase` | From A Sealed Case | string | Yes/No |
| N/A | `isGraded` | Is Graded | string | Yes/No |
| N/A | `gradingCompany` | Grading Company | string | PSA, BGS, CGC Cards, etc. |
| N/A | `grade` | Grade | string | Grade value |
| N/A | `certificationNumber` | Certification Number | string | Grading cert number |

#### Pokemon - Set

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Set title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Set condition |
| N/A | `photos` | Photos | array | Set photos |
| N/A | `quantity` | Quantity | number | Number of sets |
| N/A | `setName` | Set Name | string | Official set name |
| N/A | `year` | Year | string | Year released |
| N/A | `numberOfCardsInSet` | Number of Cards in Set | number | Card count |
| N/A | `completeSet` | Complete Set | string | Yes/No |
| N/A | `missingCards` | Missing Cards | string | List of missing cards |

#### Pokemon - Collection Lot

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Collection title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Overall condition |
| N/A | `photos` | Photos | array | Collection photos |
| N/A | `numberOfCardsInSet` | Number of Cards in Set | number | Total cards |
| N/A | `yearsIncluded` | Years Included | string | Year range |
| N/A | `notableCards` | Notable Cards | string | Notable items |
| N/A | `includesGradedCards` | Includes Graded Cards | string | Yes/No |

---

### STAMPS

#### Stamps - Single Stamp

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Stamp title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Stamp condition |
| N/A | `photos` | Photos | array | Stamp photos |
| N/A | `quantity` | Quantity | number | Number of stamps |
| N/A | `country` | Country | string | Country of origin |
| N/A | `denomination` | Denomination | string | Face value |
| N/A | `year` | Year | string | Year issued |
| N/A | `mintOrUsed` | Mint or Used | string | Mint or used |
| N/A | `hinged` | Hinged | string | Yes/No - hinged |
| N/A | `isGraded` | Is Graded | string | Yes/No |
| N/A | `gradingCompany` | Grading Company | string | PCGS, NGC, ANACS, etc. |
| N/A | `grade` | Grade | string | Grade value |
| N/A | `certificationNumber` | Certification Number | string | Grading cert number |

#### Stamps - Stamp Set / Sheet

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Set title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Set condition |
| N/A | `photos` | Photos | array | Set photos |
| N/A | `quantity` | Quantity | number | Number of sets |
| N/A | `country` | Country | string | Country of origin |
| N/A | `setName` | Set Name | string | Set name |
| N/A | `year` | Year | string | Year issued |
| N/A | `sheetType` | Sheet Type | string | Sheet type |
| N/A | `numberOfStamps` | Number of Stamps in Set | number | Stamp count |
| N/A | `mintOrUsed` | Mint or Used | string | Mint or used |

#### Stamps - Collection Lot

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Collection title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Overall condition |
| N/A | `photos` | Photos | array | Collection photos |
| N/A | `numberOfStamps` | Number of Stamps in Set | number | Total stamps |
| N/A | `countriesIncluded` | Countries Included | string | Countries in collection |
| N/A | `yearsIncluded` | Years Included | string | Year range |
| N/A | `notableStamps` | Notable Stamps | string | Notable items |

---

### MOVIES

#### Movies - Individual Movie

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Movie title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Media condition |
| N/A | `photos` | Photos | array | Movie photos |
| N/A | `quantity` | Quantity | number | Number of copies |
| N/A | `title` | Title | string | Movie title |
| N/A | `releaseYear` | Release Year | string | Year released |
| N/A | `format` | Format | string | VHS, DVD, Blu-ray, etc. |
| N/A | `region` | Region | string | DVD region |
| N/A | `language` | Language | string | Language |
| N/A | `isGraded` | Is Graded | string | Yes/No |
| N/A | `gradingCompany` | Grading Company | string | WATA, VGA, CGC Home Video, etc. |
| N/A | `grade` | Grade | string | Grade value |
| N/A | `certificationNumber` | Certification Number | string | Grading cert number |

#### Movies - Box Set

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Set title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Set condition |
| N/A | `photos` | Photos | array | Set photos |
| N/A | `quantity` | Quantity | number | Number of sets |
| N/A | `boxSetName` | Box Set Name | string | Set name |
| N/A | `releaseYear` | Release Year | string | Year released |
| N/A | `numberOfMovies` | Number of Movies in Set | number | Movie count |
| N/A | `format` | Format | string | Format type |
| N/A | `complete` | Complete | string | Yes/No - all discs |

#### Movies - Collection Lot

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Collection title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Overall condition |
| N/A | `photos` | Photos | array | Collection photos |
| N/A | `numberOfMovies` | Number of Movies in Set | number | Total movies |
| N/A | `formatsIncluded` | Formats Included | string | Formats in collection |
| N/A | `yearsIncluded` | Years Included | string | Year range |
| N/A | `notableTitles` | Notable Titles | string | Notable items |

---

### DISNEY PINS

#### Disney Pins - Individual Pin

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Pin title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Pin condition |
| N/A | `photos` | Photos | array | Pin photos |
| N/A | `quantity` | Quantity | number | Number of pins |
| N/A | `pinName` | Pin Name | string | Pin name/description |
| N/A | `character` | Character | string | Character featured |
| N/A | `releaseYear` | Release Year | string | Year released |
| N/A | `pinTradingEvent` | Pin Trading Event | string | Event/collection |
| N/A | `limitedEdition` | Limited Edition | string | Yes/No |
| N/A | `serialNumbered` | Serial Numbered | string | Yes/No |
| N/A | `backstampInformation` | Backstamp Information | string | Backstamp details |

#### Disney Pins - Pin Set

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Set title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Set condition |
| N/A | `photos` | Photos | array | Set photos |
| N/A | `quantity` | Quantity | number | Number of sets |
| N/A | `setName` | Set Name | string | Set name |
| N/A | `releaseYear` | Release Year | string | Year released |
| N/A | `numberOfPins` | Number of Pins in Set | number | Pin count |
| N/A | `limitedEditionPinsIncluded` | Limited Edition Pins Included | string | Limited edition info |
| N/A | `complete` | Complete | string | Yes/No - all pins |
| N/A | `missingPins` | Missing Pins | string | List of missing pins |

#### Disney Pins - Collection Lot

| Database Column | Form Field Name | Display Label | Data Type | Notes |
|---|---|---|---|---|
| N/A | `listingTitle` | Listing Title | string | Collection title |
| N/A | `tradeValue` | Trade Value | decimal | Estimated value |
| N/A | `condition` | Condition | enum | Overall condition |
| N/A | `photos` | Photos | array | Collection photos |
| N/A | `numberOfPins` | Number of Pins in Set | number | Total pins |
| N/A | `charactersIncluded` | Characters Included | string | Characters in collection |
| N/A | `yearsIncluded` | Years Included | string | Year range |
| N/A | `notableItems` | Notable Items | string | Notable items |

---

## Summary

**Total Unique Form Fields:** 186
**Total Database Columns (listings table):** 19
**Total Category-Specific Fields:** 167+ (stored in itemDetails JSON)

### Key Mapping Rules

1. **Database Column → Form Field Name:** Not always 1:1. Example: `certificationCompany` ← `gradingCompany`
2. **Form Field Name → Display Label:** Display labels are user-friendly versions. Example: `tradeValue` displays as "Trade Value"
3. **Category-Specific Fields:** All stored in `itemDetails` JSON column, not as separate database columns
4. **Conditional Fields:** Some fields only appear based on other field values (e.g., grading fields only show when "Is Graded = Yes")
