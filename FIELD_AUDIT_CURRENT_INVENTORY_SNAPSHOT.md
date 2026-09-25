# Current Add Inventory Field Snapshot

**Generated from the active field-definition modules on 25 September 2026.** This is a code-derived inventory of visible item fields by category and item type. It is an audit input, not a recommendation and not a user-facing schema commitment.

## Scope note

The snapshot merges the primary field definition registry, the remaining category map, and bespoke Music and LEGO field tables. When duplicate category/item-type keys exist, the later active mapping is represented. Photos are managed in a dedicated panel and may not be repeated in every merged field list.

## Autographs

### Collection Lot

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; required; dropdown
- `numberOfSignedItems` — **Number of Signed Items**; required; number
- `photos` — **Photos**; required; image-upload
- `signersIncluded` — **Signers Included**; recommended; textarea
- `authenticationIncluded` — **Authentication Included**; recommended; dropdown
- `notableItems` — **Notable Items**; recommended; textarea
- `itemTypesIncluded` — **Item Types Included**; recommended; textarea

### Signed Item

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; required; dropdown
- `photos` — **Photos**; required; image-upload
- `quantity` — **Quantity**; recommended; number
- `signer` — **Signer**; required; text
- `signedItemType` — **Signed Item Type**; required; dropdown
- `autographCategory` — **Autograph Category**; recommended; dropdown
- `authenticationIncluded` — **Authentication Included**; required; dropdown
- `authenticationCompany` — **Authentication Company**; required; dropdown; shown when Authentication Included = Yes
- `authenticationType` — **Authentication Type**; required; dropdown; shown when Authentication Included = Yes
- `certificateNumber` — **Certificate Number**; required; text; shown when Authentication Included = Yes
- `inscriptionPresent` — **Inscription Present**; optional; dropdown
- `inscriptionText` — **Inscription Text**; optional; text; shown when Inscription Present = Yes

## Coins

### Coin Set

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `country` — **Country**; required; dropdown
- `condition` — **Condition**; required; dropdown
- `photos` — **Photos**; required; image-upload
- `quantity` — **Quantity**; recommended; number
- `setName` — **Set Name**; required; text
- `year` — **Year**; required; number
- `setType` — **Set Type**; required; dropdown
- `originalPackagingIncluded` — **Original Packaging Included**; recommended; dropdown
- `numberOfCoins` — **Number of Coins in Set**; recommended; number

### Collection Lot

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `country` — **Country**; required; dropdown
- `condition` — **Condition**; required; dropdown
- `photos` — **Photos**; required; image-upload
- `approximateCoinCount` — **Approximate Coin Count**; required; number
- `countriesIncluded` — **Countries Included**; recommended; textarea
- `yearsIncluded` — **Years Included**; recommended; text
- `notableCoins` — **Notable Coins**; recommended; textarea
- `includesGradedCoins` — **Includes Graded Coins**; optional; dropdown

### Paper Money

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `country` — **Country**; required; dropdown
- `condition` — **Condition**; conditional; dropdown; shown when Is Graded = no
- `photos` — **Photos**; required; image-upload
- `quantity` — **Quantity**; recommended; number
- `denomination` — **Denomination**; required; text
- `year` — **Year**; required; number
- `serialNumber` — **Serial Number**; recommended; text
- `signature` — **Signature**; recommended; text
- `isGraded` — **Is Graded**; required; dropdown
- `gradingCompany` — **Grading Company**; required; dropdown; shown when Is Graded = yes
- `grade` — **Grade**; required; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; required; text; shown when Is Graded = yes

### Single Coin

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `country` — **Country**; required; dropdown
- `condition` — **Condition**; conditional; dropdown; shown when Is Graded = no
- `photos` — **Photos**; required; image-upload
- `quantity` — **Quantity**; recommended; number
- `denomination` — **Denomination**; required; text
- `year` — **Year**; required; number
- `mintMark` — **Mint Mark**; recommended; text
- `variety` — **Variety**; recommended; text
- `composition` — **Composition**; recommended; text
- `weight` — **Weight (oz)**; recommended; text
- `diameter` — **Diameter**; recommended; text
- `isGraded` — **Is Graded**; required; dropdown
- `gradingCompany` — **Grading Company**; required; dropdown; shown when Is Graded = yes
- `grade` — **Grade**; required; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; required; text; shown when Is Graded = yes

## Comics

