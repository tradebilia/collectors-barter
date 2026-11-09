import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComparableTarget, MarketSale, MarketProfile } from './testAiComparableEngine';
import type { IdentityApprovalV1, CanonicalObservationProvenance } from './testAiCanonicalObservation';
import type { MetadataFieldComparison, VisualEvidence, VisualSourceReview } from './testAiVisualSourceFilter';
import type { SoldCompsTransportListing } from '../shared/testAiSoldCompsTransport';
import type { RetrievalAttempt, RetrievalRejectionCode } from '../shared/testAiRetrievalAttempt';

// Run ONLY in the reviewed external Stage 3 harness. Its BLOCKED_MODULES are
// throwing virtual dependencies, not actual provider/DB/news implementations.
// No canonical, normalizer, scorer, snapshot, target or transport module is mocked.
const boundaries = vi.hoisted(() => ({
  fetch: vi.fn(), visual: vi.fn(), narrative: vi.fn(), denied: [] as string[],
}));
vi.mock('./_core/env', () => ({ ENV: {
  jwtSecret: 'stage3-synthetic-actual-route-key-not-a-service-credential',
  appId: 'stage3-synthetic-actual-route-app',
} }));
vi.mock('./_core/llm', () => ({
  invokeLLM: (request: { response_format?: { json_schema?: { name?: string } } }) => {
    // Only the known text-only analyzer narrative is configured. An unexpected
    // image scan, field completion, or other LLM request remains a hard denial.
    if (request.response_format?.json_schema?.name !== 'test_ai_evidence_bound_narrative') {
      boundaries.denied.push('unconfigured LLM request');
      throw new Error('Unconfigured LLM call forbidden in actual-route fixtures');
    }
    return boundaries.narrative(request);
  },
}));
vi.mock('./testAiVisualSourceFilter', async () => {
  const actual = await vi.importActual<typeof import('./testAiVisualSourceFilter')>('./testAiVisualSourceFilter');
  return { ...actual, filterVisualSourceCandidates: boundaries.visual };
});

import { testAIRouter, buildSoldCompsQueryCandidates } from './testAIRouter';
import { buildMarketplaceSearchDefinition } from '../shared/marketplaceSearchDefinition';
import { applyVisualSourceReviews, conservativeGradedVisualReviews, filterVisualSourceCandidates } from './testAiVisualSourceFilter';
import { getVerifiedIdentityApproval, sealCanonicalObservation, verifyCanonicalObservation } from './testAiCanonicalObservation';
import { scoreComparable } from './testAiComparableEngine';
import { buildDeterministicNarrativeFallback } from './testAiResponse';
import {
  buildApprovalTargetImageInput, buildSoldCompsAnalysisSales, buildSoldCompsApprovalInput,
} from '../shared/testAiSoldCompsTransport';

const NOW = new Date('2026-11-09T02:00:00.000Z');
const API_KEY = 'stage3-synthetic-sold-comps-http-key-not-a-service-credential';
const PRIMARY = 'https://example.test/stage3/target-primary.jpg';
const CHANGED_PRIMARY = 'https://example.test/stage3/changed-primary.jpg';
const GRADED: VisualEvidence = {
  slabVisible: true, gradingLabelVisible: true, graderVisible: true,
  numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false,
  identityMatches: true, artworkMatches: true,
};
const KOBE: ComparableTarget = {
  title: '1996 Topps Kobe Bryant #138 PSA 10', category: 'sports_cards',
  itemType: 'single_card', grade: '10', certificationCompany: 'PSA',
  itemDetails: JSON.stringify({ year: '1996', manufacturer: 'Topps', player: 'Kobe Bryant', cardNumber: '138' }),
};
const ZELDA: ComparableTarget = {
  title: 'The Legend of Zelda NES PSA 7.50', category: 'video_games',
  itemType: 'game', grade: '7.50', certificationCompany: 'PSA',
  itemDetails: JSON.stringify({ gameTitle: 'The Legend of Zelda', platform: 'NES', releaseYear: '1987', completeInBox: 'Yes', sealed: 'No' }),
};
type ProviderRow = Record<string, unknown> & {
  title: string; saleId: string; id: string; soldPrice: string; soldCurrency: string | null;
  endedAt: string | null; url: string | null;
};
type RouteRow = Omit<MarketSale, 'identityApproval' | 'provenance'> & SoldCompsTransportListing & {
  identityApproval?: IdentityApprovalV1; provenance?: CanonicalObservationProvenance | null;
  visualEvidence?: VisualEvidence; visualAudit?: VisualSourceReview['visualAudit'];
  visualDifferences?: VisualSourceReview['visualDifferences'];
  metadataMatchScore?: number; metadataMatchRank?: number; metadataMatchReasons?: string[];
  metadataFieldComparisons?: MetadataFieldComparison[]; soldCompsMetadata?: Record<string, string>;
};
type SourceResult = {
  query: string; listings: RouteRow[]; error: string | null;
  metrics: { count: number; median: number } | null;
  retrievalCoverage: RetrievalAttempt[]; attemptIssues: RetrievalAttempt[]; partial: boolean;
  audit?: { rawReceived: number; valuationEligible: number; ledger: RouteRow[];
    retrievalCoverage: RetrievalAttempt[] };
};
const reviewedById = new Map<string, VisualSourceReview>();
let providerRows: ProviderRow[] = [];
let reverseVisualRows = false;
let contextIds = new Set<string>();

