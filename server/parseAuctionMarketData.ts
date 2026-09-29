export type ParseAuctionLookupInput = {
  title: string;
  category: string;
  grade?: string | null;
  condition?: string | null;
  certificationCompany?: string | null;
  itemDetails?: string | null;
  itemType?: string | null;
  imageUrl?: string | null;
};

type JsonRecord = Record<string, any>;
type SourceId = 'lelands' | 'pristine_auction';

const API_KEY_ENV = 'PARSE_BOT_API_KEY';
const SOURCES = {
  lelands: { id: 'd219970c-feb5-4d1a-a22e-9146392618be', search: 'search_sales', detail: 'get_lot' },
  pristine_auction: { id: '90fb8e63-d89d-4d24-8445-c25ef960c168', search: 'search_lots', detail: 'get_lot' },
} as const;

function text(value: unknown): string { return value == null ? '' : String(value).trim(); }
function record(value: unknown): JsonRecord { return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}; }
function records(value: unknown): JsonRecord[] { return Array.isArray(value) ? value.map(record).filter((entry) => Object.keys(entry).length > 0) : []; }
function normalize(value: unknown): string { return text(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
function categoryName(category: string): string { return normalize(category).replace(/ /g, '_'); }

function parseDetails(itemDetails?: string | null): JsonRecord {
  if (!itemDetails?.trim()) return {};
  try { return record(JSON.parse(itemDetails)); } catch { return {}; }
}

function buildSearchQuery(input: ParseAuctionLookupInput): string {
  const details = parseDetails(input.itemDetails);
  const values = [
    input.title,
    details.player, details.athlete, details.subject, details.cardName,
    details.setName, details.cardSet, details.year, details.cardNumber,
    input.certificationCompany, input.grade,
  ].map(text).filter(Boolean);
  return Array.from(new Set(values)).join(' ').slice(0, 240).trim() || input.title.trim();
}

function significantTokens(value: string): string[] {
  const stop = new Set(['the', 'and', 'card', 'cards', 'trading', 'graded', 'grade', 'sports', 'auction', 'lot', 'rookie', 'rc']);
  return normalize(value).split(' ').filter((token) => token.length >= 3 && !stop.has(token));
}

export function isParseAuctionSourceSupported(source: SourceId, category: string): boolean {
  const normalized = categoryName(category);
  if (source === 'pristine_auction') return normalized === 'sports_cards';
  return ['sports_cards', 'autographs'].includes(normalized);
}

export function getParseAuctionApiKey(env: NodeJS.ProcessEnv = process.env): string | null {
  return env[API_KEY_ENV]?.trim() || null;
}

export function buildParseAuctionSearch(source: SourceId, input: ParseAuctionLookupInput) {
  const query = buildSearchQuery(input);
  if (source === 'lelands') {
    const params = new URLSearchParams({ query, limit: '5', sort: 'best', offset: '0' });
    return { query, url: `https://api.parse.bot/scraper/${SOURCES.lelands.id}/${SOURCES.lelands.search}?${params.toString()}` };
  }
  const params = new URLSearchParams({ query, status: 'completed', page: '1' });
  return { query, url: `https://api.parse.bot/scraper/${SOURCES.pristine_auction.id}/${SOURCES.pristine_auction.search}?${params.toString()}` };
}

async function apiGet(url: string, apiKey: string): Promise<{ status: number; payload: JsonRecord | null; error: string | null }> {
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json', 'X-API-Key': apiKey }, signal: AbortSignal.timeout(15_000) });
    const raw = await response.text();
    let payload: JsonRecord | null = null;
    try { payload = record(JSON.parse(raw)); } catch { payload = null; }
    const providerError = text(payload?.message ?? payload?.error ?? raw.slice(0, 240));
    return { status: response.status, payload, error: response.ok ? null : providerError || `Parse.bot returned HTTP ${response.status}.` };
  } catch (error) {
    return { status: 0, payload: null, error: error instanceof Error ? error.message : 'Parse.bot request failed.' };
  }
}

function identityMatch(target: ParseAuctionLookupInput, title: string, description = ''): { matched: boolean; score: number; matchedTokens: string[] } {
  const targetTokens = significantTokens(`${target.title} ${target.itemDetails ?? ''}`);
  const candidate = normalize(`${title} ${description}`);
  const matchedTokens = targetTokens.filter((token) => candidate.includes(token));
  const score = targetTokens.length ? matchedTokens.length / targetTokens.length : 0;
  // Require the subject/last-name portion represented by at least two meaningful tokens,
  // or one unusually specific token. This prevents a generic “PSA 10 card” match.
  const matched = matchedTokens.length >= 2 || matchedTokens.some((token) => token.length >= 7);
  return { matched, score, matchedTokens };
}

function gradeMatches(target: ParseAuctionLookupInput, candidate: JsonRecord): boolean {
  if (!target.grade) return true;
  const expected = normalize(`${target.certificationCompany ?? ''} ${target.grade}`).replace(/ /g, '');
  const actual = normalize(`${candidate.grader ?? candidate.certificationCompany ?? ''} ${candidate.grade ?? ''} ${candidate.title ?? ''}`).replace(/ /g, '');
  return Boolean(!expected || actual.includes(expected) || (text(target.grade) && actual.includes(normalize(target.grade).replace(/ /g, ''))));
}

function normalizeLelandsSale(row: JsonRecord, target: ParseAuctionLookupInput, sourceUrl?: string): JsonRecord {
  const sale = record(row.sale ?? row);
  const title = text(sale.title || row.title);
  const identity = identityMatch(target, title, text(sale.description));
  const status = text(sale.status).toLowerCase() || 'unknown';
  const sold = status === 'sold' && Number.isFinite(Number(sale.final_amount)) && Number(sale.final_amount) > 0;
  return {
    sourceId: 'lelands', provider: 'Lelands via Parse.bot', title, url: text(row.source_url || sale.source_url || sale.lot_url || sourceUrl) || null,
    lotId: text(row.item_id || sale.item_id || sale.lot_number) || null, auctionName: sale.auction_name ?? null, category: sale.category ?? null,
    description: sale.description ?? null, imageUrl: text(sale.image_url || row.thumbnail_url) || null, imageUrls: sale.image_urls ?? [],
    status, sold, price: sold ? Number(sale.final_amount) : null, currency: text(sale.currency) || null,
    priceBasis: text(sale.price_basis) || 'sold_for_price_including_buyers_premium', buyersPremiumIncluded: sale.buyer_premium_included ?? null,
    date: text(sale.sale_datetime || sale.sale_date) || null, datePrecision: text(sale.sale_date_precision) || 'auction_end',
    grader: sale.grader ?? null, grade: sale.grade ?? null, bidCount: sale.bid_count ?? null, finalAmount: sale.final_amount ?? null,
    identityMatched: identity.matched && gradeMatches(target, sale), identityScore: identity.score, matchedTokens: identity.matchedTokens,
    saleStatus: sold ? 'completed' : status, completed: sold,
    priceSemantics: sold ? 'Lelands SOLD FOR amount including buyer premium; candidate only after identity and evidence gates.' : 'Not an explicit sold result; context only.',
    raw: row,
  };
}

function normalizePristineSale(detail: JsonRecord, target: ParseAuctionLookupInput, summary?: JsonRecord): JsonRecord {
  const title = text(detail.title || summary?.title);
  const identity = identityMatch(target, title, text(detail.description));
  const status = text(detail.status || summary?.status).toLowerCase() || 'unknown';
  const sold = status === 'completed' && detail.sold === true && Number.isFinite(Number(detail.winning_bid)) && Number(detail.winning_bid) > 0;
  const price = sold ? Number(detail.total_price ?? detail.winning_bid) : null;
  return {
    sourceId: 'pristine_auction', provider: 'Pristine Auction via Parse.bot', title, url: text(detail.url || summary?.url) || null,
    lotId: text(detail.lot_id || summary?.lot_id) || null, subtitle: detail.subtitle ?? summary?.subtitle ?? null,
    imageUrl: text(detail.image_url || summary?.image_url) || null, status, sold, completed: sold,
    price, winningBid: detail.winning_bid ?? null, buyerPremium: detail.buyer_premium ?? null, totalPrice: detail.total_price ?? null,
    currency: text(detail.currency) || null, priceBasis: text(detail.price_basis) || (detail.total_price != null ? 'hammer_plus_premium' : 'unknown'),
    date: text(detail.completed_at || detail.end_time || summary?.end_time) || null, datePrecision: detail.completed_at ? 'completed_at' : 'auction_end',
    bidCount: detail.bid_count ?? null, grader: detail.grader ?? null, grade: detail.grade ?? null,
    identityMatched: identity.matched && gradeMatches(target, detail), identityScore: identity.score, matchedTokens: identity.matchedTokens,
    saleStatus: sold ? 'completed' : status, priceSemantics: sold ? 'Pristine winning bid and all-in total; candidate only after identity and evidence gates.' : 'Ended or active lot without confirmed sale; context only.',
    raw: detail,
  };
}

async function lookupSource(source: SourceId, input: ParseAuctionLookupInput) {
  const request = buildParseAuctionSearch(source, input);
  const empty = { source, status: 'error' as const, query: request.query, sales: [], context: [], messages: [] as string[], raw: { search: null, details: [] as JsonRecord[] }, visualFilter: null };
  if (!isParseAuctionSourceSupported(source, input.category)) {
    return { ...empty, status: 'not_applicable' as const, messages: [`${source === 'lelands' ? 'Lelands' : 'Pristine Auction'} is not enabled for this item category.`] };
  }
  const apiKey = getParseAuctionApiKey();
  if (!apiKey) return { ...empty, messages: ['PARSE_BOT_API_KEY is not configured.'] };
  const search = await apiGet(request.url, apiKey);
  if (search.error) return { ...empty, messages: [search.error], raw: { search: search.payload, details: [] } };
  const searchPayload = record(search.payload?.data ?? search.payload);
  const summaries = source === 'lelands' ? records(searchPayload.results) : records(searchPayload.items);
  const details: JsonRecord[] = [];
  const sales: JsonRecord[] = [];
  for (const summary of summaries.slice(0, 5)) {
    const detailUrl = source === 'lelands'
      ? `https://api.parse.bot/scraper/${SOURCES.lelands.id}/${SOURCES.lelands.detail}?${new URLSearchParams({ url: text(summary.source_url) }).toString()}`
      : `https://api.parse.bot/scraper/${SOURCES.pristine_auction.id}/${SOURCES.pristine_auction.detail}?${new URLSearchParams({ url: text(summary.url) }).toString()}`;
    const detail = await apiGet(detailUrl, apiKey);
    if (detail.payload) details.push(detail.payload);
    const payload = record(detail.payload?.data ?? detail.payload);
    const sale = source === 'lelands' ? normalizeLelandsSale({ ...summary, sale: payload }, input) : normalizePristineSale(payload, input, summary);
    if (sale.completed && sale.identityMatched) sales.push(sale); else sales.push({ ...sale, completed: false, valuationEligible: false });
  }
  const valuationCandidates = sales.filter((sale) => sale.completed && sale.identityMatched);
  const context = sales.filter((sale) => !sale.completed || !sale.identityMatched);
  return {
    source, status: 'success' as const, query: request.query, sales: valuationCandidates, context,
    messages: [`${source === 'lelands' ? 'Lelands' : 'Pristine Auction'} returned ${summaries.length} archived candidates; only explicit sold, dated, identity-matched detail records can support sandbox valuation.`],
    raw: { search: search.payload, details }, visualFilter: null,
  };
}

export function lookupLelandsAuctions(input: ParseAuctionLookupInput) { return lookupSource('lelands', input); }
export function lookupPristineAuctions(input: ParseAuctionLookupInput) { return lookupSource('pristine_auction', input); }