### Collection Lot

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; conditional; dropdown; shown when Is Graded = no
- `photos` — **Photos**; required; image-upload
- `numberOfComics` — **Number of Comics**; required; number
- `publishersIncluded` — **Publishers Included**; recommended; textarea
- `majorTitlesIncluded` — **Major Titles Included**; recommended; textarea
- `yearsIncluded` — **Years Included**; recommended; text
- `includesGradedComics` — **Includes Graded Comics**; optional; dropdown

### Original Art

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; conditional; dropdown; shown when Is Graded = no
- `photos` — **Photos**; required; image-upload
- `quantity` — **Quantity**; recommended; number
- `artistName` — **Artist Name**; required; text
- `artworkTitle` — **Artwork Title**; recommended; text
- `publisher` — **Publisher**; recommended; dropdown
- `artType` — **Art Type**; required; dropdown
- `medium` — **Medium**; recommended; dropdown
- `yearCreated` — **Year Created**; recommended; number
- `signedByArtist` — **Signed By Artist**; recommended; dropdown
- `coaIncluded` — **COA Included**; recommended; dropdown
- `dimensions` — **Dimensions**; recommended; text
- `framed` — **Framed**; optional; dropdown
- `originalPublishedPage` — **Original Published Page**; recommended; dropdown
- `comicSeries` — **Comic Series**; recommended; text; shown when Original Published Page = Yes
- `issueNumber` — **Issue Number**; recommended; text; shown when Original Published Page = Yes
- `pageNumber` — **Page Number**; recommended; text; shown when Original Published Page = Yes

### Single Comic

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; conditional; dropdown; shown when Is Graded = no
- `photos` — **Photos**; required; image-upload
- `quantity` — **Quantity**; recommended; number
- `comicTitle` — **Comic Title**; required; text
- `issueNumber` — **Issue Number**; required; text
- `publisher` — **Publisher**; required; dropdown
- `volume` — **Volume**; optional; text
- `publicationYear` — **Publication Year**; recommended; number
- `variantCover` — **Variant Cover**; recommended; dropdown
- `variantDescription` — **Variant Description**; recommended; text; shown when Variant Cover = Yes
- `keyIssue` — **Key Issue**; recommended; dropdown
- `firstAppearance` — **First Appearance**; optional; dropdown
- `characterName` — **Character Name**; optional; text; shown when First Appearance = Yes
- `signed` — **Signed**; recommended; dropdown
- `isGraded` — **Is Graded**; required; dropdown
- `gradingCompany` — **Grading Company**; required; dropdown; shown when Is Graded = yes
- `grade` — **Grade**; required; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; required; text; shown when Is Graded = yes
- `numberOfSignatures` — **# of Signatures**; recommended; dropdown; shown when Signed = Yes
- `signatures` — **Signatures**; recommended; textarea; shown when Signed = Yes

## Disney Pins

### Collection Lot

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; required; dropdown
- `photos` — **Photos**; required; image-upload
- `approximatePinCount` — **Approximate Pin Count**; required; number
- `charactersIncluded` — **Characters Included**; recommended; textarea
- `seriesIncluded` — **Series Included**; recommended; textarea
- `limitedEditionPinsIncluded` — **Limited Edition Pins Included**; recommended; dropdown
- `apPpPinsIncluded` — **AP / PP Pins Included**; optional; dropdown
- `backerCardsIncluded` — **Backer Cards Included**; optional; dropdown

### Pin Set

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; required; dropdown
- `photos` — **Photos**; required; image-upload
- `setName` — **Set Name**; required; text
- `completeSet` — **Complete Set**; required; dropdown
- `missingPins` — **Missing Pins**; required; textarea; shown when Complete Set = No
- `quantity` — **Quantity**; recommended; number
- `numberOfPins` — **Number of Pins in Set**; recommended; number
- `limitedEdition` — **Limited Edition**; recommended; dropdown
- `series` — **Series**; recommended; text
- `charactersIncluded` — **Characters Included**; recommended; textarea

### Single Pin

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; required; dropdown
- `pinName` — **Pin Name**; required; text
- `quantity` — **Quantity**; recommended; number
- `character` — **Character**; recommended; text
- `series` — **Series**; recommended; text
- `year` — **Year**; recommended; number
- `pinTradingEvent` — **Pin Trading Event**; recommended; text
- `limitedEdition` — **Limited Edition**; recommended; dropdown
- `openEdition` — **Open Edition**; recommended; dropdown
- `artistProof` — **Artist Proof (AP)**; recommended; dropdown
- `preProduction` — **Pre-Production (PP)**; recommended; dropdown
- `backstampInformation` — **Backstamp Information**; recommended; textarea
- `backerCardIncluded` — **Backer Card Included**; optional; dropdown
- `photos` — **Photos**; required; image-upload

