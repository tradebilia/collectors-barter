import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('./_core/env', () => ({ ENV: { jwtSecret: 'offline-autograph-ebay-synthetic-key', appId: 'offline-autograph-ebay' } }));
const mocks = vi.hoisted(() => ({ llm: vi.fn() }));
vi.mock('./_core/llm', () => ({ invokeLLM: mocks.llm }));
import { testAIRouter } from './testAIRouter';
import { buildItemAuditSubmission } from '../client/src/components/test-ai/TestAiItemAudit';
import { buildSoldCompsAnalysisSales, buildApprovalTargetInput } from '../shared/testAiSoldCompsTransport';
import { reconcileCandidateFinalUse } from '../shared/testAiCandidateLedger';
import { candidateFinalDecision } from '../client/src/components/test-ai/candidateFinalDecision';
import { summarizeUsedValuationPrices } from '../client/src/components/test-ai/TestAiEvidenceReview';
import { verifyCanonicalObservation } from './testAiCanonicalObservation';
const NOW = new Date('2026-11-12T00:53:00Z');
const target = {
  title: 'Michael Jordan Signed Authentic Spalding Basketball UDA', category: 'autographs', itemType: 'signed_item',
  condition: 'near_mint', itemDetails: JSON.stringify({ signer: 'Michael Jordan', signedItemType: 'Basketball',
    autographCategory: 'Sports', authenticationIncluded: 'yes', authenticationCompany: 'UDA',
    customAuthenticationCompany: 'UDA', authenticationType: 'COA (Card)', certificateNumber: '14542115',
    inscriptionPresent: 'no', quantity: '1', shippingAvailable: 'yes' }),
};
// Actual provider keys only. Never supply valuationEligible, identityMatched,
// confirmed, completed, saleStatus, priceBasis, or a second date field.
const providerRow = (patch: Record<string, unknown> = {}) => ({
  itemId: '123456789012', title: 'Michael Jordan Signed Autographed Jordan Brand Basketball UDA Upper Deck COA',
  soldPrice: '3400', soldCurrency: 'USD', endedAt: '2026-08-20', listingType: 'sold',
  url: 'https://www.ebay.com/itm/123456789012', thumbnailUrl: 'https://i.ebayimg.com/images/g/example/s-l1600.jpg',
  buyingFormat: 'buyItNow', bestOfferAccepted: false, shippingPrice: '12.23', ...patch,
});
const caller = () => testAIRouter.createCaller({ user: { id: 1, role: 'admin' } as any,
  req: { headers: {} } as any, res: {} as any });
