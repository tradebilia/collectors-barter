import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Movies - Collection/Lot Layout
 * 
 * Independent layout configuration for Movies Collection/Lot item type.
 * Changes here do NOT affect any other item type.
 */

export const moviesCollectionlotLayout: ItemTypeLayoutConfig = {
  itemType: 'collection_lot',
  category: 'movies',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        condition: { colSpan: 'half', position: 3 },
        approximateQuantity: { colSpan: 'half', position: 4 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        formatsIncluded: { colSpan: 'half', position: 1 },
        notableTitles: { colSpan: 'half', position: 2 },
      },
    },
    optional: {
      columns: 1,
      fieldLayout: {
        sealedItemsIncluded: { colSpan: 'full', position: 1 },
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
