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
  value?: { text?: string; numeric_value?: number; currency?: string | { id?: number; name?: string; full_name?: string } };
  mints?: Array<{ name?: string }>;
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

export type NumistaLookup = {
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

function isUnitedStates(value: string): boolean {
  const country = normalized(value);
  return country === 'united states' || country === 'united states of america' || country === 'usa' || country === 'us';
}

function canonicalUnitedStatesDenomination(value: string): string {
  const source = text(value);
  const words = normalized(source);
  if (!source) return '';
  if (/\bdime(?:s)?\b/.test(words)) return '1 Dime';
  if (/(?:half\s+dollar|1\/2\s*dollar)/.test(words) || source.includes('½')) return '1/2 Dollar';

  const centMatch = words.match(/^(\d+)\s*(?:cent|cents)$/);
  if (centMatch) {
    const cents = Number(centMatch[1]);
    if (cents === 50) return '1/2 Dollar';
    if (cents === 10) return '1 Dime';
    return `${cents} ${cents === 1 ? 'Cent' : 'Cents'}`;
  }

  const compactCentMatch = words.match(/^(\d+)c$/);
  if (compactCentMatch) {
    const cents = Number(compactCentMatch[1]);
    if (cents === 50) return '1/2 Dollar';
    if (cents === 10) return '1 Dime';
    return `${cents} ${cents === 1 ? 'Cent' : 'Cents'}`;
  }

  const dollarMatch = words.match(/^(?:usd\s*)?(\d+(?:\.\d+)?)\s*(?:dollar|dollars|usd)$/);
  const numericSource = source.replace(/[$,\s]/g, '');
  const dollars = dollarMatch ? Number(dollarMatch[1]) : Number(numericSource);
  if (!Number.isFinite(dollars) || dollars <= 0) return source;

  const cents = Math.round(dollars * 100);
  if (cents < 100) {
    if (cents === 10) return '1 Dime';
    return `${cents} ${cents === 1 ? 'Cent' : 'Cents'}`;
  }
  const wholeDollars = cents / 100;
  return `${wholeDollars} ${wholeDollars === 1 ? 'Dollar' : 'Dollars'}`;
}

function canonicalNumistaDenomination(country: string, denomination: string): string {
  return isUnitedStates(country) ? canonicalUnitedStatesDenomination(denomination) : text(denomination);
}

function numistaCurrencyName(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return text(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const currency = value as Record<string, unknown>;
  return text(currency.name) || text(currency.full_name);
}

function numericDenomination(value: string): number | null {
  const match = text(value).match(/^\d+(?:\.\d+)?$/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function isBullionWeightDenomination(value: string): boolean {
  return /^\d+(?:\.\d+)?\s*(?:onza(?:s)?|ounce(?:s)?|oz|gram(?:s)?|g)\b/i.test(text(value));
}

function isPatternDetail(detail: NumistaTypeDetail): boolean {
  const objectType = normalized(detail.object_type?.name ?? detail.type?.name);
  const title = normalized(detail.title);
  return objectType.includes('pattern') || title.includes('pattern');
}

function bullionWeightMatchesNumistaDetail(requested: string, detail: NumistaTypeDetail): boolean {
  if (!isBullionWeightDenomination(requested) || isPatternDetail(detail)) return false;
  const expected = normalized(requested);
  const returnedValue = normalized(text(detail.value?.text));
  const returnedTitle = normalized(detail.title);
  return returnedValue === expected || returnedTitle.startsWith(expected);
}

function returnedCurrencyDenomination(value: string, currency: unknown): number | null {
  const returned = text(value);
  const currencyName = normalized(numistaCurrencyName(currency));
  const match = returned.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
  if (!match || !currencyName) return null;

  const returnedUnit = normalized(match[2]);
  if (!returnedUnit.includes(currencyName)) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function denominationMatchesNumistaDetail(country: string, requested: string, detail: NumistaTypeDetail): boolean {
  if (!requested) return true;
  const expected = canonicalNumistaDenomination(country, requested);
  const returned = text(detail.value?.text);
  const actual = canonicalNumistaDenomination(country, returned);
  if (expected && actual && normalized(expected) === normalized(actual)) return true;

  // Bullion entries such as Mexico's Libertad can be catalogue types without
  // a face-value object. Accept a declared weight denomination only when the
  // type title begins with that exact weight and Numista does not label it as
  // a pattern. This avoids turning a bare numeric "1" into a bullion match.
  if (bullionWeightMatchesNumistaDetail(expected, detail)) return true;

  // Inventory sometimes stores only a numeric face value for non-U.S. coins.
  // Accept that narrow representation only when Numista's returned denomination
  // explicitly uses the returned currency (for example, 1 -> 1 Peso). This
  // deliberately leaves the U.S. $1-versus-dime safeguards exact.
  if (isUnitedStates(country)) return false;
  const requestedNumeric = numericDenomination(requested);
  const returnedNumeric = returnedCurrencyDenomination(returned, detail.value?.currency);
  return requestedNumeric !== null && returnedNumeric !== null && requestedNumeric === returnedNumeric;
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
  const denomination = canonicalNumistaDenomination(country, firstDetail(details, ['denomination', 'faceValue', 'value']));
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

function usableNumistaGrade(value: unknown): string {
  const grade = text(value);
  return /^(?:ungraded|not[\s_-]*graded|none|n\/a|0+(?:\.0+)?)$/i.test(grade) ? '' : grade;
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
// associations for displaying a clearly labeled Numista guide estimate. The
// guide remains a capped 25% secondary analyzer anchor, never a completed sale.
// Grades absent from this list intentionally do not map.
const NUMISTA_GRADE_BANDS: Readonly<Record<string, string>> = {
  VERYGOOD: 'VG',
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
  NEARMINT: 'UNC',
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

function detailHasExclusiveRequestedMintFacility(detail: NumistaTypeDetail, requestedMint: string): boolean {
  const requested = normalized(requestedMint);
  const mints = detail.mints ?? [];
  return Boolean(requested && mints.length === 1 && normalized(mints[0]?.name) === requested);
}

function issueMatchesCriteria(
  issue: NumistaIssue,
  criteria: ReturnType<typeof buildNumistaSearchCriteria>,
  detail: NumistaTypeDetail,
): boolean {
  const yearMatches = !criteria.year || [issue.year, issue.gregorian_year]
    .some((value) => Number.isFinite(Number(value)) && Number(value) === Number(criteria.year));
  if (!yearMatches) return false;

  const requestedMint = normalizeNumistaMintMark(criteria.mintMark);
  return !requestedMint
    || normalizeNumistaMintMark(text(issue.mint_letter)) === requestedMint
    || detailHasExclusiveRequestedMintFacility(detail, criteria.mintMark);
}

function normalizeNumistaMintMark(value: string): string {
  const mint = normalized(value);
  if (!mint || mint === 'philadelphia' || mint === 'no mint mark') return '';
  if (mint === 'carson city' || mint === 'cc') return 'CC';
  if (mint === 'new orleans' || mint === 'o') return 'O';
  if (mint === 'san francisco' || mint === 's') return 'S';
  if (mint === 'denver' || mint === 'd') return 'D';
  if (mint === 'west point' || mint === 'w') return 'W';
  return text(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
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
  detail: NumistaTypeDetail,
  headers: Record<string, string>,
  fetchImpl: FetchLike,
): Promise<{ issueId: number | null; prices: Array<{ grade: string; value: number; currency: string }>; error?: string }> {
  if (!criteria.year) return { issueId: null, prices: [] };
  const issues = await fetchJson(`${NUMISTA_API_BASE}/types/${encodeURIComponent(String(typeId))}/issues`, headers, fetchImpl);
  if (!issues.ok) return { issueId: null, prices: [], error: formatProviderError('Numista', issues.status, issues.data) };
  const issue = (Array.isArray(issues.data) ? issues.data : [])
    .filter((candidate): candidate is NumistaIssue => Boolean(candidate && typeof candidate === 'object'))
    .filter((candidate) => issueMatchesCriteria(candidate, criteria, detail))
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
 * The estimate is never a completed sale and enters the analyzer only as its
 * capped 25% secondary guide anchor, with provisional status when sales are absent.
 */
export async function lookupNumistaCoin(
  input: { category: string; title?: string; itemDetails?: unknown; grade?: string; condition?: string },
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
    // Inventory records commonly store an ungraded coin with a separate
    // condition such as very_good. Treat the sentinel as empty so the
    // condition-derived grade can still map to Numista's catalogue band.
    const inputGrade = usableNumistaGrade(input.grade);
    const criteria = { ...parsedCriteria, grade: inputGrade || usableNumistaGrade(input.condition) || usableNumistaGrade(parsedCriteria.grade) };
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
    const denominationMatchedDetails = usableDetails.filter((detail) => denominationMatchesNumistaDetail(criteria.country, criteria.denomination, detail));
    if (!denominationMatchedDetails.length) {
      return { status: 'not_found', message: `Numista returned catalogue candidates, but none matched the requested denomination ${criteria.denomination || '(not supplied)'}.` };
    }
    const selected = [...denominationMatchedDetails].sort((a, b) => scoreDetail(b, criteria) - scoreDetail(a, criteria))[0];
    if (!selected || !selected.id || !selected.title) return { status: 'not_found', message: 'Numista returned candidate types, but no usable coin detail record could be read.' };
    const guide = await loadGuidePrices(Number(selected.id), criteria, selected, providerHeaders(apiKey, clientName, clientId, auth.token!), fetchImpl);
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
            ? `Structured-field Numista catalogue match. Exact Numista grade ${guideMatch.price.grade} has a ${guideMatch.price.currency} ${guideMatch.price.value.toLocaleString()} catalogue estimate; it enters the analyzer as a 25% secondary guide anchor and is not a completed sale.`
            : `Structured-field Numista catalogue match. Selected grade ${guideMatch.selectedGrade} maps to Numista's ${guideMatch.price.grade} grade band, which has a ${guideMatch.price.currency} ${guideMatch.price.value.toLocaleString()} catalogue estimate; it enters the analyzer as a 25% secondary guide anchor and is not a completed sale.`
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
