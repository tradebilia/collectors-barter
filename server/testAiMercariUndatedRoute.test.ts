import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { buildMercariAnalysisSales } from '../shared/testAiMercariTransport';
import { normalizeTestAiEvidence } from '../shared/testAiEvidenceNormalization';
import { canonicalizeIdentityApprovalTarget, canonicalizeIdentityApprovalCandidateFields } from '../shared/testAiIdentityApprovalTarget';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SourceRunOutcomeSummary } from '../client/src/components/test-ai/SourceRunOutcomeSummary';
import { buildItemAuditSubmission } from '../client/src/components/test-ai/TestAiItemAudit';
const mocks = vi.hoisted(() => ({ llm: vi.fn(), fetch: vi.fn() }));
vi.mock('./_core/env', () => ({ ENV: { jwtSecret: 'mercari-date-exception-synthetic-signing-key', appId: 'synthetic-test' } }));
vi.mock('./_core/llm', () => ({ invokeLLM: mocks.llm }));
import { testAIRouter } from './testAIRouter';
import { normalizeAnalysisMarketSales } from './testAiMarketEvidence';
import { verifyCanonicalObservation } from './testAiCanonicalObservation';
import { isCompletedSaleCandidate, scoreComparable, buildMarketProfile } from './testAiComparableEngine';
const TARGET_IMAGE = 'https://example.test/mercari/target.jpg';
const MOVIE = { title: 'Batman (1989) LaserDisc LD', category: 'movies', itemType: 'individual_movie',
  itemDetails: JSON.stringify({ movieTitle: 'Batman', format: 'LaserDisc', releaseYear: '1989', isGraded: 'No', sealed: 'No' }) };
const GAME = { title: 'The Legend of Zelda NES WATA 7.5 Sealed A++', category: 'video_games', itemType: 'game', grade: '7.5', certificationCompany: 'WATA',
  itemDetails: JSON.stringify({ gameTitle: 'The Legend of Zelda', platform: 'NES', releaseYear: '1987', isGraded: 'Yes', gradingCompany: 'WATA', grade: '7.5', completeInBox: 'Yes', sealed: 'Yes' }) };
