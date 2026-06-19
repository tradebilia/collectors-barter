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
    requirement: 'required',
    validation: { min: 1800, max: 2100 },
  },
  {
    name: 'denomination',
    label: 'Denomination',
    inputType: 'text',
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
    notes: 'e.g., Gold, Silver, Copper, etc.',
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
  COMMON_FIELDS.QUANTITY_FIELD,
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
    name: 'countries',
    label: 'Countries',
    inputType: 'text',
    requirement: 'recommended',
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
    requirement: 'required',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'serialNumber',
    label: 'Serial Number',
    inputType: 'text',
    requirement: 'recommended',
  },
];

const COINS_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'approximateCoinCount',
    label: 'Approximate Coin Count',
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
    requirement: 'required',
    validation: { min: 1800, max: 2100 },
  },
  {
    name: 'denomination',
    label: 'Denomination',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'stampDescription',
    label: 'Stamp Description',
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
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'gameTitle',
    label: 'Game Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'system',
    label: 'System',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: [
      'Nintendo', 'Super Nintendo', 'Nintendo 64', 'GameCube', 'Wii', 'Wii U', 'Switch',
      'PlayStation', 'PlayStation 2', 'PlayStation 3', 'PlayStation 4', 'PlayStation 5',
      'Xbox', 'Xbox 360', 'Xbox One', 'Xbox Series X/S',
      'Sega Genesis', 'Sega Dreamcast', 'Game Boy', 'Game Boy Color', 'Game Boy Advance',
      'Atari 2600', 'Atari 7800', 'NeoGeo'
    ],
    supportsOther: true,
    otherFieldName: 'customSystem',
  },
  {
    name: 'region',
    label: 'Region',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['NTSC (US)', 'PAL (Europe)', 'NTSC-J (Japan)', 'Mixed'],
  },
  {
    name: 'releaseYear',
    label: 'Release Year',
    inputType: 'number',
    requirement: 'recommended',
    validation: { min: 1970, max: 2100 },
  },
  {
    name: 'completeInBox',
    label: 'Complete In Box',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'missingItems',
    label: 'Missing Items',
    inputType: 'textarea',
    requirement: 'recommended',
    conditionalLogic: 'Complete In Box = No',
  },
  {
    name: 'originalCase',
    label: 'Original Box',
    inputType: 'dropdown',
    requirement: 'recommended',
    conditionalLogic: 'Complete In Box = No',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'manualIncluded',
    label: 'Manual Included',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
    conditionalLogic: 'Complete In Box = No',
  },
];

const VIDEO_GAMES_CONSOLE_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'console',
    label: 'Console',
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
    name: 'working',
    label: 'Working',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No', 'Untested'],
  },
  {
    name: 'accessories',
    label: 'Accessories Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
];

const VIDEO_GAMES_ACCESSORY_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'accessoryName',
    label: 'Accessory Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'system',
    label: 'System',
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
];

const VIDEO_GAMES_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
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
    name: 'systems',
    label: 'Systems Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
];

// ============================================================================
// MOVIES
// ============================================================================

const MOVIES_INDIVIDUAL_MOVIE_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
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
    requirement: 'recommended',
    validation: { min: 1900, max: 2100 },
  },
  {
    name: 'sealed',
    label: 'Sealed',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
  },
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.movies,
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

const MOVIES_BOX_SET_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'setName',
    label: 'Set Name',
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
    name: 'discCount',
    label: 'Disc Count',
    inputType: 'number',
    requirement: 'required',
    validation: { min: 1 },
  },
];

const MOVIES_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'movieCount',
    label: 'Movie Count',
    inputType: 'number',
    requirement: 'recommended',
    validation: { min: 1 },
  },
  {
    name: 'formats',
    label: 'Formats Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
];

// ============================================================================
// AUTOGRAPHS
// ============================================================================

const AUTOGRAPHS_SIGNED_ITEM_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'signer',
    label: 'Signer',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'itemType',
    label: 'Item Type',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Photo', 'Jersey', 'Baseball', 'Helmet', 'Bat', 'Book', 'Memorabilia', 'Other'],
    supportsOther: true,
    otherFieldName: 'customItemType',
  },
  {
    name: 'medium',
    label: 'Medium',
    inputType: 'text',
    requirement: 'recommended',
    notes: 'e.g., Pen, Marker, Sharpie',
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
    requirement: 'recommended',
    dropdownOptions: ['PSA/DNA', 'JSA', 'Beckett Authentication Services'],
    conditionalLogic: 'Authenticated = Yes',
  },
];

const AUTOGRAPHS_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
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
    name: 'signers',
    label: 'Signers',
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
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'figureName',
    label: 'Figure Name',
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
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'pinName',
    label: 'Pin Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'parkOrEvent',
    label: 'Park / Event',
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
    name: 'edition',
    label: 'Edition',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'recommended',
    validation: { min: 1900, max: 2100 },
  },
];

const DISNEY_PINS_PIN_SET_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'setName',
    label: 'Set Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'pinCount',
    label: 'Pin Count',
    inputType: 'number',
    requirement: 'required',
    validation: { min: 1 },
  },
  {
    name: 'theme',
    label: 'Theme',
    inputType: 'text',
    requirement: 'recommended',
  },
];

const DISNEY_PINS_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'pinCount',
    label: 'Pin Count',
    inputType: 'number',
    requirement: 'recommended',
    validation: { min: 1 },
  },
  {
    name: 'themes',
    label: 'Themes Included',
    inputType: 'textarea',
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
