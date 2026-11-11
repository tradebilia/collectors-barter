import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildMarketProfile, deterministicTradeComparison, type ComparableTarget, type MarketSale } from './testAiComparableEngine';
import { buildAnalysisSnapshot, buildCashAwareTradeTerms, type AnalysisSnapshot } from './testAiAnalysisSnapshot';
import { normalizeAnalysisMarketSale } from './testAiMarketEvidence';
import { issueGuideAnchor } from './testAiGuideEvidence';
import { normalizeTestAiEvidence, nullableTestAiPrice, TEST_AI_VALUE_UNAVAILABLE_MESSAGE } from '../shared/testAiEvidenceNormalization';
import { sourceRequestDisplayData, sourceEvidenceStatus, sourceEvidenceMessage } from '../shared/testAiSourceDisplay';

const now = new Date('2026-11-09T12:00:00.000Z');
const target: ComparableTarget = {
  title: '1996 Topps Kobe Bryant #138 PSA 10', category: 'sports_cards', grade: '10', certificationCompany: 'PSA',
  itemDetails: JSON.stringify({ year: '1996', manufacturer: 'Topps', player: 'Kobe Bryant', cardNumber: '138' }),
};
const coin: ComparableTarget = {
  title: '1903-S Morgan Dollar PCGS MS65', category: 'coins', grade: 'MS65', certificationCompany: 'PCGS', itemType: 'single_coin',
  itemDetails: JSON.stringify({ country: 'United States', denomination: '$1', year: '1903', mintMark: 'S', variety: 'Morgan Dollar' }),
};
const guideKey = 'synthetic-no-value-guide-key-not-a-service-credential';
function sales(prices: number[], item = target, overrides: Partial<MarketSale> = {}): MarketSale[] {
  return prices.map((price, index) => ({
    title: item.title, price, currency: 'USD', date: '2026-11-01T00:00:00.000Z', saleId: `no-value-${index}-${price}`,
    sourceId: 'sold_comps', sourceAdapter: 'sold_comps', sourceLabel: 'Synthetic source',
    originMarketplace: index % 2 ? 'heritage' : 'ebay', saleStatus: 'completed', priceBasis: 'sold',
    recency: 'recent', visualReviewStatus: 'match', evidenceDisposition: 'valuation_eligible', ...overrides,
  }));
}
function snapshot(records: MarketSale[], outcomes: Parameters<typeof normalizeTestAiEvidence>[1] = [], item = target): AnalysisSnapshot {
  return buildAnalysisSnapshot({ target: item, sales: records, evidenceSummary: normalizeTestAiEvidence(item, outcomes), now });
}
function guideSnapshot(value: number, outcomes: Parameters<typeof normalizeTestAiEvidence>[1] = []) {
  const evidence = normalizeTestAiEvidence(coin, outcomes);
  const issued = issueGuideAnchor({ sourceId: 'pricecharting', sourceLabel: 'PriceCharting Coin Guide', grade: 'MS65', selectedGrade: 'MS65',
    matchType: 'exact', value, recordedSales: null, lastSaleDate: null, totalRecordedSales: null }, coin, {
    sourceId: 'pricecharting', sourceQuery: 'Synthetic1903S Morgan', sourceRecordId: 'synthetic-no-value-coin', currency: 'USD',
    providerIdentity: { title: coin.title, country: 'United States', denomination: '1 Dollar', year: '1903', mintMark: 'S', variety: 'Morgan Dollar', form: 'single_coin' },
  }, { now, signingKey: guideKey });
  expect(issued.warnings).toEqual([]);
  expect(issued.guideAnchor).not.toBeNull();
  evidence.guideAnchors = [JSON.parse(JSON.stringify(issued.guideAnchor))];
  return buildAnalysisSnapshot({ target: coin, sales: [], evidenceSummary: evidence, now }, { signingKey: guideKey });
}
function assertWithheld(left: ReturnType<typeof buildMarketProfile>, right: ReturnType<typeof buildMarketProfile>) {
  const comparison = deterministicTradeComparison(left, right, 999_999, 888_888);
  expect(comparison.verdict).toBe('Insufficient Evidence');
  expect(comparison.rangeRelationship).toBe('unsupported');
  expect(comparison.difference).toBeNull();
  expect(comparison.differencePercentage).toBeNull();
  expect(comparison.midpointDifference).toBeNull();
  const cash = buildCashAwareTradeTerms(left, right, { paidBy: 'item_a', amount: 75 });
  expect(cash.cashAdjustment).toEqual({ paidBy: 'item_a', amount: 75 });
  expect(cash.termsStatus).toBe('insufficient_evidence');
  expect(cash.rawMidpointDifference).toBeNull();
  expect(cash.adjustedMidpointDifference).toBeNull();
  expect(cash.adjustedRangeOverlap).toBeNull();
  expect(cash.suggestedCashRange).toBeNull();
  return comparison;
}

