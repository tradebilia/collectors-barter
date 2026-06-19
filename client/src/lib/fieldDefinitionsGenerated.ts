// Auto-generated field definitions from field_specifications.md
// DO NOT EDIT MANUALLY - regenerate using generate_production_fields.py

import type { FieldDefinition } from './formFieldDefinitions';

// Autographs - Collection/Lot
export const AUTOGRAPHS_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'numberOfSignedItems',
    label: 'Number of Signed Items',
    inputType: 'number',
    requirement: 'required',
  },
  {
    name: 'signersIncluded',
    label: 'Signers Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'authenticationIncluded',
    label: 'Authentication Included',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Mixed'],
  },
  {
    name: 'notableItems',
    label: 'Notable Items',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'itemTypesIncluded',
    label: 'Item Types Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
];

// Autographs - Signed Item
export const AUTOGRAPHS_SIGNED_ITEM_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'signer',
    label: 'Signer',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'signedItemType',
    label: 'Signed Item Type',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Photo', 'Card', 'Baseball', 'Football', 'Basketball', 'Hockey Puck', 'Jersey', 'Helmet', 'Bat', 'Glove', 'Book', 'Poster', 'Program', 'Ticket', 'Document', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Signed Item Type',
  },
  {
    name: 'autographCategory',
    label: 'Autograph Category',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Sports', 'Entertainment', 'Historical', 'Music', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Autograph Category',
  },
  {
    name: 'authenticationIncluded',
    label: 'Authentication Included',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'authenticationCompany',
    label: 'Authentication Company',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['PSA/DNA', 'JSA', 'Beckett Authentication Services'],
    conditionalLogic: 'Authentication Included = Yes',
  },
  {
    name: 'authenticationType',
    label: 'Authentication Type',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['COA (Card)', 'LOA (Letter)', 'Encapsulated (Slab)', 'Other'],
    conditionalLogic: 'Authentication Included = Yes',
    supportsOther: true,
    otherFieldName: 'Custom Authentication Type',
  },
  {
    name: 'certificateNumber',
    label: 'Certificate Number',
    inputType: 'text',
    requirement: 'optional',
    conditionalLogic: 'Authentication Included = Yes',
  },
  {
    name: 'inscriptionPresent',
    label: 'Inscription Present',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'inscriptionText',
    label: 'Inscription Text',
    inputType: 'text',
    requirement: 'optional',
    conditionalLogic: 'Inscription Present = Yes',
  },
];

// Coins - Coin Set
export const COINS_COIN_SET_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'setName',
    label: 'Set Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'country',
    label: 'Country',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'required',
  },
  {
    name: 'setType',
    label: 'Set Type',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Proof Set', 'Mint Set', 'Commemorative Set', 'Type Set', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Set Type',
  },
  {
    name: 'originalPackagingIncluded',
    label: 'Original Packaging Included',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
  {
    name: 'numberOfCoins',
    label: 'Number of Coins',
    inputType: 'number',
    requirement: 'recommended',
  },
];

// Coins - Collection/Lot
export const COINS_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'countriesIncluded',
    label: 'Countries Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'approximateCoinCount',
    label: 'Approximate Coin Count',
    inputType: 'number',
    requirement: 'required',
  },
  {
    name: 'yearsIncluded',
    label: 'Years Included',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'notableCoins',
    label: 'Notable Coins',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'includesGradedCoins',
    label: 'Includes Graded Coins',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No'],
  },
];

// Coins - Single Coin
export const COINS_SINGLE_COIN_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
    conditionalLogic: 'Is Graded = No',
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'country',
    label: 'Country',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'denomination',
    label: 'Denomination',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'required',
  },
  {
    name: 'mintMark',
    label: 'Mint Mark',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'variety',
    label: 'Variety',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'composition',
    label: 'Composition',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'weight',
    label: 'Weight',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'diameter',
    label: 'Diameter',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'gradingCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['PCGS', 'NGC', 'ANACS', 'ICG', 'SEGS', 'SGS'],
    conditionalLogic: 'Is Graded = Yes',
  },
  {
    name: 'grade',
    label: 'Grade',
    inputType: 'text',
    requirement: 'required',
    conditionalLogic: 'Is Graded = Yes',
  },
  {
    name: 'certificationNumber',
    label: 'Certification Number',
    inputType: 'text',
    requirement: 'required',
    conditionalLogic: 'Is Graded = Yes',
  },
];

