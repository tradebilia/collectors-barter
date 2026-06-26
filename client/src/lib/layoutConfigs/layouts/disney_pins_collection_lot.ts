import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Disney Pins - Collection/Lot Layout
 * 
 * Independent layout configuration for Disney Pins Collection/Lot item type.
 * Changes here do NOT affect any other item type.
 */

export const disney_pinsCollectionlotLayout: ItemTypeLayoutConfig = {
  itemType: 'collection_lot',
  category: 'disney_pins',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        condition: { colSpan: 'half', position: 3 },
        approximatePinCount: { colSpan: 'half', position: 4 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        charactersIncluded: { colSpan: 'half', position: 1 },
        seriesIncluded: { colSpan: 'half', position: 2 },
        limitedEditionPinsIncluded: { colSpan: 'half', position: 3 },
      },
    },
    optional: {
      columns: 1,
      fieldLayout: {
        apPpPinsIncluded: { colSpan: 'full', position: 1 },
        backerCardsIncluded: { colSpan: 'full', position: 2 },
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
