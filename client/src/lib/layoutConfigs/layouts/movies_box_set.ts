import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Movies - Box Set Layout
 * 
 * Independent layout configuration for Movies Box Set item type.
 * Changes here do NOT affect any other item type.
 */

export const moviesBoxsetLayout: ItemTypeLayoutConfig = {
  itemType: 'box_set',
  category: 'movies',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        condition: { colSpan: 'half', position: 3 },
        boxSetName: { colSpan: 'half', position: 4 },
        format: { colSpan: 'half', position: 5 },
        isGraded: { colSpan: 'half', position: 6 },
        gradingCompany: { colSpan: 'half', position: 7 },
        grade: { colSpan: 'half', position: 8 },
        certificationNumber: { colSpan: 'half', position: 9 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        quantity: { colSpan: 'half', position: 1 },
        numberOfMoviesInSet: { colSpan: 'half', position: 2 },
        sealed: { colSpan: 'half', position: 3 },
      },
    },
    optional: {
      columns: 1,
      fieldLayout: {
        edition: { colSpan: 'full', position: 1 },
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
