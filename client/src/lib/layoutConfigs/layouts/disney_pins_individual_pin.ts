import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Disney Pins - Individual Pin Layout
 * 
 * Independent layout configuration for Disney Pins Individual Pin item type.
 * Changes here do NOT affect any other item type.
 */

export const disney_pinsIndividualpinLayout: ItemTypeLayoutConfig = {
  itemType: 'individual_pin',
  category: 'disney_pins',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        condition: { colSpan: 'half', position: 3 },
        pinName: { colSpan: 'half', position: 4 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        quantity: { colSpan: 'half', position: 1 },
        character: { colSpan: 'half', position: 2 },
        series: { colSpan: 'half', position: 3 },
        year: { colSpan: 'half', position: 4 },
        pinTradingEvent: { colSpan: 'half', position: 5 },
        limitedEdition: { colSpan: 'half', position: 6 },
        openEdition: { colSpan: 'half', position: 7 },
        artistProof: { colSpan: 'half', position: 8 },
        preProduction: { colSpan: 'half', position: 9 },
        backstampInformation: { colSpan: 'half', position: 10 },
      },
    },
    optional: {
      columns: 1,
      fieldLayout: {
        backerCardIncluded: { colSpan: 'full', position: 1 },
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
