import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Comics - Collection/Lot Layout
 * 
 * Independent layout configuration for Comics Collection/Lot item type.
 * Changes here do NOT affect any other item type.
 */

export const comicsCollectionlotLayout: ItemTypeLayoutConfig = {
  itemType: 'collection_lot',
  category: 'comics',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        condition: { colSpan: 'half', position: 3 },
        numberOfComics: { colSpan: 'half', position: 4 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        publishersIncluded: { colSpan: 'half', position: 1 },
        majorTitlesIncluded: { colSpan: 'half', position: 2 },
        yearsIncluded: { colSpan: 'half', position: 3 },
      },
    },
    optional: {
      columns: 1,
      fieldLayout: {
        includesGradedComics: { colSpan: 'full', position: 1 },
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
