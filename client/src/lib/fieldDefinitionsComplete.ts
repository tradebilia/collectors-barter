/**
 * Complete Field Definitions for All Categories
 * Generated from field_specifications.md
 * This file contains all field definitions for all 10 categories and their item types
 */

import {
  FieldDefinition,
  ItemTypeDefinition,
  COMMON_FIELDS,
  GRADING_COMPANIES_BY_CATEGORY,
} from './formFieldDefinitions';

// ============================================================================
// SPORTS CARDS
// ============================================================================

const SPORTS_CARDS_SINGLE_CARD_FIELDS: FieldDefinition[] = [
  { ...COMMON_FIELDS.LISTING_TITLE_FIELD, gridColumn: 'full' },
  { ...COMMON_FIELDS.TRADE_VALUE_FIELD, gridColumn: 'half' },
  COMMON_FIELDS.DESCRIPTION_FIELD,
  { ...COMMON_FIELDS.QUANTITY_FIELD, gridColumn: 'half' },
  { ...COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD, gridColumn: 'half' },
  {
    name: 'sport',
    label: 'Sport',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: [
      'Baseball', 'Basketball', 'Football', 'Hockey', 'Soccer', 'Racing',
      'Wrestling', 'Golf', 'MMA', 'Tennis', 'Multi-Sport'
    ],
    supportsOther: true,
    otherFieldName: 'customSport',
  },
  {
    name: 'player',
    label: 'Player',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'year',
    gridColumn: 'half',
    label: 'Year',
    inputType: 'number',
    requirement: 'required',
    validation: { min: 1800, max: 2100 },
  },
  {
    name: 'manufacturer',
    label: 'Manufacturer',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: [
      'Topps', 'Bowman', 'Panini', 'Upper Deck', 'Fleer', 'Donruss',
      'Score', 'Leaf'
    ],
    supportsOther: true,
    otherFieldName: 'customManufacturer',
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
    name: 'relicMemorabillia',
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
    requirement: 'conditional',
    conditionalLogic: 'Serial Numbered = Yes',
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
  },
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.sports_cards,
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

const SPORTS_CARDS_UNOPENED_PRODUCT_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'sport',
    label: 'Sport',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: [
      'Baseball', 'Basketball', 'Football', 'Hockey', 'Soccer', 'Racing',
      'Wrestling', 'Golf', 'MMA', 'Tennis', 'Multi-Sport'
    ],
    supportsOther: true,
    otherFieldName: 'customSport',
  },
  {
    name: 'year',
    gridColumn: 'half',
    label: 'Year',
    inputType: 'number',
    requirement: 'required',
    validation: { min: 1800, max: 2100 },
  },
  {
    name: 'manufacturer',
    label: 'Manufacturer',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: [
      'Topps', 'Bowman', 'Panini', 'Upper Deck', 'Fleer', 'Donruss',
      'Score', 'Leaf'
    ],
    supportsOther: true,
    otherFieldName: 'customManufacturer',
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
    dropdownOptions: ['Hobby', 'Jumbo', 'Retail', 'Blaster', 'Mega', 'Hanger', 'Cello', 'Rack'],
    supportsOther: true,
    otherFieldName: 'customProductType',
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
    requirement: 'conditional',
    dropdownOptions: ['BBCE', 'PSA', 'iCert', 'RVP'],
    supportsOther: true,
    otherFieldName: 'customAuthenticationCompany',
    conditionalLogic: 'Authenticated = Yes',
  },
  {
    name: 'fromSealedCase',
    label: 'From A Sealed Case',
    inputType: 'dropdown',
    requirement: 'conditional',
    dropdownOptions: ['Yes', 'No'],
    conditionalLogic: 'Authenticated = Yes',
  },
];

