import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Video Games - Game Layout
 * 
 * Independent layout configuration for Video Games Game item type.
 * Changes here do NOT affect any other item type.
 */

export const video_gamesGameLayout: ItemTypeLayoutConfig = {
  itemType: 'game',
  category: 'video_games',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        gameTitle: { colSpan: 'half', position: 3 },
        platform: { colSpan: 'half', position: 4 },
        isGraded: { colSpan: 'half', position: 5 },
        condition: { colSpan: 'half', position: 6 },
        manualIncluded: { colSpan: 'half', position: 7 },
        originalCaseIncluded: { colSpan: 'half', position: 8 },
        gradingCompany: { colSpan: 'half', position: 9 },
        grade: { colSpan: 'half', position: 10 },
        certificationNumber: { colSpan: 'half', position: 11 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        quantity: { colSpan: 'half', position: 1 },
        releaseYear: { colSpan: 'half', position: 2 },
        region: { colSpan: 'half', position: 3 },
        completeInBox: { colSpan: 'half', position: 4 },
        sealed: { colSpan: 'half', position: 5 },
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
