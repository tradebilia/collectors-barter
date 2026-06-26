/**
 * Complete Field Definitions for All Categories
 * Auto-generated from field specifications
 */

import { FieldDefinition } from './formFieldDefinitions';
import { COUNTRIES_LIST } from './countries';

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
  // Row 1: Quantity (Col1), Autograph Category (Col2), Custom Autograph Category (Col3), Authentication Included (Col4)
  {
    name: 'quantity',
    label: 'Quantity',
    inputType: 'number',
    requirement: 'recommended',
    validation: { min: 1 },
    defaultValue: '1',
    maxLength: 3,
    gridColumn: 'third',
  },
  {
    name: 'autographCategory',
    label: 'Autograph Category',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Sports', 'Entertainment', 'Historical', 'Music', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Autograph Category',
    gridColumn: 'third',
  },
  {
    name: 'customAutographCategory',
    label: 'Custom Autograph Category',
    inputType: 'text',
    requirement: 'conditional',
    conditionalLogic: 'Autograph Category = Other',
    gridColumn: 'third',
  },
  {
    name: 'authenticated',
    label: 'Authentication Included',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
    gridColumn: 'fourth',
  },
  // Row 2: Authentication Company, Custom Authentication Company, Authentication Type, Custom Authentication Type
  {
    name: 'authenticationCompany',
    label: 'Authentication Company',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['PSA/DNA', 'JSA', 'Beckett Authentication Services'],
    conditionalLogic: 'Authentication Included = Yes',
    gridColumn: 'third',
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
    gridColumn: 'third',
  },
  {
    name: 'certificateNumber',
    label: 'Certificate Number',
    inputType: 'text',
    requirement: 'required',
    conditionalLogic: 'Authentication Included = Yes',
    gridColumn: 'third',
  },
  {
    name: 'inscriptionPresent',
    label: 'Inscription Present',
    inputType: 'dropdown',
    requirement: 'recommended',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'inscriptionText',
    label: 'Inscription Text',
    inputType: 'text',
    requirement: 'recommended',
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
    name: 'setName',
    label: 'Set Name',
    inputType: 'text',
    requirement: 'required',
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
    name: 'numberOfCoins',
    label: 'Number of Coins',
    inputType: 'number',
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
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'originalPackaging',
    label: 'Original Packaging',
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
    name: 'certificationCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
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
    maxLength: 40,
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
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
    name: 'title',
    label: 'Comic Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'issueNumber',
    label: 'Issue Number',
    inputType: 'number',
    requirement: 'required',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'required',
  },
  {
    name: 'publisher',
    label: 'Publisher',
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
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'certificationCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
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
    maxLength: 40,
  },
  {
    name: 'numberOfSignatures',
    label: 'Number of Signatures',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
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
    dropdownOptions: ['Cover Art', 'Interior Page', 'Splash Page', 'Character Design', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Art Type',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'dimensions',
    label: 'Dimensions (inches)',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'medium',
    label: 'Medium',
    inputType: 'text',
    requirement: 'recommended',
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },
];

// Comics - Collection Lot
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
    name: 'numberOfItems',
    label: 'Number of Items',
    inputType: 'number',
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
    name: 'itemTypesIncluded',
    label: 'Item Types Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
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
  },
  {
    name: 'denomination',
    label: 'Denomination',
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
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'certificationCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
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
    maxLength: 40,
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },
];

// Coins - Paper Money/Banknotes
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
  },
  {
    name: 'denomination',
    label: 'Denomination',
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
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'certificationCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
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
    maxLength: 40,
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },
];

// Coins - Collection Lot
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
    name: 'numberOfItems',
    label: 'Number of Items',
    inputType: 'number',
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
    name: 'itemTypesIncluded',
    label: 'Item Types Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
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
  },
  {
    name: 'denomination',
    label: 'Denomination',
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
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'certificationCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
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
    maxLength: 40,
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },
];

// Stamps - Stamp Set/Sheet
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
  },
  {
    name: 'numberOfStamps',
    label: 'Number of Stamps',
    inputType: 'number',
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
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'certificationCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
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
    maxLength: 40,
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },
];

// Stamps - Collection Lot
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
    name: 'numberOfItems',
    label: 'Number of Items',
    inputType: 'number',
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
    name: 'itemTypesIncluded',
    label: 'Item Types Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
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
    name: 'title',
    label: 'Game Title',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'platform',
    label: 'Platform',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Nintendo', 'PlayStation', 'Xbox', 'Sega', 'Atari', 'Commodore', 'PC', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Platform',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'certificationCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
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
    maxLength: 40,
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
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
    name: 'consoleName',
    label: 'Console Name',
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
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'certificationCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
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
    maxLength: 40,
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
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
    dropdownOptions: ['Nintendo', 'PlayStation', 'Xbox', 'Sega', 'Atari', 'Commodore', 'PC', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Platform',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'certificationCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
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
    maxLength: 40,
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },
];

// Video Games - Collection Lot
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
    name: 'numberOfItems',
    label: 'Number of Items',
    inputType: 'number',
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
    name: 'itemTypesIncluded',
    label: 'Item Types Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
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
    name: 'title',
    label: 'Movie Title',
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
    name: 'format',
    label: 'Format',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['VHS', 'DVD', 'Blu-ray', 'LaserDisc', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Format',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'certificationCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
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
    maxLength: 40,
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
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
    name: 'setName',
    label: 'Set Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'numberOfDiscs',
    label: 'Number of Discs',
    inputType: 'number',
    requirement: 'required',
  },
  {
    name: 'format',
    label: 'Format',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['VHS', 'DVD', 'Blu-ray', 'LaserDisc', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Format',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'certificationCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
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
    maxLength: 40,
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },
];