## Movies

### Box Set

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; required; dropdown; shown when Is Graded = no
- `photos` — **Photos**; required; image-upload
- `boxSetName` — **Box Set Name**; required; text
- `format` — **Format**; required; dropdown
- `isGraded` — **Is Graded**; required; dropdown
- `gradingCompany` — **Grading Company**; required; dropdown; shown when Is Graded = yes
- `grade` — **Grade**; required; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; required; text; shown when Is Graded = yes
- `quantity` — **Quantity**; recommended; number
- `numberOfMovies` — **Number of Movies in Set**; recommended; number
- `edition` — **Edition**; optional; text
- `sealed` — **Sealed**; recommended; dropdown

### Collection Lot

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; required; dropdown
- `photos` — **Photos**; required; image-upload
- `formatsIncluded` — **Formats Included**; recommended; textarea
- `approximateQuantity` — **Approximate Quantity**; required; number
- `notableTitles` — **Notable Titles**; recommended; textarea
- `sealedItemsIncluded` — **Sealed Items Included**; optional; dropdown

### Individual Movie

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; conditional; dropdown; shown when Is Graded = no
- `photos` — **Photos**; required; image-upload
- `quantity` — **Quantity**; recommended; number
- `title` — **Title**; required; text
- `format` — **Format**; required; dropdown
- `releaseYear` — **Release Year**; recommended; number
- `edition` — **Edition**; optional; text
- `region` — **Region**; optional; text
- `sealed` — **Sealed**; recommended; dropdown
- `isGraded` — **Is Graded**; required; dropdown
- `gradingCompany` — **Grading Company**; required; dropdown; shown when Is Graded = yes
- `grade` — **Grade**; required; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; required; text; shown when Is Graded = yes

## Music

### Cassette Tape

- `listingTitle` — **Listing Title**; required; text
- `artist` — **Artist / Performer**; required; text
- `releaseTitle` — **Album / Release Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `photos` — **Photos**; required; image-upload
- `isGraded` — **Is Graded**; required; dropdown
- `condition` — **Media Condition**; conditional; dropdown; shown when Is Graded = no
- `gradingCompany` — **Grading Company**; required; dropdown; shown when Is Graded = yes
- `grade` — **Grade**; required; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; required; text; shown when Is Graded = yes
- `recordLabel` — **Record Label**; recommended; text
- `catalogNumber` — **Catalog Number**; recommended; text
- `releaseYear` — **Release Year**; recommended; number
- `country` — **Country of Release**; recommended; text
- `edition` — **Edition / Variant**; recommended; text
- `playbackTested` — **Playback Tested**; recommended; dropdown
- `packagingIncluded` — **Original Packaging Included**; recommended; dropdown
- `genre` — **Genre**; optional; text
- `packagingCondition` — **Packaging / Case Condition**; optional; dropdown; shown when Packaging Included = yes
- `playbackNotes` — **Playback Notes**; optional; textarea; shown when Playback Tested = yes
- `inlayBookletStatus` — **Inlay / Booklet Status**; optional; text

### Compact Disc

- `listingTitle` — **Listing Title**; required; text
- `artist` — **Artist / Performer**; required; text
- `releaseTitle` — **Album / Release Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `photos` — **Photos**; required; image-upload
- `isGraded` — **Is Graded**; required; dropdown
- `condition` — **Media Condition**; conditional; dropdown; shown when Is Graded = no
- `gradingCompany` — **Grading Company**; required; dropdown; shown when Is Graded = yes
- `grade` — **Grade**; required; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; required; text; shown when Is Graded = yes
- `recordLabel` — **Record Label**; recommended; text
- `catalogNumber` — **Catalog Number**; recommended; text
- `releaseYear` — **Release Year**; recommended; number
- `country` — **Country of Release**; recommended; text
- `edition` — **Edition / Variant**; recommended; text
- `playbackTested` — **Playback Tested**; recommended; dropdown
- `packagingIncluded` — **Original Packaging Included**; recommended; dropdown
- `genre` — **Genre**; optional; text
- `packagingCondition` — **Packaging / Case Condition**; optional; dropdown; shown when Packaging Included = yes
- `playbackNotes` — **Playback Notes**; optional; textarea; shown when Playback Tested = yes
- `bookletStatus` — **Booklet / Insert Status**; optional; text

### Eight Track Tape

