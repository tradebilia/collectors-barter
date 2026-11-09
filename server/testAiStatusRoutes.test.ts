import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Only dependency boundaries are synthetic. Router/filter/normalizer/signer/
// scorer/snapshot and symmetric transport remain the actual production modules.
const boundaries = vi.hoisted(() => ({ fetch: vi.fn(), llm: vi.fn(), denied: [] as string[] }));
vi.mock('./_core/env', () => ({ ENV: { jwtSecret: 'stage5-synthetic-status-signing-key-not-a-service-credential', appId: 'stage5-status-test' } }));
vi.mock('./_core/llm', () => ({ invokeLLM: boundaries.llm }));
import { testAIRouter } from './testAIRouter';
import { buildSoldCompsAnalysisSales, buildSoldCompsApprovalInput } from '../shared/testAiSoldCompsTransport';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TestAiFinalLedgerRow, TestAiCandidateStatus } from '../client/src/components/TestAiCandidateStatus';

const KEY = 'stage5-synthetic-provider-key-not-a-service-credential';
const PRIMARY = 'https://example.test/stage5/target.jpg';
const NOW = new Date('2026-11-09T11:00:00.000Z');
const KOBE = { title: '1996 Topps Kobe Bryant #138 PSA 10', category: 'sports_cards', itemType: 'single_card',
  grade: '10', certificationCompany: 'PSA', itemDetails: JSON.stringify({ year: '1996', manufacturer: 'Topps', player: 'Kobe Bryant', cardNumber: '138' }) };
type Row = Record<string, any>;
const wire = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const caller = () => testAIRouter.createCaller({ user: { id: 1, role: 'admin' } as any, req: { headers: {} } as any, res: {} as any });
let providerRows: Row[] = [];
let providerPartial = false;
let visualAllowed = true;
let narrativeAllowed = false;
let fetchCount = 0;
function rows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({ title: KOBE.title, saleId: `status-${index}`, id: `status-${index}`,
    soldPrice: String(100 + index), soldCurrency: 'USD', endedAt: new Date(NOW.getTime() - (index + 1) * 86400000).toISOString(),
    url: `https://www.ebay.com/itm/status-${index}`, thumbnailUrl: `https://example.test/stage5/${index}.jpg`,
    imageUrl: `https://example.test/stage5/${index}.jpg`, saleForm: 'single_card', lotQuantity: 1,
    buyerPremium: 'included', shipping: 'excluded', tax: 'unknown', itemSpecifics: { Player: 'Kobe Bryant' } }));
}
async function acquire() {
  return await caller().getSoldCompsData(buildSoldCompsApprovalInput({ ...KOBE, imageUrl: PRIMARY }, KOBE)) as unknown as Row;
}
async function analyze(source: Row, salePatch: Row = {}) {
  const submitted = buildSoldCompsAnalysisSales(source, true).map((row) => ({ ...wire(row), ...salePatch }));
  const item = { ...KOBE, estimatedValue: 0, approvalTargetImageReference: PRIMARY };
  return await caller().analyzeTrade(wire({ leftItem: item, rightItem: item,
    useImageAnalyzer: false, useVisualFieldCompletion: false,
    leftHistoricalTrendSales: submitted, rightHistoricalTrendSales: submitted,
    marketNews: { itemA: [], itemB: [], categorySummaries: [] },
  })) as unknown as Row;
}
beforeEach(() => {
  vi.clearAllMocks(); boundaries.denied.length = 0; providerRows = []; providerPartial = false; visualAllowed = true; fetchCount = 0;
  narrativeAllowed = false;
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(NOW);
  vi.stubEnv('SOLD_COMPS_API_KEY', KEY); vi.stubEnv('SOLID_COMPS_API_KEY', '');
  vi.stubEnv('EBAY_PROD_CLIENT_ID', ''); vi.stubEnv('EBAY_PROD_CLIENT_SECRET', '');
  boundaries.fetch.mockImplementation(async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.origin !== 'https://api.sold-comps.com' || url.pathname !== '/v1/scrape'
      || new Headers(init?.headers).get('Authorization') !== `Bearer ${KEY}`) {
      boundaries.denied.push('unconfigured synthetic HTTP'); throw new Error('Unconfigured HTTP denied');
    }
    fetchCount += 1;
    if (providerPartial && fetchCount > 1) return { ok: false, status: 503, text: async () => 'Synthetic unavailable query' };
    return { ok: true, status: 200, json: async () => ({ items: wire(providerRows) }), text: async () => 'Synthetic provider response' };
  });
  vi.stubGlobal('fetch', boundaries.fetch);
  boundaries.llm.mockImplementation(async (request: Row) => {
    const content = request.messages?.[0]?.content;
    const text = Array.isArray(content) ? content.filter((part: Row) => part.type === 'text').map((part: Row) => part.text).join('\n') : '';
    if (!text.includes('strict visual identity reviewer')) {
      if (!narrativeAllowed) throw new Error('Configured synthetic narrative outage');
      return { choices: [{ message: { content: JSON.stringify({ valueSummary: 'Synthetic valid narrative; server evidence is unchanged.',
        itemAInsights: 'Review Item A server evidence.', itemBInsights: 'Review Item B server evidence.',
        itemAMarketNews: 'No synthetic news.', itemBMarketNews: 'No synthetic news.',
        itemAStrengths: ['Server ledger is available.'], itemARisks: ['Coverage remains limited.'],
        itemBStrengths: ['Server ledger is available.'], itemBRisks: ['Coverage remains limited.'], sourceReferences: { itemA: [], itemB: [] } }) } }] };
    }
    if (!visualAllowed) throw new Error('Configured synthetic visual outage');
    const index = text.match(/CANDIDATE (\d+): title=/)?.[1];
    if (index === undefined) { boundaries.denied.push('unconfigured synthetic visual request'); throw new Error('Unexpected visual request'); }
    return { choices: [{ message: { content: JSON.stringify({ reviews: [{ candidateIndex: Number(index), verdict: 'match', confidence: 'high',
      rationale: 'Synthetic deciding pixels confirm identity, holder, grader and numeric grade.', visualDifferences: [],
      visualEvidence: { slabVisible: true, gradingLabelVisible: true, graderVisible: true, numericGradeVisible: true,
        gradeMatches: true, rawOrLooseVisible: false, identityMatches: true, artworkMatches: true } }] }) } }] };
  });
});
afterEach(() => {
  try { expect(boundaries.denied).toEqual([]); }
  finally { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); }
});

