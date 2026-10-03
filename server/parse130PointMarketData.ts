import { buildStructuredItemQuery, resolveTestAiGradingCompany } from '../shared/testAiCriteria';
import { classifySaleRecency, parseErrorMessage } from './parseMarketData';

export type Parse130PointLookupInput = {
  query?: string | null;
  title?: string | null;
  category: string;
  grade?: string | null;
  condition?: string | null;
  certificationCompany?: string | null;
  itemDetails?: string | null;
  itemType?: string | null;
};

type JsonRecord = Record<string, any>;

const PARSE_API_BASE = 'https://api.parse.bot/scraper';
export const PARSE_130POINT_API_ID = 'e3b4a6b9-14b1-42bf-ae20-efd1b5728bdc';
const API_KEY_ENV = 'PARSE_BOT_API_KEY';

function text(value: unknown): string { return value == null ? '' : String(value).trim(); }
function record(value: unknown): JsonRecord { return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}; }
function records(value: unknown): JsonRecord[] { return Array.isArray(value) ? value.map(record).filter((entry) => Object.keys(entry).length > 0) : []; }
function normalize(value: unknown): string { return text(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
function categoryName(category: string): string { return normalize(category).replace(/ /g, '_'); }

function parseDetails(itemDetails?: string | null): JsonRecord {
  if (!itemDetails?.trim()) return {};
  try { return record(JSON.parse(itemDetails)); } catch { return {}; }
}

/** Build only from structured item fields; the stored listing title is never used as a query fallback. */
export function buildParse130PointSearch(input: Parse130PointLookupInput) {
  const details = parseDetails(input.itemDetails);
  const gradingCompany = resolveTestAiGradingCompany(details, input.certificationCompany ?? '');
  const query = buildStructuredItemQuery(
    input.category,
    { ...details, gradingCompany },
    [input.grade, input.itemType],
    input.itemType ?? '',
  ).trim();
  const params = new URLSearchParams({ sort: 'EndTimeSoonest', limit: '200', marketplace: 'all' });
  if (query) params.set('query', query);
  return { query, url: `${PARSE_API_BASE}/${PARSE_130POINT_API_ID}/search_sold_items?${params.toString()}` };
}

export function getParse130PointApiKey(env: NodeJS.ProcessEnv = process.env): string | null {
  return env[API_KEY_ENV]?.trim() || null;
}

function normalizePrice(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(text(value).replace(/[$,]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function explicitCurrency(value: unknown): string | null {
  const currency = text(value).toUpperCase();
  return currency || null;
}

export function normalizeParse130PointSale(row: JsonRecord, nowMs = Date.now()): JsonRecord {
  const date = text(row.end_time_utc || row.sale_date || row.date) || null;
  const price = normalizePrice(row.price);
  return {
    id: text(row.id || row.source_id) || null,
    sourceId: 'one_thirty_point',
    sourceAdapter: 'parse_130point',
    title: text(row.title) || 'Untitled completed sale',
    price,
    displayedPrice: text(row.price_display) || null,
    currency: explicitCurrency(row.currency),
    date,
    recency: classifySaleRecency(date, nowMs),
    saleType: text(row.sale_type) || null,
    marketplace: text(row.sold_via || row.marketplace) || null,
    originMarketplace: text(row.marketplace) || null,
    url: text(row.url) || null,
    imageUrl: text(row.image_url) || null,
    bids: row.bids ?? null,
    completed: true,
    saleStatus: 'completed',
    priceBasis: 'sold',
    valuationEligible: Boolean(price && date && explicitCurrency(row.currency) === 'USD'),
    contextOnly: !(price && date && explicitCurrency(row.currency) === 'USD'),
    raw: row,
  };
}

async function apiGet(url: string, apiKey: string): Promise<{ status: number; payload: JsonRecord | null; raw: string }> {
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json', 'X-API-Key': apiKey }, signal: AbortSignal.timeout(15_000) });
    const raw = await response.text();
    let payload: JsonRecord | null = null;
    try { payload = record(JSON.parse(raw)); } catch { payload = null; }
    return { status: response.status, payload, raw };
  } catch (error) {
    return { status: 0, payload: null, raw: error instanceof Error ? error.message : 'Parse.bot request failed.' };
  }
}

export async function lookupParse130PointSales(input: Parse130PointLookupInput) {
  const request = buildParse130PointSearch(input);
  const empty = {
    source: 'one_thirty_point' as const,
    status: 'error' as const,
    query: request.query,
    requestUrl: request.url,
    data: null as JsonRecord | null,
    message: null as string | null,
    visualFilter: null as JsonRecord | null,
  };
  if (!['sports_cards', 'pokemon'].includes(categoryName(input.category))) {
    return { ...empty, status: 'not_applicable' as const, message: 'Parse.bot 130point is enabled only for Sports Cards and Pokémon.' };
  }
  if (!request.query) {
    return { ...empty, status: 'review_required' as const, message: 'No structured item fields were supplied. No listing-title fallback query was sent. Add the player/card, set, year, or card number before searching 130point.' };
  }
  const apiKey = getParse130PointApiKey();
  if (!apiKey) return { ...empty, message: 'PARSE_BOT_API_KEY is not configured.' };
  const result = await apiGet(request.url, apiKey);
  if (result.status === 0) return { ...empty, message: result.raw };
  if (result.status < 200 || result.status >= 300) {
    return { ...empty, message: parseErrorMessage(result.status, 'Parse 130point', result.payload) };
  }
  const payload = record(result.payload?.data ?? result.payload);
  const items = records(payload.items).slice(0, 200).map((row) => normalizeParse130PointSale(row));
  return {
    ...empty,
    status: 'success' as const,
    data: {
      totalFound: Number(payload.total_found) || items.length,
      itemsReturned: Number(payload.items_returned) || items.length,
      items,
      sort: payload.sort ?? 'EndTimeSoonest',
      marketplace: payload.marketplace ?? 'all',
      newestEndTimeUtc: payload.newest_end_time_utc ?? null,
      oldestEndTimeUtc: payload.oldest_end_time_utc ?? null,
    },
    message: `Parse.bot 130point returned ${Number(payload.total_found) || items.length} completed sales across eBay, Fanatics Collect, Goldin, MySlabs, Pristine Auctions, and Heritage Auctions.`,
  };
}
