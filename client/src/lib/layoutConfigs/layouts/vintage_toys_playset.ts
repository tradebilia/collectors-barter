import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Vintage Toys - Playset Layout
 * 
 * Independent layout configuration for Vintage Toys Playset item type.
 * Changes here do NOT affect any other item type.
 */

export const vintage_toysPlaysetLayout: ItemTypeLayoutConfig = {
  itemType: 'playset',
  category: 'vintage_toys',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        condition: { colSpan: 'half', position: 3 },
        playsetName: { colSpan: 'half', position: 4 },
        complete: { colSpan: 'half', position: 5 },
        isGraded: { colSpan: 'half', position: 6 },
        missingPieces: { colSpan: 'half', position: 7 },
        gradingCompany: { colSpan: 'half', position: 8 },
        grade: { colSpan: 'half', position: 9 },
        certificationNumber: { colSpan: 'half', position: 10 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        quantity: { colSpan: 'half', position: 1 },
        brand: { colSpan: 'half', position: 2 },
        franchise: { colSpan: 'half', position: 3 },
        year: { colSpan: 'half', position: 4 },
        instructionsIncluded: { colSpan: 'half', position: 5 },
        originalBoxIncluded: { colSpan: 'half', position: 6 },
      },
    },
    optional: {
      columns: 1,
      fieldLayout: {
      },
    },
  },
  spacing: {
    gap: 'gap-6',
    padding: 'p-4',
  },
  conditionalFieldPlacement: {
    isGraded: 'right',
    signed: 'right',
    sealed: 'right',
  },
};
