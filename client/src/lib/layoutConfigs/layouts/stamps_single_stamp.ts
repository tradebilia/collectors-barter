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
        gum: { colSpan: 'half', position: 6 },
        hinged: { colSpan: 'half', position: 7 },
        isGraded: { colSpan: 'half', position: 8 },
        condition: { colSpan: 'half', position: 9 },
        gradingCompany: { colSpan: 'half', position: 10 },
        grade: { colSpan: 'half', position: 11 },
        certificationNumber: { colSpan: 'half', position: 12 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        quantity: { colSpan: 'half', position: 1 },
        denomination: { colSpan: 'half', position: 2 },
        perforation: { colSpan: 'half', position: 3 },
        watermark: { colSpan: 'half', position: 4 },
        overprintSurcharge: { colSpan: 'full', position: 5 },
      },
    },
    optional: {
      columns: 1,
      fieldLayout: {},
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
