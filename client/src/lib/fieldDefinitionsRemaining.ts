import { FieldDefinition, GRADING_COMPANIES_BY_CATEGORY } from './formFieldDefinitions';
import { COMMON_FIELDS } from './formFieldDefinitions';
import { COUNTRIES_LIST } from './countries';
import {
  SPORTS_CARDS_SINGLE_CARD_FIELDS,
  SPORTS_CARDS_UNOPENED_PRODUCT_FIELDS,
  SPORTS_CARDS_COLLECTION_LOT_FIELDS,
  SPORTS_CARDS_SET_FIELDS,
  COINS_COLLECTION_LOT_FIELDS,
  COINS_PAPER_MONEY_BANKNOTES_FIELDS,
  COMICS_COLLECTION_LOT_FIELDS,
  COMICS_ORIGINAL_ART_FIELDS,
  AUTOGRAPHS_COLLECTION_LOT_FIELDS,
  VIDEO_GAMES_ACCESSORY_FIELDS,
  VIDEO_GAMES_COLLECTION_LOT_FIELDS,
  VINTAGE_TOYS_ACTION_FIGURE_DOLL_FIELDS,
  VINTAGE_TOYS_BOARD_GAME_PUZZLE_FIELDS,
  VINTAGE_TOYS_PLAYSET_FIELDS,
  VINTAGE_TOYS_VEHICLE_FIELDS,
  POKEMON_COLLECTION_LOT_FIELDS,
  POKEMON_UNOPENED_PRODUCT_FIELDS,
  POKEMON_SET_FIELDS,
  DISNEY_PINS_COLLECTION_LOT_FIELDS,
  STAMPS_STAMP_SET_SHEET_FIELDS,
  STAMPS_COLLECTION_LOT_FIELDS,
} from './fieldDefinitionsGenerated';

// ============================================================================
// COINS
// ============================================================================

const COINS_SINGLE_COIN_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
    conditionalLogic: 'Is Graded = No',
  },
  COMMON_FIELDS.QUANTITY_FIELD,
  {
    name: 'country',
    label: 'Country',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: COUNTRIES_LIST,
    gridColumn: 'third',
  },
  {
    name: 'denomination',
    label: 'Denomination',
    inputType: 'text',
    requirement: 'required',
    maxLength: 20,
    gridColumn: 'third',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'required',
    maxLength: 4,
    validation: { min: 1800, max: 2100 },
    gridColumn: 'third',
  },
  {
    name: 'mintMark',
    label: 'Mint Mark',
    inputType: 'text',
    requirement: 'recommended',
    gridColumn: 'third',
  },
  {
    name: 'variety',
    label: 'Variety',
    inputType: 'text',
    requirement: 'optional',
    gridColumn: 'third',
  },
  {
    name: 'metal',
    label: 'Metal Composition',
    inputType: 'text',
    requirement: 'optional',
    gridColumn: 'third',
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
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
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
    conditionalLogic: 'Is Graded = No',
  },
  COMMON_FIELDS.QUANTITY_FIELD,
  {
    name: 'setName',
    label: 'Set Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'coinCount',
    label: 'Number of Coins',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'recommended',
    maxLength: 4,
    validation: { min: 1800, max: 2100 },
  },
  {
    name: 'country',
    label: 'Country',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: COUNTRIES_LIST,
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.coins,
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

// ============================================================================
// COMICS
// ============================================================================

const COMICS_SINGLE_COMIC_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
    conditionalLogic: 'Is Graded = No',
  },
  COMMON_FIELDS.QUANTITY_FIELD,
  {
    name: 'title',
    label: 'Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'issueNumber',
    label: 'Issue Number',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'publisher',
    label: 'Publisher',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'year',
    label: 'Year Published',
    inputType: 'number',
    requirement: 'recommended',
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.comics,
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

const COMICS_COMIC_SET_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
    conditionalLogic: 'Is Graded = No',
  },
  COMMON_FIELDS.QUANTITY_FIELD,
  {
    name: 'setName',
    label: 'Set Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'issueRange',
    label: 'Issue Range',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'publisher',
    label: 'Publisher',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'year',
    label: 'Year Published',
    inputType: 'number',
    requirement: 'recommended',
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.comics,
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

// ============================================================================
// STAMPS
// ============================================================================

const STAMPS_SINGLE_STAMP_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  COMMON_FIELDS.CONDITION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
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
    requirement: 'recommended',
  },
  {
    name: 'denomination',
    label: 'Denomination',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'catalog',
    label: 'Catalog Number',
    inputType: 'text',
    requirement: 'optional',
  },
];

// ============================================================================
// VIDEO GAMES
// ============================================================================

const VIDEO_GAMES_GAME_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  COMMON_FIELDS.CONDITION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  {
    name: 'platform',
    label: 'Platform',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'releaseYear',
    label: 'Release Year',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'publisher',
    label: 'Publisher',
    inputType: 'text',
    requirement: 'recommended',
  },
];

