export type TheCardApiLookupInput = {
  title: string;
  category: string;
  grade?: string | null;
  condition?: string | null;
  certificationCompany?: string | null;
  itemDetails?: string | null;
};

type JsonRecord = Record<string, unknown>;
type TheCardApiCategory = 'sports' | 'tcg';
type LookupStatus = 'success' | 'partial' | 'review_required' | 'not_found' | 'error';

type ApiResult = {
  status: number;
  payload: JsonRecord | null;
  error: string | null;
  audit: {
    dailyLimit: string | null;
    dailyRemaining: string | null;
    resetAt: string | null;
  };
};

const MARKET_BASE = 'https://thecardapi.com/api/v1/market';
const CATALOG_BASE = 'https://www.thecardapi.com/api/v1/catalog';
const SALE_LIMIT = 20;
const CATALOG_LIMIT = 5;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function asRecords(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) return [];
  return value.map(asRecord).filter((entry) => Object.keys(entry).length > 0);
}

function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalize(value: unknown): string {
  return text(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeCategory(value: string): string {
  return normalize(value).replace(/ /g, '_');
}

function parseDetails(itemDetails: string | null | undefined): JsonRecord {
  if (!itemDetails?.trim()) return {};
  try { return asRecord(JSON.parse(itemDetails)); } catch { return {}; }
}

function firstText(details: JsonRecord, keys: string[]): string {
  for (const key of keys) {
    const value = text(details[key]);
    if (value) return value;
  }
  return '';
}

function firstInteger(details: JsonRecord, keys: string[]): string {
  const value = firstText(details, keys);
  return /^\d{4}$/.test(value) ? value : '';
}

function toCardCategory(category: string): TheCardApiCategory | null {
  const normalized = normalizeCategory(category);
  if (normalized === 'sports_cards') return 'sports';
  if (normalized === 'pokemon') return 'tcg';
  return null;
}

function stableQueryTerms(values: Array<string | null | undefined>): string {
  return values
    .map((value) => text(value))
    .filter(Boolean)
    .filter((value, index, array) => array.findIndex((candidate) => normalize(candidate) === normalize(value)) === index)
    .join(' ')
    .slice(0, 240);
}

function canonicalGrade(value: string | null | undefined): string {
  const normalized = text(value);
  if (!normalized) return '';
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? String(numeric) : normalized;
}

export function getTheCardApiKey(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.THE_CARD_API_KEY?.trim() || null;
}

export function buildTheCardApiQuery(input: TheCardApiLookupInput) {
  const details = parseDetails(input.itemDetails);
  const cardCategory = toCardCategory(input.category);
  const subject = firstText(details, cardCategory === 'tcg'
    ? ['cardName', 'pokemonName', 'name', 'subject']
    : ['player', 'athlete', 'subject', 'cardName', 'name']);
  const setName = firstText(details, ['setName', 'cardSet', 'set', 'series', 'productName']);
  const cardNumber = firstText(details, ['cardNumber', 'cardNo', 'number']);
  const manufacturer = firstText(details, ['manufacturer', 'brand']);
  const variant = firstText(details, ['variant', 'parallel', 'printing', 'edition', 'finish']);
  const year = firstInteger(details, ['year', 'releaseYear', 'cardYear']);
  const sport = firstText(details, ['sport', 'customSport']);
  // Keep provider search focused on stable card identity. Grade and grader are
  // applied as structured filters first, then retried without them because
  // eBay records may expose those fields only in the title.
  const query = stableQueryTerms([year, manufacturer, subject, setName, cardNumber, variant]) || input.title.trim();
  const requestedGrade = canonicalGrade(input.grade);

  const sales = new URLSearchParams({
    q: query,
    limit: String(SALE_LIMIT),
    sort: 'date_desc',
  });
  if (requestedGrade) sales.set('grade', requestedGrade);
  if (input.certificationCompany?.trim()) sales.set('grader', input.certificationCompany.trim());
  if (requestedGrade || input.certificationCompany?.trim()) sales.set('graded', 'true');

  const identityFallback = new URLSearchParams({ q: query, limit: String(SALE_LIMIT), sort: 'date_desc' });

  const catalog = new URLSearchParams({ limit: String(CATALOG_LIMIT) });
  if (cardCategory === 'sports') catalog.set('category', 'sports');
  if (cardCategory === 'tcg') catalog.set('category', 'trading_card_games');
  if (setName) catalog.set('set_name', setName);
  if (cardNumber) catalog.set('card_number', cardNumber.replace(/^#/, ''));
  if (subject || input.title.trim()) catalog.set('q', subject || input.title.trim());
  if (sport && cardCategory === 'sports') catalog.set('sport', sport);
  if (year) catalog.set('year', year);

  return {
    category: cardCategory,
    identity: { subject, setName, cardNumber, manufacturer, variant, year, sport },
    salesPath: `/sales?${sales.toString()}`,
    identityFallbackSalesPath: `/sales?${identityFallback.toString()}`,
    catalogPath: `?${catalog.toString()}`,
    saleLimit: SALE_LIMIT,
    catalogLimit: CATALOG_LIMIT,
  };
}

function dateRecency(value: unknown): 'recent' | 'historical' | 'undated' {
  const saleDate = text(value);
  const time = Date.parse(saleDate);
  if (!Number.isFinite(time)) return 'undated';
  const ageDays = Math.floor((Date.now() - time) / 86_400_000);
  return ageDays >= 0 && ageDays <= 365 ? 'recent' : 'historical';
}

function normalizeSale(sale: JsonRecord) {
  const confirmed = sale.price_confirmed === true;
  const platform = text(sale.platform);
  const price = Number(sale.price);
  const sourceId = 'the_card_api';
  const identityText = stableQueryTerms([
    text(sale.player), text(sale.manufacturer), text(sale.card_set), text(sale.card_number),
    text(sale.year), text(sale.season), text(sale.league), text(sale.sport), text(sale.team),
    ...(Array.isArray(sale.features) ? sale.features.map(text) : []), text(sale.print_run),
  ]);
  return {
    ...sale,
    saleId: text(sale.id) || null,
    sourceId,
    marketplace: platform || null,
    title: text(sale.title) || 'Untitled sale',
    price: Number.isFinite(price) ? price : null,
    currency: text(sale.currency) || null,
    date: text(sale.sold_at) || text(sale.sale_date) || null,
    recency: dateRecency(sale.sold_at ?? sale.sale_date),
    saleStatus: confirmed ? 'completed' as const : 'unknown' as const,
    confirmed,
    imageUrl: text(sale.image_url) || text(sale.thumbnail_url) || null,
    thumbnailUrl: text(sale.thumbnail_url) || null,
    url: text(sale.listing_url) || null,
    certificationCompany: text(sale.grader) || null,
    identityText: identityText || null,
    priceSemantics: platform.toLowerCase() === 'goldin'
      ? 'Hammer price only; buyer premium is excluded by the provider.'
      : String(sale.listing_type).toLowerCase() === 'best_offer'
        ? 'Confirmed negotiated best-offer price; original_price is the pre-negotiation ask when returned.'
        : 'Provider final sale price; eBay records are documented as all-in buyer price.',
  };
}

function candidateScore(candidate: JsonRecord, identity: ReturnType<typeof buildTheCardApiQuery>['identity']): { score: number; exactIdentity: boolean; matched: string[] } {
  const subject = normalize(identity.subject);
  const setName = normalize(identity.setName);
  const cardNumber = normalize(identity.cardNumber).replace(/^ /, '');
  const candidateSubject = normalize(candidate.subject);
  const candidateSet = normalize(candidate.set_name);
  const candidateNumber = normalize(candidate.card_number).replace(/^ /, '');
  const matched: string[] = [];
  let score = 0;
  const subjectMatch = Boolean(subject && candidateSubject && (subject === candidateSubject || subject.includes(candidateSubject) || candidateSubject.includes(subject)));
  const setMatch = Boolean(setName && candidateSet && (setName === candidateSet || setName.includes(candidateSet) || candidateSet.includes(setName)));
  const numberMatch = Boolean(cardNumber && candidateNumber && cardNumber === candidateNumber);
  if (subjectMatch) { score += 6; matched.push('subject'); }
  if (setMatch) { score += 6; matched.push('set'); }
  if (numberMatch) { score += 7; matched.push('card number'); }
  if (identity.year && text(candidate.year) === identity.year) { score += 3; matched.push('year'); }
  const exactIdentity = Boolean(subjectMatch && (numberMatch || setMatch) && (cardNumber ? numberMatch : setMatch));
  return { score, exactIdentity, matched };
}

export function rankTheCardApiCatalogCandidates(input: TheCardApiLookupInput, candidates: JsonRecord[]) {
  const identity = buildTheCardApiQuery(input).identity;
  return candidates
    .map((candidate) => ({ candidate, ...candidateScore(candidate, identity) }))
    .sort((left, right) => right.score - left.score);
}

async function apiGet(baseUrl: string, path: string, headerName: 'x-market-api-key' | 'x-api-key', apiKey: string): Promise<ApiResult> {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { Accept: 'application/json', [headerName]: apiKey },
      signal: AbortSignal.timeout(15_000),
    });
    const raw = await response.text();
    let payload: JsonRecord | null = null;
    try { payload = asRecord(JSON.parse(raw)); } catch { payload = null; }
    const error = text(payload?.error ?? payload?.message ?? raw.slice(0, 240));
    return {
      status: response.status,
      payload,
      error: response.ok ? null : error || `The Card API returned HTTP ${response.status}.`,
      audit: {
        dailyLimit: response.headers.get('x-ratelimit-limit'),
        dailyRemaining: response.headers.get('x-ratelimit-remaining'),
        resetAt: response.headers.get('x-ratelimit-reset'),
      },
    };
  } catch (error) {
    return {
      status: 0,
      payload: null,
      error: error instanceof Error ? error.message : 'The Card API request failed.',
      audit: { dailyLimit: null, dailyRemaining: null, resetAt: null },
    };
  }
}

function catalogStatus(result: ApiResult) {
  if (result.status === 200) return { status: 'available' as const, message: null, candidates: asRecords(result.payload?.data), audit: result.audit };
  if (result.status === 403) return { status: 'unavailable_for_plan' as const, message: 'The Card API catalog is unavailable on the current plan. Completed-sale records remain available independently.', candidates: [], audit: result.audit };
  if (result.status === 422) return { status: 'not_requested' as const, message: 'No precise catalog identifier was available for this listing, so catalog results were not used.', candidates: [], audit: result.audit };
  if (result.status === 404) return { status: 'not_found' as const, message: 'No catalog record was returned for the listing identity.', candidates: [], audit: result.audit };
  return { status: 'error' as const, message: result.error ?? 'The Card API catalog lookup could not be completed.', candidates: [], audit: result.audit };
}

/**
 * Read-only, sandbox-only market adapter. It deliberately preserves every sales
 * field returned by The Card API in `raw` and only marks confirmed, dated sales
 * as candidates for the existing completed-sale comparable gate.
 */
export async function lookupTheCardApi(input: TheCardApiLookupInput) {
  const request = buildTheCardApiQuery(input);
  if (!request.category) {
    return {
      status: 'error' as LookupStatus,
      request,
      sales: [],
      catalog: { status: 'not_requested' as const, message: 'The Card API source is available only for Sports Cards and Pokémon/TCG items.', candidates: [], audit: null },
      messages: ['The Card API source is available only for Sports Cards and Pokémon/TCG items.'],
      raw: { sales: null, catalog: null },
      audit: { sales: null, catalog: null },
      visualFilter: null,
    };
  }

  const apiKey = getTheCardApiKey();
  if (!apiKey) {
    return {
      status: 'error' as LookupStatus,
      request,
      sales: [],
      catalog: { status: 'not_requested' as const, message: 'THE_CARD_API_KEY is not configured.', candidates: [], audit: null },
      messages: ['THE_CARD_API_KEY is not configured.'],
      raw: { sales: null, catalog: null },
      audit: { sales: null, catalog: null },
      visualFilter: null,
    };
  }

  let salesResult = await apiGet(MARKET_BASE, request.salesPath, 'x-market-api-key', apiKey);
  if (salesResult.error) {
    return {
      status: 'error' as LookupStatus,
      request,
      sales: [],
      catalog: { status: 'not_requested' as const, message: 'Catalog lookup was not requested because the completed-sales request failed.', candidates: [], audit: null },
      messages: [salesResult.error],
      raw: { sales: salesResult.payload, catalog: null },
      audit: { sales: salesResult.audit, catalog: null },
      visualFilter: null,
    };
  }

  let usedIdentityFallback = false;
  if (asRecords(salesResult.payload?.data).length === 0) {
    const fallbackResult = await apiGet(MARKET_BASE, request.identityFallbackSalesPath, 'x-market-api-key', apiKey);
    if (!fallbackResult.error && asRecords(fallbackResult.payload?.data).length > 0) {
      salesResult = fallbackResult;
      usedIdentityFallback = true;
    }
  }

  const catalogResult = await apiGet(CATALOG_BASE, request.catalogPath, 'x-api-key', apiKey);
  const catalog = catalogStatus(catalogResult);
  const candidates = rankTheCardApiCatalogCandidates(input, catalog.candidates);
  const exactCatalogCandidate = candidates.find((candidate) => candidate.exactIdentity) ?? null;
  const sales = asRecords(salesResult.payload?.data).map(normalizeSale);
  const confirmedCount = sales.filter((sale) => sale.confirmed).length;
  const unconfirmedCount = sales.length - confirmedCount;
  const messages = [
    'Read-only The Card API sales remain subject to Tradebilia’s identity, date, grade/company, duplicate, currency, and recency evidence gates. The provider does not override valuation safeguards.',
    exactCatalogCandidate ? 'A catalog candidate matched the listing identity. Catalog fields are factual context only.' : null,
    usedIdentityFallback ? 'The provider returned no rows with structured grade/grader filters, so Tradebilia retried the stable card-identity query and applied grade and identity gates locally.' : null,
    catalog.message,
    unconfirmedCount ? `${unconfirmedCount} returned sale${unconfirmedCount === 1 ? ' is' : 's are'} unconfirmed fast-settle data and retained as context only.` : null,
    sales.some((sale) => String(sale.marketplace).toLowerCase() === 'goldin') ? 'Goldin prices are hammer prices in the provider response and exclude buyer premium; they remain individually labeled.' : null,
  ].filter((message): message is string => Boolean(message));

  return {
    status: (sales.length ? (catalog.status === 'available' || catalog.status === 'not_found' ? 'success' : 'partial') : 'not_found') as LookupStatus,
    request: usedIdentityFallback ? { ...request, salesPath: request.identityFallbackSalesPath } : request,
    sales,
    catalog: {
      ...catalog,
      candidates,
      selected: exactCatalogCandidate,
    },
    pagination: asRecord(salesResult.payload?.pagination),
    metadata: asRecord(salesResult.payload?.meta),
    messages,
    raw: { sales: salesResult.payload, catalog: catalogResult.payload },
    audit: { sales: salesResult.audit, catalog: catalogResult.audit },
    visualFilter: null,
  };
}
