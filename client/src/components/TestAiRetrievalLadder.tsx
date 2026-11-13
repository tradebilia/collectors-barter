import { sourceRetrievalRows } from '../../../shared/testAiSourceDisplay';

const count = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? String(value) : 'unmeasured';
const measured = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;

function fallbackReason(previous: any, current: any): string | null {
  if (!previous || current.executed === false) return null;
  if (previous.status === 'error' || previous.outcome === 'timeout' || previous.outcome === 'network_error'
    || previous.outcome === 'http_error' || previous.outcome === 'auth_error') {
    return 'the previous query failed or was unreadable';
  }
  const received = measured(previous.received);
  const accepted = measured(previous.accepted);
  if (received === 0) return 'the previous query returned zero provider records';
  if (accepted === 0 && received !== null) return 'the previous query returned records, but none passed the minimum row checks';
  if (previous.rejected !== undefined && measured(previous.rejected) !== null && Number(previous.rejected) > 0) {
    return 'the previous query returned records, but some were rejected during minimum validation';
  }
  return 'the previous query did not produce enough usable records, so the bounded fallback ladder continued';
}

function attemptLabel(tier: any, index: number, marketplace?: string): string {
  if (tier.executed === false) return 'Not executed';
  if (tier.stage === 'product_sales') return `Product sales attempt ${tier.attempt ?? index + 1}`;
  if (marketplace === 'TCGplayer') return `Attempt ${index + 1}`;
  return index === 0 ? 'Primary query' : `Fallback ${index} query`;
}
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
      <span className="font-semibold">{attemptLabel(tier, index, marketplace)}</span>: &quot;{typeof tier.query === 'string' ? tier.query : 'query unavailable'}&quot; · returned count: {count(tier.received)} · {tier.outcome ?? tier.status ?? 'unknown'}
    {tier.accepted !== undefined && <> · valid provider rows: {count(tier.accepted)}</>}
    {tier.rejected !== undefined && <> · rejected provider rows: {count(tier.rejected)}</>}
    {tier.normalized !== undefined && <> · normalized rows: {count(tier.normalized)}</>}
    {tier.normalizationRejected !== undefined && <> · normalization losses: {count(tier.normalizationRejected)}</>}
    {tier.httpStatus !== undefined && tier.httpStatus !== null && <> · HTTP {tier.httpStatus}</>}
    {tier.rejectionCounts && <span> · row diagnostics: {Object.entries(tier.rejectionCounts).map(([code, amount]) => `${code}: ${count(amount)}`).join(', ')}</span>}
    {index > 0 && fallbackReason(rows[index - 1], tier) && <span> · fallback used because {fallbackReason(rows[index - 1], tier)}</span>}
  </p>)}
  </div>;
}
