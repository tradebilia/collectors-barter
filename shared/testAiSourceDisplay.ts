/** Reporting only: does not calculate or change legacy metrics, confidence or admission. */
export function sourceCurrentWindowLabel(kind: string): string {
  return kind === 'market_current' ? 'asking-price context' : 'current-window source candidates';
}
export function sourceRecordBucketLabel(bucket: string, kind?: string): string {
  return bucket === 'current_value' ? (kind === 'market_current' ? 'Source-stage asking context' : 'Source-stage current window')
    : bucket === 'historical_trend' ? 'Historical source context' : bucket.replace(/_/g, ' ');
}
export type SourceMetricDisplay = {
  observationCount: number | null;
  verified: boolean;
  currency: string | null;
  basis: string | null;
  reason: string;
  avg: string;
  median: string;
  range: string;
};
/** Only actual complete metric members with explicit matching currency/basis
 * can justify an aggregate label. Anonymous arrays or guessed endpoint defaults
 * cannot. We format the existing metrics; no recalculation, FX or fee arithmetic.
 */
export function sourceMetricDisplay(metrics: any, members?: ReadonlyArray<Record<string, any>>): SourceMetricDisplay {
  const count = Number(metrics?.count);
  const observationCount = metrics?.count != null && Number.isSafeInteger(count) && count >= 0 ? count : null;
  const priced = (members ?? []).filter((row) => {
    const raw = row.price ?? row.soldPrice ?? row.salePrice ?? row.finalPrice ?? row.currentPrice;
    const amount = Number(typeof raw === 'object' ? raw?.value : raw);
    return Number.isFinite(amount) && amount > 0;
  });
  const currencies = priced.map((row) => {
    const raw = row.price ?? row.soldPrice ?? row.salePrice ?? row.finalPrice ?? row.currentPrice;
    return String(row.currency ?? row.soldCurrency ?? (typeof raw === 'object' ? raw?.currency : '') ?? '').trim().toUpperCase();
  });
  const bases = priced.map((row) => String(row.priceBasis ?? '').trim().toLowerCase());
  const currency = currencies[0] ?? null;
  const basis = bases[0] ?? null;
  const verified = Boolean(members && observationCount && priced.length === observationCount && currency && /^[A-Z]{3}$/.test(currency)
    && currencies.every((value) => value === currency) && basis && !['unknown', 'unspecified', 'unverified'].includes(basis)
    && bases.every((value) => value === basis));
  const format = (amount: unknown) => Number.isFinite(Number(amount)) ? `${currency} ${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : 'Not reported';
  return { observationCount, verified, currency: verified ? currency : null, basis: verified ? basis : null,
    reason: verified ? `${currency} · ${basis} as reported · source-stage context, not final pricing use; no FX or fee recomputation`
      : 'Currency/basis unresolved — aggregate not shown · unverified legacy source metrics; not final pricing use',
    avg: verified ? format(metrics?.avg) : 'Withheld', median: verified ? format(metrics?.median) : 'Withheld',
    range: verified ? `${format(metrics?.min)}–${format(metrics?.max)}` : 'Withheld' };
}
function measuredCount(value: any): number | null {
  return value != null && Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null;
}
export function sourceRetrievalCoverage(data: any) {
  const packet = data?.sourcePopulation ?? data;
  const query = packet?.queryCoverage;
  const audit = Array.isArray(data?.audit?.retrievalCoverage) ? data.audit.retrievalCoverage
    : Array.isArray(data?.retrievalCoverage) ? data.retrievalCoverage : [];
  const failedQueryCount = measuredCount(query?.failedQueryCount) ?? (audit.length ? audit.filter((row: any) => row.status === 'error').length : null);
  const executedQueryCount = measuredCount(query?.executedQueryCount) ?? (audit.length || null);
  const partialRetrieval = Boolean((failedQueryCount ?? 0) > 0 || audit.some((row: any) => row.status === 'error') || data?.status === 'error' || data?.error);
  const partial = partialRetrieval || data?.displayCoverage === 'partial'
    || ['provider_unavailable', 'completed_with_timeout'].includes(data?.visualFilter?.status);
  return { partial, partialRetrieval, failedQueryCount, executedQueryCount,
    note: query?.note ?? null,
    label: partialRetrieval ? 'partial/error retrieval' : query?.measured || audit.length ? 'measured retrieval' : 'unmeasured retrieval' };
}