// Comics - Collection/Lot
export const COMICS_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'numberOfComics',
    label: 'Number of Comics',
    inputType: 'number',
    requirement: 'required',
  },
  {
    name: 'publishersIncluded',
    label: 'Publishers Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'majorTitlesIncluded',
    label: 'Major Titles Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'yearsIncluded',
    label: 'Years Included',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'includesGradedComics',
    label: 'Includes Graded Comics',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No'],
  },
];

// Comics - Original Art
export const COMICS_ORIGINAL_ART_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'artistName',
    label: 'Artist Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'artworkTitle',
    label: 'Artwork Title',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'publisher',
    label: 'Publisher',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Marvel', 'DC', 'Image', 'Dark Horse', 'IDW', 'Boom', 'Archie', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Publisher',
  },
  {
    name: 'comicSeries',
    label: 'Comic Series',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'issueNumber',
    label: 'Issue Number',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'pageNumber',
    label: 'Page Number',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'artType',
    label: 'Art Type',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Cover Art', 'Splash Page', 'Interior Page', 'Published Commission', 'Unpublished Commission', 'Sketch', 'Sketch Card', 'Comic Strip', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Art Type',
  },
  {
    name: 'medium',
    label: 'Medium',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Pencil', 'Ink', 'Watercolor', 'Acrylic', 'Mixed Media', 'Digital Print', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Medium',
  },
  {
    name: 'yearCreated',
    label: 'Year Created',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'signedByArtist',
    label: 'Signed By Artist',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'coaIncluded',
    label: 'COA Included',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'dimensions',
    label: 'Dimensions',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'framed',
    label: 'Framed',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'originalPublishedPage',
    label: 'Original Published Page',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
];

// Comics - Single Comic
export const COMICS_SINGLE_COMIC_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
    conditionalLogic: 'Is Graded = No',
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'comicTitle',
    label: 'Comic Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'issueNumber',
    label: 'Issue Number',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'publisher',
    label: 'Publisher',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Marvel', 'DC', 'Image', 'Dark Horse', 'IDW', 'Boom', 'Archie', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Publisher',
  },
  {
    name: 'volume',
    label: 'Volume',
    inputType: 'text',
    requirement: 'optional',
  },
  {
    name: 'publicationYear',
    label: 'Publication Year',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'variantCover',
    label: 'Variant Cover',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Not Sure'],
  },
  {
    name: 'variantDescription',
    label: 'Variant Description',
    inputType: 'text',
    requirement: 'optional',
    conditionalLogic: 'Variant Cover = Yes',
  },
  {
    name: 'keyIssue',
    label: 'Key Issue',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
  {
    name: 'firstAppearance',
    label: 'First Appearance',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
  {
    name: 'signed',
    label: 'Signed',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
  {
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'gradingCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['CGC Comics', 'CBCS', 'PGX Comics'],
    conditionalLogic: 'Is Graded = Yes',
  },
  {
    name: 'grade',
    label: 'Grade',
    inputType: 'text',
    requirement: 'required',
    conditionalLogic: 'Is Graded = Yes',
  },
  {
    name: 'certificationNumber',
    label: 'Certification Number',
    inputType: 'text',
    requirement: 'required',
    conditionalLogic: 'Is Graded = Yes',
  },
  {
    name: 'numberOfSignatures',
    label: '# of Signatures',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    conditionalLogic: 'Signed = Yes',
  },
  {
    name: 'signatures',
    label: 'Signatures',
    inputType: 'textarea',
    requirement: 'optional',
    conditionalLogic: 'numberOfSignatures > 0',
  },
];

// Disney Pins - Collection/Lot
export const DISNEY_PINS_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'approximatePinCount',
    label: 'Approximate Pin Count',
    inputType: 'number',
    requirement: 'required',
  },
  {
    name: 'charactersIncluded',
    label: 'Characters Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'seriesIncluded',
    label: 'Series Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'limitedEditionPinsIncluded',
    label: 'Limited Edition Pins Included',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
  {
    name: 'apPpPinsIncluded',
    label: 'AP / PP Pins Included',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
  {
    name: 'backerCardsIncluded',
    label: 'Backer Cards Included',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No'],
  },
];

// Disney Pins - Individual Pin
export const DISNEY_PINS_INDIVIDUAL_PIN_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'pinName',
    label: 'Pin Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'character',
    label: 'Character',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'series',
    label: 'Series',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'pinTradingEvent',
    label: 'Pin Trading Event',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'limitedEdition',
    label: 'Limited Edition',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'openEdition',
    label: 'Open Edition',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'artistProof(Ap)',
    label: 'Artist Proof (AP)',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'preProduction(Pp)',
    label: 'Pre-Production (PP)',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'backstampInformation',
    label: 'Backstamp Information',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'backerCardIncluded',
    label: 'Backer Card Included',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No'],
  },
];

