export type HipstampLookupInput = {
  title: string;
  category: string;
  grade?: string;
  condition?: string;
  certificationCompany?: string;
  itemDetails?: string;
};

export type HipstampListing = {
  id: string;
  title: string;
  price: number;
  currency: string;
  condition?: string;
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

  const cert = text(input.certificationCompany);
  const grade = text(input.grade);
  if (cert && grade) parts.push(cert, grade);
  else if (grade) parts.push(grade);

  const fallbackTitle = text(input.title);
  const query = (parts.length ? parts : [fallbackTitle]).join(' ').replace(/\s+/g, ' ').trim();
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

export function filterHipstampListings(listings: HipstampListing[], input: HipstampLookupInput): HipstampListing[] {
  const details = parseDetails(input.itemDetails);
  const targetCountry = firstText(details, ['country', 'issuingCountry']);
  const targetCatalog = firstText(details, ['scottNumber', 'catalogNumber', 'catalogNo', 'number']);
  const targetGrade = numericGrade(input.grade);

  return listings.filter((listing) => {
    if (targetCountry && listing.country && !equivalent(targetCountry, listing.country)) return false;
    if (targetCatalog && listing.catalogNumber && !equivalent(targetCatalog, listing.catalogNumber)) return false;
    if (targetGrade !== null && listing.certificateGrade) {
      const candidateGrade = numericGrade(listing.certificateGrade);
      if (candidateGrade !== null && Math.round(candidateGrade * 10) !== Math.round(targetGrade * 10)) return false;
    }
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
  debug: { totalFetched: number; afterIdentityFilter: number; nonUsdListings: number };
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
    const queries = [requestedQuery, fallbackQuery].filter((candidate, index, all) => candidate && all.indexOf(candidate) === index);
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
    const filtered = filterHipstampListings(fetched, input);
    const nonUsdListings = filtered.filter((listing) => listing.currency !== 'USD').length;
    const listings = filtered.slice(0, 20);
    return {
      query,
      listings,
      metrics: computeHipstampMetrics(listings),
      debug: { totalFetched: fetched.length, afterIdentityFilter: filtered.length, nonUsdListings },
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
    const filtered = filterHipstampListings(fetched, input);
    const nonUsdListings = filtered.filter((listing) => listing.currency !== 'USD').length;
    const listings = filtered.slice(0, 20);
    return {
      query,
      listings,
      metrics: computeHipstampMetrics(listings),
      debug: { storesDiscovered: stores.length, storesQueried: stores.length, totalFetched: fetched.length, afterIdentityFilter: filtered.length, nonUsdListings },
      error: null,
    };
  } catch {
    return { query, listings: [], metrics: null, debug: emptyDebug, error: 'HIPStamp sold API request failed' };
  }
}
