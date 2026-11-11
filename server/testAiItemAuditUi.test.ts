// @vitest-environment jsdom
import React, { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const mocks = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('../client/src/lib/trpc', () => ({ trpc: { testAI: { auditItemValuation: { useMutation: () => ({ mutate: mocks.mutate, isPending: false }) } } } }));
import { TestAiItemAudit, buildItemAuditSubmission } from '../client/src/components/test-ai/TestAiItemAudit';
import { normalizeTestAiEvidence } from '../shared/testAiEvidenceNormalization';
import { candidateFinalDecision } from '../client/src/components/test-ai/candidateFinalDecision';
import { TestAiCandidateMasterList } from '../client/src/components/TestAiCandidateMasterList';
const item = { title: 'Batman LaserDisc', category: 'movies', itemType: 'individual_movie', primaryPhotoUrl: 'https://example.test/target.jpg' };
const sources = [{ id: 'mercari_sold_comps', label: 'Mercari Sold', kind: 'market_completed', packet: { requestedMode: 'sold',
  listings: [{ title: 'Batman candidate', price: 11, currency: 'USD', requestedMode: 'sold', evidenceReasons: ['APPROVAL_UNGRADED_STATE_UNCONFIRMED: rawOrLooseVisible was not confirmed.'] }] } }];
let root: Root, container: HTMLDivElement, client: QueryClient;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers(); mocks.mutate.mockClear();
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
});
afterEach(async () => { await act(async () => root.unmount()); client.clear(); container.remove(); vi.useRealTimers(); });
async function render(target = item, packets = sources) {
  await act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(TestAiItemAudit, {
    item: target, summary: normalizeTestAiEvidence(target, []), sources: packets,
  }))));
}
async function tick() { await act(async () => { vi.advanceTimersByTime(350); }); }
function respond(call = 0) {
  const [input, callbacks] = mocks.mutate.mock.calls[call];
  callbacks.onSuccess({ side: 'item_a', analysisRunId: `server-${call}`, snapshot: {
    profile: { primaryValue: null, valuationBasis: 'unavailable', valuationBasisReason: 'Insufficient completed-sale support.',
      comparables: input.sales.map((row: any, index: number) => ({ ...row, valuationUse: { auditRef: { side: 'item_a',
        analysisRunId: `server-${call}`, intakeOrdinal: index, displayCorrelation: row.displayCorrelation },
        sourceAdmission: { blockerCodes: ['REQUIRED_APPROVAL_MISSING'], reasonDetails: ['APPROVAL_UNGRADED_STATE_UNCONFIRMED: deciding evidence did not confirm ungraded state.'] },
        use: { code: 'CONTEXT_ONLY', reasonCodes: ['REQUIRED_APPROVAL_MISSING'] } } })) },
  } });
}
describe('Automatic Item A-only audit', () => {
  it('automatically submits Item A without any Item B or image/model request fields', async () => {
    await render(); expect(mocks.mutate).not.toHaveBeenCalled(); await tick();
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    const payload = mocks.mutate.mock.calls[0][0];
    expect(payload.item.title).toBe(item.title); expect(payload.item.approvalTargetImageReference).toBe(item.primaryPhotoUrl);
    expect(payload.item).not.toHaveProperty('imageUrl'); expect(payload).not.toHaveProperty('rightItem');
    expect(payload.sales[0].displayCorrelation.side).toBe('item_a');
  });
  it('does not repeat for value-equivalent source/summary objects', async () => {
    await render(); await tick(); await render({ ...item }, JSON.parse(JSON.stringify(sources))); await tick();
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
  });
  it('shows a basic explanation in the actual card and never invents a zero-value estimate', async () => {
    await render(); await tick(); await act(async () => respond());
    expect(container.textContent).toContain('Final Item A audit completed');
    const decisionReason = container.querySelector('[data-final-decision-code] p')?.textContent ?? '';
    expect(decisionReason).toContain('visual AI review was not completed');
    expect(decisionReason).not.toContain('APPROVAL_UNGRADED_STATE_UNCONFIRMED');
    expect(decisionReason).not.toContain('REQUIRED_APPROVAL_MISSING');
    expect(container.textContent).toContain('REQUIRED_APPROVAL_MISSING');
    expect(container.textContent).toContain('NOT USED — CONTEXT ONLY');
    expect(container.textContent).not.toContain('USD 0');
    expect(container.textContent).not.toContain('final transaction amount and sale-event date are unverified');
  });
  it('rejects stale responses after changing Item A and starts an audit for the new target', async () => {
    await render(); await tick(); await render({ ...item, title: 'New target' });
    await act(async () => respond(0)); expect(container.textContent).not.toContain('Final Item A audit completed');
    await tick(); expect(mocks.mutate).toHaveBeenCalledTimes(2);
    expect(mocks.mutate.mock.calls[1][0].item.title).toBe('New target');
  });
  it('restarts an interrupted input when switching away and back before the intermediate source request finishes', async () => {
    await render(); await tick();
    let resolve!: (value: any) => void;
    const pending = client.fetchQuery({ queryKey: [['testAI', 'getMercariSoldCompsData']], queryFn: () => new Promise(res => { resolve = res; }) });
    await render({ ...item, title: 'Intermediate target' });
    await act(async () => respond(0));
    await render();
    await act(async () => { resolve({}); await pending; });
    await render(); await tick();
    expect(mocks.mutate).toHaveBeenCalledTimes(2);
    expect(mocks.mutate.mock.calls[1][0].item.title).toBe(item.title);
    await act(async () => respond(1)); expect(container.textContent).toContain('Final Item A audit completed');
  });
  it('reports audit request failure rather than calling candidates rejected and permits explicit retry', async () => {
    await render(); await tick();
    await act(async () => mocks.mutate.mock.calls[0][1].onError(new Error('synthetic')));
    expect(container.textContent).toContain('Item A final audit request failed');
    await tick(); expect(mocks.mutate).toHaveBeenCalledTimes(1);
    await act(async () => container.querySelector('button')!.click()); expect(mocks.mutate).toHaveBeenCalledTimes(2);
  });
  it('waits for the selected source to settle but ignores unrelated active queries', async () => {
    let resolve!: (data: any) => void;
    const pending = client.fetchQuery({ queryKey: [['testAI', 'getMercariSoldCompsData']], queryFn: () => new Promise(res => { resolve = res; }) });
    await render(item, sources.map(source => ({ ...source, status: 'loading' }))); await tick(); expect(mocks.mutate).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Waiting for source retrieval');
    await act(async () => { resolve({}); await pending; });
    await render(item, sources.map(source => ({ ...source, status: 'success' }))); await tick(); expect(mocks.mutate).toHaveBeenCalledTimes(1);
  });
  it('audits retained rows from a partially completed source instead of leaving the queue stuck', async () => {
    await render(item, sources.map(source => ({ ...source, status: 'partial' })));
    await tick();
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.mutate.mock.calls[0][0].sales).toHaveLength(1);
  });
  it('publishes the same final receipt to main and source-detail Batman cards, retaining stale-run rejection', async () => {
    const row = { title: 'BATMAN (1989) Laserdisc LD', price: 19.99, sourceId: 'sold_comps',
      metadataOriginOccurrenceKey: 'sold_comps:batman-run:occ:3', metadataMatchRank: 3, metadataMatchScore: 65,
      visualExecution: { version: 1, state: 'completed', selectedForReview: true,
        identity: { origin: 'visual', result: 'match', reviewVerdict: 'match' },
        attempts: [{ ordinal: 1, stage: 'initial', format: 'json_schema', outcome: 'usable_review' }] },
      visualReviewStatus: 'match', evidenceDisposition: 'valuation_eligible' };
    const packets = [{ id: 'sold_comps', label: 'eBay Sold-Comps', kind: 'market_completed', status: 'success', packet: { listings: [row] } }];
    const composedRender = async (target = item) => act(async () => root.render(createElement(QueryClientProvider, { client },
      createElement(TestAiItemAudit, { item: target, summary: normalizeTestAiEvidence(target, []), sources: packets },
        createElement('details', { 'aria-label': 'Source and technical audit' },
          createElement(TestAiCandidateMasterList, { listings: [row], sourceLabel: 'eBay Sold-Comps', targetImageUrl: target.primaryPhotoUrl }))))));
    await composedRender(); await tick();
    const [input, callbacks] = mocks.mutate.mock.calls[0];
    await act(async () => callbacks.onSuccess({ side: 'item_a', analysisRunId: 'server-batman', snapshot: { profile: {
      primaryValue: 19.99, valuationBasis: 'current_sales_primary', valuationBasisReason: 'Matching completed sale selected.',
      comparables: input.sales.map((sale: any, intakeOrdinal: number) => ({ ...sale, valuationUse: {
        auditRef: { side: 'item_a', analysisRunId: 'server-batman', intakeOrdinal, displayCorrelation: sale.displayCorrelation },
        use: { code: 'CURRENT_SALES_PRIMARY', reasonCodes: [] } } })) } } }));
    const main = container.querySelector('[aria-label="Item A evidence review"] [data-final-decision-code]');
    const details = container.querySelector('[aria-label="Source and technical audit"] [data-final-decision-code]');
    expect(main?.getAttribute('data-final-decision-code')).toBe('CURRENT_SALES_PRIMARY');
    expect(details?.getAttribute('data-final-decision-code')).toBe('CURRENT_SALES_PRIMARY');
    expect(details?.textContent).not.toContain('VALUATION NOT RUN');
    await composedRender({ ...item, title: 'Different target' });
    expect(container.querySelector('[aria-label="Source and technical audit"] [data-final-decision-code]')?.getAttribute('data-final-decision-code'))
      .not.toBe('CURRENT_SALES_PRIMARY');
  });
  it('retains the later trade panel behind an explicit disabled-by-default option', () => {
    const page = readFileSync(`${process.cwd()}/client/src/pages/TestAI.tsx`, 'utf8');
    expect(page).toContain("useState(false)"); expect(page).toContain('Enable two-item trade testing — later phase');
    expect(page).toContain("side === 'left' ? <TestAiItemAudit");
    expect(page).toContain('Select Item A to begin source testing'); expect(page).not.toContain('Select two items to begin testing');
  });
});
describe('Bounded audit population', () => {
  it('keeps same-title independent candidates and hard exclusions while excluding certification/reference records', () => {
    const intake = buildItemAuditSubmission([
      { id: 'sold_comps', label: 'Sold', kind: 'market_completed', packet: { listings: [{ title: 'Same', price: 11 }, { title: 'Same', price: 11 }],
        preVisionExcludedListings: [{ title: 'Wrong format', evidenceDisposition: 'rejected_objective_conflict', evidenceReasons: ['Wrong format'] }] } },
      { id: 'psa', label: 'PSA', kind: 'certification', packet: { records: [{ title: 'Certification', price: 999 }] } },
      { id: 'rawg', label: 'RAWG', kind: 'reference', packet: { records: [{ title: 'Catalog', price: 999 }] } },
    ], 'intake-test');
    expect(intake.submitted).toHaveLength(3); expect(intake.submitted.map(row => row.title)).toEqual(['Same', 'Same', 'Wrong format']);
    expect(new Set(intake.submitted.map(row => row.displayCorrelation.requestOccurrenceRef)).size).toBe(3);
  });
  it('keeps eBay Active candidates visible as current context but excludes them from sold valuation intake', () => {
    const intake = buildItemAuditSubmission([
      { id: 'ebay_active', label: 'eBay Active', kind: 'market_current', packet: { listings: [{ title: 'Batman Laserdisc', price: 19.99, saleStatus: 'active', priceBasis: 'asking' }] } },
      { id: 'sold_comps', label: 'Sold', kind: 'market_completed', packet: { listings: [{ title: 'Batman Laserdisc', price: 11 }] } },
    ], 'active-context-test');
    expect(intake.sources.find(source => source.id === 'ebay_active')?.rows).toHaveLength(1);
    expect(intake.submitted.map(row => row.sourceId)).toEqual(['sold_comps']);
    expect(intake.sources.find(source => source.id === 'ebay_active')?.role).toBe('asking_price_context');
  });
  it('balances sources at the 120-row limit and gives every omitted card an explicit audit-cap reason', () => {
    const intake = buildItemAuditSubmission(['a', 'b'].map(id => ({ id, label: id, kind: 'market_completed', packet: {
      listings: Array.from({ length: 100 }, (_, index) => ({ title: `${id}-${index}` })),
    } })), 'cap-test');
    expect(intake.submitted).toHaveLength(120); expect(intake.omitted).toBe(80);
    expect(intake.submitted.filter(row => row.sourceId === 'a')).toHaveLength(60);
    const omitted = intake.sources[0].rows.find(row => row.auditOmittedByCap)!;
    expect(candidateFinalDecision(omitted).reason).toContain('120 retained candidates');
  });
});