const wire = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const caller = (role = 'admin') => testAIRouter.createCaller({
  user: { id: 1, role } as any, req: { headers: {} } as any, res: {} as any,
});
function review(id: string, patch: Partial<VisualSourceReview> = {}): VisualSourceReview {
  const rationale = `Synthetic deciding image for ${id}: identity, holder, grader and numeric grade are independently confirmed.`;
  return {
    candidateIndex: 0, verdict: 'match', confidence: 'high', rationale, visualEvidence: { ...GRADED },
    visualAudit: { imageCount: 1, initialVerdict: 'match', initialConfidence: 'high',
      initialRationale: rationale, decidingRationale: rationale, initialEvidence: { ...GRADED }, finalEvidence: { ...GRADED },
      retryStatus: 'not_needed', finalPass: 'initial', adjudicationStatus: 'confirmed' },
    ...patch,
  };
}
function rows(title: string, count = 7, patch: Record<string, unknown> = {}): ProviderRow[] {
  // Distinct transaction dates avoid triggering documented possible-duplicate
  // handling. Equal titles are deliberate; they must not identify review rows.
  return Array.from({ length: count }, (_, index) => ({
    title, saleId: `stage3-route-${index}`, id: `stage3-route-${index}`,
    soldPrice: String(100 + index), soldCurrency: 'USD',
    endedAt: new Date(NOW.getTime() - (index + 1) * 86_400_000).toISOString(),
    url: `https://www.ebay.com/itm/stage3-route-${index}`,
    imageUrl: `https://example.test/stage3/candidate-${index}.jpg`,
    thumbnailUrl: `https://example.test/stage3/candidate-${index}.jpg`,
    saleForm: 'single_card', lotQuantity: 1,
    buyerPremium: 'included', shipping: 'excluded', tax: 'unknown',
    itemSpecifics: { Player: 'Kobe Bryant' }, ...patch,
  } as ProviderRow));
}
function finalItem(target: ComparableTarget, primaryPhotoUrl: string | undefined = PRIMARY) {
  return { ...target, ...buildApprovalTargetImageInput({ primaryPhotoUrl }, false) };
}
function sourceInput(reviewed = KOBE, effective = reviewed) {
  return buildSoldCompsApprovalInput({ ...reviewed, imageUrl: PRIMARY }, effective);
}
async function acquire(input = sourceInput()): Promise<SourceResult> {
  const result = await caller().getSoldCompsData(input);
  expect(result.error).toBeNull();
  expect(Array.isArray(result.listings)).toBe(true);
  // The real endpoint also has distinct Original Art / Signed Item branches.
  // This bounded fixture requests only its ordinary completed-sale branch.
  return result as unknown as SourceResult;
}
async function analyze(
  leftRows: RouteRow[], rightRows = leftRows,
  leftTarget = finalItem(KOBE), rightTarget = leftTarget,
) {
  const response = await caller().analyzeTrade(wire({
    leftItem: leftTarget, rightItem: rightTarget,
    useImageAnalyzer: false, useVisualFieldCompletion: false,
    leftHistoricalTrendSales: leftRows, rightHistoricalTrendSales: rightRows,
    marketNews: { itemA: [], itemB: [], categorySummaries: [] },
  }));
  expect(response).toHaveProperty('leftMarketProfile');
  if (!('leftMarketProfile' in response)) throw new Error('Ordinary analyzer result missing');
  expect(response.imageAnalyzerUsed).toBe(false);
  expect(response.visualFieldCompletionUsed).toBe(false);
  expect(response.visionDiagnostics).toMatchObject({ requested: false, imagesSubmitted: 0, responseKind: 'not_requested' });
  expect(response.leftVisualReview).toBeNull();
  expect(response.rightVisualReview).toBeNull();
  expect(response.leftAnalysisSnapshot.profile).toEqual(response.leftMarketProfile);
  expect(response.rightAnalysisSnapshot.profile).toEqual(response.rightMarketProfile);
  const fallback = buildDeterministicNarrativeFallback({
    leftTitle: leftTarget.title, rightTitle: rightTarget.title,
    leftEvidenceState: response.leftMarketProfile.evidenceState,
    rightEvidenceState: response.rightMarketProfile.evidenceState,
  });
  for (const [field, value] of Object.entries(fallback)) expect(response[field as keyof typeof response]).toEqual(value);
  expect(boundaries.narrative).toHaveBeenCalledTimes(1);
  return response;
}
function expectHeld(profile: MarketProfile) {
  expect(profile.authoritativeSaleCount).toBe(0);
  expect(profile.currentWindowSaleCount).toBe(0);
  expect(profile.valuationBasis).toBe('insufficient_evidence');
  expect(profile.primaryValue).toBeNull();
  expect(profile.marketRange.supported).toBe(false);
  expect(profile.comparables.every((sale) => !sale.accepted)).toBe(true);
}

