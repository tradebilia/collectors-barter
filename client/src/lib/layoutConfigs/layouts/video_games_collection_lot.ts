import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Video Games - Collection/Lot Layout
 * 
 * Independent layout configuration for Video Games Collection/Lot item type.
 * Changes here do NOT affect any other item type.
 */

export const video_gamesCollectionlotLayout: ItemTypeLayoutConfig = {
  itemType: 'collection_lot',
  category: 'video_games',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        condition: { colSpan: 'half', position: 3 },
        approximateItemCount: { colSpan: 'half', position: 4 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        platformsIncluded: { colSpan: 'half', position: 1 },
        notableGamesConsoles: { colSpan: 'half', position: 2 },
      },
    },
    optional: {
      columns: 1,
      fieldLayout: {
        includesGradedGames: { colSpan: 'full', position: 1 },
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
