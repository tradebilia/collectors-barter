import type { MetadataRankingPopulation } from '../shared/testAiRankingPopulation';
import { summarizeVisualExecutionOccurrences } from '../shared/testAiVisualExecution';

/** Display diagnostics only. This does not select, deduplicate or approve sales. */
export function buildSourcePopulationReport(
  population: Pick<MetadataRankingPopulation, 'populationId' | 'sourceId'> & { bindings: readonly unknown[] },
  rows: Array<Parameters<typeof summarizeVisualExecutionOccurrences>[0][number] | null | undefined>,
  queryCoverage?: ReadonlyArray<{ received: number | null; status: string; [key: string]: unknown }>,
) {
  const visibleRows = rows.filter((row): row is Parameters<typeof summarizeVisualExecutionOccurrences>[0][number] => Boolean(row));
  const measured = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
  const executed = queryCoverage?.filter((query) => query.executed !== false);
  const allCountsMeasured = Boolean(executed?.length && executed.every((query) => measured(query.received)));
  const knownQueryReturnedObservationCount = executed
    ? executed.reduce((total, query) => total + (measured(query.received) ? query.received : 0), 0) : null;
  return {
    version: 'stage5-source-population-v1' as const,
    unit: 'retained_source_ingress_occurrence' as const,
    populationId: population.populationId,
    sourceId: population.sourceId,
    retainedIngressCount: population.bindings.length,
    queryReturnedObservationCount: allCountsMeasured ? knownQueryReturnedObservationCount : null,
    knownQueryReturnedObservationCount,
    queryCoverage: queryCoverage ? {
      measured: true,
      rawCountsComplete: allCountsMeasured,
      executedQueryCount: executed?.length ?? 0,
      failedQueryCount: executed?.filter((query) => query.status === 'error').length ?? 0,
      unavailableAttemptCount: queryCoverage.filter((query) => query.executed === false).length,
      hasIssues: queryCoverage.some((query) => query.status === 'error' || (measured(query.rejected) && query.rejected > 0) || (measured(query.normalizationRejected) && query.normalizationRejected > 0)),
      note: 'Query observations can overlap; unreadable attempt counts remain unmeasured. Retained ingress reflects the existing retrieval union, not raw marketplace inventory.',
    } : { measured: false },
    execution: summarizeVisualExecutionOccurrences(visibleRows, population.bindings.length, {
      populationId: population.populationId, sourceId: population.sourceId, scope: 'source_population',
    }),
  };
}

/** A route without an exported population may report its actual retained count
 * using existing row bindings. No ranking, scoring or occurrence keys are made.
 * Missing/mixed namespaces remain explicitly unmeasured in this summary.
 */
export function buildEmittedSourcePopulationReport(
  sourceId: string,
  retainedIngressCount: number,
  rows: Array<object | null | undefined>,
  queryCoverage?: Parameters<typeof buildSourcePopulationReport>[2],
) {
  const visible = rows.filter(Boolean) as Parameters<typeof summarizeVisualExecutionOccurrences>[0];
  const bindings = visible.flatMap((row) => row.metadataRanking ? [row.metadataRanking] : []);
  const namespaces = new Set(bindings.map((binding) => JSON.stringify([binding.populationId, binding.sourceId])));
  const first = namespaces.size === 1 ? bindings[0] : undefined;
  const base = buildSourcePopulationReport({ populationId: first?.populationId ?? 'unmeasured', sourceId, bindings }, visible, queryCoverage);
  return {
    ...base,
    populationId: first?.populationId ?? null,
    retainedIngressCount,
    execution: summarizeVisualExecutionOccurrences(visible, retainedIngressCount, first ? {
      populationId: first.populationId, sourceId: first.sourceId, scope: 'source_population',
    } : undefined),
  };
}