let rows: ReturnType<typeof providerRow>[] = [];
let requested: URL[] = [];
beforeEach(() => {
  rows = [providerRow()]; requested = []; mocks.llm.mockClear();
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(NOW);
  vi.stubEnv('SOLD_COMPS_API_KEY', 'offline-provider-fixture'); vi.stubEnv('SOLID_COMPS_API_KEY', '');
  vi.stubEnv('EBAY_PROD_CLIENT_ID', ''); vi.stubEnv('EBAY_PROD_CLIENT_SECRET', '');
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
    const url = new URL(String(input));
    if (url.origin !== 'https://api.sold-comps.com' || url.pathname !== '/v1/scrape') throw new Error('External calls forbidden');
    requested.push(url);
    return { ok: true, status: 200, json: async () => ({ items: rows }) };
  }));
});
afterEach(() => { expect(mocks.llm).not.toHaveBeenCalled(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });
async function run(item = target, mutate?: (sale: any) => void) {
  const source: any = await caller().getSoldCompsData(buildApprovalTargetInput(item));
  const intake = buildItemAuditSubmission([{ id: 'sold_comps', label: 'eBay Sold-Comps', kind: 'market_completed', packet: source }], 'jordan-regression');
  const direct = buildSoldCompsAnalysisSales(source, true);
  for (const sale of direct) expect(sale.provenanceToken).toBe(source.listings.find((row: any) => row.saleId === sale.saleId).provenanceToken);
  const submitted = JSON.parse(JSON.stringify(intake.submitted));
  if (mutate) submitted.forEach(mutate);
  const audit = await caller().auditItemValuation({ item: buildApprovalTargetInput(item), sales: submitted });
  const reconciled = reconcileCandidateFinalUse(intake.submitted, { side: 'item_a', requestRunId: 'jordan-regression',
    submitted: intake.submitted, finalRows: audit.snapshot.profile.comparables, analysisRunId: audit.analysisRunId });
  return { source, audit, reconciled, decision: reconciled[0] && candidateFinalDecision(reconciled[0]) };
}
describe('provider-shaped Autographs eBay admission through final audit and cards', () => {
  it('uses an ordinary sold record without an invented provider valuation flag', async () => {
    const { source, audit, reconciled, decision } = await run();
    const sale = source.listings[0];
    expect(sale.metadataMatchScore).toBe(90);
    expect(sale.sourceRelevance).toMatchObject({ valuationEligible: true, disposition: 'valuation_eligible' });
    expect(sale.sourceEconomics.finalContextOnly).toBe(false);
    expect(verifyCanonicalObservation(sale, { now: NOW }).sale.evidenceDisposition).toBe('valuation_eligible');
    for (const name of ['Authentication Company', 'Custom Authentication Company']) {
      const row = sale.metadataFieldComparisons.find((row: any) => row.targetField === name);
      expect(row?.titleDerivedStatus).toBe('match');
    }
    expect(source.audit.valuationEligible).toBe(1);
    expect(audit.snapshot.profile.selectionDiagnostics.selectedForValuation).toBe(1);
    expect(audit.snapshot.profile.primaryValue).toBe(3400);
    expect(audit.snapshot.profile.comparables[0].valuationUse.identityAdmission.basis).toBe('server_autograph_market_relevance');
    expect(decision?.label).toBe('USED IN VALUATION');
    expect(summarizeUsedValuationPrices(reconciled)).toMatchObject({ count: 1, low: 3400, high: 3400, average: 3400 });
  });
  it('uses the single recent Jordan auction under the approved one-sale minimum', async () => {
    rows = [providerRow({ title: 'Michael Jordan Signed Autograph Basketball Ball Upper Deck Certified 🔥',
      soldPrice: '4351', endedAt: '2026-10-18', buyingFormat: 'auction', bestOfferAccepted: false, bidCount: 35 })];
    const { audit, decision, reconciled } = await run();
    expect(audit.snapshot.profile.categoryEvidenceThresholds.minimumSelectedSales).toBe(1);
    expect(audit.snapshot.profile.valuationEligibleSaleCount).toBe(1);
    expect(audit.snapshot.profile.primaryValue).toBe(4351);
    expect(decision?.label).toBe('USED IN VALUATION');
    expect(summarizeUsedValuationPrices(reconciled)).toMatchObject({ count: 1, low: 4351, high: 4351, average: 4351 });
  });
  it('reports the actual price-spread hold instead of blaming the one-sale minimum', async () => {
    rows = [300, 4351].map((price, index) => providerRow({ itemId: String(123456789012 + index),
      url: `https://www.ebay.com/itm/${123456789012 + index}`, soldPrice: String(price), endedAt: '2026-10-18',
      title: 'Michael Jordan Signed Autograph Basketball Ball Upper Deck Certified', buyingFormat: 'auction' }));
    const { audit, decision } = await run();
    expect(audit.snapshot.profile.valuationEligibleSaleCount).toBe(2);
    expect(audit.snapshot.profile.primaryValue).toBeNull();
    expect(audit.snapshot.profile.comparables[0].valuationUse.use.supportReasonDetails?.[0]).toMatch(/prices.*above.*100%/i);
    expect(decision?.reason).toMatch(/prices.*above.*100%/i);
    expect(decision?.reason).not.toContain('One matching sale by itself is not enough');
  });
  it('requests accepted-offer hydration within the existing bounded Autographs query tiers', async () => {
    await run(); expect(requested.length).toBeGreaterThan(0); expect(requested.length).toBeLessThanOrEqual(3);
    for (const url of requested) expect(url.searchParams.get('hydrateBoa')).toBe('true');
  });
  it('uses the provider-hydrated accepted amount rather than the original asking price', async () => {
    rows = [providerRow({ bestOfferAccepted: true, boaHydrated: true, boaAcceptedPrice: '2800', boaAcceptedCurrency: 'USD', boaOriginalPrice: '3400', soldPrice: '2800' })];
    const { source, audit, decision } = await run();
    expect(source.listings[0]).toMatchObject({ price: 2800, boaOriginalPrice: '3400', boaAcceptedPrice: '2800' });
    expect(audit.snapshot.profile.selectionDiagnostics.selectedForValuation).toBe(1);
    expect(audit.snapshot.profile.primaryValue).toBe(2800); expect(decision?.label).toBe('USED IN VALUATION');
  });
  it.each([
    { bestOfferAccepted: true },
    { bestOfferAccepted: true, boaHydrated: false },
    { bestOfferAccepted: true, boaHydrated: true, boaAcceptedPrice: '2800', boaAcceptedCurrency: 'USD' },
    { bestOfferAccepted: true, boaHydrated: true, boaAcceptedPrice: '3400', boaAcceptedCurrency: 'CAD' },
  ])('retains unresolved accepted-offer amount without using asking price: %j', async patch => {
    rows = [providerRow(patch)];
    const { source, audit, decision } = await run();
    expect(source.listings[0].price).toBe(3400);
    expect(source.audit.sourceRelevanceEligible).toBe(1);
    expect(source.audit.valuationEligible).toBe(0); expect(source.marketContextOnly).toBe(true); expect(source.metrics).toBeNull();
    expect(audit.snapshot.profile.selectionDiagnostics.selectedForValuation).toBe(0);
    expect(audit.snapshot.profile.primaryValue).toBeNull();
    expect(decision?.reason).toMatch(/accepted.*amount|Best Offer/i); expect(decision?.reason).not.toContain('stopped is: Autographs / Signed Item passed');
  });
  it('cannot reopen a signed offer-price restriction by editing browser diagnostics', async () => {
    rows = [providerRow({ bestOfferAccepted: true })];
    const { audit } = await run(target, sale => Object.assign(sale, { valuationEligible: true, evidenceDisposition: 'valuation_eligible',
      evidenceReasons: [], sourceEconomics: null, bestOfferAccepted: false, boaHydrated: true, boaAcceptedPrice: '3400', boaAcceptedCurrency: 'USD' }));
    expect(audit.snapshot.profile.selectionDiagnostics.selectedForValuation).toBe(0);
    expect(audit.snapshot.profile.primaryValue).toBeNull();
  });
  it.each([
    { title: 'LeBron James Signed Basketball UDA Upper Deck COA' },
    { title: 'Michael Jordan Signed Poster Basketball UDA Upper Deck COA' },
    { title: 'Michael Jordan facsimile signed Basketball UDA Upper Deck COA' },
    { title: 'Michael Jordan Signed Basketball Steiner COA' },
    { title: 'Michael Jordan Signed Basketball UDA Upper Deck COA lot of 2' },
    { soldCurrency: 'CAD' }, { endedAt: '2099-01-01' }, { endedAt: null },
  ])('preserves the independent identity/currency/date exclusion: %j', async patch => {
    rows = [providerRow(patch)]; const { audit } = await run();
    expect(audit.snapshot.profile.selectionDiagnostics.selectedForValuation).toBe(0);
    expect(audit.snapshot.profile.primaryValue).toBeNull();
  });
  it('recomputes server eligibility even if a provider injects a misleading approval flag', async () => {
    rows = [providerRow({ title: 'Joe Smith signed Football', valuationEligible: true })];
    const { audit } = await run(); expect(audit.snapshot.profile.selectionDiagnostics.selectedForValuation).toBe(0);
  });
  it('does not admit a certified candidate against an explicitly unauthenticated target', async () => {
    const item = { ...target, itemDetails: JSON.stringify({ ...JSON.parse(target.itemDetails), authenticationIncluded: 'no' }) };
    const { audit } = await run(item);
    expect(audit.snapshot.profile.selectionDiagnostics.selectedForValuation).toBe(0);
    expect(audit.snapshot.profile.primaryValue).toBeNull();
  });
  it('preserves price-tail exclusions after issuing the server eligibility flag', async () => {
    rows = [3000, 3100, 3200, 3300, 100000].map((price, index) => providerRow({
      itemId: String(123456789012 + index), url: `https://www.ebay.com/itm/${123456789012 + index}`, soldPrice: String(price),
    }));
    const { source, audit } = await run();
    const tail = source.listings.find((row: any) => row.priceTailExcludedFromMetrics);
    expect(tail).toMatchObject({ price: 100000, evidenceDisposition: 'context_only' });
    expect(source.audit.valuationEligible).toBe(4); expect(source.metrics.max).toBe(3300);
    const finalTail = audit.snapshot.profile.comparables.find((row: any) => row.price === 100000);
    expect(finalTail?.valuationUse.use.primaryMarketSales).toBe(false);
  });
  it('retains 169 source candidates but submits only the unchanged 120-row audit cap', async () => {
    rows = Array.from({ length: 169 }, (_, index) => providerRow({
      itemId: String(123456789012 + index), url: `https://www.ebay.com/itm/${123456789012 + index}`,
    }));
    const source: any = await caller().getSoldCompsData(buildApprovalTargetInput(target));
    const intake = buildItemAuditSubmission([{ id: 'sold_comps', label: 'eBay Sold-Comps', kind: 'market_completed', packet: source }], 'cap-regression');
    expect(source.listings).toHaveLength(169); expect(intake.submitted).toHaveLength(120); expect(intake.omitted).toBe(49);
    expect(intake.submitted[0].metadataMatchRank).toBe(1);
  });
});