beforeEach(() => {
  vi.clearAllMocks();
  boundaries.denied.length = 0;
  providerRows = [];
  reviewedById.clear();
  reverseVisualRows = false;
  contextIds = new Set();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  // Literal synthetic configuration only; never read ENV/config/credential files.
  // Source inspection established getSoldCompsApiKey's exact two aliases and
  // private resolveSigningKey(override ?? ENV.jwtSecret); no env-key guesswork.
  vi.stubEnv('SOLD_COMPS_API_KEY', API_KEY);
  vi.stubEnv('SOLID_COMPS_API_KEY', '');
  vi.stubEnv('EBAY_PROD_CLIENT_ID', '');
  vi.stubEnv('EBAY_PROD_CLIENT_SECRET', '');
  boundaries.fetch.mockImplementation(async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.origin !== 'https://api.sold-comps.com' || url.pathname !== '/v1/scrape'
      || !url.searchParams.get('keyword') || url.searchParams.get('count') !== '100'
      || url.searchParams.get('sortOrder') !== 'endedRecently' || url.searchParams.get('ebaySite') !== 'ebay.com'
      || (init?.method && init.method !== 'GET')
      || new Headers(init?.headers).get('Authorization') !== `Bearer ${API_KEY}`) {
      boundaries.denied.push(`unconfigured HTTP request: ${String(input)}`);
      throw new Error('Only configured synthetic Sold-Comps HTTP is permitted');
    }
    return { ok: true, status: 200, json: async () => ({ items: wire(providerRows) }),
      text: async () => 'Configured synthetic Sold-Comps response' };
  });
  vi.stubGlobal('fetch', boundaries.fetch);
  boundaries.narrative.mockRejectedValue(new Error('Configured synthetic narrative outage; no real model invocation'));
  boundaries.visual.mockImplementation(async (args: Parameters<typeof filterVisualSourceCandidates>[0]) => {
    if (args.sourceRole !== 'ebay' || args.sourceLabel !== 'eBay Sold-Comps' || args.targetImageUrl !== PRIMARY) {
      boundaries.denied.push('unconfigured visual source request');
      throw new Error('Only configured ordinary Sold-Comps visual fixture is permitted');
    }
    // This is only the external visual-result boundary. Existing Stage 1
    // conservative reconciliation and row application still execute unchanged.
    const candidates = args.listings.map((candidate) => ({ ...candidate, visualRequirement: 'required' }));
    const initialReviews = candidates.map((candidate, candidateIndex) => ({
      ...wire(reviewedById.get(String(candidate.saleId)) ?? review(String(candidate.saleId))), candidateIndex,
    }));
    const reviews = conservativeGradedVisualReviews(initialReviews, candidates, args.targetMetadata);
    const applied = applyVisualSourceReviews(candidates, reviews, candidates.length, { targetMetadata: args.targetMetadata });
    const contexts = applied.listings.filter((candidate) => contextIds.has(String(candidate.saleId)));
    const visible = applied.listings.filter((candidate) => !contextIds.has(String(candidate.saleId)));
    return { ...applied, listings: reverseVisualRows ? [...visible].reverse() : visible,
      contextListings: contexts, reviews, status: 'applied', preVisualExcludedCount: contexts.length,
      note: 'Explicit synthetic final-row image fixture; no provider/model/image request.' };
  });
});
afterEach(() => {
  try { expect(boundaries.denied).toEqual([]); }
  finally { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); }
});

