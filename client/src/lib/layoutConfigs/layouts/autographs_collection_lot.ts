import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Autographs - Collection/Lot Layout
 * 
 * Independent layout configuration for Autographs Collection/Lot item type.
 * Changes here do NOT affect any other item type.
 */

export const autographsCollectionlotLayout: ItemTypeLayoutConfig = {
  itemType: 'collection_lot',
  category: 'autographs',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        condition: { colSpan: 'half', position: 3 },
        numberOfSignedItems: { colSpan: 'half', position: 4 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        signersIncluded: { colSpan: 'half', position: 1 },
        authenticationIncluded: { colSpan: 'half', position: 2 },
        notableItems: { colSpan: 'half', position: 3 },
        itemTypesIncluded: { colSpan: 'half', position: 4 },
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
