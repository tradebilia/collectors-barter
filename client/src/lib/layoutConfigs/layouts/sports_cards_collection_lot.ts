import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Sports Cards - Collection/Lot Layout
 * 
 * Independent layout configuration for Sports Cards Collection/Lot item type.
 * Changes here do NOT affect any other item type.
 */

export const sports_cardsCollectionlotLayout: ItemTypeLayoutConfig = {
  itemType: 'collection_lot',
  category: 'sports_cards',
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
        sport: { colSpan: 'half', position: 1 },
        yearsIncluded: { colSpan: 'half', position: 2 },
        manufacturersIncluded: { colSpan: 'half', position: 3 },
        notablePlayers: { colSpan: 'half', position: 4 },
        notableCards: { colSpan: 'half', position: 5 },
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
