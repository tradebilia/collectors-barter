import { describe, expect, it } from 'vitest';
import { buildMarketProfile, type MarketSale } from './testAiComparableEngine';
import { COMPLETED_SALE_SOURCE_DEFAULTS, normalizeAnalysisMarketSales, normalizeAnalysisMarketSale } from './testAiMarketEvidence';
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

function normalizeSale(input: MarketSale) {
  return normalizeAnalysisMarketSale(input, now, { signingKey });
}

function normalizeSales(inputs: MarketSale[]) {
  return normalizeAnalysisMarketSales(inputs, now, { signingKey });
}

function pcgsSale(overrides: Record<string, unknown> = {}) {
  const observation = {
    title: '2025 Silver Eagle MS70',
    price: 67,
    currency: 'USD',
    date: '2026-09-01T00:00:00.000Z',
    marketplace: 'eBay',
    originMarketplace: 'eBay',
    sourceId: 'pcgs_auction_results',
    sourceLabel: 'PCGS Auction Prices Realized',
    saleId: 'pcgs-ebay-fixture',
    saleStatus: 'completed' as const,
    completedStatusBasis: 'PCGS auction-prices-realized endpoint',
    priceBasis: 'sold' as const,
    buyerPremium: 'unknown' as const,
    ...overrides,
  };
  const sealed = sealCanonicalObservation('pcgs_auction_results', observation, { acquiredAt: now, signingKey });
  return { ...observation, provenanceToken: sealed.provenanceToken };
}

