import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Video Games - Accessory Layout
 * 
 * Independent layout configuration for Video Games Accessory item type.
 * Changes here do NOT affect any other item type.
 */

export const video_gamesAccessoryLayout: ItemTypeLayoutConfig = {
  itemType: 'accessory',
  category: 'video_games',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        condition: { colSpan: 'half', position: 3 },
        accessoryType: { colSpan: 'half', position: 4 },
        accessoryName: { colSpan: 'half', position: 5 },
        platform: { colSpan: 'half', position: 6 },
        workingCondition: { colSpan: 'half', position: 7 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        quantity: { colSpan: 'half', position: 1 },
        originalPackaging: { colSpan: 'half', position: 2 },
        manufacturer: { colSpan: 'half', position: 3 },
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