const SPORTS_CARDS_SET_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'sport',
    label: 'Sport',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: [
      'Baseball', 'Basketball', 'Football', 'Hockey', 'Soccer', 'Racing',
      'Wrestling', 'Golf', 'MMA', 'Tennis', 'Multi-Sport'
    ],
    supportsOther: true,
    otherFieldName: 'customSport',
  },
  {
    name: 'year',
    gridColumn: 'half',
    label: 'Year',
    inputType: 'number',
    requirement: 'required',
    validation: { min: 1800, max: 2100 },
  },
  {
    name: 'manufacturer',
    label: 'Manufacturer',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: [
      'Topps', 'Bowman', 'Panini', 'Upper Deck', 'Fleer', 'Donruss',
      'Score', 'Leaf'
    ],
    supportsOther: true,
    otherFieldName: 'customManufacturer',
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
    requirement: 'conditional',
    dropdownOptions: ['Yes', 'No'],
    conditionalLogic: 'Set Type = Partial Set',
  },
  {
    name: 'missingCardDetails',
    label: 'Missing Card Details',
    inputType: 'textarea',
    requirement: 'conditional',
    conditionalLogic: 'Missing Cards = Yes',
  },
];

const SPORTS_CARDS_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'approximateCardCount',
    label: 'Approximate Card Count',
    inputType: 'number',
    requirement: 'recommended',
    validation: { min: 1 },
  },
  {
    name: 'notableCards',
    label: 'Notable Cards',
    inputType: 'textarea',
    requirement: 'recommended',
    notes: 'List any valuable or notable cards included',
  },
  {
    name: 'conditionRange',
    label: 'Condition Range',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Mint to Near Mint', 'Near Mint to Excellent', 'Excellent to Very Good', 'Very Good to Good', 'Good to Poor', 'Mixed'],
  },
];

// ============================================================================
// COMICS
// ============================================================================

const COMICS_SINGLE_COMIC_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'issueNumber',
    label: 'Issue Number',
    inputType: 'text',
    requirement: 'required',
    gridColumn: 'half',
  },
  {
    name: 'publisher',
    label: 'Publisher',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Marvel', 'DC', 'Image', 'Dark Horse', 'IDW', 'Boom! Studios', 'Vertigo'],
    supportsOther: true,
    otherFieldName: 'customPublisher',
  },
  {
    name: 'year',
    gridColumn: 'half',
    label: 'Year',
    inputType: 'number',
    requirement: 'recommended',
    validation: { min: 1800, max: 2100 },
  },
  {
    name: 'seriesName',
    label: 'Series Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'firstEdition',
    label: 'First Edition',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'signed',
    label: 'Signed',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'facsimile',
    label: 'Facsimile',
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
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.comics,
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

const COMICS_ORIGINAL_ART_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'artist',
    label: 'Artist',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'artType',
    label: 'Art Type',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Cover Art', 'Interior Page', 'Splash Page', 'Sketch'],
  },
  {
    name: 'medium',
    label: 'Medium',
    inputType: 'text',
    requirement: 'recommended',
    notes: 'e.g., Ink on Paper, Watercolor, Digital',
  },
  {
    name: 'size',
    label: 'Size',
    inputType: 'text',
    requirement: 'recommended',
    notes: 'Dimensions of the artwork',
  },
];

const COMICS_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'approximateComicCount',
    label: 'Approximate Comic Count',
    inputType: 'number',
    requirement: 'recommended',
    validation: { min: 1 },
  },
  {
    name: 'notableIssues',
    label: 'Notable Issues',
    inputType: 'textarea',
    requirement: 'recommended',
    notes: 'List any valuable or notable comics included',
  },
];

// ============================================================================
// POKEMON
// ============================================================================

