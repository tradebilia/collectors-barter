import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { testAiAnalysisLifecycleKey, isCurrentTestAiFinalRequest, type TestAiAnalysisLifecycleInputs } from '../shared/testAiAnalysisLifecycle';
import { candidateDisplayKey, collectEbayCandidateDisplayOccurrences, mergeCandidateDisplayGroups, retainCandidateDisplayOccurrence, stampCandidateDisplayIntake, reconcileCandidateFinalUse, type CandidateFinalDisplayOutcome } from '../shared/testAiCandidateLedger';
import { sourceMetricDisplay, sourceRetrievalCoverage, sourceRecordBucketLabel } from '../shared/testAiSourceDisplay';
import { normalizeTestAiEvidence } from '../shared/testAiEvidenceNormalization';
import { isHardCandidateDisplayException } from '../shared/testAiCandidateStatus';
import { TestAiCandidateDisplayProvider, TestAiCandidateStatus, TestAiProcessCompleteNotice, TestAiSourcePopulationSummary, TestAiSourceMetricSummary, TestAiSourceCurrentWindowCount } from '../client/src/components/TestAiCandidateStatus';
import { TestAiCandidateMasterList } from '../client/src/components/TestAiCandidateMasterList';

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function lifecycle(): TestAiAnalysisLifecycleInputs {
  return {
    leftTarget: { selected: { id: 1, certId: '123', category: 'coins' }, effective: { id: 1, certId: '123', title: '1900 Morgan Dollar', category: 'coins', grade: 'MS65', certificationCompany: 'PCGS', itemDetails: JSON.stringify({ year: '1900', denomination: 'Dollar' }) } },
    rightTarget: { selected: { id: 2 }, effective: { id: 2, title: 'Other item' } },
    leftSources: new Set(['pcgs', 'hipstamp']), rightSources: new Set(['sold_comps']),
    leftSourceInputs: { pcgs: { data: { auctions: [{ price: 100, currency: 'USD' }], certNo: '123' } }, hipstamp: { metrics: { count: 1, avg: 100 } }, goldin: [] },
    rightSourceInputs: { sold_comps: { listings: [{ title: 'Other item', price: 200 }], sourcePopulation: { populationId: 'source-run' } }, goldin: [] },
    leftEvidenceSummary: { alignedSources: [{ id: 'pcgs' }], reviewFlags: [] }, rightEvidenceSummary: { alignedSources: [], reviewFlags: [] },
    useImageAnalyzer: true, useVisualFieldCompletion: true, cashAmount: '', cashPaidBy: 'item_a', marketNews: null,
  };
}
function finalOutcome(submitted: any[], runId = 'request-current'): CandidateFinalDisplayOutcome {
  return { side: 'item_a', requestRunId: runId, analysisRunId: 'server-current', submitted,
    finalRows: submitted.map((row, ordinal) => ({ valuationUse: {
      version: 'stage5-final-use-v1', sourceAdmission: { verification: 'verified' },
      auditRef: { side: 'item_a', analysisRunId: 'server-current', intakeOrdinal: ordinal,
        displayCorrelation: copy(row.displayCorrelation), verifiedObservationId: row.observationId ?? null,
        sourceCorrelation: { metadataOriginOccurrenceKey: row.metadataOriginOccurrenceKey ?? null } },
      identityAdmission: { accepted: true, basis: 'title_evidence' }, use: { code: 'CURRENT_SALES_PRIMARY', primaryMarketSales: true },
    } })) };
}
const canonical = (run = 'run-current', source = 'source') => ({ observationId: 'same-observation', sourceId: source,
  metadataRanking: { sourceId: source, populationId: run }, title: 'Same title', price: 100 });

