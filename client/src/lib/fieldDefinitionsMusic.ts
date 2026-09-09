import type { FieldDefinition } from './formFieldDefinitions';

export const MUSIC_FORMAT_OPTIONS = [
  { value: 'vinyl_record', label: 'Vinyl Record' },
  { value: 'cassette_tape', label: 'Cassette Tape' },
  { value: 'compact_disc', label: 'CD' },
  { value: 'eight_track_tape', label: '8-Track Tape' },
  { value: 'other_music_format', label: 'Other Music Format' },
] as const;

export const MUSIC_GRADING_COMPANIES = ['AMG', 'MGA', 'Rewind', 'Other'];

const musicCoreFields: FieldDefinition[] = [
  { name: 'listingTitle', label: 'Listing Title', inputType: 'text', requirement: 'required', maxLength: 160 },
  { name: 'artist', label: 'Artist / Performer', inputType: 'text', requirement: 'required', maxLength: 160 },
  { name: 'releaseTitle', label: 'Album / Release Title', inputType: 'text', requirement: 'required', maxLength: 160 },
  { name: 'tradeValue', label: 'Trade Value', inputType: 'currency', requirement: 'required' },
  { name: 'photos', label: 'Photos', inputType: 'image-upload', requirement: 'required' },
  {
    name: 'isGraded', label: 'Is Graded', inputType: 'dropdown', requirement: 'required',
    dropdownOptions: ['yes', 'no'], displayLabels: { yes: 'Yes', no: 'No' },
  },
  {
    name: 'condition', label: 'Media Condition', inputType: 'dropdown', requirement: 'conditional', conditionalLogic: 'Is Graded = no',
    dropdownOptions: ['sealed', 'excellent', 'good', 'fair', 'for_parts'],
    displayLabels: { sealed: 'New / Sealed', excellent: 'Excellent', good: 'Good', fair: 'Fair', for_parts: 'For Parts' },
  },
  {
    name: 'gradingCompany', label: 'Grading Company', inputType: 'dropdown', requirement: 'required', conditionalLogic: 'Is Graded = yes',
    dropdownOptions: MUSIC_GRADING_COMPANIES, supportsOther: true, inlineCustomField: true, otherFieldName: 'Custom Grading Company',
  },
  { name: 'grade', label: 'Grade', inputType: 'text', requirement: 'required', conditionalLogic: 'Is Graded = yes', maxLength: 20 },
  { name: 'certificationNumber', label: 'Certification Number', inputType: 'text', requirement: 'required', conditionalLogic: 'Is Graded = yes', maxLength: 40 },
  { name: 'recordLabel', label: 'Record Label', inputType: 'text', requirement: 'recommended', maxLength: 120 },
  { name: 'catalogNumber', label: 'Catalog Number', inputType: 'text', requirement: 'recommended', maxLength: 80 },
  { name: 'releaseYear', label: 'Release Year', inputType: 'number', requirement: 'recommended', maxLength: 4 },
  { name: 'country', label: 'Country of Release', inputType: 'text', requirement: 'recommended', maxLength: 100 },
  { name: 'edition', label: 'Edition / Variant', inputType: 'text', requirement: 'recommended', maxLength: 120 },
  {
    name: 'playbackTested', label: 'Playback Tested', inputType: 'dropdown', requirement: 'recommended',
    dropdownOptions: ['yes', 'no', 'unknown'], displayLabels: { yes: 'Yes', no: 'No', unknown: 'Unknown' },
  },
  {
    name: 'packagingIncluded', label: 'Original Packaging Included', inputType: 'dropdown', requirement: 'recommended',
    dropdownOptions: ['yes', 'no', 'unknown'], displayLabels: { yes: 'Yes', no: 'No', unknown: 'Unknown' },
  },
  { name: 'genre', label: 'Genre', inputType: 'text', requirement: 'optional', maxLength: 100 },
  {
    name: 'packagingCondition', label: 'Packaging / Case Condition', inputType: 'dropdown', requirement: 'optional', conditionalLogic: 'Packaging Included = yes',
    dropdownOptions: ['excellent', 'good', 'fair', 'poor'], displayLabels: { excellent: 'Excellent', good: 'Good', fair: 'Fair', poor: 'Poor' },
  },
  { name: 'playbackNotes', label: 'Playback Notes', inputType: 'textarea', requirement: 'optional', conditionalLogic: 'Playback Tested = yes', maxLength: 1000 },
];

const createMusicFields = (formatSpecificFields: FieldDefinition[]) => [
  ...musicCoreFields,
  ...formatSpecificFields,
];

export const MUSIC_VINYL_RECORD_FIELDS = createMusicFields([
  {
    name: 'recordSize', label: 'Record Size', inputType: 'dropdown', requirement: 'optional',
    dropdownOptions: ['7_inch', '10_inch', '12_inch', 'other'], displayLabels: { '7_inch': '7-inch', '10_inch': '10-inch', '12_inch': '12-inch', other: 'Other' },
  },
  {
    name: 'playbackSpeed', label: 'Playback Speed', inputType: 'dropdown', requirement: 'optional',
    dropdownOptions: ['33_rpm', '45_rpm', '78_rpm', 'other'], displayLabels: { '33_rpm': '33 RPM', '45_rpm': '45 RPM', '78_rpm': '78 RPM', other: 'Other' },
  },
  { name: 'pressingDetails', label: 'Pressing / Matrix Notes', inputType: 'textarea', requirement: 'optional', maxLength: 1000 },
]);

export const MUSIC_CASSETTE_TAPE_FIELDS = createMusicFields([
  { name: 'inlayBookletStatus', label: 'Inlay / Booklet Status', inputType: 'text', requirement: 'optional', maxLength: 120 },
]);

export const MUSIC_COMPACT_DISC_FIELDS = createMusicFields([
  { name: 'bookletStatus', label: 'Booklet / Insert Status', inputType: 'text', requirement: 'optional', maxLength: 120 },
]);

export const MUSIC_EIGHT_TRACK_TAPE_FIELDS = createMusicFields([
  { name: 'cartridgeNotes', label: 'Cartridge / Label Notes', inputType: 'textarea', requirement: 'optional', maxLength: 1000 },
]);

export const MUSIC_OTHER_FORMAT_FIELDS = createMusicFields([
  { name: 'formatDetails', label: 'Format Details', inputType: 'text', requirement: 'required', maxLength: 120 },
]);
