import { describe, expect, it } from 'vitest';
import { buildMarketProfile, deterministicTradeComparison, getCategoryEvidenceThresholds, hasDefensibleCurrentSaleValue, type MarketSale } from './testAiComparableEngine';
import { buildCashAwareTradeTerms } from './testAiAnalysisSnapshot';
import { TEST_AI_VALUE_UNAVAILABLE_MESSAGE, type GuideValueAnchor } from '../shared/testAiEvidenceNormalization';
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

  it('uses valid current sales before a verified guide during sandbox testing', () => {
    const profile = buildMarketProfile(coin, records([100, 101, 102]).map((record) => ({ ...record, title: coin.title })), null, now, null, coinGuide(1_000_000));
    expect(profile.valuationBasis).toBe('market_sales');
    expect(profile.primaryValue).toBe(101);
    expect(profile.guideAnchorWeightPct).toBe(0);
    expect(profile.marketRange).toEqual({ low: 100, mid: 101, high: 102, supported: true });
    expect(profile.authoritativeSaleCount).toBe(3);
    expect(hasDefensibleCurrentSaleValue(profile)).toBe(true);
    const comparison = deterministicTradeComparison(profile, profile);
    expect(comparison.leftValue).toBe(101);
    expect(comparison.rightValue).toBe(101);
    expect(comparison.difference).toBe(0);
    expect(comparison.differencePercentage).toBe(0);
    expect(comparison.rangeRelationship).toBe('overlap');
    expect(buildCashAwareTradeTerms(profile, profile).suggestedCashRange).not.toBeNull();
    expect(profile.valuationBasisReason).toContain('value uses sales alone');
    expect(profile.valuationBasisReason).not.toContain(TEST_AI_VALUE_UNAVAILABLE_MESSAGE);
  });

  it('uses guide fallback when sale amounts exist but spread makes the current evidence inadequate', () => {
    const profile = buildMarketProfile(coin, records([100, 101, 102, 10000]).map((record) => ({ ...record, title: coin.title })), null, now, null, coinGuide(1200));
    expect(profile.valuationBasis).toBe('guide_fallback');
    expect(profile.primaryValue).toBe(1200);
    expect(profile.marketRange.supported).toBe(false);
    expect(buildCashAwareTradeTerms(profile, profile).suggestedCashRange).toBeNull();
  });

  it('retains a verified Coin guide as reference but blocks its fallback under material identity review', () => {
    const profile = buildMarketProfile(coin, records([100, 101, 102]).map((record) => ({ ...record, title: coin.title })), null, now,
      { materialReviewRequired: true, sourceAlignmentStatus: 'conflicted', materialFlags: ['Known wrong identity'] }, coinGuide(1200));
    expect(profile.guideAnchorValue).toBe(1200);
    expect(profile.primaryValue).toBeNull();
    expect(profile.guideAdjustedValue).toBeNull();
    expect(profile.valuationBasis).toBe('insufficient_evidence');
    expect(profile.guideProvisional).toBe(false);
    expect(profile.guideAnchorWeightPct).toBe(0);
    expect(profile.marketRange.supported).toBe(false);
    expect(profile.valuationBasisReason).toBe(`${TEST_AI_VALUE_UNAVAILABLE_MESSAGE}. An unresolved material identity conflict blocks pricing, including guide fallback.`);
    expect(profile.valuationWarnings).toContain('Identity review: Known wrong identity');
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
      expect(profile.valuationBasis).toBe('market_sales');
      expect(profile.primaryValue).toBe(101);
      expect(profile.saleMedianValue).toBe(101);
      expect(profile.marketRange).toEqual({ low: 100, mid: 101, high: 102, supported: true });
      expect(profile.guideAnchorValue).toBeNull();
      expect(profile.authoritativeSaleCount).toBe(3);
      expect(profile.valuationBasisReason).toContain('value uses sales alone');
    }
  });

  it('retains preliminary sale evidence without issuing under-floor cash guidance', () => {
    const left = buildMarketProfile(target, records([100, 101, 102]), null, now);
    const right = buildMarketProfile(target, records([200, 201, 202]), null, now);
    expect(left.marketRange.supported).toBe(true);
    expect(hasDefensibleCurrentSaleValue(left)).toBe(true);
    expect(deterministicTradeComparison(left, right).verdict).toBe('Item B Worth More');
    const cash = buildCashAwareTradeTerms(left, right, { paidBy: 'item_a', amount: 100 });
    expect(cash.cashAdjustment).toEqual({ paidBy: 'item_a', amount: 100 });
    expect(cash.termsStatus).toBe('within_overlap_band');
    expect(cash.suggestedCashRange).not.toBeNull();
    expect(cash.adjustedRangeOverlap).not.toBeNull();
  });

  it('uses the temporary one-sale sports-card floor', () => {
    const below = buildMarketProfile(target, records([100, 101, 102, 103]), null, now);
    const at = buildMarketProfile(target, records([100, 101, 102, 103, 104]), null, now);
    expect(below.valuationBasis).toBe('market_sales');
    expect(at.valuationBasis).toBe('market_sales');
    expect(at.primaryValue).toBe(102);
    expect(hasDefensibleCurrentSaleValue(at)).toBe(true);
  });

  it('allows a single recognized marketplace under the temporary floor', () => {
    const below = buildMarketProfile(target, records([100, 101, 102, 103, 104, 105], true), null, now);
    const at = buildMarketProfile(target, records([100, 101, 102, 103, 104, 105, 106], true), null, now);
    expect(below.valuationBasis).toBe('market_sales');
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
    expect(terms.leftValue).toBeNull();
    expect(terms.rightValue).toBeNull();
    expect(terms.difference).toBeNull();
    expect(terms.differencePercentage).toBeNull();
    expect(terms.verdict).toBe('Insufficient Evidence');
  });

  it.each(['item_a', 'item_b'] as const)
  ('retains the other side sale-supported estimate when %s has no primary value', (missingSide) => {
    const missing = buildMarketProfile(target, [], { median: 99999, count: 100, confidence: 'high' }, now);
    const valued = buildMarketProfile(target, records([200, 201, 202, 203, 204]), null, now);
    const left = missingSide === 'item_a' ? missing : valued;
    const right = missingSide === 'item_b' ? missing : valued;
    const comparison = deterministicTradeComparison(left, right, 50000, 1);
    expect(comparison.leftValue).toBe(missingSide === 'item_a' ? null : 202);
    expect(comparison.rightValue).toBe(missingSide === 'item_b' ? null : 202);
    expect(comparison.difference).toBeNull();
    expect(comparison.differencePercentage).toBeNull();
    expect(comparison.midpointDifference).toBeNull();
    expect(comparison.rangeGap).toBeNull();
    expect(comparison.verdict).toBe('Insufficient Evidence');
    expect(comparison.rangeRelationship).toBe('unsupported');
    expect(comparison.decisionBasis).toContain(`${missingSide === 'item_a' ? 'Item A' : 'Item B'}: ${TEST_AI_VALUE_UNAVAILABLE_MESSAGE}`);
    const cash = buildCashAwareTradeTerms(left, right, { paidBy: 'item_a', amount: 100 });
    expect(cash.cashAdjustment).toEqual({ paidBy: 'item_a', amount: 100 });
    expect(cash.rawMidpointDifference).toBeNull();
    expect(cash.adjustedMidpointDifference).toBeNull();
    expect(cash.adjustedRangeOverlap).toBeNull();
    expect(cash.suggestedCashRange).toBeNull();
    expect(cash.termsStatus).toBe('insufficient_evidence');
  });

  it('retains each provisional guide estimate while withholding comparison gaps and percentages', () => {
    const left = buildMarketProfile(coin, [], null, now, null, coinGuide(1000));
    const right = buildMarketProfile(coin, [], null, now, null, coinGuide(2000));
    const comparison = deterministicTradeComparison(left, right, 50000, 1);
    expect(left.valuationBasis).toBe('guide_fallback');
    expect(right.valuationBasis).toBe('guide_fallback');
    expect(comparison.leftValue).toBe(1000);
    expect(comparison.rightValue).toBe(2000);
    expect(comparison.difference).toBeNull();
    expect(comparison.differencePercentage).toBeNull();
    expect(comparison.midpointDifference).toBeNull();
    expect(comparison.rangeGap).toBeNull();
    expect(comparison.rangeRelationship).toBe('unsupported');
    expect(comparison.verdict).toBe('Insufficient Evidence');
    expect(comparison.decisionBasis).toContain('provisional estimate');
    expect(comparison.decisionBasis).not.toContain(TEST_AI_VALUE_UNAVAILABLE_MESSAGE);
    expect(buildCashAwareTradeTerms(left, right).suggestedCashRange).toBeNull();
  });

  it.each(['missing', 'market_sales'] as const)
  ('preserves a guide side opposite %s without promoting the pair to a definitive comparison', (otherBasis) => {
    const guide = buildMarketProfile(coin, [], null, now, null, coinGuide(1500));
    const other = otherBasis === 'missing' ? buildMarketProfile(target, [], null, now)
      : buildMarketProfile(target, records([200, 201, 202, 203, 204]), null, now);
    for (const [left, right] of [[guide, other], [other, guide]] as const) {
      const comparison = deterministicTradeComparison(left, right, 50000, 1);
      expect(comparison.leftValue).toBe(left.primaryValue);
      expect(comparison.rightValue).toBe(right.primaryValue);
      expect(comparison.difference).toBeNull();
      expect(comparison.differencePercentage).toBeNull();
      expect(comparison.rangeGap).toBeNull();
      expect(comparison.midpointDifference).toBeNull();
      expect(comparison.rangeRelationship).toBe('unsupported');
      expect(comparison.verdict).toBe('Insufficient Evidence');
      expect(buildCashAwareTradeTerms(left, right).suggestedCashRange).toBeNull();
    }
  });

  it('keeps valid definitive cash suggestions on the same sale-based evidence floor', () => {
    const left = buildMarketProfile(target, records([100, 101, 102, 103, 104]), null, now);
    const right = buildMarketProfile(target, records([200, 201, 202, 203, 204]), null, now);
    expect(hasDefensibleCurrentSaleValue(left)).toBe(true);
    const comparison = deterministicTradeComparison(left, right);
    expect(comparison.verdict).toBe('Item B Worth More');
    expect(comparison.leftValue).toBe(102);
    expect(comparison.rightValue).toBe(202);
    expect(comparison.difference).toBe(100);
    expect(comparison.differencePercentage).toBe(Math.round((100 / 102) * 1000) / 10);
    expect(comparison.midpointDifference).toBe(100);
    expect(comparison.rangeGap).toBe(96);
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
