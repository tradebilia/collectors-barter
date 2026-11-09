import { describe, expect, it } from 'vitest';
import { buildSourcePopulationReport } from './testAiSourcePopulation';
import { createNotDispatchedVisualExecution, type VisualExecution } from '../shared/testAiVisualExecution';
import type { MetadataRankingBinding } from '../shared/testAiRankingPopulation';
const rank = (ordinal: number): MetadataRankingBinding => ({ populationId: 'run', sourceId: 'sold_comps', occurrenceKey: `o-${ordinal}`,
  ordinal, populationSize: 3, scorerRole: 'exact_comparable', score: 80, rank: ordinal + 1 });
const population = { populationId: 'run', sourceId: 'sold_comps', bindings: [rank(0), rank(1), rank(2)] };
const completed: VisualExecution = { version: 1, state: 'completed', reasonCode: 'review_returned', hardExclusion: false,
  selectedForReview: true, identity: { result: 'match', origin: 'visual', reviewVerdict: 'match' },
  attempts: [{ ordinal: 1, stage: 'initial', format: 'json_schema', outcome: 'usable_review' }] };

describe('Stage 5 report-only actual source populations', () => {
  it('keeps overlapping query observations separate from retained occurrences and counts repeated projections once', () => {
    const a = { metadataRanking: rank(0), visualRequirement: 'required', visualExecution: completed };
    const b = { metadataRanking: rank(1), visualExecution: createNotDispatchedVisualExecution('outer_metadata_hold', { hardExclusion: true }) };
    const c = { metadataRanking: rank(2), visualExecution: createNotDispatchedVisualExecution('candidate_image_unavailable') };
    const rows = [a, b, c, { ...a }, { ...b }];
    const report = buildSourcePopulationReport(population, rows, [{ received: 3, status: 'success' }, { received: 3, status: 'success' }, { received: 0, status: 'error' }]);
    expect(report.retainedIngressCount).toBe(3); expect(report.queryReturnedObservationCount).toBe(6);
    expect(report.queryCoverage).toMatchObject({ measured: true, executedQueryCount: 3, failedQueryCount: 1 });
    expect(report.execution).toMatchObject({ coverage: 'complete', emittedOccurrenceCount: 3, inputOccurrenceCount: 3,
      selectedCandidateCount: 1, dispatchedCandidateCount: 1, responseReviewedCandidateCount: 1 });
    expect(rows).toHaveLength(5); expect(a.visualExecution).toBe(completed);
  });
  it('does not manufacture query coverage when it was not measured', () => {
    const report = buildSourcePopulationReport(population, []);
    expect(report.queryReturnedObservationCount).toBeNull();
    expect(report.queryCoverage).toEqual({ measured: false });
    expect(report.execution.coverage).toBe('partial');
    expect(report.execution.inputOccurrenceCount).toBe(3);
  });
  it('does not turn a literal policy requirement into dispatch for a legacy row', () => {
    const report = buildSourcePopulationReport(population, [{ metadataRanking: rank(0), visualRequirement: 'required' }]);
    expect(report.execution).toMatchObject({ coverage: 'unknown', requiredCandidateCount: 1, dispatchedCandidateCount: 0,
      responseReviewedCandidateCount: 0, unknownExecutionCandidateCount: 1 });
  });
});
