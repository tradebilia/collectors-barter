/**
 * Base Layout Configuration
 * 
 * Default layout template for item types.
 * Each item type can override specific sections as needed.
 */

import type { ItemTypeLayoutConfig } from './layoutTypes';

export const createBaseLayoutConfig = (
  itemType: string,
  category: string,
  requiredFields: string[],
  recommendedFields: string[],
  optionalFields: string[]
): ItemTypeLayoutConfig => {
  return {
    itemType,
    category,
    sections: {
      required: {
        columns: 2,
        fieldLayout: requiredFields.reduce(
          (acc, field) => ({
            ...acc,
            [field]: { colSpan: 'half' },
          }),
          {}
        ),
      },
      recommended: {
        columns: 2,
        fieldLayout: recommendedFields.reduce(
          (acc, field) => ({
            ...acc,
            [field]: { colSpan: 'half' },
          }),
          {}
        ),
      },
      optional: {
        columns: 2,
        fieldLayout: optionalFields.reduce(
          (acc, field) => ({
            ...acc,
            [field]: { colSpan: 'half' },
          }),
          {}
        ),
      },
    },
    spacing: {
      gap: 'gap-6',
      padding: 'p-4',
    },
    conditionalFieldPlacement: {
      // By default, conditional fields appear to the right of parent
      isGraded: 'right',
      signed: 'right',
      sealed: 'right',
    },
  };
};
