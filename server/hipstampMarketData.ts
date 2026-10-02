import fs from 'node:fs';
import path from 'node:path';
import { classifyStampFormat, classifyStampListing, stampFormatsCompatible, type StampFormatProfile } from './stampFormat';
import { normalizeTestAiGrade, resolveTestAiGradingCompany } from '../shared/testAiCriteria';

export type HipstampLookupInput = {
  title: string;
  category: string;
  grade?: string;
  condition?: string;
  certificationCompany?: string;
  itemDetails?: string;
  itemType?: string;
};

export type HipstampListing = {
  id: string;
  title: string;
  price: number;
  currency: string;
  condition?: string;
  format?: string;
  seller?: string;
  itemUrl?: string;
  imageUrl?: string;
  listingType?: string;
  categoryPath?: string;
  country?: string;
  catalogNumber?: string;
  certificateGrade?: string;
  hasCertificate?: string;
  startedAt?: string;
  closedAt?: string;
  quantity?: number;
  bidCount?: number;
  originalPrice?: number;
  storeUsername?: string;
  saleStatus?: 'sold';
  description?: string;
};

export type HipstampSoldDebug = {
  storesDiscovered: number;
  storesQueried: number;
  totalFetched: number;
  afterIdentityFilter: number;
  nonUsdListings: number;
  formatExcluded?: number;
  targetFormat?: StampFormatProfile;
};

export type HipstampMetrics = {
  avg: number;
  median: number;
  min: number;
  max: number;
  spreadPct: number;
  count: number;
  confidence: 'high' | 'medium' | 'low';
};

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

