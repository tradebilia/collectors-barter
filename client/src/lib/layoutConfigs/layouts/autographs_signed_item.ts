import type { ItemTypeLayoutConfig } from '../layoutTypes';

/**
 * Autographs - Signed Item Layout
 * 
 * Independent layout configuration for Autographs Signed Item item type.
 * Changes here do NOT affect any other item type.
 */

export const autographsSigneditemLayout: ItemTypeLayoutConfig = {
  itemType: 'signed_item',
  category: 'autographs',
  sections: {
    required: {
      columns: 2,
      fieldLayout: {
        listingTitle: { colSpan: 'half', position: 1 },
        signer: { colSpan: 'half', position: 2 },
        tradeValue: { colSpan: 'half', position: 3 },
        condition: { colSpan: 'half', position: 4 },
        signedItemType: { colSpan: 'half', position: 5 },
        authenticationCompany: { colSpan: 'half', position: 6 },
        authenticationType: { colSpan: 'half', position: 7 },
        certificateNumber: { colSpan: 'half', position: 8 },
        inscriptionText: { colSpan: 'half', position: 9 },
      },
    },
    recommended: {
      columns: 2,
      fieldLayout: {
        quantity: { colSpan: 'half', position: 1 },
        autographCategory: { colSpan: 'half', position: 2 },
        authenticationIncluded: { colSpan: 'half', position: 3 },
      },
    },
    optional: {
      columns: 1,
      fieldLayout: {
        inscriptionPresent: { colSpan: 'full', position: 1 },
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
