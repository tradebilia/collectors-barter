import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Vintage Toys - Electronic Toy Layout
 * 
 * Independent layout configuration for Vintage Toys Electronic Toy item type.
 * Changes here do NOT affect any other item type.
 */

export const vintage_toysElectronictoyLayout: ItemTypeLayoutConfig = {
  itemType: 'electronic_toy',
  category: 'vintage_toys',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        condition: { colSpan: 'half', position: 3 },
        toyName: { colSpan: 'half', position: 4 },
        tested: { colSpan: 'half', position: 5 },
        workingCondition: { colSpan: 'half', position: 6 },
        isGraded: { colSpan: 'half', position: 7 },
        gradingCompany: { colSpan: 'half', position: 8 },
        grade: { colSpan: 'half', position: 9 },
        certificationNumber: { colSpan: 'half', position: 10 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        quantity: { colSpan: 'half', position: 1 },
        brand: { colSpan: 'half', position: 2 },
        year: { colSpan: 'half', position: 3 },
        batteryCompartmentCondition: { colSpan: 'half', position: 4 },
      },
    },
    optional: {
      columns: 1,
      fieldLayout: {
        soundWorks: { colSpan: 'full', position: 1 },
        lightsWork: { colSpan: 'full', position: 2 },
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