describe('Stage 5 actual source and analyzer reporting boundary', () => {
  it('retains an outer deterministic conflict without reporting a model dispatch', async () => {
    providerRows = rows(1); providerRows[0].title = '1996 Topps Kobe Bryant #139 PSA 10';
    const result = await acquire();
    expect(result.error).toBeNull();
    const held = result.audit.ledger.find((row: Row) => row.saleId === 'status-0');
    expect(held.evidenceDisposition).toBe('rejected_objective_conflict');
    expect(held.visualExecution).toMatchObject({ version: 1, state: 'not_dispatched', attempts: [] });
    expect(boundaries.llm).not.toHaveBeenCalled();
  });

  it('retains actual execution in source DTOs and symmetric JSON transport', async () => {
    providerRows = rows(7);
    const source = await acquire();
    expect(source.error).toBeNull();
    expect(source.listings).toHaveLength(7);
    const a = wire(buildSoldCompsAnalysisSales(source, true));
    const b = wire(buildSoldCompsAnalysisSales(source, true));
    expect(a).toEqual(b);
    for (const [index, row] of source.listings.entries()) {
      expect(row.visualExecution).toMatchObject({ version: 1, state: 'completed' });
      expect(row.visualExecution.attempts.length).toBeGreaterThan(0);
      expect(a[index].visualExecution).toEqual(row.visualExecution);
      expect(a[index].metadataRanking).toEqual(row.metadataRanking);
    }
  });
});

