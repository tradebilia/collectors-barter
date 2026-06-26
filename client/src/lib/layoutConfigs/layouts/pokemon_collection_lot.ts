import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Pokemon - Collection/Lot Layout
 * 
 * Independent layout configuration for Pokemon Collection/Lot item type.
 * Changes here do NOT affect any other item type.
 */

export const pokemonCollectionlotLayout: ItemTypeLayoutConfig = {
  itemType: 'collection_lot',
  category: 'pokemon',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        condition: { colSpan: 'half', position: 3 },
        approximateCardCount: { colSpan: 'half', position: 4 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        erasSeriesIncluded: { colSpan: 'half', position: 1 },
        notableCards: { colSpan: 'half', position: 2 },
      },
    },
    optional: {
      columns: 1,
      fieldLayout: {
        includesGradedCards: { colSpan: 'full', position: 1 },
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
