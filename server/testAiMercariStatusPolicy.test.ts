import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeAnalysisMarketSale, COMPLETED_SALE_SOURCE_DEFAULTS } from './testAiMarketEvidence';
import { buildMarketProfile } from './testAiComparableEngine';
import { sealCanonicalObservation } from './testAiCanonicalObservation';
import { finalizeMercariContextResult } from './testAIRouter';
import { buildVisualTargetMetadata } from './testAiVisualSourceFilter';

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

  it('reprojects stale Movie awards at the final transport boundary', () => {
    const movieTarget = buildVisualTargetMetadata({ title: 'Conan CGC 8.0 VHS Tape', category: 'movies', itemType: 'individual_movie',
      itemDetails: JSON.stringify({ title: 'Conan CGC 8.0 VHS Tape', format: 'VHS', isGraded: 'Yes', certificationCompany: 'CGC', grade: '8' }) });
    const row = { saleId: 'mercari:stale-movie', title: 'Conan CGC 8.0 A VHS Tape', price: 117, currency: 'USD',
      metadataMatchScore: 30, metadataScoreAwards: [
        { field: 'format', source: 'title', awardedPoints: 20 },
        { field: 'gradingCompany', source: 'title', awardedPoints: 5 },
        { field: 'grade', source: 'title', awardedPoints: 5 },
      ], metadataFieldComparisons: [], visualReviewStatus: 'not_reviewed' };
    const original = { saleId: row.saleId, title: row.title, price: row.price, currency: row.currency, itemUrl: 'https://www.mercari.com/us/item/stale-movie/' };
    const result = finalizeMercariContextResult({ listings: [row], audit: { ledger: [row] } }, [original] as any,
      { input: { title: movieTarget, category: 'movies', itemType: 'individual_movie' } as any, targetMetadata: movieTarget });
    const returned = result.listings[0];
    expect(returned.metadataMatchScore).toBe(55);
    expect(returned.metadataScoreAwards).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'movieTitle', awardedPoints: 25 })]));
    expect(returned.metadataFieldComparisons.find((entry: any) => entry.targetField === 'Movie title')?.rankingContribution?.awardedPoints).toBe(25);
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
