import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Sports Cards - Set Layout
 * 
 * Independent layout configuration for Sports Cards Set item type.
 * Changes here do NOT affect any other item type.
 */

export const sports_cardsSetLayout: ItemTypeLayoutConfig = {
  itemType: 'set',
  category: 'sports_cards',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        condition: { colSpan: 'half', position: 3 },
        sport: { colSpan: 'half', position: 4 },
        year: { colSpan: 'half', position: 5 },
        manufacturer: { colSpan: 'half', position: 6 },
        setName: { colSpan: 'half', position: 7 },
        setType: { colSpan: 'half', position: 8 },
        missingCards: { colSpan: 'half', position: 9 },
        missingCardDetails: { colSpan: 'half', position: 10 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        quantity: { colSpan: 'half', position: 1 },
      },
    },
    optional: {
      columns: 1,
      fieldLayout: {
        numberOfCardsInSet: { colSpan: 'full', position: 1 },
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
