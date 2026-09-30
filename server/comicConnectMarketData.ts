export type ComicConnectLookupInput = {
  title: string;
  category: string;
  grade?: string | null;
  certificationCompany?: string | null;
  itemDetails?: string | null;
};

type JsonRecord = Record<string, unknown>;

export const COMICCONNECT_MAX_RESULTS = 20;
export const COMICCONNECT_TIMEOUT_MS = 12_000;
const COMICCONNECT_BASE_URL = 'https://www.comicconnect.com';
const CURRENT_MARKET_DAYS = 365;
const EXTENDED_MARKET_DAYS = 365 * 3;

function text(value: unknown): string {
  return value == null ? '' : String(value).replace(/\s+/g, ' ').trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;|&#47;/g, '/')
    .replace(/&#160;|&nbsp;/g, ' ');
}

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function normalize(value: unknown): string {
  return text(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function parseDetails(itemDetails?: string | null): JsonRecord {
  if (!itemDetails?.trim()) return {};
  try {
    const value = JSON.parse(itemDetails) as unknown;
    return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
  } catch {
    return {};
  }
}

function buildSearchQuery(input: ComicConnectLookupInput): string {
  const details = parseDetails(input.itemDetails);
  const comicTitle = text(details.comicTitle);
  const issueNumber = text(details.issueNumber);
  if (comicTitle) return `${comicTitle}${issueNumber ? ` #${issueNumber.replace(/^#/, '')}` : ''}`.slice(0, 120).trim();

  // When structured CGC/issue details are unavailable, remove grading metadata
  // rather than sending the full analyzer title to ComicConnect's broad search.
  const stripped = text(input.title)
    .replace(/\s+(?:CGC|CBCS|PSA|BGS|SGC)\b.*$/i, '')
    .replace(/\s+\d+(?:\.\d+)?\s*$/i, '')
    .trim();
  return (stripped || input.title.trim()).slice(0, 120).trim();
}

export function buildComicConnectSearchUrl(input: ComicConnectLookupInput): { query: string; url: string } {
  const query = buildSearchQuery(input);
  return buildComicConnectSearchUrlForQuery(query);
}

function buildComicConnectSearchUrlForQuery(query: string): { query: string; url: string } {
  const params = new URLSearchParams({
    filtertype: 'Sold',
    search: query,
    show_sold_search: '1',
    perpage: String(COMICCONNECT_MAX_RESULTS),
    page: '1',
  });
  return { query, url: `${COMICCONNECT_BASE_URL}/browse/?${params.toString()}` };
}

export function buildComicConnectSearchQueries(input: ComicConnectLookupInput): string[] {
  const primary = buildSearchQuery(input);
  const withoutIssueHash = primary
    .replace(/\s*#(\d+)/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim();
  const withoutLeadingArticle = withoutIssueHash
    .replace(/^(?:the|a|an)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const withoutArticlesAndConnectors = withoutLeadingArticle
    .replace(/\b(?:the|a|an|of)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const punctuationNormalized = withoutArticlesAndConnectors.replace(/[\-’']/g, ' ').replace(/\s+/g, ' ').trim();
  const issueMatch = withoutIssueHash.match(/(\d+(?:\.\d+)?)\s*$/);
  const issue = issueMatch?.[1] ?? '';
  const titleOnly = withoutIssueHash.replace(/\s+\d+(?:\.\d+)?\s*$/, '').trim();
  const titleTokens = titleOnly.split(/\s+/).filter(Boolean);
  const distinctiveTail = titleTokens.length && issue
    ? `${titleTokens[titleTokens.length - 1]} ${issue}`
    : '';
  return Array.from(new Set([
    primary,
    withoutLeadingArticle,
    withoutArticlesAndConnectors,
    punctuationNormalized,
    distinctiveTail,
  ].filter(Boolean))).slice(0, 5);
}

function extract(pattern: RegExp, source: string): string | null {
  const match = source.match(pattern);
  return match?.[1] ? stripTags(match[1]) : null;
}

function parsePrice(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export type ComicConnectTimeWindow = 'current_12_months' | 'extended_12_to_36_months' | 'historical_over_36_months' | 'undated';

export type ComicConnectPriceMetrics = { count: number; avg: number | null; median: number | null; min: number | null; max: number | null };
export type ComicConnectConfidence = 'high' | 'medium' | 'low' | 'insufficient';
export type ComicConnectPriceTrendPoint = { window: ComicConnectTimeWindow; label: string; metrics: ComicConnectPriceMetrics };

export function classifyComicConnectCurrentConfidence(currentSaleCount: number): { level: ComicConnectConfidence; reason: string } {
  if (currentSaleCount >= 5) return { level: 'high', reason: `${currentSaleCount} identity-matched priced sales in the last 12 months provide a strong current-market sample.` };
  if (currentSaleCount >= 2) return { level: 'medium', reason: `${currentSaleCount} identity-matched priced sales in the last 12 months provide a usable but limited current-market sample.` };
  if (currentSaleCount === 1) return { level: 'low', reason: 'Only 1 identity-matched priced sale is in the last 12 months; older context is not a substitute for current evidence.' };
  return { level: 'insufficient', reason: 'No identity-matched priced sales were found in the last 12 months, so current-market confidence is insufficient.' };
}

export function computeComicConnectPriceTrend(records: Array<{ price: number | null; timeWindow: ComicConnectTimeWindow }>): ComicConnectPriceTrendPoint[] {
  const definitions: Array<[ComicConnectTimeWindow, string]> = [
    ['current_12_months', 'Current · 0–12 months'],
    ['extended_12_to_36_months', 'Extended · 12–36 months'],
    ['historical_over_36_months', 'Historical · 36+ months'],
  ];
  return definitions.map(([window, label]) => ({ window, label, metrics: computeComicConnectPriceMetrics(records.filter((record) => record.timeWindow === window)) }));
}

export function classifyComicConnectTimeWindow(dateText: string | null | undefined, referenceDate = new Date()): ComicConnectTimeWindow {
  if (!dateText) return 'undated';
  const parsed = new Date(dateText);
  if (Number.isNaN(parsed.getTime())) return 'undated';
  const ageDays = Math.max(0, (referenceDate.getTime() - parsed.getTime()) / 86_400_000);
  if (ageDays <= CURRENT_MARKET_DAYS) return 'current_12_months';
  if (ageDays <= EXTENDED_MARKET_DAYS) return 'extended_12_to_36_months';
  return 'historical_over_36_months';
}

export function computeComicConnectPriceMetrics(records: Array<{ price: number | null }>): ComicConnectPriceMetrics {
  const prices = records.map((record) => record.price).filter((price): price is number => typeof price === 'number' && Number.isFinite(price) && price > 0).sort((a, b) => a - b);
  if (!prices.length) return { count: 0, avg: null, median: null, min: null, max: null };
  const middle = Math.floor(prices.length / 2);
  const median = prices.length % 2 ? prices[middle] : (prices[middle - 1] + prices[middle]) / 2;
  return { count: prices.length, avg: prices.reduce((sum, price) => sum + price, 0) / prices.length, median, min: prices[0], max: prices[prices.length - 1] };
}

function issueTokens(input: ComicConnectLookupInput): string[] {
  const details = parseDetails(input.itemDetails);
  return Array.from(new Set(normalize(`${details.comicTitle ?? ''} ${input.title}`).split(' ').filter((token) => token.length >= 3 && !['the', 'comic', 'comics', 'cgc', 'marvel', 'dc'].includes(token))));
}

function explicitGrade(value: string): string | null {
  const match = value.match(/(?:CGC|CBCS|PSA|BGS|SGC)?\s*(\d+(?:\.\d+)?)/i);
  if (!match?.[1]) return null;
  const numericGrade = Number(match[1]);
  return Number.isFinite(numericGrade) ? String(numericGrade) : null;
}

function matchesIdentity(input: ComicConnectLookupInput, title: string, grade: string): { matched: boolean; matchedTokens: string[]; reason?: string } {
  const details = parseDetails(input.itemDetails);
  const targetFacsimile = text(details.facsimile || details.Facsimile).toLowerCase();
  const candidateText = normalize(`${title} ${grade}`);
  if (targetFacsimile === 'no' && /\bfacsimile\b/.test(candidateText)) return { matched: false, matchedTokens: [], reason: 'Facsimile conflict: target is not a facsimile.' };
  if (targetFacsimile === 'yes' && !/\bfacsimile\b/.test(candidateText)) return { matched: false, matchedTokens: [], reason: 'Facsimile conflict: target is a facsimile.' };
  const targetDistribution = text(details.distributionType || details.distribution || details.DistributionType).toLowerCase();
  if (targetDistribution === 'direct' && /\bnewsstand\b/.test(candidateText)) return { matched: false, matchedTokens: [], reason: 'Distribution conflict: target is Direct, candidate is Newsstand.' };
  if (targetDistribution === 'newsstand' && /\bdirect(?: market)?\b/.test(candidateText)) return { matched: false, matchedTokens: [], reason: 'Distribution conflict: target is Newsstand, candidate is Direct.' };
  const candidate = normalize(`${title} ${grade}`);
  const tokens = issueTokens(input);
  const matchedTokens = tokens.filter((token) => candidate.includes(token));
  const enoughTitle = matchedTokens.length >= Math.min(2, tokens.length) || matchedTokens.some((token) => token.length >= 7);
  if (!enoughTitle) return { matched: false, matchedTokens, reason: 'Comic title/issue identity was not sufficiently represented.' };

  const targetGrade = input.grade ? explicitGrade(input.grade) : null;
  const candidateGrade = explicitGrade(grade);
  if (targetGrade && candidateGrade && targetGrade !== candidateGrade) {
    return { matched: false, matchedTokens, reason: `Grade conflict: target ${targetGrade}, candidate ${candidateGrade}.` };
  }
  return { matched: true, matchedTokens };
}

export type ComicConnectSale = {
  sourceId: 'comicconnect';
  provider: 'ComicConnect Sold Archive';
  title: string;
  grade: string | null;
  lotId: string | null;
  url: string | null;
  imageUrl: string | null;
  description: string | null;
  saleStatus: 'completed' | 'unknown';
  completed: boolean;
  price: number | null;
  currency: 'USD' | null;
  date: string | null;
  timeWindow: ComicConnectTimeWindow;
  priceBasis: 'unknown';
  buyerPremiumIncluded: boolean | null;
  identityMatched: boolean;
  matchedTokens: string[];
  exclusionReason?: string;
  valuationEligible: false;
};

export type ComicConnectLookupResult = {
  source: 'comicconnect';
  status: 'success' | 'not_applicable' | 'error';
  query: string;
  sales: ComicConnectSale[];
  context: ComicConnectSale[];
  priceMetrics: ComicConnectPriceMetrics;
  currentPriceMetrics: ComicConnectPriceMetrics;
  currentConfidence: { level: ComicConnectConfidence; reason: string };
  priceTrend: ComicConnectPriceTrendPoint[];
  messages: string[];
  raw?: { resultCount: number; url: string };
};

export function parseComicConnectSoldHtml(html: string, input: ComicConnectLookupInput, requestOverride?: { query: string; url: string }): ComicConnectLookupResult {
  const request = requestOverride ?? buildComicConnectSearchUrl(input);
  if (normalize(input.category) !== 'comics') {
    const emptyMetrics = computeComicConnectPriceMetrics([]);
    return { source: 'comicconnect', status: 'not_applicable', query: request.query, sales: [], context: [], priceMetrics: emptyMetrics, currentPriceMetrics: emptyMetrics, currentConfidence: classifyComicConnectCurrentConfidence(0), priceTrend: computeComicConnectPriceTrend([]), messages: ['ComicConnect is only mapped to Comics.'], raw: { resultCount: 0, url: request.url } };
  }

  const blocks = html.split(/<div\s+class=["'][^"']*itempreview[^"']*["'][^>]*>/i).slice(1, COMICCONNECT_MAX_RESULTS + 1);
  const records: ComicConnectSale[] = blocks.map((block) => {
    const href = extract(/<a\s+href=["'](\/item\/[^"']+)["']/i, block);
    const title = extract(/class=["']titleline[^"']*["'][^>]*>([\s\S]*?)<\/div>/i, block) ?? '';
    const grade = extract(/class=["']grade[^"']*["'][^>]*>([\s\S]*?)<\/div>/i, block);
    const description = extract(/class=["']comments\s+wrap[^"']*["'][^>]*>([\s\S]*?)<\/div>/i, block);
    const ended = extract(/class=["']endednotice["'][^>]*>([\s\S]*?)<\/div>/i, block);
    const priceText = extract(/class=["']val\s+prc["'][^>]*>([\s\S]*?)<\/span>/i, block);
    const imagePath = block.match(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/i)?.[1] ?? null;
    const lotId = href?.match(/\/item\/(\d+)/i)?.[1] ?? null;
    const completed = Boolean(ended && /\bsold\s+on\b/i.test(ended) && parsePrice(priceText));
    const identity = matchesIdentity(input, title, grade ?? '');
    const date = ended?.match(/Sold on\s+(.+)/i)?.[1] ?? null;
    return {
      sourceId: 'comicconnect', provider: 'ComicConnect Sold Archive', title,
      grade: grade ?? null, lotId, url: href ? new URL(href, COMICCONNECT_BASE_URL).toString() : null,
      imageUrl: imagePath ? new URL(imagePath, COMICCONNECT_BASE_URL).toString() : null,
      description: description ?? null, saleStatus: completed ? 'completed' : 'unknown', completed,
      price: completed ? parsePrice(priceText) : null, currency: completed ? 'USD' : null,
      date, timeWindow: classifyComicConnectTimeWindow(date), priceBasis: 'unknown',
      buyerPremiumIncluded: null, identityMatched: identity.matched, matchedTokens: identity.matchedTokens,
      exclusionReason: !identity.matched ? identity.reason : (!completed ? 'No explicit completed-sale amount and date were found.' : 'ComicConnect buyer-premium treatment is not resolved.'),
      valuationEligible: false,
    };
  });

  const sales = records.filter((record) => record.completed && record.identityMatched);
  const context = records.filter((record) => !record.completed || !record.identityMatched);
  const priceMetrics = computeComicConnectPriceMetrics(sales);
  const currentPriceMetrics = computeComicConnectPriceMetrics(sales.filter((record) => record.timeWindow === 'current_12_months'));
  const currentConfidence = classifyComicConnectCurrentConfidence(currentPriceMetrics.count);
  const windows = records.reduce<Record<string, number>>((counts, record) => { counts[record.timeWindow] = (counts[record.timeWindow] ?? 0) + 1; return counts; }, {});
  return {
    source: 'comicconnect', status: 'success', query: request.query, sales, context, priceMetrics, currentPriceMetrics, currentConfidence, priceTrend: computeComicConnectPriceTrend(sales),
    messages: [`ComicConnect returned ${records.length} bounded sold-archive candidates. Time windows: ${windows.current_12_months ?? 0} current (12 months), ${windows.extended_12_to_36_months ?? 0} extended (12–36 months), ${windows.historical_over_36_months ?? 0} historical (over 36 months), ${windows.undated ?? 0} undated. Records remain context-only because buyer-premium treatment and signed-admission tests are not complete.`],
    raw: { resultCount: records.length, url: request.url },
  };
}

export async function lookupComicConnectSold(input: ComicConnectLookupInput): Promise<ComicConnectLookupResult> {
  const queries = buildComicConnectSearchQueries(input);
  if (normalize(input.category) !== 'comics') {
    return parseComicConnectSoldHtml('', input);
  }
  const records = new Map<string, ComicConnectSale>();
  const errors: string[] = [];
  let lastRequest = buildComicConnectSearchUrlForQuery(queries[0]);
  for (const query of queries) {
    const request = buildComicConnectSearchUrlForQuery(query);
    lastRequest = request;
    try {
      const response = await fetch(request.url, {
        headers: { Accept: 'text/html', 'User-Agent': 'Tradebilia Sandbox Read-Only Adapter/1.0' },
        signal: AbortSignal.timeout(COMICCONNECT_TIMEOUT_MS),
      });
      if (!response.ok) {
        errors.push(`${query}: HTTP ${response.status}`);
        continue;
      }
      const parsed = parseComicConnectSoldHtml(await response.text(), input, request);
      for (const record of [...parsed.sales, ...parsed.context]) {
        const key = record.lotId ?? `${normalize(record.title)}|${record.price ?? ''}|${record.date ?? ''}`;
        if (!records.has(key)) records.set(key, record);
      }
      if (records.size >= COMICCONNECT_MAX_RESULTS) break;
    } catch (error) {
      errors.push(`${query}: ${error instanceof Error ? error.message : 'request failed'}`);
    }
  }
  const all = [...records.values()].slice(0, COMICCONNECT_MAX_RESULTS);
  const sales = all.filter((record) => record.completed && record.identityMatched);
  const priceMetrics = computeComicConnectPriceMetrics(sales);
  const currentPriceMetrics = computeComicConnectPriceMetrics(sales.filter((record) => record.timeWindow === 'current_12_months'));
  const currentConfidence = classifyComicConnectCurrentConfidence(currentPriceMetrics.count);
  const windows = all.reduce<Record<string, number>>((counts, record) => { counts[record.timeWindow] = (counts[record.timeWindow] ?? 0) + 1; return counts; }, {});
  return {
    source: 'comicconnect', status: errors.length === queries.length ? 'error' : 'success',
    query: queries.join(' → '),
    sales,
    context: all.filter((record) => !record.completed || !record.identityMatched),
    priceMetrics,
    currentPriceMetrics,
    currentConfidence,
    priceTrend: computeComicConnectPriceTrend(sales),
    messages: [`ComicConnect checked ${queries.length} bounded query variants and returned ${all.length} deduplicated candidates. Time windows: ${windows.current_12_months ?? 0} current (12 months), ${windows.extended_12_to_36_months ?? 0} extended (12–36 months), ${windows.historical_over_36_months ?? 0} historical (over 36 months), ${windows.undated ?? 0} undated. Records remain context-only because buyer-premium treatment and signed-admission tests are not complete.`, ...errors],
    raw: { resultCount: all.length, url: lastRequest.url },
  };
}
