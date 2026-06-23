/**
 * Field Definitions for Remaining Categories
 * Coins, Stamps, Video Games, Movies, Autographs, Vintage Toys, Disney Pins
 */

import { FieldDefinition, COMMON_FIELDS, GRADING_COMPANIES_BY_CATEGORY } from './formFieldDefinitions';
import { COUNTRIES_LIST } from './countries';

// ============================================================================
// COINS
// ============================================================================

const COINS_SINGLE_COIN_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'country',
    label: 'Country',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: COUNTRIES_LIST,
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    maxLength: 10,
    requirement: 'required',
    validation: { min: 1800, max: 2100 },
  },
  {
    name: 'denomination',
    label: 'Denomination',
    inputType: 'text',
    maxLength: 10,
    requirement: 'required',
  },
  {
    name: 'mintMark',
    label: 'Mint Mark',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'metalComposition',
    label: 'Metal Composition',
    inputType: 'text',
    requirement: 'recommended',
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
  },
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.coins,
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

const COINS_COIN_SET_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'setName',
    label: 'Set Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'coinCount',
    label: 'Coin Count',
    inputType: 'number',
    requirement: 'required',
    validation: { min: 1 },
  },
  {
    name: 'country',
    label: 'Country',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: COUNTRIES_LIST,
  },
  {
    name: 'yearRange',
    label: 'Year Range',
    inputType: 'text',
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
    name: 'complete',
    label: 'Complete',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
  {
    name: 'originalPackaging',
    label: 'Original Packaging',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
];

const COINS_PAPER_MONEY_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'country',
    label: 'Country',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: COUNTRIES_LIST,
  },
  {
    name: 'denomination',
    label: 'Denomination',
    inputType: 'text',
    maxLength: 10,
    requirement: 'required',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    maxLength: 10,
    requirement: 'required',
  },
  {
    name: 'currencyType',
    label: 'Currency Type',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Paper Money', 'Banknote', 'Currency Note', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Currency Type',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'serialNumber',
    label: 'Serial Number',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'rareVariant',
    label: 'Rare Variant',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
];

const COINS_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'approximateItemCount',
    label: 'Approximate Item Count',
    inputType: 'number',
    requirement: 'required',
    validation: { min: 1 },
  },
  {
    name: 'countriesIncluded',
    label: 'Countries Included',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'notableItems',
    label: 'Notable Items',
    inputType: 'text',
    requirement: 'recommended',
  },
];

// ============================================================================
// STAMPS
// ============================================================================

const STAMPS_SINGLE_STAMP_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'country',
    label: 'Country',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: COUNTRIES_LIST,
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    maxLength: 10,
    requirement: 'required',
    validation: { min: 1800, max: 2100 },
  },
  {
    name: 'denomination',
    label: 'Denomination',
    inputType: 'text',
    maxLength: 10,
    requirement: 'required',
  },
  {
    name: 'mintOrUsed',
    label: 'Mint or Used',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Used', 'Unused', 'CTO', 'Unknown'],
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
  },
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.stamps,
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

const STAMPS_STAMP_SET_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'country',
    label: 'Country',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: COUNTRIES_LIST,
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    maxLength: 10,
    requirement: 'required',
    validation: { min: 1800, max: 2100 },
  },
  {
    name: 'stampCount',
    label: 'Stamp Count',
    inputType: 'number',
    requirement: 'required',
    validation: { min: 1 },
  },
  {
    name: 'mintOrUsed',
    label: 'Mint or Used',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Used', 'Mixed', 'Unknown'],
  },
];

const STAMPS_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'approximateStampCount',
    label: 'Approximate Stamp Count',
    inputType: 'number',
    requirement: 'recommended',
    validation: { min: 1 },
  },
  {
    name: 'countries',
    label: 'Countries Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
];

// ============================================================================
// VIDEO GAMES
// ============================================================================

