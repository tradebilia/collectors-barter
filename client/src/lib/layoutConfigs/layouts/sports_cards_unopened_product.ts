import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Sports Cards - Unopened Product Layout
 * 
 * Independent layout configuration for Sports Cards Unopened Product item type.
 * Changes here do NOT affect any other item type.
 */

export const sports_cardsUnopenedproductLayout: ItemTypeLayoutConfig = {
  itemType: 'unopened_product',
  category: 'sports_cards',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        condition: { colSpan: 'half', position: 3 },
        sport: { colSpan: 'half', position: 4 },
        year: { colSpan: 'half', position: 5 },
        manufacturer: { colSpan: 'half', position: 6 },
        productName: { colSpan: 'half', position: 7 },
        productFormat: { colSpan: 'half', position: 8 },
        factorySealed: { colSpan: 'half', position: 9 },
        authenticated: { colSpan: 'half', position: 10 },
        authenticationCompany: { colSpan: 'half', position: 11 },
        fromASealedCase: { colSpan: 'half', position: 12 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        quantity: { colSpan: 'half', position: 1 },
        productType: { colSpan: 'half', position: 2 },
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
