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

type NumistaIssue = {
  id?: number;
  year?: number;
  gregorian_year?: number;
  comment?: string;
  mint_letter?: string;
};

type NumistaPrice = { grade?: string; price?: number | string };
type NumistaGuideMatchType = 'exact' | 'mapped';
type NumistaGuideMatch = {
  price: { grade: string; value: number; currency: string };
  matchType: NumistaGuideMatchType;
  selectedGrade: string;
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
    guideValue?: number | null;
    guideCurrency?: string | null;
    guideGrade?: string | null;
    guideSource?: string | null;
    guideSelectedGrade?: string | null;
    guideMatchType?: NumistaGuideMatchType | null;
    guideIssueId?: number | null;
    guidePrices?: Array<{ grade: string; value: number; currency: string }>;
  };
};

const NUMISTA_API_BASE = 'https://api.numista.com/api/v3';
const NUMISTA_TIMEOUT_MS = 10_000;
const NUMISTA_CANDIDATE_LIMIT = 6;
const NUMISTA_ISSUE_LIMIT = 80;
const NUMISTA_GUIDE_CURRENCY = 'USD';

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
  grade: string;
} {
  const details = parseTestAiDetails(itemDetails);
  const country = firstDetail(details, ['country', 'issuingCountry', 'issuer']);
  const denomination = firstDetail(details, ['denomination', 'faceValue', 'value']);
  const year = validYear(firstDetail(details, ['year', 'issueYear', 'mintYear']));
  const mintMark = firstDetail(details, ['mintMark', 'mint', 'mintmark']);
  const variety = firstDetail(details, ['variety', 'coinType', 'series', 'design', 'type']);
  const metal = firstDetail(details, ['metal', 'composition']);
  const coinName = firstDetail(details, ['coinName', 'name', 'title', 'series']);
  const grade = firstDetail(details, ['grade', 'condition', 'certifiedGrade']);
  const structuredParts = [country, denomination, coinName, variety, metal, mintMark].filter(Boolean);
  const query = [...new Set(structuredParts)].join(' ').slice(0, 180).trim() || fallbackTitle.trim().slice(0, 180);
  return { query, year, country, denomination, mintMark, variety, grade };
}

function normalizeGuideGrade(value: unknown): string {
  return text(value).toUpperCase().replace(/[\s-]+/g, '').replace(/[^A-Z0-9]/g, '');
}

function parsePositivePrice(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : null;
}

function gradeMatches(targetGrade: string, catalogueGrade: string): boolean {
  const target = normalizeGuideGrade(targetGrade);
  const candidate = normalizeGuideGrade(catalogueGrade);
  return Boolean(target && candidate && target === candidate);
}

// Numista exposes broad G/VG/F/VF/XF/AU/UNC price bands, while certified
// listings can contain a numeric Sheldon grade. These are the owner-approved
// associations for using a Numista value only as a clearly labeled secondary
// guide anchor. Grades absent from this list intentionally do not map.
const NUMISTA_GRADE_BANDS: Readonly<Record<string, string>> = {
  AG3: 'G',
  G4: 'G',
  G6: 'G',
  VG8: 'VG',
  VG10: 'VG',
  F12: 'F',
  F15: 'F',
  VF20: 'VF',
  VF25: 'VF',
  VF30: 'VF',
  VF35: 'VF',
  XF40: 'XF',
  XF45: 'XF',
  AU50: 'AU',
  AU53: 'AU',
  AU55: 'AU',
  AU58: 'AU',
  MS60: 'UNC',
  MS61: 'UNC',
  MS62: 'UNC',
  MS63: 'UNC',
  MS64: 'UNC',
  MS65: 'UNC',
  MS66: 'UNC',
  MS67: 'UNC',
};

export function mapNumistaGradeToCatalogueBand(value: unknown): string | null {
  return NUMISTA_GRADE_BANDS[normalizeGuideGrade(value)] ?? null;
}

function findGuideMatch(
  selectedGrade: string,
  prices: Array<{ grade: string; value: number; currency: string }>,
): NumistaGuideMatch | null {
  const normalizedSelectedGrade = normalizeGuideGrade(selectedGrade);
  if (!normalizedSelectedGrade) return null;
  const exactPrice = prices.find((price) => gradeMatches(normalizedSelectedGrade, price.grade));
  if (exactPrice) return { price: exactPrice, matchType: 'exact', selectedGrade: normalizedSelectedGrade };
  const mappedBand = mapNumistaGradeToCatalogueBand(normalizedSelectedGrade);
  const mappedPrice = mappedBand ? prices.find((price) => gradeMatches(mappedBand, price.grade)) : undefined;
  return mappedPrice ? { price: mappedPrice, matchType: 'mapped', selectedGrade: normalizedSelectedGrade } : null;
}

