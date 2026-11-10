import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeAnalysisMarketSale, COMPLETED_SALE_SOURCE_DEFAULTS } from './testAiMarketEvidence';
import { buildMarketProfile } from './testAiComparableEngine';
import { sealCanonicalObservation } from './testAiCanonicalObservation';

const now = new Date('2026-11-10T15:00:00Z');
const signingKey = 'mercari-status-policy-synthetic-signing-key-not-a-service-secret';
const target = { title: 'Metroid NES 1987 CIB', category: 'video_games', itemType: 'game',
  itemDetails: JSON.stringify({ gameTitle: 'Metroid', platform: 'NES', releaseYear: '1987', completeInBox: 'Yes', sealed: 'No', isGraded: 'No' }) };
const context = { title: target.title, price: 42, currency: 'USD', sourceId: 'mercari_sold_comps',
  sourceLabel: 'Sold-Comps (Mercari)', originMarketplace: 'Mercari', marketplace: 'Mercari',
  saleId: 'mercari:policy', url: 'https://www.mercari.com/us/item/policy/', saleStatus: 'unknown' as const,
  priceBasis: 'unknown' as const, date: null, visualReviewStatus: 'match' as const,
  evidenceDisposition: 'context_only' as const, visualRequirement: 'required' as const };

describe('Mercari status is not completed-price authority', () => {
  it('registers only the exact Mercari sold=true reported-price convention; flags still confer no authority', () => {
    expect(COMPLETED_SALE_SOURCE_DEFAULTS.mercari_sold_comps).toStrictEqual({ priceBasis: 'sold',
      statusBasis: 'Sold-Comps Mercari sold=true reported sold price' });
  });

  it.each([
    {},
    { saleStatus: 'completed', priceBasis: 'sold', date: '2026-11-08T12:00:00Z', evidenceDisposition: 'valuation_eligible' },
    { listingStatus: 'sold', requestedMode: 'sold', confirmed: true, verified: true, valuationEligible: true,
      mercariObservation: { version: 1, listingStatus: 'sold', requestedMode: 'sold', observedStatus: 'sold' } },
    { provenanceToken: 'forged-mercari-token', identityApproval: { approved: true }, metadataMatchScore: 100 },
  ])('rejects browser-supplied stronger-looking context %j without erasing the audit', (overrides) => {
    const result = normalizeAnalysisMarketSale({ ...context, ...overrides } as any, now, { signingKey, category: 'video_games' });
    expect(result.valuationEligible).toBe(false);
    const profile = buildMarketProfile(target, [result.sale], now);
    expect(profile.primaryValue).toBeNull();
    expect(profile.currentWindowSaleCount).toBe(0);
  });

  it('cannot borrow eBay observation authority for substituted Mercari facts', () => {
    const sealed = sealCanonicalObservation('sold_comps', { ...context, sourceId: 'sold_comps',
      sourceLabel: 'eBay Sold-Comps', originMarketplace: 'eBay', marketplace: 'eBay',
      saleId: 'ebay-policy', url: 'https://www.ebay.com/itm/ebay-policy', saleStatus: 'completed',
      priceBasis: 'sold', date: '2026-11-08T12:00:00Z' }, { acquiredAt: now, signingKey });
    const result = normalizeAnalysisMarketSale({ ...context, provenanceToken: sealed.provenanceToken }, now, { signingKey, category: 'video_games' });
    expect(result.valuationEligible).toBe(false);
  });

  it('uses owned requested mode and one finalizer across every Mercari route return', () => {
    const source = readFileSync(resolve(__dirname, 'testAIRouter.ts'), 'utf8');
    const start = source.indexOf('  getMercariSoldCompsData: protectedProcedure');
    const end = source.indexOf('  getTcgplayerSoldCompsData: protectedProcedure', start);
    const route = source.slice(start, end);
    expect(route).toContain("requestedMode: 'sold'");
    expect(route.match(/return finalizeMercariContextResult\(/g)).toHaveLength(5);
    expect(route).not.toContain('Mercari completed-sale endpoint');
    expect(route).not.toContain("saleStatus: 'completed'");
    expect(route).not.toContain('Only completed visual matches can enter analyzer valuation');
  });
});

describe('normal repository registration remains explicit', () => {
  it('discovers new .test.ts files and the two approved DOM suites without activating dormant TSX globs', () => {
    const config = readFileSync(resolve(__dirname, '../vitest.config.ts'), 'utf8');
    expect(config).toContain('server/**/*.test.ts'); expect(config).toContain('shared/**/*.test.ts');
    expect(config).toContain('server/testAiSafeImage.test.tsx'); expect(config).toContain('server/testAiUiStability.test.tsx');
    expect(config).not.toContain('server/**/*.test.tsx');
    for (const name of ['TestAiSafeImage.tsx', 'TestAiCandidateStatus.tsx']) {
      const source = readFileSync(resolve(__dirname, '../client/src/components', name), 'utf8');
      expect(source).toMatch(/import\s+React\b/);
    }
  });
});
