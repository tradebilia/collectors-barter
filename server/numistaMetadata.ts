import { formatProviderError, formatProviderNetworkError } from './providerError';
import { parseTestAiDetails } from '../shared/testAiCriteria';

type FetchLike = typeof fetch;
type NumistaEnv = Record<string, string | undefined>;

type NumistaFact = { label: string; value: string };

type NumistaTypeSummary = {
  id?: number;
  title?: string;
  object_type?: { name?: string };
  issuer?: { code?: string; name?: string };
  min_year?: number;
  max_year?: number;
  obverse_thumbnail?: string;
  reverse_thumbnail?: string;
  category?: string;
};

type NumistaTypeDetail = NumistaTypeSummary & {
  url?: string;
  issuing_entity?: { name?: string };
  ruler?: Array<{ name?: string }>;
  value?: { text?: string; numeric_value?: number; currency?: string };
  composition?: { text?: string };
  size?: string;
  size2?: string;
  shape?: { name?: string };
  obverse?: { description?: string; lettering?: string; picture?: string; thumbnail?: string };
  reverse?: { description?: string; lettering?: string; picture?: string; thumbnail?: string };
  series?: { name?: string };
  commemorated_topic?: string;
  comments?: string;
  tags?: Array<{ name?: string } | string>;
  type?: { name?: string };
};

type NumistaLookup = {
  status: 'success' | 'not_found' | 'error';
  message?: string;
  data?: {
    id: number;
    title: string;
    sourceUrl: string;
    imageUrl: string | null;
    query: string;
    matchNote: string;
    facts: NumistaFact[];
  };
};

const NUMISTA_API_BASE = 'https://api.numista.com/api/v3';
const NUMISTA_TIMEOUT_MS = 10_000;
const NUMISTA_CANDIDATE_LIMIT = 6;

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function normalized(value: unknown): string {
  return text(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function compact(value: unknown): string {
  return normalized(value).replace(/\s/g, '');
}

function firstDetail(details: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = text(details[key]);
    if (value) return value;
  }
  return '';
}

function validYear(value: string): string {
  return /^(?:17|18|19|20)\d{2}$/.test(value) ? value : '';
}

/**
 * Builds a title-independent Numista query from the structured coin fields.
 * The title is only a last-resort fallback for sparse legacy records.
 */
export function buildNumistaSearchCriteria(category: string, itemDetails: unknown, fallbackTitle = ''): {
  query: string;
  year: string;
  country: string;
  denomination: string;
  mintMark: string;
  variety: string;
} {
  const details = parseTestAiDetails(itemDetails);
  const country = firstDetail(details, ['country', 'issuingCountry', 'issuer']);
  const denomination = firstDetail(details, ['denomination', 'faceValue', 'value']);
  const year = validYear(firstDetail(details, ['year', 'issueYear', 'mintYear']));
  const mintMark = firstDetail(details, ['mintMark', 'mint', 'mintmark']);
  const variety = firstDetail(details, ['variety', 'coinType', 'series', 'design', 'type']);
  const metal = firstDetail(details, ['metal', 'composition']);
  const coinName = firstDetail(details, ['coinName', 'name', 'title', 'series']);
  const structuredParts = [country, denomination, coinName, variety, metal, mintMark].filter(Boolean);
  const query = [...new Set(structuredParts)].join(' ').slice(0, 180).trim() || fallbackTitle.trim().slice(0, 180);
  return { query, year, country, denomination, mintMark, variety };
}

function providerHeaders(apiKey: string, clientName: string, clientId: string, token?: string): Record<string, string> {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Numista-API-Key': apiKey,
    Authorization: token ? `Bearer ${token}` : '',
    'User-Agent': `${clientName}/1.0 (Tradebilia read-only integration; client ${clientId})`,
  };
}

async function fetchJson(url: string, headers: Record<string, string>, fetchImpl: FetchLike): Promise<{ ok: boolean; status: number; data: any }> {
  const response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(NUMISTA_TIMEOUT_MS) });
  const data = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, data };
}