// Disney Pins - Pin Set
export const DISNEY_PINS_PIN_SET_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'setName',
    label: 'Set Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'numberOfPins',
    label: 'Number of Pins',
    inputType: 'number',
    requirement: 'required',
  },
  {
    name: 'completeSet',
    label: 'Complete Set',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'missingPins',
    label: 'Missing Pins',
    inputType: 'textarea',
    requirement: 'optional',
    conditionalLogic: 'Complete Set = No',
  },
  {
    name: 'limitedEdition',
    label: 'Limited Edition',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'charactersIncluded',
    label: 'Characters Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'series',
    label: 'Series',
    inputType: 'text',
    requirement: 'recommended',
  },
];

// Movies - Box Set
export const MOVIES_BOX_SET_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'boxSetName',
    label: 'Box Set Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'format',
    label: 'Format',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['DVD', 'Blu-ray', '4K UHD', 'VHS', 'LaserDisc', 'Mixed', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Format',
  },
  {
    name: 'numberOfMovies',
    label: 'Number of Movies',
    inputType: 'number',
    requirement: 'required',
  },
  {
    name: 'edition',
    label: 'Edition',
    inputType: 'text',
    requirement: 'optional',
  },
  {
    name: 'sealed',
    label: 'Sealed',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
];

// Movies - Collection/Lot
export const MOVIES_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'formatsIncluded',
    label: 'Formats Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'approximateQuantity',
    label: 'Approximate Quantity',
    inputType: 'number',
    requirement: 'required',
  },
  {
    name: 'notableTitles',
    label: 'Notable Titles',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'sealedItemsIncluded',
    label: 'Sealed Items Included',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No'],
  },
];

// Movies - Individual Movie
export const MOVIES_INDIVIDUAL_MOVIE_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
    conditionalLogic: 'Is Graded = No',
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'title',
    label: 'Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'format',
    label: 'Format',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['DVD', 'Blu-ray', '4K UHD', 'VHS', 'LaserDisc', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Format',
  },
  {
    name: 'releaseYear',
    label: 'Release Year',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'edition',
    label: 'Edition',
    inputType: 'text',
    requirement: 'optional',
  },
  {
    name: 'sealed',
    label: 'Sealed',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'region',
    label: 'Region',
    inputType: 'text',
    requirement: 'optional',
  },
  {
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'gradingCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['CGC Home Video', 'VHS Grading', 'IGS'],
    conditionalLogic: 'Is Graded = Yes',
  },
  {
    name: 'grade',
    label: 'Grade',
    inputType: 'text',
    requirement: 'required',
    conditionalLogic: 'Is Graded = Yes',
  },
  {
    name: 'certificationNumber',
    label: 'Certification Number',
    inputType: 'text',
    requirement: 'required',
    conditionalLogic: 'Is Graded = Yes',
  },
];

// Pokemon - Collection/Lot
export const POKEMON_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'approximateCardCount',
    label: 'Approximate Card Count',
    inputType: 'number',
    requirement: 'required',
  },
  {
    name: 'erasSeriesIncluded',
    label: 'Eras / Series Included',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Wizards of the Coast', 'EX', 'Diamond \& Pearl', 'Platinum', 'HeartGold SoulSilver', 'Black \& White', 'XY', 'Sun \& Moon', 'Sword \& Shield', 'Scarlet \& Violet', 'Mixed', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Era',
  },
  {
    name: 'notableCards',
    label: 'Notable Cards',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'includesGradedCards',
    label: 'Includes Graded Cards',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'bulkRareRatio',
    label: 'Bulk / Rare Ratio',
    inputType: 'text',
    requirement: 'optional',
  },
];

// Pokemon - Set
export const POKEMON_SET_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'setName',
    label: 'Set Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'completion',
    label: 'Completion',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Master Set', 'Complete (Base)', 'Near Complete', 'Incomplete'],
  },
  {
    name: 'notableCards',
    label: 'Notable Cards',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'includesGradedCards',
    label: 'Includes Graded Cards',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
];

