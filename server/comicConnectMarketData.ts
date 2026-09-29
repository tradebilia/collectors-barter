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
  const withoutLeadingArticle = primary
    .replace(/^(?:the|a|an)\s+/i, '')
    .replace(/\s*#(\d+)/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim();
  const punctuationNormalized = withoutLeadingArticle.replace(/[\-’']/g, ' ').replace(/\s+/g, ' ').trim();
  return Array.from(new Set([primary, withoutLeadingArticle, punctuationNormalized].filter(Boolean)));
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

function issueTokens(input: ComicConnectLookupInput): string[] {
  const details = parseDetails(input.itemDetails);
  return Array.from(new Set(normalize(`${details.comicTitle ?? ''} ${input.title}`).split(' ').filter((token) => token.length >= 3 && !['the', 'comic', 'comics', 'cgc', 'marvel', 'dc'].includes(token))));
}

function explicitGrade(value: string): string | null {
  const match = value.match(/(?:CGC|CBCS|PSA|BGS|SGC)?\s*(\d+(?:\.\d+)?)/i);
  return match?.[1] ?? null;
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
  messages: string[];
  raw?: { resultCount: number; url: string };
};

export function parseComicConnectSoldHtml(html: string, input: ComicConnectLookupInput, requestOverride?: { query: string; url: string }): ComicConnectLookupResult {
  const request = requestOverride ?? buildComicConnectSearchUrl(input);
  if (normalize(input.category) !== 'comics') {
    return { source: 'comicconnect', status: 'not_applicable', query: request.query, sales: [], context: [], messages: ['ComicConnect is only mapped to Comics.'], raw: { resultCount: 0, url: request.url } };
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
    return {
      sourceId: 'comicconnect', provider: 'ComicConnect Sold Archive', title,
      grade: grade ?? null, lotId, url: href ? new URL(href, COMICCONNECT_BASE_URL).toString() : null,
      imageUrl: imagePath ? new URL(imagePath, COMICCONNECT_BASE_URL).toString() : null,
      description: description ?? null, saleStatus: completed ? 'completed' : 'unknown', completed,
      price: completed ? parsePrice(priceText) : null, currency: completed ? 'USD' : null,
      date: ended?.match(/Sold on\s+(.+)/i)?.[1] ?? null, priceBasis: 'unknown',
      buyerPremiumIncluded: null, identityMatched: identity.matched, matchedTokens: identity.matchedTokens,
      exclusionReason: !identity.matched ? identity.reason : (!completed ? 'No explicit completed-sale amount and date were found.' : 'ComicConnect buyer-premium treatment is not resolved.'),
      valuationEligible: false,
    };
  });

  const sales = records.filter((record) => record.completed && record.identityMatched);
  const context = records.filter((record) => !record.completed || !record.identityMatched);
  return {
    source: 'comicconnect', status: 'success', query: request.query, sales, context,
    messages: [`ComicConnect returned ${records.length} bounded sold-archive candidates. Records remain context-only because buyer-premium treatment and signed-admission tests are not complete.`],
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
  return {
    source: 'comicconnect', status: errors.length === queries.length ? 'error' : 'success',
    query: queries.join(' → '),
    sales: all.filter((record) => record.completed && record.identityMatched),
    context: all.filter((record) => !record.completed || !record.identityMatched),
    messages: [`ComicConnect checked ${queries.length} bounded query variants and returned ${all.length} deduplicated candidates. Records remain context-only because buyer-premium treatment and signed-admission tests are not complete.`, ...errors],
    raw: { resultCount: all.length, url: lastRequest.url },
  };
}
