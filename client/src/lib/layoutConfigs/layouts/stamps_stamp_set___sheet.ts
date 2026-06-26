import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Stamps - Stamp Set / Sheet Layout
 * 
 * Independent layout configuration for Stamps Stamp Set / Sheet item type.
 * Changes here do NOT affect any other item type.
 */

export const stampsStampsetsheetLayout: ItemTypeLayoutConfig = {
  itemType: 'stamp_set___sheet',
  category: 'stamps',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        country: { colSpan: 'half', position: 3 },
        setName: { colSpan: 'half', position: 4 },
        sheetType: { colSpan: 'half', position: 5 },
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
        year: { colSpan: 'half', position: 2 },
        numberOfStampsInSet: { colSpan: 'half', position: 3 },
        mintOrUsed: { colSpan: 'half', position: 4 },
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
