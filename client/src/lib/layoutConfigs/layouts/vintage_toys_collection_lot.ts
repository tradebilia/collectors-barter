import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Vintage Toys - Collection/Lot Layout
 * 
 * Independent layout configuration for Vintage Toys Collection/Lot item type.
 * Changes here do NOT affect any other item type.
 */

export const vintage_toysCollectionlotLayout: ItemTypeLayoutConfig = {
  itemType: 'collection_lot',
  category: 'vintage_toys',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        condition: { colSpan: 'half', position: 3 },
        approximateItemCount: { colSpan: 'half', position: 4 },
        isGraded: { colSpan: 'half', position: 5 },
        gradingCompany: { colSpan: 'half', position: 6 },
        grade: { colSpan: 'half', position: 7 },
        certificationNumber: { colSpan: 'half', position: 8 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        brandsIncluded: { colSpan: 'half', position: 1 },
        franchisesIncluded: { colSpan: 'half', position: 2 },
        notableItems: { colSpan: 'half', position: 3 },
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
