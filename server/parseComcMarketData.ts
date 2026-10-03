import { buildStructuredItemQuery, resolveTestAiGradingCompany } from '../shared/testAiCriteria';

export type ParseComcLookupInput = {
  title: string;
  category: string;
  grade?: string | null;
  condition?: string | null;
  certificationCompany?: string | null;
  itemDetails?: string | null;
  itemType?: string | null;
};

type JsonRecord = Record<string, any>;

const COMC_API_ID = '214a63d8-8383-4871-9267-593aec0bf063';
const API_KEY_ENV = 'PARSE_BOT_API_KEY';

function text(value: unknown): string { return value == null ? '' : String(value).trim(); }
function record(value: unknown): JsonRecord { return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}; }
function records(value: unknown): JsonRecord[] { return Array.isArray(value) ? value.map(record).filter((entry) => Object.keys(entry).length > 0) : []; }
function normalize(value: unknown): string { return text(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
function categoryName(category: string): string { return normalize(category).replace(/ /g, '_'); }

function providerErrorText(payload: JsonRecord | null, raw: string, status: number): string {
  const candidates = [payload?.message, payload?.error, payload?.detail, payload?.reason, record(payload?.data).message, record(payload?.data).error]
    .map((value) => typeof value === 'string' ? value.trim() : value && typeof value === 'object' ? JSON.stringify(value) : '')
    .filter(Boolean) as string[];
  const detail = candidates[0] || raw.replace(/\s+/g, ' ').trim().slice(0, 300);
  return detail ? `Parse.bot returned HTTP ${status}: ${detail}` : `Parse.bot returned HTTP ${status}.`;
}

function parseDetails(itemDetails?: string | null): JsonRecord {
  if (!itemDetails?.trim()) return {};
  try { return record(JSON.parse(itemDetails)); } catch { return {}; }
}

function buildSearchQuery(input: ParseComcLookupInput): string {
  const details = parseDetails(input.itemDetails);
  const gradingCompany = resolveTestAiGradingCompany(details, input.certificationCompany ?? '');
  return buildStructuredItemQuery(input.category, { ...details, gradingCompany }, [input.grade, input.itemType], input.itemType ?? '');
}

function comcCategory(details: JsonRecord): string | null {
  const sport = text(details.sport || details.sportName || details.league);
  if (!sport) return null;
  const normalized = normalize(sport);
  if (normalized.includes('baseball')) return 'Baseball';
  if (normalized.includes('basketball')) return 'Basketball';
  if (normalized.includes('football')) return 'Football';
  if (normalized.includes('hockey')) return 'Hockey';
  if (normalized.includes('multi')) return 'MultiSport';
  return null;
}

export function isParseComcSourceSupported(category: string): boolean {
  return ['sports_cards', 'pokemon'].includes(categoryName(category));
}

export function getParseComcApiKey(env: NodeJS.ProcessEnv = process.env): string | null {
  return env[API_KEY_ENV]?.trim() || null;
}

export function buildParseComcSearch(input: ParseComcLookupInput) {
  const details = parseDetails(input.itemDetails);
  const query = buildSearchQuery(input);
  const params = new URLSearchParams({ page: '1', sort: 'recently_added' });
  if (query) params.set('query', query);
  const grader = text(resolveTestAiGradingCompany(details, input.certificationCompany ?? ''));
  if (grader && grader.toLowerCase() !== 'other') params.set('grader', grader);
  const providerCategory = categoryName(input.category) === 'sports_cards' ? comcCategory(details) : null;
  if (providerCategory) params.set('category', providerCategory);
  return { query, url: `https://api.parse.bot/scraper/${COMC_API_ID}/search_listings?${params.toString()}` };
}

function significantTokens(value: string): string[] {
  const stop = new Set(['the', 'and', 'card', 'cards', 'trading', 'graded', 'grade', 'sports', 'pokemon', 'pokémon', 'rookie', 'rc']);
  return normalize(value).split(' ').filter((token) => token.length >= 3 && !stop.has(token));
}

function identityMatch(target: ParseComcLookupInput, candidate: JsonRecord): { matched: boolean; score: number; matchedTokens: string[] } {
  const targetTokens = significantTokens(`${target.title} ${target.itemDetails ?? ''}`);
  const candidateText = normalize(`${candidate.title ?? ''} ${candidate.set_description ?? ''} ${candidate.attributes?.join?.(' ') ?? ''}`);
  const matchedTokens = targetTokens.filter((token) => candidateText.includes(token));
  const score = targetTokens.length ? matchedTokens.length / targetTokens.length : 0;
  return { matched: matchedTokens.length >= 2 || matchedTokens.some((token) => token.length >= 7), score, matchedTokens };
}

function normalizePrice(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  const parsed = Number(text(value).replace(/[$,]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeComcListing(row: JsonRecord, target: ParseComcLookupInput): JsonRecord {
  const identity = identityMatch(target, row);
  const price = normalizePrice(row.price_value ?? row.price);
  const gradeText = text(row.grader || row.grade || row.title).match(/\b(PSA|BGS|SGC|CGC|CSG)\s*([0-9]+(?:\.[0-9]+)?)\b/i);
  return {
    sourceId: 'comc_parse', provider: 'COMC via Parse.bot', title: text(row.title || row.set_description),
    setDescription: row.set_description ?? null, url: text(row.url) || null, imageUrl: text(row.image_url) || null,
    price, displayedPrice: text(row.price) || null, currency: 'USD', onSale: row.on_sale ?? null,
    quantityAvailable: row.quantity_available ?? null, auctionTimeLeft: row.auction_time_left ?? null,
    attributes: Array.isArray(row.attributes) ? row.attributes : [], team: row.team ?? null,
    grader: text(row.grader) || gradeText?.[1] || null, grade: text(row.grade) || gradeText?.[2] || null,
    listingType: text(row.listing_type) || 'buy_now', active: true, completed: false, saleStatus: 'active',
    valuationEligible: false, contextOnly: true, priceBasis: 'unknown',
    identityMatched: identity.matched, identityScore: identity.score, matchedTokens: identity.matchedTokens,
    priceSemantics: 'COMC active asking-price inventory via Parse.bot; context only, never completed-sale valuation evidence.',
    raw: row,
  };
}

async function apiGet(url: string, apiKey: string): Promise<{ status: number; payload: JsonRecord | null; error: string | null }> {
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json', 'X-API-Key': apiKey }, signal: AbortSignal.timeout(15_000) });
    const raw = await response.text();
    let payload: JsonRecord | null = null;
    try { payload = record(JSON.parse(raw)); } catch { payload = null; }
    return { status: response.status, payload, error: response.ok ? null : providerErrorText(payload, raw, response.status) };
  } catch (error) {
    return { status: 0, payload: null, error: error instanceof Error ? error.message : 'Parse.bot request failed.' };
  }
}

export async function lookupComcListings(input: ParseComcLookupInput) {
  const request = buildParseComcSearch(input);
  const empty = { source: 'comc_parse' as const, status: 'error' as const, query: request.query, requestUrl: request.url, listings: [] as JsonRecord[], messages: [] as string[], raw: null as JsonRecord | null };
  if (!isParseComcSourceSupported(input.category)) return { ...empty, status: 'not_applicable' as const, messages: ['COMC via Parse.bot is enabled only for Sports Cards and Pokémon.'] };
  if (!request.query) return { ...empty, status: 'review_required' as const, messages: ['No structured item fields were supplied. No listing-title fallback query was sent. Add the player/card, set, year, or card number before searching COMC.'] };
  const apiKey = getParseComcApiKey();
  if (!apiKey) return { ...empty, messages: ['PARSE_BOT_API_KEY is not configured.'] };
  const result = await apiGet(request.url, apiKey);
  if (result.error) return { ...empty, messages: [result.error], raw: result.payload };
  const payload = record(result.payload?.data ?? result.payload);
  const listings = records(payload.listings).slice(0, 25).map((row) => normalizeComcListing(row, input));
  return {
    ...empty, status: 'success' as const, listings,
    totalListings: Number(payload.total_listings) || listings.length,
    totalPages: Number(payload.total_pages) || 1,
    page: Number(payload.page) || 1,
    appliedFilters: { sort: payload.sort ?? 'recently_added', grader: payload.grader ?? null, category: payload.category ?? null, listingType: payload.listing_type ?? null },
    messages: [`COMC returned ${Number(payload.total_listings) || listings.length} active listings. Active asking prices, seller inventory, and variants are context only; completed-sale data is not provided by this Parse.bot API.`],
    raw: result.payload,
  };
}
