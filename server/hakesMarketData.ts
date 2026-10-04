import { JSDOM } from 'jsdom';
import type {
  SpecialistMarketplaceLookupInput,
  SpecialistMarketplaceLookupResult,
  SpecialistMarketplaceRecord,
} from './specialistMarketplaceMarketData';

const HAKES_BASE = 'https://www.hakes.com';
const HAKES_PAST_AUCTIONS = `${HAKES_BASE}/auctions/past`;
const MAX_CATALOGS = 4;
const MAX_RECORDS = 24;
const REQUEST_TIMEOUT_MS = 10_000;

function text(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}
function normalized(value: unknown): string {
  return text(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function canonicalUrl(value: string): string | null {
  try {
    const url = new URL(value, HAKES_BASE);
    if (url.protocol !== 'https:' || !['hakes.com', 'www.hakes.com'].includes(url.hostname.toLowerCase())) return null;
    url.hash = '';
    return url.toString();
  } catch { return null; }
}
function parseDetails(value?: string | null): Record<string, unknown> {
  try {
    const parsed = value ? JSON.parse(value) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}
function detail(details: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = text(details[key]);
    if (value) return value;
  }
  return '';
}
function buildHakesQuery(input: SpecialistMarketplaceLookupInput): string {
  const details = parseDetails(input.itemDetails);
  const category = normalized(input.category).replace(/_/g, ' ');
  const fields = category === 'sports cards'
    ? [detail(details, ['player', 'athlete', 'subject']), detail(details, ['year']), detail(details, ['setName', 'set', 'cardSet']), detail(details, ['cardNumber', 'cardNo', 'number'])]
    : category === 'video games'
      ? [detail(details, ['gameTitle', 'title']) || input.title, detail(details, ['platform', 'console']), detail(details, ['releaseYear', 'year']), detail(details, ['edition', 'version'])]
      : category === 'comics'
        ? [detail(details, ['comicTitle', 'series', 'title']) || input.title, detail(details, ['issueNumber', 'issueNo', 'issue', 'number']), detail(details, ['publicationYear', 'year', 'issueYear'])]
        : [input.title, detail(details, ['year', 'releaseYear', 'edition', 'variant', 'character', 'format'])];
  return [...new Set(fields.map(text).filter(Boolean))].join(' ').replace(/\s+/g, ' ').trim().slice(0, 240);
}
function significantQueryTokens(input: SpecialistMarketplaceLookupInput): string[] {
  const details = parseDetails(input.itemDetails);
  const category = normalized(input.category).replace(/_/g, ' ');
  const structured = category === 'sports cards'
    ? [detail(details, ['player', 'athlete', 'subject']), detail(details, ['year']), detail(details, ['setName', 'set', 'cardSet']), detail(details, ['cardNumber', 'cardNo', 'number'])]
    : category === 'video games'
      ? [detail(details, ['gameTitle', 'title']) || input.title, detail(details, ['platform', 'console']), detail(details, ['releaseYear', 'year']), detail(details, ['edition', 'version'])]
      : category === 'comics'
        ? [detail(details, ['comicTitle', 'series', 'title']) || input.title, detail(details, ['issueNumber', 'issueNo', 'issue', 'number']), detail(details, ['publicationYear', 'year', 'issueYear'])]
        : [input.title, detail(details, ['year', 'releaseYear', 'edition', 'variant', 'character', 'format'])];
  return normalized(structured.join(' ')).split(' ').filter((token) => token.length >= 3 && !['the', 'and', 'with', 'card', 'cards', 'lot', 'auction', 'vintage', 'collectible', 'collectibles'].includes(token));
}
function extractDate(value: string): string | null {
  const match = value.match(/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2},?\s+20\d{2}\b/i) ?? value.match(/\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}\b/);
  if (!match) return null;
  const timestamp = Date.parse(match[0]);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}
function extractPrice(value: string): number | null {
  const match = value.match(/(?:sold\s+for|price\s+realized|realized\s+price|final\s+price|winning\s+bid)\D{0,80}\$\s*([\d,]+(?:\.\d{2})?)/i);
  if (!match) return null;
  const amount = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}
