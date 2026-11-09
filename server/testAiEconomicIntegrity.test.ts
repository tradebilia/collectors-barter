import { describe, expect, it, vi } from 'vitest';
vi.mock('./_core/env', () => ({ ENV: { jwtSecret: '' } }));
vi.mock('./_core/llm', () => ({ invokeLLM: vi.fn(() => { throw new Error('Stage 6 economic controls forbid model/provider access'); }) }));
import { createServerFinalIdentityApproval, getVerifiedIdentityApproval, sealCanonicalObservation } from './testAiCanonicalObservation';
import { buildVisualTargetMetadata, type VisualSourceReview } from './testAiVisualSourceFilter';
import { buildMarketProfile, scoreComparable, selectBalancedComparableSales, type ComparableTarget, type MarketSale } from './testAiComparableEngine';
import { normalizeAnalysisMarketSale, normalizeAnalysisMarketSales } from './testAiMarketEvidence';
import { signedTransactionLotConflict } from './testAiEconomicIntegrity';
import { readServerNormalizationReport } from '../shared/testAiValuationUse';

const now = new Date('2026-09-28T12:00:00.000Z');
const signingKey = 'synthetic-stage6-economic-integrity-key';
const image = 'https://synthetic.invalid/stage6-economic-target.jpg';
const target: ComparableTarget = { title: '1996 Topps Kobe Bryant #138 PSA 10', category: 'sports_cards',
  itemType: 'individual_card', grade: '10', certificationCompany: 'PSA', approvalTargetImageReference: image,
  itemDetails: JSON.stringify({ year: '1996', manufacturer: 'Topps', player: 'Kobe Bryant', cardNumber: '138' }) };
const coinTarget: ComparableTarget = { title: '2025 $1 Silver Eagle PCGS MS70', category: 'coins', itemType: 'individual_coin',
  grade: 'MS70', certificationCompany: 'PCGS', itemDetails: JSON.stringify({ denomination: '$1', year: '2025', coinName: 'Silver Eagle' }) };
function dayDate(age: number) { return new Date(now.getTime() - age * 86_400_000).toISOString(); }
function signed(overrides: Partial<MarketSale> = {}, adapter: Parameters<typeof sealCanonicalObservation>[0] = 'sold_comps'): MarketSale {
  const sale: MarketSale = { title: target.title, price: 1000, currency: 'USD', date: dayDate(30),
    sourceId: adapter, saleId: 'economic-sale', saleStatus: 'completed', priceBasis: 'sold',
    evidenceDisposition: 'valuation_eligible', visualRequirement: 'not_required', ...overrides };
  const seal = sealCanonicalObservation(adapter, sale, { acquiredAt: now, signingKey });
  return JSON.parse(JSON.stringify({ ...sale, provenanceToken: seal.provenanceToken }));
}
function normalized(input: MarketSale, effectiveTarget = target) {
  return normalizeAnalysisMarketSale(input, now, { signingKey, target: effectiveTarget, category: effectiveTarget.category,
    side: 'item_a', analysisRunId: 'stage6-economics' });
}
function blockers(sale: MarketSale) { return readServerNormalizationReport(sale)?.sourceAdmission.blockerCodes ?? []; }
function approved(price = 1000): MarketSale {
  const sale: MarketSale = { title: 'Kobe Bryant PSA 10', price, currency: 'USD', date: dayDate(30),
    sourceId: 'sold_comps', saleId: 'economic-approved', originMarketplace: 'eBay', url: 'https://www.ebay.com/itm/123456789',
    saleStatus: 'completed', priceBasis: 'sold', evidenceDisposition: 'valuation_eligible', visualRequirement: 'required', visualReviewStatus: 'match' };
  const evidence = { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true,
    gradeMatches: true, rawOrLooseVisible: false, identityMatches: true };
  const review: VisualSourceReview = { candidateIndex: 0, verdict: 'match', confidence: 'high', rationale: 'Synthetic exact pictured identity.',
    visualEvidence: evidence, visualAudit: { imageCount: 1, initialVerdict: 'match', initialConfidence: 'high',
      initialRationale: 'Synthetic exact pictured identity.', retryStatus: 'not_needed', finalPass: 'initial', initialEvidence: evidence, finalEvidence: evidence } };
  const handle = createServerFinalIdentityApproval({ sale, review, target, reviewedTarget: target,
    targetImageReference: image, expectedImageReference: image, targetMetadata: buildVisualTargetMetadata(target), acquiredAt: now });
  expect(handle).not.toBeNull();
  const seal = sealCanonicalObservation('sold_comps', sale, { acquiredAt: now, signingKey, identityApproval: handle });
  // Browser omission is not permission to replace signed facts or reopen identity.
  return JSON.parse(JSON.stringify({ ...sale, title: null, provenanceToken: seal.provenanceToken }));
}