// Pokemon - Unopened Product
export const POKEMON_UNOPENED_PRODUCT_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'productName',
    label: 'Product Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'setName',
    label: 'Set Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'productType',
    label: 'Product Type',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Booster Box', 'Elite Trainer Box', 'Blaster Box', 'Tin', 'Collection Box', 'Booster Pack', 'Build \& Battle Box', 'Premium Collection', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Product Type',
  },
  {
    name: 'era',
    label: 'Era',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Vintage (WOTC)', 'Mid-Era (EX/DP/BW/XY)', 'Modern (SM/SWSH/SV)', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Era',
  },
  {
    name: 'factorySealed',
    label: 'Factory Sealed',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'authenticated',
    label: 'Authenticated',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'authenticationCompany',
    label: 'Authentication Company',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['BBCE', 'PSA', 'iCert', 'RVP', 'Other'],
    conditionalLogic: 'Is Authenticated = Yes',
    supportsOther: true,
    otherFieldName: 'Authentication Company',
  },
  {
    name: 'fromASealedCase',
    label: 'From A Sealed Case',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No'],
    conditionalLogic: 'Is Authenticated = Yes',
  },
];

// Sports Cards - Collection/Lot
export const SPORTS_CARDS_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'sport',
    label: 'Sport',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Baseball', 'Basketball', 'Football', 'Hockey', 'Soccer', 'Racing', 'Wrestling', 'Golf', 'MMA', 'Tennis', 'Multi-Sport', 'Mixed', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Sport',
  },
  {
    name: 'approximateCardCount',
    label: 'Approximate Card Count',
    inputType: 'number',
    requirement: 'required',
  },
  {
    name: 'yearsIncluded',
    label: 'Years Included',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'manufacturersIncluded',
    label: 'Manufacturers Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'notablePlayers',
    label: 'Notable Players',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'notableCards',
    label: 'Notable Cards',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'includesGradedCards',
    label: 'Includes Graded Cards',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No'],
  },
];

// Sports Cards - Set
export const SPORTS_CARDS_SET_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'sport',
    label: 'Sport',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Baseball', 'Basketball', 'Football', 'Hockey', 'Soccer', 'Racing', 'Wrestling', 'Golf', 'MMA', 'Tennis', 'Multi-Sport', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Sport',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'required',
  },
  {
    name: 'manufacturer',
    label: 'Manufacturer',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Topps', 'Bowman', 'Panini', 'Upper Deck', 'Fleer', 'Donruss', 'Score', 'Leaf', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Manufacturer',
  },
  {
    name: 'setName',
    label: 'Set Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'setType',
    label: 'Set Type',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Factory Set', 'Complete Hand-Collated Set', 'Partial Set'],
  },
  {
    name: 'missingCards',
    label: 'Missing Cards',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No'],
    conditionalLogic: 'Set Type = Partial Set',
  },
  {
    name: 'missingCardDetails',
    label: 'Missing Card Details',
    inputType: 'textarea',
    requirement: 'optional',
    conditionalLogic: 'Missing Cards = Yes',
  },
];

// Sports Cards - Single Card
export const SPORTS_CARDS_SINGLE_CARD_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
    conditionalLogic: 'Is Graded = No',
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'sport',
    label: 'Sport',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Baseball', 'Basketball', 'Football', 'Hockey', 'Soccer', 'Racing', 'Wrestling', 'Golf', 'MMA', 'Tennis', 'Multi-Sport', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Sport',
  },
  {
    name: 'player',
    label: 'Player',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'required',
  },
  {
    name: 'manufacturer',
    label: 'Manufacturer',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Topps', 'Bowman', 'Panini', 'Upper Deck', 'Fleer', 'Donruss', 'Score', 'Leaf', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Manufacturer',
  },
  {
    name: 'setName',
    label: 'Set Name',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'cardNumber',
    label: 'Card Number',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'parallelVariation',
    label: 'Parallel / Variation',
    inputType: 'text',
    requirement: 'optional',
  },
  {
    name: 'rookieCard',
    label: 'Rookie Card',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'autograph',
    label: 'Autograph',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'relicMemorabilia',
    label: 'Relic / Memorabilia',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'serialNumbered',
    label: 'Serial Numbered',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'serialNumber',
    label: 'Serial Number',
    inputType: 'text',
    requirement: 'optional',
    conditionalLogic: 'Serial Numbered = Yes',
  },
  {
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'gradingCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['PSA', 'BGS', 'SGC', 'CGC Cards', 'TAG Grading', 'HGA', 'Arena Club', 'Degree', 'ACE', 'ISA', 'GMA', 'Rare Edition', 'FCG', 'MNT', 'KSA', 'PGA', 'RCG', 'OnlyGraded', 'Diamond Service Grading', 'CGA Card Grading', 'TRCG', 'Pokegrade', 'Tree Frog', 'AP', 'PRO', 'GEM', 'GAI', 'PCI', 'WCG'],
    conditionalLogic: 'Is Graded = Yes',
  },
  {
    name: 'grade',
    label: 'Grade',
    inputType: 'text',
    requirement: 'required',
    conditionalLogic: 'Is Graded = Yes',
  },
  {
    name: 'certificationNumber',
    label: 'Certification Number',
    inputType: 'text',
    requirement: 'required',
    conditionalLogic: 'Is Graded = Yes',
  },
];

