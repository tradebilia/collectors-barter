import { describe, expect, it } from 'vitest';
import { buildAnalysisSnapshot, buildCashAwareTradeTerms } from './testAiAnalysisSnapshot';
import { buildMarketProfile, selectBalancedComparableSales, type ComparableTarget, type MarketSale } from './testAiComparableEngine';
import { normalizeTestAiEvidence } from '../shared/testAiEvidenceNormalization';
import { parseEvidenceBoundNarrative } from './testAiResponse';

const now = new Date('2026-09-27T12:00:00.000Z');
const griffey: ComparableTarget = {
  title: 'Ken Griffey Jr 1989 Upper Deck #1',
  category: 'sports_cards',
  itemDetails: JSON.stringify({ player: 'Ken Griffey Jr', year: '1989', manufacturer: 'Upper Deck', cardNumber: '1' }),
};

function sale(overrides: Partial<MarketSale> = {}): MarketSale {
  return {
    title: 'Ken Griffey Jr 1989 Upper Deck #1',
    price: 100,
    currency: 'USD',
    date: '2026-09-01T00:00:00.000Z',
    marketplace: 'Fixture Market',
    sourceId: 'fixture_a',
    sourceLabel: 'Fixture A',
    saleId: `fixture-${Math.random()}`,
    saleStatus: 'completed',
    recency: 'recent',
    completedStatusBasis: 'fixture completed sale',
    priceBasis: 'sold',
    visualReviewStatus: 'match',
    ...overrides,
  };
}