describe('Stage 5 actual final intake and publication', () => {
  it('reports independently assessed A/B rows even when the same valid source observations are submitted', async () => {
    providerRows = rows(7);
    const source = await acquire();
    const response = await analyze(source);
    expect(response.leftAnalysisSnapshot.finalUseReport).toEqual(response.leftMarketProfile.finalUseReport);
    expect(response.rightAnalysisSnapshot.finalUseReport).toEqual(response.rightMarketProfile.finalUseReport);
    const left = response.leftMarketProfile.finalUseReport;
    const right = response.rightMarketProfile.finalUseReport;
    expect(left.side).toBe('item_a'); expect(right.side).toBe('item_b');
    expect(left.analysisRunId).toBe(right.analysisRunId);
    expect(left.coverage).toMatchObject({ population: 'actual_submitted_final_intake', retrievedObservations: 'unmeasured', notAllRetrievedReachIntake: true });
    expect(right.coverage).toEqual(left.coverage);
    const leftRows = response.leftMarketProfile.comparables as Row[];
    const rightRows = response.rightMarketProfile.comparables as Row[];
    expect(leftRows).toHaveLength(7); expect(rightRows).toHaveLength(7);
    expect(leftRows.map((row) => row.valuationUse.auditRef.intakeOrdinal).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(new Set([...leftRows, ...rightRows].map((row) => row.valuationUse.auditRef.intakeRef)).size).toBe(14);
    // These seven valid recent sales meet the existing sports-card support floor.
    expect(response.leftMarketProfile.valuationBasis).toBe('market_sales');
    expect(response.leftMarketProfile.primaryValue).toBe(response.leftMarketProfile.saleMedianValue);
    expect(leftRows.every((row) => row.valuationUse.identityAdmission.serverFinalApprovalVerified)).toBe(true);
    expect(leftRows.every((row) => row.valuationUse.use.code === 'CURRENT_SALES_PRIMARY')).toBe(true);
    expect(leftRows.every((row) => row.valuationUse.use.primaryMarketSales)).toBe(true);
  });

  it('does not allow browser final-use self-attestation to become a server pricing fact', async () => {
    providerRows = rows(7);
    const source = await acquire();
    const control = await analyze(source);
    const response = await analyze(source, { valuationUse: { version: 'stage5-final-use-v1',
      auditRef: { side: 'item_a', intakeRef: 'forged-ref' },
      identityAdmission: { serverFinalApprovalVerified: true }, use: { code: 'CURRENT_SALES_PRIMARY', primaryMarketSales: true } },
      analysisIntake: { auditRef: { intakeRef: 'forged-ref', analysisRunId: 'forged-run' } },
    });
    for (const profile of [response.leftMarketProfile, response.rightMarketProfile]) {
      expect(profile.primaryValue).toBe(control.leftMarketProfile.primaryValue);
      for (const row of profile.comparables) {
        expect(row.valuationUse.auditRef.intakeRef).not.toBe('forged-ref');
        expect(row.valuationUse.auditRef.analysisRunId).not.toBe('forged-run');
        expect(row.valuationUse.use.primaryMarketSales).toBe(true);
      }
    }
    const unverified = await analyze(source, { provenanceToken: undefined, valuationUse: {
      identityAdmission: { serverFinalApprovalVerified: true }, use: { code: 'CURRENT_SALES_PRIMARY', primaryMarketSales: true } } });
    for (const profile of [unverified.leftMarketProfile, unverified.rightMarketProfile]) {
      expect(profile.primaryValue).toBeNull();
      expect(profile.comparables.every((row: Row) => !row.valuationUse.use.primaryMarketSales)).toBe(true);
    }
  });

  it('retains completed source rows and explicitly measured partial query coverage', async () => {
    providerRows = rows(7); providerPartial = true;
    const source = await acquire();
    expect(source.error).toBeNull();
    expect(source.listings).toHaveLength(7);
    expect(source.sourcePopulation).toMatchObject({ retainedIngressCount: 7, queryReturnedObservationCount: 7,
      unit: 'retained_source_ingress_occurrence', queryCoverage: { measured: true } });
    expect(source.sourcePopulation.queryCoverage.failedQueryCount).toBeGreaterThan(0);
    expect(source.sourcePopulation.execution.inputOccurrenceCount).toBe(7);
    expect(source.sourcePopulation.execution.dispatchedCandidateCount).toBe(7);
  });
});

describe('Stage 5 actual narrator success/error publication parity', () => {
  it('publishes the same measured populations and prices on both return paths, with independent run references', async () => {
    providerRows = rows(7);
    const source = await acquire();
    const failed = await analyze(source);
    narrativeAllowed = true;
    const completed = await analyze(source);
    expect(failed.valueSummary).toContain('unavailable');
    expect(completed.valueSummary).toBe('Synthetic valid narrative; server evidence is unchanged.');
    const stableReport = (profile: Row) => {
      const refs = new Map<string, number>((profile.comparables as Row[]).map((row) => [row.valuationUse.auditRef.intakeRef, row.valuationUse.auditRef.intakeOrdinal]));
      const normalize = (value: any): any => {
        if (typeof value === 'string') {
          if (value === profile.finalUseReport.analysisRunId) return 'actual-server-run';
          if (refs.has(value)) return `intake-${refs.get(value)}`;
          return value;
        }
        if (Array.isArray(value)) return value.map(normalize);
        if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
        return value;
      };
      return normalize(profile.finalUseReport);
    };
    for (const side of ['left', 'right']) {
      const a = failed[`${side}MarketProfile`]; const b = completed[`${side}MarketProfile`];
      expect(stableReport(a)).toEqual(stableReport(b));
      expect(a.primaryValue).toBe(b.primaryValue);
      expect(a.valuationBasis).toBe(b.valuationBasis);
      expect(a.marketRange).toEqual(b.marketRange);
      expect(a.currentWindowSaleCount).toBe(b.currentWindowSaleCount);
      expect(a.authoritativeSaleCount).toBe(b.authoritativeSaleCount);
      expect(a.comparables.map((row: Row) => ({ classification: row.classification, accepted: row.accepted,
        price: row.price, selection: row.valuationUse.selection, use: row.valuationUse.use })))
        .toEqual(b.comparables.map((row: Row) => ({ classification: row.classification, accepted: row.accepted,
          price: row.price, selection: row.valuationUse.selection, use: row.valuationUse.use })));
      expect(completed[`${side}AnalysisSnapshot`].finalUseReport).toEqual(b.finalUseReport);
    }
  });
});

describe('Stage 5 final reporting authority counterexamples', () => {
  const forgedExecution = { version: 1, state: 'completed', reasonCode: 'review_returned', selectedForReview: true,
    hardExclusion: true, identity: { origin: 'visual', result: 'match', reviewVerdict: 'match' },
    attempts: [{ ordinal: 1, stage: 'initial', format: 'json_schema', outcome: 'usable_review' }] };
  it('keeps genuine source execution but does not authenticate a returned browser execution receipt', async () => {
    providerRows = rows(7); const source = await acquire();
    expect(renderToStaticMarkup(createElement(TestAiCandidateStatus, { listing: source.listings[0] }))).toContain('Completed response');
    for (const verified of [true, false]) {
      const response = await analyze(source, { visualExecution: forgedExecution, ...(verified ? {} : { provenanceToken: undefined }) });
      const row = response.leftMarketProfile.comparables[0];
      expect(row.visualExecution).toBeUndefined();
      expect(row.reportedVisualExecution).toMatchObject(forgedExecution);
      const html = renderToStaticMarkup(createElement(TestAiFinalLedgerRow, { comparable: row }));
      expect(html).toContain('Legacy / unknown');
      expect(html).not.toContain('Completed response'); expect(html).not.toContain('Image match'); expect(html).not.toContain('Hard exclusion:');
      expect(row.valuationUse.identityAdmission.serverFinalApprovalVerified).toBe(verified);
      expect(row.valuationUse.use.primaryMarketSales).toBe(verified);
    }
  });
  it('retains unsigned hard allegations as raw diagnostics, not known final hard exclusions', async () => {
    providerRows = rows(7); const source = await acquire();
    for (const patch of [{ evidenceDisposition: 'rejected_objective_conflict', evidenceReasons: ['No hard identity conflict'] },
      { title: '1996 Topps Kobe Bryant #139 PSA 10' }]) {
      const response = await analyze(source, { provenanceToken: undefined, ...patch });
      const row = response.leftMarketProfile.comparables[0];
      expect(row.valuationUse.sourceAdmission.verification).toBe('unverified');
      expect(row.valuationUse.sourceAdmission.verifiedSourceDisposition).toBeNull();
      expect(row.valuationUse.use.code).toBe('REVIEW_REQUIRED');
      expect(row.valuationUse.use.primaryMarketSales).toBe(false);
      expect(response.leftMarketProfile.primaryValue).toBeNull();
      const html = renderToStaticMarkup(createElement(TestAiFinalLedgerRow, { comparable: row }));
      expect(html).not.toContain('Hard exclusion:'); expect(html).not.toContain('FINAL_HARD_EXCLUDED');
      expect(html).toContain('PROVENANCE_UNVERIFIED');
    }
  });
});