// Sports Cards - Unopened Product
export const SPORTS_CARDS_UNOPENED_PRODUCT_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'sport',
    label: 'Sport',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Baseball', 'Basketball', 'Football', 'Hockey', 'Soccer', 'Racing', 'Wrestling', 'Golf', 'MMA', 'Tennis', 'Multi-Sport', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Sport',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'required',
  },
  {
    name: 'manufacturer',
    label: 'Manufacturer',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Topps', 'Bowman', 'Panini', 'Upper Deck', 'Fleer', 'Donruss', 'Score', 'Leaf', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Manufacturer',
  },
  {
    name: 'productName',
    label: 'Product Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'productFormat',
    label: 'Product Format',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Pack', 'Rack Pack', 'Box', 'Case'],
  },
  {
    name: 'productType',
    label: 'Product Type',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Hobby', 'Jumbo', 'Retail', 'Blaster', 'Mega', 'Hanger', 'Cello', 'Rack', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Product Type',
  },
  {
    name: 'factorySealed',
    label: 'Factory Sealed',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'authenticated',
    label: 'Authenticated',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'authenticationCompany',
    label: 'Authentication Company',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['BBCE', 'PSA', 'iCert', 'RVP', 'Other'],
    conditionalLogic: 'Is Authenticated = Yes',
    supportsOther: true,
    otherFieldName: 'Custom Authentication Company',
  },
  {
    name: 'fromASealedCase',
    label: 'From A Sealed Case',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No'],
    conditionalLogic: 'Is Authenticated = Yes',
  },
];

// Stamps - Collection/Lot
export const STAMPS_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'countriesIncluded',
    label: 'Countries Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'approximateQuantity',
    label: 'Approximate Quantity',
    inputType: 'number',
    requirement: 'required',
  },
  {
    name: 'yearsIncluded',
    label: 'Years Included',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'albumIncluded',
    label: 'Album Included',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'notableStamps',
    label: 'Notable Stamps',
    inputType: 'textarea',
    requirement: 'recommended',
  },
];

// Stamps - Single Stamp
export const STAMPS_SINGLE_STAMP_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
    conditionalLogic: 'Is Graded = No',
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'country',
    label: 'Country',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'scottNumberOrDescription',
    label: 'Scott Number or Description',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'denomination',
    label: 'Denomination',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'mintOrUsed',
    label: 'Mint or Used',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Used', 'Unused', 'CTO', 'Unknown'],
  },
  {
    name: 'hinged',
    label: 'Hinged',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Never Hinged', 'Hinged', 'Hinge Remnant', 'Unknown'],
  },
  {
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'gradingCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['PSE', 'ASG', 'PSAG'],
    conditionalLogic: 'Is Graded = yes',
  },
  {
    name: 'grade',
    label: 'Grade',
    inputType: 'text',
    requirement: 'required',
    conditionalLogic: 'Is Graded = Yes',
  },
  {
    name: 'certificationNumber',
    label: 'Certification Number',
    inputType: 'text',
    requirement: 'required',
    conditionalLogic: 'Is Graded = Yes',
  },
];

// Stamps - Stamp Set / Sheet
export const STAMPS_STAMP_SET_SHEET_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
    conditionalLogic: 'Is Graded = No',
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'country',
    label: 'Country',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'setNameDescription',
    label: 'Set Name / Description',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'sheetType',
    label: 'Sheet Type',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Set', 'Sheet', 'Souvenir Sheet', 'Block', 'First Day Cover', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Sheet Type',
  },
  {
    name: 'numberOfStamps',
    label: 'Number of Stamps',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'mintOrUsed',
    label: 'Mint or Used',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Mint', 'Used', 'Mixed', 'Unknown'],
  },
];