const VIDEO_GAMES_GAME_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
    conditionalLogic: 'Is Graded = No',
  },
  COMMON_FIELDS.PHOTOS_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
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
    gridColumn: 'half',
  },
  {
    name: 'customRegion',
    label: 'Custom Region',
    inputType: 'text',
    requirement: 'recommended',
    conditionalLogic: 'Region = Other',
    gridColumn: 'half',
  },
  {
    name: 'completeInBox',
    label: 'Complete In Box',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
  {
    name: 'originalCaseIncluded',
    label: 'Original Case Included',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
    conditionalLogic: 'Complete In Box = No',
  },
  {
    name: 'manualIncluded',
    label: 'Manual Included',
    inputType: 'dropdown',
    requirement: 'recommended',
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
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: ['WATA Games (PSA Video Games)', 'CGC Video Games', 'VGA', 'CGC Home Video', 'IGS'],
    conditionalLogic: 'Is Graded = Yes',
  },
  {
    name: 'grade',
    label: 'Grade',
    inputType: 'text',
    maxLength: 4,
    requirement: 'required',
    conditionalLogic: 'Is Graded = Yes',
  },
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  COMMON_FIELDS.DESCRIPTION_FIELD,
];

const VIDEO_GAMES_CONSOLE_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  COMMON_FIELDS.PHOTOS_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  {
    name: 'consoleName',
    label: 'Console Name',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['NES', 'SNES', 'N64', 'GameCube', 'Wii', 'Wii U', 'Switch', 'Switch 2', 'Sega Genesis', 'Sega Saturn', 'Dreamcast', 'PS1', 'PS2', 'PS3', 'PS4', 'PS5', 'Xbox', 'Xbox 360', 'Xbox One', 'Xbox Series X/S', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Console',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'workingCondition',
    label: 'Working Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Fully Working', 'Partially Working', 'Not Working', 'Unknown'],
  },
  {
    name: 'modelNumber',
    label: 'Model Number',
    inputType: 'text',
    requirement: 'recommended',
  },

  {
    name: 'controllersIncluded',
    label: 'Controllers Included',
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
    name: 'region',
    label: 'Region',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['NTSC-U', 'NTSC-J', 'PAL', 'Region Free', 'Unknown', 'Other'],
    gridColumn: 'half',
  },
  {
    name: 'customRegion',
    label: 'Custom Region',
    inputType: 'text',
    requirement: 'recommended',
    conditionalLogic: 'Region = Other',
    gridColumn: 'half',
  },
  {
    name: 'originalBoxIncluded',
    label: 'Original Box Included',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  COMMON_FIELDS.DESCRIPTION_FIELD,
];

const VIDEO_GAMES_ACCESSORY_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'accessoryName',
    label: 'Accessory Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'platform',
    label: 'Platform',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['NES', 'SNES', 'N64', 'GameCube', 'Wii', 'Wii U', 'Switch', 'Switch 2', 'Sega Genesis', 'Sega Saturn', 'Dreamcast', 'PS1', 'PS2', 'PS3', 'PS4', 'PS5', 'Xbox', 'Xbox 360', 'Xbox One', 'Xbox Series X/S', 'Other'],
    supportsOther: true,
  },
  {
    name: 'accessoryType',
    label: 'Accessory Type',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Controller', 'Cable', 'Adapter', 'Stand', 'Carrying Case', 'Charging Dock', 'Memory Card', 'Battery', 'Other'],
    supportsOther: true,
  },
  {
    name: 'workingCondition',
    label: 'Working Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Fully Functional', 'Partially Functional', 'Not Functional'],
  },
  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
    defaultValue: '1',
  },
  {
    name: 'originalPackaging',
    label: 'Original Packaging',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
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
];

const VIDEO_GAMES_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'approximateItemCount',
    label: 'Approximate Item Count',
    inputType: 'number',
    requirement: 'required',
    validation: { min: 1 },
  },
  {
    name: 'platformsIncluded',
    label: 'Platforms Included',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'notableGamesConsoles',
    label: 'Notable Games/Consoles',
    inputType: 'text',
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

// ============================================================================
// MOVIES
// ============================================================================

const MOVIES_INDIVIDUAL_MOVIE_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'movieTitle',
    label: 'Movie Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'format',
    label: 'Format',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['VHS', 'DVD', 'Blu-ray', 'LaserDisc', 'UHD', '4K'],
  },
  {
    name: 'releaseYear',
    label: 'Release Year',
    inputType: 'number',
    requirement: 'required',
    validation: { min: 1900, max: 2100 },
  },
  {
    name: 'edition',
    label: 'Edition',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'language',
    label: 'Language',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['English', 'Spanish', 'French', 'German', 'Italian', 'Japanese', 'Chinese', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Language',
  },
  {
    name: 'sealed',
    label: 'Sealed',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
];

const MOVIES_BOX_SET_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'setName',
    label: 'Set Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'numberOfItems',
    label: 'Number of Items',
    inputType: 'number',
    requirement: 'required',
    validation: { min: 1 },
  },
  {
    name: 'format',
    label: 'Format',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['VHS', 'DVD', 'Blu-ray', 'LaserDisc', 'UHD', '4K'],
  },
  {
    name: 'complete',
    label: 'Complete',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
  {
    name: 'originalPackaging',
    label: 'Original Packaging',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
];

const MOVIES_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'approximateItemCount',
    label: 'Approximate Item Count',
    inputType: 'number',
    requirement: 'required',
    validation: { min: 1 },
  },
  {
    name: 'formatsIncluded',
    label: 'Formats Included',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'notableItems',
    label: 'Notable Items',
    inputType: 'text',
    requirement: 'recommended',
  },
];