const POKEMON_SINGLE_CARD_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'pokemon',
    label: 'Pokémon',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'set',
    label: 'Set',
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
    name: 'finish',
    label: 'Finish / Variant',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: [
      'Normal', 'Holo', 'Reverse Holo', 'Full Art', 'Rainbow Rare', 'Gold',
      'V', 'VMAX', 'VSTAR', 'ex', 'GX', 'BREAK', 'Tag Team'
    ],
    supportsOther: true,
    otherFieldName: 'customFinish',
  },
  {
    name: 'rarity',
    label: 'Rarity',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Common', 'Uncommon', 'Rare', 'Holo Rare', 'V-Rare', 'Secret Rare'],
  },
  {
    name: 'specialAttributes',
    label: 'Special Attributes',
    inputType: 'dropdown',
    requirement: 'optional',
    dropdownOptions: ['Staff Stamp', 'Prerelease', 'Misprint', 'None'],
  },
  COMMON_FIELDS.IS_GRADED_FIELD,
  {
    ...COMMON_FIELDS.CONDITION_FIELD,
  },
  {
    ...COMMON_FIELDS.GRADING_COMPANY_FIELD,
    dropdownOptions: GRADING_COMPANIES_BY_CATEGORY.pokemon,
  },
  COMMON_FIELDS.GRADE_FIELD,
  COMMON_FIELDS.CERTIFICATION_NUMBER_FIELD,
];

const POKEMON_UNOPENED_PRODUCT_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
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
    dropdownOptions: ['Booster Box', 'Booster Pack', 'Theme Deck', 'Starter Deck', 'Elite Trainer Box', 'Tin', 'Blister Pack'],
  },
  {
    name: 'era',
    label: 'Era / Series',
    inputType: 'text',
    requirement: 'recommended',
    notes: 'e.g., Base Set, Jungle, Fossil, etc.',
  },
  {
    name: 'factorySealed',
    label: 'Factory Sealed',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
];

const POKEMON_SET_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  
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
    name: 'cardCount',
    label: 'Card Count',
    inputType: 'number',
    requirement: 'required',
    validation: { min: 1 },
  },
  {
    name: 'complete',
    label: 'Complete',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'missingCards',
    label: 'Missing Cards',
    inputType: 'textarea',
    requirement: 'conditional',
    conditionalLogic: 'Complete = No',
  },
];

const POKEMON_COLLECTION_LOT_FIELDS: FieldDefinition[] = [
  COMMON_FIELDS.LISTING_TITLE_FIELD,
  COMMON_FIELDS.TRADE_VALUE_FIELD,
  
  COMMON_FIELDS.DESCRIPTION_FIELD,
  COMMON_FIELDS.QUANTITY_FIELD,
  COMMON_FIELDS.SHIPPING_AVAILABLE_FIELD,
  {
    name: 'approximateCardCount',
    label: 'Approximate Card Count',
    inputType: 'number',
    requirement: 'recommended',
    validation: { min: 1 },
  },
  {
    name: 'erasIncluded',
    label: 'Eras / Series Included',
    inputType: 'textarea',
    requirement: 'recommended',
    notes: 'e.g., Base Set, Jungle, Fossil, Neo, etc.',
  },
  {
    name: 'bulkRareRatio',
    label: 'Bulk / Rare Ratio',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Mostly Bulk', 'Mixed', 'Mostly Rare'],
  },
];

// Export all field definitions grouped by category and item type
export const ALL_FIELD_DEFINITIONS = {
  sports_cards: {
    single_card: SPORTS_CARDS_SINGLE_CARD_FIELDS,
    unopened_product: SPORTS_CARDS_UNOPENED_PRODUCT_FIELDS,
    set: SPORTS_CARDS_SET_FIELDS,
    collection_lot: SPORTS_CARDS_COLLECTION_LOT_FIELDS,
  },
  comics: {
    single_comic: COMICS_SINGLE_COMIC_FIELDS,
    original_art: COMICS_ORIGINAL_ART_FIELDS,
    collection_lot: COMICS_COLLECTION_LOT_FIELDS,
  },
  pokemon: {
    single_card: POKEMON_SINGLE_CARD_FIELDS,
    unopened_product: POKEMON_UNOPENED_PRODUCT_FIELDS,
    set: POKEMON_SET_FIELDS,
    collection_lot: POKEMON_COLLECTION_LOT_FIELDS,
  },
  // Additional categories (coins, stamps, video_games, movies, autographs, vintage_toys, disney_pins)
  // will be added in subsequent updates
};
