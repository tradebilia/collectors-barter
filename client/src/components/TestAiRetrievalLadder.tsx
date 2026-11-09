import { sourceRetrievalRows } from '../../../shared/testAiSourceDisplay';

const count = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? String(value) : 'unmeasured';
/** Existing source ladder only. This component never constructs or starts queries. */
export function TestAiRetrievalLadder({ data, sourceLabel, marketplace }: { data: any; sourceLabel: string; marketplace?: string }) {
  const attempts = sourceRetrievalRows(data);
  const metrics = data?.searchMetrics ?? data?.metrics;
  const queries = Array.isArray(metrics?.executedQueries) ? metrics.executedQueries : [];
  const rows = attempts.length ? attempts : queries.map((query: string) => ({ query, received: null, status: 'unknown' }));
  return <div className="rounded border border-violet-700/30 bg-violet-950/15 px-2 py-1 text-[9px] text-violet-200" aria-label={`${sourceLabel} fallback search coverage`}>
    <p className="font-semibold uppercase tracking-wide">Search attempts and outcomes</p>
    <p className="mt-0.5">{attempts.length ? 'Recorded request outcomes are listed below; unavailable requests are marked not executed. An unreadable or failed response is not a zero-match result.' : rows.length ? 'Legacy query names are listed, but execution and outcomes are unconfirmed.' : 'No provider query execution was recorded.'}</p>
    {marketplace === 'Mercari' && <p className="mt-0.5">Mercari stops at the first minimally valid provider result, before metadata ranking, image review or pricing eligibility. Unusable responses may continue the existing bounded fallback ladder.</p>}
    {rows.map((tier: any, index: number) => <p key={`${tier.query}-${index}`} className="break-words font-mono text-violet-200/80" data-retrieval-outcome={tier.outcome ?? tier.status}>
      {tier.executed === false ? 'Not executed' : tier.stage === 'product_sales' ? `Product sales attempt ${tier.attempt ?? index + 1}` : marketplace === 'TCGplayer' ? `Attempt ${index + 1}` : index === 0 ? 'Primary' : `Fallback ${index}`}: &quot;{typeof tier.query === 'string' ? tier.query : 'query unavailable'}&quot; · returned count: {count(tier.received)} · {tier.outcome ?? tier.status ?? 'unknown'}
    {tier.accepted !== undefined && <> · valid provider rows: {count(tier.accepted)}</>}
    {tier.rejected !== undefined && <> · rejected provider rows: {count(tier.rejected)}</>}
    {tier.normalized !== undefined && <> · normalized rows: {count(tier.normalized)}</>}
    {tier.normalizationRejected !== undefined && <> · normalization losses: {count(tier.normalizationRejected)}</>}
    {tier.httpStatus !== undefined && tier.httpStatus !== null && <> · HTTP {tier.httpStatus}</>}
    {tier.rejectionCounts && <span> · row diagnostics: {Object.entries(tier.rejectionCounts).map(([code, amount]) => `${code}: ${count(amount)}`).join(', ')}</span>}
  </p>)}
  </div>;
}