// Video Games - Accessory
export const VIDEO_GAMES_ACCESSORY_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'accessoryType',
    label: 'Accessory Type',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'platform',
    label: 'Platform',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['NES', 'SNES', 'N64', 'GameCube', 'Wii', 'Wii U', 'Switch', 'PlayStation', 'Xbox', 'Sega', 'PC', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Platform',
  },
  {
    name: 'manufacturer',
    label: 'Manufacturer',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Nintendo', 'Sony', 'Microsoft', 'Sega', 'Logitech', 'Mad Catz', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Manufacturer',
  },
  {
    name: 'workingCondition',
    label: 'Working Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Working', 'Not Working', 'Untested'],
  },
  {
    name: 'region',
    label: 'Region',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['NTSC-U', 'NTSC-J', 'PAL', 'Region Free', 'Unknown', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Region',
  },
  {
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'gradingCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['WATA', 'CGC Video Games', 'VGA', 'CGC Home Video', 'IGS'],
    conditionalLogic: 'Is Graded = Yes',
  },
  {
    name: 'grade',
    label: 'Grade',
    inputType: 'text',
    requirement: 'required',
    conditionalLogic: 'Is Graded = Yes',
  },
  {
    name: 'certificationNumber',
    label: 'Certification Number',
    inputType: 'text',
    requirement: 'required',
    conditionalLogic: 'Is Graded = Yes',
  },
];

// Video Games - Collection/Lot
export const VIDEO_GAMES_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'platformsIncluded',
    label: 'Platforms Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'approximateItemCount',
    label: 'Approximate Item Count',
    inputType: 'number',
    requirement: 'required',
  },
  {
    name: 'notableGamesConsoles',
    label: 'Notable Games / Consoles',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'includesGradedGames',
    label: 'Includes Graded Games',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No'],
  },
];

// Video Games - Console
export const VIDEO_GAMES_CONSOLE_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'consoleName',
    label: 'Console Name',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['NES', 'SNES', 'N64', 'GameCube', 'Wii', 'Wii U', 'Switch', 'Switch 2', 'Sega Genesis', 'Sega Saturn', 'Dreamcast', 'PS1', 'PS2', 'PS3', 'PS4', 'PS5', 'Xbox', 'Xbox 360', 'Xbox One', 'Xbox Series X/S', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Console Name',
  },
  {
    name: 'modelNumber',
    label: 'Model Number',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'region',
    label: 'Region',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['NTSC-U', 'NTSC-J', 'PAL', 'Region Free', 'Unknown', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Region',
  },
  {
    name: 'workingCondition',
    label: 'Working Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Working', 'Not Working', 'Untested'],
  },
  {
    name: 'originalBoxIncluded',
    label: 'Original Box Included',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'cablesIncluded',
    label: 'Cables Included',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'controllersIncluded',
    label: 'Controllers Included',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'gradingCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['WATA Games (PSA Video Games)', 'CGC Video Games', 'VGA', 'CGC Home Video', 'IGS'],
    conditionalLogic: 'Is Graded =',
  },
  {
    name: 'grade',
    label: 'Grade',
    inputType: 'text',
    requirement: 'required',
    conditionalLogic: 'Is Graded = Yes',
  },
  {
    name: 'certificationNumber',
    label: 'Certification Number',
    inputType: 'text',
    requirement: 'required',
    conditionalLogic: 'Is Graded = Yes',
  },
];

