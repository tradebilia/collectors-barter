import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Vintage Toys - Model / Kit Layout
 * 
 * Independent layout configuration for Vintage Toys Model / Kit item type.
 * Changes here do NOT affect any other item type.
 */

export const vintage_toysModelkitLayout: ItemTypeLayoutConfig = {
  itemType: 'model___kit',
  category: 'vintage_toys',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        condition: { colSpan: 'half', position: 3 },
        modelKitName: { colSpan: 'half', position: 4 },
        builtOrUnbuilt: { colSpan: 'half', position: 5 },
        isGraded: { colSpan: 'half', position: 6 },
        gradingCompany: { colSpan: 'half', position: 7 },
        grade: { colSpan: 'half', position: 8 },
        certificationNumber: { colSpan: 'half', position: 9 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        quantity: { colSpan: 'half', position: 1 },
        brand: { colSpan: 'half', position: 2 },
        scale: { colSpan: 'half', position: 3 },
        complete: { colSpan: 'half', position: 4 },
        instructionsIncluded: { colSpan: 'half', position: 5 },
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