- `listingTitle` — **Listing Title**; required; text
- `artist` — **Artist / Performer**; required; text
- `releaseTitle` — **Album / Release Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `photos` — **Photos**; required; image-upload
- `isGraded` — **Is Graded**; required; dropdown
- `condition` — **Media Condition**; conditional; dropdown; shown when Is Graded = no
- `gradingCompany` — **Grading Company**; required; dropdown; shown when Is Graded = yes
- `grade` — **Grade**; required; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; required; text; shown when Is Graded = yes
- `recordLabel` — **Record Label**; recommended; text
- `catalogNumber` — **Catalog Number**; recommended; text
- `releaseYear` — **Release Year**; recommended; number
- `country` — **Country of Release**; recommended; text
- `edition` — **Edition / Variant**; recommended; text
- `playbackTested` — **Playback Tested**; recommended; dropdown
- `packagingIncluded` — **Original Packaging Included**; recommended; dropdown
- `genre` — **Genre**; optional; text
- `packagingCondition` — **Packaging / Case Condition**; optional; dropdown; shown when Packaging Included = yes
- `playbackNotes` — **Playback Notes**; optional; textarea; shown when Playback Tested = yes
- `cartridgeNotes` — **Cartridge / Label Notes**; optional; textarea

### Other Music Format

- `listingTitle` — **Listing Title**; required; text
- `artist` — **Artist / Performer**; required; text
- `releaseTitle` — **Album / Release Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `photos` — **Photos**; required; image-upload
- `isGraded` — **Is Graded**; required; dropdown
- `condition` — **Media Condition**; conditional; dropdown; shown when Is Graded = no
- `gradingCompany` — **Grading Company**; required; dropdown; shown when Is Graded = yes
- `grade` — **Grade**; required; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; required; text; shown when Is Graded = yes
- `recordLabel` — **Record Label**; recommended; text
- `catalogNumber` — **Catalog Number**; recommended; text
- `releaseYear` — **Release Year**; recommended; number
- `country` — **Country of Release**; recommended; text
- `edition` — **Edition / Variant**; recommended; text
- `playbackTested` — **Playback Tested**; recommended; dropdown
- `packagingIncluded` — **Original Packaging Included**; recommended; dropdown
- `genre` — **Genre**; optional; text
- `packagingCondition` — **Packaging / Case Condition**; optional; dropdown; shown when Packaging Included = yes
- `playbackNotes` — **Playback Notes**; optional; textarea; shown when Playback Tested = yes
- `formatDetails` — **Format Details**; required; text

### Vinyl Record

- `listingTitle` — **Listing Title**; required; text
- `artist` — **Artist / Performer**; required; text
- `releaseTitle` — **Album / Release Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `photos` — **Photos**; required; image-upload
- `isGraded` — **Is Graded**; required; dropdown
- `condition` — **Media Condition**; conditional; dropdown; shown when Is Graded = no
- `gradingCompany` — **Grading Company**; required; dropdown; shown when Is Graded = yes
- `grade` — **Grade**; required; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; required; text; shown when Is Graded = yes
- `recordLabel` — **Record Label**; recommended; text
- `catalogNumber` — **Catalog Number**; recommended; text
- `releaseYear` — **Release Year**; recommended; number
- `country` — **Country of Release**; recommended; text
- `edition` — **Edition / Variant**; recommended; text
- `playbackTested` — **Playback Tested**; recommended; dropdown
- `packagingIncluded` — **Original Packaging Included**; recommended; dropdown
- `genre` — **Genre**; optional; text
- `packagingCondition` — **Packaging / Case Condition**; optional; dropdown; shown when Packaging Included = yes
- `playbackNotes` — **Playback Notes**; optional; textarea; shown when Playback Tested = yes
- `recordSize` — **Record Size**; optional; dropdown
- `playbackSpeed` — **Playback Speed**; optional; dropdown
- `pressingDetails` — **Pressing / Matrix Notes**; optional; textarea

## Pokemon

### Collection Lot

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; required; dropdown
- `approximateCardCount` — **Approximate Card Count**; required; number
- `setsIncluded` — **Eras / Series Included**; recommended; textarea
- `notableCards` — **Notable Cards**; recommended; textarea
- `includesGradedCards` — **Includes Graded Cards**; optional; dropdown

### Set

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; required; dropdown
- `setName` — **Set Name**; required; text
- `year` — **Year**; required; text
- `complete` — **Complete**; required; dropdown
- `quantity` — **Quantity**; recommended; number
- `notableCards` — **Notable Cards**; optional; textarea
- `includesGradedCards` — **Includes Graded Cards**; optional; dropdown
- `numberOfCardsInSet` — **Number of Cards in Set**; optional; textarea
- `originalPackaging` — **Original Packaging**; optional; dropdown