function parseDetails(itemDetails?: string): Record<string, unknown> {
  if (!itemDetails) return {};
  try {
    const parsed = JSON.parse(itemDetails);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function firstText(details: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = text(details[key]);
    if (value) return value;
  }
  return '';
}

function normalized(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

type HipstampQueryLearningEntry = { query: string; successes: number; lastUsedAt: number };
const HIPSTAMP_QUERY_LEARNING_MAX_KEYS = 250;
const HIPSTAMP_QUERY_LEARNING_MAX_VARIANTS = 4;
const hipstampQueryLearningPath = process.env.TRADEBILIA_HIPSTAMP_QUERY_LEARNING_PATH ?? path.join('/tmp', 'tradebilia-hipstamp-query-learning.json');
const hipstampQueryLearning = new Map<string, HipstampQueryLearningEntry[]>();
let hipstampQueryLearningLoaded = false;

function hipstampLearningKey(input: HipstampLookupInput): string {
  const details = parseDetails(input.itemDetails);
  return normalized(`${input.title} ${firstText(details, ['scottNumber', 'catalogNumber', 'catalogNo', 'number'])}`);
}

function loadHipstampQueryLearning(): void {
  if (hipstampQueryLearningLoaded) return;
  hipstampQueryLearningLoaded = true;
  try {
    const parsed = JSON.parse(fs.readFileSync(hipstampQueryLearningPath, 'utf8')) as Record<string, unknown>;
    for (const [key, value] of Object.entries(parsed)) {
      if (!Array.isArray(value)) continue;
      const entries = value.filter((entry): entry is HipstampQueryLearningEntry => Boolean(entry && typeof entry === 'object' && typeof (entry as HipstampQueryLearningEntry).query === 'string' && Number.isFinite((entry as HipstampQueryLearningEntry).successes) && Number.isFinite((entry as HipstampQueryLearningEntry).lastUsedAt))).slice(0, HIPSTAMP_QUERY_LEARNING_MAX_VARIANTS);
      if (entries.length) hipstampQueryLearning.set(key, entries);
    }
  } catch { /* best-effort persistence; lookup remains available */ }
}

function persistHipstampQueryLearning(): void {
  try {
    fs.mkdirSync(path.dirname(hipstampQueryLearningPath), { recursive: true });
    const temporaryPath = `${hipstampQueryLearningPath}.${process.pid}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(Object.fromEntries(hipstampQueryLearning), null, 2), 'utf8');
    fs.renameSync(temporaryPath, hipstampQueryLearningPath);
  } catch { /* persistence must never block market lookup */ }
}

function rankHipstampQueries(input: HipstampLookupInput, queries: string[]): string[] {
  loadHipstampQueryLearning();
  const scores = new Map((hipstampQueryLearning.get(hipstampLearningKey(input)) ?? []).map((entry) => [entry.query, entry.successes]));
  return [...queries].sort((left, right) => (scores.get(right) ?? 0) - (scores.get(left) ?? 0));
}

function rememberHipstampQuery(input: HipstampLookupInput, query: string): void {
  loadHipstampQueryLearning();
  const key = hipstampLearningKey(input);
  const entries = hipstampQueryLearning.get(key) ?? [];
  const existing = entries.find((entry) => entry.query === query);
  if (existing) { existing.successes += 1; existing.lastUsedAt = Date.now(); }
  else entries.push({ query, successes: 1, lastUsedAt: Date.now() });
  entries.sort((left, right) => right.successes - left.successes || right.lastUsedAt - left.lastUsedAt);
  hipstampQueryLearning.set(key, entries.slice(0, HIPSTAMP_QUERY_LEARNING_MAX_VARIANTS));
  if (hipstampQueryLearning.size > HIPSTAMP_QUERY_LEARNING_MAX_KEYS) {
    const oldestKey = [...hipstampQueryLearning.entries()].sort((left, right) => Math.min(...left[1].map((entry) => entry.lastUsedAt)) - Math.min(...right[1].map((entry) => entry.lastUsedAt)))[0]?.[0];
    if (oldestKey) hipstampQueryLearning.delete(oldestKey);
  }
  persistHipstampQueryLearning();
}

function equivalent(left: string, right: string): boolean {
  return normalized(left) === normalized(right);
}

export function getHipstampApiKey(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.HIPSTAMP_API_KEY || null;
}

export function buildHipstampQuery(input: HipstampLookupInput): string {
  const details = parseDetails(input.itemDetails);
  const parts = [
    firstText(details, ['country', 'issuingCountry']),
    firstText(details, ['scottNumber', 'catalogNumber', 'catalogNo', 'number']),
    firstText(details, ['denomination', 'faceValue']),
    firstText(details, ['issueYear', 'year']),
  ].filter(Boolean);

  const cert = resolveTestAiGradingCompany(details, text(input.certificationCompany));
  const grade = normalizeTestAiGrade(input.grade, cert);
  if (cert && grade) parts.push(cert, grade);
  else if (grade) parts.push(grade);

  const fallbackTitle = text(input.title);
  const formatProfile = classifyStampFormat(input);
  const query = [...(parts.length ? parts : [fallbackTitle]), ...formatProfile.queryTerms].join(' ').replace(/\s+/g, ' ').trim();
  return query.slice(0, 240);
}

function buildHipstampIdentityQuery(input: HipstampLookupInput): string {
  const details = parseDetails(input.itemDetails);
  return (
    firstText(details, ['scottNumber', 'catalogNumber', 'catalogNo', 'number'])
    || firstText(details, ['country', 'issuingCountry'])
    || text(input.title)
  ).slice(0, 240);
}

function firstImage(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const candidate = value.find((entry) => typeof entry === 'string' && /^https?:\/\//i.test(entry));
    return candidate as string | undefined;
  }
  if (typeof value === 'string' && /^https?:\/\//i.test(value)) return value;
  return undefined;
}

function amount(value: unknown): number {
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeHipstampListing(raw: any): HipstampListing | null {
  const price = amount(raw?.current_price ?? raw?.buyout_price ?? raw?.start_price);
  const title = text(raw?.name ?? raw?.display_name ?? raw?.title);
  const id = text(raw?.id ?? raw?.listing_id);
  if (!id || !title || price <= 0) return null;

  return {
    id,
    title,
    price,
    currency: text(raw?.currency || 'USD').toUpperCase(),
    condition: text(raw?.item_specifics_04_condition) || undefined,
    format: text(raw?.item_specifics_05_format || raw?.item_specifics_03_stamp_type) || undefined,
    seller: text(raw?.username) || undefined,
    itemUrl: text(raw?.url) || undefined,
    imageUrl: firstImage(raw?.images),
    listingType: text(raw?.listing_type) || undefined,
    categoryPath: text(raw?.category_path) || undefined,
    country: text(raw?.item_specifics_01_country) || undefined,
    catalogNumber: text(raw?.item_specifics_02_catalog_number) || undefined,
    certificateGrade: text(raw?.item_specifics_10_certificate_grade) || undefined,
    hasCertificate: text(raw?.item_specifics_09_has_a_certificate) || undefined,
    startedAt: text(raw?.start_time || raw?.created_at) || undefined,
    closedAt: text(raw?.end_time || raw?.closed_at) || undefined,
    quantity: Number.isFinite(Number(raw?.quantity)) ? Number(raw.quantity) : undefined,
    bidCount: Number.isFinite(Number(raw?.bid_count)) ? Number(raw.bid_count) : undefined,
    originalPrice: Number.isFinite(Number(raw?.original_price)) ? Number(raw.original_price) : undefined,
    storeUsername: text(raw?.username) || undefined,
    description: text(raw?.description) || undefined,
  };
}

export function normalizeHipstampResponse(payload: any): HipstampListing[] {
  const results = Array.isArray(payload) ? payload : payload?.results ?? payload?.listings ?? payload?.data ?? [];
  if (!Array.isArray(results)) return [];
  return results.map(normalizeHipstampListing).filter((entry): entry is HipstampListing => Boolean(entry));
}

function numericGrade(value: string | undefined): number | null {
  const match = text(value).match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function filterHipstampListings(listings: HipstampListing[], input: HipstampLookupInput, options: { ignoreFormat?: boolean } = {}): HipstampListing[] {
  const details = parseDetails(input.itemDetails);
  const targetCountry = firstText(details, ['country', 'issuingCountry']);
  const targetCatalog = firstText(details, ['scottNumber', 'catalogNumber', 'catalogNo', 'number']);
  const targetGrade = numericGrade(input.grade);
  const targetFormat = classifyStampFormat(input);

  return listings.filter((listing) => {
    if (targetCountry && listing.country && !equivalent(targetCountry, listing.country)) return false;
    if (targetCatalog && listing.catalogNumber && !equivalent(targetCatalog, listing.catalogNumber)) return false;
    if (targetGrade !== null && listing.certificateGrade) {
      const candidateGrade = numericGrade(listing.certificateGrade);
      if (candidateGrade !== null && Math.round(candidateGrade * 10) !== Math.round(targetGrade * 10)) return false;
    }
    if (!options.ignoreFormat && !stampFormatsCompatible(targetFormat, classifyStampListing(listing))) return false;
    return true;
  });
}

export function computeHipstampMetrics(listings: HipstampListing[]): HipstampMetrics | null {
  const prices = listings
    .filter((listing) => listing.currency === 'USD' && listing.price > 0)
    .map((listing) => listing.price)
    .sort((a, b) => a - b);
  if (!prices.length) return null;

  const q1 = prices[Math.floor(prices.length * 0.25)];
  const q3 = prices[Math.floor(prices.length * 0.75)];
  const iqr = q3 - q1;
  const filtered = prices.filter((price) => price >= q1 - 1.5 * iqr && price <= q3 + 1.5 * iqr);
  const final = filtered.length >= 3 ? filtered : prices;
  const count = final.length;
  const roundCents = (value: number) => Math.round(value * 100) / 100;
  const avg = roundCents(final.reduce((sum, price) => sum + price, 0) / count);
  const mid = Math.floor(count / 2);
  const median = roundCents(count % 2 ? final[mid] : (final[mid - 1] + final[mid]) / 2);
  const min = roundCents(final[0]);
  const max = roundCents(final[count - 1]);
  const spreadPct = avg > 0 ? Math.round(((max - min) / avg) * 100) : 0;
  const confidence: HipstampMetrics['confidence'] = count >= 7 && spreadPct < 80 ? 'high' : count >= 4 ? 'medium' : 'low';
  return { avg, median, min, max, spreadPct, count, confidence };
}

export async function lookupHipstampListings(input: HipstampLookupInput): Promise<{
  query: string;
  listings: HipstampListing[];
  metrics: HipstampMetrics | null;
  debug: { totalFetched: number; afterIdentityFilter: number; nonUsdListings: number; formatExcluded?: number; targetFormat?: StampFormatProfile };
  error: string | null;
}> {
  const requestedQuery = buildHipstampQuery(input);
  const fallbackQuery = buildHipstampIdentityQuery(input);
  let query = requestedQuery;
  const apiKey = getHipstampApiKey();
  if (!apiKey) {
    return { query, listings: [], metrics: null, debug: { totalFetched: 0, afterIdentityFilter: 0, nonUsdListings: 0 }, error: 'HIPSTAMP_API_KEY is not configured' };
  }

  try {
    const queries = rankHipstampQueries(input, [requestedQuery, fallbackQuery].filter((candidate, index, all) => candidate && all.indexOf(candidate) === index));
    let fetched: HipstampListing[] = [];
    for (const candidateQuery of queries) {
      const params = new URLSearchParams({ limit: '50', page: '1', sort: 'default' });
      params.set('keywords', candidateQuery);
      const response = await fetch(`https://www.hipstamp.com/api/listings?${params.toString()}`, {
        headers: { Accept: 'application/json', 'X-ApiKey': apiKey },
      });
      const responseBody = await response.text();
      if (!response.ok) {
        return { query: candidateQuery, listings: [], metrics: null, debug: { totalFetched: 0, afterIdentityFilter: 0, nonUsdListings: 0 }, error: `HIPStamp API returned HTTP ${response.status}` };
      }
      let payload: unknown;
      try {
        payload = JSON.parse(responseBody);
      } catch {
        return { query: candidateQuery, listings: [], metrics: null, debug: { totalFetched: 0, afterIdentityFilter: 0, nonUsdListings: 0 }, error: 'HIPStamp API returned invalid JSON' };
      }
      fetched = normalizeHipstampResponse(payload);
      query = candidateQuery;
      if (fetched.length > 0 || candidateQuery === queries[queries.length - 1]) break;
    }
    const identityFiltered = filterHipstampListings(fetched, input, { ignoreFormat: true });
    const filtered = filterHipstampListings(identityFiltered, input);
    const nonUsdListings = filtered.filter((listing) => listing.currency !== 'USD').length;
    const listings = filtered.slice(0, 20);
    if (listings.length > 0) rememberHipstampQuery(input, query);
    return {
      query,
      listings,
      metrics: computeHipstampMetrics(listings),
      debug: { totalFetched: fetched.length, afterIdentityFilter: filtered.length, nonUsdListings, formatExcluded: identityFiltered.length - filtered.length, targetFormat: classifyStampFormat(input) },
      error: null,
    };
  } catch {
    return { query, listings: [], metrics: null, debug: { totalFetched: 0, afterIdentityFilter: 0, nonUsdListings: 0 }, error: 'HIPStamp API request failed' };
  }
}