describe('server-owned analysis market evidence normalization', () => {
  it('keeps an explicit completed-sale status and price-basis contract for every valuation-capable adapter', () => {
    const expectedSources = ['sold_comps', '130point', 'the_card_api', 'cardsight_ai', 'lelands', 'pristine_auction', 'collect_auction', 'sirius_sports_auctions', 'pcgs_auction_results', 'weiss'];
    for (const sourceId of expectedSources) {
      const contract = COMPLETED_SALE_SOURCE_DEFAULTS[sourceId];
      expect(contract, `${sourceId} must declare a completed-sale contract`).toBeDefined();
      expect(['sold', 'realized', 'closed']).toContain(contract?.priceBasis);
      expect(contract?.statusBasis.length).toBeGreaterThan(10);
    }
  });

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

  it.each([undefined, null, '', ' \t ', NaN, Infinity, -Infinity, 'not a price', 'Infinity'])
  ('preserves unavailable unverified raw prices as null (%s) with invalid-price blockers', (price) => {
    const input = { ...sale(), provenanceToken: null, price };
    const result = normalizeSale(input);
    expect(result.sale.price).toBeNull();
    expect(result.valuationEligible).toBe(false);
    expect(result.sale.evidenceDisposition).toBe('context_only');
    expect(result.sale.analysisIntake?.sourceAdmission.blockerCodes).toContain('INVALID_PRICE');
    expect(result.reasons).toContain('missing or non-positive realized price');
    const profile = buildMarketProfile(target, [result.sale], null, now);
    expect(profile.comparables[0].price).toBeNull();
    expect(profile.authoritativeSaleCount).toBe(0);
    expect(profile.primaryValue).toBeNull();
  });

  it('preserves a signed canonical null price rather than normalizing it into a public zero', () => {
    const result = normalizeSale(sale({ price: null }));
    expect(result.sale.price).toBeNull();
    expect(result.valuationEligible).toBe(false);
    expect(result.sale.analysisIntake?.sourceAdmission.blockerCodes).toContain('INVALID_PRICE');
    const profile = buildMarketProfile(target, [result.sale], null, now, null, null, { historicalPromptSales: [result.sale] });
    expect(profile.comparables[0].price).toBeNull();
    expect(profile.primaryValue).toBeNull();
    expect(profile.finalUseReport!.priceGroups.find((group) => group.population === 'historical_prompt')?.prices).toEqual([null]);
  });

  it('does not describe an unavailable high-value comparable amount as a zero-priced sale', () => {
    const result = normalizeAnalysisMarketSale(sale({ price: null }), now, {
      signingKey, target: { ...target, statedTradeValue: 50000 },
    });
    expect(result.sale.price).toBeNull();
    expect(result.valuationEligible).toBe(false);
    expect(result.sale.analysisIntake?.sourceAdmission.blockerCodes).toContain('INVALID_PRICE');
    expect(result.reasons.join(' ')).toContain('sold comp price is unavailable');
    expect(result.reasons.join(' ')).not.toContain('sold comp $0');
  });

  it('keeps actual unverified zero and negative observed prices distinct from absence without admitting them', () => {
    for (const price of [0, -10]) {
      // Canonical sealing already rejects nonpositive amounts. Test the local
      // raw diagnostic boundary without altering signing or provenance policy.
      const result = normalizeSale({ ...sale(), provenanceToken: null, price });
      expect(result.sale.price).toBe(price);
      expect(result.valuationEligible).toBe(false);
      expect(result.sale.analysisIntake?.sourceAdmission.blockerCodes).toContain('INVALID_PRICE');
      const profile = buildMarketProfile(target, [result.sale], null, now);
      expect(profile.comparables[0].price).toBe(price);
      expect(profile.authoritativeSaleCount).toBe(0);
      expect(profile.primaryValue).toBeNull();
    }
  });

  it('keeps signed finite positive prices eligible and does not include missing or zero rows in financial statistics', () => {
    const inputs = [sale({ saleId: 'valid-number', price: 1000 }), sale({ saleId: 'valid-numeric-string', price: '1200' }),
      sale({ saleId: 'canonical-null', price: null }), { ...sale({ saleId: 'raw-zero' }), price: 0, provenanceToken: null },
      { ...sale({ saleId: 'raw-blank' }), price: ' ', provenanceToken: null }];
    const normalized = normalizeSales(inputs);
    expect(normalized.map((record) => record.price)).toEqual([1000, 1200, null, 0, null]);
    expect(normalized.filter((record) => record.evidenceDisposition === 'valuation_eligible')).toHaveLength(2);
    const profile = buildMarketProfile(target, normalized, null, now);
    expect(profile.authoritativeSaleCount).toBe(2);
    expect(profile.currentWindowSaleCount).toBe(2);
    expect(profile.saleMedianValue).toBe(1100);
    expect(profile.minimum).toBe(1000);
    expect(profile.maximum).toBe(1200);
    expect(profile.primaryValue).toBeNull();
    expect(profile.comparables).toHaveLength(5);
  });

  it('admits a signed PCGS eBay final price while preserving the PCGS adapter provenance', () => {
    const result = normalizeAnalysisMarketSale(pcgsSale(), now, { signingKey, category: 'coins' });
    expect(result.valuationEligible).toBe(true);
    expect(result.sale).toMatchObject({
      sourceId: 'pcgs_auction_results',
      sourceAdapter: 'pcgs_auction_results',
      originMarketplace: 'ebay',
      priceBasis: 'sold',
      evidenceDisposition: 'valuation_eligible',
    });
  });

  it('admits a signed recent PCGS exact-grade auction amount as reported while recording the premium caveat', () => {
    const result = normalizeAnalysisMarketSale(pcgsSale({
      saleId: 'pcgs-auction-fixture',
      marketplace: 'Heritage Auctions',
      originMarketplace: 'Heritage Auctions',
      priceBasis: 'realized',
      buyerPremium: 'unknown',
    }), now, { signingKey, category: 'coins' });
    expect(result.valuationEligible).toBe(true);
    expect(result.sale.evidenceDisposition).toBe('valuation_eligible');
    expect(result.reasons.join(' ')).toContain('buyer-premium treatment is not disclosed');
  });

  it('keeps a signed PCGS exact-grade auction older than one year as historical trend only', () => {
    const result = normalizeAnalysisMarketSale(pcgsSale({
      saleId: 'pcgs-historical-auction-fixture',
      marketplace: 'Heritage Auctions',
      originMarketplace: 'Heritage Auctions',
      priceBasis: 'realized',
      buyerPremium: 'unknown',
      date: '2025-09-27T00:00:00.000Z',
    }), now, { signingKey, category: 'coins', allowIlliquidExtension: true });
    expect(result.valuationEligible).toBe(false);
    expect(result.sale).toMatchObject({ recency: 'historical', evidenceDisposition: 'context_only' });
    expect(result.reasons.join(' ')).toContain('older than one year');
  });

  it('does not allow a server-classified PCGS grade mismatch to become a current-value candidate', () => {
    const result = normalizeAnalysisMarketSale(pcgsSale({
      saleId: 'pcgs-grade-mismatch-fixture',
      marketplace: 'Heritage Auctions',
      originMarketplace: 'Heritage Auctions',
      priceBasis: 'realized',
      buyerPremium: 'unknown',
      evidenceDisposition: 'context_only',
      evidenceReasons: ['PCGS row grade MS64 does not match the certified target grade MS65.'],
    }), now, { signingKey, category: 'coins' });
    expect(result.valuationEligible).toBe(false);
    expect(result.sale.evidenceDisposition).toBe('context_only');
    expect(result.reasons.join(' ')).toContain('grade MS64 does not match');
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