### Single Card

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; required; dropdown; shown when Is Graded = no
- `quantity` — **Quantity**; recommended; number
- `cardName` — **Card Name**; required; text
- `setName` — **Set Name**; required; text
- `cardNumber` — **Card Number**; required; text
- `year` — **Year**; required; number
- `rarity` — **Rarity**; recommended; dropdown
- `editionEra` — **Edition / Era**; required; dropdown
- `finishVariant` — **Finish / Variant**; recommended; dropdown
- `specialAttributes` — **Special Attributes**; optional; dropdown
- `language` — **Language**; recommended; dropdown
- `isGraded` — **Is Graded**; required; dropdown
- `gradingCompany` — **Grading Company**; conditional; dropdown; shown when Is Graded = yes
- `grade` — **Grade**; conditional; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; conditional; text; shown when Is Graded = yes

### Unopened Product

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; required; dropdown
- `quantity` — **Quantity**; recommended; number
- `productName` — **Product Name**; required; text
- `setName` — **Set Name**; required; text
- `productType` — **Product Type**; required; dropdown
- `releaseYear` — **Year**; required; number
- `era` — **Era**; required; dropdown
- `factorySealed` — **Factory Sealed**; required; dropdown
- `authenticated` — **Authenticated**; required; dropdown
- `authenticationCompany` — **Authentication Company**; required; dropdown; shown when Authenticated = Yes
- `fromASealedCase` — **From A Sealed Case**; required; dropdown; shown when Authenticated = Yes

## Sports Cards

### Card Set

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; conditional; dropdown; shown when Is Graded = no
- `photos` — **Photos**; required; image-upload
- `quantity` — **Quantity**; recommended; number
- `sport` — **Sport**; required; dropdown
- `year` — **Year**; required; number
- `manufacturer` — **Manufacturer**; required; dropdown
- `setName` — **Set Name**; required; text
- `setType` — **Set Type**; required; dropdown
- `missingCards` — **Missing Cards**; required; dropdown; shown when Set Type = Partial Set
- `missingCardDetails` — **Missing Card Details**; required; text; shown when Missing Cards = Yes
- `numberOfCardsInSet` — **Number of Cards in Set**; optional; text

### Collection Lot

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; conditional; dropdown; shown when Is Graded = no
- `photos` — **Photos**; required; image-upload
- `sport` — **Sport**; recommended; dropdown
- `approximateCardCount` — **Approximate Card Count**; required; number
- `yearsIncluded` — **Years Included**; recommended; text
- `manufacturersIncluded` — **Manufacturers Included**; recommended; textarea
- `notablePlayers` — **Notable Players**; recommended; textarea
- `notableCards` — **Notable Cards**; recommended; textarea
- `includesGradedCards` — **Includes Graded Cards**; optional; dropdown

### Set

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; conditional; dropdown; shown when Is Graded = no
- `quantity` — **Quantity**; recommended; number
- `sport` — **Sport**; required; dropdown
- `year` — **Year**; required; number
- `manufacturer` — **Manufacturer**; required; dropdown
- `setName` — **Set Name**; required; text
- `setType` — **Set Type**; required; dropdown
- `missingCards` — **Missing Cards**; required; dropdown; shown when Set Type = Partial Set
- `missingCardDetails` — **Missing Card Details**; required; text; shown when Missing Cards = Yes
- `numberOfCardsInSet` — **Number of Cards in Set**; optional; text

### Single Card

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; conditional; dropdown; shown when Is Graded = no
- `photos` — **Photos**; required; image-upload
- `quantity` — **Quantity**; recommended; number
- `sport` — **Sport**; required; dropdown
- `player` — **Player's Name**; required; text
- `year` — **Year**; required; number
- `manufacturer` — **Manufacturer**; required; dropdown
- `setName` — **Set Name**; recommended; text
- `cardNumber` — **Card Number**; recommended; text
- `parallelVariation` — **Parallel / Variation**; optional; text
- `rookieCard` — **Rookie Card**; recommended; dropdown
- `autograph` — **Autograph**; recommended; dropdown
- `relicMemorabilia` — **Relic / Memorabilia**; recommended; dropdown
- `serialNumbered` — **Serial Numbered**; recommended; dropdown
- `serialNumber` — **Serial Number**; recommended; text; shown when Serial Numbered = Yes
- `isGraded` — **Is Graded**; required; dropdown
- `gradingCompany` — **Grading Company**; required; dropdown; shown when Is Graded = yes
- `grade` — **Grade**; required; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; required; text; shown when Is Graded = yes