describe('Stage 5 review closure: actual page lifecycle key (no page/hook imports)', () => {
  it('keeps a published result and receipt valid after value-equivalent synthesized PCGS parent recreation', () => {
    const first = lifecycle();
    const key = testAiAnalysisLifecycleKey(first);
    const submitted = stampCandidateDisplayIntake([{ metadataOriginOccurrenceKey: 'pcgs:source-run:occ:0', title: 'Coin', price: 100, currency: 'USD' }], 'item_a', 'request-current');
    const outcome = finalOutcome(submitted);
    const receipt = { runId: 'request-current', lifecycleKey: key };
    // These are the actual page's key/reset predicate and onSuccess guard,
    // not a substitute import of TestAI's router/auth/provider graph.
    const recreated = { ...first, leftTarget: copy(first.leftTarget), rightTarget: copy(first.rightTarget),
      leftSourceInputs: copy(first.leftSourceInputs), rightSourceInputs: copy(first.rightSourceInputs),
      leftEvidenceSummary: copy(first.leftEvidenceSummary), rightEvidenceSummary: copy(first.rightEvidenceSummary),
      leftSources: new Set(['hipstamp', 'pcgs']), rightSources: new Set(['sold_comps']) };
    const nextKey = testAiAnalysisLifecycleKey(recreated);
    expect(nextKey).toBe(key); // actual page reset effect depends only on this string
    expect(isCurrentTestAiFinalRequest(receipt, 'request-current', nextKey)).toBe(true);
    const html = renderToStaticMarkup(<TestAiCandidateDisplayProvider side="item_a" outcome={outcome}><TestAiCandidateMasterList listings={submitted} sourceLabel="PCGS" /></TestAiCandidateDisplayProvider>);
    expect(html).toContain('Used to support primary sales valuation');
  });
  it('rejects genuine target/source run changes and old mutation variables even before the reset effect', () => {
    const original = lifecycle(), key = testAiAnalysisLifecycleKey(original), receipt = { runId: 'current', lifecycleKey: key };
    const target = { ...original, leftTarget: { ...original.leftTarget as any, effective: { ...(original.leftTarget as any).effective, grade: 'MS66' } } };
    const source = { ...original, rightSourceInputs: { ...original.rightSourceInputs, sold_comps: { sourcePopulation: { populationId: 'next-source-run' } } } };
    for (const changed of [target, source, { ...original, leftSources: new Set(['pcgs']) }, { ...original, cashAmount: '50' }, { ...original, useImageAnalyzer: false }]) {
      expect(isCurrentTestAiFinalRequest(receipt, 'current', testAiAnalysisLifecycleKey(changed))).toBe(false);
    }
    expect(isCurrentTestAiFinalRequest(receipt, 'older-mutation', key)).toBe(false);
    expect(isCurrentTestAiFinalRequest(null, 'current', key)).toBe(false);
  });
  it('includes transported HIPStamp metrics, evidence/material gates, image controls and news', () => {
    const original = lifecycle(), key = testAiAnalysisLifecycleKey(original);
    const changes: TestAiAnalysisLifecycleInputs[] = [
      { ...original, leftSourceInputs: { ...original.leftSourceInputs, hipstamp: { metrics: { count: 1, avg: 200 } } } },
      { ...original, leftEvidenceSummary: { alignedSources: [], reviewFlags: [{ kind: 'material', message: 'Grade conflict' }] } },
      { ...original, useVisualFieldCompletion: false }, { ...original, marketNews: { itemA: [{ id: 'changed' }] } },
    ];
    changes.forEach((changed) => expect(testAiAnalysisLifecycleKey(changed)).not.toBe(key));
    expect(testAiAnalysisLifecycleKey({ ...original, leftSourceInputs: { ...original.leftSourceInputs, disabled_source: { changed: true } } })).toBe(key);
  });
});