// Movies - Collection Lot
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
    name: 'numberOfItems',
    label: 'Number of Items',
    inputType: 'number',
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
    name: 'itemTypesIncluded',
    label: 'Item Types Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
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
    name: 'cardName',
    label: 'Card Name',
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
    name: 'cardNumber',
    label: 'Card Number',
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
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'certificationCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
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
    maxLength: 40,
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
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
    name: 'setName',
    label: 'Set Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'numberOfCards',
    label: 'Number of Cards',
    inputType: 'number',
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
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'certificationCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
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
    maxLength: 40,
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
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
    name: 'productName',
    label: 'Product Name',
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
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'certificationCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
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
    maxLength: 40,
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },
];

// Pokemon - Collection Lot
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
    name: 'numberOfItems',
    label: 'Number of Items',
    inputType: 'number',
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
    name: 'itemTypesIncluded',
    label: 'Item Types Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },
];

// Sports Cards - Single Card
export const SPORTS_CARDS_SINGLE_CARD_FIELDS: FieldDefinition[] = [
  {
    name: 'listingTitle',
    label: 'Listing Title',
    inputType: 'text',
    requirement: 'required',
    gridColumn: 'third',
  },
  {
    name: 'tradeValue',
    label: 'Trade Value',
    inputType: 'currency',
    requirement: 'required',
    gridColumn: 'third',
  },
  {
    name: 'playerName',
    label: 'Player Name',
    inputType: 'text',
    requirement: 'required',
    gridColumn: 'third',
  },
  {
    name: 'sport',
    label: 'Sport',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Baseball', 'Basketball', 'Football', 'Hockey', 'Soccer', 'Other'],
    supportsOther: true,
    otherFieldName: 'Custom Sport',
    gridColumn: 'third',
  },
  {
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'required',
    gridColumn: 'third',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
    gridColumn: 'third',
  },
  {
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
    gridColumn: 'third',
  },
  {
    name: 'certificationCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
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
    maxLength: 40,
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
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
    name: 'setName',
    label: 'Set Name',
    inputType: 'text',
    requirement: 'required',
  },
  {
    name: 'numberOfCards',
    label: 'Number of Cards',
    inputType: 'number',
    requirement: 'required',
  },
  {
    name: 'sport',
    label: 'Sport',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Baseball', 'Basketball', 'Football', 'Hockey', 'Soccer', 'Other'],
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
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'certificationCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
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
    maxLength: 40,
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
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
    name: 'productName',
    label: 'Product Name',
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
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'certificationCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
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
    maxLength: 40,
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },
];

// Sports Cards - Collection Lot
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
    name: 'numberOfItems',
    label: 'Number of Items',
    inputType: 'number',
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
    name: 'itemTypesIncluded',
    label: 'Item Types Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
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
    name: 'characterName',
    label: 'Character Name',
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
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'isGraded',
    label: 'Is Graded',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'certificationCompany',
    label: 'Grading Company',
    inputType: 'dropdown',
    requirement: 'required',
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
    maxLength: 40,
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
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
    name: 'gameName',
    label: 'Game Name',
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
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
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
    name: 'toyName',
    label: 'Toy Name',
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
    dropdownOptions: ['Yes', 'No', 'Unknown'],
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },
];

// Vintage Toys - Model Kit
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
    name: 'kitName',
    label: 'Kit Name',
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
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'assembled',
    label: 'Assembled',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
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
    name: 'playsetName',
    label: 'Playset Name',
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
    dropdownOptions: ['Yes', 'No'],
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },
];

// Vintage Toys - Collection Lot
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
    name: 'numberOfItems',
    label: 'Number of Items',
    inputType: 'number',
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
    name: 'itemTypesIncluded',
    label: 'Item Types Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
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
    name: 'pinName',
    label: 'Pin Name',
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
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
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
    name: 'year',
    label: 'Year',
    inputType: 'number',
    requirement: 'recommended',
  },
  {
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },
];

// Disney Pins - Collection Lot
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
    name: 'numberOfItems',
    label: 'Number of Items',
    inputType: 'number',
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
    name: 'itemTypesIncluded',
    label: 'Item Types Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },
];

// Autographs - Collection Lot
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
    name: 'numberOfItems',
    label: 'Number of Items',
    inputType: 'number',
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
    name: 'itemTypesIncluded',
    label: 'Item Types Included',
    inputType: 'textarea',
    requirement: 'recommended',
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
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
    name: 'toyName',
    label: 'Toy Name',
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
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
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
    name: 'vehicleName',
    label: 'Vehicle Name',
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
    name: 'condition',
    label: 'Condition',
    inputType: 'dropdown',
    requirement: 'required',
    dropdownOptions: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'],
  },
  {
    name: 'description',
    label: 'Description',
    inputType: 'textarea',
    requirement: 'conditional',
    validation: { minLength: 20, maxLength: 4000 },
  },
  {
    name: 'photos',
    label: 'Photos',
    inputType: 'image-upload',
    requirement: 'required',
  },
];
