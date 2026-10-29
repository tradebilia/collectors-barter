import { describe, expect, it } from 'vitest';
import {
  COLLECTION_LOT_NOT_COMPARABLE_MESSAGE,
  collectionLotGuard,
  isCollectionLotItemType,
} from '../shared/testAiItemType';
import { getEligibleTestAiSources } from '../shared/testAiSourceApplicability';

describe('Collection/Lot comparability policy', () => {
  it.each(['collection_lot', 'Collection/Lot', 'Collection / Lot', 'collection-lot', 'Collection and Lot'])('recognizes %s', (value) => {
    expect(isCollectionLotItemType(value)).toBe(true);
  });

  it('does not classify ordinary item types as Collection/Lot', () => {
    expect(isCollectionLotItemType('Single Card')).toBe(false);
    expect(isCollectionLotItemType('Set')).toBe(false);
    expect(isCollectionLotItemType(undefined)).toBe(false);
  });

  it('returns the required non-comparable response', () => {
    expect(collectionLotGuard({ itemType: 'collection_lot' })).toEqual({
      status: 'not_comparable',
      message: COLLECTION_LOT_NOT_COMPARABLE_MESSAGE,
      comparable: false,
    });
    expect(collectionLotGuard({ itemType: 'Single Card' })).toBeNull();
  });

  it('removes every source from the shared applicability registry', () => {
    expect(getEligibleTestAiSources({ category: 'sports cards', itemType: 'Collection / Lot', hasTitle: true })).toEqual([]);
    expect(getEligibleTestAiSources({ category: 'sports cards', itemType: 'Single Card', hasTitle: true }).length).toBeGreaterThan(0);
  });
});
