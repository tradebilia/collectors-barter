import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Pokemon - Single Card Layout
 * 
 * Independent layout configuration for Pokemon Single Card item type.
 * Changes here do NOT affect any other item type.
 */

export const pokemonSinglecardLayout: ItemTypeLayoutConfig = {
  itemType: 'single_card',
  category: 'pokemon',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        cardName: { colSpan: 'half', position: 3 },
        setName: { colSpan: 'half', position: 4 },
        cardNumber: { colSpan: 'half', position: 5 },
        editionEra: { colSpan: 'half', position: 6 },
        isGraded: { colSpan: 'half', position: 7 },
        condition: { colSpan: 'half', position: 8 },
        gradingCompany: { colSpan: 'half', position: 9 },
        grade: { colSpan: 'half', position: 10 },
        certificationNumber: { colSpan: 'half', position: 11 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        quantity: { colSpan: 'half', position: 1 },
        rarity: { colSpan: 'half', position: 2 },
        finishVariant: { colSpan: 'half', position: 3 },
        language: { colSpan: 'half', position: 4 },
      },
    },
    optional: {
      columns: 1,
      fieldLayout: {
        specialAttributes: { colSpan: 'full', position: 1 },
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
