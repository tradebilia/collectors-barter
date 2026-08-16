import { describe, expect, it } from 'vitest';
import { formatHistoricalTrendContext } from './historicalTrendContext';

describe('historical 130point trend context', () => {
  it('keeps dates and recency buckets while explicitly prohibiting price-based valuation use', () => {
    const context = formatHistoricalTrendContext('Item A', [
      { title: 'Recent sale', date: '2026-07-01', price: 500, currency: 'USD', marketplace: 'eBay', recency: 'recent' },
      { title: 'Older sale', date: '2014-03-01', price: 100, currency: 'USD', marketplace: 'Heritage', recency: 'historical' },
    ]);
    expect(context).toContain('recent (≤12 months)');
    expect(context).toContain('historical (>12 months)');
    expect(context).toContain('Do not use these prices to calculate a current value');
  });
});