describe('Stage 3 ACTUAL getSoldCompsData -> shared A/B transport -> ACTUAL analyzeTrade', () => {
  it.each(['1996 Kobe Bryant #138 PSA 10', '1996 Kobe Bryant PSA 10', 'Kobe Bryant'])
  ('retains genuine graded Kobe approval despite title omissions on BOTH actual analyzer sides: %s', async (title) => {
    providerRows = rows(title);
    const source = await acquire();
    expect(source.listings).toHaveLength(7);
    expect(source.metrics).toMatchObject({ count: 7, median: 103 });
    expect(source.audit).toMatchObject({ rawReceived: 7, valuationEligible: 7 });
    expect(source.audit!.retrievalCoverage.every((coverage) => coverage.status === 'success')).toBe(true);
    expect(boundaries.fetch).toHaveBeenCalled();
    expect(boundaries.visual).toHaveBeenCalledTimes(1);
    expect(boundaries.visual.mock.calls[0][0]).toMatchObject({ sourceRole: 'ebay', targetImageUrl: PRIMARY });
    const sourceById = new Map(source.listings.map((sale) => [sale.saleId, sale]));
    for (const provider of providerRows) {
      const sale = sourceById.get(provider.saleId)!;
      expect(sale).toMatchObject({ title, saleId: provider.saleId, sourceId: 'sold_comps', sourceLabel: 'eBay Sold-Comps',
        price: Number(provider.soldPrice), currency: 'USD', date: provider.endedAt, endedAt: provider.endedAt,
        url: provider.url, itemUrl: provider.url, saleStatus: 'completed', priceBasis: 'sold',
        completedStatusBasis: 'Sold-Comps completed-sale endpoint', visualRequirement: 'required',
        visualReviewStatus: 'match', evidenceDisposition: 'valuation_eligible', evidenceReasons: [],
        saleForm: 'single_card', lotQuantity: 1, buyerPremium: 'included', shipping: 'excluded', tax: 'unknown',
        visualEvidence: GRADED, soldCompsMetadata: { player: 'Kobe Bryant' } });
      expect(sale.visualAudit).toMatchObject({ finalPass: 'initial', initialVerdict: 'match', finalEvidence: GRADED });
      expect(sale.identityApproval).toMatchObject({ version: 'identity-approval-v1', origin: 'server_final_visual',
        verdict: 'match', adapterId: 'sold_comps', originMarketplace: 'ebay', sourceRecordId: provider.saleId,
        decidingEvidence: GRADED, decidingRationale: review(provider.saleId).rationale });
      expect(sale.provenance).toMatchObject({ version: '2.9.0', adapterId: 'sold_comps', acquiredAt: NOW.toISOString() });
      expect(sale.provenanceToken).toEqual(expect.any(String));
      expect(sale.metadataMatchScore).toEqual(expect.any(Number));
      expect(sale.metadataMatchRank).toEqual(expect.any(Number));
      expect(sale.metadataMatchReasons).toEqual(expect.any(Array));
      expect(sale.metadataFieldComparisons!.length).toBeGreaterThan(0);
      for (const comparison of sale.metadataFieldComparisons!) {
        expect(comparison).toEqual(expect.objectContaining({ targetField: expect.any(String), targetValue: expect.any(String),
          candidateField: expect.any(String), candidateValue: expect.any(String), status: expect.any(String),
          titleDerivedField: expect.any(String), titleDerivedValue: expect.any(String), titleDerivedStatus: expect.any(String) }));
      }
      const verified = verifyCanonicalObservation(wire(sale), { now: NOW });
      expect(verified.verified).toBe(true);
      expect(verified.sale).toMatchObject({ sourceAdapter: 'sold_comps', originMarketplace: 'ebay',
        observationId: sale.provenance!.payloadHash, canonicalTransactionId: sale.identityApproval!.canonicalTransactionId });
      expect(getVerifiedIdentityApproval(verified.sale, finalItem(KOBE))).toEqual(sale.identityApproval);
      // Transported proof is display data, not a serializable verified brand.
      expect(getVerifiedIdentityApproval(wire(verified.sale), finalItem(KOBE))).toBeNull();
    }
    const itemA = buildSoldCompsAnalysisSales(source, true);
    const itemB = buildSoldCompsAnalysisSales(source, true);
    expect(itemA).toStrictEqual(itemB);
    for (const [index, sale] of source.listings.entries()) {
      expect(itemA[index].provenanceToken).toBe(sale.provenanceToken);
      expect(itemB[index].provenanceToken).toBe(sale.provenanceToken);
      for (const [field, value] of Object.entries(sale)) {
        expect(itemA[index][field]).toStrictEqual(value);
        expect(itemB[index][field]).toStrictEqual(value);
      }
    }
    expect(finalItem(KOBE)).toMatchObject({ imageUrl: undefined, approvalTargetImageReference: PRIMARY });
    const result = await analyze(itemA, itemB);
    for (const profile of [result.leftMarketProfile, result.rightMarketProfile]) {
      expect(profile).toMatchObject({ authoritativeSaleCount: 7, currentWindowSaleCount: 7,
        valuationBasis: 'market_sales', primaryValue: 103, minimum: 100, maximum: 106,
        currentWindowIndependentMarketplaceCount: 1, guideAnchorWeightPct: 0 });
      expect(profile.marketRange).toMatchObject({ supported: true, mid: 103 });
      expect(profile.comparables).toHaveLength(7);
      for (const comparable of profile.comparables) {
        expect(comparable).toMatchObject({ accepted: true, classification: 'exact', identityAdmissionBasis: 'server_final_visual',
          categoryIdentity: { status: 'direct_confirmed' }, priceBasis: 'sold', sourceAdapter: 'sold_comps' });
        expect(comparable.identityApproval).toEqual(sourceById.get(comparable.saleId)!.identityApproval);
        expect(comparable.titleCategoryIdentity!.unconfirmedFields).toContain('Manufacturer');
        expect(comparable.score).toBe(scoreComparable(KOBE, { title, price: comparable.price, visualReviewStatus: 'match' }).score);
      }
    }
    expect(result.leftAnalysisSnapshot.evidence.visualReview.match).toBe(7);
    expect(result.rightAnalysisSnapshot.evidence.visualReview.match).toBe(7);
    expect(result.tradeTerms.termsStatus).not.toBe('insufficient_evidence');
  });

  it.each([['PSA', 'WATA'], ['WATA', 'PSA']])
  ('uses exact 7.50=7.5 and Video Games %s/%s family on both routes without omitting Item B', async (reviewedCompany, finalCompany) => {
    const reviewed = { ...ZELDA, certificationCompany: reviewedCompany, title: `The Legend of Zelda NES ${reviewedCompany} 7.50` };
    const effective = { ...reviewed, grade: '7.5', certificationCompany: finalCompany,
      title: `The Legend of Zelda NES ${finalCompany} 7.5`,
      itemDetails: JSON.stringify({ sealed: 'No', completeInBox: 'Yes', releaseYear: '1987', platform: 'NES', gameTitle: 'The Legend of Zelda' }) };
    providerRows = rows(`1987 The Legend of Zelda NES ${finalCompany} 7.5 CIB`, 7,
      { saleForm: 'complete_in_box', itemSpecifics: { Platform: 'NES' } });
    const source = await acquire(sourceInput(reviewed, effective));
    expect(source.audit!.valuationEligible).toBe(7);
    expect(source.listings.every((sale) => Boolean(sale.identityApproval))).toBe(true);
    const result = await analyze(buildSoldCompsAnalysisSales(source, true), buildSoldCompsAnalysisSales(source, true), finalItem(effective));
    for (const profile of [result.leftMarketProfile, result.rightMarketProfile]) {
      expect(profile.authoritativeSaleCount).toBe(7);
      expect(profile.valuationBasis).toBe('market_sales');
      expect(profile.primaryValue).toBe(103);
      expect(profile.marketRange.supported).toBe(true);
      expect(profile.comparables.every((sale) => sale.accepted && sale.identityAdmissionBasis === 'server_final_visual')).toBe(true);
    }
  });

  it('keeps equal-title, reordered and compacted final rows associated with their own deciding audit, not review-array index', async () => {
    providerRows = rows('1996 Kobe Bryant PSA 10', 3);
    const badId = providerRows[0].saleId;
    const bad = review(badId, { verdict: 'mismatch', visualEvidence: { ...GRADED, identityMatches: false },
      visualAudit: { ...review(badId).visualAudit!, initialVerdict: 'mismatch',
        finalEvidence: { ...GRADED, identityMatches: false }, initialEvidence: { ...GRADED, identityMatches: false } } });
    reviewedById.set(badId, bad);
    contextIds.add(badId);
    reverseVisualRows = true;
    const source = await acquire();
    expect(source.listings.map((sale) => sale.saleId)).toEqual([providerRows[2].saleId, providerRows[1].saleId]);
    const visualOutput = await boundaries.visual.mock.results[0].value;
    expect(visualOutput.reviews[0].verdict).toBe('mismatch');
    expect(source.audit!.ledger.find((sale) => sale.saleId === badId)?.identityApproval).toBeUndefined();
    for (const sale of source.listings) {
      expect(sale.identityApproval).toMatchObject({ sourceRecordId: sale.saleId, decidingRationale: review(sale.saleId!).rationale });
      expect(sale.visualAudit!.decidingRationale).toBe(review(sale.saleId!).rationale);
    }
    const a = buildSoldCompsAnalysisSales(source, true);
    const b = buildSoldCompsAnalysisSales({ listings: [...source.listings].reverse() }, true);
    const result = await analyze(a, b);
    for (const profile of [result.leftMarketProfile, result.rightMarketProfile]) {
      expect(profile.authoritativeSaleCount).toBe(2);
      expect(profile.comparables.map((sale) => sale.saleId).sort()).toEqual([providerRows[1].saleId, providerRows[2].saleId].sort());
      for (const sale of profile.comparables) expect(sale.identityApproval).toMatchObject({ sourceRecordId: sale.saleId });
    }
  });

  it.each([['sports-card floor', KOBE, '1996 Kobe Bryant PSA 10', 5],
    ['Video Games floor', ZELDA, '1987 The Legend of Zelda NES WATA 7.5 CIB', 4]] as const)
  ('does not replace the single-marketplace support floor with source metrics or visual authority: %s', async (_label, target, title, count) => {
    providerRows = rows(title, count, target.category === 'video_games' ? { saleForm: 'complete_in_box', itemSpecifics: { Platform: 'NES' } } : {});
    const source = await acquire(sourceInput(target));
    expect(source.listings).toHaveLength(count);
    expect(source.metrics!.count).toBe(count);
    const result = await analyze(buildSoldCompsAnalysisSales(source, true), buildSoldCompsAnalysisSales(source, true), finalItem(target));
    for (const profile of [result.leftMarketProfile, result.rightMarketProfile]) {
      expect(profile.authoritativeSaleCount).toBe(count);
      expect(profile.currentWindowIndependentMarketplaceCount).toBe(1);
      expect(profile.categoryEvidenceThresholds.minimumSelectedSales).toBe(count);
      expect(profile.valuationBasis).toBe('insufficient_evidence');
      expect(profile.primaryValue).toBeNull();
    }
    expect(result.tradeTerms.suggestedCashRange).toBeNull();
  });

  it.each(['missing effective target', 'missing binding reference', 'changed binding reference', 'changed effective card', 'new material variant'])
  ('holds otherwise matching source rows when source binding is %s', async (scenario) => {
    providerRows = rows('1996 Kobe Bryant PSA 10', 1);
    const input = sourceInput();
    if (scenario === 'missing effective target') (input as { approvalTarget?: unknown }).approvalTarget = undefined;
    if (scenario === 'missing binding reference') input.approvalTargetImageReference = undefined;
    if (scenario === 'changed binding reference') input.approvalTargetImageReference = CHANGED_PRIMARY;
    if (scenario === 'changed effective card') input.approvalTarget.itemDetails = JSON.stringify({ year: '1996', manufacturer: 'Topps', player: 'Kobe Bryant', cardNumber: '139' });
    if (scenario === 'new material variant') input.approvalTarget.itemDetails = JSON.stringify({ ...JSON.parse(KOBE.itemDetails!), variant: 'Refractor' });
    const source = await acquire(input);
    expect(source.listings).toHaveLength(1);
    expect(source.listings[0]).toMatchObject({ visualReviewStatus: 'match', visualRequirement: 'required', evidenceDisposition: 'context_only' });
    expect(source.listings[0].identityApproval).toBeUndefined();
    expect(source.listings[0].evidenceReasons!.join(' ')).toContain('binding changed');
    expect(source.audit!.valuationEligible).toBe(0);
    expect(source.metrics).toBeNull();
    const result = await analyze(buildSoldCompsAnalysisSales(source, true));
    expectHeld(result.leftMarketProfile);
    expectHeld(result.rightMarketProfile);
  });

  it.each(['changed image', 'missing image', 'changed target'])
  ('rechecks the ACTUAL final target independently of image-analysis toggle: %s', async (scenario) => {
    providerRows = rows('1996 Kobe Bryant PSA 10', 1);
    const source = await acquire();
    expect(source.listings[0].identityApproval).toBeTruthy();
    const target = scenario === 'changed image' ? finalItem(KOBE, CHANGED_PRIMARY)
      : scenario === 'missing image' ? { ...finalItem(KOBE), approvalTargetImageReference: undefined }
      : finalItem({ ...KOBE, itemDetails: JSON.stringify({ ...JSON.parse(KOBE.itemDetails!), cardNumber: '139' }) });
    const result = await analyze(buildSoldCompsAnalysisSales(source, true), buildSoldCompsAnalysisSales(source, true), target);
    expectHeld(result.leftMarketProfile);
    expectHeld(result.rightMarketProfile);
    expect(result.leftMarketProfile.comparables[0].evidenceReasons!.join(' ')).toContain('no valid server-final');
  });

  it.each(['slabVisible', 'gradingLabelVisible', 'graderVisible', 'numericGradeVisible', 'gradeMatches', 'rawOrLooseVisible'] as const)
  ('requires the deciding pass to supply its OWN %s fact; a matching title cannot supply it', async (field) => {
    providerRows = rows(KOBE.title, 1);
    const incomplete = { ...GRADED };
    delete incomplete[field];
    const id = providerRows[0].saleId;
    reviewedById.set(id, review(id, { visualEvidence: incomplete,
      visualAudit: { ...review(id).visualAudit!, finalEvidence: incomplete } }));
    const source = await acquire();
    expect(source.listings[0].identityApproval).toBeUndefined();
    expect(source.audit!.valuationEligible).toBe(0);
    const result = await analyze(buildSoldCompsAnalysisSales(source, true));
    expectHeld(result.leftMarketProfile);
    expectHeld(result.rightMarketProfile);
  });

  it.each(['rough match', 'unavailable required adjudication', 'negative final retry', 'missing final retry evidence'])
  ('does not mint approval for %s despite positive initial evidence', async (scenario) => {
    providerRows = rows(KOBE.title, 1);
    const id = providerRows[0].saleId;
    const deciding = review(id);
    if (scenario === 'rough match') { deciding.verdict = 'rough_match'; deciding.visualAudit!.initialVerdict = 'rough_match'; }
    else if (scenario === 'unavailable required adjudication') deciding.visualAudit!.adjudicationStatus = 'unavailable';
    else deciding.visualAudit = { ...deciding.visualAudit!, finalPass: 'high_resolution_retry', retryStatus: 'performed',
      retryVerdict: scenario === 'negative final retry' ? 'unreadable' : 'match', retryConfidence: 'high',
      finalEvidence: scenario === 'missing final retry evidence' ? undefined : { ...GRADED, numericGradeVisible: false } };
    reviewedById.set(id, deciding);
    const source = await acquire();
    expect(source.listings[0].identityApproval).toBeUndefined();
    expect(source.audit!.valuationEligible).toBe(0);
    const result = await analyze(buildSoldCompsAnalysisSales(source, true));
    expectHeld(result.leftMarketProfile);
  });

  it('retains the successful final retry evidence rather than copying initial-negative observations', async () => {
    providerRows = rows('1996 Kobe Bryant PSA 10', 1);
    const id = providerRows[0].saleId;
    const initial = { ...GRADED, identityMatches: false, gradeMatches: false };
    reviewedById.set(id, review(id, { visualAudit: { ...review(id).visualAudit!, finalPass: 'high_resolution_retry',
      retryStatus: 'performed', initialVerdict: 'mismatch', initialEvidence: initial,
      retryVerdict: 'match', retryConfidence: 'high', retryRationale: review(id).rationale, finalEvidence: { ...GRADED } } }));
    const source = await acquire();
    expect(source.listings[0].visualAudit!.initialEvidence).toEqual(initial);
    expect(source.listings[0].identityApproval).toMatchObject({ decidingPass: 'high_resolution_retry', decidingEvidence: GRADED,
      requiredAdjudication: true, adjudicationCompleted: true });
    const result = await analyze(buildSoldCompsAnalysisSales(source, true));
    expect(result.leftMarketProfile.authoritativeSaleCount).toBe(1);
    expect(result.leftMarketProfile.comparables[0].identityAdmissionBasis).toBe('server_final_visual');
  });

  it.each([
    ['CAD currency', { soldCurrency: 'CAD' }], ['unknown currency', { soldCurrency: null, currency: null }],
    ['missing date', { endedAt: null }], ['invalid date', { endedAt: 'not-a-date' }],
    ['future date', { endedAt: '2027-01-01T00:00:00.000Z' }],
  ])('keeps %s out of source metrics and actual final valuation', async (_label, patch) => {
    providerRows = rows(KOBE.title, 1, patch);
    const source = await acquire();
    expect(source.listings).toHaveLength(1);
    expect(source.listings[0].identityApproval).toBeUndefined();
    expect(source.audit!.valuationEligible).toBe(0);
    expect(source.metrics).toBeNull();
    const result = await analyze(buildSoldCompsAnalysisSales(source, true));
    expectHeld(result.leftMarketProfile);
    expectHeld(result.rightMarketProfile);
  });

  it.each([
    ['zero price', { soldPrice: '0' }, 'invalid_price'],
    ['nonfinite price', { soldPrice: 'Infinity' }, 'invalid_price'],
    ['missing usable transaction', { saleId: '', id: '', url: null }, 'invalid_id'],
  ] as Array<[string, Record<string, unknown>, RetrievalRejectionCode]>)
  ('rejects %s at provider-minimal validation before images and supplies no actual final price', async (_label, patch, rejectionCode) => {
    providerRows = rows(KOBE.title, 1, patch);
    const definition = buildMarketplaceSearchDefinition(KOBE);
    const expectedQueries = buildSoldCompsQueryCandidates(definition.query, {
      preserveGrade: true, fallbackQueries: definition.fallbackQueries, prioritizeFallbackQueries: false,
    });
    // Do not use acquire(): its null-error assertion remains required for
    // minimally valid rows, including those later held by identity/economics.
    const source = await caller().getSoldCompsData(sourceInput()) as unknown as SourceResult;
    expect(source.error).toBe('Sold-Comps provider rows failed minimal validation');
    expect(source.partial).toBe(false);
    expect(source.listings).toEqual([]);
    expect(source.metrics).toBeNull();
    expect(source.audit).toMatchObject({ rawReceived: 0, ledger: [] });
    expect(source.retrievalCoverage).toEqual(source.audit!.retrievalCoverage);
    expect(source.retrievalCoverage.map((receipt) => receipt.query)).toEqual(expectedQueries);
    expect(source.retrievalCoverage.length).toBeGreaterThan(0);
    expect(source.attemptIssues).toEqual(source.retrievalCoverage);
    for (const [index, receipt] of source.retrievalCoverage.entries()) {
      expect(receipt).toMatchObject({ stage: 'search', attempt: index + 1, executed: true,
        status: 'error', outcome: 'row_rejection', httpStatus: 200,
        received: 1, accepted: 0, rejected: 1, normalized: 0, normalizationRejected: 0,
        rejectionCounts: { [rejectionCode]: 1 }, message: source.error });
      expect(receipt.rejectionCounts).toEqual({ [rejectionCode]: 1 });
    }
    expect(boundaries.fetch.mock.calls.map(([input]) => new URL(String(input)).searchParams.get('keyword'))).toEqual(expectedQueries);
    expect(boundaries.visual).not.toHaveBeenCalled();
    expect(boundaries.narrative).not.toHaveBeenCalled();
    const itemA = buildSoldCompsAnalysisSales(source, true);
    const itemB = buildSoldCompsAnalysisSales(source, true);
    expect(itemA).toEqual([]);
    expect(itemB).toEqual([]);
    const result = await analyze(itemA, itemB);
    for (const profile of [result.leftMarketProfile, result.rightMarketProfile]) {
      expectHeld(profile);
      expect(profile.comparables).toEqual([]);
      expect(profile.weightedValue).toBeNull();
      expect(profile.saleMedianValue).toBeNull();
    }
    expect(result.tradeTerms.suggestedCashRange).toBeNull();
    expect(boundaries.visual).not.toHaveBeenCalled();
  });

  it('keeps valid legacy 2.9.0 required-visual tokens source-only through actual analyzeTrade', async () => {
    providerRows = rows(KOBE.title, 1);
    const source = await acquire();
    const { identityApproval: _displayApproval, ...sourceFacts } = source.listings[0];
    // Actual generic signer intentionally cannot infer an approval from an old
    // match/status/audit. Exact pre-Stage-3 bytes are covered by the core suite.
    const legacy = { ...sourceFacts, ...sealCanonicalObservation('sold_comps', sourceFacts, { acquiredAt: NOW }) };
    const verification = verifyCanonicalObservation(legacy, { now: NOW });
    expect(verification.verified).toBe(true);
    expect(verification.sale.visualRequirement).toBe('required');
    expect(getVerifiedIdentityApproval(verification.sale, finalItem(KOBE))).toBeNull();
    const result = await analyze(buildSoldCompsAnalysisSales({ listings: [legacy] }, true));
    expectHeld(result.leftMarketProfile);
    expectHeld(result.rightMarketProfile);
    expect(result.leftMarketProfile.comparables[0].evidenceReasons!.join(' ')).toContain('no valid server-final');
  });

  it.each([
    ['explicit wrong card', { title: '1996 Topps Kobe Bryant #139 PSA 10' }],
    ['explicit wrong grade', { title: '1996 Topps Kobe Bryant #138 PSA 9' }],
    ['structured multi-item quantity', { lotQuantity: 3 }],
    ['structured lot form', { saleForm: 'lot' }],
  ])('preserves source exclusion/review and final held economics for %s', async (_label, patch) => {
    providerRows = rows(KOBE.title, 1, patch);
    const source = await acquire();
    expect(source.audit!.valuationEligible).toBe(0);
    expect(source.metrics).toBeNull();
    expect(source.audit!.ledger.length).toBeGreaterThan(0);
    expect(source.listings.every((sale) => !sale.identityApproval)).toBe(true);
    const result = await analyze(buildSoldCompsAnalysisSales(source, true));
    expectHeld(result.leftMarketProfile);
    expectHeld(result.rightMarketProfile);
  });

  it.each([
    ['outside Video Games family', 'video_games', 'VGA'],
    ['PSA/WATA outside Video Games', 'sports_cards', 'WATA'],
    ['outside sports-card grader', 'sports_cards', 'BGS'],
  ])('does not transport category-inappropriate grader equivalence: %s', async (_label, category, company) => {
    const target = category === 'video_games' ? ZELDA : KOBE;
    providerRows = rows(category === 'video_games'
      ? `1987 The Legend of Zelda NES ${company} 7.5 CIB`
      : `1996 Topps Kobe Bryant #138 ${company} 10`, 1,
      category === 'video_games' ? { saleForm: 'complete_in_box', itemSpecifics: { Platform: 'NES' } } : {});
    const source = await acquire(sourceInput(target));
    // A synthetic image result deliberately claims all grading facts. Final
    // title/identity-state hard contradictions must still block direct value,
    // whether issuance conservatively held it or returned approval metadata.
    expect(source.audit!.ledger.length).toBeGreaterThan(0);
    const result = await analyze(buildSoldCompsAnalysisSales(source, true), buildSoldCompsAnalysisSales(source, true), finalItem(target));
    expectHeld(result.leftMarketProfile);
    expectHeld(result.rightMarketProfile);
  });

  it.each([
    ['active asking record', { saleStatus: 'active' }],
    ['unknown completion', { saleStatus: 'unknown' }],
    ['unknown price basis', { priceBasis: 'unknown' }],
    ['realized price without premium', { priceBasis: 'realized', buyerPremium: 'unknown' }],
    ['restrictive disposition', { evidenceDisposition: 'omitted_by_cap' }],
  ] as const)('holds actual signed source-only %s through analyzeTrade without browser promotion', async (_label, patch) => {
    providerRows = rows(KOBE.title, 1);
    const source = await acquire();
    const { identityApproval: _approval, ...actualFacts } = source.listings[0];
    // Ordinary Sold-Comps always supplies completed/sold endpoint semantics.
    // These controls therefore sign source-only test facts with the actual
    // signer; they do not pretend that route emitted active/unknown economics.
    const changedFacts = { ...actualFacts, ...patch } as RouteRow;
    const sourceOnly = { ...changedFacts, ...sealCanonicalObservation('sold_comps', changedFacts, { acquiredAt: NOW }) };
    expect(verifyCanonicalObservation(sourceOnly, { now: NOW }).verified).toBe(true);
    const result = await analyze(buildSoldCompsAnalysisSales({ listings: [sourceOnly] }, true));
    expectHeld(result.leftMarketProfile);
    expectHeld(result.rightMarketProfile);
  });

  it('keeps duplicate transaction suppression independent of approval in both actual final snapshots', async () => {
    providerRows = rows('1996 Kobe Bryant PSA 10');
    const source = await acquire();
    const transported = buildSoldCompsAnalysisSales(source, true);
    const duplicated = [...transported, wire(transported[0])];
    const result = await analyze(duplicated, duplicated);
    for (const profile of [result.leftMarketProfile, result.rightMarketProfile]) {
      expect(profile.authoritativeSaleCount).toBe(7);
      expect(profile.duplicateSaleCount).toBe(1);
      expect(profile.primaryValue).toBe(103);
      expect(profile.comparables).toHaveLength(8);
      expect(profile.comparables.filter((sale) => sale.accepted)).toHaveLength(7);
      expect(profile.comparables.find((sale) => sale.duplicateOf)).toMatchObject({ accepted: false });
    }
  });

  it('withholds disabled Item B eBay rows rather than using cached proof or Item A rows', async () => {
    providerRows = rows('1996 Kobe Bryant PSA 10');
    const source = await acquire();
    expect(buildSoldCompsAnalysisSales({ listings: [] }, true)).toEqual([]);
    expect(buildSoldCompsAnalysisSales(undefined, true)).toEqual([]);
    const a = buildSoldCompsAnalysisSales(source, true);
    const b = buildSoldCompsAnalysisSales(source, false);
    expect(b).toEqual([]);
    const result = await analyze(a, b);
    expect(result.leftMarketProfile.authoritativeSaleCount).toBe(7);
    expectHeld(result.rightMarketProfile);
    expect(result.tradeTerms.suggestedCashRange).toBeNull();
  });

  it.each(['missing token', 'invalid signature'])('does not let copied browser approval/audit/status compensate for %s', async (scenario) => {
    providerRows = rows(KOBE.title, 1);
    const source = await acquire();
    const injected = wire(source.listings[0]);
    injected.provenanceToken = scenario === 'missing token' ? null : `${injected.provenanceToken}tampered`;
    Object.assign(injected, { verified: true, trusted: true, browserApproval: { verified: true },
      visualReviewStatus: 'match', visualRequirement: 'required', evidenceDisposition: 'valuation_eligible' });
    expect(injected.identityApproval).toBeTruthy();
    const result = await analyze(buildSoldCompsAnalysisSales({ listings: [injected] }, true));
    expectHeld(result.leftMarketProfile);
    expectHeld(result.rightMarketProfile);
    expect(result.leftMarketProfile.comparables[0].evidenceReasons!.join(' ')).toContain('server provenance');
  });

  it('reconstructs signed source economics and transaction instead of relabeling a replayed token as another row', async () => {
    providerRows = rows('1996 Kobe Bryant PSA 10', 1);
    const source = await acquire();
    const original = source.listings[0];
    const relabeled = { ...wire(original), price: 1_000_000, saleId: 'browser-other-transaction',
      url: 'https://example.test/browser-other-transaction', date: '2027-01-01', currency: 'CAD' };
    const result = await analyze(buildSoldCompsAnalysisSales({ listings: [relabeled] }, true));
    for (const profile of [result.leftMarketProfile, result.rightMarketProfile]) {
      expect(profile.authoritativeSaleCount).toBe(1);
      expect(profile.comparables[0]).toMatchObject({ saleId: original.saleId, price: original.price,
        currency: 'USD', date: original.date, canonicalTransactionId: original.identityApproval!.canonicalTransactionId });
      expect(profile.comparables[0].saleId).not.toBe(relabeled.saleId);
      expect(profile.comparables[0].identityApproval).toEqual(original.identityApproval);
    }
  });

  it('keeps administrator-only admission on both actual routes before any external boundary', async () => {
    await expect(caller('user').getSoldCompsData(sourceInput())).rejects.toThrow();
    await expect(caller('user').analyzeTrade({ leftItem: finalItem(KOBE), rightItem: finalItem(KOBE),
      useImageAnalyzer: false, useVisualFieldCompletion: false })).rejects.toThrow();
    expect(boundaries.fetch).not.toHaveBeenCalled();
    expect(boundaries.visual).not.toHaveBeenCalled();
    expect(boundaries.narrative).not.toHaveBeenCalled();
  });
});

