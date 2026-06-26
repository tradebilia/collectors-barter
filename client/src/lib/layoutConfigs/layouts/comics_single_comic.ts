import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Comics - Single Comic Layout
 * 
 * Independent layout configuration for Comics Single Comic item type.
 * Changes here do NOT affect any other item type.
 */

export const comicsSinglecomicLayout: ItemTypeLayoutConfig = {
  itemType: 'single_comic',
  category: 'comics',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        comicTitle: { colSpan: 'half', position: 3 },
        issueNumber: { colSpan: 'half', position: 4 },
        publisher: { colSpan: 'half', position: 5 },
        isGraded: { colSpan: 'half', position: 6 },
        condition: { colSpan: 'half', position: 7 },
        variantDescription: { colSpan: 'half', position: 8 },
        characterName: { colSpan: 'half', position: 9 },
        gradingCompany: { colSpan: 'half', position: 10 },
        grade: { colSpan: 'half', position: 11 },
        certificationNumber: { colSpan: 'half', position: 12 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        quantity: { colSpan: 'half', position: 1 },
        publicationYear: { colSpan: 'half', position: 2 },
        variantCover: { colSpan: 'half', position: 3 },
        keyIssue: { colSpan: 'half', position: 4 },
        signed: { colSpan: 'half', position: 5 },
      },
    },
    optional: {
      columns: 1,
      fieldLayout: {
        volume: { colSpan: 'full', position: 1 },
        firstAppearance: { colSpan: 'full', position: 2 },
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