function issueMatchesCriteria(issue: NumistaIssue, criteria: ReturnType<typeof buildNumistaSearchCriteria>): boolean {
  if (!criteria.year) return true;
  const year = Number(criteria.year);
  return [issue.year, issue.gregorian_year].some((value) => Number.isFinite(Number(value)) && Number(value) === year);
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

async function loadGuidePrices(
  typeId: number,
  criteria: ReturnType<typeof buildNumistaSearchCriteria>,
  headers: Record<string, string>,
  fetchImpl: FetchLike,
): Promise<{ issueId: number | null; prices: Array<{ grade: string; value: number; currency: string }>; error?: string }> {
  if (!criteria.year) return { issueId: null, prices: [] };
  const issues = await fetchJson(`${NUMISTA_API_BASE}/types/${encodeURIComponent(String(typeId))}/issues`, headers, fetchImpl);
  if (!issues.ok) return { issueId: null, prices: [], error: formatProviderError('Numista', issues.status, issues.data) };
  const issue = (Array.isArray(issues.data) ? issues.data : [])
    .filter((candidate): candidate is NumistaIssue => Boolean(candidate && typeof candidate === 'object'))
    .filter((candidate) => issueMatchesCriteria(candidate, criteria))
    .slice(0, NUMISTA_ISSUE_LIMIT)[0];
  if (!issue?.id) return { issueId: null, prices: [] };

  const priceUrl = new URL(`${NUMISTA_API_BASE}/types/${encodeURIComponent(String(typeId))}/issues/${encodeURIComponent(String(issue.id))}/prices`);
  priceUrl.searchParams.set('currency', NUMISTA_GUIDE_CURRENCY);
  const priceResult = await fetchJson(priceUrl.toString(), headers, fetchImpl);
  if (!priceResult.ok) return { issueId: Number(issue.id), prices: [], error: formatProviderError('Numista', priceResult.status, priceResult.data) };
  const currency = text(priceResult.data?.currency).toUpperCase();
  if (currency !== NUMISTA_GUIDE_CURRENCY) {
    return { issueId: Number(issue.id), prices: [], error: 'Numista did not return a USD catalogue estimate for this issue.' };
  }
  const rawPrices = (Array.isArray(priceResult.data?.prices) ? priceResult.data.prices : []) as NumistaPrice[];
  const prices = rawPrices
    .map((row: NumistaPrice) => ({ grade: text(row.grade).toUpperCase(), value: parsePositivePrice(row.price), currency }))
    .filter((row): row is { grade: string; value: number; currency: string } => Boolean(row.grade && row.value));
  return { issueId: Number(issue.id), prices };
}

/**
 * Returns Numista catalogue metadata plus a direct or owner-approved
 * grade-band-mapped catalogue estimate when the selected issue exposes one.
 * These are not completed sales and are admitted only through the capped
 * secondary-guide contract.
 */
export async function lookupNumistaCoin(
  input: { category: string; title?: string; itemDetails?: unknown; grade?: string },
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
    const parsedCriteria = buildNumistaSearchCriteria(input.category, input.itemDetails, input.title ?? '');
    const criteria = { ...parsedCriteria, grade: text(input.grade) || parsedCriteria.grade };
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
    const guide = await loadGuidePrices(Number(selected.id), criteria, providerHeaders(apiKey, clientName, clientId, auth.token!), fetchImpl);
    const guideMatch = criteria.grade ? findGuideMatch(criteria.grade, guide.prices) : null;
    const queryDescription = [criteria.query, criteria.year ? `year=${criteria.year}` : ''].filter(Boolean).join(' · ');
    return {
      status: 'success',
      data: {
        id: Number(selected.id),
        title: text(selected.title),
        sourceUrl: text(selected.url) || `https://en.numista.com/catalogue/index.php?mode=types&id=${selected.id}`,
        imageUrl: text(selected.obverse?.picture) || text(selected.obverse?.thumbnail) || text(selected.obverse_thumbnail) || null,
        query: queryDescription,
        matchNote: guideMatch
          ? guideMatch.matchType === 'exact'
            ? `Structured-field Numista catalogue match. Exact Numista grade ${guideMatch.price.grade} has a ${guideMatch.price.currency} ${guideMatch.price.value.toLocaleString()} catalogue estimate; it is secondary guide evidence, not a completed sale.`
            : `Structured-field Numista catalogue match. Selected grade ${guideMatch.selectedGrade} maps to Numista's ${guideMatch.price.grade} grade band, which has a ${guideMatch.price.currency} ${guideMatch.price.value.toLocaleString()} catalogue estimate; it is secondary guide evidence, not a completed sale.`
          : guide.error
            ? `Structured-field Numista catalogue match. Catalogue guide prices could not be read: ${guide.error}`
            : 'Structured-field Numista catalogue match. No direct or approved mapped grade-band value was returned; catalogue records do not enter Tradebilia valuation as completed sales.',
        facts: detailFacts(selected),
        guideValue: guideMatch?.price.value ?? null,
        guideCurrency: guideMatch?.price.currency ?? null,
        guideGrade: guideMatch?.price.grade ?? null,
        guideSource: guideMatch ? 'Numista catalogue estimate' : null,
        guideSelectedGrade: guideMatch?.selectedGrade ?? null,
        guideMatchType: guideMatch?.matchType ?? null,
        guideIssueId: guide.issueId,
        guidePrices: guide.prices,
      },
    };
  } catch {
    return { status: 'error', message: formatProviderNetworkError('Numista') };
  }
}
