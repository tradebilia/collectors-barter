import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Vintage Toys - Vehicle Layout
 * 
 * Independent layout configuration for Vintage Toys Vehicle item type.
 * Changes here do NOT affect any other item type.
 */

export const vintage_toysVehicleLayout: ItemTypeLayoutConfig = {
  itemType: 'vehicle',
  category: 'vintage_toys',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        condition: { colSpan: 'half', position: 3 },
        vehicleName: { colSpan: 'half', position: 4 },
        packagingType: { colSpan: 'half', position: 5 },
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
        franchise: { colSpan: 'half', position: 3 },
        year: { colSpan: 'half', position: 4 },
        vehicleType: { colSpan: 'half', position: 5 },
        workingFeatures: { colSpan: 'half', position: 6 },
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