describe('Approved Step B no-value policy: actual deterministic modules', () => {
  it.each([null, undefined, '', '   ', NaN, Infinity, -Infinity, false, true, {}, []])('does not coerce absent or invalid price %s into a public zero', (value) => {
    expect(nullableTestAiPrice(value)).toBeNull();
    const normalized = normalizeAnalysisMarketSale({ title: target.title, sourceId: 'sold_comps', price: value } as any, now);
    expect(normalized.sale.price).toBeNull();
    expect(normalized.valuationEligible).toBe(false);
    const profile = buildMarketProfile(target, [normalized.sale], null, now);
    expect(profile.comparables[0].price).toBeNull();
    expect(profile.primaryValue).toBeNull();
  });

  it('retains actual observed numeric zero as a diagnostic without establishing zero item value', () => {
    expect(nullableTestAiPrice(0)).toBe(0);
    const profile = buildMarketProfile(target, sales([0]), null, now);
    expect(profile.primaryValue).toBeNull();
    expect(profile.authoritativeSaleCount).toBe(0);
  });

  it('empty A/B have null sides and no gap despite nonzero owner fallback arguments', () => {
    const profile = snapshot([]).profile;
    expect(profile.valuationBasisReason).toContain(TEST_AI_VALUE_UNAVAILABLE_MESSAGE);
    expect(profile.valuationBasisReason).toContain('search coverage is unknown');
    const comparison = assertWithheld(profile, profile);
    expect(comparison.leftValue).toBeNull();
    expect(comparison.rightValue).toBeNull();
    expect(buildCashAwareTradeTerms(profile, profile).summary).toContain(TEST_AI_VALUE_UNAVAILABLE_MESSAGE);
  });

  it.each(['left', 'right'] as const)('preserves the known side when the %s side is missing but withholds all trade arithmetic', (side) => {
    const absent = snapshot([]).profile;
    const known = snapshot(sales([100, 102, 104, 106, 108, 110])).profile;
    expect(known.valuationBasis).toBe('market_sales');
    expect(known.primaryValue).toBe(105);
    const result = side === 'left' ? assertWithheld(absent, known) : assertWithheld(known, absent);
    expect(result.leftValue).toBe(side === 'left' ? null : 105);
    expect(result.rightValue).toBe(side === 'right' ? null : 105);
  });

  it.each([null, undefined, NaN, Infinity, 0, -1, '', '105', false])('fails closed for malformed primary %s even beside an otherwise supported range', (primary) => {
    const known = snapshot(sales([100, 102, 104, 106, 108, 110])).profile;
    const malformed = { ...known, primaryValue: primary } as any;
    const result = assertWithheld(malformed, known);
    expect(result.leftValue).toBeNull();
    expect(result.rightValue).toBe(105);
  });

  it('keeps sparse verified sales as provisional primary evidence with warnings', () => {
    const profile = snapshot(sales([100, 102, 104])).profile;
    expect(profile.saleMedianValue).toBe(102);
    expect(profile.primaryValue).toBe(102);
    expect(profile.valuationBasis).toBe('market_sales');
    expect(profile.valuationBasisReason).toContain('value uses sales alone');
    expect(profile.authoritativeSaleCount).toBe(3);
    expect(deterministicTradeComparison(profile, profile).verdict).toBe('Ranges Overlap — Evidence is Indeterminate');
  });

  it.each([
    { saleStatus: 'active', priceBasis: 'unknown' },
    { date: null, recency: 'undated' },
    { date: '2024-01-01T00:00:00.000Z', recency: 'historical' },
  ] as Partial<MarketSale>[])('retains contextual non-current evidence without a false empty audit or value', (patch) => {
    const profile = snapshot(sales([500], target, patch)).profile;
    expect(profile.comparables).toHaveLength(1);
    expect(profile.primaryValue).toBeNull();
    expect(profile.valuationBasisReason).toContain(TEST_AI_VALUE_UNAVAILABLE_MESSAGE);
    assertWithheld(profile, profile);
  });

  it('preserves simultaneous frozen failed, partial, idle and guide-selection facts rather than claiming universal absence', () => {
    const result = snapshot(sales([100, 102, 104]), [
      { id: 'sold_comps', label: 'eBay Sold-Comps', kind: 'market_completed', status: 'partial', market: { completedSaleCount: 3 }, message: 'Known rows retained after one failed query.' },
      { id: 'ebay_active', label: 'eBay Active', kind: 'market_current', status: 'error', message: 'Source request failed; not zero matches.' },
      { id: 'numista', label: 'Numista', kind: 'reference', status: 'not_found', message: 'Guide rejected: target grade incompatibility.' },
      { id: 'pricecharting', label: 'PriceCharting', kind: 'reference', status: 'idle', message: 'Search not completed.' },
    ]);
    expect(result.evidence.sourceStatuses.map((row) => row.status)).toEqual(['partial', 'error', 'not_found', 'idle']);
    expect(result.evidence.sourceStatuses.find((row) => row.id === 'numista')?.message).toContain('Guide rejected');
    expect(result.profile.valuationBasisReason).toContain('value uses sales alone');
    expect(result.profile.comparables).toHaveLength(3);
  });

  it('a material identity hold remains explicit and cannot be solved by an owner estimate', () => {
    const profile = buildMarketProfile(target, sales([100, 102, 104, 106, 108, 110]), null, now,
      { materialReviewRequired: true, materialFlags: ['Target identity requires review'], sourceAlignmentStatus: 'conflicted' });
    expect(profile.primaryValue).toBeNull();
    expect(profile.valuationBasisReason).toContain(TEST_AI_VALUE_UNAVAILABLE_MESSAGE);
    expect(profile.valuationBasisReason).toMatch(/identity|review/i);
    assertWithheld(profile, profile);
  });

  it('known verified guide values survive an unrelated source failure but never authorize comparison or cash', () => {
    const failed = [{ id: 'sold_comps', label: 'eBay Sold-Comps', kind: 'market_completed' as const, status: 'error' as const, message: 'Provider unavailable.' }];
    const left = guideSnapshot(1200, failed);
    const right = guideSnapshot(1600, failed);
    expect(left.profile.primaryValue).toBe(1200);
    expect(left.profile.valuationBasis).toBe('guide_fallback');
    expect(left.profile.valuationBasisReason).not.toContain(TEST_AI_VALUE_UNAVAILABLE_MESSAGE);
    const comparison = assertWithheld(left.profile, right.profile);
    expect(comparison.leftValue).toBe(1200);
    expect(comparison.rightValue).toBe(1600);
    expect(buildCashAwareTradeTerms(left.profile, right.profile).summary).not.toContain(TEST_AI_VALUE_UNAVAILABLE_MESSAGE);
    expect(left.evidence.sourceStatuses[0].status).toBe('error');
  });

  it('sufficient sale-only values survive an unrelated failed source and genuine supported zero differences remain measured zero', () => {
    const result = snapshot(sales([100, 102, 104, 106, 108, 110]), [{ id: 'pricecharting', label: 'PriceCharting', kind: 'reference', status: 'error', message: 'Guide source unavailable.' }]);
    expect(result.profile.primaryValue).toBe(105);
    expect(result.profile.valuationBasis).toBe('market_sales');
    const comparison = deterministicTradeComparison(result.profile, result.profile);
    expect(comparison.difference).toBe(0);
    expect(comparison.differencePercentage).toBe(0);
    expect(comparison.verdict).not.toBe('Insufficient Evidence');
    expect(buildCashAwareTradeTerms(result.profile, result.profile).rawMidpointDifference).toBe(0);
  });

  it('actual router and client source wiring keep deterministic notices after narration and frozen final evidence on both sides', () => {
    const router = readFileSync(new URL('./testAIRouter.ts', import.meta.url), 'utf8');
    const client = readFileSync(new URL('../client/src/pages/TestAI.tsx', import.meta.url), 'utf8');
    const analyze = router.slice(router.indexOf('analyzeTrade:'));
    expect(analyze).not.toContain('leftItem.estimatedValue ?? 0');
    expect(analyze).not.toContain('rightItem.estimatedValue ?? 0');
    expect(analyze).toContain('...narrative,');
    expect(analyze).toContain('valueSummary: noValueNotices.length');
    expect(analyze).toContain('TEST_AI_VALUE_UNAVAILABLE_MESSAGE');
    expect(client).toContain('result.leftAnalysisSnapshot');
    expect(client).toContain('result.rightAnalysisSnapshot');
    expect(client).toContain('TEST_AI_VALUE_UNAVAILABLE_MESSAGE');
  });
});