### Unopened Product

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; conditional; dropdown; shown when Is Graded = no
- `photos` — **Photos**; required; image-upload
- `quantity` — **Quantity**; recommended; number
- `sport` — **Sport**; required; dropdown
- `year` — **Year**; required; number
- `manufacturer` — **Manufacturer**; required; dropdown
- `productName` — **Product Name**; required; text
- `productFormat` — **Product Format**; required; dropdown
- `productType` — **Product Type**; recommended; dropdown
- `factorySealed` — **Factory Sealed**; required; dropdown
- `authenticated` — **Authenticated**; required; dropdown
- `authenticationCompany` — **Authentication Company**; required; dropdown; shown when Authenticated = Yes
- `fromASealedCase` — **From A Sealed Case**; required; dropdown; shown when Authenticated = Yes

## Stamps

### Collection Lot

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; required; dropdown
- `photos` — **Photos**; required; image-upload
- `approximateQuantity` — **Approximate Quantity**; required; number
- `countriesIncluded` — **Countries Included**; recommended; textarea
- `yearsIncluded` — **Years Included**; recommended; text
- `albumIncluded` — **Album Included**; optional; dropdown
- `notableStamps` — **Notable Stamps**; recommended; textarea

### Single Stamp

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `country` — **Country**; required; dropdown
- `condition` — **Condition**; conditional; dropdown; shown when Is Graded = no
- `photos` — **Photos**; required; image-upload
- `quantity` — **Quantity**; recommended; number
- `year` — **Year**; required; number
- `scottNumber` — **Scott Number**; required; text
- `stampGrade` — **Grade**; required; dropdown
- `denomination` — **Denomination**; recommended; text
- `mintOrUsed` — **Mint or Used**; required; dropdown
- `hinged` — **Hinged**; optional; dropdown
- `isGraded` — **Is Graded**; required; dropdown
- `gradingCompany` — **Grading Company**; required; dropdown; shown when Is Graded = yes
- `grade` — **Numerical Grade**; required; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; required; text; shown when Is Graded = yes
- `gum` — **Gum**; required; dropdown; shown when Is Graded = yes
- `centering` — **Centering**; required; dropdown; shown when Is Graded = yes

### Stamp Set

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `country` — **Country**; required; dropdown
- `condition` — **Condition**; conditional; dropdown; shown when Is Graded = no
- `photos` — **Photos**; required; image-upload
- `quantity` — **Quantity**; recommended; number
- `year` — **Year**; recommended; number
- `setNameDescription` — **Set Name**; required; text
- `sheetType` — **Sheet Type**; required; dropdown
- `numberOfStamps` — **Number of Stamps in Set**; recommended; number
- `mintOrUsed` — **Mint or Used**; recommended; dropdown
- `isGraded` — **Is Graded**; required; dropdown
- `gradingCompany` — **Grading Company**; required; dropdown; shown when Is Graded = yes
- `grade` — **Grade**; required; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; required; text; shown when Is Graded = yes

## Video Games

### Accessory

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; conditional; dropdown; shown when Is Graded = no
- `photos` — **Photos**; required; image-upload
- `quantity` — **Quantity**; recommended; number
- `accessoryType` — **Accessory Type**; required; text
- `accessoryName` — **Accessory Name**; required; text
- `platform` — **Platform**; required; dropdown
- `manufacturer` — **Manufacturer**; recommended; dropdown
- `workingCondition` — **Working Condition**; required; dropdown
- `isGraded` — **Is Graded**; required; dropdown
- `gradingCompany` — **Grading Company**; required; dropdown; shown when Is Graded = yes
- `grade` — **Grade**; required; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; required; text; shown when Is Graded = yes
- `originalPackaging` — **Original Packaging**; recommended; dropdown

### Collection Lot

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; required; dropdown
- `approximateItemCount` — **Approximate Item Count**; required; number
- `platformsIncluded` — **Platforms Included**; recommended; textarea
- `notableGamesConsoles` — **Notable Games / Consoles**; recommended; textarea
- `includesGradedGames` — **Includes Graded Games**; optional; dropdown

### Console

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; conditional; dropdown; shown when Is Graded = no
- `photos` — **Photos**; required; image-upload
- `quantity` — **Quantity**; recommended; number
- `consoleName` — **Console Name**; required; dropdown
- `modelNumber` — **Model Number**; recommended; text
- `region` — **Region**; recommended; dropdown
- `workingCondition` — **Working Condition**; required; dropdown
- `originalBoxIncluded` — **Original Box Included**; recommended; dropdown
- `cablesIncluded` — **Cables Included**; recommended; dropdown
- `controllersIncluded` — **Number of Controllers Included**; recommended; number
- `isGraded` — **Is Graded**; required; dropdown
- `gradingCompany` — **Grading Company**; required; dropdown; shown when Is Graded = yes
- `grade` — **Grade**; required; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; required; text; shown when Is Graded = yes

