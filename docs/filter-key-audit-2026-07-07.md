# Filter Key Audit — 2026-07-07

Comparison of backend filter keys (server/db.ts getMarketplaceFeed) vs actual itemDetails keys stored by the new inventory form.

## Actual itemDetails keys stored per category (from live DB)

| Category | Item Types Seen | Stored Keys |
|---|---|---|
| comics | single_comic | certificationCompany, certificationNumber, characterName, comicTitle, firstAppearance, isGraded, issueNumber, keyIssue, numberOfSignatures, publicationYear, publisher, quantity, shippingAvailable, signatures, signed, variantCover, variantDescription, volume |
| sports_cards | single_card | autograph, cardNumber, certificationNumber, customManufacturer, isGraded, manufacturer, player, quantity, relicMemorabilia, rookieCard, serialNumbered, setName, shippingAvailable, sport, year |
| coins | collection_lot | approximateCoinCount, countriesIncluded, country, includesGradedCoins, notableCoins, shippingAvailable, yearsIncluded |
| stamps | single_stamp | certificationNumber, country, denomination, hinged, isGraded, mintOrUsed, quantity, shippingAvailable, year |
| video_games | game | certificationNumber, completeInBox, customGradingCompany, gameTitle, isGraded, platform, quantity, region, releaseYear, sealed, shippingAvailable |
| movies | individual_movie | certificationNumber, format, isGraded, quantity, region, releaseYear, sealed, shippingAvailable, title |
| autographs | signed_item | authenticationCompany, authenticationIncluded, authenticationType, autographCategory, certificateNumber, customAuthenticationCompany, inscriptionPresent, quantity, shippingAvailable, signedItemType, signer |
| vintage_toys | action_figure | accessoriesIncluded, brand, certificationNumber, complete, franchise, isGraded, packagingType, quantity, shippingAvailable, toyName, year |
| disney_pins | single_pin | artistProof, backerCardIncluded, backstampInformation, character, limitedEdition, openEdition, pinName, preProduction, quantity, shippingAvailable |
| pokemon | single_card | cardName, cardNumber, certificationNumber, customRarity, editionEra, finishVariant, isGraded, language, quantity, rarity, setName, shippingAvailable, specialAttributes |

## Backend filter keys (before fix) vs actual keys

| Filter param | JSON key queried | Actual stored key | Status |
|---|---|---|---|
| issueNumber | issueNumber | issueNumber (comics) | OK |
| manufacturer | manufacturer | manufacturer (sports_cards) | OK |
| year | year | year (sports_cards, stamps, vintage_toys); releaseYear (video_games, movies); publicationYear (comics); yearsIncluded (coins) | PARTIAL — needs multi-key |
| team | team | NOT STORED (no team field in new form) | BROKEN — field no longer exists |
| series | set | setName (sports_cards, pokemon) | BROKEN — key renamed |
| sport | sport | sport (sports_cards) | OK |
| rookie | rookie | rookieCard | BROKEN — key renamed |
| autographed | autographed | autograph | BROKEN — key renamed |
| signed | signed | signed (comics) | OK |
| facsimile | facsimile | NOT STORED separately (form may store under signatures/signed types) | BROKEN in practice |
| gradingService | certificationCompany column | certificationCompany column (top-level) | OK |
| grade | grade column | grade column (top-level) | OK |
| valueMin/valueMax | estimatedValue column | estimatedValue column | OK — but only wired on 2 categories in UI |

## Additional notes

- JSON_CONTAINS requires exact value match; several filters would benefit from LIKE-style partial matching (e.g. manufacturer "Topps" vs stored "Topps Chrome"). Fixed by switching to JSON_EXTRACT + LIKE where appropriate.
- Value Range UI existed only on comics and sports_cards; now added to all 10 categories.
