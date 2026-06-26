import { FieldDefinition, GRADING_COMPANIES_BY_CATEGORY } from './formFieldDefinitions';
import { COMMON_FIELDS } from './formFieldDefinitions';
import { COUNTRIES_LIST } from './countries';

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
    requirement: 'recommended',
    gridColumn: 'third',
  },
  {
    name: 'composition',
    label: 'Composition',
    inputType: 'text',
    requirement: 'recommended',
    gridColumn: 'third',
  },
  {
    name: 'weight',
    label: 'Weight',
    inputType: 'text',
    requirement: 'recommended',
    gridColumn: 'third',
  },
  {
    name: 'diameter',
    label: 'Diameter',
    inputType: 'text',
    requirement: 'recommended',
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
    gridColumn: 'half',
  },
  {
    name: 'country',
    label: 'Country',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: COUNTRIES_LIST,
    gridColumn: 'half',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'required',
    maxLength: 4,
    validation: { min: 1800, max: 2100 },
    gridColumn: 'half',
  },
  {
    name: 'setType',
    label: 'Set Type',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Proof Set', 'Mint Set', 'Commemorative Set', 'Type Set', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Set Type',
    gridColumn: 'half',
  },
  {
    name: 'numberOfCoinsInSet',
    label: 'Number of Coins in Set',
    inputType: 'number',
    requirement: 'recommended',
    maxLength: 3,
    gridColumn: 'third',
  },
  {
    name: 'originalPackagingIncluded',
    label: 'Original Packaging Included',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
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
    maxLength: 80,
  },
  {
    name: 'issueNumber',
    label: 'Issue Number',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'required',
    maxLength: 4,
    validation: { min: 1800, max: 2100 },
  },
  {
    name: 'publisher',
    label: 'Publisher',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'firstAppearance',
    label: 'First Appearance',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No'],
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
    label: 'Year',
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
// SPORTS CARDS
// ============================================================================

const SPORTS_CARDS_SINGLE_CARD_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
    conditionalLogic: 'Is Graded = No',
  },
  COMMON_FIELDS.QUANTITY_FIELD,
  {
    name: 'playerName',
    label: 'Player Name',
    inputType: 'text',
    requirement: 'required',
    maxLength: 80,
  },
  {
    name: 'cardYear',
    label: 'Card Year',
    inputType: 'number',
    requirement: 'required',
    maxLength: 4,
    validation: { min: 1800, max: 2100 },
  },
  {
    name: 'sport',
    label: 'Sport',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'team',
    label: 'Team',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'manufacturer',
    label: 'Manufacturer',
    inputType: 'text',
    requirement: 'recommended',
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.sports_cards,
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

const SPORTS_CARDS_CARD_SET_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
    conditionalLogic: 'Is Graded = No',
  },
  {
    name: 'setName',
    label: 'Set Name',
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
    name: 'manufacturer',
    label: 'Manufacturer',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'cardCount',
    label: 'Card Count',
    inputType: 'number',
    requirement: 'recommended',
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.sports_cards,
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
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
    conditionalLogic: 'Is Graded = No',
  },
  {
    name: 'country',
    label: 'Country',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: COUNTRIES_LIST,
    gridColumn: 'third',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'required',
    maxLength: 5,
    validation: { min: 1800, max: 2100 },
    gridColumn: 'third',
  },
  {
    name: 'mintOrUsed',
    label: 'Mint or Used',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Used', 'Mixed', 'Unknown'],
    gridColumn: 'third',
  },
  {
    name: 'denomination',
    label: 'Denomination',
    inputType: 'text',
    requirement: 'recommended',
    maxLength: 20,
    gridColumn: 'third',
  },
  {
    name: 'hinged',
    label: 'Hinged',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Never Hinged', 'Hinged', 'Hinge Remnant', 'Unknown'],
    gridColumn: 'third',
  },
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.IS_GRADED_FIELD,
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
    requirement: 'recommended',
    maxLength: 20,
    gridColumn: 'third',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'recommended',
    maxLength: 4,
    validation: { min: 1800, max: 2100 },
    gridColumn: 'third',
  },
  {
    name: 'setName',
    label: 'Set Name',
    inputType: 'text',
    requirement: 'required',
    maxLength: 80,
    gridColumn: 'third',
  },
  {
    name: 'sheetType',
    label: 'Sheet Type',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Set', 'Sheet', 'Souvenir Sheet', 'Block', 'First Day Cover', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Sheet Type',
    gridColumn: 'third',
  },
  {
    name: 'numberOfStampsInSet',
    label: 'Number of Stamps in Set',
    inputType: 'number',
    requirement: 'recommended',
    maxLength: 5,
    gridColumn: 'third',
  },
  {
    name: 'mintOrUsed',
    label: 'Mint or Used',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Mint', 'Used', 'Mixed', 'Unknown'],
    gridColumn: 'third',
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.stamps,
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

const STAMPS_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
    conditionalLogic: undefined,
  },
  {
    name: 'countriesIncluded',
    label: 'Countries Included',
    inputType: 'textarea',
    requirement: 'recommended',
    gridColumn: 'half',
  },
  {
    name: 'approximateQuantity',
    label: 'Approximate Quantity',
    inputType: 'number',
    requirement: 'required',
    maxLength: 5,
    gridColumn: 'half',
  },
  {
    name: 'yearsIncluded',
    label: 'Years Included',
    inputType: 'text',
    requirement: 'recommended',
    gridColumn: 'half',
  },
  {
    name: 'albumIncluded',
    label: 'Album Included',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No'],
    gridColumn: 'half',
  },
  {
    name: 'notableStamps',
    label: 'Notable Stamps',
    inputType: 'textarea',
    requirement: 'recommended',
    gridColumn: 'half',
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
    maxLength: 80,
  },
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
  {
    name: 'developer',
    label: 'Developer',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'originalCase',
    label: 'Original Case',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'manual',
    label: 'Manual',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No'],
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.video_games,
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

const VIDEO_GAMES_CONSOLE_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
    conditionalLogic: 'Is Graded = No',
  },
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
  {
    name: 'storage',
    label: 'Storage',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'working',
    label: 'Working',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.video_games,
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

// ============================================================================
// MOVIES
// ============================================================================

const MOVIES_VHS_FIELDS: FieldDefinition[] = [
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
  },
  {
    name: 'releaseYear',
    label: 'Release Year',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'studio',
    label: 'Studio',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'format',
    label: 'Format',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'sealed',
    label: 'Sealed',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No'],
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.movies,
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

const MOVIES_DVD_FIELDS: FieldDefinition[] = [
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
  },
  {
    name: 'releaseYear',
    label: 'Release Year',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'studio',
    label: 'Studio',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'format',
    label: 'Format',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'sealed',
    label: 'Sealed',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No'],
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.movies,
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

// ============================================================================
// AUTOGRAPHS
// ============================================================================

const AUTOGRAPHS_SIGNED_ITEM_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
    conditionalLogic: 'Is Graded = No',
  },
  COMMON_FIELDS.QUANTITY_FIELD,
  {
    name: 'signerName',
    label: 'Signer Name',
    inputType: 'text',
    requirement: 'required',
    maxLength: 80,
  },
  {
    name: 'itemType',
    label: 'Item Type',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'profession',
    label: 'Profession',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'authentication',
    label: 'Authentication',
    inputType: 'text',
    requirement: 'recommended',
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.autographs,
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

// ============================================================================
// VINTAGE TOYS
// ============================================================================

const VINTAGE_TOYS_PLUSH_TOY_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
    conditionalLogic: 'Is Graded = No',
  },
  COMMON_FIELDS.QUANTITY_FIELD,
  {
    name: 'toyName',
    label: 'Toy Name',
    inputType: 'text',
    requirement: 'required',
    maxLength: 80,
    gridColumn: 'half',
  },
  {
    name: 'brand',
    label: 'Brand',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Hasbro', 'Mattel', 'Milton Bradley', 'Tiger Electronics', 'Coleco', 'Radio Shack', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Brand',
    gridColumn: 'half',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'recommended',
    maxLength: 4,
    validation: { min: 1800, max: 2100 },
    gridColumn: 'third',
  },
  {
    name: 'tested',
    label: 'Tested',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
    gridColumn: 'third',
  },
  {
    name: 'workingCondition',
    label: 'Working Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Working', 'Partially Working', 'Not Working', 'Untested'],
    gridColumn: 'third',
  },
  {
    name: 'batteryCompartmentCondition',
    label: 'Battery Compartment Condition',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Clean', 'Light Corrosion', 'Heavy Corrosion', 'Missing Cover', 'Unknown'],
    gridColumn: 'third',
  },
  {
    name: 'soundWorks',
    label: 'Sound Works',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
    gridColumn: 'third',
  },
  {
    name: 'lightsWork',
    label: 'Lights Work',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
    gridColumn: 'third',
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.vintage_toys,
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

const VINTAGE_TOYS_ELECTRONIC_TOY_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
    conditionalLogic: 'Is Graded = No',
  },
  COMMON_FIELDS.QUANTITY_FIELD,
  {
    name: 'toyName',
    label: 'Toy Name',
    inputType: 'text',
    requirement: 'required',
    maxLength: 80,
    gridColumn: 'half',
  },
  {
    name: 'brand',
    label: 'Brand',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Hasbro', 'Mattel', 'Milton Bradley', 'Tiger Electronics', 'Coleco', 'Radio Shack', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Brand',
    gridColumn: 'half',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'recommended',
    maxLength: 4,
    validation: { min: 1800, max: 2100 },
    gridColumn: 'third',
  },
  {
    name: 'tested',
    label: 'Tested',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
    gridColumn: 'third',
  },
  {
    name: 'workingCondition',
    label: 'Working Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Working', 'Partially Working', 'Not Working', 'Untested'],
    gridColumn: 'third',
  },
  {
    name: 'batteryCompartmentCondition',
    label: 'Battery Compartment Condition',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Clean', 'Light Corrosion', 'Heavy Corrosion', 'Missing Cover', 'Unknown'],
    gridColumn: 'third',
  },
  {
    name: 'soundWorks',
    label: 'Sound Works',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
    gridColumn: 'third',
  },
  {
    name: 'lightsWork',
    label: 'Lights Work',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
    gridColumn: 'third',
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.vintage_toys,
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

const VINTAGE_TOYS_MODEL_KIT_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
    conditionalLogic: 'Is Graded = No',
  },
  COMMON_FIELDS.QUANTITY_FIELD,
  {
    name: 'kitName',
    label: 'Model / Kit Name',
    inputType: 'text',
    requirement: 'required',
    maxLength: 80,
    gridColumn: 'half',
  },
  {
    name: 'brand',
    label: 'Brand',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Revell', 'Monogram', 'AMT', 'Tamiya', 'LEGO', 'MPC', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Brand',
    gridColumn: 'half',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'recommended',
    maxLength: 4,
    validation: { min: 1800, max: 2100 },
    gridColumn: 'third',
  },
  {
    name: 'scale',
    label: 'Scale',
    inputType: 'text',
    requirement: 'recommended',
    gridColumn: 'third',
  },
  {
    name: 'builtOrUnbuilt',
    label: 'Built or Unbuilt',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Built', 'Unbuilt', 'Partially Built', 'Unknown'],
    gridColumn: 'third',
  },
  {
    name: 'complete',
    label: 'Complete',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No', 'Unknown'],
    gridColumn: 'third',
  },
  {
    name: 'instructionsIncluded',
    label: 'Instructions Included',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
    gridColumn: 'third',
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.vintage_toys,
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

const VINTAGE_TOYS_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
    conditionalLogic: undefined,
  },
  {
    name: 'brandsIncluded',
    label: 'Brands Included',
    inputType: 'textarea',
    requirement: 'recommended',
    gridColumn: 'half',
  },
  {
    name: 'approximateItemCount',
    label: 'Approximate Item Count',
    inputType: 'number',
    requirement: 'required',
    maxLength: 5,
    gridColumn: 'half',
  },
  {
    name: 'franchisesIncluded',
    label: 'Franchises Included',
    inputType: 'textarea',
    requirement: 'recommended',
    gridColumn: 'half',
  },
  {
    name: 'notableItems',
    label: 'Notable Items',
    inputType: 'textarea',
    requirement: 'recommended',
    gridColumn: 'half',
  },
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
    maxLength: 80,
  },
  {
    name: 'setName',
    label: 'Set Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'cardNumber',
    label: 'Card Number',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'rarity',
    label: 'Rarity',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'holographic',
    label: 'Holographic',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No'],
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.pokemon,
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

const POKEMON_CARD_SET_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
    conditionalLogic: 'Is Graded = No',
  },
  {
    name: 'setName',
    label: 'Set Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'cardCount',
    label: 'Card Count',
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
    name: 'complete',
    label: 'Complete',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No'],
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
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
    conditionalLogic: 'Is Graded = No',
  },
  COMMON_FIELDS.QUANTITY_FIELD,
  {
    name: 'pinName',
    label: 'Pin Name',
    inputType: 'text',
    requirement: 'required',
    maxLength: 80,
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
    name: 'pinNumber',
    label: 'Pin Number',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'official',
    label: 'Official Disney',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Yes', 'No'],
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.disney_pins,
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

const DISNEY_PINS_PIN_SET_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
    conditionalLogic: 'Is Graded = No',
  },
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
  },
  comics: {
    single_comic: COMICS_SINGLE_COMIC_FIELDS,
    comic_set: COMICS_COMIC_SET_FIELDS,
  },
  sports_cards: {
    single_card: SPORTS_CARDS_SINGLE_CARD_FIELDS,
    card_set: SPORTS_CARDS_CARD_SET_FIELDS,
  },
  stamps: {
    single_stamp: STAMPS_SINGLE_STAMP_FIELDS,
    stamp_set: STAMPS_STAMP_SET_FIELDS,
    collection_lot: STAMPS_COLLECTION_LOT_FIELDS,
  },
  video_games: {
    game: VIDEO_GAMES_GAME_FIELDS,
    console: VIDEO_GAMES_CONSOLE_FIELDS,
  },
  movies: {
    vhs: MOVIES_VHS_FIELDS,
    dvd: MOVIES_DVD_FIELDS,
  },
  autographs: {
    signed_item: AUTOGRAPHS_SIGNED_ITEM_FIELDS,
  },
  vintage_toys: {
    plush_toy: VINTAGE_TOYS_PLUSH_TOY_FIELDS,
    electronic_toy: VINTAGE_TOYS_ELECTRONIC_TOY_FIELDS,
    model_kit: VINTAGE_TOYS_MODEL_KIT_FIELDS,
    collection_lot: VINTAGE_TOYS_COLLECTION_LOT_FIELDS,
  },
  pokemon: {
    single_card: POKEMON_SINGLE_CARD_FIELDS,
    card_set: POKEMON_CARD_SET_FIELDS,
  },
  disney_pins: {
    single_pin: DISNEY_PINS_SINGLE_PIN_FIELDS,
    pin_set: DISNEY_PINS_PIN_SET_FIELDS,
  },
};

export const REMAINING_FIELD_DEFINITIONS = CATEGORY_ITEM_TYPES;