describe('Step B retained signed guide after failed retrieval', () => {
  it('retains an applicable signed Coin candidate through partial retrieval but still rejects tampered or expired proof', () => {
    const issued = issueGuideAnchor({ sourceId: 'pricecharting', sourceLabel: 'PriceCharting Coin Guide', grade: 'MS65', selectedGrade: 'MS65',
      matchType: 'exact', value: 1200, recordedSales: null, lastSaleDate: null, totalRecordedSales: null }, coin, {
      sourceId: 'pricecharting', sourceQuery: 'Synthetic retained1903S Morgan', sourceRecordId: 'synthetic-retained-coin', currency: 'USD',
      providerIdentity: { title: coin.title, country: 'United States', denomination: '1 Dollar', year: '1903', mintMark: 'S', variety: 'Morgan Dollar', form: 'single_coin' },
    }, { now, signingKey: guideKey });
    expect(issued.warnings).toEqual([]);
    expect(issued.guideAnchor).not.toBeNull();
    const packet = { data: { id: 'synthetic-retained-coin' }, fields: { guideAnchor: JSON.parse(JSON.stringify(issued.guideAnchor)) } };
    const retained = sourceRequestDisplayData(packet, true)!;
    expect(sourceEvidenceStatus(retained)).toBe('partial');
    const evidence = normalizeTestAiEvidence(coin, [{ id: 'pricecharting', label: 'PriceCharting', kind: 'reference',
      status: sourceEvidenceStatus(retained), message: sourceEvidenceMessage(retained) ?? undefined, fields: retained.fields }]);
    expect(evidence.guideAnchors).toHaveLength(1);
    const result = buildAnalysisSnapshot({ target: coin, sales: [], evidenceSummary: evidence, now }, { signingKey: guideKey });
    expect(result.profile.valuationBasis).toBe('guide_fallback');
    expect(result.profile.primaryValue).toBe(1200);
    expect(result.evidence.sourceStatuses[0].status).toBe('partial');
    expect(result.profile.valuationBasisReason).not.toContain(TEST_AI_VALUE_UNAVAILABLE_MESSAGE);
    const tampered = { ...evidence, guideAnchors: evidence.guideAnchors.map((anchor) => ({ ...anchor, value: 999_999 })) };
    expect(buildAnalysisSnapshot({ target: coin, sales: [], evidenceSummary: tampered, now }, { signingKey: guideKey }).profile.primaryValue).toBeNull();
    const expired = buildAnalysisSnapshot({ target: coin, sales: [], evidenceSummary: evidence, now: new Date('2030-01-01T00:00:00.000Z') }, { signingKey: guideKey });
    expect(expired.profile.primaryValue).toBeNull();
    expect(expired.evidence.sourceStatuses[0].status).toBe('partial');
  });
});
