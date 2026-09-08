import type { FieldDefinition } from './formFieldDefinitions';

/** Compact Vintage Toys → LEGO field flow. */
export const VINTAGE_TOYS_LEGO_FIELDS: FieldDefinition[] = [
  { name: 'listingTitle', label: 'Listing Title', inputType: 'text', requirement: 'required' },
  { name: 'tradeValue', label: 'Trade Value', inputType: 'currency', requirement: 'required' },
  { name: 'photos', label: 'Photos', inputType: 'image-upload', requirement: 'required' },
  {
    name: 'isGraded', label: 'Is Graded', inputType: 'dropdown', requirement: 'required',
    dropdownOptions: ['yes', 'no'], displayLabels: { yes: 'Yes', no: 'No' },
  },
  {
    name: 'condition', label: 'Condition', inputType: 'dropdown', requirement: 'conditional',
    conditionalLogic: 'Is Graded = no',
    dropdownOptions: ['sealed', 'excellent', 'good', 'fair', 'for_parts'],
    displayLabels: { sealed: 'New / Sealed', excellent: 'Excellent', good: 'Good', fair: 'Fair', for_parts: 'For Parts' },
  },
  {
    name: 'gradingCompany', label: 'Grading Company', inputType: 'dropdown', requirement: 'required',
    conditionalLogic: 'Is Graded = yes', dropdownOptions: ['AFA', 'CAS', 'UKG', 'Other'], supportsOther: true,
    inlineCustomField: true, otherFieldName: 'Custom Grading Company',
  },
  { name: 'grade', label: 'Grade', inputType: 'text', requirement: 'required', conditionalLogic: 'Is Graded = yes', maxLength: 20 },
  { name: 'certificationNumber', label: 'Certification Number', inputType: 'text', requirement: 'required', conditionalLogic: 'Is Graded = yes', maxLength: 40 },
  { name: 'setNumber', label: 'Set Number', inputType: 'text', requirement: 'recommended', maxLength: 30 },
  { name: 'theme', label: 'Theme', inputType: 'text', requirement: 'recommended', maxLength: 80 },
  {
    name: 'complete', label: 'Complete', inputType: 'dropdown', requirement: 'recommended',
    dropdownOptions: ['yes', 'no', 'unknown'], displayLabels: { yes: 'Yes', no: 'No', unknown: 'Unknown' },
  },
  { name: 'quantity', label: 'Quantity', inputType: 'number', requirement: 'recommended', maxLength: 4 },
  {
    name: 'packagingType', label: 'Packaging Type', inputType: 'dropdown', requirement: 'recommended',
    dropdownOptions: ['sealed', 'opened', 'no_box', 'unknown'],
    displayLabels: { sealed: 'Sealed', opened: 'Opened', no_box: 'No Box', unknown: 'Unknown' },
  },
  {
    name: 'instructionsIncluded', label: 'Instructions Included', inputType: 'dropdown', requirement: 'optional',
    dropdownOptions: ['yes', 'digital_only', 'no', 'unknown'],
    displayLabels: { yes: 'Yes', digital_only: 'Digital Only', no: 'No', unknown: 'Unknown' },
  },
  {
    name: 'minifiguresIncluded', label: 'Minifigures Included', inputType: 'dropdown', requirement: 'optional',
    dropdownOptions: ['yes', 'some', 'no', 'unknown'], displayLabels: { yes: 'Yes', some: 'Some', no: 'No', unknown: 'Unknown' },
  },
  { name: 'releaseYear', label: 'Release Year', inputType: 'number', requirement: 'optional', maxLength: 4 },
  { name: 'pieceCount', label: 'Piece Count', inputType: 'number', requirement: 'optional', maxLength: 6 },
  {
    name: 'retiredStatus', label: 'Retired Status', inputType: 'dropdown', requirement: 'optional',
    dropdownOptions: ['current', 'retired', 'unknown'], displayLabels: { current: 'Current', retired: 'Retired', unknown: 'Unknown' },
  },
  {
    name: 'boxCondition', label: 'Box Condition', inputType: 'dropdown', requirement: 'optional',
    conditionalLogic: 'Packaging Type = opened', dropdownOptions: ['excellent', 'good', 'fair', 'poor'],
    displayLabels: { excellent: 'Excellent', good: 'Good', fair: 'Fair', poor: 'Poor' },
  },
  {
    name: 'instructionCondition', label: 'Instruction Condition', inputType: 'dropdown', requirement: 'optional',
    conditionalLogic: 'Instructions Included = yes', dropdownOptions: ['excellent', 'good', 'fair', 'poor'],
    displayLabels: { excellent: 'Excellent', good: 'Good', fair: 'Fair', poor: 'Poor' },
  },
  { name: 'minifigureDetails', label: 'Minifigure Details', inputType: 'textarea', requirement: 'optional', conditionalLogic: 'Minifigures Included = yes' },
  { name: 'missingDetails', label: 'What Is Missing?', inputType: 'textarea', requirement: 'recommended', conditionalLogic: 'Complete = no' },
];
