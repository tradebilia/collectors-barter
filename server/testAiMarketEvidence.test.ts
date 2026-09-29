import { describe, expect, it } from 'vitest';
import { buildMarketProfile } from './testAiComparableEngine';
import { normalizeAnalysisMarketSales, normalizeAnalysisMarketSale } from './testAiMarketEvidence';

const now = new Date('2026-09-28T12:00:00.000Z');
const target = {
  title: '1996 Topps Kobe Bryant #138 PSA 10',
  category: 'sports_cards',
  grade: '10',
  certificationCompany: 'PSA',
  itemDetails: JSON.stringify({ year: '1996', manufacturer: 'Topps', player: 'Kobe Bryant', cardNumber: '138' }),
};

function sale(overrides: Record<string, unknown> = {}) {
  return {
    title: target.title,
    price: 1000,
    currency: 'USD',
    date: '2026-09-01T00:00:00.000Z',
    sourceId: 'sold_comps',
    sourceLabel: 'eBay Sold-Comps',
    saleId: 'fixture',
    ...overrides,
  };
}

describe('server-owned analysis market evidence normalization', () => {
  it('admits only a dated completed observation with a trusted sale basis', () => {
    const result = normalizeAnalysisMarketSale(sale(), now);
    expect(result.valuationEligible).toBe(true);
    expect(result.sale).toMatchObject({
      saleStatus: 'completed',
      priceBasis: 'sold',
      recency: 'recent',
      evidenceDisposition: 'valuation_eligible',
    });
  });

  it('does not trust a client valuation label when status, date, or price basis cannot support it', () => {
    const ambiguous = normalizeAnalysisMarketSale(sale({
      sourceId: 'unverified_provider',
      date: null,
      saleStatus: 'unknown',
      priceBasis: 'unknown',
      evidenceDisposition: 'valuation_eligible',
    }), now);
    expect(ambiguous.valuationEligible).toBe(false);
    expect(ambiguous.sale.evidenceDisposition).toBe('context_only');
    expect(ambiguous.reasons.join(' ')).toContain('completed-sale status is not verifiable');
    expect(ambiguous.reasons.join(' ')).toContain('price basis is not verifiable');
    expect(ambiguous.reasons.join(' ')).toContain('sale date is missing');
  });

  it('retains a visual mismatch as warning evidence instead of allowing it to be valued', () => {
    const mismatch = normalizeAnalysisMarketSale(sale({
      visualReviewStatus: 'mismatch',
      visualReviewRationale: 'Candidate is visibly raw while target is slabbed.',
    }), now);
    expect(mismatch.valuationEligible).toBe(false);
    expect(mismatch.sale.evidenceDisposition).toBe('warning_review');
    expect(mismatch.reasons.join(' ')).toContain('visibly raw');
  });

  it('keeps non-USD and stale inputs in the profile ledger but out of deterministic value', () => {
    const records = normalizeAnalysisMarketSales([
      sale({ saleId: 'usd', price: 1000 }),
      sale({ saleId: 'cad', price: 1400, currency: 'CAD' }),
      sale({ saleId: 'old', date: '2023-01-01T00:00:00.000Z' }),
    ], now);
    const profile = buildMarketProfile(target, records, null, now);
    expect(profile.authoritativeSaleCount).toBe(1);
    expect(profile.comparables).toHaveLength(3);
    expect(profile.comparables.filter((record) => !record.accepted).map((record) => record.exclusionReason).join(' ')).toContain('unsupported currency CAD');
    expect(profile.comparables.filter((record) => !record.accepted).map((record) => record.exclusionReason).join(' ')).toContain('older than one year');
  });
});