export async function lookupHipstampSoldListings(input: HipstampLookupInput): Promise<{
  query: string;
  listings: HipstampListing[];
  metrics: HipstampMetrics | null;
  debug: HipstampSoldDebug;
  error: string | null;
}> {
  const query = buildHipstampQuery(input);
  const emptyDebug: HipstampSoldDebug = { storesDiscovered: 0, storesQueried: 0, totalFetched: 0, afterIdentityFilter: 0, nonUsdListings: 0 };
  const apiKey = getHipstampApiKey();
  if (!apiKey) return { query, listings: [], metrics: null, debug: emptyDebug, error: 'HIPSTAMP_API_KEY is not configured' };

  try {
    const active = await lookupHipstampListings(input);
    const stores = [...new Set(active.listings.map((listing) => listing.storeUsername).filter(Boolean) as string[])].slice(0, 5);
    const fetched: HipstampListing[] = [];
    for (const username of stores) {
      const params = new URLSearchParams({ limit: '50', page: '1', sort: 'ending_desc', show: 'sold', keywords: query });
      const response = await fetch(`https://www.hipstamp.com/api/stores/${encodeURIComponent(username)}/listings/closed?${params.toString()}`, {
        headers: { Accept: 'application/json', 'X-ApiKey': apiKey },
      });
      const responseBody = await response.text();
      if (!response.ok) return { query, listings: [], metrics: null, debug: { ...emptyDebug, storesDiscovered: stores.length, storesQueried: fetched.length ? stores.indexOf(username) : 0 }, error: `HIPStamp sold API returned HTTP ${response.status}` };
      let payload: unknown;
      try { payload = JSON.parse(responseBody); } catch { return { query, listings: [], metrics: null, debug: { ...emptyDebug, storesDiscovered: stores.length }, error: 'HIPStamp sold API returned invalid JSON' }; }
      const records = normalizeHipstampResponse(payload).map((listing) => ({ ...listing, storeUsername: username, saleStatus: 'sold' as const }));
      fetched.push(...records);
    }
    const identityFiltered = filterHipstampListings(fetched, input, { ignoreFormat: true });
    const filtered = filterHipstampListings(identityFiltered, input);
    const nonUsdListings = filtered.filter((listing) => listing.currency !== 'USD').length;
    const listings = filtered.slice(0, 20);
    if (listings.length > 0) rememberHipstampQuery(input, query);
    return {
      query,
      listings,
      metrics: computeHipstampMetrics(listings),
      debug: { storesDiscovered: stores.length, storesQueried: stores.length, totalFetched: fetched.length, afterIdentityFilter: filtered.length, nonUsdListings, formatExcluded: identityFiltered.length - filtered.length, targetFormat: classifyStampFormat(input) },
      error: null,
    };
  } catch {
    return { query, listings: [], metrics: null, debug: emptyDebug, error: 'HIPStamp sold API request failed' };
  }
}
