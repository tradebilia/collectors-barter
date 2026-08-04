import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Movies - Individual Movie Layout
 * 
 * Independent layout configuration for Movies Individual Movie item type.
 * Changes here do NOT affect any other item type.
 */

export const moviesIndividualmovieLayout: ItemTypeLayoutConfig = {
  itemType: 'individual_movie',
  category: 'movies',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        title: { colSpan: 'half', position: 3 },
        format: { colSpan: 'half', position: 4 },
        isGraded: { colSpan: 'half', position: 5 },
        condition: { colSpan: 'half', position: 6 },
        gradingCompany: { colSpan: 'half', position: 7 },
        grade: { colSpan: 'half', position: 8 },
        certificationNumber: { colSpan: 'half', position: 9 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        quantity: { colSpan: 'half', position: 1 },
        releaseYear: { colSpan: 'half', position: 2 },
        sealed: { colSpan: 'half', position: 3 },
      },
    },
    optional: {
      columns: 1,
      fieldLayout: {
        edition: { colSpan: 'full', position: 1 },
        region: { colSpan: 'full', position: 2 },
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
