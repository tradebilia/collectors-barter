import { describe, expect, it } from 'vitest';
import { buildMarketProfile } from './testAiComparableEngine';
import { normalizeAnalysisMarketSales, normalizeAnalysisMarketSale } from './testAiMarketEvidence';
import { sealCanonicalObservation } from './testAiCanonicalObservation';

const now = new Date('2026-09-28T12:00:00.000Z');
const signingKey = 'test-canonical-observation-signing-key';
const target = {
  title: '1996 Topps Kobe Bryant #138 PSA 10',
  category: 'sports_cards',
  grade: '10',
  certificationCompany: 'PSA',
  itemDetails: JSON.stringify({ year: '1996', manufacturer: 'Topps', player: 'Kobe Bryant', cardNumber: '138' }),
};

function sale(overrides: Record<string, unknown> = {}) {
  const observation = {
    title: target.title,
    price: 1000,
    currency: 'USD',
    date: '2026-09-01T00:00:00.000Z',
    sourceId: 'sold_comps',
    sourceLabel: 'eBay Sold-Comps',
    saleId: 'fixture',
    saleStatus: 'completed' as const,
    priceBasis: 'sold' as const,
    ...overrides,
  };
  const sealed = sealCanonicalObservation('sold_comps', observation, { acquiredAt: now, signingKey });
  return { ...observation, provenanceToken: sealed.provenanceToken };
}

function normalizeSale(input: ReturnType<typeof sale>) {
  return normalizeAnalysisMarketSale(input, now, { signingKey });
}

function normalizeSales(inputs: ReturnType<typeof sale>[]) {
  return normalizeAnalysisMarketSales(inputs, now, { signingKey });
}

describe('server-owned analysis market evidence normalization', () => {
  it('admits only a dated completed observation with a trusted sale basis', () => {
    const result = normalizeSale(sale());
    expect(result.valuationEligible).toBe(true);
    expect(result.sale).toMatchObject({
      saleStatus: 'completed',
      priceBasis: 'sold',
      recency: 'recent',
      evidenceDisposition: 'valuation_eligible',
    });
  });

  it('does not trust a client valuation label when status, date, or price basis cannot support it', () => {
    const ambiguous = normalizeSale(sale({
      sourceId: 'unverified_provider',
      date: null,
      saleStatus: 'unknown',
      priceBasis: 'unknown',
      evidenceDisposition: 'valuation_eligible',
    }));
    expect(ambiguous.valuationEligible).toBe(false);
    expect(ambiguous.sale.evidenceDisposition).toBe('context_only');
    expect(ambiguous.reasons.join(' ')).toContain('completed-sale status is not verifiable');
    expect(ambiguous.reasons.join(' ')).toContain('price basis is not verifiable');
    expect(ambiguous.reasons.join(' ')).toContain('sale date is missing');
  });

  it('keeps a browser-injected completed sale as context-only when it has no server provenance', () => {
    const injected = normalizeAnalysisMarketSale({
      ...sale(),
      provenanceToken: null,
      price: 9_999_999,
      saleStatus: 'completed',
      priceBasis: 'sold',
      evidenceDisposition: 'valuation_eligible',
    }, now);
    expect(injected.valuationEligible).toBe(false);
    expect(injected.sale.evidenceDisposition).toBe('context_only');
    expect(injected.reasons.join(' ')).toContain('server provenance');
  });

  it('retains a visual mismatch as warning evidence instead of allowing it to be valued', () => {
    const mismatch = normalizeSale(sale({
      visualReviewStatus: 'mismatch',
      visualReviewRationale: 'Candidate is visibly raw while target is slabbed.',
    }));
    expect(mismatch.valuationEligible).toBe(false);
    expect(mismatch.sale.evidenceDisposition).toBe('warning_review');
    expect(mismatch.reasons.join(' ')).toContain('visibly raw');
  });

  it('keeps non-USD and stale inputs in the profile ledger but out of deterministic value', () => {
    const records = normalizeSales([
      sale({ saleId: 'usd', price: 1000 }),
      sale({ saleId: 'cad', price: 1400, currency: 'CAD' }),
      sale({ saleId: 'old', date: '2023-01-01T00:00:00.000Z' }),
    ]);
    const profile = buildMarketProfile(target, records, null, now);
    expect(profile.authoritativeSaleCount).toBe(1);
    expect(profile.comparables).toHaveLength(3);
    expect(profile.comparables.filter((record) => !record.accepted).map((record) => record.exclusionReason).join(' ')).toContain('unsupported currency CAD');
    expect(profile.comparables.filter((record) => !record.accepted).map((record) => record.exclusionReason).join(' ')).toContain('older than one year');
  });

  it('uses the labeled 366–730-day extension only for illiquid categories with no current verified sale', () => {
    const oldStamp = sale({ saleId: 'stamp-old', date: '2025-03-01T00:00:00.000Z' });
    const extended = normalizeAnalysisMarketSales([oldStamp], now, { signingKey, category: 'stamps' });
    expect(extended[0]).toMatchObject({ recency: 'extended', evidenceDisposition: 'valuation_eligible' });
    expect(extended[0]?.evidenceReasons?.join(' ')).toContain('illiquid-market extension');

    const currentStamp = sale({ saleId: 'stamp-current', date: '2026-09-01T00:00:00.000Z' });
    const withCurrentEvidence = normalizeAnalysisMarketSales([currentStamp, oldStamp], now, { signingKey, category: 'stamps' });
    expect(withCurrentEvidence.find((record) => record.saleId === 'stamp-old')).toMatchObject({ recency: 'historical', evidenceDisposition: 'context_only' });

    const liquidCategory = normalizeAnalysisMarketSales([oldStamp], now, { signingKey, category: 'sports_cards' });
    expect(liquidCategory[0]).toMatchObject({ recency: 'historical', evidenceDisposition: 'context_only' });
  });
});
