import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Vintage Toys - Plush / Stuffed Toy Layout
 * 
 * Independent layout configuration for Vintage Toys Plush / Stuffed Toy item type.
 * Changes here do NOT affect any other item type.
 */

export const vintage_toysPlushstuffedtoyLayout: ItemTypeLayoutConfig = {
  itemType: 'plush___stuffed_toy',
  category: 'vintage_toys',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        condition: { colSpan: 'half', position: 3 },
        toyNameCharacter: { colSpan: 'half', position: 4 },
        isGraded: { colSpan: 'half', position: 5 },
        gradingCompany: { colSpan: 'half', position: 6 },
        grade: { colSpan: 'half', position: 7 },
        certificationNumber: { colSpan: 'half', position: 8 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        quantity: { colSpan: 'half', position: 1 },
        brand: { colSpan: 'half', position: 2 },
        year: { colSpan: 'half', position: 3 },
        tagsAttached: { colSpan: 'half', position: 4 },
      },
    },
    optional: {
      columns: 1,
      fieldLayout: {
        cleanlinessOdorNotes: { colSpan: 'full', position: 1 },
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