// ============================================================================
// AUTOGRAPHS
// ============================================================================

const AUTOGRAPHS_SIGNED_ITEM_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
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
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'authenticationCompany',
    label: 'Authentication Company',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['PSA/DNA', 'JSA', 'Beckett Authentication Services'],
    conditionalLogic: 'Authentication Included = Yes',
  },
  {
    name: 'authenticationType',
    label: 'Authentication Type',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['COA (Card)', 'LOA (Letter)', 'Encapsulated (Slab)', 'Other'],
    conditionalLogic: 'Authentication Included = Yes',
    supportsOther: true,
    otherFieldName: 'Custom Authentication Type',
  },
  {
    name: 'certificateNumber',
    label: 'Certificate Number',
    inputType: 'text',
    requirement: 'required',
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
    gridColumn: 'third',
  },
];

const AUTOGRAPHS_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
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

// ============================================================================
// VINTAGE TOYS
// ============================================================================

const VINTAGE_TOYS_ACTION_FIGURE_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  COMMON_FIELDS.CONDITION_FIELD,
  {
    name: 'toyNameCharacter',
    label: 'Toy Name/Character',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'packagingType',
    label: 'Packaging Type',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Original Box', 'Loose', 'Bagged', 'Other'],
  },

  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
    defaultValue: '1',
    maxLength: 3,
  },
  {
    name: 'brand',
    label: 'Brand',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Hasbro', 'Mattel', 'Kenner', 'Playmates', 'Bandai', 'LEGO', 'Milton Bradley', 'Parker Brothers', 'Fisher-Price', 'Ty', 'Other'],
    conditionalLogic: 'brand = Other',
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
    maxLength: 10,
    requirement: 'recommended',
    validation: { min: 1900, max: 2100 },
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
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: [...GRADING_COMPANIES_BY_CATEGORY.vintage_toys, 'Other'],
    conditionalLogic: 'gradingCompany = Other',
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

const VINTAGE_TOYS_VEHICLE_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'vehicleName',
    label: 'Vehicle Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'franchise',
    label: 'Franchise',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    maxLength: 10,
    requirement: 'recommended',
    validation: { min: 1900, max: 2100 },
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
  },
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.vintage_toys,
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

const VINTAGE_TOYS_PLAYSET_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'playsetName',
    label: 'Playset Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'franchise',
    label: 'Franchise',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    maxLength: 10,
    requirement: 'recommended',
    validation: { min: 1900, max: 2100 },
  },
  {
    name: 'completeInBox',
    label: 'Complete In Box',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
];

const VINTAGE_TOYS_BOARD_GAME_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'gameName',
    label: 'Game Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    maxLength: 10,
    requirement: 'recommended',
    validation: { min: 1900, max: 2100 },
  },
  {
    name: 'completeInBox',
    label: 'Complete In Box',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
];

const VINTAGE_TOYS_ELECTRONIC_TOY_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'toyName',
    label: 'Toy Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'brand',
    label: 'Brand',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    maxLength: 10,
    requirement: 'recommended',
    validation: { min: 1900, max: 2100 },
  },
  {
    name: 'workingCondition',
    label: 'Working Condition',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
  },
];

const VINTAGE_TOYS_MODEL_KIT_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'kitName',
    label: 'Kit Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'manufacturer',
    label: 'Manufacturer',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    maxLength: 10,
    requirement: 'recommended',
    validation: { min: 1900, max: 2100 },
  },
  {
    name: 'assembled',
    label: 'Assembled',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'completeInBox',
    label: 'Complete In Box',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
  },
];

const VINTAGE_TOYS_PLUSH_TOY_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'toyName',
    label: 'Toy Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'character',
    label: 'Character / Franchise',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    maxLength: 10,
    requirement: 'recommended',
    validation: { min: 1900, max: 2100 },
  },
  {
    name: 'tagPresent',
    label: 'Original Tag Present',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
  },
];

