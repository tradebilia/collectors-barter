import { ENV } from './_core/env';

type ApifyRunResult<T> = { status: 'success'; items: T[]; message: string } | { status: 'error'; items: T[]; message: string };

const APIFY_API_BASE = 'https://api.apify.com/v2';
const ACTOR_TIMEOUT_MS = 60_000;
const CACHE_TTL_MS = 10 * 60_000;
const cache = new Map<string, { expiresAt: number; value: ApifyRunResult<any> }>();

async function runApifyActor<T>(actorId: string, input: Record<string, unknown>): Promise<ApifyRunResult<T>> {
  const cacheKey = `${actorId}:${JSON.stringify(input)}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (!ENV.apifyApiToken) return { status: 'error', items: [], message: 'Apify is not configured for this sandbox.' };
  try {
    const response = await fetch(`${APIFY_API_BASE}/acts/${encodeURIComponent(actorId)}/runs?waitForFinish=60`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ENV.apifyApiToken}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(ACTOR_TIMEOUT_MS),
    });
    const payload = await response.json().catch(() => null) as any;
    if (!response.ok) {
      const result = { status: 'error' as const, items: [], message: `Apify actor ${actorId} returned HTTP ${response.status}.` };
      cache.set(cacheKey, { expiresAt: Date.now() + 30_000, value: result });
      return result;
    }
    const datasetId = payload?.data?.defaultDatasetId;
    if (!datasetId) return { status: 'error', items: [], message: `Apify actor ${actorId} did not return a result dataset.` };
    const datasetResponse = await fetch(`${APIFY_API_BASE}/datasets/${encodeURIComponent(datasetId)}/items?format=json&clean=true&limit=50`, {
      headers: { Authorization: `Bearer ${ENV.apifyApiToken}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(ACTOR_TIMEOUT_MS),
    });
    const items = await datasetResponse.json().catch(() => null);
    if (!datasetResponse.ok || !Array.isArray(items)) return { status: 'error', items: [], message: `Apify dataset retrieval returned HTTP ${datasetResponse.status}.` };
    const result = { status: 'success' as const, items: items as T[], message: `Apify actor ${actorId} returned ${items.length} record${items.length === 1 ? '' : 's'}.` };
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value: result });
    return result;
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    return { status: 'error', items: [], message: timedOut ? `Apify actor ${actorId} timed out.` : `Apify actor ${actorId} could not be reached.` };
  }
}

export type NgcCensusRecord = {
  coinId?: number; populationId?: number; displayName?: string; year?: string; numericYear?: number;
  denomination?: string; mintMark?: string; designation?: string; coinSeriesName?: string;
  populationTotal?: number; gradeBreakdown?: Record<string, number>; sourceUrl?: string; scrapedAt?: string;
};

export function lookupNgcCensus(keywords: string): Promise<ApifyRunResult<NgcCensusRecord>> {
  return runApifyActor<NgcCensusRecord>('crawlerbros/ngc-coin-census-scraper', {
    mode: 'searchCoinSeries', keywords: keywords.trim().slice(0, 160), includeGradeBreakdown: true, maxItems: 5,
  });
}
