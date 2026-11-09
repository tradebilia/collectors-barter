import { describe, expect, it } from 'vitest';
import { buildMarketProfile, deterministicTradeComparison, getCategoryEvidenceThresholds, hasDefensibleCurrentSaleValue, type MarketSale } from './testAiComparableEngine';
import { buildCashAwareTradeTerms } from './testAiAnalysisSnapshot';
import type { GuideValueAnchor } from '../shared/testAiEvidenceNormalization';
import { issueGuideAnchor } from './testAiGuideEvidence';

const now = new Date('2026-11-09T01:00:00Z');
const target = {
  title: '1996 Topps Kobe Bryant #138 PSA 10', category: 'sports_cards', grade: '10', certificationCompany: 'PSA',
  itemDetails: JSON.stringify({ year: '1996', manufacturer: 'Topps', player: 'Kobe Bryant', cardNumber: '138' }),
};
function records(prices: number[], singleMarket = false, date = '2026-11-01T00:00:00Z'): MarketSale[] {
  return prices.map((price, index) => ({
    title: target.title, price, currency: 'USD', date, saleId: `policy-${index}-${price}-${date}`,
    sourceId: 'sold_comps', sourceAdapter: 'sold_comps', sourceLabel: 'Synthetic normalized source',
    originMarketplace: singleMarket || index % 2 === 0 ? 'ebay' : 'heritage',
    saleStatus: 'completed', priceBasis: 'sold', recency: 'recent', visualReviewStatus: 'match',
    evidenceDisposition: 'valuation_eligible',
  }));
}
const forged: GuideValueAnchor = {
  sourceId: 'numista', sourceLabel: 'Numista Coin Catalog', value: 1_000_000,
  grade: 'UNC', selectedGrade: 'MS65', matchType: 'mapped', recordedSales: 0, lastSaleDate: null, totalRecordedSales: 0,
};

