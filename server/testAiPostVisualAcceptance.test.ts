import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('./_core/env', () => ({ ENV: { jwtSecret: 'post-visual-synthetic-key', appId: 'synthetic' } }));
vi.mock('./_core/llm', () => ({ invokeLLM: vi.fn(() => { throw new Error('This regression must not call a visual provider'); }) }));
import { lookupMercariSoldComps } from './soldCompsAdditionalMarketData';
import { finalizeMercariContextResult, sealSoldCompsFinalVisualListings, testAIRouter } from './testAIRouter';
import { buildVisualTargetMetadata } from './testAiVisualSourceFilter';
import { buildItemAuditSubmission } from '../client/src/components/test-ai/TestAiItemAudit';
import { candidateFinalDecision } from '../client/src/components/test-ai/candidateFinalDecision';
import { normalizeAnalysisMarketSales } from './testAiMarketEvidence';
import { buildMarketProfile, type MarketSale } from './testAiComparableEngine';
import { FINAL_VISUAL_ACCEPTANCE_POLICY } from './testAiCanonicalObservation';

const image = 'https://example.test/u2/target.jpg';
const target = { title: 'U2 Rattle and Hum Vinyl LP Record Album Set 1st Pressing Island',
  category: 'music', itemType: 'vinyl_record', condition: 'excellent',
  itemDetails: JSON.stringify({ artist: 'U2', releaseTitle: 'Rattle and Hum', format: 'vinyl_record', recordLabel: 'Island Records', edition: 'First Edition', isGraded: 'No' }),
  approvalTargetImageReference: image };
const metadata = buildVisualTargetMetadata(target);
const evidence = { identityMatches: true }; // Do not require a second raw/grade/format verdict after acceptance.
const visualAudit = { imageCount: 1, initialVerdict: 'match' as const, initialConfidence: 'high' as const,
  initialRationale: 'The images match.', initialEvidence: evidence, finalEvidence: evidence,
  retryStatus: 'not_needed' as const, finalPass: 'initial' as const };
const caller = () => testAIRouter.createCaller({ user: { id: 1, role: 'admin' } as any, req: { headers: {} } as any, res: {} as any });
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

async function mercari(title: string, price: string, overrides: Record<string, unknown> = {}) {
  mocks.fetch.mockImplementation(async () => new Response(JSON.stringify({ items: [{ title, price, currency: 'USD', marketplace: 'mercari', status: 'sold',
    imageUrl: 'https://example.test/u2/candidate.jpg', ...overrides }], hasNextPage: false })));
  vi.stubGlobal('fetch', mocks.fetch);
  const provider = await lookupMercariSoldComps(target, mocks.fetch, { apiKey: 'synthetic-not-real' });
  expect(provider.listings).toHaveLength(1);
  const original = provider.listings[0];
  const row = { ...original, visualReviewStatus: 'match', visualAudit, visualEvidence: evidence,
    metadataMatchScore: 50, visualReviewRationale: 'The images match.',
    // Stale parser declarations are diagnostics, not a second admission verdict.
    soldCompsMetadata: { artist: 'U2 (UK)', format: 'Vinyl Record', recordLabel: 'Island', edition: 'Unknown' } };
  return finalizeMercariContextResult({ listings: [row], visualFilter: { listings: [row], contextListings: [] }, audit: { ledger: [row] } },
    [original], { input: target, effectiveTarget: target, targetMetadata: metadata,
      targetImageReference: image, approvalImageReference: image });
}