### Game

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; conditional; dropdown; shown when Is Graded = no
- `photos` — **Photos**; required; image-upload
- `quantity` — **Quantity**; recommended; number
- `gameTitle` — **Game Title**; required; text
- `platform` — **Platform**; required; dropdown
- `releaseYear` — **Release Year**; recommended; number
- `region` — **Region**; recommended; dropdown
- `completeInBox` — **Complete In Box**; recommended; dropdown
- `originalCaseIncluded` — **Original Case Included**; recommended; dropdown; shown when completeInBox = No
- `manualIncluded` — **Manual Included**; recommended; dropdown; shown when completeInBox = No
- `sealed` — **Sealed**; recommended; dropdown
- `isGraded` — **Is Graded**; required; dropdown
- `gradingCompany` — **Grading Company**; required; dropdown; shown when Is Graded = yes
- `grade` — **Grade**; required; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; required; text; shown when Is Graded = yes

## Vintage Toys

### Action Figure

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; conditional; dropdown; shown when Is Graded = no
- `photos` — **Photos**; required; image-upload
- `quantity` — **Quantity**; recommended; number
- `toyName` — **Toy Name / Character**; required; text
- `brand` — **Brand**; recommended; dropdown
- `franchise` — **Franchise**; recommended; text
- `year` — **Year**; recommended; number
- `packagingType` — **Packaging Type**; required; dropdown
- `complete` — **Complete**; recommended; dropdown
- `accessoriesIncluded` — **Accessories Included**; recommended; dropdown
- `isGraded` — **Is Graded**; required; dropdown
- `gradingCompany` — **Grading Company**; required; dropdown; shown when Is Graded = yes
- `grade` — **Grade**; required; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; required; text; shown when Is Graded = yes

### Board Game

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; conditional; dropdown; shown when Is Graded = no
- `photos` — **Photos**; required; image-upload
- `quantity` — **Quantity**; recommended; number
- `gamePuzzleName` — **Game / Puzzle Name**; required; text
- `publisherBrand` — **Publisher / Brand**; required; dropdown
- `year` — **Year**; recommended; number
- `numberOfPieces` — **Number of Pieces**; recommended; number
- `complete` — **Complete**; required; dropdown
- `missingPieces` — **Missing Pieces**; required; textarea; shown when Complete = No
- `isGraded` — **Is Graded**; required; dropdown
- `gradingCompany` — **Grading Company**; required; dropdown; shown when Is Graded = yes
- `grade` — **Grade**; required; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; required; text; shown when Is Graded = yes
- `instructionsIncluded` — **Instructions Included**; recommended; dropdown
- `boxIncluded` — **Box Included**; recommended; dropdown

### Collection Lot

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; conditional; dropdown; shown when Is Graded = no
- `photos` — **Photos**; required; image-upload
- `quantity` — **Quantity**; recommended; number
- `approximateItemCount` — **Approximate Item Count**; required; number
- `brandsIncluded` — **Brands Included**; recommended; textarea
- `franchisesIncluded` — **Franchises Included**; recommended; textarea
- `notableItems` — **Notable Items**; recommended; textarea
- `isGraded` — **Is Graded**; required; dropdown
- `gradingCompany` — **Grading Company**; required; dropdown; shown when Is Graded = yes
- `grade` — **Grade**; required; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; required; text; shown when Is Graded = yes

### Electronic Toy

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; conditional; dropdown; shown when Is Graded = no
- `photos` — **Photos**; required; image-upload
- `quantity` — **Quantity**; recommended; number
- `toyName` — **Toy Name**; required; text
- `brand` — **Brand**; recommended; dropdown
- `year` — **Year**; recommended; number
- `tested` — **Tested**; required; dropdown
- `workingCondition` — **Working Condition**; required; dropdown
- `batteryCompartmentCondition` — **Battery Compartment Condition**; recommended; dropdown
- `soundWorks` — **Sound Works**; optional; dropdown
- `lightsWork` — **Lights Work**; optional; dropdown
- `isGraded` — **Is Graded**; required; dropdown
- `gradingCompany` — **Grading Company**; required; dropdown; shown when Is Graded = yes
- `grade` — **Grade**; required; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; required; text; shown when Is Graded = yes