async function getNumistaToken(apiKey: string, clientName: string, clientId: string, fetchImpl: FetchLike): Promise<{ token: string | null; error?: string }> {
  const tokenUrl = `${NUMISTA_API_BASE}/oauth_token?grant_type=client_credentials&scope=view_types`;
  const result = await fetchJson(tokenUrl, providerHeaders(apiKey, clientName, clientId), fetchImpl);
  if (!result.ok || typeof result.data?.access_token !== 'string' || !result.data.access_token) {
    return { token: null, error: formatProviderError('Numista', result.status, result.data) };
  }
  return { token: result.data.access_token };
}

function yearMatches(candidate: NumistaTypeSummary, year: string): boolean {
  if (!year) return true;
  const target = Number(year);
  const min = Number(candidate.min_year);
  const max = Number(candidate.max_year ?? candidate.min_year);
  return Number.isFinite(target) && Number.isFinite(min) && Number.isFinite(max) && target >= min && target <= max;
}

function scoreSummary(candidate: NumistaTypeSummary, criteria: ReturnType<typeof buildNumistaSearchCriteria>): number {
  const candidateText = normalized(`${candidate.title ?? ''} ${candidate.issuer?.name ?? ''}`);
  const queryTokens = normalized(criteria.query).split(' ').filter((token) => token.length > 1);
  let score = queryTokens.reduce((total, token) => total + (candidateText.includes(token) ? 10 : 0), 0);
  if (criteria.country && candidateText.includes(normalized(criteria.country))) score += 30;
  if (criteria.denomination && candidateText.includes(normalized(criteria.denomination))) score += 20;
  if (yearMatches(candidate, criteria.year)) score += 45;
  if (criteria.year && !yearMatches(candidate, criteria.year)) score -= 120;
  return score;
}

function scoreDetail(candidate: NumistaTypeDetail, criteria: ReturnType<typeof buildNumistaSearchCriteria>): number {
  const summaryScore = scoreSummary(candidate, criteria);
  const detailText = normalized([
    candidate.title,
    candidate.issuer?.name,
    candidate.value?.text,
    candidate.composition?.text,
    candidate.series?.name,
    candidate.obverse?.lettering,
    candidate.reverse?.lettering,
  ].filter(Boolean).join(' '));
  const extraTokens = [criteria.mintMark, criteria.variety].flatMap((value) => normalized(value).split(' ')).filter((token) => token.length > 1);
  return summaryScore + extraTokens.reduce((total, token) => total + (detailText.includes(token) ? 12 : 0), 0);
}

function shortDescription(value: unknown): string {
  return text(value).replace(/\s+/g, ' ').slice(0, 220);
}

function detailFacts(detail: NumistaTypeDetail): NumistaFact[] {
  const facts: NumistaFact[] = [];
  const add = (label: string, value: unknown) => { const result = text(value); if (result) facts.push({ label, value: result }); };
  const yearRange = detail.min_year && detail.max_year && detail.min_year !== detail.max_year
    ? `${detail.min_year}–${detail.max_year}`
    : detail.min_year ?? detail.max_year;
  add('Object type', detail.object_type?.name ?? detail.type?.name);
  add('Issuer', detail.issuer?.name);
  add('Year', yearRange);
  add('Value', detail.value?.text);
  add('Composition', detail.composition?.text);
  add('Series', detail.series?.name);
  add('Shape', detail.shape?.name);
  add('Size', [detail.size, detail.size2].filter(Boolean).join(' × '));
  add('Obverse', shortDescription(detail.obverse?.description));
  add('Reverse', shortDescription(detail.reverse?.description));
  add('Tags', (detail.tags ?? []).map((tag) => typeof tag === 'string' ? tag : tag.name).filter(Boolean).join(', '));
  return facts;
}

/**
 * Returns Numista catalogue metadata only. It intentionally excludes prices,
 * sale history, valuation, authenticity, and ownership claims.
 */
