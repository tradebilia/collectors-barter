import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Coins - Single Coin Layout
 * 
 * Independent layout configuration for Coins Single Coin item type.
 * Changes here do NOT affect any other item type.
 */

export const coinsSinglecoinLayout: ItemTypeLayoutConfig = {
  itemType: 'single_coin',
  category: 'coins',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        country: { colSpan: 'half', position: 3 },
        denomination: { colSpan: 'half', position: 4 },
        year: { colSpan: 'half', position: 5 },
        isGraded: { colSpan: 'half', position: 6 },
        condition: { colSpan: 'half', position: 7 },
        gradingCompany: { colSpan: 'half', position: 8 },
        grade: { colSpan: 'half', position: 9 },
        certificationNumber: { colSpan: 'half', position: 10 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        quantity: { colSpan: 'half', position: 1 },
        mintMark: { colSpan: 'half', position: 2 },
        variety: { colSpan: 'half', position: 3 },
        composition: { colSpan: 'half', position: 4 },
        weight: { colSpan: 'half', position: 5 },
        diameter: { colSpan: 'half', position: 6 },
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
