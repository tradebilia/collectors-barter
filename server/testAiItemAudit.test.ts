import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ llm: vi.fn(() => { throw new Error('No model may run in an Item A audit'); }) }));
vi.mock('./_core/env', () => ({ ENV: { jwtSecret: 'synthetic-item-a-audit-signing-key', appId: 'synthetic-test' } }));
vi.mock('./_core/llm', () => ({ invokeLLM: mocks.llm }));
import { testAIRouter } from './testAIRouter';
import { normalizeTestAiEvidence } from '../shared/testAiEvidenceNormalization';
import { stampCandidateDisplayIntake } from '../shared/testAiCandidateLedger';
import { auditItemValuation } from './testAiItemAudit';
const item = { title: 'Batman LaserDisc', category: 'movies', itemType: 'individual_movie', estimatedValue: 5000,
  itemDetails: JSON.stringify({ movieTitle: 'Batman', format: 'LaserDisc', isGraded: 'No' }) };
const caller = (role: 'admin' | 'user' | null = 'admin') => testAIRouter.createCaller({ user: role ? { id: 1, role } as any : null, req: { headers: {} } as any, res: {} as any });
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe('Item A-only final valuation audit', () => {
  it('runs with no Item B, no source lookup or model call and never uses the owner estimate as a missing value', async () => {
    const fetch = vi.fn(() => { throw new Error('No lookup may run'); }); vi.stubGlobal('fetch', fetch);
    const result = await caller().auditItemValuation({ item, sales: [], evidenceSummary: normalizeTestAiEvidence(item, []) });
    expect(result.side).toBe('item_a'); expect(result.snapshot.finalUseReport.side).toBe('item_a');
    expect(result.snapshot.profile.primaryValue).toBeNull(); expect(result.snapshot.profile.valuationBasisReason).toContain('cannot');
    expect(result).not.toHaveProperty('rightMarketProfile'); expect(result).not.toHaveProperty('tradeTerms');
    expect(fetch).not.toHaveBeenCalled(); expect(mocks.llm).not.toHaveBeenCalled();
  });
  it.each(['user', null] as const)('denies non-admin caller %s', async role => {
    await expect(caller(role).auditItemValuation({ item, sales: [] })).rejects.toMatchObject({ code: role ? 'FORBIDDEN' : 'UNAUTHORIZED' });
  });
  it('rejects a fake Item B rather than relabeling its receipt', async () => {
    const sales = stampCandidateDisplayIntake([{ title: 'Candidate', price: 11 }], 'item_b', 'wrong-side');
    await expect(caller().auditItemValuation({ item, sales })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
  it('retains invalid diagnostic rows and transports exact financial reason details', async () => {
    const sales = stampCandidateDisplayIntake([{ title: 'Bad currency candidate', price: 11, currency: 'CAD',
      priceBasis: 'asking', saleStatus: 'active', date: null, evidenceDisposition: 'pre_vision_excluded' }], 'item_a', 'audit-test');
    const result = await caller().auditItemValuation({ item, sales });
    expect(result.snapshot.profile.comparables).toHaveLength(1);
    const admission = result.snapshot.profile.comparables[0].valuationUse!.sourceAdmission;
    expect(admission.blockerCodes).toContain('UNSUPPORTED_CURRENCY');
    expect(admission.reasonDetails?.join('; ')).toContain('unsupported currency CAD');
    expect(admission.reasonDetails?.join('; ')).toContain('active asking listing');
    expect(result.snapshot.profile.comparables[0].valuationUse!.auditRef.displayCorrelation?.requestOccurrenceRef).toBe('audit-test:item_a:intake:0');
  });
  it.each(['not_required_pre_visual', 'not_required_no_target_image', 'not_required_context_workflow'])('audits retained visualRequirement=%s rather than rejecting the whole request', async visualRequirement => {
    const result = await caller().auditItemValuation({ item, sales: [{ title: 'Held row', visualRequirement, price: 11, currency: 'USD', sourceId: 'mercari_sold_comps' }] });
    expect(result.snapshot.profile.comparables).toHaveLength(1);
    expect(result.snapshot.profile.comparables[0].valuationUse?.sourceAdmission.blockerCodes).toContain('REQUIRED_APPROVAL_MISSING');
  });
  it('rejects Collection/Lot and the audit ceiling, without migrations or persistence', async () => {
    await expect(caller().auditItemValuation({ item: { ...item, itemType: 'collection_lot' }, sales: [] })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(caller().auditItemValuation({ item, sales: Array.from({ length: 121 }, () => ({ title: 'Row' })) })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
  it('keeps reported material identity flags as a valuation hold', () => {
    const summary = normalizeTestAiEvidence(item, []);
    summary.reviewFlags.push({ kind: 'material', message: 'Wrong release / identity requires review' });
    const result = auditItemValuation({ item, sales: [], evidenceSummary: summary }, { now: new Date('2026-11-10T23:00:00Z'), analysisRunId: 'synthetic-run' });
    expect(result.snapshot.evidence.reviewFlags).toContain('Wrong release / identity requires review');
    expect(result.snapshot.profile.primaryValue).toBeNull(); expect(result.analysisRunId).toBe('synthetic-run');
  });
});