// Video Games - Game
export const VIDEO_GAMES_GAME_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
    conditionalLogic: 'Is Graded = No',
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'gameTitle',
    label: 'Game Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'platform',
    label: 'Platform',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['NES', 'SNES', 'N64', 'GameCube', 'Wii', 'Wii U', 'Switch', 'Switch 2', 'Sega Master System', 'Genesis', 'Saturn', 'Dreamcast', 'PS1', 'PS2', 'PS3', 'PS4', 'PS5', 'Xbox', 'Xbox 360', 'Xbox One', 'Xbox Series X/S', 'PC', 'Other'],
    supportsOther: true,
    otherFieldName: 'Platform Name',
  },
  {
    name: 'releaseYear',
    label: 'Release Year',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'region',
    label: 'Region',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['NTSC-U', 'NTSC-J', 'PAL', 'Region Free', 'Unknown', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Region',
  },
  {
    name: 'completeInBox',
    label: 'Complete In Box',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
  {
    name: 'manualIncluded',
    label: 'Manual Included',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
    conditionalLogic: 'Complete In Box = No',
  },
  {
    name: 'originalCaseIncluded',
    label: 'Original Case Included',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
    conditionalLogic: 'Complete In Box = No',
  },
  {
    name: 'sealed',
    label: 'Sealed',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'gradingCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['WATA Games (PSA Video Games)', 'CGC Video Games', 'VGA', 'CGC Home Video', 'IGS'],
    conditionalLogic: 'Is Graded = Yes',
  },
  {
    name: 'grade',
    label: 'Grade',
    inputType: 'text',
    requirement: 'required',
    conditionalLogic: 'Is Graded = Yes',
  },
  {
    name: 'certificationNumber',
    label: 'Certification Number',
    inputType: 'text',
    requirement: 'required',
    conditionalLogic: 'Is Graded = Yes',
  },
];

// Vintage Toys - Action Figure / Doll
export const VINTAGE_TOYS_ACTION_FIGURE_DOLL_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
    conditionalLogic: 'Is Graded = No',
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'toyName',
    label: 'Toy Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'brand',
    label: 'Brand',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Hasbro', 'Mattel', 'Kenner', 'Playmates', 'Bandai', 'LEGO', 'Milton Bradley', 'Parker Brothers', 'Fisher-Price', 'Ty', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Brand',
  },
  {
    name: 'franchise',
    label: 'Franchise',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'character',
    label: 'Character',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'packagingType',
    label: 'Packaging Type',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Loose', 'Carded', 'Boxed', 'Sealed', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Packaging Type',
  },
  {
    name: 'complete',
    label: 'Complete',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
  {
    name: 'accessoriesIncluded',
    label: 'Accessories Included',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
  {
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'gradingCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['AFA', 'CAS', 'UKG', 'Other'],
    conditionalLogic: 'Is Graded = Yes',
    supportsOther: true,
    otherFieldName: 'Custom Grading Company',
  },
  {
    name: 'grade',
    label: 'Grade',
    inputType: 'text',
    requirement: 'required',
    conditionalLogic: 'Is Graded = Yes',
  },
  {
    name: 'certificationNumber',
    label: 'Certification Number',
    inputType: 'text',
    requirement: 'required',
    conditionalLogic: 'Is Graded = Yes',
  },
];

// Vintage Toys - Board Game / Puzzle
export const VINTAGE_TOYS_BOARD_GAME_PUZZLE_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'gamePuzzleName',
    label: 'Game / Puzzle Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'publisherBrand',
    label: 'Publisher / Brand',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Milton Bradley', 'Parker Brothers', 'Hasbro', 'Mattel', 'Ideal', 'Avalon Hill', 'TSR', 'Games Workshop', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Publisher / Brand',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'numberOfPieces',
    label: 'Number of Pieces',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'complete',
    label: 'Complete',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
  {
    name: 'missingPieces',
    label: 'Missing Pieces',
    inputType: 'textarea',
    requirement: 'optional',
    conditionalLogic: 'Complete = No',
  },
  {
    name: 'instructionsIncluded',
    label: 'Instructions Included',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'boxIncluded',
    label: 'Box Included',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
];

// Vintage Toys - Collection/Lot
export const VINTAGE_TOYS_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'approximateItemCount',
    label: 'Approximate Item Count',
    inputType: 'number',
    requirement: 'required',
  },
  {
    name: 'brandsIncluded',
    label: 'Brands Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'franchisesIncluded',
    label: 'Franchises Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'notableItems',
    label: 'Notable Items',
    inputType: 'textarea',
    requirement: 'recommended',
  },
];

