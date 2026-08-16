import { describe, expect, it } from 'vitest';
import { buildHistoricalTrendContext } from './historicalTrendContext';

describe('130point historical trend context', () => {
  it('separates recent, historical, and undated records while prohibiting valuation use', () => {
    const context = buildHistoricalTrendContext([
      { title: 'Exact card PSA 9', price: 100, currency: 'USD', date: '2026-06-01', marketplace: 'eBay', recency: 'recent' },
      { title: 'Exact card PSA 9', price: 20, currency: 'USD', date: '2014-07-23', marketplace: 'PWCC', recency: 'historical' },
      { title: 'Unknown date card', price: 50, recency: 'undated' },
    ]);

    expect(context).toContain('RECENT RECORDS (within 12 months)');
    expect(context).toContain('HISTORICAL RECORDS (older than 12 months)');
    expect(context).toContain('UNDATED RECORDS');
    expect(context).toContain('Do not calculate an average, median, price range, fair-value figure, trade-fairness result, or negotiation amount');
  });

  it('returns no trend context when 130point was not selected or returned no sales', () => {
    expect(buildHistoricalTrendContext([])).toBeNull();
    expect(buildHistoricalTrendContext(null)).toBeNull();
  });
});
