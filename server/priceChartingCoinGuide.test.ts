import { describe, expect, it } from 'vitest';
import { selectExactPriceChartingCoinGuide } from '../shared/priceChartingCoinGuide';

describe('selectExactPriceChartingCoinGuide', () => {
  it('selects only the exact declared certified grade after harmless formatting normalization', () => {
    expect(selectExactPriceChartingCoinGuide({
      category: 'coins',
      grade: 'MS-65',
      prices: { ungraded: 150, ms64: 900, ms_65: 1_250, ms66: 2_900 },
    })).toEqual({ grade: 'MS65', selectedGrade: 'MS65', matchType: 'exact', value: 1_250 });
  });

  it('rejects numeric-only, mismatched, invalid, and non-coin inputs', () => {
    expect(selectExactPriceChartingCoinGuide({ category: 'coins', grade: '65', prices: { ms65: 1_250 } })).toBeNull();
    expect(selectExactPriceChartingCoinGuide({ category: 'coins', grade: 'MS65', prices: { ms64: 900 } })).toBeNull();
    expect(selectExactPriceChartingCoinGuide({ category: 'coins', grade: 'MS65', prices: { ms65: -1 } })).toBeNull();
    expect(selectExactPriceChartingCoinGuide({ category: 'pokemon', grade: 'MS65', prices: { ms65: 1_250 } })).toBeNull();
  });
});