describe('Stage 5 review closure: namespace, no-ID and exact receipt joins', () => {
  it('does not attach old-run or other-source canonical terminal use; matching known namespace resolves', () => {
    const submitted = stampCandidateDisplayIntake([canonical('run-old')], 'item_a', 'request-current'), outcome = finalOutcome(submitted);
    for (const row of [canonical('run-current'), canonical('run-old', 'other-source'), { observationId: 'same-observation', sourceId: 'source' }]) {
      const result = reconcileCandidateFinalUse([row], outcome, { side: 'item_a' })[0];
      expect(result).not.toHaveProperty('valuationUse'); expect(result.candidatePricingLink).toBe('unresolved');
    }
    expect(reconcileCandidateFinalUse([canonical('run-old')], outcome, { side: 'item_a' })[0].valuationUse.use.code).toBe('CURRENT_SALES_PRIMARY');
    outcome.finalRows[0].valuationUse.auditRef.verifiedObservationId = 'different';
    expect(reconcileCandidateFinalUse([canonical('run-old')], outcome, { side: 'item_a' })[0].candidatePricingLink).toBe('submitted_unresolved');
  });
  it('independent no-ID merge groups remain distinct and preserved copies survive subset/reordering', () => {
    const a = { sourceId: 'source', metadataRanking: { populationId: 'run' }, title: 'Same', price: 100 };
    const b = { ...a, metadataRanking: { populationId: 'run' } };
    const first = mergeCandidateDisplayGroups([[a]]), second = mergeCandidateDisplayGroups([[b]]);
    expect(candidateDisplayKey(first[0])).not.toBe(candidateDisplayKey(second[0]));
    expect(mergeCandidateDisplayGroups([first, second])).toHaveLength(2);
    const preserved = [retainCandidateDisplayOccurrence(a), retainCandidateDisplayOccurrence(b)];
    expect(mergeCandidateDisplayGroups([preserved, copy([...preserved].reverse())])).toHaveLength(2);
    const data = { listings: [a, b] };
    expect(mergeCandidateDisplayGroups([collectEbayCandidateDisplayOccurrences(data), collectEbayCandidateDisplayOccurrences(data)])).toHaveLength(2);
    const known = { ...a, metadataOriginOccurrenceKey: 'source:run:occ:1' };
    expect(mergeCandidateDisplayGroups([[known], [{ ...known, imageUrl: 'rich' }]])).toHaveLength(1);
  });
  it('stamped no-origin/no-canonical rows join exact source/run/occurrence/ordinal and reject every mismatch', () => {
    const submitted = stampCandidateDisplayIntake([{ sourceId: 'source', title: 'Same', price: 100 }, { sourceId: 'source', title: 'Same', price: 100 }], 'item_a', 'request-current');
    const outcome = finalOutcome(submitted);
    const joined = reconcileCandidateFinalUse(copy([...submitted].reverse()), outcome, { side: 'item_a' });
    expect(joined.map((row) => row.valuationUse.auditRef.intakeOrdinal)).toEqual([1, 0]);
    for (const field of ['sourceId', 'runId', 'occurrenceKey', 'requestOccurrenceRef', 'side']) {
      const bad = copy(outcome); bad.finalRows[0].valuationUse.auditRef.displayCorrelation[field] = 'wrong';
      expect(reconcileCandidateFinalUse(submitted, bad, { side: 'item_a' })[0]).not.toHaveProperty('valuationUse');
    }
    const wrongOrdinal = copy(outcome); wrongOrdinal.finalRows[0].valuationUse.auditRef.intakeOrdinal = 1;
    expect(reconcileCandidateFinalUse(submitted, wrongOrdinal, { side: 'item_a' })[0]).not.toHaveProperty('valuationUse');
    const old = copy(submitted); old[0].displayCorrelation.requestOccurrenceRef = 'old:item_a:intake:0';
    expect(reconcileCandidateFinalUse(old, outcome, { side: 'item_a' })[0]).not.toHaveProperty('valuationUse');
    expect(reconcileCandidateFinalUse(submitted, outcome, { side: 'item_b' })[0]).not.toHaveProperty('valuationUse');
  });
  it('equal terminal histories do not invent a later deciding invocation from rationale or array richness', () => {
    const execution = { version: 1, state: 'completed', attempts: [{ ordinal: 1, stage: 'initial', outcome: 'usable_review' }] };
    const first = { metadataOriginOccurrenceKey: 'source:run:occ:1', visualExecution: execution, visualReviewStatus: 'match', visualAudit: { decidingRationale: 'first producer projection' } };
    const unproven = { ...first, visualReviewStatus: 'mismatch', visualAudit: { decidingRationale: 'richer text is not a report revision' } };
    expect(mergeCandidateDisplayGroups([[first, unproven]])[0].visualReviewStatus).toBe('match');
    // Actual producer report-revision evidence is still required to resolve this gap.
  });
});