describe('Analyzer 2.1 unified analysis snapshot', () => {
  it('preserves source status, material flags, and visual-review counts in one versioned snapshot', () => {
    const evidence = normalizeTestAiEvidence(griffey, [
      { id: 'sold_comps', label: 'eBay Sold-Comps', kind: 'market_completed', status: 'success', market: { completedSaleCount: 2 } },
      { id: 'psa', label: 'PSA', kind: 'certification', status: 'error', message: 'timeout' },
    ]);
    const snapshot = buildAnalysisSnapshot({
      target: griffey,
      sales: [sale({ saleId: 'a' }), sale({ saleId: 'b', price: 110, visualReviewStatus: 'rough_match' }), sale({ saleId: 'c', price: 120, visualReviewStatus: 'mismatch' })],
      evidenceSummary: evidence,
      now,
    });
    expect(snapshot.version).toBe('2.1.0');
    expect(snapshot.profile.authoritativeSaleCount).toBe(2);
    expect(snapshot.evidence.sourceStatuses.map((source) => source.id)).toEqual(['sold_comps', 'psa']);
    expect(snapshot.evidence.visualReview).toMatchObject({ match: 1, roughMatch: 1, mismatch: 1, unreadable: 0, notReviewed: 0 });
  });

  it('reserves representative accepted matches from multiple sources before filling the cap', () => {
    const dominant = Array.from({ length: 6 }, (_, index) => sale({ sourceId: 'dominant', sourceLabel: 'Dominant', saleId: `dominant-${index}`, price: 100 + index }));
    const secondary = [sale({ sourceId: 'secondary', sourceLabel: 'Secondary', saleId: 'secondary-1', price: 115 })];
    const selection = selectBalancedComparableSales(griffey, [...dominant, ...secondary], now, 2);
    expect(selection.selected).toHaveLength(2);
    expect(selection.selected.map((entry) => entry.sale.sourceId).sort()).toEqual(['dominant', 'secondary']);
    expect(selection.diagnostics.omittedByCap).toBe(5);
  });

  it('does not treat active asking prices, undated records, or a grade mismatch as valuation records', () => {
    const records = [
      sale({ saleId: 'active', saleStatus: 'active', price: 999, priceBasis: 'unknown' }),
      sale({ saleId: 'undated', date: null, recency: 'undated', price: 888 }),
      sale({ saleId: 'wrong-grade', title: 'Ken Griffey Jr 1989 Upper Deck #1 PSA 8', price: 125 }),
    ];
    const target = { ...griffey, grade: '10', certificationCompany: 'PSA' };
    const profile = buildMarketProfile(target, records, null, now);
    expect(profile.authoritativeSaleCount).toBe(0);
    expect(profile.comparables.some((record) => record.reasons.includes('grade differs') && record.exclusionReason?.includes('secondary evidence'))).toBe(true);
  });

  it('retains a visually mismatched record as manual-review context rather than valuing it', () => {
    const profile = buildMarketProfile(griffey, [
      sale({ saleId: 'good', price: 100 }),
      sale({ saleId: 'visual-mismatch', price: 1_000, visualReviewStatus: 'mismatch' }),
      sale({ saleId: 'good-two', price: 105 }),
    ], null, now);
    expect(profile.authoritativeSaleCount).toBe(2);
    expect(profile.comparables.find((record) => record.saleId === 'visual-mismatch')?.exclusionReason).toBe('visual comparison flagged the record for manual review');
  });

  it('suppresses duplicate sales across providers without discarding the original audit record', () => {
    const original = sale({ saleId: 'same-sale', price: 100 });
    const duplicate = sale({ saleId: 'same-sale', sourceId: 'fixture_a', sourceLabel: 'Fixture A', price: 100 });
    const profile = buildMarketProfile(griffey, [original, duplicate, sale({ saleId: 'unique', price: 120 })], null, now);
    expect(profile.authoritativeSaleCount).toBe(2);
    expect(profile.duplicateSaleCount).toBe(1);
    expect(profile.comparables.some((record) => record.exclusionReason === 'duplicate sale observation')).toBe(true);
  });

  it('withholds a defensible range when a material identity conflict is recorded', () => {
    const profile = buildMarketProfile(griffey, [sale({ saleId: 'one' }), sale({ saleId: 'two', price: 110 })], null, now, {
      materialReviewRequired: true,
      materialFlags: ['Year differs between listing and selected source.'],
      sourceAlignmentStatus: 'conflicted',
    });
    expect(profile.weightedValue).toBeGreaterThan(0);
    expect(profile.marketRange.supported).toBe(false);
    expect(profile.valuationWarnings.join(' ')).toContain('Material identity evidence conflict');
  });

  it('computes cash-adjusted overlap from range evidence instead of asking the model to judge terms', () => {
    const left = buildMarketProfile(griffey, [sale({ saleId: 'l1', price: 90 }), sale({ saleId: 'l2', price: 110 })], null, now);
    const right = buildMarketProfile(griffey, [sale({ saleId: 'r1', price: 170 }), sale({ saleId: 'r2', price: 190 })], null, now);
    const terms = buildCashAwareTradeTerms(left, right, { amount: 80, paidBy: 'item_a' });
    expect(terms.termsStatus).toBe('within_overlap_band');
    expect(terms.adjustedRangeOverlap).toBe(true);
    expect(terms.summary).toContain('overlap band');
  });

  it('does not issue cash guidance when either side lacks a defensible completed-sale range', () => {
    const left = buildMarketProfile(griffey, [sale({ saleId: 'one' })], null, now);
    const right = buildMarketProfile(griffey, [sale({ saleId: 'two', price: 150 })], null, now);
    const terms = buildCashAwareTradeTerms(left, right, null);
    expect(terms.termsStatus).toBe('insufficient_evidence');
    expect(terms.suggestedCashRange).toBeNull();
  });
});

describe('Analyzer narrative contract', () => {
  const compliant = JSON.stringify({
    valueSummary: 'Completed-sale evidence is limited and should be read with the warnings shown.',
    itemAInsights: 'The profile identifies a limited but recent completed-sale record set.',
    itemBInsights: 'The profile identifies a limited but recent completed-sale record set.',
    itemAMarketNews: 'No material item-specific RSS article was supplied.',
    itemBMarketNews: 'No material item-specific RSS article was supplied.',
    itemAStrengths: ['Recent exact matches are present.'],
    itemARisks: ['Additional completed-sale depth would improve confidence.'],
    itemBStrengths: ['Recent exact matches are present.'],
    itemBRisks: ['Additional completed-sale depth would improve confidence.'],
    sourceReferences: { itemA: ['eBay Sold-Comps', 'Unapproved Source'], itemB: ['RSS market context'] },
  });

  it('keeps only allowed source labels from a structured narrative', () => {
    const parsed = parseEvidenceBoundNarrative(compliant, ['eBay Sold-Comps', 'RSS market context']);
    expect(parsed?.sourceReferences).toEqual({ itemA: ['eBay Sold-Comps'], itemB: ['RSS market context'] });
  });

  it('rejects malformed or over-broad free-form narrative payloads', () => {
    expect(parseEvidenceBoundNarrative('{"verdict":"Buy it"}', ['eBay Sold-Comps'])).toBeNull();
  });
});