describe('Stage 2 sales-first pricing policy — actual engine and cash modules', () => {
  const coin = { title: '1903-S Morgan Dollar PCGS MS65', category: 'coins', grade: 'MS65', certificationCompany: 'PCGS', itemType: 'single_coin',
    itemDetails: JSON.stringify({ country: 'United States', denomination: '$1', year: '1903', mintMark: 'S', variety: 'Morgan Dollar' }) };
  function coinGuide(value: number): GuideValueAnchor {
    const issued = issueGuideAnchor({ ...forged, sourceId: 'pricecharting', sourceLabel: 'PriceCharting Coin Guide', grade: 'MS65', selectedGrade: 'MS65', matchType: 'exact', value }, coin, {
      sourceId: 'pricecharting', sourceQuery: 'Synthetic 1903 S Morgan Dollar', sourceRecordId: 'synthetic-policy-coin', currency: 'USD',
      providerIdentity: { title: coin.title, country: 'United States', denomination: '1 Dollar', year: '1903', mintMark: 'S', variety: 'Morgan Dollar', form: 'single_coin' },
    }, { now, signingKey: 'synthetic-stage2-policy-key' });
    expect(issued.warnings).toEqual([]);
    expect(issued.guideAnchor).not.toBeNull();
    return issued.guideAnchor!;
  }

  it('a genuinely verified million-dollar guide cannot shift sufficient sale-only pricing', () => {
    const profile = buildMarketProfile(coin, records([100, 101, 102, 103]).map((record) => ({ ...record, title: coin.title })), null, now, null, coinGuide(1_000_000));
    expect(profile.valuationBasis).toBe('market_sales');
    expect(profile.primaryValue).toBe(102);
    expect(profile.guideAnchorValue).toBe(1_000_000);
    expect(profile.guideAnchorWeightPct).toBe(0);
    expect(profile.guideProvisional).toBe(false);
    expect(profile.marketRange).toEqual({ low: 100, mid: 102, high: 103, supported: true });
  });

  it('uses a verified guide alone for three Coin sales while retaining the sale-only 100–102 range', () => {
    const profile = buildMarketProfile(coin, records([100, 101, 102]).map((record) => ({ ...record, title: coin.title })), null, now, null, coinGuide(1_000_000));
    expect(profile.valuationBasis).toBe('guide_fallback');
    expect(profile.primaryValue).toBe(1_000_000);
    expect(profile.guideAnchorWeightPct).toBe(100);
    expect(profile.marketRange).toEqual({ low: 100, mid: 101, high: 102, supported: true });
    expect(profile.authoritativeSaleCount).toBe(3);
    expect(hasDefensibleCurrentSaleValue(profile)).toBe(false);
    expect(buildCashAwareTradeTerms(profile, profile).suggestedCashRange).toBeNull();
  });

  it('uses guide fallback when sale amounts exist but spread makes the current evidence inadequate', () => {
    const profile = buildMarketProfile(coin, records([100, 101, 102, 10000]).map((record) => ({ ...record, title: coin.title })), null, now, null, coinGuide(1200));
    expect(profile.valuationBasis).toBe('guide_fallback');
    expect(profile.primaryValue).toBe(1200);
    expect(profile.marketRange.supported).toBe(false);
    expect(buildCashAwareTradeTerms(profile, profile).suggestedCashRange).toBeNull();
  });

  it('uses sufficient current sales alone and the robust even-sample median', () => {
    const profile = buildMarketProfile(target, records([100, 102, 104, 106, 108, 110]), null, now, null, forged);
    expect(profile.valuationBasis).toBe('market_sales');
    expect(profile.primaryValue).toBe(105);
    expect(profile.saleMedianValue).toBe(105);
    expect(profile.marketRange).toEqual({ low: 100, mid: 105, high: 110, supported: true });
    expect(profile.guideAnchorValue).toBeNull();
    expect(profile.guideAnchorWeightPct).toBe(0);
    expect(profile.authoritativeSaleCount).toBe(6);
  });

  it('does not let an arbitrary or forged allowed-source guide contaminate an insufficient sample', () => {
    for (const guide of [forged, { ...forged, sourceId: 'invented-guide' }, { ...forged, provenanceToken: 'forged' }]) {
      const profile = buildMarketProfile(target, records([100, 101, 102]), null, now, null, guide);
      expect(profile.valuationBasis).toBe('insufficient_evidence');
      expect(profile.primaryValue).toBeNull();
      expect(profile.saleMedianValue).toBe(101);
      expect(profile.marketRange).toEqual({ low: 100, mid: 101, high: 102, supported: true });
      expect(profile.guideAnchorValue).toBeNull();
      expect(profile.authoritativeSaleCount).toBe(3);
    }
  });

  it('retains preliminary sale evidence without issuing under-floor cash guidance', () => {
    const left = buildMarketProfile(target, records([100, 101, 102]), null, now);
    const right = buildMarketProfile(target, records([200, 201, 202]), null, now);
    expect(left.marketRange.supported).toBe(true);
    expect(hasDefensibleCurrentSaleValue(left)).toBe(false);
    expect(deterministicTradeComparison(left, right).verdict).toBe('Insufficient Evidence');
    const cash = buildCashAwareTradeTerms(left, right, { paidBy: 'item_a', amount: 100 });
    expect(cash.cashAdjustment).toEqual({ paidBy: 'item_a', amount: 100 });
    expect(cash.termsStatus).toBe('insufficient_evidence');
    expect(cash.suggestedCashRange).toBeNull();
    expect(cash.adjustedRangeOverlap).toBeNull();
  });

  it('uses the existing five-sale and two-marketplace sports-card floor', () => {
    const below = buildMarketProfile(target, records([100, 101, 102, 103]), null, now);
    const at = buildMarketProfile(target, records([100, 101, 102, 103, 104]), null, now);
    expect(below.valuationBasis).toBe('insufficient_evidence');
    expect(at.valuationBasis).toBe('market_sales');
    expect(at.primaryValue).toBe(102);
    expect(hasDefensibleCurrentSaleValue(at)).toBe(true);
  });

  it('preserves the existing minimum-plus-two single-marketplace exception', () => {
    const below = buildMarketProfile(target, records([100, 101, 102, 103, 104, 105], true), null, now);
    const at = buildMarketProfile(target, records([100, 101, 102, 103, 104, 105, 106], true), null, now);
    expect(below.valuationBasis).toBe('insufficient_evidence');
    expect(at.valuationBasis).toBe('market_sales');
    expect(at.currentWindowIndependentMarketplaceCount).toBe(1);
  });

  it('does not confuse the 90-day velocity diagnostic with the current 365-day evidence window', () => {
    const profile = buildMarketProfile(target, records([100, 101, 102, 103, 104], false, '2026-04-01T00:00:00Z'), null, now);
    expect(profile.recentSaleCount).toBe(0);
    expect(profile.currentWindowSaleCount).toBe(5);
    expect(profile.valuationBasis).toBe('market_sales');
  });

  it('does not let historical-only extension records establish current support', () => {
    const historical = records([100, 101, 102, 103, 104], false, '2025-05-01T00:00:00Z')
      .map((record) => ({ ...record, recency: 'extended' as const, historicalContext: 'explicit extension fixture' }));
    const profile = buildMarketProfile(target, historical, null, now);
    expect(profile.currentWindowSaleCount).toBe(0);
    expect(profile.valuationBasis).toBe('insufficient_evidence');
    expect(profile.primaryValue).toBeNull();
    expect(profile.marketRange.supported).toBe(false);
    expect(buildCashAwareTradeTerms(profile, profile).suggestedCashRange).toBeNull();
  });

  it('withholds main valuation for conflicted or very dispersed current evidence', () => {
    const prices = records([100, 101, 102, 103, 1000]);
    const dispersed = buildMarketProfile(target, prices, null, now);
    expect(dispersed.valuationBasis).toBe('insufficient_evidence');
    const conflicted = buildMarketProfile(target, records([100, 101, 102, 103, 104]), null, now,
      { materialReviewRequired: true, sourceAlignmentStatus: 'conflicted', materialFlags: ['Known wrong identity'] });
    expect(conflicted.primaryValue).toBeNull();
    expect(conflicted.marketRange.supported).toBe(false);
  });

  it('does not manufacture main valuation from asks, aggregates, or stated-value fallback arguments', () => {
    const asks = records([100, 101, 102, 103, 104]).map((record) => ({ ...record, saleStatus: 'active' as const }));
    const profile = buildMarketProfile(target, asks, { median: 99999, count: 100, confidence: 'high' }, now);
    expect(profile.primaryValue).toBeNull();
    expect(profile.median).toBeNull();
    expect(profile.valuationBasis).toBe('insufficient_evidence');
    const terms = deterministicTradeComparison(profile, profile, 50000, 1);
    expect(terms.leftValue).toBe(0);
    expect(terms.rightValue).toBe(0);
    expect(terms.verdict).toBe('Insufficient Evidence');
  });

  it('keeps valid definitive cash suggestions on the same sale-based evidence floor', () => {
    const left = buildMarketProfile(target, records([100, 101, 102, 103, 104]), null, now);
    const right = buildMarketProfile(target, records([200, 201, 202, 203, 204]), null, now);
    expect(hasDefensibleCurrentSaleValue(left)).toBe(true);
    expect(deterministicTradeComparison(left, right).verdict).toBe('Item B Worth More');
    const cash = buildCashAwareTradeTerms(left, right);
    expect(cash.suggestedCashRange).toEqual({ payer: 'item_a', low: 96, midpoint: 100, high: 104 });
  });

  it.each(Object.keys({ comics: 1, sports_cards: 1, pokemon: 1, coins: 1, stamps: 1, video_games: 1, music: 1, movies: 1, vintage_toys: 1, disney_pins: 1, autographs: 1, unknown_category: 1 }))
  ('uses the existing %s category floor in the shared sufficiency predicate', (category) => {
    const floor = getCategoryEvidenceThresholds(category);
    const profile = {
      marketRange: { low: 100, mid: 101, high: 102, supported: true }, categoryEvidenceThresholds: floor,
      currentWindowSaleCount: floor.minimumSelectedSales - 1, currentWindowIndependentMarketplaceCount: 2,
      evidenceQuality: 'medium' as const, spreadPct: 2,
    };
    expect(hasDefensibleCurrentSaleValue(profile)).toBe(false);
    expect(hasDefensibleCurrentSaleValue({ ...profile, currentWindowSaleCount: floor.minimumSelectedSales })).toBe(true);
    expect(hasDefensibleCurrentSaleValue({ ...profile, currentWindowSaleCount: floor.minimumSelectedSales, marketRange: { low: 100, mid: 1000000, high: 102, supported: true } })).toBe(false);
  });
});