describe('Stage 5 review closure: source currency, role and retained partial coverage rendering', () => {
  const metrics = { count: 2, avg: 200, median: 200, min: 100, max: 300, confidence: 'high' };
  it('withholds mixed/unknown currencies and anonymous metrics without altering input metrics or confidence', () => {
    const before = copy(metrics);
    const populations = [undefined, [{ price: 100, currency: 'CAD', priceBasis: 'sold' }, { price: 300, currency: 'USD', priceBasis: 'sold' }],
      [{ price: 100, priceBasis: 'sold' }, { price: 300, currency: 'USD', priceBasis: 'sold' }],
      [{ price: 100, currency: 'USD' }, { price: 300, currency: 'USD' }]];
    for (const members of populations) {
      expect(sourceMetricDisplay(metrics, members).verified).toBe(false);
      const html = renderToStaticMarkup(<TestAiSourceMetricSummary metrics={metrics} members={members} sourceLabel="Sold-Comps" role="Completed source context" />);
      expect(html).toContain('2 priced observations'); expect(html).toContain('Currency/basis unresolved'); expect(html).toContain('Withheld'); expect(html).toContain('Legacy confidence'); expect(html).toContain('HIGH');
      expect(html).not.toContain('$200'); expect(html).not.toContain('USD 200'); expect(html).not.toContain('CAD 200');
    }
    expect(metrics).toEqual(before);
  });
  it('formats an unchanged aggregate only with complete homogeneous currency and basis members', () => {
    const usd = [{ price: 100, currency: 'USD', priceBasis: 'sold' }, { price: 300, currency: 'USD', priceBasis: 'sold' }];
    expect(sourceMetricDisplay(metrics, usd)).toMatchObject({ verified: true, avg: 'USD 200', currency: 'USD', basis: 'sold' });
    expect(sourceMetricDisplay(metrics, usd.map((row) => ({ ...row, currency: 'CAD' }))).avg).toBe('CAD 200');
    expect(sourceMetricDisplay(metrics, [usd[0]])).toMatchObject({ verified: false, avg: 'Withheld' });
    expect(sourceMetricDisplay(metrics, [usd[0], { ...usd[1], priceBasis: 'asking' }]).verified).toBe(false);
  });
  it('anonymous normalized source arrays supply observation counts only, never average/median/range', () => {
    const normalized = normalizeTestAiEvidence({ title: 'Signed object', category: 'autographs' }, [{ id: 'sold_comps', label: 'Sold-Comps', kind: 'market_completed', status: 'success',
      market: { completedSaleCount: 2, analyzerSubmittedSaleCount: 2, analyzerSubmittedPrices: [100, 300], currentValueSaleCount: 2, currentValuePrices: [100, 300], historicalTrendPrices: [] } }]);
    const summary = normalized.marketEvidencePriceSummaries!.join(' ');
    expect(summary).toContain('2 priced observations'); expect(summary).toContain('aggregate not shown'); expect(summary).not.toMatch(/average|median|range 100/);
    expect(normalized.sourceDecisions![0].acceptedPrices).toEqual([100, 300]); // unchanged financial transport
  });
  it('completed and historical sources render current-window candidates, active sources asking context', () => {
    for (const kind of ['market_completed', 'market_historical']) {
      const html = renderToStaticMarkup(<TestAiSourceCurrentWindowCount count={1} kind={kind} />);
      expect(html).toContain('current-window source candidates'); expect(html).not.toContain('asking-price');
    }
    expect(renderToStaticMarkup(<TestAiSourceCurrentWindowCount count={1} kind="market_current" />)).toContain('asking-price context');
    expect(sourceRecordBucketLabel('current_value', 'market_completed')).toBe('Source-stage current window');
    expect(sourceRecordBucketLabel('current_value', 'market_current')).toBe('Source-stage asking context');
  });
  it('failed retrieval query stays partial while complete execution over retained ingress and rows remain visible', () => {
    const packet = { sourceId: 'sold_comps', populationId: 'run-current', retainedIngressCount: 1, queryReturnedObservationCount: 1,
      queryCoverage: { measured: true, executedQueryCount: 2, failedQueryCount: 1, note: 'Query observations may overlap' },
      execution: { dispatchedCandidateCount: 1, responseReviewedCandidateCount: 1, coverage: 'complete' } };
    const rows = [{ metadataOriginOccurrenceKey: 'sold_comps:run-current:occ:0', title: 'Retained success', price: 100, currency: 'CAD' }];
    const data = { listings: rows, sourcePopulation: packet }; // no top-level error
    expect(sourceRetrievalCoverage(data).partialRetrieval).toBe(true);
    const html = renderToStaticMarkup(<><TestAiProcessCompleteNotice data={data} /><TestAiSourcePopulationSummary packet={packet} /><TestAiCandidateMasterList listings={rows} sourceLabel="Sold-Comps" /></>);
    expect(html).toContain('partial/error'); expect(html).toContain('failed queries: 1'); expect(html).toContain('executed queries: 2');
    expect(html).toContain('execution coverage complete (known ingress only; not retrieval coverage)');
    expect(html).toContain('Retained success'); expect(html).toContain('CAD 100'); expect(html).not.toContain('Process complete');
    expect(sourceRetrievalCoverage({ audit: { retrievalCoverage: [{ status: 'success' }, { status: 'error' }] } }).failedQueryCount).toBe(1);
  });
  it('final verified hard-use code alone controls final hard exception; genuine source receipt behavior stays separate', () => {
    const raw = { evidenceDisposition: 'rejected_objective_conflict', visualExecution: { version: 1, hardExclusion: true, attempts: [] } };
    expect(isHardCandidateDisplayException(raw)).toBe(true);
    const final = { ...raw, valuationUse: { sourceAdmission: { verification: 'unverified' }, use: { code: 'REVIEW_REQUIRED' } } };
    expect(isHardCandidateDisplayException(final)).toBe(false);
    expect(renderToStaticMarkup(<TestAiCandidateStatus listing={final} reconciled />)).not.toContain('Hard exclusion:');
    expect(isHardCandidateDisplayException({ ...final, valuationUse: { sourceAdmission: { verification: 'unverified' }, use: { code: 'FINAL_HARD_EXCLUDED' } } })).toBe(false);
    expect(isHardCandidateDisplayException({ ...final, valuationUse: { sourceAdmission: { verification: 'verified' }, use: { code: 'FINAL_HARD_EXCLUDED' } } })).toBe(true);
  });
});