// Vintage Toys - Electronic Toy
export const VINTAGE_TOYS_ELECTRONIC_TOY_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'toyName',
    label: 'Toy Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'brand',
    label: 'Brand',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Hasbro', 'Mattel', 'Milton Bradley', 'Tiger Electronics', 'Coleco', 'Radio Shack', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Brand',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'tested',
    label: 'Tested',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'workingCondition',
    label: 'Working Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Working', 'Partially Working', 'Not Working', 'Untested'],
  },
  {
    name: 'batteryCompartmentCondition',
    label: 'Battery Compartment Condition',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Clean', 'Light Corrosion', 'Heavy Corrosion', 'Missing Cover', 'Unknown'],
  },
  {
    name: 'soundWorks',
    label: 'Sound Works',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
  {
    name: 'lightsWork',
    label: 'Lights Work',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
];

// Vintage Toys - Model / Kit
export const VINTAGE_TOYS_MODEL_KIT_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'modelKitName',
    label: 'Model / Kit Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'brand',
    label: 'Brand',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Revell', 'Monogram', 'AMT', 'Tamiya', 'LEGO', 'MPC', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Brand',
  },
  {
    name: 'scale',
    label: 'Scale',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'builtOrUnbuilt',
    label: 'Built or Unbuilt',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Built', 'Unbuilt', 'Partially Built', 'Unknown'],
  },
  {
    name: 'complete',
    label: 'Complete',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
  {
    name: 'instructionsIncluded',
    label: 'Instructions Included',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
];

// Vintage Toys - Playset
export const VINTAGE_TOYS_PLAYSET_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'playsetName',
    label: 'Playset Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'brand',
    label: 'Brand',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Hasbro', 'Mattel', 'Kenner', 'Playmates', 'LEGO', 'Fisher-Price', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Brand',
  },
  {
    name: 'franchise',
    label: 'Franchise',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'complete',
    label: 'Complete',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
  {
    name: 'missingPieces',
    label: 'Missing Pieces',
    inputType: 'textarea',
    requirement: 'optional',
    conditionalLogic: 'Complete = No',
  },
  {
    name: 'instructionsIncluded',
    label: 'Instructions Included',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
  {
    name: 'originalBoxIncluded',
    label: 'Original Box Included',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
];

// Vintage Toys - Plush / Stuffed Toy
export const VINTAGE_TOYS_PLUSH_STUFFED_TOY_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'toyNameCharacter',
    label: 'Toy Name / Character',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'brand',
    label: 'Brand',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Ty', 'Disney', 'Gund', 'Applause', 'Fisher-Price', 'Mattel', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Brand',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'tagsAttached',
    label: 'Tags Attached',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
  {
    name: 'cleanlinessOdorNotes',
    label: 'Cleanliness / Odor Notes',
    inputType: 'textarea',
    requirement: 'optional',
  },
];

// Vintage Toys - Vehicle
export const VINTAGE_TOYS_VEHICLE_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'vehicleName',
    label: 'Vehicle Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'brand',
    label: 'Brand',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Hot Wheels', 'Matchbox', 'Kenner', 'Hasbro', 'Mattel', 'Tonka', 'Bandai', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Brand',
  },
  {
    name: 'franchise',
    label: 'Franchise',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'packagingType',
    label: 'Packaging Type',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Loose', 'Carded', 'Boxed', 'Sealed', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Packaging Type',
  },
  {
    name: 'vehicleType',
    label: 'Vehicle Type',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Car', 'Truck', 'Aircraft', 'Spaceship', 'Boat', 'Motorcycle', 'Train', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Vehicle Type',
  },
  {
    name: 'workingFeatures',
    label: 'Working Features',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
];

// Coins - Paper Money / Banknotes
export const COINS_PAPER_MONEY_BANKNOTES_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
    conditionalLogic: 'Is Graded = No',
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'country',
    label: 'Country',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'denomination',
    label: 'Denomination',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'required',
  },
  {
    name: 'serialNumber',
    label: 'Serial Number',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'signature',
    label: 'Signature',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'gradingCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['PCGS', 'PMG', 'ANACS', 'ICG'],
    conditionalLogic: 'Is Graded = Yes',
  },
  {
    name: 'grade',
    label: 'Grade',
    inputType: 'text',
    requirement: 'required',
    conditionalLogic: 'Is Graded = Yes',
  },
  {
    name: 'certificationNumber',
    label: 'Certification Number',
    inputType: 'text',
    requirement: 'required',
    conditionalLogic: 'Is Graded = Yes',
  },
];

// Pokemon - Single Card
export const POKEMON_SINGLE_CARD_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
    conditionalLogic: 'Is Graded = No',
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
  },

  {
    name: 'pokemonName',
    label: 'Pokemon Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'cardNumber',
    label: 'Card Number',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'setName',
    label: 'Set Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'setSymbol',
    label: 'Set Symbol',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'cardType',
    label: 'Card Type',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Holo', 'Reverse Holo', 'Non-Holo', 'Full Art', 'Secret Rare'],
  },
  {
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'gradingCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['PSA', 'BGS', 'CGC', 'SGC'],
    conditionalLogic: 'Is Graded = Yes',
  },
  {
    name: 'grade',
    label: 'Grade',
    inputType: 'text',
    requirement: 'required',
    conditionalLogic: 'Is Graded = Yes',
  },
  {
    name: 'certificationNumber',
    label: 'Certification Number',
    inputType: 'text',
    requirement: 'required',
    conditionalLogic: 'Is Graded = Yes',
  },
];