const VINTAGE_TOYS_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'itemCount',
    label: 'Item Count',
    inputType: 'number',
    requirement: 'recommended',
    validation: { min: 1 },
  },
  {
    name: 'itemTypes',
    label: 'Item Types Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
];

// ============================================================================
// DISNEY PINS
// ============================================================================

const DISNEY_PINS_INDIVIDUAL_PIN_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'pinName',
    label: 'Pin Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'pinNumber',
    label: 'Pin Number',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'releaseYear',
    label: 'Release Year',
    inputType: 'number',
    requirement: 'recommended',
    validation: { min: 1900, max: 2100 },
  },
  {
    name: 'pinType',
    label: 'Pin Type',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Limited Edition', 'Open Edition', 'Artist Proof', 'Pre-Production', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Pin Type',
  },
  {
    name: 'backed',
    label: 'Backed',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
  {
    name: 'hardToFind',
    label: 'Hard To Find',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
];

const DISNEY_PINS_PIN_SET_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
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
    validation: { min: 1 },
  },
  {
    name: 'releaseYear',
    label: 'Release Year',
    inputType: 'number',
    requirement: 'recommended',
    validation: { min: 1900, max: 2100 },
  },
  {
    name: 'complete',
    label: 'Complete',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
  {
    name: 'originalPackaging',
    label: 'Original Packaging',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
  {
    name: 'format',
    label: 'Format',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Booster Pack', 'Blind Box', 'Starter Set', 'Deluxe Set', 'Limited Edition', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Format',
  },
];

const DISNEY_PINS_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'approximateItemCount',
    label: 'Approximate Item Count',
    inputType: 'number',
    requirement: 'required',
    validation: { min: 1 },
  },
  {
    name: 'themesIncluded',
    label: 'Themes Included',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'notablePins',
    label: 'Notable Pins',
    inputType: 'text',
    requirement: 'recommended',
  },
];

// Export all field definitions
export const REMAINING_FIELD_DEFINITIONS = {
  coins: {
    single_coin: COINS_SINGLE_COIN_FIELDS,
    coin_set: COINS_COIN_SET_FIELDS,
    paper_money: COINS_PAPER_MONEY_FIELDS,
    collection_lot: COINS_COLLECTION_LOT_FIELDS,
  },
  stamps: {
    single_stamp: STAMPS_SINGLE_STAMP_FIELDS,
    stamp_set: STAMPS_STAMP_SET_FIELDS,
    collection_lot: STAMPS_COLLECTION_LOT_FIELDS,
  },
  video_games: {
    game: VIDEO_GAMES_GAME_FIELDS,
    console: VIDEO_GAMES_CONSOLE_FIELDS,
    accessory: VIDEO_GAMES_ACCESSORY_FIELDS,
    collection_lot: VIDEO_GAMES_COLLECTION_LOT_FIELDS,
  },
  movies: {
    individual_movie: MOVIES_INDIVIDUAL_MOVIE_FIELDS,
    box_set: MOVIES_BOX_SET_FIELDS,
    collection_lot: MOVIES_COLLECTION_LOT_FIELDS,
  },
  autographs: {
    signed_item: AUTOGRAPHS_SIGNED_ITEM_FIELDS,
    collection_lot: AUTOGRAPHS_COLLECTION_LOT_FIELDS,
  },
  vintage_toys: {
    action_figure: VINTAGE_TOYS_ACTION_FIGURE_FIELDS,
    electronic_toy: VINTAGE_TOYS_ELECTRONIC_TOY_FIELDS,
    model_kit: VINTAGE_TOYS_MODEL_KIT_FIELDS,
    plush_toy: VINTAGE_TOYS_PLUSH_TOY_FIELDS,
    vehicle: VINTAGE_TOYS_VEHICLE_FIELDS,
    playset: VINTAGE_TOYS_PLAYSET_FIELDS,
    board_game: VINTAGE_TOYS_BOARD_GAME_FIELDS,
    collection_lot: VINTAGE_TOYS_COLLECTION_LOT_FIELDS,
  },
  disney_pins: {
    individual_pin: DISNEY_PINS_INDIVIDUAL_PIN_FIELDS,
    pin_set: DISNEY_PINS_PIN_SET_FIELDS,
    collection_lot: DISNEY_PINS_COLLECTION_LOT_FIELDS,
  },
};
