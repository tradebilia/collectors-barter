// @vitest-environment jsdom
import React, { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeTestAiEvidence, type NormalizedEvidenceSummary } from '../shared/testAiEvidenceNormalization';
import { buildApprovalTargetInput } from '../shared/testAiSoldCompsTransport';

const mocks = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('../client/src/lib/trpc', () => ({ trpc: { testAI: { auditItemValuation: {
  useMutation: () => ({ mutate: mocks.mutate, isPending: false }),
} } } }));
import { TestAiItemAudit, type ItemAuditSource, type ItemAuditTarget } from '../client/src/components/test-ai/TestAiItemAudit';
import { useTestAiCandidateDisplay } from '../client/src/components/TestAiCandidateStatus';

const item: ItemAuditTarget = { title: 'Batman LaserDisc', category: 'movies', itemType: 'individual_movie',
  primaryPhotoUrl: 'https://example.test/target.jpg', condition: 'excellent' };
const summary = normalizeTestAiEvidence(item, []);
const candidate = { title: 'BATMAN (1989) Laserdisc LD', price: 19.99, currency: 'USD', sourceId: 'sold_comps',
  metadataOriginOccurrenceKey: 'sold_comps:source-run:occ:3',
  provenance: { payloadHash: 'observation-hash', signature: 'synthetic-signature' },
  visualReviewStatus: 'match', evidenceDisposition: 'valuation_eligible',
  visualExecution: { version: 1, state: 'completed', selectedForReview: true,
    identity: { origin: 'visual', result: 'match', reviewVerdict: 'match' },
    attempts: [{ ordinal: 1, stage: 'initial', format: 'json_schema', outcome: 'usable_review' }] },
};
const sources: ItemAuditSource[] = [{ id: 'sold_comps', label: 'eBay Sold-Comps', kind: 'market_completed',
  status: 'success', packet: { listings: [candidate] } }];
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
let root: Root, container: HTMLDivElement, didUnmount: boolean;
function ReceiptProbe() {
  const context = useTestAiCandidateDisplay();
  return createElement('output', { 'data-testid': 'child-receipt' }, context.outcome
    ? `${context.scope.side}:${context.outcome.requestRunId}:${context.outcome.analysisRunId}` : 'no-final-receipt');
}
function FailureProbe() {
  return createElement('output', { 'data-testid': 'child-failure' }, useTestAiCandidateDisplay().auditFailure);
}
async function render(target: ItemAuditTarget = item, packets: ItemAuditSource[] = sources,
  evidence: NormalizedEvidenceSummary = summary) {
  await act(async () => root.render(createElement(TestAiItemAudit, { item: target, sources: packets, summary: evidence },
    createElement(ReceiptProbe), createElement(FailureProbe))));
}
async function tick(milliseconds = 300) { await act(async () => { vi.advanceTimersByTime(milliseconds); }); }
async function manualRun() { await act(async () => { container.querySelector('button')!.click(); }); }
function response(call = 0, side = 'item_a') {
  const [input] = mocks.mutate.mock.calls[call];
  return { side, analysisRunId: `server-${call}`, snapshot: { profile: {
    primaryValue: null, valuationBasis: 'unavailable', valuationBasisReason: 'Insufficient completed-sale support.',
    comparables: input.sales.map((row: any, intakeOrdinal: number) => ({ ...row, valuationUse: {
      auditRef: { side, analysisRunId: `server-${call}`, intakeOrdinal, displayCorrelation: row.displayCorrelation },
      use: { code: 'CONTEXT_ONLY', reasonCodes: [] },
    } })),
  } } };
}
async function succeed(call = 0, side = 'item_a') {
  await act(async () => { mocks.mutate.mock.calls[call][1].onSuccess(response(call, side)); });
}
async function fail(error: unknown, call = 0) {
  await act(async () => { mocks.mutate.mock.calls[call][1].onError(error); });
}
const status = () => container.querySelector('[aria-label="Item A standalone valuation audit"] > section [role="status"]')?.textContent ?? '';
const childReceipt = () => container.querySelector('[data-testid="child-receipt"]')?.textContent;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers(); mocks.mutate.mockReset(); didUnmount = false;
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => {
  if (!didUnmount) await act(async () => root.unmount());
  container.remove(); vi.clearAllTimers(); vi.useRealTimers();
});

