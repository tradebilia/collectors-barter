/**
 * Form Field Definitions and Constants
 * Defines all field types, categories, item types, and their configurations
 */

export type FieldInputType = 
  | 'text' 
  | 'number' 
  | 'currency' 
  | 'textarea' 
  | 'dropdown' 
  | 'image-upload' 
  | 'checkbox';

export type FieldRequirement = 'required' | 'recommended' | 'optional' | 'conditional';

export interface FieldDefinition {
  defaultValue?: string;
  name: string;
  label: string;
  inputType: FieldInputType;
  requirement: FieldRequirement;
  dropdownOptions?: string[];
  displayLabels?: Record<string, string>; // Map enum values to display labels
  supportsOther?: boolean;
  otherFieldName?: string;
  inlineCustomField?: boolean; // Display custom field inline with parent field
  conditionalLogic?: string; // e.g., "Is Graded = Yes"
  notes?: string;
  gridColumn?: 'full' | 'half' | 'third' | 'fourth'; // For multi-column layouts
  maxLength?: number; // Maximum character length for input fields
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
  };
}

export interface ItemTypeDefinition {
  name: string;
  displayName: string;
  fields: FieldDefinition[];
}

export interface CategoryDefinition {
  name: string;
  displayName: string;
  itemTypes: ItemTypeDefinition[];
  gradingCompanies: string[];
}

// Collectible Categories
export const COLLECTIBLE_CATEGORIES = [
  'sports_cards',
  'comics',
  'coins',
  'stamps',
  'video_games',
  'movies',
  'autographs',
  'vintage_toys',
  'disney_pins',
  'pokemon',
] as const;

export type CollectibleCategory = typeof COLLECTIBLE_CATEGORIES[number];

// Common field definitions
const LISTING_TITLE_FIELD: FieldDefinition = {
  name: 'title',
  label: 'Listing Title',
  inputType: 'text',
  requirement: 'required',
  validation: { minLength: 3, maxLength: 160 },
  gridColumn: 'half',
};

const TRADE_VALUE_FIELD: FieldDefinition = {
  name: 'estimatedValue',
  label: 'Trade Value',
  inputType: 'currency',
  requirement: 'required',
  validation: { min: 0 },
  gridColumn: 'half',
};

const CONDITION_FIELD: FieldDefinition = {
  name: 'condition',
  label: 'Condition',
  inputType: 'dropdown',
  requirement: 'required',
  dropdownOptions: ['mint', 'near_mint', 'excellent', 'very_good', 'good', 'fair', 'poor'],
  conditionalLogic: 'Is Graded = no',
  displayLabels: { 'mint': 'Mint', 'near_mint': 'Near Mint', 'excellent': 'Excellent', 'very_good': 'Very Good', 'good': 'Good', 'fair': 'Fair', 'poor': 'Poor' },
};

const PHOTOS_FIELD: FieldDefinition = {
  name: 'photos',
  label: 'Photos',
  inputType: 'image-upload',
  requirement: 'required',
};

const DESCRIPTION_FIELD: FieldDefinition = {
  name: 'description',
  label: 'Description',
  inputType: 'textarea',
  requirement: 'conditional',
  validation: { maxLength: 4000 },
};

const QUANTITY_FIELD: FieldDefinition = {
  name: 'quantity',
  label: 'Quantity',
  inputType: 'number',
  requirement: 'recommended',
  validation: { min: 1 },
  defaultValue: '1',
  maxLength: 3,
  gridColumn: 'third',
};

const SHIPPING_AVAILABLE_FIELD: FieldDefinition = {
  name: 'shippingAvailable',
  label: 'Shipping Available',
  inputType: 'dropdown',
  requirement: 'conditional',
  dropdownOptions: ['yes', 'local_only', 'in_person_only'],
  displayLabels: { 'yes': 'Yes', 'local_only': 'Local Only', 'in_person_only': 'In Person Only' },
};

const IS_GRADED_FIELD: FieldDefinition = {
  name: 'isGraded',
  label: 'Is Graded',
  inputType: 'dropdown',
  requirement: 'required',
  dropdownOptions: ['yes', 'no'],
  displayLabels: { 'yes': 'Yes', 'no': 'No' },
  gridColumn: 'third',
};

const GRADING_COMPANY_FIELD: FieldDefinition = {
  name: 'certificationCompany',
  label: 'Grading Company',
  inputType: 'dropdown',
  requirement: 'required',
  conditionalLogic: 'Is Graded = yes',
  supportsOther: true,
  otherFieldName: 'Custom Grading Company',
  gridColumn: 'third',
};

const GRADE_FIELD: FieldDefinition = {
  name: 'grade',
  label: 'Grade',
  inputType: 'text',
  requirement: 'required',
  conditionalLogic: 'Is Graded = yes',
  gridColumn: 'third',
};