const VIDEO_GAMES_CONSOLE_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  COMMON_FIELDS.CONDITION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  {
    name: 'consoleName',
    label: 'Console Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'releaseYear',
    label: 'Release Year',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'manufacturer',
    label: 'Manufacturer',
    inputType: 'text',
    requirement: 'recommended',
  },
];

// ============================================================================
// MOVIES
// ============================================================================

const MOVIES_INDIVIDUAL_MOVIE_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
    conditionalLogic: 'Is Graded = No',
  },
  COMMON_FIELDS.QUANTITY_FIELD,
  {
    name: 'title',
    label: 'Title',
    inputType: 'text',
    requirement: 'required',
    maxLength: 80,
    gridColumn: 'third',
  },
  {
    name: 'format',
    label: 'Format',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['DVD', 'Blu-ray', '4K UHD', 'VHS', 'LaserDisc', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Format',
    gridColumn: 'third',
  },
  {
    name: 'releaseYear',
    label: 'Release Year',
    inputType: 'number',
    requirement: 'recommended',
    gridColumn: 'third',
  },
  {
    name: 'sealed',
    label: 'Sealed',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
    gridColumn: 'third',
  },
  {
    name: 'region',
    label: 'Region',
    inputType: 'text',
    requirement: 'optional',
    gridColumn: 'third',
  },
  {
    name: 'edition',
    label: 'Edition',
    inputType: 'text',
    requirement: 'optional',
    gridColumn: 'third',
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.movies,
    supportsOther: true,
    otherFieldName: 'Custom Grading Company',
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

const MOVIES_BOX_SET_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
    conditionalLogic: 'Is Graded = No',
  },
  COMMON_FIELDS.QUANTITY_FIELD,
  {
    name: 'boxSetName',
    label: 'Box Set Name',
    inputType: 'text',
    requirement: 'required',
    gridColumn: 'half',
  },
  {
    name: 'format',
    label: 'Format',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['DVD', 'Blu-ray', '4K UHD', 'VHS', 'LaserDisc', 'Mixed', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Format',
    gridColumn: 'half',
  },
  {
    name: 'numberOfMoviesInSet',
    label: 'Number of Movies in Set',
    inputType: 'number',
    requirement: 'recommended',
    gridColumn: 'third',
  },
  {
    name: 'edition',
    label: 'Edition',
    inputType: 'text',
    requirement: 'optional',
    gridColumn: 'third',
  },
  {
    name: 'sealed',
    label: 'Sealed',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
    gridColumn: 'third',
  },
  {
    ...COMMON_FIELDS.IS_GRADED_FIELD,
    gridColumn: 'third',
  },
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.movies,
    gridColumn: 'third',
  },
  {
    ...COMMON_FIELDS.GRADE_FIELD,
    gridColumn: 'third',
  },
  {
    ...COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
    gridColumn: 'third',
  },
];

const MOVIES_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
    conditionalLogic: undefined,
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
    validation: { min: 1 },
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

// ============================================================================
// AUTOGRAPHS
// ============================================================================

const AUTOGRAPHS_SIGNED_ITEM_FIELDS: FieldDefinition[] = [
  // Required Fields
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  {
    name: 'signer',
    label: 'Signer',
    inputType: 'text',
    requirement: 'required',
    gridColumn: 'third',
  },
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
    conditionalLogic: undefined,
  },
  {
    name: 'signedItemType',
    label: 'Signed Item Type',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Photo', 'Card', 'Baseball', 'Football', 'Basketball', 'Hockey Puck', 'Jersey', 'Helmet', 'Bat', 'Glove', 'Book', 'Poster', 'Program', 'Ticket', 'Document', 'Other'],
    supportsOther: true,
    gridColumn: 'third',
  },
  // Recommended Fields
  COMMON_FIELDS.QUANTITY_FIELD,
  {
    name: 'autographCategory',
    label: 'Autograph Category',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Sports', 'Entertainment', 'Historical', 'Music', 'Other'],
    supportsOther: true,
    gridColumn: 'third',
  },
  {
    name: 'authenticationIncluded',
    label: 'Authentication Included',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
    gridColumn: 'third',
  },
  {
    name: 'authenticationCompany',
    label: 'Authentication Company',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['PSA/DNA', 'JSA', 'Beckett Authentication Services', 'Other'],
    supportsOther: true,
    conditionalLogic: 'Authentication Included = Yes',
    gridColumn: 'half',
  },
  {
    name: 'authenticationType',
    label: 'Authentication Type',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['COA (Card)', 'LOA (Letter)', 'Encapsulated (Slab)', 'Other'],
    supportsOther: true,
    conditionalLogic: 'Authentication Included = Yes',
    gridColumn: 'half',
  },
  {
    name: 'certificateNumber',
    label: 'Certificate Number',
    inputType: 'text',
    requirement: 'recommended',
    conditionalLogic: 'Authentication Included = Yes',
    gridColumn: 'half',
  },
  // Optional Fields
  {
    name: 'inscriptionPresent',
    label: 'Inscription Present',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No'],
    gridColumn: 'third',
  },
  {
    name: 'inscriptionText',
    label: 'Inscription Text',
    inputType: 'text',
    requirement: 'optional',
    conditionalLogic: 'Inscription Present = Yes',
  },
];

