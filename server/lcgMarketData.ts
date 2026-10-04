import { JSDOM } from 'jsdom';
import { buildStructuredItemQuery } from '../shared/testAiCriteria';
import { numericGradesEquivalent } from '../shared/publicGradeValues';
import { getSandboxSpecialistSource } from '../shared/sandboxSpecialistSources';
import type { SpecialistMarketplaceLookupInput, SpecialistMarketplaceLookupResult, SpecialistMarketplaceRecord } from './specialistMarketplaceMarketData';

export const LCG_GALLERY_URL = 'https://auction.lcgauctions.com/Lots/Gallery';
export const LCG_MAX_RECORDS = 12;

function text(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function parseAmount(value: string): number | null {
  const match = value.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
  if (!match?.[1]) return null;
  const amount = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function extractDate(value: string): string | null {
  const match = value.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2},?\s+20\d{2}\b|\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}\b/i)?.[0];
  if (!match) return null;
  const parsed = Date.parse(match);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function extractGrade(value: string): string | null {
  const match = value.match(/\b(?:AFA|MGA|CAS|CGA|WATA|VGA)\s*(?:graded?\s*)?([A-Z]{0,5}\s*\d{1,3}(?:\.\d+)?)/i);
  return match?.[1]?.match(/\d{1,3}(?:\.\d+)?/)?.[0] ?? null;
}

function significantTokens(value: string): string[] {
  return [...new Set(text(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(token => token.length >= 3 && !['the', 'and', 'with', 'for', 'auction', 'auctions', 'graded', 'grade'].includes(token)))];
}

function structuredQuery(input: SpecialistMarketplaceLookupInput): string {
  return buildStructuredItemQuery(input.category, input.itemDetails, [input.grade, input.certificationCompany]);
}

function recordFromAnchor(anchor: Element, input: SpecialistMarketplaceLookupInput, requestUrl: string, query: string): SpecialistMarketplaceRecord | null {
  const href = anchor.getAttribute('href') ?? '';
  const lotId = href.match(/[?&]itemid=(\d+)/i)?.[1] ?? null;
  if (!lotId) return null;
  const title = text(anchor.textContent);
  if (!title) return null;
  let node: Element | null = anchor;
  let rowText = title;
  for (let depth = 0; depth < 6 && node; depth += 1) {
    const candidate = text(node.textContent);
    if (candidate.length > rowText.length) rowText = candidate;
    if (/sold\s+for\s+\$/i.test(candidate)) break;
    node = node.parentElement;
  }
  const price = parseAmount(rowText.match(/sold\s+for[\s\S]{0,80}/i)?.[0] ?? rowText);
  const date = extractDate(rowText);
  const completed = /\bsold\s+for\b/i.test(rowText) && price != null && date != null;
  const targetTokens = significantTokens(query);
  const candidateTokens = significantTokens(title);
  const matchedTokens = targetTokens.filter(token => candidateTokens.includes(token));
  const targetGrade = text(input.grade);
  const candidateGrade = extractGrade(title);
  const gradeMatched = !targetGrade || (candidateGrade != null && numericGradesEquivalent(targetGrade, candidateGrade));
  const identityMatched = matchedTokens.length >= Math.min(2, targetTokens.length || 2) && gradeMatched;
  const imageUrl = node?.querySelector('img')?.getAttribute('src') ? new URL(node.querySelector('img')!.getAttribute('src')!, requestUrl).toString() : null;
  return {
    sourceId: 'lcg', provider: 'LCG Auctions', title, description: rowText.slice(0, 1200), lotId,
    auctionName: 'LCG Auctions public gallery', url: new URL(href, requestUrl).toString(), imageUrl,
    saleStatus: completed ? 'completed' : 'unknown', completed, price, currency: price != null ? 'USD' : null, date,
    grade: candidateGrade, certificationCompany: title.match(/\b(AFA|MGA|CAS|CGA|WATA|VGA)\b/i)?.[1]?.toUpperCase() ?? null,
    priceBasis: completed ? 'closed' : 'unknown', buyerPremiumIncluded: null, winningBid: price, buyerPremiumPercentage: null,
    identityMatched, matchedTokens,
    exclusionReason: !completed ? 'LCG did not expose a complete sold status, USD price, and sale date in the public gallery row.' : !identityMatched ? 'The lot did not meet the structured identity or grade gate.' : 'LCG records remain context-only pending source activation review.',
    valuationEligible: false,
  };
}

export async function lookupLcg(input: SpecialistMarketplaceLookupInput): Promise<SpecialistMarketplaceLookupResult> {
  const source = getSandboxSpecialistSource('lcg')!;
  const query = structuredQuery(input);
  const base = { source: 'lcg' as const, label: source.label, searchContract: source.searchContract, query, sales: [] as SpecialistMarketplaceRecord[], context: [] as SpecialistMarketplaceRecord[], recordCap: LCG_MAX_RECORDS, historyWindow: input.historyWindow };
  if (!query) return { ...base, status: 'setup_required', requestUrl: LCG_GALLERY_URL, messages: ['LCG automatic search requires structured item fields; the free-form title was not used as a fallback.'] };
  const requestUrl = `${LCG_GALLERY_URL}?SearchText=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(requestUrl, { headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'Tradebilia Sandbox Read-Only LCG Adapter/1.0' }, redirect: 'follow', signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return { ...base, status: 'error', requestUrl, messages: [`LCG Auctions returned HTTP ${response.status}; no retry or access workaround was attempted.`] };
    const document = new JSDOM(await response.text(), { url: requestUrl }).window.document;
    const seen = new Set<string>();
    const records = [...document.querySelectorAll('a[href*="/bids/bidplace.aspx?itemid="]')]
      .map(anchor => recordFromAnchor(anchor, input, requestUrl, query))
      .filter((record): record is SpecialistMarketplaceRecord => Boolean(record) && !seen.has(record!.lotId ?? '') && Boolean(seen.add(record!.lotId ?? '')))
      .slice(0, LCG_MAX_RECORDS);
    const sales = records.filter(record => record.completed && record.identityMatched);
    return { ...base, status: 'success', requestUrl, sales: [], context: records, messages: [`LCG searched its public gallery with structured fields (${query}), returned ${records.length} bounded lots, and retained all records as context-only pending permission and completed-sale contract review. ${sales.length} records passed the preliminary identity/date/price checks but were not sent to valuation.`] };
  } catch (error) {
    return { ...base, status: 'error', requestUrl, messages: [error instanceof Error && error.name === 'TimeoutError' ? 'LCG Auctions timed out; no retry was attempted.' : 'LCG Auctions could not be reached; no access workaround was attempted.'] };
  }
}