### Lego

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `photos` — **Photos**; required; image-upload
- `isGraded` — **Is Graded**; required; dropdown
- `condition` — **Condition**; conditional; dropdown; shown when Is Graded = no
- `gradingCompany` — **Grading Company**; required; dropdown; shown when Is Graded = yes
- `grade` — **Grade**; required; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; required; text; shown when Is Graded = yes
- `setNumber` — **Set Number**; recommended; text
- `theme` — **Theme**; recommended; text
- `complete` — **Complete**; recommended; dropdown
- `quantity` — **Quantity**; recommended; number
- `packagingType` — **Packaging Type**; recommended; dropdown
- `instructionsIncluded` — **Instructions Included**; optional; dropdown
- `minifiguresIncluded` — **Minifigures Included**; optional; dropdown
- `releaseYear` — **Release Year**; optional; number
- `pieceCount` — **Piece Count**; optional; number
- `retiredStatus` — **Retired Status**; optional; dropdown
- `boxCondition` — **Box Condition**; optional; dropdown; shown when Packaging Type = opened
- `instructionCondition` — **Instruction Condition**; optional; dropdown; shown when Instructions Included = yes
- `minifigureDetails` — **Minifigure Details**; optional; textarea; shown when Minifigures Included = yes
- `missingDetails` — **What Is Missing?**; recommended; textarea; shown when Complete = no

### Model Kit

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; conditional; dropdown; shown when Is Graded = no
- `photos` — **Photos**; required; image-upload
- `quantity` — **Quantity**; recommended; number
- `modelKitName` — **Model / Kit Name**; required; text
- `brand` — **Brand**; recommended; dropdown
- `scale` — **Scale**; recommended; text
- `builtOrUnbuilt` — **Built or Unbuilt**; required; dropdown
- `complete` — **Complete**; recommended; dropdown
- `instructionsIncluded` — **Instructions Included**; recommended; dropdown
- `isGraded` — **Is Graded**; required; dropdown
- `gradingCompany` — **Grading Company**; required; dropdown; shown when Is Graded = yes
- `grade` — **Grade**; required; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; required; text; shown when Is Graded = yes

### Playset

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; conditional; dropdown; shown when Is Graded = no
- `photos` — **Photos**; required; image-upload
- `quantity` — **Quantity**; recommended; number
- `playsetName` — **Playset Name**; required; text
- `brand` — **Brand**; recommended; dropdown
- `franchise` — **Franchise**; recommended; text
- `year` — **Year**; recommended; number
- `complete` — **Complete**; required; dropdown
- `missingPieces` — **Missing Pieces**; required; textarea; shown when Complete = No
- `isGraded` — **Is Graded**; required; dropdown
- `gradingCompany` — **Grading Company**; required; dropdown; shown when Is Graded = yes
- `grade` — **Grade**; required; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; required; text; shown when Is Graded = yes
- `instructionsIncluded` — **Instructions Included**; recommended; dropdown
- `originalBoxIncluded` — **Original Box Included**; recommended; dropdown

### Plush Toy

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; conditional; dropdown; shown when Is Graded = no
- `photos` — **Photos**; required; image-upload
- `quantity` — **Quantity**; recommended; number
- `toyNameCharacter` — **Toy Name / Character**; required; text
- `brand` — **Brand**; recommended; dropdown
- `year` — **Year**; recommended; number
- `tagsAttached` — **Tags Attached**; recommended; dropdown
- `cleanlinessOdorNotes` — **Cleanliness / Odor Notes**; optional; textarea
- `isGraded` — **Is Graded**; required; dropdown
- `gradingCompany` — **Grading Company**; required; dropdown; shown when Is Graded = yes
- `grade` — **Grade**; required; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; required; text; shown when Is Graded = yes

### Vehicle

- `listingTitle` — **Listing Title**; required; text
- `tradeValue` — **Trade Value**; required; currency
- `condition` — **Condition**; conditional; dropdown; shown when Is Graded = no
- `isGraded` — **Is Graded**; required; dropdown
- `gradingCompany` — **Grading Company**; required; dropdown; shown when Is Graded = yes
- `grade` — **Grade**; required; text; shown when Is Graded = yes
- `certificationNumber` — **Certification Number**; required; text; shown when Is Graded = yes
- `photos` — **Photos**; required; image-upload
- `quantity` — **Quantity**; recommended; number
- `vehicleName` — **Vehicle Name**; required; text
- `brand` — **Brand**; recommended; dropdown
- `franchise` — **Franchise**; recommended; text
- `year` — **Year**; recommended; number
- `packagingType` — **Packaging Type**; required; dropdown
- `vehicleType` — **Vehicle Type**; recommended; dropdown
- `workingFeatures` — **Working Features**; recommended; dropdown