describe('Stage 3 independent-review route counterexamples', () => {
  it('uses actual provider itemSpecifics BGS 9 rather than trusting a PSA 10 title', async () => {
    providerRows = rows('1996 Kobe Bryant PSA 10', 1, {
      itemSpecifics: [{ name: 'Grading Company', value: 'BGS' }, { name: 'Grade', value: '9' }],
    });
    const source = await acquire();
    expect(source.audit?.rawReceived).toBe(1);
    expect(source.listings.every((sale) => !sale.identityApproval)).toBe(true);
    const result = await analyze(buildSoldCompsAnalysisSales(source, true));
    expectHeld(result.leftMarketProfile);
    expectHeld(result.rightMarketProfile);
  });

  it('keeps an explicit Michael Jordan declaration distinct from missing Kobe title fields', async () => {
    providerRows = rows('1996 Topps Michael Jordan PSA 10', 1, { itemSpecifics: {} });
    const source = await acquire();
    expect(source.listings.every((sale) => !sale.identityApproval)).toBe(true);
    const result = await analyze(buildSoldCompsAnalysisSales(source, true));
    expectHeld(result.leftMarketProfile);
    expectHeld(result.rightMarketProfile);
  });

  it('accepts the real successful ordinary retry shape with no fabricated Coin/Disney adjudication flag', async () => {
    providerRows = rows('1996 Kobe Bryant PSA 10', 7);
    for (const row of providerRows) reviewedById.set(row.saleId, review(row.saleId, {
      visualAudit: { imageCount: 1, initialVerdict: 'mismatch', initialConfidence: 'high',
        initialRationale: 'The initial holder pixels are unclear.', initialEvidence: { identityMatches: true, slabVisible: false },
        retryStatus: 'performed', finalPass: 'high_resolution_retry', retryVerdict: 'match', retryConfidence: 'high',
        retryRationale: 'The high-resolution image confirms identity, holder, grader and numeric grade.',
        decidingRationale: 'The high-resolution image confirms identity, holder, grader and numeric grade.',
        finalEvidence: { ...GRADED }, adjudicationStatus: undefined },
    }));
    const source = await acquire();
    expect(source.listings.every((sale) => Boolean(sale.identityApproval))).toBe(true);
    const result = await analyze(buildSoldCompsAnalysisSales(source, true));
    expect(result.leftMarketProfile.authoritativeSaleCount).toBe(7);
    expect(result.rightMarketProfile.authoritativeSaleCount).toBe(7);
  });

  it('retains unchanged approval through verifier-returned mixed-case canonical URL normalization', async () => {
    providerRows = rows('1996 Kobe Bryant PSA 10', 1, { url: 'https://www.ebay.com/itm/Kobe-Bryant-PSA-10/123456789012' });
    const source = await acquire();
    expect(source.listings[0].identityApproval).toBeTruthy();
    const verification = verifyCanonicalObservation(source.listings[0], { signingKey: 'stage3-synthetic-actual-route-key-not-a-service-credential', now: NOW });
    expect(verification.verified).toBe(true);
    if (!verification.verified) throw new Error('Mixed-case fixture must verify');
    expect(getVerifiedIdentityApproval(verification.sale, finalItem(KOBE))).toBeTruthy();
    const result = await analyze(buildSoldCompsAnalysisSales(source, true));
    expect(result.leftMarketProfile.authoritativeSaleCount).toBe(1);
    expect(result.leftMarketProfile.comparables[0].identityAdmissionBasis).toBe('server_final_visual');
  });
});
