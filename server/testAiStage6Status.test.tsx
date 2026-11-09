import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TestAiRetrievalLadder } from '../client/src/components/TestAiRetrievalLadder';
import { TestAiProcessCompleteNotice, TestAiSourcePopulationSummary } from '../client/src/components/TestAiCandidateStatus';
import { sourceRetrievalCoverage, sourceRetrievalRows } from '../shared/testAiSourceDisplay';
import { buildSourcePopulationReport } from './testAiSourcePopulation';
import { retrieveItemsAttempt, unavailableRetrievalAttempt, retrievalIssue } from '../shared/testAiRetrievalAttempt';

const population = { populationId: 'stage6-partial-run', sourceId: 'sold_comps', bindings: [] };
describe('Stage 6 existing source coverage render boundary', () => {
  it('keeps unreadable raw counts unmeasured separately from known returned observations', () => {
    const attempts = [{ query: 'primary', status: 'success', received: 4 }, { query: 'fallback', status: 'error', received: null, outcome: 'invalid_json' }];
    const report = buildSourcePopulationReport(population, [], attempts);
    expect(report.queryReturnedObservationCount).toBeNull();
    expect(report.knownQueryReturnedObservationCount).toBe(4);
    expect(report.queryCoverage).toMatchObject({ rawCountsComplete: false, executedQueryCount: 2, failedQueryCount: 1 });
    const html = renderToStaticMarkup(<><TestAiSourcePopulationSummary packet={report} /><TestAiProcessCompleteNotice data={{ sourcePopulation: report }} /></>);
    expect(html).toContain('query-return observations: unmeasured');
    expect(html).toContain('partial/error');
    expect(html).toContain('known returned rows retained');
  });
  it('reads surviving search metrics and additive partial status even when fatal error is null', () => {
    const attempts = [{ query: 'first', status: 'error', received: null }, { query: 'second', status: 'success', received: 1 }];
    const data = { error: null, listings: [{ title: 'Retained candidate' }], metrics: null, searchMetrics: { retrievalCoverage: attempts }, partialRetrieval: true };
    expect(sourceRetrievalRows(data)).toBe(attempts);
    expect(sourceRetrievalCoverage(data)).toMatchObject({ partial: true, partialRetrieval: true, failedQueryCount: 1, executedQueryCount: 2 });
    const html = renderToStaticMarkup(<><TestAiRetrievalLadder data={data} sourceLabel="Mercari" marketplace="Mercari" /><TestAiProcessCompleteNotice data={data} /></>);
    expect(html).toContain('first'); expect(html).toContain('second'); expect(html).toContain('unmeasured');
    expect(html).not.toContain('Only the primary query ran');
    expect(html).toContain('before metadata ranking, image review or pricing eligibility');
  });
  it('takes one actual attempt channel, never counts duplicated audit/metric projections twice', () => {
    const attempts = [{ query: 'one', status: 'success', received: 0, outcome: 'not_found' }];
    const data = { audit: { retrievalCoverage: attempts }, retrievalCoverage: attempts, metrics: { retrievalCoverage: attempts } };
    expect(sourceRetrievalCoverage(data)).toMatchObject({ executedQueryCount: 1, failedQueryCount: 0, partialRetrieval: false });
    const html = renderToStaticMarkup(<TestAiRetrievalLadder data={data} sourceLabel="Source" />);
    expect((html.match(/data-retrieval-outcome=/g) ?? []).length).toBe(1);
    expect(html).toContain('returned count: 0');
  });
  it('does not claim primary success or zero matches for unavailable/unrecorded acquisition', () => {
    const html = renderToStaticMarkup(<TestAiRetrievalLadder data={{ error: 'Configuration unavailable', metrics: {} }} sourceLabel="Source" />);
    expect(html).toContain('No provider query execution was recorded.');
    expect(html).not.toContain('returned provider records');
    expect(html).not.toContain('count: 0');
  });
  it('renders actual mixed-row receipt counts and preserves valid metadata without claiming all records valid', async () => {
    const valid = { id: 'valid', title: 'Valid source row', price: 25, itemSpecifics: { Game: 'Zelda' } };
    const result = await retrieveItemsAttempt(async () => ({ ok: true, status: 200, json: async () => ({ items: [valid, { id: 'bad', title: {}, price: true }] }) }),
      { query: 'actual synthetic request', stage: 'search', attempt: 1 }, { idFields: ['id'], titleFields: ['title'], priceFields: ['price'] });
    expect(result.items).toEqual([valid]); expect(result.items[0]).toBe(valid);
    expect(result.receipt).toMatchObject({ outcome: 'success_records', received: 2, accepted: 1, rejected: 1 });
    const issue = retrievalIssue(result.receipt); expect(issue).not.toBeNull();
    const data = { retrievalCoverage: [result.receipt], attemptIssues: [issue], error: null, partial: true };
    const html = renderToStaticMarkup(<><TestAiRetrievalLadder data={data} sourceLabel="Source" /><TestAiProcessCompleteNotice data={data} /></>);
    expect(html).toContain('valid provider rows: 1'); expect(html).toContain('rejected provider rows: 1');
    expect(html).toContain('invalid_title: 1'); expect(html).toContain('invalid_price: 1');
    expect(html).toContain('partial/error'); expect(html).not.toContain('not_found');
  });
  it('actual configuration-unavailable receipt is not counted or displayed as an executed primary request', () => {
    const receipt = unavailableRetrievalAttempt({ query: 'not sent', stage: 'search', attempt: 1 }, 'config_unavailable');
    const report = buildSourcePopulationReport(population, [], [receipt]);
    expect(report.queryCoverage).toMatchObject({ executedQueryCount: 0, failedQueryCount: 0, unavailableAttemptCount: 1 });
    expect(report.queryReturnedObservationCount).toBeNull();
    expect(sourceRetrievalCoverage({ retrievalCoverage: [receipt] })).toMatchObject({ executedQueryCount: 0, failedQueryCount: 0, partialRetrieval: true });
    const html = renderToStaticMarkup(<TestAiRetrievalLadder data={{ retrievalCoverage: [receipt] }} sourceLabel="Source" />);
    expect(html).toContain('Not executed'); expect(html).toContain('config_unavailable');
    expect(html).toContain('unmeasured'); expect(html).not.toContain('Primary:');
  });
});

