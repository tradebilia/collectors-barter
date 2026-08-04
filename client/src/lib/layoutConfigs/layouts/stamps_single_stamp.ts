import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Stamps - Single Stamp Layout
 * 
 * Independent layout configuration for Stamps Single Stamp item type.
 * Changes here do NOT affect any other item type.
 */

export const stampsSinglestampLayout: ItemTypeLayoutConfig = {
  itemType: 'single_stamp',
  category: 'stamps',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        country: { colSpan: 'half', position: 3 },
        year: { colSpan: 'half', position: 4 },
        mintOrUsed: { colSpan: 'half', position: 5 },
        isGraded: { colSpan: 'half', position: 6 },
        condition: { colSpan: 'half', position: 7 },
        gradingCompany: { colSpan: 'half', position: 8 },
        grade: { colSpan: 'half', position: 9 },
        certificationNumber: { colSpan: 'half', position: 10 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        quantity: { colSpan: 'half', position: 1 },
        denomination: { colSpan: 'half', position: 2 },
      },
    },
    optional: {
      columns: 1,
      fieldLayout: {
        hinged: { colSpan: 'full', position: 1 },
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
