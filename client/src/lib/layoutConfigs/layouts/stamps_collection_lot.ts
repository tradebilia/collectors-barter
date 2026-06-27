import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Stamps - Collection/Lot Layout
 * 
 * Independent layout configuration for Stamps Collection/Lot item type.
 * Changes here do NOT affect any other item type.
 */

export const stampsCollectionlotLayout: ItemTypeLayoutConfig = {
  itemType: 'collection_lot',
  category: 'stamps',
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
      columns: 1,
      fieldLayout: {
        yearsIncluded: { colSpan: 'full', position: 1 },
        countriesIncluded: { colSpan: 'full', position: 2 },
        notableStamps: { colSpan: 'full', position: 3 },
      },
    },
    optional: {
      columns: 1,
      fieldLayout: {
        albumIncluded: { colSpan: 'full', position: 1 },
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