function explicitCompleted(value: string): boolean {
  return /\b(?:sold\s+for|price\s+realized|realized\s+price|final\s+price|winning\s+bid|sold)\b/i.test(value)
    && !/\b(?:current\s+bid|starting\s+bid|register\s+to\s+bid|upcoming)\b/i.test(value);
}
function extractLotId(card: Element, url: string | null, body: string): string | null {
  const id = text(card.getAttribute('id')).match(/(?:stl-|ba_)?(\d{5,})/i)?.[1]
    ?? url?.match(/-(\d{6,})(?:\?|$)/)?.[1]
    ?? body.match(/\bLot\s+(\d+)\b/i)?.[1];
  return id ?? null;
}
function extractTitle(card: Element, body: string): string {
  const title = text(card.querySelector('.item-title, .item_name, .title, h2, h3, a[href*="/online-auctions/"]')?.textContent);
  if (title) return title.replace(/^Lot\s+\d+\s*/i, '').trim();
  return body.replace(/^Lot\s+\d+\s*/i, '').split(/Estimate:|Current Bid|Sold for|Price Realized/i)[0].trim();
}
function identity(input: SpecialistMarketplaceLookupInput, title: string): { matched: boolean; tokens: string[] } {
  const candidate = normalized(title);
  const tokens = significantQueryTokens(input);
  const matched = tokens.filter((token) => candidate.includes(token));
  const distinctive = tokens.filter((token) => token.length >= 6);
  return { matched: (distinctive.length ? distinctive.some((token) => matched.includes(token)) : matched.length >= 2), tokens: matched };
}
async function getHtml(url: string): Promise<{ html: string; finalUrl: string } | { error: string }> {
  try {
    const response = await fetch(url, { headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': "Tradebilia Sandbox Read-Only Hakes Adapter/1.0" }, redirect: 'follow', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) return { error: `Hake’s returned HTTP ${response.status}; no retry or access workaround was attempted.` };
    const finalUrl = canonicalUrl(response.url);
    if (!finalUrl) return { error: 'Hake’s redirected outside the allowlisted public domain; the response was not parsed.' };
    return { html: await response.text(), finalUrl };
  } catch (error) {
    return { error: error instanceof Error && error.name === 'TimeoutError' ? 'Hake’s timed out; no retry was attempted.' : 'Hake’s could not be reached; no access workaround was attempted.' };
  }
}
function base(input: SpecialistMarketplaceLookupInput, requestUrl: string | null): SpecialistMarketplaceLookupResult {
  return { source: 'hakes', label: "Hake's Auction Results", status: 'success', searchContract: 'automatic_title_search', query: buildHakesQuery(input), sales: [], context: [], messages: [], requestUrl, recordCap: MAX_RECORDS };
}
export async function lookupHakes(input: SpecialistMarketplaceLookupInput): Promise<SpecialistMarketplaceLookupResult> {
  const empty = base(input, HAKES_PAST_AUCTIONS);
  const past = await getHtml(HAKES_PAST_AUCTIONS);
  if ('error' in past) return { ...empty, status: 'error', messages: [past.error] };
  const pastDocument = new JSDOM(past.html, { url: past.finalUrl }).window.document;
  const catalogUrls = [...new Set(Array.from(pastDocument.querySelectorAll('a[href]')).map((anchor) => canonicalUrl(anchor.getAttribute('href') ?? '')).filter((url): url is string => Boolean(url && /\/auctions\/hakes-auctions\/[^/?#]+\/catalog$/i.test(url))))].slice(0, MAX_CATALOGS);
  if (!catalogUrls.length) return { ...empty, status: 'success', messages: ['Hake’s public past-auction page exposed no catalog links; no records were created.'] };
  const records: SpecialistMarketplaceRecord[] = [];
  for (const catalogUrl of catalogUrls) {
    const catalog = await getHtml(catalogUrl);
    if ('error' in catalog) continue;
    const document = new JSDOM(catalog.html, { url: catalog.finalUrl }).window.document;
    const eventText = text(document.body?.textContent);
    const eventDate = extractDate(eventText);
    const cards = Array.from(document.querySelectorAll('.gtm-visible_item, [class*="gtm-visible_item"], [id^="stl-"], [id^="ba_"]'));
    for (const card of cards) {
      if (records.length >= MAX_RECORDS) break;
      const body = text(card.textContent);
      const lotUrl = canonicalUrl(card.querySelector('a[href*="/online-auctions/"]')?.getAttribute('href') ?? '');
      const title = extractTitle(card, body);
      if (!title) continue;
      const review = identity(input, title);
      const completed = explicitCompleted(body);
      const price = completed ? extractPrice(body) : null;
      records.push({ sourceId: 'hakes', provider: "Hake's Auction Results", title, description: body.slice(0, 2_000) || null, lotId: extractLotId(card, lotUrl, body), auctionName: text(document.querySelector('h1')?.textContent || document.title) || null, url: lotUrl ?? catalog.finalUrl, imageUrl: canonicalUrl(card.querySelector('img[src]')?.getAttribute('src') ?? '') ?? null, saleStatus: completed && price ? 'completed' : 'unknown', completed: Boolean(completed && price), price, currency: price ? 'USD' : null, date: extractDate(body) ?? eventDate, grade: null, certificationCompany: null, priceBasis: price ? 'closed' : 'unknown', buyerPremiumIncluded: null, winningBid: price, buyerPremiumPercentage: null, identityMatched: review.matched, matchedTokens: review.tokens, exclusionReason: !completed || !price ? 'The public Hake’s catalog record did not expose an explicit completed-sale status and realized price.' : !review.matched ? 'The structured Hake’s identity fields did not meet the deterministic title-match threshold.' : 'Context-only pending source activation, buyer-premium verification, and category-specific admission review.', valuationEligible: false });
    }
    if (records.length >= MAX_RECORDS) break;
  }
  const sales = records.filter((record) => record.completed && record.identityMatched);
  return { ...empty, status: 'success', sales, context: records.filter((record) => !record.completed || !record.identityMatched), messages: [`Hake’s searched ${catalogUrls.length} public past-auction catalog${catalogUrls.length === 1 ? '' : 's'} using structured fields (“${empty.query}”) and found ${records.length} bounded lot candidates; ${sales.length} passed completed-sale and identity checks. All Hake’s records remain context-only and cannot affect valuation or the final AI conclusion.`] };
}
export const HAKES_TEST_URLS = { pastAuctions: HAKES_PAST_AUCTIONS } as const;
export const buildHakesSearchQueryForTest = buildHakesQuery;
