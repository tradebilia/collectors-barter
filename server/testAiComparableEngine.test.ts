import { describe, expect, it } from 'vitest';
import { buildMarketProfile, deduplicateMarketSales, deterministicTradeComparison, scoreComparable } from './testAiComparableEngine';

const target = {
  title: '1996 Topps Kobe Bryant #138 PSA 10',
  category: 'sports_cards',
  grade: '10',
  certificationCompany: 'PSA',
  itemDetails: JSON.stringify({ year: '1996', manufacturer: 'Topps', player: 'Kobe Bryant', cardNumber: '138' }),
};

const sale = (title: string, price: number, date: string) => ({ title, price, currency: 'USD', date });

describe('Trade Analyzer 2.0 comparable engine', () => {
  it('scores exact identity and grade matches above weaker comparables', () => {
    const exact = scoreComparable(target, sale('1996 Topps Kobe Bryant #138 PSA 10', 1200, '2026-09-01'));
    const wrongGrade = scoreComparable(target, sale('1996 Topps Kobe Bryant #138 PSA 9', 450, '2026-09-01'));
    const parallel = scoreComparable(target, sale('1996 Topps Kobe Bryant Refractor #138 PSA 10', 3200, '2026-09-01'));
    expect(exact.score).toBeGreaterThan(wrongGrade.score);
    expect(exact.score).toBeGreaterThan(parallel.score);
    expect(exact.accepted).toBe(true);
    expect(wrongGrade.accepted).toBe(false);
    expect(wrongGrade.classification).toBe('contextual');
    expect(wrongGrade.identityRelationship).toBe('same_object_different_state');
    expect(wrongGrade.valuationRelationship).toBe('grade_adjacent_comparable');
    expect(wrongGrade.exclusionReason).toContain('secondary evidence');
    expect(wrongGrade.reasons).toContain('grade differs');
  });

  it('rejects a known sale from a different grading company even when title identity is strong', () => {
    const saleFromDifferentCompany = scoreComparable(target, sale('1996 Topps Kobe Bryant #138 BGS 10', 1500, '2026-09-01'));
    expect(saleFromDifferentCompany.accepted).toBe(false);
    expect(saleFromDifferentCompany.classification).toBe('contextual');
    expect(saleFromDifferentCompany.identityRelationship).toBe('same_object_different_state');
    expect(saleFromDifferentCompany.valuationRelationship).toBe('grade_adjacent_comparable');
    expect(saleFromDifferentCompany.exclusionReason).toContain('certification-adjacent');
  });

  it('matches PCGS coin prefixes as part of the grade identity', () => {
    const coinTarget = {
      title: '1921 Peace Dollar PCGS MS65',
      category: 'coins',
      grade: 'MS65',
      certificationCompany: 'PCGS',
      itemDetails: JSON.stringify({ year: '1921', denomination: '$1', mint: 'Philadelphia' }),
    };
    const exact = scoreComparable(coinTarget, sale('1921 Peace Dollar PCGS MS65 CAC', 1500, '2026-09-01'));
    const wrongClass = scoreComparable(coinTarget, sale('1921 Peace Dollar PCGS PR65', 2200, '2026-09-01'));
    const wrongNumber = scoreComparable(coinTarget, sale('1921 Peace Dollar PCGS MS64', 600, '2026-09-01'));

    expect(exact.accepted).toBe(true);
    expect(exact.reasons).toContain('PCGS coin grade matches');
    expect(wrongClass.accepted).toBe(false);
    expect(wrongClass.valuationRelationship).toBe('grade_adjacent_comparable');
    expect(wrongNumber.accepted).toBe(false);
  });

  it('weights recent exact sales more heavily than older accepted sales', () => {
    const profile = buildMarketProfile(target, [
      sale('1996 Topps Kobe Bryant #138 PSA 10', 1000, '2026-09-15'),
      sale('1996 Topps Kobe Bryant #138 PSA 10', 1100, '2026-08-20'),
      sale('1996 Topps Kobe Bryant #138 PSA 10', 2000, '2025-01-01'),
    ], null, new Date('2026-09-22T00:00:00Z'));
    expect(profile.weightedValue).not.toBeNull();
    expect(profile.weightedValue!).toBeLessThan(1400);
    expect(profile.recentSaleCount).toBe(2);
    expect(profile.salesVelocity.thirtyDay).toBe(1);
  });

  it('does not manufacture a verified value from active-only aggregate context', () => {
    const profile = buildMarketProfile(target, [], { median: 800, count: 12, confidence: 'high' });
    expect(profile.marketRange.supported).toBe(false);
    expect(profile.weightedValue).toBeNull();
    expect(profile.evidenceState).toBe('no_market_evidence');
    expect(profile.valuationMethod).toContain('no verified valuation');
  });

  it('does not allow incomplete target identity to become a valuation comparable', () => {
    const incompleteTarget = {
      title: 'Charizard', category: 'pokemon', itemDetails: JSON.stringify({ cardName: 'Charizard', setName: 'Base Set' }),
    };
    const match = scoreComparable(incompleteTarget, sale('Pokemon Base Set Charizard #4 PSA 9', 2500, '2026-09-15'));
    expect(match.accepted).toBe(false);
    expect(match.classification).toBe('contextual');
    expect(match.exclusionReason).toContain('Card #');
  });

  it('keeps historical or non-completed records as context and suppresses duplicate sales', () => {
    const recent = { ...sale('1996 Topps Kobe Bryant #138 PSA 10', 1200, '2026-09-15'), sourceId: '130point', saleStatus: 'completed' as const, saleId: 'abc' };
    const duplicate = { ...recent, marketplace: 'duplicate mirror' };
    const historical = { ...sale('1996 Topps Kobe Bryant #138 PSA 10', 900, '2024-09-15'), sourceId: '130point', saleStatus: 'completed' as const, recency: 'historical' as const };
    const active = { ...sale('1996 Topps Kobe Bryant #138 PSA 10', 4000, '2026-09-15'), sourceId: 'active feed', saleStatus: 'active' as const };
    const profile = buildMarketProfile(target, [recent, duplicate, historical, active], null, new Date('2026-09-22T00:00:00Z'));

    expect(deduplicateMarketSales([recent, duplicate]).duplicates).toHaveLength(1);
    expect(profile.exactMatchCount).toBe(1);
    expect(profile.contextualComparableCount).toBe(2);
    expect(profile.duplicateSaleCount).toBe(1);
    expect(profile.weightedValue).toBe(1200);
  });

  it('does not allow an undated sale record to enter the deterministic value', () => {
    const profile = buildMarketProfile(target, [{
      title: target.title, price: 1200, currency: 'USD', recency: 'undated', sourceId: '130point', saleStatus: 'completed',
    }], null, new Date('2026-09-22T00:00:00Z'));
    expect(profile.weightedValue).toBeNull();
    expect(profile.contextualComparableCount).toBe(1);
  });

  it('does not allow an explicitly unknown price basis to enter the deterministic value', () => {
    const profile = buildMarketProfile(target, [{
      ...sale(target.title, 1200, '2026-09-15'), sourceId: 'ambiguous-provider', saleStatus: 'completed', priceBasis: 'unknown' as const,
    }], null, new Date('2026-09-22T00:00:00Z'));
    expect(profile.weightedValue).toBeNull();
    expect(profile.contextualComparableCount).toBe(1);
  });

  it('exposes sparse, volatile, and low-liquidity evidence instead of hiding it', () => {
    const profile = buildMarketProfile(target, [
      sale('1996 Topps Kobe Bryant #138 PSA 10', 100, '2026-09-20'),
      sale('1996 Topps Kobe Bryant #138 PSA 10', 3000, '2026-09-18'),
    ], null, new Date('2026-09-22T00:00:00Z'));
    expect(profile.marketStability).toBe('low');
    expect(profile.liquidity).toBe('low');
    expect(profile.evidenceState).toBe('sparse_market_evidence');
    expect(profile.marketRange.supported).toBe(false);
  });

  it('uses deterministic profile values for the trade verdict', () => {
    const left = buildMarketProfile(target, [sale(target.title, 1000, '2026-09-15'), sale(target.title, 1100, '2026-09-10')], null, new Date('2026-09-22T00:00:00Z'));
    const right = buildMarketProfile(target, [sale(target.title, 1600, '2026-09-15'), sale(target.title, 1700, '2026-09-10')], null, new Date('2026-09-22T00:00:00Z'));
    const comparison = deterministicTradeComparison(left, right);
    expect(comparison.verdict).toBe('Insufficient Evidence');
    expect(comparison.difference).toBeGreaterThan(0);
    expect(comparison.rangeRelationship).toBe('unsupported');
    expect(comparison.rangeGap).toBeNull();
  });

  it('withholds a winner when defensible completed-sale ranges overlap despite different midpoints', () => {
    const left = buildMarketProfile(target, [
      sale(target.title, 100, '2026-09-15'),
      sale(target.title, 220, '2026-09-10'),
    ], null, new Date('2026-09-22T00:00:00Z'));
    const right = buildMarketProfile(target, [
      sale(target.title, 180, '2026-09-15'),
      sale(target.title, 300, '2026-09-10'),
    ], null, new Date('2026-09-22T00:00:00Z'));
    const comparison = deterministicTradeComparison(left, right);
    expect(comparison.difference).toBeGreaterThan(0);
    expect(comparison.verdict).toBe('Insufficient Evidence');
    expect(comparison.rangeRelationship).toBe('unsupported');
    expect(comparison.overlapBand).toBeNull();
    expect(comparison.decisionBasis).toContain('lack a defensible');
  });

  it('does not issue a definitive verdict from owner estimates alone', () => {
    const left = buildMarketProfile(target, []);
    const right = buildMarketProfile(target, []);
    expect(deterministicTradeComparison(left, right, 2000, 200).verdict).toBe('Insufficient Evidence');
  });

  it('does not issue a deterministic verdict from aggregate market context without accepted completed sales', () => {
    const left = buildMarketProfile(target, [], { median: 500, count: 20, confidence: 'high' });
    const right = buildMarketProfile(target, [], { median: 2000, count: 20, confidence: 'high' });
    expect(deterministicTradeComparison(left, right).verdict).toBe('Insufficient Evidence');
  });

  it('lets normalized completed Sold-Comps records affect the deterministic profile', () => {
    const withoutSoldComps = buildMarketProfile(target, [
      { ...sale(target.title, 1000, '2026-09-15'), sourceId: '130point', saleStatus: 'completed' },
      { ...sale(target.title, 1100, '2026-09-10'), sourceId: '130point', saleStatus: 'completed' },
    ]);
    const withSoldComps = buildMarketProfile(target, [
      { ...sale(target.title, 1000, '2026-09-15'), sourceId: '130point', saleStatus: 'completed' },
      { ...sale(target.title, 1100, '2026-09-10'), sourceId: '130point', saleStatus: 'completed' },
      { ...sale(target.title, 1800, '2026-09-12'), sourceId: 'sold_comps', saleId: 'ebay-1', saleStatus: 'completed' },
    ]);
    expect(withSoldComps.authoritativeSaleCount).toBe(3);
    expect(withSoldComps.weightedValue).toBeGreaterThan(withoutSoldComps.weightedValue!);
  });

  it('withholds deterministic valuation when normalized evidence reports a material conflict', () => {
    const profile = buildMarketProfile(target, [
      { ...sale(target.title, 1000, '2026-09-15'), sourceId: 'sold_comps', saleStatus: 'completed' },
      { ...sale(target.title, 1100, '2026-09-10'), sourceId: 'sold_comps', saleStatus: 'completed' },
    ], null, new Date('2026-09-22T00:00:00Z'), {
      materialReviewRequired: true,
      sourceAlignmentStatus: 'conflicted',
      materialFlags: ['Source reports a different card number.'],
    });
    expect(profile.marketRange.supported).toBe(false);
    expect(profile.valuationMethod).toContain('material identity evidence conflict');
    expect(profile.valuationWarnings).toContain('Identity review: Source reports a different card number.');
  });

  it('rejects an explicitly different card number but retains a missing number as review context', () => {
    const wrongNumber = scoreComparable(target, sale('1996 Topps Kobe Bryant #139 PSA 10', 900, '2026-09-15'));
    const missingNumber = scoreComparable(target, {
      ...sale('1996 Topps Kobe Bryant PSA 10', 900, '2026-09-15'),
      evidenceDisposition: 'warning_review',
    });

    expect(wrongNumber.accepted).toBe(false);
    expect(wrongNumber.categoryIdentity.status).toBe('objective_conflict');
    expect(wrongNumber.exclusionReason).toContain('Card # differs (139)');
    expect(missingNumber.classification).toBe('contextual');
    expect(missingNumber.categoryIdentity.status).toBe('needs_review');
    expect(missingNumber.exclusionReason).toContain('category-specific identity needs review');
  });

  it('does not reject a legitimate limited edition when the target does not declare a conflicting variant', () => {
    const pinTarget = {
      title: 'Disney Pin Mickey Mouse 2020',
      category: 'disney_pins',
      itemDetails: JSON.stringify({ character: 'Mickey Mouse', year: '2020' }),
    };
    const limitedEdition = scoreComparable(pinTarget, sale('Disney Pin Mickey Mouse 2020 Limited Edition 500', 85, '2026-09-15'));

    expect(limitedEdition.classification).not.toBe('rejected');
    expect(limitedEdition.reasons).not.toContain('explicit sale variant or release detail differs from the target');
  });
});

export {};