describe('visual acceptance is the final identity decision', () => {
  it.each([['U2 Rattle and Hum Vinyl Record', '14.25'], ['U2 - Rattle And Hum 2xLp Vinyl 1988', '21.79']])
  ('uses the accepted Mercari %s in actual Item A valuation without provider ID, URL or sale date', async (title, price) => {
    const source = await mercari(title, price);
    const row = source.audit.ledger[0];
    expect(row.valuationEligible, JSON.stringify(row.approvalFailure)).toBe(true);
    expect(row.identityApproval?.policyVersion).toBe(FINAL_VISUAL_ACCEPTANCE_POLICY);
    expect(row.saleId).toMatch(/^server-row:[a-f0-9]{32}$/);
    const intake = buildItemAuditSubmission([{ id: 'mercari_sold_comps', label: 'Mercari Sold', kind: 'market_completed', packet: source }], 'u2-post-visual');
    const result = await caller().auditItemValuation({ item: target, sales: JSON.parse(JSON.stringify(intake.submitted)) });
    const comp = result.snapshot.profile.comparables[0];
    expect(result.snapshot.profile.primaryValue).toBe(Math.round(Number(price)));
    expect(comp.price).toBe(Number(price));
    expect(comp.valuationUse?.use.code).toBe('CURRENT_SALES_PRIMARY');
    expect(comp.valuationUse?.sourceAdmission.blockerCodes).toEqual([]);
    expect(comp.valuationUse?.identityAdmission.blockerCodes).toEqual([]);
    expect(candidateFinalDecision({ ...row, valuationUse: comp.valuationUse }).label).toBe('USED IN VALUATION');
  });

  it('does not let a stale artist/format/edition parser override a completed image match', async () => {
    const source = await mercari('U2 Rattle and Hum Vinyl Record', '14.25');
    const row = source.audit.ledger[0];
    const intake = buildItemAuditSubmission([{ id: 'mercari_sold_comps', label: 'Mercari Sold', kind: 'market_completed', packet: source }]);
    intake.submitted[0].normalizedStructuredMetadata = { artist: 'Wrong parser artist', format: 'Cassette', edition: 'Second Pressing' };
    const result = await caller().auditItemValuation({ item: target, sales: intake.submitted });
    expect(result.snapshot.profile.primaryValue).toBe(14);
    expect(result.snapshot.profile.comparables[0].price).toBe(14.25);
    expect(row.provenanceToken).toBeTruthy();
  });

  it.each([{ lotQuantity: 2, saleForm: 'lot' }, { currency: 'CAD' }, { cancelled: true }])
  ('retains explicit lot and original economic safeguards: %j', async overrides => {
    const source = await mercari('U2 Rattle and Hum Vinyl Record', '14.25', overrides);
    const intake = buildItemAuditSubmission([{ id: 'mercari_sold_comps', label: 'Mercari Sold', kind: 'market_completed', packet: source }]);
    const result = await caller().auditItemValuation({ item: target, sales: intake.submitted });
    expect(result.snapshot.profile.primaryValue).toBeNull();
  });

  it('keeps missing signed provenance and changed target images out of valuation', async () => {
    const source = await mercari('U2 Rattle and Hum Vinyl Record', '14.25');
    const intake = buildItemAuditSubmission([{ id: 'mercari_sold_comps', label: 'Mercari Sold', kind: 'market_completed', packet: source }]);
    for (const [item, sales] of [
      [target, intake.submitted.map(row => ({ ...row, provenanceToken: null }))],
      [{ ...target, approvalTargetImageReference: 'https://example.test/different.jpg' }, intake.submitted],
    ] as const) {
      const result = await caller().auditItemValuation({ item, sales: [...sales] });
      expect(result.snapshot.profile.primaryValue).toBeNull();
    }
  });

  it('admits an eBay final image match without rechecking metadata or grade fields', () => {
    const now = new Date();
    const sale = { title: 'U2 Rattle and Hum Vinyl Record', price: 14.25, currency: 'USD', date: now.toISOString(),
      saleId: 'u2-ebay', url: 'https://www.ebay.com/itm/u2-ebay', sourceId: 'sold_comps', originMarketplace: 'ebay',
      saleStatus: 'completed', priceBasis: 'sold', visualRequirement: 'required', visualReviewStatus: 'match',
      evidenceDisposition: 'valuation_eligible', visualEvidence: evidence, visualAudit, evidenceReasons: [],
      normalizedStructuredMetadata: { artist: 'Wrong parsed artist', format: 'Cassette' } } as MarketSale;
    const sealed = sealSoldCompsFinalVisualListings([sale], { target, reviewedTarget: target, targetMetadata: metadata,
      targetImageReference: image, expectedImageReference: image, acquiredAt: now, query: target.title, signingKey: 'post-visual-synthetic-key' });
    expect(sealed[0].identityApproval?.policyVersion).toBe(FINAL_VISUAL_ACCEPTANCE_POLICY);
    const normalized = normalizeAnalysisMarketSales(JSON.parse(JSON.stringify(sealed)), now, { target, signingKey: 'post-visual-synthetic-key' });
    const profile = buildMarketProfile(target, normalized, null, now);
    expect(profile.primaryValue).toBe(14);
    expect(profile.comparables[0].price).toBe(14.25);
    expect(profile.comparables[0].valuationUse?.use.code).toBe('CURRENT_SALES_PRIMARY');
  });
});
