import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Disney Pins - Pin Set Layout
 * 
 * Independent layout configuration for Disney Pins Pin Set item type.
 * Changes here do NOT affect any other item type.
 */

export const disney_pinsPinsetLayout: ItemTypeLayoutConfig = {
  itemType: 'pin_set',
  category: 'disney_pins',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        condition: { colSpan: 'half', position: 3 },
        setName: { colSpan: 'half', position: 4 },
        completeSet: { colSpan: 'half', position: 5 },
        missingPins: { colSpan: 'half', position: 6 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        quantity: { colSpan: 'half', position: 1 },
        numberOfPins: { colSpan: 'half', position: 2 },
        limitedEdition: { colSpan: 'half', position: 3 },
        series: { colSpan: 'half', position: 4 },
        charactersIncluded: { colSpan: 'half', position: 5 },
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
