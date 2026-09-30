import { JSDOM } from 'jsdom';
import {
  getSandboxSpecialistSource,
  isSandboxSpecialistSourceApplicable,
  type SandboxSpecialistSourceId,
  type SpecialistSourceSearchContract,
} from '../shared/sandboxSpecialistSources';
import { numericGradesEquivalent } from '../shared/publicGradeValues';
import { extractIdentityState, identityStateConflicts } from './testAiIdentityState';

export type SpecialistMarketplaceLookupInput = {
  sourceId: SandboxSpecialistSourceId;
  title: string;
  category: string;
  grade?: string | null;
  condition?: string | null;
  certificationCompany?: string | null;
  itemDetails?: string | null;
  /** A public closed auction, catalog, or lot URL pasted by an admin for locator-required sources. */
  sourceUrl?: string | null;
};

export type SpecialistMarketplaceRecord = {
  sourceId: SandboxSpecialistSourceId;
  provider: string;
  title: string;
  description: string | null;
  lotId: string | null;
  auctionName: string | null;
  url: string | null;
  imageUrl: string | null;
  saleStatus: 'completed' | 'unknown';
  completed: boolean;
  price: number | null;
  currency: 'USD' | null;
  date: string | null;
  grade: string | null;
  certificationCompany: string | null;
  priceBasis: 'realized' | 'closed' | 'unknown';
  buyerPremiumIncluded: boolean | null;
  winningBid: number | null;
  buyerPremiumPercentage: number | null;
  identityMatched: boolean;
  matchedTokens: string[];
  exclusionReason: string | null;
  valuationEligible: false;
};

export type SpecialistMarketplaceLookupResult = {
  source: SandboxSpecialistSourceId;
  label: string;
  status: 'success' | 'not_applicable' | 'setup_required' | 'unsupported' | 'error';
  searchContract: SpecialistSourceSearchContract;
  query: string;
  sales: SpecialistMarketplaceRecord[];
  context: SpecialistMarketplaceRecord[];
  messages: string[];
  requestUrl: string | null;
  recordCap: number;
};

type SourceRule = {
  hosts: readonly string[];
  linkPattern: RegExp;
  recordCap: number;
};

export const SPECIALIST_MARKETPLACE_MAX_RECORDS = 12;
export const SPECIALIST_MARKETPLACE_TIMEOUT_MS = 10_000;

