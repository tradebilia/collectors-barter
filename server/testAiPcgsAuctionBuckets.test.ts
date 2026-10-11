import { describe, expect, it } from 'vitest';
import { bucketPcgsAuctionRows } from '../shared/testAiPcgsAuctionBuckets';

describe('bucketPcgsAuctionRows', () => {
  const now = Date.parse('2026-10-11T00:00:00.000Z');

  it('uses the server-approved PCGS disposition for current value, historical trend, and context buckets', () => {
    const rows = [
      {
        id: 'recent',
        provenanceToken: 'signed-recent',
        saleStatus: 'completed',
        currency: 'USD',
        price: 250,
        date: '2026-08-01T00:00:00.000Z',
        evidenceDisposition: 'valuation_eligible',
      },
      {
        id: 'historical-inherited-grade',
        provenanceToken: 'signed-historical',
        saleStatus: 'completed',
        currency: 'USD',
        price: 175,
        date: '2019-06-01T00:00:00.000Z',
        evidenceDisposition: 'valuation_eligible',
      },
      {
        id: 'explicit-grade-mismatch',
        provenanceToken: 'signed-mismatch',
        saleStatus: 'completed',
        currency: 'USD',
        price: 95,
        date: '2018-04-01T00:00:00.000Z',
        evidenceDisposition: 'context_only',
      },
      {
        id: 'undated',
        provenanceToken: 'signed-undated',
        saleStatus: 'completed',
        currency: 'USD',
        price: 125,
        date: null,
        evidenceDisposition: 'valuation_eligible',
      },
    ];

    const buckets = bucketPcgsAuctionRows(rows, now);

    expect(buckets.datedCompletedRows.map((row) => row.id)).toEqual([
      'recent',
      'historical-inherited-grade',
      'explicit-grade-mismatch',
    ]);
    expect(buckets.currentValueRows.map((row) => row.id)).toEqual(['recent']);
    expect(buckets.historicalTrendRows.map((row) => row.id)).toEqual(['historical-inherited-grade']);
    expect(buckets.contextOnlyRows.map((row) => row.id)).toEqual([
      'explicit-grade-mismatch',
      'undated',
    ]);
  });

  it('never lets a browser-supplied unsigned row create a PCGS trend record', () => {
    const buckets = bucketPcgsAuctionRows([{
      provenanceToken: null,
      saleStatus: 'completed',
      currency: 'USD',
      price: 175,
      date: '2019-06-01T00:00:00.000Z',
      evidenceDisposition: 'valuation_eligible',
    }], now);

    expect(buckets.historicalTrendRows).toHaveLength(0);
    expect(buckets.contextOnlyRows).toHaveLength(1);
  });

  it('places a server-normalized PCGS month-only date in historical trend rather than context', () => {
    const buckets = bucketPcgsAuctionRows([{
      provenanceToken: 'signed-month-only',
      saleStatus: 'completed',
      currency: 'USD',
      price: 219,
      date: '2009-10-01T00:00:00.000Z',
      evidenceDisposition: 'valuation_eligible',
    }], now);

    expect(buckets.historicalTrendRows).toHaveLength(1);
    expect(buckets.contextOnlyRows).toHaveLength(0);
  });
});
