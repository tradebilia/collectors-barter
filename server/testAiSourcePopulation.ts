import type { MetadataRankingPopulation } from '../shared/testAiRankingPopulation';
import { summarizeVisualExecutionOccurrences } from '../shared/testAiVisualExecution';

/** Display diagnostics only. This does not select, deduplicate or approve sales. */
export function buildSourcePopulationReport(
  population: Pick<MetadataRankingPopulation, 'populationId' | 'sourceId' | 'bindings'>,
  rows: Array<Parameters<typeof summarizeVisualExecutionOccurrences>[0][number] | null | undefined>,
  queryCoverage?: ReadonlyArray<{ received: number; status: string }>,
) {
  const visibleRows = rows.filter((row): row is Parameters<typeof summarizeVisualExecutionOccurrences>[0][number] => Boolean(row));
  return {
    version: 'stage5-source-population-v1' as const,
    unit: 'retained_source_ingress_occurrence' as const,
    populationId: population.populationId,
    sourceId: population.sourceId,
    retainedIngressCount: population.bindings.length,
    queryReturnedObservationCount: queryCoverage
      ? queryCoverage.reduce((total, query) => total + query.received, 0) : null,
    queryCoverage: queryCoverage ? {
      measured: true,
      executedQueryCount: queryCoverage.length,
      failedQueryCount: queryCoverage.filter((query) => query.status === 'error').length,
      note: 'Query observations can overlap; retained ingress reflects the existing retrieval union, not raw marketplace inventory.',
    } : { measured: false },
    execution: summarizeVisualExecutionOccurrences(visibleRows, population.bindings.length, {
      populationId: population.populationId, sourceId: population.sourceId, scope: 'source_population',
    }),
  };
}
