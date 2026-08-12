import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Vintage Toys - Board Game / Puzzle Layout
 * 
 * Independent layout configuration for Vintage Toys Board Game / Puzzle item type.
 * Changes here do NOT affect any other item type.
 */

export const vintage_toysBoardgamepuzzleLayout: ItemTypeLayoutConfig = {
  itemType: 'board_game___puzzle',
  category: 'vintage_toys',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        condition: { colSpan: 'half', position: 3 },
        gamePuzzleName: { colSpan: 'half', position: 4 },
        publisherBrand: { colSpan: 'half', position: 5 },
        complete: { colSpan: 'half', position: 6 },
        isGraded: { colSpan: 'half', position: 7 },
        missingPieces: { colSpan: 'half', position: 8 },
        gradingCompany: { colSpan: 'half', position: 9 },
        grade: { colSpan: 'half', position: 10 },
        certificationNumber: { colSpan: 'half', position: 11 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        quantity: { colSpan: 'half', position: 1 },
        year: { colSpan: 'half', position: 2 },
        numberOfPieces: { colSpan: 'half', position: 3 },
        instructionsIncluded: { colSpan: 'half', position: 4 },
        boxIncluded: { colSpan: 'half', position: 5 },
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
