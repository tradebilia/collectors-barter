import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Vintage Toys - LEGO Layout
 *
 * Independent layout configuration for the compact LEGO item type.
 */
export const vintage_toysLegoLayout: ItemTypeLayoutConfig = {
  itemType: 'lego',
  category: 'vintage_toys',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        photos: { colSpan: 'full', position: 3 },
        isGraded: { colSpan: 'half', position: 4 },
        condition: { colSpan: 'half', position: 5 },
        gradingCompany: { colSpan: 'half', position: 6 },
        grade: { colSpan: 'half', position: 7 },
        certificationNumber: { colSpan: 'half', position: 8 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        setNumber: { colSpan: 'half', position: 1 },
        theme: { colSpan: 'half', position: 2 },
        complete: { colSpan: 'half', position: 3 },
        quantity: { colSpan: 'half', position: 4 },
        packagingType: { colSpan: 'half', position: 5 },
        missingDetails: { colSpan: 'full', position: 6 },
      },
    },
    optional: {
      columns: 2,
      fieldLayout: {
        instructionsIncluded: { colSpan: 'half', position: 1 },
        minifiguresIncluded: { colSpan: 'half', position: 2 },
        releaseYear: { colSpan: 'half', position: 3 },
        pieceCount: { colSpan: 'half', position: 4 },
        retiredStatus: { colSpan: 'half', position: 5 },
        boxCondition: { colSpan: 'half', position: 6 },
        instructionCondition: { colSpan: 'half', position: 7 },
        minifigureDetails: { colSpan: 'full', position: 8 },
      },
    },
  },
  spacing: {
    gap: 'gap-6',
    padding: 'p-4',
  },
  conditionalFieldPlacement: {
    isGraded: 'right',
    complete: 'right',
    packagingType: 'right',
    instructionsIncluded: 'right',
    minifiguresIncluded: 'right',
  },
};
