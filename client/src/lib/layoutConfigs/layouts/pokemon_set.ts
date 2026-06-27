import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Pokemon - Set Layout
 * 
 * Independent layout configuration for Pokemon Set item type.
 * Changes here do NOT affect any other item type.
 */

export const pokemonSetLayout: ItemTypeLayoutConfig = {
  itemType: 'set',
  category: 'pokemon',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        condition: { colSpan: 'half', position: 3 },
        setName: { colSpan: 'half', position: 4 },
        year: { colSpan: 'half', position: 5 },
        complete: { colSpan: 'half', position: 6 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        quantity: { colSpan: 'half', position: 1 },
      },
    },
    optional: {
      columns: 2,
      fieldLayout: {
        includesGradedCards: { colSpan: 'half', position: 1 },
        originalPackaging: { colSpan: 'half', position: 2 },
        notableCards: { colSpan: 'full', position: 3 },
        numberOfCardsInSet: { colSpan: 'full', position: 4 },
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
