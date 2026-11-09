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
/** One actual attempt channel; do not count duplicated metric/audit projections twice. */
export function sourceRetrievalRows(data: any): any[] {
  for (const channel of [data?.audit?.retrievalCoverage, data?.retrievalCoverage, data?.searchMetrics?.retrievalCoverage, data?.metrics?.retrievalCoverage]) {
    if (Array.isArray(channel) && channel.length) return channel;
  }
  return [];
}
export function sourceRetrievalCoverage(data: any) {
  const packet = data?.sourcePopulation ?? data;
  const query = packet?.queryCoverage;
  const audit = sourceRetrievalRows(data);
  const executed = audit.filter((row: any) => row.executed !== false);
  const failedQueryCount = measuredCount(query?.failedQueryCount) ?? (audit.length ? executed.filter((row: any) => row.status === 'error').length : null);
  const executedQueryCount = measuredCount(query?.executedQueryCount) ?? (audit.length ? executed.length : null);
  const partialRetrieval = Boolean(query?.hasIssues || (failedQueryCount ?? 0) > 0 || audit.some((row: any) => row.status === 'error' || (measuredCount(row.rejected) ?? 0) > 0 || (measuredCount(row.normalizationRejected) ?? 0) > 0 || (measuredCount(row.rejectionCounts?.normalization_failure) ?? 0) > 0) || data?.partialRetrieval || data?.partial || data?.status === 'error' || data?.error);
  const partial = partialRetrieval || data?.displayCoverage === 'partial'
    || ['provider_unavailable', 'completed_with_timeout'].includes(data?.visualFilter?.status);
  return { partial, partialRetrieval, failedQueryCount, executedQueryCount,
    note: query?.note ?? null,
    label: partialRetrieval ? 'partial/error retrieval' : query?.measured || audit.length ? 'measured retrieval' : 'unmeasured retrieval' };
}

/** Prefer the actual mapped source projections for display. The diagnostic tag
 * identifies a projection, never identity or price authority. Legacy ordering is
 * unchanged, and complementary raw metadata remains in the existing merge.
 */
export function sourceVisualDisplayGroups(data: any): any[][] {
  const array = (value: unknown): any[] => Array.isArray(value) ? value : [];
  const legacy = [array(data?.visualReviewListings), array(data?.listings), array(data?.sales),
    array(data?.visualFilter?.contextListings), array(data?.data?.items)];
  const mapped = [array(data?.sales), array(data?.context)];
  return mapped.some((group) => group.some((row) => row?.sourceEconomics?.policy === 'stage6-named-source-mapping-v1'))
    ? [...mapped, ...legacy] : legacy;
}

/** Preserve the existing Goldin source-stage completed/eligible predicate, but
 * read the mapped source rows rather than an older pre-mapping visual copy.
 * This never creates final identity approval, adds context to intake or refills
 * transport slots. The final server still verifies every submitted fact.
 */
export function sourceReviewedGoldinSales(data: any): any[] {
  const sales = Array.isArray(data?.sales) ? data.sales : [];
  const context = Array.isArray(data?.context) ? data.context : [];
  const mapped = [...sales, ...context];
  const hasMapping = mapped.some((row) => row?.sourceEconomics?.policy === 'stage6-named-source-mapping-v1');
  const reviewed = hasMapping ? mapped : [
    ...(Array.isArray(data?.visualFilter?.listings) ? data.visualFilter.listings : []),
    ...(Array.isArray(data?.visualFilter?.contextListings) ? data.visualFilter.contextListings : []),
  ];
  return reviewed.filter((record) => record.completed === true && record.evidenceDisposition === 'valuation_eligible');
}

/** Error objects are not displayed or serialized; retain known rows and label the
 * transport failure. An equivalent successful query keeps the original object.
 */
export function sourceRequestDisplayData<T>(data: T | undefined, requestFailed: boolean): T | undefined {
  if (!requestFailed) return data;
  return { ...(data && typeof data === 'object' ? data : { listings: [], sales: [], context: [] }), error: 'Source request failed; known returned rows are retained, and missing counts remain unmeasured.', partial: true } as T;
}

export function sourceRetainedDisplayGroups(data: any): any[][] {
  return [data?.audit?.ledger, data?.listings, data?.preVisionExcludedListings,
    data?.visualFilter?.contextListings, data?.context].map((group) => Array.isArray(group) ? group : []);
}

/** A reporting status only; partial retrieval does not discard valid observations
 * or establish completion, image identity, guide trust or final price authority.
 */
export function sourceEvidenceStatus(data: any): 'success' | 'partial' | 'not_found' | 'error' | 'idle' {
  if (!data) return 'idle';
  if (sourceRetrievalCoverage(data).partialRetrieval || data.status === 'partial') {
    const knownRows = [...sourceRetainedDisplayGroups(data), data?.sales ?? [], data?.data?.items ?? [], data?.data?.auctions ?? []];
    return knownRows.some((group) => Array.isArray(group) && group.length > 0) || data.data ? 'partial' : 'error';
  }
  if (data.status === 'error' || data.error) return 'error';
  if (data.status === 'not_found' || data.status === 'review_required') return 'not_found';
  return 'success';
}
export function sourceEvidenceMessage(data: any): string | null {
  if (sourceRetrievalCoverage(data).partialRetrieval || data?.status === 'partial') {
    return 'Partial/error retrieval; known source observations are retained. See actual attempt outcomes; unreadable responses are not zero matches.';
  }
  return typeof data?.error === 'string' ? data.error : null;
}

export function sourceRetainedEmptyMessage(data: any, retainedCount: number, marketplace: string): string {
  if (retainedCount > 0) return `No candidates entered the main list; ${retainedCount} known retained ${marketplace} candidates remain in the ranked master list with their reasons.`;
  if (sourceRetrievalCoverage(data).partialRetrieval) return 'No usable retained candidates are available; failed or unreadable attempts do not establish zero marketplace matches.';
  const attempts = sourceRetrievalRows(data).filter((row) => row.executed !== false);
  if (attempts.length && attempts.every((row) => row.outcome === 'not_found')) return `No completed ${marketplace} records found in the executed searches.`;
  return 'No retained candidates are available; marketplace result coverage is unmeasured.';
}