describe('Stage 6 economic boundaries — actual signed normalization and scoring', () => {
  it.each([{ lotQuantity: 2 }, { saleForm: 'bundle' }, { saleForm: 'transaction_lot' }, { saleForm: 'lot_of_3' },
    ...['multipack', 'multi_pack', 'group_of_3', 'group of 2', 'pair', 'multi-item', 'multi_item_transaction', 'multiitem']
      .map((saleForm) => ({ saleForm, lotQuantity: null }))])(
    'holds explicit bland-title transaction lots without requiring visual approval: %j', (facts) => {
      const decision = normalized(signed(facts));
      expect(decision.valuationEligible).toBe(false);
      expect(blockers(decision.sale)).toContain('TRANSACTION_LOT_CONFLICT');
      expect(scoreComparable(target, decision.sale).accepted).toBe(false);
      expect(scoreComparable(target, decision.sale).identityAdmission?.blockerCodes).toContain('TRANSACTION_LOT_CONFLICT');
      const profile = buildMarketProfile(target, [decision.sale], null, now);
      expect(profile.authoritativeSaleCount).toBe(0);
      expect(profile.comparables).toHaveLength(1);
      expect(decision.sale.price).toBe(1000);
    });

  it.each(['single_product', 'factory_box_set', 'factory_contents', 'factory LEGO set', 'factory movie box set',
    'LEGO_set', 'Disney Collection series', 'auction_lot', 'lot', 'auction record lot', 'collection', 'series', 'group_of_1'])(
    'does not confuse factory product/series/archive roles with a transaction lot: %s', (saleForm) => {
      const input = signed({ saleForm, lotQuantity: null });
      Object.assign(input, { quantity: 500, stockAvailable: 500, numberOfPieces: 500 });
      const decision = normalized(input);
      expect(decision.valuationEligible).toBe(true);
      expect(blockers(decision.sale)).not.toContain('TRANSACTION_LOT_CONFLICT');
      expect(scoreComparable(target, decision.sale).accepted).toBe(true);
      expect(buildMarketProfile(target, [decision.sale], null, now).authoritativeSaleCount).toBe(1);
      expect(decision.sale.lotQuantity).toBeNull();
    });

  it('keeps a signed included auction record noun without transaction quantity unknown, not a lot conflict', () => {
    const decision = normalized(signed({ saleForm: 'lot', lotQuantity: null, priceBasis: 'realized', buyerPremium: 'included' }, 'lelands'));
    expect(decision.valuationEligible).toBe(true);
    expect(decision.sale.lotQuantity).toBeNull();
    expect(blockers(decision.sale)).not.toContain('TRANSACTION_LOT_CONFLICT');
    expect(scoreComparable(target, decision.sale).accepted).toBe(true);
  });

  it('preserves packaged-product targets and universal Collection/Lot non-comparability', () => {
    expect(signedTransactionLotConflict({ itemType: 'lego' }, { saleForm: 'factory LEGO set', lotQuantity: 1 })).toBe(false);
    expect(signedTransactionLotConflict({ itemType: 'box_set' }, { saleForm: 'factory movie box set' })).toBe(false);
    expect(signedTransactionLotConflict({ itemType: 'individual_pin' }, { saleForm: 'Disney Collection series' })).toBe(false);
    const decision = normalized(signed(), { ...target, itemType: 'Collection / Lot' });
    expect(decision.valuationEligible).toBe(false);
    expect(blockers(decision.sale)).toContain('TRANSACTION_LOT_CONFLICT');
  });

  it.each([
    ['sold_comps', 'eBay', 'sold', 'unknown', true, null],
    ['the_card_api', 'eBay', 'sold', 'unknown', true, null],
    ['the_card_api', 'Goldin', 'sold', 'excluded', false, 'AUCTION_AMOUNT_UNRESOLVED'],
    ['the_card_api', 'Goldin', 'closed', 'included', false, 'AUCTION_AMOUNT_UNRESOLVED'],
    ['the_card_api', 'Unknown', 'sold', 'unknown', false, 'AUCTION_AMOUNT_UNRESOLVED'],
    ['cardsight_ai', 'eBay', 'sold', 'unknown', false, 'AUCTION_AMOUNT_UNRESOLVED'],
    ['cardsight_ai', 'eBay', 'closed', 'included', false, 'AUCTION_AMOUNT_UNRESOLVED'],
    ['lelands', 'Lelands', 'sold', 'included', true, null],
    ['lelands', 'Lelands', 'closed', 'excluded', false, 'PREMIUM_NOT_INCLUDED'],
    ['lelands', 'Lelands', 'sold', 'unknown', false, 'PREMIUM_NOT_INCLUDED'],
    ['pristine_auction', 'Pristine Auction', 'realized', 'included', true, null],
    ['pristine_auction', 'Pristine Auction', 'sold', 'unknown', false, 'PREMIUM_NOT_INCLUDED'],
    ['sirius_sports_auctions', 'Sirius Sports Auctions', 'realized', 'included', true, null],
    ['goldin', 'Goldin', 'closed', 'included', true, null],
    ['weiss', 'Weiss', 'closed', 'excluded', false, 'AUCTION_AMOUNT_UNRESOLVED'],
    ['collect_auction', 'Collect Auction', 'sold', 'unknown', false, 'AUCTION_AMOUNT_UNRESOLVED'],
    ['comicconnect', 'ComicConnect', 'sold', 'unknown', true, null],
  ] as const)('keeps adapter/origin economics distinct: %s %s %s %s', (adapter, origin, priceBasis, buyerPremium, eligible, blocker) => {
    const decision = normalized(signed({ originMarketplace: origin, priceBasis, buyerPremium, price: 1234 }, adapter));
    expect(decision.valuationEligible).toBe(eligible);
    expect(decision.sale.price).toBe(1234);
    expect(decision.sale.buyerPremium).toBe(buyerPremium);
    expect(decision.sale.visualReviewStatus).toBe('not_reviewed');
    expect(blockers(decision.sale)).not.toContain('VISUAL_MISMATCH');
    if (blocker) expect(blockers(decision.sale)).toContain(blocker);
    expect(buildMarketProfile(target, [decision.sale], null, now).authoritativeSaleCount).toBe(eligible ? 1 : 0);
  });

  it('keeps bid/active, invalid selected totals, unknown currency and browser inclusion claims out of money', () => {
    const active = normalized(signed({ saleStatus: 'active' }, 'cardsight_ai'));
    expect(blockers(active.sale)).toContain('NOT_COMPLETED');
    for (const price of [null, 0, -1]) {
      const decision = normalized(signed({ price, priceBasis: 'realized', buyerPremium: 'included' }, 'pristine_auction'));
      expect(decision.valuationEligible).toBe(false);
      expect(blockers(decision.sale)).toContain('INVALID_PRICE');
    }
    const pristine = signed({ priceBasis: 'sold', buyerPremium: 'unknown' }, 'pristine_auction');
    Object.assign(pristine, { buyerPremium: 'included', totalPrice: 5000, buyerPremiumIncluded: true });
    expect(normalized(pristine).valuationEligible).toBe(false);
    for (const currency of [null, 'CAD']) {
      const decision = normalized(signed({ currency, priceBasis: 'realized', buyerPremium: 'included' }, 'goldin'));
      expect(decision.valuationEligible).toBe(false);
      expect(decision.sale.price).toBe(1000);
    }
  });

  it.each([
    [10_000, 1, true, null], [10_000, 100_000, true, null], [10_001, 2500.25, true, null],
    [10_001, 25002.5, true, null], [10_001, 2500.24, false, 'HIGH_VALUE_PRICE_TOO_LOW'],
    [10_001, 25002.51, false, 'HIGH_VALUE_PRICE_TOO_HIGH'], [undefined, 1, true, null],
  ] as const)('uses only the existing above-$10k 25%%–250%% safety bounds: %s / %s', (statedTradeValue, price, eligible, blocker) => {
    const effective = { ...target, statedTradeValue };
    const decision = normalized(signed({ price }), effective);
    expect(decision.valuationEligible).toBe(eligible);
    if (blocker) expect(blockers(decision.sale)).toContain(blocker);
    expect(buildMarketProfile(effective, [decision.sale], null, now).authoritativeSaleCount).toBe(eligible ? 1 : 0);
  });

  it('keeps A/B stated values independent, guide-like fields inactive, and approval binding unchanged', () => {
    const input = signed({ price: 1000 });
    const a = normalizeAnalysisMarketSales([input], now, { signingKey, target: { ...target, statedTradeValue: 20_000 }, side: 'item_a' });
    const b = normalizeAnalysisMarketSales([input], now, { signingKey, target: { ...target, statedTradeValue: 1000 }, side: 'item_b' });
    expect(a[0].evidenceDisposition).toBe('context_only');
    expect(b[0].evidenceDisposition).toBe('valuation_eligible');
    const guideLike = { ...target, itemDetails: JSON.stringify({ ...JSON.parse(target.itemDetails!), estimatedValue: 1_000_000, guideValue: 1_000_000 }) };
    expect(normalized(input, guideLike).valuationEligible).toBe(true);
    const decision = normalized(approved(6000), { ...target, statedTradeValue: 20_000 });
    expect(decision.valuationEligible).toBe(true);
    expect(getVerifiedIdentityApproval(decision.sale, target, image)).not.toBeNull();
    expect(getVerifiedIdentityApproval(decision.sale, { ...target, statedTradeValue: 12345 }, image)).not.toBeNull();
    expect(scoreComparable({ ...target, statedTradeValue: 20_000 }, decision.sale).identityAdmission?.basis).toBe('server_final_visual');
    expect(scoreComparable({ ...target, grade: '9' }, decision.sale).accepted).toBe(false);
  });

  it('lets actual wrong-target current rows yield to an admitted older coin, never older current support', () => {
    const currentWrong = signed({ title: '2025 $1 Silver Eagle PCGS MS69', date: dayDate(365), saleId: 'wrong-current' });
    const older = signed({ title: coinTarget.title, date: dayDate(366), saleId: 'exact-older' });
    const sales = normalizeAnalysisMarketSales([currentWrong, older], now, { signingKey, target: coinTarget, category: 'coins' });
    expect(scoreComparable(coinTarget, sales[0]).accepted).toBe(false);
    expect(sales[1].recency).toBe('extended');
    expect(scoreComparable(coinTarget, sales[1]).accepted).toBe(true);
    const profile = buildMarketProfile(coinTarget, sales, null, now);
    expect(profile.authoritativeSaleCount).toBe(1);
    expect(profile.currentWindowSaleCount).toBe(0);
    expect(profile.primaryValue).toBeNull();
    expect(profile.comparables.find((row) => row.saleId === 'exact-older')?.valuationUse?.use).toMatchObject({
      code: 'HISTORICAL_DIAGNOSTIC_ONLY', currentSaleMedianDiagnostics: false, primaryMarketSales: false });
  });

  it.each([365, 366, 730, 731])('preserves exact current/conditional extension endpoints: day %s', (age) => {
    const input = signed({ title: coinTarget.title, date: dayDate(age), saleId: `age-${age}` });
    const sales = normalizeAnalysisMarketSales([input], now, { signingKey, target: coinTarget, category: 'coins' });
    expect(sales[0].recency).toBe(age <= 365 ? 'recent' : age <= 730 ? 'extended' : 'historical');
    expect(sales[0].evidenceDisposition).toBe(age <= 730 ? 'valuation_eligible' : 'context_only');
    const profile = buildMarketProfile(coinTarget, sales, null, now);
    expect(profile.currentWindowSaleCount).toBe(age <= 365 ? 1 : 0);
  });

  it('an actual admitted current coin prevents extension, and liquid categories do not extend', () => {
    const current = signed({ title: coinTarget.title, date: dayDate(365), saleId: 'exact-current' });
    const old = signed({ title: coinTarget.title, date: dayDate(366), saleId: 'old-held' });
    const sales = normalizeAnalysisMarketSales([current, old], now, { signingKey, target: coinTarget, category: 'coins' });
    expect(scoreComparable(coinTarget, sales[0]).accepted).toBe(true);
    expect(sales[1].recency).toBe('historical');
    const liquid = normalizeAnalysisMarketSales([signed({ date: dayDate(366) })], now, { signingKey, target, category: 'sports_cards' });
    expect(liquid[0].recency).toBe('historical');
  });

  it.each([365, 366, 730, 731])('retains only the recent PCGS exception and never extends PCGS: day %s', (age) => {
    const input = signed({ title: coinTarget.title, date: dayDate(age), saleId: `pcgs-${age}`,
      originMarketplace: 'Heritage', priceBasis: 'realized', buyerPremium: 'unknown' }, 'pcgs_auction_results');
    const sales = normalizeAnalysisMarketSales([input], now, { signingKey, target: coinTarget, category: 'coins' });
    expect(sales[0].recency).toBe(age <= 365 ? 'recent' : 'historical');
    expect(sales[0].evidenceDisposition).toBe(age <= 365 ? 'valuation_eligible' : 'context_only');
    const profile = buildMarketProfile(coinTarget, sales, null, now);
    expect(profile.currentWindowSaleCount).toBe(age <= 365 ? 1 : 0);
    if (age <= 365) expect(readServerNormalizationReport(sales[0])?.sourceAdmission.warningCodes).toContain('PCGS_PREMIUM_AS_REPORTED');
  });

  it('keeps the original cap and ordinary price-independent score/selection controls', () => {
    const inputs = Array.from({ length: 55 }, (_, index) => signed({ saleId: `cap-${index}`, price: 1000 + index }));
    const sales = normalizeAnalysisMarketSales(inputs, now, { signingKey, target });
    const selection = selectBalancedComparableSales(target, sales, now);
    expect(selection.selected).toHaveLength(48);
    expect(selection.diagnostics.omittedByCap).toBe(7);
    const changed = normalizeAnalysisMarketSales(inputs.map((_, index) => signed({ saleId: `cap-${index}`, price: 2000 + index })), now, { signingKey, target });
    expect(selectBalancedComparableSales(target, changed, now).selected.map((row) => row.sale.saleId))
      .toEqual(selection.selected.map((row) => row.sale.saleId));
    expect(scoreComparable(target, sales[0]).score).toBe(scoreComparable(target, changed[0]).score);
  });
});
