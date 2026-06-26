import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Coins - Coin Set Layout
 * 
 * Independent layout configuration for Coins Coin Set item type.
 * Changes here do NOT affect any other item type.
 */

export const coinsCoinsetLayout: ItemTypeLayoutConfig = {
  itemType: 'coin_set',
  category: 'coins',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        condition: { colSpan: 'half', position: 3 },
        setName: { colSpan: 'half', position: 4 },
        country: { colSpan: 'half', position: 5 },
        year: { colSpan: 'half', position: 6 },
        setType: { colSpan: 'half', position: 7 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        quantity: { colSpan: 'half', position: 1 },
        originalPackagingIncluded: { colSpan: 'half', position: 2 },
        numberOfCoinsInSet: { colSpan: 'half', position: 3 },
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
