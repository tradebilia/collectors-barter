import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Coins - Collection/Lot Layout
 * 
 * Independent layout configuration for Coins Collection/Lot item type.
 * Changes here do NOT affect any other item type.
 */

export const coinsCollectionlotLayout: ItemTypeLayoutConfig = {
  itemType: 'collection_lot',
  category: 'coins',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        condition: { colSpan: 'half', position: 3 },
        approximateCoinCount: { colSpan: 'half', position: 4 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        countriesIncluded: { colSpan: 'half', position: 1 },
        yearsIncluded: { colSpan: 'half', position: 2 },
        notableCoins: { colSpan: 'half', position: 3 },
      },
    },
    optional: {
      columns: 1,
      fieldLayout: {
        includesGradedCoins: { colSpan: 'full', position: 1 },
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