describe('Item A causal audit lifecycle', () => {
  it('does not starve dispatch on debug/label/message/metric churn and retains a completed receipt', async () => {
    const diagnosticSources = (index: number): ItemAuditSource[] => [{ ...sources[0], label: `Diagnostic label ${index}`,
      message: `Diagnostic message ${index}`, status: index % 2 ? 'partial' : 'success', packet: {
        listings: clone([candidate]), debug: { attempt: index }, metrics: { median: index },
        label: `Packet label ${index}`, message: `Packet message ${index}`, population: { count: index },
      }, debug: { render: index }, metrics: { count: index } } as ItemAuditSource];
    await render(item, diagnosticSources(0));
    await tick(100); await render(item, diagnosticSources(1));
    await tick(100); await render(item, diagnosticSources(2));
    expect(mocks.mutate).not.toHaveBeenCalled();
    await tick(100);
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.mutate.mock.calls[0][0].sales[0].provenance).toEqual(candidate.provenance);
    await succeed();
    for (let index = 3; index < 7; index++) { await render(item, diagnosticSources(index)); await tick(100); }
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(status()).toContain('Final Item A audit completed');
    expect(childReceipt()).toBe('item_a:item-a-audit-1:server-0');
  });

  it('ignores generated object-local display IDs on value-equivalent provider copies', async () => {
    const unbound = [{ id: 'sold_comps', label: 'Sold', packet: { listings: [{ title: 'Candidate', price: 11 }] } }];
    await render(item, unbound); await tick(); await succeed();
    await render({ ...item }, clone(unbound), clone(summary)); await tick(1000);
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(status()).toContain('Final Item A audit completed');
  });

  it('cancels a queued auto run when a manual audit succeeds and still permits explicit reruns', async () => {
    await render(); await tick(100); await manualRun();
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    await succeed(); await tick(1000);
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(status()).toContain('Final Item A audit completed');
    await manualRun(); await succeed(1); await tick(1000);
    expect(mocks.mutate).toHaveBeenCalledTimes(2);
    expect(childReceipt()).toBe('item_a:item-a-audit-2:server-1');
  });

  it('does not dispatch the queued automatic duplicate while a manual request is unresolved', async () => {
    await render(); await tick(299); await manualRun(); await tick(2000);
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    await succeed(); expect(status()).toContain('Final Item A audit completed');
  });

  it('freshly checks attempted input even if a cleared automatic callback was already queued', async () => {
    const timeout = vi.spyOn(window, 'setTimeout');
    await render();
    const callback = timeout.mock.calls.find(([, delay]) => delay === 300)?.[0] as () => void;
    timeout.mockRestore();
    expect(callback).toBeTypeOf('function');
    await manualRun(); await succeed();
    await act(async () => { callback(); });
    expect(mocks.mutate).toHaveBeenCalledTimes(1); expect(status()).toContain('Final Item A audit completed');
  });

  it('gates pending sources separately from settled diagnostic status changes', async () => {
    const pending = (state: string) => sources.map(source => ({ ...source, status: state }));
    await render(item, pending('loading')); await tick(1000);
    expect(mocks.mutate).not.toHaveBeenCalled();
    expect((container.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
    await render(item, pending('running')); await tick(1000); expect(mocks.mutate).not.toHaveBeenCalled();
    await render(item, pending('partial')); await tick(299); expect(mocks.mutate).not.toHaveBeenCalled();
    await tick(1); expect(mocks.mutate).toHaveBeenCalledTimes(1); await succeed();
    await render(item, pending('pending')); expect(childReceipt()).toBe('no-final-receipt'); await tick(1000);
    await render(item, pending('success')); await tick(1000);
    expect(mocks.mutate).toHaveBeenCalledTimes(1); expect(status()).toContain('Final Item A audit completed');
  });

  it('normalizes every nullable optional target field with the shared approval input and never invents zero', async () => {
    const nullable: ItemAuditTarget = { title: item.title, category: item.category, itemType: null, grade: null,
      condition: null, certificationCompany: null, itemDetails: null, estimatedValue: null, primaryPhotoUrl: null };
    await render(nullable); await tick();
    expect(mocks.mutate.mock.calls[0][0].item).toEqual({ ...buildApprovalTargetInput(nullable),
      estimatedValue: undefined, approvalTargetImageReference: undefined });
    expect(mocks.mutate.mock.calls[0][0].item.estimatedValue).not.toBe(0);
    expect(mocks.mutate.mock.calls[0][0].item).not.toHaveProperty('imageUrl');
    await succeed();
    const absent = { title: item.title, category: item.category };
    await render(absent); await tick(1000);
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(status()).toContain('Final Item A audit completed');
  });

  it.each([0, 25.5])('preserves an actual numeric estimate of %s', async estimatedValue => {
    await render({ ...item, estimatedValue }); await tick();
    expect(mocks.mutate.mock.calls[0][0].item.estimatedValue).toBe(estimatedValue);
  });

  it.each([
    ['title', 'Batman VHS'], ['category', 'music'], ['itemType', 'individual_movie_poster'],
    ['grade', '9.0'], ['condition', 'poor'], ['certificationCompany', 'VGA'],
    ['itemDetails', '{"format":"VHS"}'], ['estimatedValue', 25], ['primaryPhotoUrl', 'https://example.test/new-target.jpg'],
  ] as const)('invalidates the receipt for a real normalized target change: %s', async (field, value) => {
    await render(); await tick(); await succeed();
    await render({ ...item, [field]: value });
    expect(status()).not.toContain('Final Item A audit completed'); expect(childReceipt()).toBe('no-final-receipt');
    await tick(); expect(mocks.mutate).toHaveBeenCalledTimes(2);
    await succeed(0); expect(childReceipt()).toBe('no-final-receipt');
    await succeed(1); expect(childReceipt()).toBe('item_a:item-a-audit-2:server-1');
  });

  it.each([
    ['price', { price: 21 }], ['visual evidence', { visualReviewStatus: 'mismatch' }],
    ['provenance', { provenance: { ...candidate.provenance, signature: 'new-synthetic-signature' } }],
    ['source run', { metadataOriginOccurrenceKey: 'sold_comps:new-source-run:occ:3' }],
    ['explicit display occurrence', { metadataOriginOccurrenceKey: undefined, candidateDisplayOccurrenceKey: 'provider-occurrence-4' }],
    ['comparison evidence', { metadataFieldComparisons: [{ targetField: 'Condition', status: 'soft_difference' }] }],
  ])('invalidates real candidate %s changes without losing the changed evidence', async (_label, changed) => {
    await render(); await tick(); await succeed();
    const updated = [{ ...sources[0], packet: { listings: [{ ...candidate, ...changed }] } }];
    await render(item, updated);
    expect(childReceipt()).toBe('no-final-receipt'); await tick();
    expect(mocks.mutate).toHaveBeenCalledTimes(2);
    expect(mocks.mutate.mock.calls[1][0].sales[0]).toMatchObject(changed);
    await succeed(0); expect(childReceipt()).toBe('no-final-receipt');
    await succeed(1); expect(status()).toContain('Final Item A audit completed');
  });

  it.each([
    ['material flags', (evidence: NormalizedEvidenceSummary) => { evidence.reviewFlags.push({ kind: 'material', field: 'Format', message: 'Review the conflicting format.' }); }],
    ['coverage flags', (evidence: NormalizedEvidenceSummary) => { evidence.reviewFlags.push({ kind: 'coverage', sourceId: 'sold_comps', message: 'Partial retrieval coverage.' }); }],
    ['guide provenance', (evidence: NormalizedEvidenceSummary) => { evidence.guideAnchors.push({ sourceId: 'pricecharting', sourceLabel: 'PriceCharting', grade: 'MS65', value: 30, recordedSales: null,
      lastSaleDate: null, totalRecordedSales: null, provenanceToken: 'synthetic-guide-token' }); }],
    ['identity readiness', (evidence: NormalizedEvidenceSummary) => { evidence.identityReadiness.missingCriticalFields.push('format'); }],
    ['evidence sufficiency', (evidence: NormalizedEvidenceSummary) => { evidence.evidenceSufficiency.completedSaleCount += 1; }],
    ['source alignment', (evidence: NormalizedEvidenceSummary) => { evidence.alignedSources.push({ id: 'rawg', label: 'Reference', fields: ['Format'] }); }],
    ['source coverage', (evidence: NormalizedEvidenceSummary) => { evidence.sources.push({ id: 'sold_comps', label: 'Sold', kind: 'market_completed', role: 'valuation_candidate', status: 'partial' }); }],
  ] as const)('preserves and invalidates real summary %s changes', async (_label, change) => {
    await render(); await tick(); await succeed();
    const updated = clone(summary); change(updated);
    await render(item, sources, updated); expect(childReceipt()).toBe('no-final-receipt'); await tick();
    expect(mocks.mutate).toHaveBeenCalledTimes(2);
    expect(mocks.mutate.mock.calls[1][0].evidenceSummary).toEqual(updated);
    await succeed(0); expect(childReceipt()).toBe('no-final-receipt');
  });

  it('rejects stale manual-run success/error callbacks and wrong-side successes', async () => {
    await render(); await manualRun(); await manualRun();
    await succeed(0); expect(childReceipt()).toBe('no-final-receipt');
    await fail(new Error('old request failed'), 0); expect(status()).not.toContain('request failed');
    await succeed(1, 'item_b'); expect(childReceipt()).toBe('no-final-receipt');
    await succeed(1); expect(childReceipt()).toBe('item_a:item-a-audit-2:server-1');
  });

  it('restarts when switching away and back and rejects the original same-target response', async () => {
    await render(); await tick();
    await render({ ...item, title: 'Other target' }); await tick(100);
    await render(); await succeed(0); expect(childReceipt()).toBe('no-final-receipt');
    await tick(); expect(mocks.mutate).toHaveBeenCalledTimes(2);
    await succeed(1); expect(status()).toContain('Final Item A audit completed');
  });

  it('cancels owned timers on unmount and ignores late responses', async () => {
    await render(); await tick(100); await act(async () => root.unmount()); didUnmount = true;
    await tick(1000); expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it('ignores late success and failure after an issued request is unmounted', async () => {
    await render(); await tick(); await act(async () => root.unmount()); didUnmount = true;
    await succeed(); await fail(new Error('late failure')); await tick(1000);
    expect(container.textContent).toBe(''); expect(mocks.mutate).toHaveBeenCalledTimes(1);
  });
});

describe('Safe audit request failures', () => {
  it.each(['message', 'zodError'])('shows BAD_REQUEST Zod field paths from %s without issue values, messages or secret keys', async shape => {
    await render(); await tick();
    const issues = [
      { path: ['item', 'condition'], message: 'secret-condition-value', received: 'secret-input-value' },
      { path: ['sales', 0, 'metadataFieldComparisons', 0, 'status'], message: 'secret-comparison-value' },
      { path: ['sales', 0, 'api-key-secret'], message: 'private-provider-response' },
      { path: ['api-key-secret'], message: 'private-provider-response' },
    ];
    await fail({ data: { code: 'BAD_REQUEST', ...(shape === 'zodError' ? { zodError: { issues } } : {}) },
      message: shape === 'message' ? JSON.stringify(issues) : 'private-provider-response' });
    expect(status()).toContain('Input validation failed'); expect(status()).toContain('item.condition');
    expect(status()).toContain('sales.0.metadataFieldComparisons.0.status'); expect(status()).toContain('sales.0.[field]');
    expect(status()).not.toMatch(/secret|private-provider-response|candidates were rejected/);
    expect(status()).toContain('No final decision is available');
    expect(container.querySelector('[data-testid="child-failure"]')?.textContent).toBe(status());
    await tick(1000); expect(mocks.mutate).toHaveBeenCalledTimes(1);
    await manualRun(); expect(mocks.mutate).toHaveBeenCalledTimes(2);
  });

  it.each([
    [{ data: { code: 'BAD_REQUEST' }, message: 'secret malformed payload' }, 'Input validation failed'],
    [{ data: { code: 'FORBIDDEN' }, message: 'secret role data' }, 'Permission denied'],
    [{ shape: { data: { code: 'UNAUTHORIZED' } }, message: 'secret session' }, 'Permission denied'],
    [{ data: { code: 'INTERNAL_SERVER_ERROR' }, message: 'secret server data' }, 'server could not finish'],
    [{ data: { code: 'TIMEOUT' }, message: 'secret timeout data' }, 'request timed out'],
    [new Error('secret transport detail'), 'Request/network error'],
  ])('distinguishes validation, permission and request/network failure without declaring candidate rejection', async (error, expected) => {
    await render(); await tick(); await fail(error);
    expect(status()).toContain('Item A final audit request failed'); expect(status()).toContain(expected);
    expect(status()).toContain('No final decision is available'); expect(status()).not.toMatch(/secret|rejected/);
    expect(childReceipt()).toBe('no-final-receipt');
  });
});
