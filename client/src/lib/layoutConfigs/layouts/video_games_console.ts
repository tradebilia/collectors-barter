import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Video Games - Console Layout
 * 
 * Independent layout configuration for Video Games Console item type.
 * Changes here do NOT affect any other item type.
 */

export const video_gamesConsoleLayout: ItemTypeLayoutConfig = {
  itemType: 'console',
  category: 'video_games',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        condition: { colSpan: 'half', position: 3 },
        consoleName: { colSpan: 'half', position: 4 },
        workingCondition: { colSpan: 'half', position: 5 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        quantity: { colSpan: 'half', position: 1 },
        modelNumber: { colSpan: 'half', position: 2 },
        region: { colSpan: 'half', position: 3 },
        originalBoxIncluded: { colSpan: 'half', position: 4 },
        cablesIncluded: { colSpan: 'half', position: 5 },
        controllersIncluded: { colSpan: 'half', position: 6 },
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