describe('Stage 6 normalization loss and unavailable introduction', () => {
  it('normalization loss remains partial without pretending the successful HTTP request failed', async () => {
    const result = await retrieveItemsAttempt(async () => ({ ok: true, status: 200, json: async () => ({ items: [{ id: '1', title: 'Valid provider row', price: 25 }] }) }),
      { query: 'primary', stage: 'search', attempt: 1 }, { idFields: ['id'], titleFields: ['title'], priceFields: ['price'] });
    const receipt = { ...result.receipt, normalized: 0, normalizationRejected: 1 };
    const data = { retrievalCoverage: [receipt], error: null };
    expect(sourceRetrievalCoverage(data)).toMatchObject({ failedQueryCount: 0, partialRetrieval: true });
    const html = renderToStaticMarkup(<><TestAiRetrievalLadder data={data} sourceLabel="Mercari" /><TestAiProcessCompleteNotice data={data} /></>);
    expect(html).toContain('normalization losses: 1'); expect(html).toContain('partial/error');
    expect(html).not.toContain('not_found');
  });
  it('unavailable receipts and legacy names never claim actual completed or executed queries', () => {
    const receipt = unavailableRetrievalAttempt({ query: 'not sent', stage: 'search', attempt: 1 }, 'config_unavailable');
    const unavailable = renderToStaticMarkup(<TestAiRetrievalLadder data={{ retrievalCoverage: [receipt] }} sourceLabel="Source" />);
    expect(unavailable).toContain('marked not executed'); expect(unavailable).not.toContain('Actual completed attempts');
    const legacy = renderToStaticMarkup(<TestAiRetrievalLadder data={{ metrics: { executedQueries: ['legacy'] } }} sourceLabel="Source" />);
    expect(legacy).toContain('execution and outcomes are unconfirmed');
  });
});