let rows: Record<string, any>[];
let verdict = 'match';
let imageEvidence: Record<string, boolean>;
let requests: URL[];
const caller = () => testAIRouter.createCaller({ user: { id: 1, role: 'admin' } as any, req: { headers: {} } as any, res: {} as any });
function providerRow(target = MOVIE, overrides: Record<string, unknown> = {}) {
  return { itemId: 'm54069072197', title: target.title, price: '11.00', currency: 'USD', status: 'sold', marketplace: 'mercari',
    url: 'https://www.mercari.com/us/item/m54069072197/', imageUrl: 'https://example.test/mercari/candidate.jpg', ...overrides };
}
function input(target = MOVIE) { return { ...target, imageUrl: TARGET_IMAGE, approvalTarget: target, approvalTargetImageReference: TARGET_IMAGE }; }
beforeEach(() => {
  rows = [providerRow()]; verdict = 'match'; requests = [];
  imageEvidence = { rawOrLooseVisible: true, slabVisible: false, identityMatches: true, artworkMatches: true };
  vi.clearAllMocks(); vi.stubEnv('SOLD_COMPS_API_KEY', 'synthetic-provider-key-not-real'); vi.stubEnv('SOLID_COMPS_API_KEY', '');
  mocks.fetch.mockImplementation(async (url: RequestInfo | URL) => {
    const parsed = new URL(String(url)); expect(parsed.origin).toBe('https://api.sold-comps.com'); expect(parsed.pathname).toBe('/v1/mercari');
    expect(parsed.searchParams.get('sold')).toBe('true'); expect(parsed.searchParams.get('sortOrder')).toBe('newest'); requests.push(parsed);
    return new Response(JSON.stringify({ items: rows, scrapedAt: new Date().toISOString(), hasNextPage: false }));
  });
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.llm.mockImplementation(async (request: any) => {
    const text = request.messages[0].content.filter((part: any) => part.type === 'text').map((part: any) => part.text).join('\n');
    const index = text.match(/CANDIDATE (\d+): title=/)?.[1]; expect(index).toBeDefined();
    return { choices: [{ message: { content: JSON.stringify({ reviews: [{ candidateIndex: Number(index), verdict, confidence: 'high',
      rationale: verdict === 'match' ? 'The deciding images confirm the same product, format and grading state.' : 'The deciding artwork is a different product.',
      visualEvidence: imageEvidence, visualDifferences: [] }] }) } }] };
  });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('Mercari undated sold=true actual route admission', () => {
  it.each(['individual_movie', 'box_set', 'poster'])('keeps Movies %s type binding stable and explicit collectible types intact', itemType => {
    const target = { ...MOVIE, itemType };
    const original = canonicalizeIdentityApprovalTarget(target);
    const fields = original.fields;
    const replay = canonicalizeIdentityApprovalTarget({ title: fields.title, category: fields.category, itemType: fields.itemType,
      grade: fields.grade, certificationCompany: fields.certificationCompany, condition: fields.hardCondition, itemDetails: fields });
    expect(replay.serialized).toBe(original.serialized); expect(replay.conflicts).toEqual([]);
    expect(fields.itemType).toBe(itemType.replace('_', ' ')); expect(fields).not.toHaveProperty('collectibleType');
    const explicit = canonicalizeIdentityApprovalTarget({ ...target, itemDetails: { movieTitle: 'Batman', collectibleType: 'Screen Used Prop' } });
    expect(explicit.fields.collectibleType).toBe('screen used prop');
    expect(explicit.serialized).not.toBe(original.serialized);
  });
  it('retains reported USD11 and an Unknown sale date through actual provider, visual review, signing, A/B handoff and final engine pool', async () => {
    const result: any = await caller().getMercariSoldCompsData(input());
    const row = result.audit.ledger.find((item: any) => item.saleId === 'mercari:m54069072197');
    expect(row).toMatchObject({ price: 11, currency: 'USD', date: null, endedAt: null, recency: 'undated', saleDatePolicy: 'mercari_undated_sold_v1',
      valuationEligible: true, evidenceDisposition: 'valuation_eligible', visualReviewStatus: 'match' });
    expect(row.provenanceToken).toBeTruthy(); expect(row.identityApproval).toBeTruthy();
    expect(result.audit.valuationEligible).toBe(1); expect(result.statusCounts.completedSaleCount).toBe(1);
    expect(row.mercariObservation.responseScrapedAt.present).toBe(true); expect(row.date).not.toBe(row.mercariObservation.responseScrapedAt.value);
    const left = buildMercariAnalysisSales(result, true); const right = buildMercariAnalysisSales(result, true);
    expect(left).toStrictEqual(right); expect(left).toHaveLength(1); expect(left[0].provenanceToken).toBe(row.provenanceToken);
    const fields = row.identityApproval.targetFields;
    expect(canonicalizeIdentityApprovalTarget({ title: fields.title, category: fields.category, itemType: fields.itemType,
      grade: fields.grade, certificationCompany: fields.certificationCompany, condition: fields.hardCondition, itemDetails: fields }).fields).toEqual(fields);
    expect(canonicalizeIdentityApprovalCandidateFields(fields.category, row.identityApproval.candidateIdentityFields).fields).toEqual(row.identityApproval.candidateIdentityFields);
    const verified = verifyCanonicalObservation(left[0]);
    expect(verified.verified, !verified.verified ? verified.reasons.join('; ') : 'verified').toBe(true);
    expect(verified.sale.date).toBeNull();
    const target = { ...MOVIE, approvalTargetImageReference: TARGET_IMAGE };
    const normalized = normalizeAnalysisMarketSales(left, new Date(), { target, category: MOVIE.category });
    expect(normalized[0].evidenceDisposition).toBe('valuation_eligible'); expect(normalized[0].date).toBeNull();
    expect(normalized[0].analysisIntake?.sourceAdmission.blockerCodes).not.toContain('INVALID_DATE');
    expect(isCompletedSaleCandidate(normalized[0], Date.now())).toBe(true); expect(scoreComparable(target, normalized[0]).accepted).toBe(true);
    const profile = buildMarketProfile(target, normalized);
    expect(profile.selectionDiagnostics.selectedForValuation).toBe(1);
    expect(profile.comparables.find(comp => comp.accepted)?.price).toBe(11);
    expect(profile.comparables.find(comp => comp.accepted)?.date).toBeNull();
    expect(requests.length).toBeGreaterThan(0);
  });
  it('uses one effective inventory target and shared image fallback across review and final approval', async () => {
    const searchFields = { ...MOVIE, title: 'Batman search alias', itemDetails: JSON.stringify({ movieTitle: 'Batman search alias', format: 'LaserDisc', releaseYear: '1989' }) };
    const result: any = await caller().getMercariSoldCompsData({ ...searchFields, imageUrl: TARGET_IMAGE,
      approvalTarget: MOVIE, approvalTargetImageReference: TARGET_IMAGE });
    const row = result.audit.ledger[0];
    expect(row.valuationEligible).toBe(true);
    expect(row.identityApproval).toBeTruthy();
    expect(row.identityApproval.targetFields.title).toBe(canonicalizeIdentityApprovalTarget(MOVIE).fields.title);
    expect(row.identityApproval.targetImageReferenceFingerprint).toBeTruthy();
  });
  it('keeps a valid itemWebUrl provider alias through visual approval and valuation sealing', async () => {
    rows = [providerRow(MOVIE, { url: undefined, itemWebUrl: 'https://www.mercari.com/us/item/m54069072197/' })];
    const result: any = await caller().getMercariSoldCompsData(input());
    const row = result.audit.ledger[0];
    expect(row).toMatchObject({ itemUrl: 'https://www.mercari.com/us/item/m54069072197/', valuationEligible: true, evidenceDisposition: 'valuation_eligible' });
    expect(row.provenanceToken).toBeTruthy(); expect(row.identityApproval).toBeTruthy();
  });
  it('seals a real route-produced match after an earlier visual failure while retaining the diagnostic', async () => {
    mocks.llm.mockRejectedValueOnce(new Error('synthetic provider timeout'));
    const recovered: any = await caller().getMercariSoldCompsData(input());
    const row = recovered.audit.ledger[0];
    expect(row.valuationEligible).toBe(true);
    expect(row.provenanceToken).toBeTruthy();
    expect(row.identityApproval).toBeTruthy();
    expect(recovered.visualFilter?.status).toBe('applied');
    expect(row.visualExecution.attempts.some((attempt: any) => attempt.outcome === 'error' && attempt.failureCode === 'provider_request_failed')).toBe(true);
    expect(row.visualExecution.attempts.some((attempt: any) => attempt.outcome === 'usable_review')).toBe(true);
  });
  it('runs final Item A audit with the signed undated comp and no Item B or additional provider/model calls', async () => {
    const source: any = await caller().getMercariSoldCompsData(input());
    const fetchCount = mocks.fetch.mock.calls.length, modelCount = mocks.llm.mock.calls.length;
    const intake = buildItemAuditSubmission([{ id: 'mercari_sold_comps', label: 'Mercari Sold', kind: 'market_completed', packet: source }], 'actual-item-a-test');
    const result = await caller().auditItemValuation({ item: { ...MOVIE, approvalTargetImageReference: TARGET_IMAGE },
      sales: intake.submitted });
    expect(result.side).toBe('item_a'); expect(result.snapshot.profile.selectionDiagnostics.selectedForValuation).toBe(1);
    const comp = result.snapshot.profile.comparables[0];
    expect(comp.date).toBeNull(); expect(comp.price).toBe(11);
    expect(comp.valuationUse?.sourceAdmission.normalizationEligible).toBe(true);
    expect(comp.valuationUse?.sourceAdmission.blockerCodes).not.toContain('INVALID_DATE');
    expect(mocks.fetch).toHaveBeenCalledTimes(fetchCount); expect(mocks.llm).toHaveBeenCalledTimes(modelCount);
  });
  it('reports the missing ungraded deciding-evidence gate rather than blaming the Unknown Mercari date', async () => {
    imageEvidence = { identityMatches: true, artworkMatches: true, slabVisible: false };
    const source: any = await caller().getMercariSoldCompsData(input());
    const row = source.audit.ledger[0];
    expect(row.visualReviewStatus).toBe('match'); expect(row.valuationEligible).toBe(false);
    expect(row.mercariAdmissionBlockers.join('; ')).toContain('APPROVAL_UNGRADED_STATE_UNCONFIRMED');
    const result = await caller().auditItemValuation({ item: { ...MOVIE, approvalTargetImageReference: TARGET_IMAGE },
      sales: buildMercariAnalysisSales({ listings: [row], requestedMode: 'sold' }, true) });
    expect(result.snapshot.profile.comparables[0].valuationUse?.sourceAdmission.reasonDetails?.join('; ')).toContain('APPROVAL_UNGRADED_STATE_UNCONFIRMED');
  });
  it('keeps tampered image binding out of the Item A audit pricing pool', async () => {
    const source: any = await caller().getMercariSoldCompsData(input());
    const result = await caller().auditItemValuation({ item: { ...MOVIE, approvalTargetImageReference: 'https://example.test/wrong.jpg' },
      sales: buildMercariAnalysisSales(source, true) });
    expect(result.snapshot.profile.selectionDiagnostics.selectedForValuation).toBe(0);
    expect(result.snapshot.profile.comparables[0].valuationUse?.sourceAdmission.blockerCodes).toContain('REQUIRED_APPROVAL_MISSING');
  });
  it('counts qualified undated source details while leaving unsigned completion claims at zero', async () => {
    const result: any = await caller().getMercariSoldCompsData(input());
    const eligible = buildMercariAnalysisSales(result, true);
    const details = eligible.map((sale, index) => ({ ...sale, id: String(sale.saleId ?? index),
      title: String(sale.title), price: Number(sale.price), bucket: 'current_value' as const }));
    const source = { id: 'mercari_sold_comps', label: 'Mercari Sold', kind: 'market_completed' as const, status: 'success' as const,
      market: { requestedMode: 'sold' as const, retainedListingCount: 1, returnedRecordCount: 1, analyzerRecords: details,
        completedSaleCount: 1, analyzerSubmittedSaleCount: 1 } };
    const summary = normalizeTestAiEvidence(MOVIE, [source]);
    expect(summary.sources[0].role).toBe('valuation_candidate'); expect(summary.sourceDecisions?.[0].accepted).toBe(1);
    expect(summary.evidenceSufficiency.completedSaleCount).toBe(1); expect(summary.sourceDecisions?.[0].historicalTrend).toBe(0);
    const html = renderToStaticMarkup(createElement(SourceRunOutcomeSummary, { sourceDecisions: summary.sourceDecisions ?? [] }));
    expect(html).toContain('Mercari source-eligible sales: 1'); expect(html).toContain('Sale date: Unknown');
    expect(html).not.toContain('Mercari completed/admitted sales: 0');
    const unsigned = normalizeTestAiEvidence(MOVIE, [{ ...source, market: { ...source.market,
      analyzerRecords: details.map(({ provenanceToken: _token, identityApproval: _approval, ...detail }) => detail) } }]);
    expect(unsigned.evidenceSufficiency.completedSaleCount).toBe(0); expect(unsigned.sources[0].role).toBe('reference_context');
  });
  it('keeps contradictory active row labels diagnostic within the server-owned sold=true request', async () => {
    rows = [providerRow(MOVIE, { status: 'active' })];
    const result: any = await caller().getMercariSoldCompsData(input());
    expect(result.audit.ledger[0]).toMatchObject({ listingStatus: 'sold', valuationEligible: true, saleDatePolicy: 'mercari_undated_sold_v1' });
    expect(result.audit.ledger[0].mercariObservation.statusIssues).toContain('requested_mode_row_mismatch');
  });
  it('requires the unchanged deciding grade/raw evidence for a graded game', async () => {
    rows = [providerRow(GAME as typeof MOVIE)];
    imageEvidence = { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true, gradeMatches: true, rawOrLooseVisible: false, identityMatches: true, artworkMatches: true };
    const result: any = await caller().getMercariSoldCompsData(input(GAME as typeof MOVIE));
    expect(result.audit.ledger[0].identityApproval).toBeTruthy(); expect(result.audit.ledger[0].valuationEligible).toBe(true);
  });
  it.each(['mismatch', 'rough_match'])('does not grant the date exception for visual %s', async status => {
    verdict = status; imageEvidence.identityMatches = status !== 'mismatch';
    const result: any = await caller().getMercariSoldCompsData(input());
    expect(result.audit.ledger[0].valuationEligible).toBe(false); expect(result.audit.ledger[0].identityApproval).toBeUndefined();
    expect(result.audit.valuationEligible).toBe(0);
  });
  it.each([{ currency: 'CAD' }, { finalPrice: '99.00' }, { cancelled: true }, { soldAt: '2099-01-01T00:00:00Z' }, { soldDate: '2020-01-01' }])('does not relax other original economic constraints: %j', async extra => {
    rows = [providerRow(MOVIE, extra)]; const result: any = await caller().getMercariSoldCompsData(input());
    expect(result.audit.ledger[0].valuationEligible).toBe(false); expect(result.audit.ledger[0].identityApproval).toBeUndefined();
  });
  it('does not grant approval to a changed target-image binding', async () => {
    const result: any = await caller().getMercariSoldCompsData({ ...input(), approvalTargetImageReference: 'https://example.test/other-target.jpg' });
    expect(result.audit.ledger[0].valuationEligible).toBe(false); expect(result.audit.ledger[0].identityApproval).toBeUndefined();
  });
  it('retains a provider failure without granting identity or financial authority', async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ error: 'synthetic unavailable' }), { status: 503 }));
    const result: any = await caller().getMercariSoldCompsData(input());
    expect(result.audit.valuationEligible).toBe(0); expect(mocks.llm).not.toHaveBeenCalled();
  });
});