export async function lookupNumistaCoin(
  input: { category: string; title?: string; itemDetails?: unknown },
  fetchImpl: FetchLike = fetch,
  env: NumistaEnv = process.env,
): Promise<NumistaLookup> {
  if (input.category.trim().toLowerCase().replace(/[_-]+/g, ' ') !== 'coins') {
    return { status: 'error', message: 'Numista is currently available for Coins only.' };
  }
  const apiKey = env.NUMISTA_API_KEY?.trim();
  const clientId = env.NUMISTA_CLIENT_ID?.trim();
  const clientName = env.NUMISTA_CLIENT_NAME?.trim();
  if (!apiKey || !clientId || !clientName) {
    return { status: 'error', message: 'Numista coin reference is not configured with secure API credentials.' };
  }
  const criteria = buildNumistaSearchCriteria(input.category, input.itemDetails, input.title ?? '');
  if (!criteria.query && !criteria.year) {
    return { status: 'error', message: 'Enter structured coin fields such as country, denomination, year, mint mark, or variety before requesting Numista.' };
  }

  try {
    const auth = await getNumistaToken(apiKey, clientName, clientId, fetchImpl);
    if (!auth.token) return { status: 'error', message: auth.error ?? 'Numista authorization failed.' };
    const searchUrl = new URL(`${NUMISTA_API_BASE}/types`);
    if (criteria.query) searchUrl.searchParams.set('q', criteria.query);
    if (criteria.year) searchUrl.searchParams.set('year', criteria.year);
    searchUrl.searchParams.set('page', '1');
    const search = await fetchJson(searchUrl.toString(), providerHeaders(apiKey, clientName, clientId, auth.token), fetchImpl);
    if (!search.ok) return { status: 'error', message: formatProviderError('Numista', search.status, search.data) };
    const candidateSummaries = (Array.isArray(search.data?.types) ? search.data.types : []) as NumistaTypeSummary[];
    const summaries = candidateSummaries
      .filter((candidate: NumistaTypeSummary) => Number.isFinite(Number(candidate.id)) && text(candidate.title))
      .sort((a: NumistaTypeSummary, b: NumistaTypeSummary) => scoreSummary(b, criteria) - scoreSummary(a, criteria))
      .slice(0, NUMISTA_CANDIDATE_LIMIT);
    if (!summaries.length) return { status: 'not_found', message: 'Numista returned no matching coin catalogue types for the structured request.' };

    const details = await Promise.all(summaries.map(async (candidate) => {
      const result = await fetchJson(`${NUMISTA_API_BASE}/types/${encodeURIComponent(String(candidate.id))}`, providerHeaders(apiKey, clientName, clientId, auth.token!), fetchImpl);
      return result.ok && result.data && typeof result.data === 'object' ? result.data as NumistaTypeDetail : null;
    }));
    const usableDetails = details.filter((detail): detail is NumistaTypeDetail => Boolean(detail?.id && detail.title));
    const selected = [...usableDetails].sort((a, b) => scoreDetail(b, criteria) - scoreDetail(a, criteria))[0];
    if (!selected || !selected.id || !selected.title) return { status: 'not_found', message: 'Numista returned candidate types, but no usable coin detail record could be read.' };
    const queryDescription = [criteria.query, criteria.year ? `year=${criteria.year}` : ''].filter(Boolean).join(' · ');
    return {
      status: 'success',
      data: {
        id: Number(selected.id),
        title: text(selected.title),
        sourceUrl: text(selected.url) || `https://en.numista.com/catalogue/index.php?mode=types&id=${selected.id}`,
        imageUrl: text(selected.obverse?.picture) || text(selected.obverse?.thumbnail) || text(selected.obverse_thumbnail) || null,
        query: queryDescription,
        matchNote: 'Structured-field Numista catalogue match. This is identification/reference metadata only; Numista catalogue records do not enter Tradebilia valuation as completed sales.',
        facts: detailFacts(selected),
      },
    };
  } catch {
    return { status: 'error', message: formatProviderNetworkError('Numista') };
  }
}