const CERTIFICATION_NUMBER_FIELD: FieldDefinition = {
  name: 'certificationNumber',
  label: 'Certification Number',
  inputType: 'text',
  requirement: 'required',
  conditionalLogic: 'Is Graded = yes',
  maxLength: 40,
  gridColumn: 'third',
};

// Grading companies by category
export const GRADING_COMPANIES_BY_CATEGORY: Record<CollectibleCategory, string[]> = {
  sports_cards: [
    'PSA', 'BGS', 'SGC', 'CGC Cards', 'TAG Grading', 'HGA', 'Arena Club', 'Degree',
    'ACE', 'ISA', 'GMA', 'Rare Edition', 'FCG', 'MNT', 'KSA', 'PGA', 'RCG',
    'OnlyGraded', 'Diamond Service Grading', 'CGA Card Grading', 'TRCG', 'Pokegrade',
    'Tree Frog', 'AP', 'PRO', 'GEM', 'GAI', 'PCI', 'WCG'
  ],
  comics: ['CGC Comics', 'CBCS', 'PGX Comics'],
  coins: ['PCGS', 'NGC', 'ANACS', 'ICG', 'SEGS', 'SGS'],
  stamps: ['PSE', 'ASG', 'PSAG'],
  video_games: ['WATA Games (PSA Video Games)', 'CGC Video Games', 'VGA', 'CGC Home Video', 'IGS'],
  movies: ['CGC Home Video', 'VHS Grading', 'IGS'],
  autographs: [], // Autographs don't have grading companies for Signed Item
  vintage_toys: ['AFA', 'CAS', 'UKG'],
  disney_pins: [],
  pokemon: [
    'PSA', 'BGS', 'SGC', 'CGC Cards', 'TAG Grading', 'HGA', 'Arena Club', 'Degree',
    'ACE', 'ISA', 'GMA', 'Rare Edition', 'FCG', 'MNT', 'KSA', 'PGA', 'RCG',
    'OnlyGraded', 'Diamond Service Grading', 'CGA Card Grading', 'TRCG', 'Pokegrade',
    'Tree Frog', 'AP', 'PRO', 'GEM', 'GAI', 'PCI', 'WCG'
  ],
};

// Export category definitions (will be built dynamically from field_specifications.md)
// For now, we'll export the structure
export const CATEGORY_DEFINITIONS: Record<CollectibleCategory, CategoryDefinition> = {
  sports_cards: {
    name: 'sports_cards',
    displayName: 'Sports Cards',
    itemTypes: [],
    gradingCompanies: GRADING_COMPANIES_BY_CATEGORY.sports_cards,
  },
  comics: {
    name: 'comics',
    displayName: 'Comics',
    itemTypes: [],
    gradingCompanies: GRADING_COMPANIES_BY_CATEGORY.comics,
  },
  coins: {
    name: 'coins',
    displayName: 'Coins',
    itemTypes: [],
    gradingCompanies: GRADING_COMPANIES_BY_CATEGORY.coins,
  },
  stamps: {
    name: 'stamps',
    displayName: 'Stamps',
    itemTypes: [],
    gradingCompanies: GRADING_COMPANIES_BY_CATEGORY.stamps,
  },
  video_games: {
    name: 'video_games',
    displayName: 'Video Games',
    itemTypes: [],
    gradingCompanies: GRADING_COMPANIES_BY_CATEGORY.video_games,
  },
  movies: {
    name: 'movies',
    displayName: 'Movies',
    itemTypes: [],
    gradingCompanies: GRADING_COMPANIES_BY_CATEGORY.movies,
  },
  autographs: {
    name: 'autographs',
    displayName: 'Autographs',
    itemTypes: [],
    gradingCompanies: GRADING_COMPANIES_BY_CATEGORY.autographs,
  },
  vintage_toys: {
    name: 'vintage_toys',
    displayName: 'Vintage Toys',
    itemTypes: [],
    gradingCompanies: GRADING_COMPANIES_BY_CATEGORY.vintage_toys,
  },
  disney_pins: {
    name: 'disney_pins',
    displayName: 'Disney Pins',
    itemTypes: [],
    gradingCompanies: GRADING_COMPANIES_BY_CATEGORY.disney_pins,
  },
  pokemon: {
    name: 'pokemon',
    displayName: 'Pokemon',
    itemTypes: [],
    gradingCompanies: GRADING_COMPANIES_BY_CATEGORY.pokemon,
  },
};

// Export common fields for reuse
export const COMMON_FIELDS = {
  LISTING_TITLE_FIELD,
  TRADE_VALUE_FIELD,
  CONDITION_FIELD,
  PHOTOS_FIELD,
  DESCRIPTION_FIELD,
  QUANTITY_FIELD,
  SHIPPING_AVAILABLE_FIELD,
  IS_GRADED_FIELD,
  GRADING_COMPANY_FIELD,
  GRADE_FIELD,
  CERTIFICATION_NUMBER_FIELD,
};