const SOURCE_RULES: Partial<Record<SandboxSpecialistSourceId, SourceRule>> = {
  ngc: { hosts: ['ngccoin.com', 'www.ngccoin.com'], linkPattern: /\/auction-central\/us\/.+\/auctions\//i, recordCap: 6 },
  cng: { hosts: ['cngcoins.com', 'www.cngcoins.com'], linkPattern: /(?:PastAuction|Lot)\.aspx/i, recordCap: 8 },
  rumsey: { hosts: ['rumseyauctions.com', 'www.rumseyauctions.com'], linkPattern: /\/(?:auctions\/lot|pr\/sale|search)\//i, recordCap: 8 },
  cherrystone: { hosts: ['cherrystoneauctions.com', 'www.cherrystoneauctions.com'], linkPattern: /\/_auction\/(?:pr|results)\.asp/i, recordCap: 8 },
  morphy: { hosts: ['auctions.morphyauctions.com', 'morphyauctions.com', 'www.morphyauctions.com'], linkPattern: /(?:LOT\d+\.aspx|past-auctions)/i, recordCap: 8 },
  theriaults: { hosts: ['theriaults.com', 'www.theriaults.com'], linkPattern: /\/events\/(?:event|listing|archive)/i, recordCap: 8 },
  bonhams: { hosts: ['bonhams.com', 'www.bonhams.com'], linkPattern: /\/auction\//i, recordCap: 8 },
  university_archives: { hosts: ['universityarchives.com', 'www.universityarchives.com'], linkPattern: /\/(?:auction-catalog|auction-lot)\//i, recordCap: 8 },
  alexander_historical: { hosts: ['alexautographs.com', 'www.alexautographs.com'], linkPattern: /\/(?:auction-catalog|auction-lot)\//i, recordCap: 8 },
  goldin: { hosts: ['goldin.co', 'www.goldin.co'], linkPattern: /\/item\//i, recordCap: 12 },
};

const GOLDIN_PUBLIC_LOT_ENDPOINT = 'https://lot-retrieval-bidder.api.prod.goldin.com/api/meta_slug/';
const GOLDIN_PUBLIC_SOLD_SEARCH_ENDPOINT = 'https://d1wu47wucybvr3.cloudfront.net/api/lots_v2';

function text(value: unknown): string {
  return value == null ? '' : String(value)
    // textContent joins adjacent inline elements without a delimiter. Preserve
    // a word boundary for patterns such as "Lot Sold" + "Sold: $1,080".
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalize(value: unknown): string {
  return text(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function parseDetails(value?: string | null): Record<string, unknown> {
  if (!value?.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function significantTokens(value: string): string[] {
  const stopWords = new Set(['the', 'and', 'with', 'from', 'for', 'auction', 'auctions', 'lot', 'item', 'vintage', 'collectible', 'collectibles', 'sale', 'sold', 'price', 'realized', 'graded', 'grade']);
  return [...new Set(normalize(value).split(' ').filter((token) => token.length >= 3 && !stopWords.has(token)))];
}

function canonicalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function publicGoldinLotSlug(value: string): string | null {
  if (!isAllowedSourceUrl('goldin', value)) return null;
  const slug = new URL(value).pathname.match(/^\/item\/([a-z0-9-]{8,240})\/?$/i)?.[1] ?? null;
  return slug ? decodeURIComponent(slug) : null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(/[$,%\s,]/g, ''));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }
  return null;
}

function isAllowedSourceUrl(sourceId: SandboxSpecialistSourceId, candidate: string): boolean {
  const rule = SOURCE_RULES[sourceId];
  const url = canonicalUrl(candidate);
  if (!rule || !url) return false;
  const parsed = new URL(url);
  return parsed.protocol === 'https:'
    && rule.hosts.includes(parsed.hostname.toLowerCase())
    && rule.linkPattern.test(`${parsed.pathname}${parsed.search}`);
}

function sourcePriceBasis(sourceId: SandboxSpecialistSourceId): { priceBasis: SpecialistMarketplaceRecord['priceBasis']; buyerPremiumIncluded: boolean | null } {
  const source = getSandboxSpecialistSource(sourceId);
  if (!source) return { priceBasis: 'unknown', buyerPremiumIncluded: null };
  if (source.priceBasis === 'including_buyers_premium') return { priceBasis: 'closed', buyerPremiumIncluded: true };
  if (source.priceBasis === 'hammer') return { priceBasis: 'realized', buyerPremiumIncluded: false };
  return { priceBasis: 'unknown', buyerPremiumIncluded: null };
}

function parseAmount(value: string): number | null {
  const matched = value.match(/(?:US\s*)?\$\s*([\d]{1,3}(?:,[\d]{3})*(?:\.\d{2})?|[\d]+(?:\.\d{2})?)/i);
  if (!matched?.[1]) return null;
  const amount = Number(matched[1].replace(/,/g, ''));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function extractRealizedAmount(value: string): number | null {
  const explicit = value.match(/(?:sold(?:\s+for)?|lot\s+sold|price\s+realized|realized\s+price|final\s+price|sold\s*:)\D{0,80}(?:US\s*)?\$\s*([\d]{1,3}(?:,[\d]{3})*(?:\.\d{2})?|[\d]+(?:\.\d{2})?)/i);
  if (explicit?.[1]) {
    const amount = Number(explicit[1].replace(/,/g, ''));
    return Number.isFinite(amount) && amount > 0 ? amount : null;
  }
  return null;
}

function hasExplicitCompletedStatus(value: string): boolean {
  const normalized = normalize(value);
  if (/\b(?:upcoming|current bid|starting bid|estimate only|passed|withdrawn|unsold|no bid)\b/i.test(normalized)) return false;
  return /\b(?:sold|price realized|realized price|final price|lot sold|ended)\b/i.test(normalized);
}

function extractDate(value: string): string | null {
  const patterns = [
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2},?\s+20\d{2}\b/i,
    /\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}\b/,
    /\b\d{1,2}[-/]\d{1,2}[-/]20\d{2}\b/,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern)?.[0];
    if (!match) continue;
    const parsed = Date.parse(match);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }
  return null;
}

function extractGrade(value: string): string | null {
  const match = value.match(/\b(?:NGC|PCGS|CGC|PSA|BGS|SGC|WATA|VGA|AFA)\s*(?:graded?\s*)?([A-Z]{0,8}\s*\d{1,3}(?:\.\d+)?(?:\+|\s*(?:CAMEO|DCAM|UCAM))?)/i);
  return match?.[1] ? match[1].replace(/\s+/g, ' ').trim().toUpperCase() : null;
}

function extractCertificationCompany(value: string): string | null {
  return value.match(/\b(NGC|PCGS|CGC|PSA|BGS|SGC|WATA|VGA|AFA)\b/i)?.[1]?.toUpperCase() ?? null;
}

function extractLotId(value: string, url: string | null): string | null {
  const candidate = value.match(/\b(?:lot(?:\s*(?:number|#|no\.?))?|lotno)\s*[:#]?\s*(\d{1,9})\b/i)?.[1]
    ?? url?.match(/[?&](?:LOT_ID|lotnum|lot|id)=([A-Za-z0-9_-]+)/i)?.[1]
    ?? url?.match(/LOT(\d{3,})/i)?.[1]
    ?? url?.match(/_(\d{4,})(?:\?|$)/)?.[1]
    ?? null;
  return candidate ? String(candidate) : null;
}

function pickTitle(anchorText: string, blockText: string, pageTitle: string): string {
  const cleanAnchor = text(anchorText);
  if (cleanAnchor.length >= 4 && cleanAnchor.length <= 360 && !/^(?:view|details|bid|lot|image|next|previous)$/i.test(cleanAnchor)) return decodeHtml(cleanAnchor);
  const lines = blockText.split(/(?<=\.)\s+(?=[A-Z])/).map(text).filter((line) => line.length >= 5 && line.length <= 360);
  return decodeHtml(lines[0] || pageTitle || 'Untitled public auction record');
}

function findCandidateBlock(anchor: Element): Element {
  let current: Element | null = anchor;
  for (let depth = 0; current && depth < 6; depth += 1, current = current.parentElement) {
    const body = text(current.textContent);
    if (body.length >= 40 && body.length <= 8_000 && (/(?:\$|sold|realized|final price|ended)/i.test(body))) return current;
  }
  return anchor;
}

function collectCandidateBlocks(sourceId: SandboxSpecialistSourceId, document: Document): Array<{ block: Element; url: string | null; anchorText: string }> {
  const rule = SOURCE_RULES[sourceId];
  if (!rule) return [];
  const seen = new Set<string>();
  const candidates: Array<{ block: Element; url: string | null; anchorText: string }> = [];
  for (const anchor of Array.from(document.querySelectorAll('a[href]'))) {
    const href = anchor.getAttribute('href') ?? '';
    const absolute = canonicalUrl(new URL(href, document.URL).toString());
    if (!absolute || !rule.hosts.includes(new URL(absolute).hostname.toLowerCase()) || !rule.linkPattern.test(`${new URL(absolute).pathname}${new URL(absolute).search}`)) continue;
    const block = findCandidateBlock(anchor);
    const key = `${absolute}|${text(block.textContent).slice(0, 140)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push({ block, url: absolute, anchorText: text(anchor.textContent) });
    if (candidates.length >= rule.recordCap) break;
  }
  if (!candidates.length) {
    const body = document.body;
    if (body && hasExplicitCompletedStatus(text(body.textContent)) && extractRealizedAmount(text(body.textContent)) != null) {
      candidates.push({ block: body, url: canonicalUrl(document.URL), anchorText: document.querySelector('h1')?.textContent ?? document.title });
    }
  }
  return candidates;
}

function identityReview(input: SpecialistMarketplaceLookupInput, title: string, description: string, grade: string | null, certificationCompany: string | null) {
  const details = parseDetails(input.itemDetails);
  const targetTokens = significantTokens([input.title, details.year, details.catalogNumber, details.cardNumber, details.issueNumber, details.model, details.edition].map(text).filter(Boolean).join(' '));
  const candidate = normalize(`${title} ${description}`);
  const matchedTokens = targetTokens.filter((token) => candidate.includes(token));
  // Platform, condition, media, and grading words are shared by many listings.
  // When the selected title has a distinctive long token, require that token rather
  // than allowing a different item through on generic overlap such as "Atari",
  // "sealed", "video game", and a matching Wata grade.
  const genericIdentityTokens = new Set([
    'sealed', 'unopened', 'video', 'game', 'games', 'wata', 'vga', 'cgc', 'psa', 'bgs', 'sgc', 'ngc', 'pcgs',
    // Broad object/media words often overlap across distinct lots and cannot be
    // treated as the subject anchor for an identity match.
    'tractor', 'vehicle', 'vehicles', 'toy', 'toys', 'doll', 'dolls', 'figure', 'figures', 'poster', 'posters',
    'autograph', 'autographs', 'signed', 'signature', 'comic', 'comics', 'coin', 'coins', 'stamp', 'stamps',
    'trading', 'card', 'cards', 'edition', 'original', 'vintage', 'collectible', 'collectibles',
  ]);
  const distinctiveTokens = targetTokens.filter((token) => token.length >= 7 && !genericIdentityTokens.has(token));
  const tokenMatch = targetTokens.length === 0
    || (distinctiveTokens.length > 0
      ? distinctiveTokens.some((token) => matchedTokens.includes(token))
      : matchedTokens.length >= Math.min(2, targetTokens.length));
  const gradeMatch = !input.grade || !grade || numericGradesEquivalent(input.grade, grade) || normalize(`${certificationCompany ?? ''} ${grade}`).includes(normalize(input.grade));
  const stateConflicts = identityStateConflicts(
    extractIdentityState(input),
    extractIdentityState({ title, grade, certificationCompany, condition: null, itemDetails: description }),
  );
  const conflict = stateConflicts.find((reason) => /raw\/graded|grading company|grade differs|single item versus lot|negative listing/i.test(reason)) ?? null;
  return {
    matchedTokens,
    matched: tokenMatch && gradeMatch && !conflict,
    reason: !tokenMatch
      ? 'Title/details did not meet the deterministic identity-token threshold.'
      : !gradeMatch
        ? `Grade conflicts with the selected item (${grade ?? 'candidate grade unavailable'} vs ${input.grade}).`
        : conflict,
  };
}

export function buildSpecialistMarketplaceRequest(input: SpecialistMarketplaceLookupInput): { url: string | null; error: string | null } {
  const source = getSandboxSpecialistSource(input.sourceId);
  if (!source) return { url: null, error: 'This specialist marketplace source is not registered.' };
  const rule = SOURCE_RULES[input.sourceId];
  if (source.searchContract === 'public_contract_unverified') return { url: null, error: `${source.label} has no verified public completed-sale request contract. Remote lookup is deliberately disabled.` };
  if (source.searchContract === 'price_table_locator_required') return { url: null, error: `${source.label} only exposes a price table/PDF without title-level matching. An exact source lot locator is required before a record can be safely normalized.` };
  if (input.sourceId === 'goldin' && source.searchContract === 'automatic_title_search') {
    const sourceUrl = text(input.sourceUrl);
    if (!sourceUrl) return { url: GOLDIN_PUBLIC_SOLD_SEARCH_ENDPOINT, error: null };
    return isAllowedSourceUrl(input.sourceId, sourceUrl)
      ? { url: sourceUrl, error: null }
      : { url: null, error: 'That URL is not an allowlisted public Goldin /item/ lot route.' };
  }
  if (source.searchContract === 'automatic_title_search') return { url: null, error: `${source.label} is handled by its dedicated adapter rather than this generic specialist route.` };
  const sourceUrl = text(input.sourceUrl);
  if (!sourceUrl) return { url: null, error: source.searchInstruction };
  return isAllowedSourceUrl(input.sourceId, sourceUrl)
    ? { url: sourceUrl, error: null }
    : { url: null, error: `That URL is not an allowlisted public ${source.label} closed-auction, catalog, or lot route.` };
}

export function parseSpecialistMarketplaceHtml(sourceId: SandboxSpecialistSourceId, html: string, input: SpecialistMarketplaceLookupInput, requestUrl: string): SpecialistMarketplaceLookupResult {
  const source = getSandboxSpecialistSource(input.sourceId);
  const base = {
    source: sourceId,
    label: source?.label ?? sourceId,
    searchContract: source?.searchContract ?? 'public_contract_unverified' as SpecialistSourceSearchContract,
    query: input.title,
    sales: [] as SpecialistMarketplaceRecord[],
    context: [] as SpecialistMarketplaceRecord[],
    messages: [] as string[],
    requestUrl,
    recordCap: SOURCE_RULES[sourceId]?.recordCap ?? SPECIALIST_MARKETPLACE_MAX_RECORDS,
  };
  if (!source) return { ...base, status: 'error', messages: ['This specialist marketplace source is not registered.'] };
  if (!isSandboxSpecialistSourceApplicable(sourceId, input.category)) return { ...base, status: 'not_applicable', messages: [`${source.label} is not mapped to this item category.`] };
  if (source.searchContract === 'public_contract_unverified' || source.searchContract === 'price_table_locator_required') return { ...base, status: 'unsupported', messages: [source.searchInstruction] };

  const dom = new JSDOM(html, { url: requestUrl });
  const document = dom.window.document;
  const pageText = text(document.body?.textContent);
  const pageDate = extractDate(pageText);
  const pageTitle = text(document.querySelector('h1')?.textContent) || text(document.title);
  const pricePolicy = sourcePriceBasis(sourceId);
  const records = collectCandidateBlocks(sourceId, document).map(({ block, url, anchorText }) => {
    const body = text(block.textContent);
    const title = pickTitle(anchorText, body, pageTitle);
    const amount = extractRealizedAmount(body);
    const completed = Boolean(amount && hasExplicitCompletedStatus(body));
    const identity = identityReview(input, title, body, extractGrade(body), extractCertificationCompany(body));
    const record: SpecialistMarketplaceRecord = {
      sourceId,
      provider: source.label,
      title,
      description: body.slice(0, 2_000) || null,
      lotId: extractLotId(body, url),
      auctionName: pageTitle || null,
      url,
      imageUrl: (() => {
        const image = block.querySelector('img[src]')?.getAttribute('src');
        return image ? canonicalUrl(new URL(image, requestUrl).toString()) : null;
      })(),
      saleStatus: completed ? 'completed' : 'unknown',
      completed,
      price: completed ? amount : null,
      currency: completed && /\$/i.test(body) ? 'USD' : null,
      date: extractDate(body) ?? pageDate,
      grade: extractGrade(body),
      certificationCompany: extractCertificationCompany(body),
      priceBasis: pricePolicy.priceBasis,
      buyerPremiumIncluded: pricePolicy.buyerPremiumIncluded,
      winningBid: null,
      buyerPremiumPercentage: null,
      identityMatched: identity.matched,
      matchedTokens: identity.matchedTokens,
      exclusionReason: !completed
        ? 'No explicit completed-sale wording and realized amount were found in the public record.'
        : !identity.matched
          ? identity.reason ?? 'Identity could not be confirmed.'
          : 'Context-only pending source-specific price-basis and signed-admission validation.',
      valuationEligible: false,
    };
    return record;
  });
  const sales = records.filter((record) => record.completed && record.identityMatched);
  return {
    ...base,
    status: 'success',
    sales,
    context: records.filter((record) => !record.completed || !record.identityMatched),
    messages: [`${source.label} read one bounded public page and found ${records.length} candidate record${records.length === 1 ? '' : 's'}; ${sales.length} passed deterministic completed-sale and identity checks. All results remain context-only and cannot affect valuation or the final AI conclusion.`],
  };
}

type GoldinPublicLotResponse = {
  auction_title?: unknown;
  lot?: {
    title?: unknown;
    description?: unknown;
    lot_id?: unknown;
    lot_number?: unknown;
    status?: unknown;
    final_price?: unknown;
    buyer_premium?: unknown;
    end_timestamp?: unknown;
  };
};

type GoldinPublicSearchLot = {
  title?: unknown;
  lot_id?: unknown;
  lot_number?: unknown;
  meta_slug?: unknown;
  status?: unknown;
  current_price?: unknown;
  buyer_premium?: unknown;
  end_timestamp?: unknown;
};

type GoldinPublicSearchResponse = {
  searchalgolia?: {
    lots?: GoldinPublicSearchLot[];
    total?: unknown;
  };
};

function centsToUsd(value: unknown): number | null {
  const cents = numberValue(value);
  return cents == null ? null : Math.round(cents) / 100;
}

function publicGoldinRecordUrl(value: unknown): string | null {
  const slug = text(value);
  return /^[a-z0-9-]{8,240}$/i.test(slug)
    ? canonicalUrl(`https://goldin.co/item/${encodeURIComponent(slug)}`)
    : null;
}

function parseGoldinPublicSearchResponse(input: SpecialistMarketplaceLookupInput, payload: GoldinPublicSearchResponse): SpecialistMarketplaceLookupResult {
  const source = getSandboxSpecialistSource('goldin')!;
  const lots = Array.isArray(payload.searchalgolia?.lots) ? payload.searchalgolia!.lots.slice(0, SOURCE_RULES.goldin!.recordCap) : [];
  const base = {
    source: 'goldin' as const,
    label: source.label,
    searchContract: source.searchContract,
    query: text(input.title).slice(0, 240),
    sales: [] as SpecialistMarketplaceRecord[],
    context: [] as SpecialistMarketplaceRecord[],
    requestUrl: GOLDIN_PUBLIC_SOLD_SEARCH_ENDPOINT,
    recordCap: SOURCE_RULES.goldin!.recordCap,
  };
  const records = lots.map((lot) => {
    const title = text(lot.title);
    const winningBid = centsToUsd(lot.current_price);
    const buyerPremiumPercentage = numberValue(lot.buyer_premium);
    const completed = normalize(lot.status) === 'completed sold' && winningBid != null && buyerPremiumPercentage != null;
    const allInPrice = completed ? Math.round(winningBid * (1 + buyerPremiumPercentage / 100) * 100) / 100 : null;
    const dateText = text(lot.end_timestamp);
    const date = dateText && Number.isFinite(Date.parse(dateText)) ? new Date(dateText).toISOString() : null;
    const grade = extractGrade(title);
    const certificationCompany = extractCertificationCompany(title);
    const identity = identityReview(input, title, '', grade, certificationCompany);
    const lotId = text(lot.lot_id) || (lot.lot_number != null ? String(lot.lot_number) : null);
    return {
      sourceId: 'goldin' as const,
      provider: source.label,
      title: title || 'Untitled public Goldin lot',
      description: null,
      lotId,
      auctionName: null,
      url: publicGoldinRecordUrl(lot.meta_slug),
      imageUrl: null,
      saleStatus: completed ? 'completed' as const : 'unknown' as const,
      completed,
      price: allInPrice,
      currency: allInPrice != null ? 'USD' as const : null,
      date,
      grade,
      certificationCompany,
      priceBasis: completed ? 'closed' as const : 'unknown' as const,
      buyerPremiumIncluded: completed ? true : null,
      winningBid,
      buyerPremiumPercentage,
      identityMatched: identity.matched,
      matchedTokens: identity.matchedTokens,
      exclusionReason: !completed
        ? 'The public Goldin search record did not provide Completed_Sold status, winning bid, and buyer-premium percentage together.'
        : !identity.matched
          ? identity.reason ?? 'Identity could not be confirmed.'
          : 'Context-only pending source-specific signed-admission validation.',
      valuationEligible: false as const,
    } satisfies SpecialistMarketplaceRecord;
  });
  const sales = records.filter((record) => record.completed && record.identityMatched);
  return {
    ...base,
    status: 'success',
    sales,
    context: records.filter((record) => !record.completed || !record.identityMatched),
    messages: [`Goldin ran one anonymous public sold-lot title search capped at ${base.recordCap} candidates and received ${lots.length}. ${sales.length} passed deterministic completed-sale and identity checks. Returned bid amounts were converted from Goldin cents and combined with the returned buyer-premium percentage for all-in context. All records remain context-only and cannot affect valuation or the final AI conclusion.`],
  };
}

function parseGoldinPublicLotResponse(input: SpecialistMarketplaceLookupInput, sourceUrl: string, payload: GoldinPublicLotResponse): SpecialistMarketplaceLookupResult {
  const source = getSandboxSpecialistSource('goldin')!;
  const base = {
    source: 'goldin' as const,
    label: source.label,
    searchContract: source.searchContract,
    query: input.title,
    sales: [] as SpecialistMarketplaceRecord[],
    context: [] as SpecialistMarketplaceRecord[],
    requestUrl: sourceUrl,
    recordCap: 1,
  };
  const lot = payload.lot;
  if (!lot) return { ...base, status: 'error' as const, messages: ['Goldin returned a public response without a lot record; it was not interpreted as a sale.'] };

  const title = text(lot.title);
  const description = text(lot.description);
  const winningBid = centsToUsd(lot.final_price);
  const buyerPremiumPercentage = numberValue(lot.buyer_premium);
  const completed = normalize(lot.status) === 'completed sold' && winningBid != null && buyerPremiumPercentage != null;
  const allInPrice = completed ? Math.round(winningBid * (1 + buyerPremiumPercentage / 100) * 100) / 100 : null;
  const dateText = text(lot.end_timestamp);
  const date = dateText && Number.isFinite(Date.parse(dateText)) ? new Date(dateText).toISOString() : null;
  const grade = extractGrade(`${title} ${description}`);
  const certificationCompany = extractCertificationCompany(`${title} ${description}`);
  const identity = identityReview(input, title, description, grade, certificationCompany);
  const lotId = text(lot.lot_id) || (lot.lot_number != null ? String(lot.lot_number) : null);
  const record: SpecialistMarketplaceRecord = {
    sourceId: 'goldin',
    provider: source.label,
    title: title || 'Untitled public Goldin lot',
    description: description || null,
    lotId,
    auctionName: text(payload.auction_title) || null,
    url: canonicalUrl(sourceUrl),
    imageUrl: null,
    saleStatus: completed ? 'completed' : 'unknown',
    completed,
    price: allInPrice,
    currency: allInPrice != null ? 'USD' : null,
    date,
    grade,
    certificationCompany,
    priceBasis: completed ? 'closed' : 'unknown',
    buyerPremiumIncluded: completed ? true : null,
    winningBid,
    buyerPremiumPercentage,
    identityMatched: identity.matched,
    matchedTokens: identity.matchedTokens,
    exclusionReason: !completed
      ? 'The public Goldin lot did not provide Completed_Sold status, winning bid, and buyer-premium percentage together.'
      : !identity.matched
        ? identity.reason ?? 'Identity could not be confirmed.'
        : 'Context-only pending source-specific signed-admission validation.',
    valuationEligible: false,
  };
  const sales = record.completed && record.identityMatched ? [record] : [];
  return {
    ...base,
    status: 'success',
    sales,
    context: sales.length ? [] : [record],
    messages: [`Goldin read one public supplied lot URL. ${completed ? `Winning bid $${winningBid.toLocaleString()} plus ${buyerPremiumPercentage}% buyer premium equals displayed all-in context $${allInPrice!.toLocaleString()}.` : 'The lot did not meet the completed-sale field requirement.'} The record remains context-only and cannot affect valuation or the final AI conclusion.`],
  };
}

async function lookupGoldinPublicSearch(input: SpecialistMarketplaceLookupInput): Promise<SpecialistMarketplaceLookupResult> {
  const source = getSandboxSpecialistSource('goldin')!;
  const query = text(input.title).slice(0, 240);
  const empty = {
    source: 'goldin' as const,
    label: source.label,
    searchContract: source.searchContract,
    query,
    sales: [] as SpecialistMarketplaceRecord[],
    context: [] as SpecialistMarketplaceRecord[],
    requestUrl: GOLDIN_PUBLIC_SOLD_SEARCH_ENDPOINT,
    recordCap: SOURCE_RULES.goldin!.recordCap,
  };
  if (!query) return { ...empty, status: 'setup_required' as const, messages: ['Goldin automatic search requires an item title.'] };
  const body = {
    search: {
      queryType: 'Highest_Bids',
      keyword: query,
      size: empty.recordCap,
      from: 0,
      show_only: 'Sold',
      hasAnalyticsConsent: false,
    },
  };
  try {
    const response = await fetch(GOLDIN_PUBLIC_SOLD_SEARCH_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Tradebilia Sandbox Read-Only Specialist Adapter/1.0',
      },
      body: JSON.stringify(body),
      redirect: 'error',
      signal: AbortSignal.timeout(SPECIALIST_MARKETPLACE_TIMEOUT_MS),
    });
    if (!response.ok) return { ...empty, status: 'error' as const, messages: [`Goldin public sold search returned HTTP ${response.status}; no retry, pagination, account access, or workaround was attempted.`] };
    if (!/json/i.test(response.headers.get('content-type') ?? '')) return { ...empty, status: 'error' as const, messages: ['Goldin public sold search returned an unsupported response type; it was not parsed.'] };
    return parseGoldinPublicSearchResponse(input, await response.json() as GoldinPublicSearchResponse);
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    return { ...empty, status: 'error' as const, messages: [timedOut ? 'Goldin public sold search timed out; no retry was attempted.' : 'Goldin public sold search could not be reached; no access workaround was attempted.'] };
  }
}

async function lookupGoldinPublicLot(input: SpecialistMarketplaceLookupInput, sourceUrl: string): Promise<SpecialistMarketplaceLookupResult> {
  const source = getSandboxSpecialistSource('goldin')!;
  const slug = publicGoldinLotSlug(sourceUrl);
  const empty = {
    source: 'goldin' as const,
    label: source.label,
    searchContract: source.searchContract,
    query: input.title,
    sales: [] as SpecialistMarketplaceRecord[],
    context: [] as SpecialistMarketplaceRecord[],
    requestUrl: sourceUrl,
    recordCap: 1,
  };
  if (!slug) return { ...empty, status: 'setup_required' as const, messages: ['Paste a public Goldin /item/ lot URL.'] };
  try {
    const response = await fetch(`${GOLDIN_PUBLIC_LOT_ENDPOINT}${encodeURIComponent(slug)}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Tradebilia Sandbox Read-Only Specialist Adapter/1.0' },
      redirect: 'error',
      signal: AbortSignal.timeout(SPECIALIST_MARKETPLACE_TIMEOUT_MS),
    });
    if (!response.ok) return { ...empty, status: 'error' as const, messages: [`Goldin public lot data returned HTTP ${response.status}; no retry or access workaround was attempted.`] };
    if (!/json/i.test(response.headers.get('content-type') ?? '')) return { ...empty, status: 'error' as const, messages: ['Goldin public lot data returned an unsupported response type; it was not parsed.'] };
    return parseGoldinPublicLotResponse(input, sourceUrl, await response.json() as GoldinPublicLotResponse);
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    return { ...empty, status: 'error' as const, messages: [timedOut ? 'Goldin public lot data timed out; no retry was attempted.' : 'Goldin public lot data could not be reached; no access workaround was attempted.'] };
  }
}

export async function lookupSpecialistMarketplace(input: SpecialistMarketplaceLookupInput): Promise<SpecialistMarketplaceLookupResult> {
  const source = getSandboxSpecialistSource(input.sourceId);
  const request = buildSpecialistMarketplaceRequest(input);
  const empty = {
    source: input.sourceId,
    label: source?.label ?? input.sourceId,
    searchContract: source?.searchContract ?? 'public_contract_unverified' as SpecialistSourceSearchContract,
    query: input.title,
    sales: [] as SpecialistMarketplaceRecord[],
    context: [] as SpecialistMarketplaceRecord[],
    requestUrl: request.url,
    recordCap: SOURCE_RULES[input.sourceId]?.recordCap ?? SPECIALIST_MARKETPLACE_MAX_RECORDS,
  };
  if (!source) return { ...empty, status: 'error', messages: ['This specialist marketplace source is not registered.'] };
  if (!isSandboxSpecialistSourceApplicable(input.sourceId, input.category)) return { ...empty, status: 'not_applicable', messages: [`${source.label} is not mapped to this item category.`] };
  if (!request.url) return { ...empty, status: source.searchContract === 'public_contract_unverified' ? 'unsupported' : 'setup_required', messages: [request.error ?? source.searchInstruction] };
  if (input.sourceId === 'goldin') return text(input.sourceUrl) ? lookupGoldinPublicLot(input, request.url) : lookupGoldinPublicSearch(input);
  try {
    const response = await fetch(request.url, {
      headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'Tradebilia Sandbox Read-Only Specialist Adapter/1.0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(SPECIALIST_MARKETPLACE_TIMEOUT_MS),
    });
    if (!response.ok) return { ...empty, status: 'error', messages: [`${source.label} returned HTTP ${response.status}; no retry or access workaround was attempted.`] };
    if (!isAllowedSourceUrl(input.sourceId, response.url)) return { ...empty, status: 'error', messages: [`${source.label} redirected outside the allowlisted public contract; the response was not parsed.`] };
    const contentType = response.headers.get('content-type') ?? '';
    if (!/html|xhtml/i.test(contentType)) return { ...empty, status: 'error', messages: [`${source.label} returned ${contentType || 'an unsupported response type'}; no unsupported parser was used.`] };
    return parseSpecialistMarketplaceHtml(input.sourceId, await response.text(), input, response.url);
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    return { ...empty, status: 'error', messages: [timedOut ? `${source.label} timed out; no retry was attempted.` : `${source.label} could not be reached; no access workaround was attempted.`] };
  }
}
