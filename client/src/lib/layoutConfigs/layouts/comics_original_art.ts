import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Comics - Original Art Layout
 * 
 * Independent layout configuration for Comics Original Art item type.
 * Changes here do NOT affect any other item type.
 */

export const comicsOriginalartLayout: ItemTypeLayoutConfig = {
  itemType: 'original_art',
  category: 'comics',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        condition: { colSpan: 'half', position: 3 },
        artistName: { colSpan: 'half', position: 4 },
        artType: { colSpan: 'half', position: 5 },
        comicSeries: { colSpan: 'half', position: 6 },
        issueNumber: { colSpan: 'half', position: 7 },
        pageNumber: { colSpan: 'half', position: 8 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        quantity: { colSpan: 'half', position: 1 },
        artworkTitle: { colSpan: 'half', position: 2 },
        publisher: { colSpan: 'half', position: 3 },
        medium: { colSpan: 'half', position: 4 },
        yearCreated: { colSpan: 'half', position: 5 },
        signedByArtist: { colSpan: 'half', position: 6 },
        coaIncluded: { colSpan: 'half', position: 7 },
        dimensions: { colSpan: 'half', position: 8 },
        originalPublishedPage: { colSpan: 'half', position: 9 },
      },
    },
    optional: {
      columns: 1,
      fieldLayout: {
        framed: { colSpan: 'full', position: 1 },
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
