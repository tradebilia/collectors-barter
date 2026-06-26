import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Pokemon - Unopened Product Layout
 * 
 * Independent layout configuration for Pokemon Unopened Product item type.
 * Changes here do NOT affect any other item type.
 */

export const pokemonUnopenedproductLayout: ItemTypeLayoutConfig = {
  itemType: 'unopened_product',
  category: 'pokemon',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        condition: { colSpan: 'half', position: 3 },
        productName: { colSpan: 'half', position: 4 },
        year: { colSpan: 'half', position: 5 },
        setName: { colSpan: 'half', position: 6 },
        productType: { colSpan: 'half', position: 7 },
        era: { colSpan: 'half', position: 8 },
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
