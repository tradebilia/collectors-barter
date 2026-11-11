import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const mocks = vi.hoisted(() => ({ llm: vi.fn() }));
vi.mock('./_core/env', () => ({ ENV: { jwtSecret: 'synthetic-batman-pipeline-signing-key', appId: 'synthetic-batman' } }));
vi.mock('./_core/llm', () => ({ invokeLLM: mocks.llm }));
import { testAIRouter } from './testAIRouter';
import { buildItemAuditSubmission } from '../client/src/components/test-ai/TestAiItemAudit';
import { reconcileCandidateFinalUse, type CandidateFinalDisplayOutcome } from '../shared/testAiCandidateLedger';
import { candidateFinalDecision } from '../client/src/components/test-ai/candidateFinalDecision';
import { TestAiCandidateDisplayProvider } from '../client/src/components/TestAiCandidateStatus';
import { TestAiCandidateMasterList } from '../client/src/components/TestAiCandidateMasterList';

const caller = () => testAIRouter.createCaller({ user: { id: 1, role: 'admin' } as any, req: { headers: {} } as any, res: {} as any });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe('Batman completed-sale final audit pipeline', () => {
  it('transports soft Movie conditions through actual RPC validation and joins final use onto the original source cards', async () => {
    const targetImage = 'https://example.test/batman-target.jpg';
    const item = { title: 'BATMAN (1989) Laserdisc LD', category: 'movies', itemType: 'individual_movie', condition: 'excellent',
      estimatedValue: 1010, itemDetails: JSON.stringify({ title: 'Batman', edition: 'Widescreen', format: 'LaserDisc', year: '1989', releaseYear: '1989', sealed: 'no', isGraded: 'no', quantity: '1', shippingAvailable: 'local_only' }) };
    const now = Date.now();
    const providerRows = [
      { title: 'BATMAN (1989) Laserdisc LD - Michael Keaton Kim Basinger Jack Nicholson', price: 19.99 },
      { title: 'RARE BATMAN 1989 TIM BURTON MICHAEL KEATON NICHOLSON 2 Laserdisc', price: 15 },
    ].map((row, index) => ({ ...row, saleId: `synthetic-batman-${index}`, id: `synthetic-batman-${index}`,
      soldPrice: String(row.price), soldCurrency: 'USD', endedAt: new Date(now - (index + 1) * 86400000).toISOString(),
      condition: 'Pre-Owned', url: `https://www.ebay.com/itm/synthetic-batman-${index}`,
      imageUrl: `https://example.test/batman-candidate-${index}.jpg`, saleForm: 'individual_movie', lotQuantity: 1,
      itemSpecifics: { Format: 'LaserDisc', 'Release Year': '1989', Condition: 'Pre-Owned' }, buyerPremium: 'included' }));
    let providerCalls = 0;
    const fetch = vi.fn(async (url: any) => {
      const parsed = new URL(String(url));
      if (parsed.origin !== 'https://api.sold-comps.com') throw new Error('Unexpected external boundary');
      providerCalls += 1;
      return new Response(JSON.stringify({ items: providerCalls === 1 ? providerRows : [] }), { status: 200 });
    });
    vi.stubEnv('SOLD_COMPS_API_KEY', 'synthetic-batman-provider-key'); vi.stubEnv('SOLID_COMPS_API_KEY', '');
    vi.stubGlobal('fetch', fetch);
    mocks.llm.mockImplementation(async (request: any) => {
      const content = request.messages?.[0]?.content;
      const text = Array.isArray(content) ? content.filter((part: any) => part.type === 'text').map((part: any) => part.text).join('\n') : '';
      const index = text.match(/CANDIDATE (\d+): title=/)?.[1];
      if (index === undefined || !text.includes('strict visual identity reviewer')) throw new Error('Unexpected model boundary');
      return { choices: [{ message: { content: JSON.stringify({ reviews: [{ candidateIndex: Number(index), verdict: 'match', confidence: 'high',
        rationale: 'Synthetic deciding images confirm the same Batman movie in LaserDisc format, ungraded.', visualDifferences: [],
        visualEvidence: { slabVisible: false, gradingLabelVisible: false, graderVisible: false, numericGradeVisible: false,
          gradeMatches: false, rawOrLooseVisible: true, identityMatches: true, artworkMatches: true,
          dateMatches: false, denominationMatches: false, mintMarkMatches: false, varietyMatches: true } }] }) } }] };
    });
    const packet = await caller().getSoldCompsData({ ...item, imageUrl: targetImage, approvalTarget: item,
      approvalTargetImageReference: targetImage }) as any;
    expect(packet.error).toBeNull();
    const originals = packet.audit.ledger.filter((row: any) => providerRows.some(p => p.saleId === row.saleId));
    expect(originals).toHaveLength(2);
    expect(originals.every((row: any) => row.visualReviewStatus === 'match')).toBe(true);
    expect(originals.every((row: any) => row.identityApproval && row.provenanceToken)).toBe(true);
    expect(originals.every((row: any) => row.metadataFieldComparisons.some((comparison: any) => comparison.status === 'soft_difference'))).toBe(true);
    const intake = buildItemAuditSubmission([{ id: 'sold_comps', label: 'eBay Sold-Comps', kind: 'market_completed', status: 'success', packet }], 'synthetic-batman-audit');
    const beforeCalls = { provider: fetch.mock.calls.length, model: mocks.llm.mock.calls.length };
    const result = await caller().auditItemValuation({ item: { ...item, approvalTargetImageReference: targetImage }, sales: intake.submitted });
    expect(fetch).toHaveBeenCalledTimes(beforeCalls.provider);
    expect(mocks.llm).toHaveBeenCalledTimes(beforeCalls.model);
    const outcome: CandidateFinalDisplayOutcome = { side: 'item_a', requestRunId: 'synthetic-batman-audit', submitted: intake.submitted,
      analysisRunId: result.analysisRunId, finalRows: result.snapshot.profile.comparables };
    const reconciled = reconcileCandidateFinalUse(originals, outcome, { side: 'item_a', sourceId: 'sold_comps' });
    expect(reconciled.every(row => row.candidatePricingLink === 'resolved')).toBe(true);
    expect(reconciled.every(row => row.valuationUse?.use.code === 'CURRENT_SALES_PRIMARY')).toBe(true);
    expect(reconciled.every(row => candidateFinalDecision(row).code === 'CURRENT_SALES_PRIMARY')).toBe(true);
    const html = renderToStaticMarkup(createElement(TestAiCandidateDisplayProvider, { side: 'item_a', outcome,
      children: createElement(TestAiCandidateMasterList, { listings: originals, sourceLabel: 'eBay Sold-Comps', targetImageUrl: targetImage }) }));
    expect(html).not.toContain('VALUATION NOT RUN');
    expect(html.match(/data-final-decision-code="CURRENT_SALES_PRIMARY"/g)).toHaveLength(2);
  });
});
