import { describe, expect, it } from 'vitest';
import { buildMarketProfile, deduplicateMarketSales, scoreComparable, selectBalancedComparableSales } from './testAiComparableEngine';
import { sealCanonicalObservation } from './testAiCanonicalObservation';
import { normalizeAnalysisMarketSale } from './testAiMarketEvidence';

const now = new Date('2026-09-28T12:00:00.000Z');
const signingKey = 'adversarial-calibration-corpus-key';
const target = {
  title: '1996 Topps Kobe Bryant #138 PSA 10',
  category: 'sports_cards',
  grade: '10',
  certificationCompany: 'PSA',
  itemDetails: JSON.stringify({ year: '1996', manufacturer: 'Topps', player: 'Kobe Bryant', cardNumber: '138' }),
};

function observation(overrides: Record<string, unknown> = {}) {
  const row = {
    title: target.title,
    price: 1_000,
    currency: 'USD',
    date: '2026-09-01T00:00:00.000Z',
    originMarketplace: 'ebay',
    sourceId: 'sold_comps',
    saleId: 'fixture',
    saleStatus: 'completed' as const,
    priceBasis: 'sold' as const,
    ...overrides,
  };
  const sealed = sealCanonicalObservation('sold_comps', row, { acquiredAt: now, signingKey, query: target.title });
  return { ...row, provenanceToken: sealed.provenanceToken };
}

describe('Analyzer 2.7 adversarial calibration corpus', () => {
  it('fails browser spoofing, unknown currency, ambiguous basis, and required-unreviewed visuals closed', () => {
    const spoofed = normalizeAnalysisMarketSale({
      ...observation(),
      provenanceToken: null,
      price: 9_999_999,
      currency: 'USD',
      saleStatus: 'completed',
      priceBasis: 'sold',
    }, now, { signingKey });
    expect(spoofed.valuationEligible).toBe(false);

    const unknownCurrency = normalizeAnalysisMarketSale(observation({ currency: null }), now, { signingKey });
    const unknownBasis = normalizeAnalysisMarketSale(observation({ priceBasis: 'unknown' }), now, { signingKey });
    const requiredVisual = normalizeAnalysisMarketSale(observation({ visualRequirement: 'required', visualReviewStatus: 'not_reviewed' }), now, { signingKey });
    expect([unknownCurrency, unknownBasis, requiredVisual].every((result) => !result.valuationEligible)).toBe(true);
  });

  it('rejects a raw versus graded state conflict and retains it with an explanation', () => {
    const raw = scoreComparable(target, {
      ...observation({ title: '1996 Topps Kobe Bryant #138 raw ungraded', saleId: 'raw-card' }),
      evidenceDisposition: 'valuation_eligible',
    });
    expect(raw.accepted).toBe(false);
    expect(raw.exclusionReason).toContain('raw/graded');
  });

  it('suppresses exact transactions, preserves possible duplicates, and does not select on price', () => {
    const first = observation({ saleId: 'same', url: 'https://www.ebay.com/itm/123?utm_source=test' });
    const exact = observation({ saleId: 'same', url: 'https://ebay.com/itm/123' });
    const possible = observation({ saleId: 'different', price: 1_050 });
    const dedup = deduplicateMarketSales([first, exact, possible]);
    expect(dedup.duplicates).toHaveLength(1);
    expect(dedup.possibleDuplicates).toHaveLength(1);

    const original = selectBalancedComparableSales(target, [
      { ...first, saleId: 'a', originMarketplace: 'ebay', price: 100 },
      { ...observation({ saleId: 'b', originMarketplace: 'heritage', price: 200 }), sourceId: 'archive_adapter' },
    ], now, 1);
    const repriced = selectBalancedComparableSales(target, [
      { ...first, saleId: 'a', originMarketplace: 'ebay', price: 10_000 },
      { ...observation({ saleId: 'b', originMarketplace: 'heritage', price: 1 }), sourceId: 'archive_adapter' },
    ], now, 1);
    expect(original.selected.map(({ sale }) => sale.saleId)).toEqual(repriced.selected.map(({ sale }) => sale.saleId));
  });

  it('does not treat unknown origin marketplaces as independent markets', () => {
    const profile = buildMarketProfile(target, [
      observation({ saleId: 'unknown-a', originMarketplace: 'unknown_marketplace', price: 900 }),
      observation({ saleId: 'unknown-b', originMarketplace: 'unknown_marketplace', price: 1_000 }),
      observation({ saleId: 'unknown-c', originMarketplace: 'unknown_marketplace', price: 1_100 }),
    ], null, now);
    expect(profile.independentMarketplaceCount).toBe(0);
    expect(profile.unknownMarketplaceCount).toBe(3);
    expect(profile.marketplaceConcentration).toBe('unavailable');
  });
});