// ============================================================================
// VINTAGE TOYS
// ============================================================================

const VINTAGE_TOYS_PLUSH_TOY_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  COMMON_FIELDS.CONDITION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  {
    name: 'toyName',
    label: 'Toy Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'manufacturer',
    label: 'Manufacturer',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'recommended',
  },
];

const VINTAGE_TOYS_ELECTRONIC_TOY_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  COMMON_FIELDS.CONDITION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  {
    name: 'toyName',
    label: 'Toy Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'manufacturer',
    label: 'Manufacturer',
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
    name: 'working',
    label: 'Working Condition',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
];

const VINTAGE_TOYS_MODEL_KIT_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  COMMON_FIELDS.CONDITION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
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
    requirement: 'recommended',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'assembled',
    label: 'Assembled',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Partially'],
  },
];

const VINTAGE_TOYS_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  COMMON_FIELDS.CONDITION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
];

// ============================================================================
// POKEMON
// ============================================================================

const POKEMON_SINGLE_CARD_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
    conditionalLogic: 'Is Graded = No',
  },
  COMMON_FIELDS.QUANTITY_FIELD,
  {
    name: 'cardName',
    label: 'Card Name',
    inputType: 'text',
    requirement: 'required',
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
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.pokemon,
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

// ============================================================================
// DISNEY PINS
// ============================================================================

const DISNEY_PINS_SINGLE_PIN_FIELDS: FieldDefinition[] = [
  // Required Fields
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
    name: 'pinName',
    label: 'Pin Name',
    inputType: 'text',
    requirement: 'required',
  },
  // Recommended Fields
  COMMON_FIELDS.QUANTITY_FIELD,
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
    name: 'artistProof',
    label: 'Artist Proof (AP)',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'preProduction',
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
  // Optional Fields
  {
    name: 'backerCardIncluded',
    label: 'Backer Card Included',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No'],
  },
];

const DISNEY_PINS_PIN_SET_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  COMMON_FIELDS.CONDITION_FIELD,
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
    requirement: 'recommended',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'theme',
    label: 'Theme',
    inputType: 'text',
    requirement: 'recommended',
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.disney_pins,
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

// ============================================================================
// CATEGORY DEFINITIONS
// ============================================================================

export const CATEGORY_ITEM_TYPES = {
  coins: {
    single_coin: COINS_SINGLE_COIN_FIELDS,
    coin_set: COINS_COIN_SET_FIELDS,
    paper_money: COINS_PAPER_MONEY_BANKNOTES_FIELDS,
    collection_lot: COINS_COLLECTION_LOT_FIELDS,
  },
  comics: {
    single_comic: COMICS_SINGLE_COMIC_FIELDS,
    original_art: COMICS_ORIGINAL_ART_FIELDS,
    collection_lot: COMICS_COLLECTION_LOT_FIELDS,
  },
  sports_cards: {
    single_card: SPORTS_CARDS_SINGLE_CARD_FIELDS,
    card_set: SPORTS_CARDS_SET_FIELDS,
    unopened_product: SPORTS_CARDS_UNOPENED_PRODUCT_FIELDS,
    collection_lot: SPORTS_CARDS_COLLECTION_LOT_FIELDS,
  },
  stamps: {
    single_stamp: STAMPS_SINGLE_STAMP_FIELDS,
    stamp_set: STAMPS_STAMP_SET_SHEET_FIELDS,
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
    plush_toy: VINTAGE_TOYS_PLUSH_TOY_FIELDS,
    electronic_toy: VINTAGE_TOYS_ELECTRONIC_TOY_FIELDS,
    model_kit: VINTAGE_TOYS_MODEL_KIT_FIELDS,
    action_figure: VINTAGE_TOYS_ACTION_FIGURE_DOLL_FIELDS,
    vehicle: VINTAGE_TOYS_VEHICLE_FIELDS,
    playset: VINTAGE_TOYS_PLAYSET_FIELDS,
    board_game: VINTAGE_TOYS_BOARD_GAME_PUZZLE_FIELDS,
    collection_lot: VINTAGE_TOYS_COLLECTION_LOT_FIELDS,
  },
  pokemon: {
    single_card: POKEMON_SINGLE_CARD_FIELDS,
    card_set: POKEMON_SET_FIELDS,
    unopened_product: POKEMON_UNOPENED_PRODUCT_FIELDS,
    collection_lot: POKEMON_COLLECTION_LOT_FIELDS,
  },
  disney_pins: {
    single_pin: DISNEY_PINS_SINGLE_PIN_FIELDS,
    pin_set: DISNEY_PINS_PIN_SET_FIELDS,
    collection_lot: DISNEY_PINS_COLLECTION_LOT_FIELDS,
  },
};

export const REMAINING_FIELD_DEFINITIONS = CATEGORY_ITEM_TYPES;
