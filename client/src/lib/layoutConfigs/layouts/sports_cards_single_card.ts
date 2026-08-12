import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Sports Cards - Single Card Layout
 * 
 * Independent layout configuration for Sports Cards Single Card item type.
 * Changes here do NOT affect any other item type.
 */

export const sports_cardsSinglecardLayout: ItemTypeLayoutConfig = {
  itemType: 'single_card',
  category: 'sports_cards',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        tradeValue: { colSpan: 'half', position: 2 },
        sport: { colSpan: 'half', position: 3 },
        playerName: { colSpan: 'half', position: 4 },
        year: { colSpan: 'half', position: 5 },
        manufacturer: { colSpan: 'half', position: 6 },
        isGraded: { colSpan: 'half', position: 7 },
        condition: { colSpan: 'half', position: 8 },
        serialNumber: { colSpan: 'half', position: 9 },
        gradingCompany: { colSpan: 'half', position: 10 },
        grade: { colSpan: 'half', position: 11 },
        certificationNumber: { colSpan: 'half', position: 12 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        quantity: { colSpan: 'half', position: 1 },
        setName: { colSpan: 'half', position: 2 },
        cardNumber: { colSpan: 'half', position: 3 },
        rookieCard: { colSpan: 'half', position: 4 },
        autograph: { colSpan: 'half', position: 5 },
        relicMemorabilia: { colSpan: 'half', position: 6 },
        serialNumbered: { colSpan: 'half', position: 7 },
      },
    },
    optional: {
      columns: 1,
      fieldLayout: {
        parallelVariation: { colSpan: 'full', position: 1 },
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
