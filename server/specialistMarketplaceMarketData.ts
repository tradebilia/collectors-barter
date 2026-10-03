import { JSDOM } from 'jsdom';
import {
  getSandboxSpecialistSource,
  isSandboxSpecialistSourceApplicable,
  type SandboxSpecialistSourceId,
  type SpecialistSourceSearchContract,
} from '../shared/sandboxSpecialistSources';
import { numericGradesEquivalent } from '../shared/publicGradeValues';
import { extractIdentityState, extractSignatureNames, identityStateConflicts } from './testAiIdentityState';
import { ENV } from './_core/env';
import { resolveTestAiGradingCompany } from '../shared/testAiCriteria';

export type SpecialistMarketplaceLookupInput = {
  sourceId: SandboxSpecialistSourceId;
  title: string;
  category: string;
  grade?: string | null;
  condition?: string | null;
  certificationCompany?: string | null;
  itemDetails?: string | null;
  historyWindow?: 'recent_12_months' | 'historical' | 'all';
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
  historyWindow?: 'recent_12_months' | 'historical' | 'all';
  reefApiAudit?: ReefApiAudit;
  guideRows?: ComicBookRealmGuideRow[];
  guideSummary?: ComicBookRealmGuideSummary;
};

export type ComicBookRealmGuideRow = {
  grade: string;
  population: number | null;
  lastSaleDate: string | null;
  recordedSales: number | null;
  estimatedValue: number | null;
};

export type ComicBookRealmGuideSummary = {
  issueTitle: string | null;
  certifiedCategory: string | null;
  totalRecordedSales: number | null;
};

export type ReefApiAudit = {
  apiCalls: number;
  searchCalls: number;
  detailCalls: number;
  estimatedCredits: number;
  creditBasis: 'one-credit-per-request';
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
  weiss: { hosts: ['api-frontend.nextlot.net'], linkPattern: /\/api\/frontend\/v1\/sites\/2218285\/search\/lots/i, recordCap: 12 },
  stephen_album: { hosts: ['sarc.auction', 'www.sarc.auction'], linkPattern: /(?:\/auctionlist\.aspx\?dv=2|_as\d+(?:_p\d+)?$|_i\d+$)/i, recordCap: 12 },
  nate_sanders: { hosts: ['natedsanders.com', 'www.natedsanders.com'], linkPattern: /\/(?:catalog\.aspx|[^/]+-LOT\d+\.aspx)/i, recordCap: 12 },
  tcgplayer_reef: { hosts: ['api.reefapi.com', 'www.tcgplayer.com'], linkPattern: /(?:api\.reefapi\.com\/tcgplayer\/v1|www\.tcgplayer\.com\/product\/\d+)/i, recordCap: 12 },
  catawiki_reef: { hosts: ['api.reefapi.com', 'www.catawiki.com'], linkPattern: /(?:api\.reefapi\.com\/catawiki\/v1|www\.catawiki\.com\/en\/l\/\d+)/i, recordCap: 12 },
  auctionet: { hosts: ['api.reefapi.com'], linkPattern: /api\.reefapi\.com\/auctionet\/v1/i, recordCap: 12 },
  comic_book_realm: { hosts: ['comicbookrealm.com', 'www.comicbookrealm.com'], linkPattern: /\/cgc-analyzer\/(?:search-results\/[^/?#]+|comic\/id\/\d+(?:\/[^/?#]+)?)\/?/i, recordCap: 30 },
};

const GOLDIN_PUBLIC_LOT_ENDPOINT = 'https://lot-retrieval-bidder.api.prod.goldin.com/api/meta_slug/';
const GOLDIN_PUBLIC_SOLD_SEARCH_ENDPOINT = 'https://d1wu47wucybvr3.cloudfront.net/api/lots_v2';
const WEISS_PUBLIC_COMPLETED_LOTS_ENDPOINT = 'https://api-frontend.nextlot.net/api/frontend/v1/sites/2218285/search/lots';
const STEPHEN_ALBUM_COMPLETED_AUCTIONS_ENDPOINT = 'https://www.sarc.auction/auctionlist.aspx?dv=2';
const REEF_API_BASE = 'https://api.reefapi.com';
const TCGPLAYER_SEARCH_ENDPOINT = `${REEF_API_BASE}/tcgplayer/v1/search`;
const TCGPLAYER_SALES_ENDPOINT = `${REEF_API_BASE}/tcgplayer/v1/product/sales`;
const CATAWIKI_SEARCH_ENDPOINT = `${REEF_API_BASE}/catawiki/v1/search`;
const AUCTIONET_SEARCH_ENDPOINT = `${REEF_API_BASE}/auctionet/v1/search`;
const COMIC_BOOK_REALM_CGC_ANALYZER_BASE = 'https://comicbookrealm.com/cgc-analyzer/';
const COMIC_BOOK_REALM_CGC_SEARCH_BASE = 'https://comicbookrealm.com/cgc-analyzer/search-results/';

function comicBookRealmSearchQuery(input: SpecialistMarketplaceLookupInput): string {
  const details = parseDetails(input.itemDetails);
  const issue = text(details.issueNumber ?? details.issueNo ?? details.issue ?? details.number ?? input.title.match(/#\s*([0-9A-Za-z-]+)/i)?.[1]);
  const series = text(details.comicTitle ?? details.title) || input.title.replace(/#\s*[0-9A-Za-z-]+.*$/i, '').trim();
  return `${series || input.title} ${issue}`.replace(/\s+/g, ' ').trim().slice(0, 180);
}

/**
 * Resolves the normal public CGC Analyzer search page to one exact issue page.
 * Facsimiles, variants, and foreign editions are rejected before fetching the
 * guide table so a broad title search cannot silently produce the wrong guide.
 */
export function resolveComicBookRealmAnalyzerUrl(html: string, input: SpecialistMarketplaceLookupInput, requestUrl: string): string | null {
  const document = new JSDOM(html, { url: requestUrl }).window.document;
  const details = parseDetails(input.itemDetails);
  const issue = text(details.issueNumber ?? details.issueNo ?? details.issue ?? details.number ?? input.title.match(/#\s*([0-9A-Za-z-]+)/i)?.[1]);
  const seriesName = normalize(text(details.comicTitle ?? details.title) || input.title.replace(/#\s*[0-9A-Za-z-]+.*$/i, ''));
  const publisherTokens = significantTokens(text(details.publisher ?? details.publisherName ?? details.manufacturer ?? ''));
  const issuePattern = issue ? new RegExp(`(?:^|[^0-9A-Za-z])${issue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^0-9A-Za-z])`, 'i') : null;
  const wantedTokens = significantTokens(text(details.title) || input.title).filter(token => token !== issue.toLowerCase());
  const rejected = /facsimile|variant|foreign|french|german|greek|hungarian|dutch|italian|spanish|reprint|multi[ -]?pack|edition/i;
  const candidates = Array.from(document.querySelectorAll('a[href]')).flatMap((anchor, sourceIndex) => {
    const href = anchor.getAttribute('href') ?? '';
    const absolute = new URL(href, requestUrl).toString();
    if (!isAllowedSourceUrl('comic_book_realm', absolute) || !/\/comic\/id\//i.test(absolute)) return [];
    const anchorText = text(anchor.textContent);
    if (!anchorText) return [];
    const haystack = text(`${anchorText} ${absolute}`);
    if (issuePattern && !issuePattern.test(haystack)) return [];
    if (rejected.test(haystack)) return [];
    const normalized = normalize(haystack);
    const normalizedAnchor = normalize(anchorText);
    const normalizedUrl = normalize(absolute);
    const issuePosition = issue ? normalizedAnchor.search(new RegExp(`(?:^|\\s)${issue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|\\s)`, 'i')) : -1;
    const titleBeforeIssue = issuePosition >= 0 ? normalizedAnchor.slice(0, issuePosition).trim() : '';
    const exactSeriesBeforeIssue = Boolean(seriesName && titleBeforeIssue && (titleBeforeIssue.endsWith(seriesName) || titleBeforeIssue.endsWith(`the ${seriesName}`)));
    const publisherMatches = publisherTokens.length > 0 && publisherTokens.every(token => normalizedUrl.includes(token));
    const matched = wantedTokens.filter(token => normalized.includes(token));
    const score = matched.length * 10 + (exactSeriesBeforeIssue ? 150 : -100) + (issuePattern?.test(haystack) ? 50 : 0) + (publisherTokens.length ? (publisherMatches ? 40 : -80) : 0);
    return [{ absolute, score, matched, sourceIndex }];
  });
  candidates.sort((a, b) => b.score - a.score || b.matched.length - a.matched.length || a.sourceIndex - b.sourceIndex);
  return candidates[0]?.absolute ?? null;
}

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

function normalizePreservingSpelling(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
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

function firstDetail(details: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = text(details[key]).trim();
    if (value) return value;
  }
  return '';
}

function firstDetailPreservingSpelling(details: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = String(details[key] ?? '').replace(/\s+/g, ' ').trim();
    if (value) return value;
  }
  return '';
}

function formatSearchGrade(value: unknown, gradingCompany = ''): string {
  const grade = text(value).trim();
  if (/^(?:raw|ungraded|n\/a|none|null|undefined)$/i.test(grade)) return '';
  if (!/^\d+(?:\.\d+)?$/.test(grade)) return grade;
  const numeric = Number(grade);
  if (!Number.isFinite(numeric) || numeric <= 0) return '';
  if (gradingCompany.trim().toUpperCase() === 'PSA') return String(Math.round(numeric));
  return grade.includes('.') ? numeric.toFixed(1) : String(numeric);
}

type GoldinQueryOptions = {
  includeCertification?: boolean;
  includeGrade?: boolean;
  includeComicYear?: boolean;
  includeSigners?: boolean;
};

/** Goldin query built from structured identity fields; publisher/manufacturer is intentionally excluded. */
export function buildGoldinSearchQuery(input: SpecialistMarketplaceLookupInput, options: GoldinQueryOptions = {}): string {
  const details = parseDetails(input.itemDetails);
  const includeCertification = options.includeCertification !== false;
  const includeGrade = options.includeGrade !== false;
  const includeComicYear = options.includeComicYear !== false;
  const includeSigners = options.includeSigners !== false;
  const category = normalize(input.category).replace(/_/g, ' ');
  const parts: string[] = [];
  const add = (...values: string[]) => values.forEach((value) => {
    const cleaned = value.trim();
    if (cleaned && !parts.some((part) => normalize(part) === normalize(cleaned))) parts.push(cleaned);
  });

  if (category === 'comics') {
    add(firstDetailPreservingSpelling(details, ['comicTitle', 'series', 'title']) || input.title);
    add(firstDetail(details, ['issueNumber', 'issueNo', 'issue', 'number']));
    // Comic year is an additional query and verification layer, not a publisher substitute.
    if (includeComicYear) add(firstDetail(details, ['publicationYear', 'year', 'issueYear']));
    if (includeSigners) extractSignatureNames(input).forEach((signer) => add(signer));
  } else if (category === 'sports cards') {
    add(firstDetail(details, ['player', 'athlete', 'subject']) || input.title);
    add(firstDetail(details, ['year']), firstDetail(details, ['setName', 'set', 'cardSet']));
    add(firstDetail(details, ['cardNumber', 'cardNo', 'number']));
  } else if (category === 'pokemon') {
    add(firstDetail(details, ['cardName', 'pokemonName', 'name']) || input.title);
    add(firstDetail(details, ['setName', 'set', 'cardSet']));
    add(firstDetail(details, ['cardNumber', 'cardNo', 'number']));
  } else if (category === 'video games') {
    add(firstDetail(details, ['gameTitle', 'title']) || input.title);
    add(firstDetail(details, ['platform', 'console', 'consoleName']));
    add(firstDetail(details, ['releaseYear', 'year']));
    add(firstDetail(details, ['edition', 'version']));
  } else {
    add(input.title);
    add(firstDetail(details, ['year', 'releaseYear', 'issueYear', 'catalogNumber', 'cardNumber', 'edition', 'variant', 'country', 'denomination', 'platform', 'format']));
  }

  const gradingCompany = resolveTestAiGradingCompany(details, input.certificationCompany ?? '');
  if (includeCertification) add(gradingCompany);
  if (includeGrade) add(formatSearchGrade(input.grade, gradingCompany));
  return parts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 240);
}

export function buildGoldinSearchQueries(input: SpecialistMarketplaceLookupInput): string[] {
  const variants = [
    buildGoldinSearchQuery(input),
    buildGoldinSearchQuery(input, { includeSigners: false }),
    buildGoldinSearchQuery(input, { includeCertification: false, includeGrade: false }),
    buildGoldinSearchQuery(input, { includeCertification: false, includeGrade: false, includeComicYear: false, includeSigners: false }),
    text(input.title).slice(0, 240),
  ];
  return [...new Set(variants.filter(Boolean))].slice(0, 4);
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

function extractStephenHammer(value: string): { hammer: number; premium: number | null } | null {
  const match = value.match(/Sold\s+for\s*\(\s*([\d,]+(?:\.\d+)?)\s*\+\s*([\d,]+(?:\.\d+)?)\s*BP\s*\)/i);
  if (!match) return null;
  const hammer = Number(match[1].replace(/,/g, ''));
  const premiumAmount = Number(match[2].replace(/,/g, ''));
  if (!Number.isFinite(hammer) || hammer <= 0) return null;
  return { hammer, premium: Number.isFinite(premiumAmount) ? Math.round((premiumAmount / hammer) * 10000) / 100 : null };
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
  if (match?.[1]) {
    const numericGrade = match[1].match(/\d{1,3}(?:\.\d+)?/)?.[0];
    if (numericGrade) return numericGrade;
  }

  // Goldin commonly writes comic grades as "CGC Signature Series 9.6".
  // The label between the grader and numeric grade is descriptive, not the
  // grade itself; retain the numeric grade so a 9.6 cannot pass a 9.8 target.
  const labeledMatches = [...value.matchAll(/\b(?:NGC|PCGS|CGC|PSA|BGS|SGC|WATA|VGA|AFA)\b[^\d]{1,48}(\d{1,3}(?:\.\d+)?)(?:\+|\s*(?:CAMEO|DCAM|UCAM))?/gi)];
  const labeledMatch = labeledMatches.at(-1);
  return labeledMatch?.[1] ? labeledMatch[1].trim().toUpperCase() : null;
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
  const targetTokens = significantTokens([normalizePreservingSpelling(input.title), details.year, details.catalogNumber, details.cardNumber, details.issueNumber, details.model, details.edition].map(text).filter(Boolean).join(' '));
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
  const gradeMatch = !input.grade
    || (grade != null && (numericGradesEquivalent(input.grade, grade) || normalize(`${certificationCompany ?? ''} ${grade}`).includes(normalize(input.grade))));
  const stateConflicts = identityStateConflicts(
    extractIdentityState(input),
    extractIdentityState({ title, grade, certificationCompany, condition: null, itemDetails: description }),
    normalize(input.category).replace(/_/g, ' ') === 'comics',
  );
  const conflict = stateConflicts.find((reason) => /raw\/graded|grading company|grade differs|autograph|signature not declared|signature name|single item versus lot|negative listing/i.test(reason)) ?? null;
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

function parseGuideMoney(value: string): number | null {
  const match = value.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
  if (!match?.[1]) return null;
  const amount = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function parseGuideCount(value: string): number | null {
  const cleaned = value.replace(/,/g, "").trim();
  if (!/^\d+$/.test(cleaned)) return null;
  const count = Number(cleaned);
  return Number.isSafeInteger(count) ? count : null;
}

function parseComicBookRealmCgcAnalyzerHtml(
  html: string,
  input: SpecialistMarketplaceLookupInput,
  requestUrl: string
): SpecialistMarketplaceLookupResult {
  const source = getSandboxSpecialistSource("comic_book_realm")!;
  const base = {
    source: "comic_book_realm" as const,
    label: source.label,
    searchContract: source.searchContract,
    query: requestUrl,
    sales: [] as SpecialistMarketplaceRecord[],
    context: [] as SpecialistMarketplaceRecord[],
    messages: [] as string[],
    requestUrl,
    recordCap: SOURCE_RULES.comic_book_realm!.recordCap,
  };
  const document = new JSDOM(html, { url: requestUrl }).window.document;
  const table = Array.from(document.querySelectorAll("table")).find(
    candidate =>
      /grade/i.test(text(candidate.textContent)) &&
      /estimated value/i.test(text(candidate.textContent))
  );
  if (!table)
    return {
      ...base,
      status: "error",
      messages: [
        "Comic Book Realm returned no public CGC grade/value table; no synthetic estimate was created.",
      ],
    };
  const headers = Array.from(
    table.querySelectorAll("tr:first-child th, tr:first-child td")
  ).map(cell => normalize(cell.textContent));
  const indexOf = (name: string) =>
    headers.findIndex(header => header === name || header.includes(name));
  const gradeIndex = indexOf("grade");
  const populationIndex = indexOf("population");
  const lastSaleIndex = indexOf("last sale");
  const recordedIndex = indexOf("recorded sales");
  const estimateIndex = indexOf("estimated value");
  const rows: ComicBookRealmGuideRow[] = [];
  for (const row of Array.from(table.querySelectorAll("tr")).slice(1)) {
    const cells = Array.from(row.querySelectorAll("td, th")).map(cell =>
      text(cell.textContent)
    );
    const grade = gradeIndex >= 0 ? (cells[gradeIndex] ?? "") : "";
    if (!/^\d+(?:\.\d+)?$|^\.\d+$/.test(grade)) continue;
    const lastSaleText = lastSaleIndex >= 0 ? (cells[lastSaleIndex] ?? "") : "";
    rows.push({
      grade,
      population:
        populationIndex >= 0
          ? parseGuideCount(cells[populationIndex] ?? "")
          : null,
      lastSaleDate: extractDate(lastSaleText),
      recordedSales:
        recordedIndex >= 0 ? parseGuideCount(cells[recordedIndex] ?? "") : null,
      estimatedValue:
        estimateIndex >= 0 ? parseGuideMoney(cells[estimateIndex] ?? "") : null,
    });
    if (rows.length >= SOURCE_RULES.comic_book_realm!.recordCap) break;
  }
  if (!rows.length)
    return {
      ...base,
      status: "error",
      messages: [
        "Comic Book Realm returned a CGC table but no grade rows could be parsed deterministically.",
      ],
    };
  const pageText = text(document.body?.textContent);
  const issueTitle =
    text(document.querySelector("h1")?.textContent) ||
    text(document.title) ||
    null;
  const certifiedCategory =
    text(
      Array.from(document.querySelectorAll("tr"))
        .find(row => /certified category/i.test(text(row.textContent)))
        ?.querySelector("td:last-child")?.textContent
    ) || null;
  const totalMatch = pageText.match(/Recorded Sales\s*:?\s*([\d,]+)/i);
  const totalRecordedSales = totalMatch?.[1]
    ? parseGuideCount(totalMatch[1])
    : null;
  const targetGrade = input.grade?.trim() || null;
  const records = rows.map(
    row =>
      ({
        sourceId: "comic_book_realm" as const,
        provider: source.label,
        title: `${issueTitle ?? input.title} · CGC ${row.grade}`,
        description: `Public CGC Analyzer guide row: estimated value ${row.estimatedValue == null ? "unavailable" : `$${row.estimatedValue.toLocaleString()}`}; recorded sales ${row.recordedSales ?? "unavailable"}; last sale ${row.lastSaleDate ?? "unavailable"}.`,
        lotId: null,
        auctionName: "Comic Book Realm CGC Analyzer",
        url: requestUrl,
        imageUrl: null,
        saleStatus: "unknown" as const,
        completed: false,
        price: row.estimatedValue,
        currency: row.estimatedValue != null ? ("USD" as const) : null,
        date: row.lastSaleDate,
        grade: row.grade,
        certificationCompany: "CGC",
        priceBasis: "unknown" as const,
        buyerPremiumIncluded: null,
        winningBid: null,
        buyerPremiumPercentage: null,
        identityMatched:
          !targetGrade || numericGradesEquivalent(targetGrade, row.grade),
        matchedTokens: [],
        exclusionReason:
          "Aggregated guide estimate; not an individual completed sale and never valuation-eligible.",
        valuationEligible: false as const,
      }) satisfies SpecialistMarketplaceRecord
  );
  return {
    ...base,
    status: "success",
    context: records,
    guideRows: rows,
    guideSummary: { issueTitle, certifiedCategory, totalRecordedSales },
    messages: [
      `Comic Book Realm returned ${rows.length} grade rows for ${issueTitle ?? input.title}. Values are grade-specific guide estimates with recorded-sale counts—not individual sold comparables—and cannot affect valuation or the final AI conclusion.`,
    ],
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
  if (input.sourceId === 'weiss' && source.searchContract === 'automatic_title_search') {
    return { url: WEISS_PUBLIC_COMPLETED_LOTS_ENDPOINT, error: null };
  }
  if (input.sourceId === 'stephen_album' && source.searchContract === 'automatic_title_search') {
    return { url: STEPHEN_ALBUM_COMPLETED_AUCTIONS_ENDPOINT, error: null };
  }
  if (input.sourceId === 'nate_sanders' && source.searchContract === 'automatic_title_search') {
    const query = text(input.title).slice(0, 180);
    return { url: `https://natedsanders.com/catalog.aspx?searchby=3&searchvalue=${encodeURIComponent(query)}`, error: null };
  }
  if (input.sourceId === 'tcgplayer_reef' && source.searchContract === 'automatic_title_search') {
    return { url: TCGPLAYER_SEARCH_ENDPOINT, error: null };
  }
  if (input.sourceId === 'catawiki_reef' && source.searchContract === 'automatic_title_search') {
    return { url: CATAWIKI_SEARCH_ENDPOINT, error: null };
  }
  if (input.sourceId === 'auctionet' && source.searchContract === 'automatic_title_search') {
    const query = text(input.title).slice(0, 180);
    return { url: AUCTIONET_SEARCH_ENDPOINT, error: null };
  }
  if (input.sourceId === 'comic_book_realm' && source.searchContract === 'automatic_title_search') {
    const sourceUrl = text(input.sourceUrl);
    if (sourceUrl) {
      return isAllowedSourceUrl(input.sourceId, sourceUrl)
        ? { url: sourceUrl, error: null }
        : { url: null, error: 'That URL is not an allowlisted public Comic Book Realm route.' };
    }
    return { url: `${COMIC_BOOK_REALM_CGC_SEARCH_BASE}${encodeURIComponent(comicBookRealmSearchQuery(input))}`, error: null };
  }
  if (input.sourceId === 'comic_book_realm' && source.searchContract === 'public_locator_required') {
    const sourceUrl = text(input.sourceUrl);
    if (!sourceUrl) return { url: null, error: source.searchInstruction };
    return isAllowedSourceUrl(input.sourceId, sourceUrl) ? { url: sourceUrl, error: null } : { url: null, error: 'That URL is not an allowlisted public Comic Book Realm CGC Analyzer route.' };
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

  if (sourceId === 'comic_book_realm') return parseComicBookRealmCgcAnalyzerHtml(html, input, requestUrl);
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

type WeissPublicAuction = {
  id?: unknown;
  name?: unknown;
  is_completed?: unknown;
  completes_at?: unknown;
  currency_code?: unknown;
};

type WeissPublicSearchLot = {
  id?: unknown;
  auction_id?: unknown;
  number?: unknown;
  name?: unknown;
  description_html?: unknown;
  focal_media_file_url_thumb_image?: unknown;
  is_completed?: unknown;
  leading_bid_amount_cents?: unknown;
  auction?: WeissPublicAuction;
};

type WeissPublicSearchResponse = {
  data?: WeissPublicSearchLot[];
  total_count?: unknown;
};

function epochSecondsToIso(value: unknown): string | null {
  const seconds = numberValue(value);
  if (seconds == null || seconds <= 0) return null;
  const date = new Date(seconds * 1_000);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function plainHtml(value: unknown): string {
  return decodeHtml(text(value).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function publicWeissLotUrl(auctionId: unknown, lotId: unknown): string | null {
  const auction = numberValue(auctionId);
  const lot = numberValue(lotId);
  return auction != null && lot != null
    ? canonicalUrl(`https://weiss.auction/auctions/${Math.trunc(auction)}/lots/${Math.trunc(lot)}`)
    : null;
}

function buildWeissCompletedLotSearchUrl(query: string): string {
  const search = new URLSearchParams({
    page_number: '1',
    page_size: String(SOURCE_RULES.weiss!.recordCap),
    filters: `text_search:${query}|auction_completes_at:-1`,
  });
  return `${WEISS_PUBLIC_COMPLETED_LOTS_ENDPOINT}?${search.toString()}`;
}

function parseWeissPublicSearchResponse(input: SpecialistMarketplaceLookupInput, requestUrl: string, payload: WeissPublicSearchResponse): SpecialistMarketplaceLookupResult {
  const source = getSandboxSpecialistSource('weiss')!;
  const lots = Array.isArray(payload.data) ? payload.data.slice(0, SOURCE_RULES.weiss!.recordCap) : [];
  const base = {
    source: 'weiss' as const,
    label: source.label,
    searchContract: source.searchContract,
    query: text(input.title).slice(0, 240),
    sales: [] as SpecialistMarketplaceRecord[],
    context: [] as SpecialistMarketplaceRecord[],
    requestUrl,
    recordCap: SOURCE_RULES.weiss!.recordCap,
  };
  const records = lots.map((lot) => {
    const auction = lot.auction;
    const title = text(lot.name);
    const description = plainHtml(lot.description_html);
    const date = epochSecondsToIso(auction?.completes_at);
    const winningBidCents = numberValue(lot.leading_bid_amount_cents);
    const winningBid = winningBidCents != null ? winningBidCents / 100 : null;
    const currency = text(auction?.currency_code).toUpperCase() === 'USD' ? 'USD' as const : null;
    // The browser-visible provider record calls this a leading bid. With both
    // the lot and its parent auction marked completed, it is the final hammer
    // bid—not an active-listing current bid. We never add buyer premium.
    const completed = lot.is_completed === true
      && auction?.is_completed === true
      && date != null
      && currency === 'USD'
      && winningBid != null
      && winningBid > 0;
    const grade = extractGrade(`${title} ${description}`);
    const certificationCompany = extractCertificationCompany(`${title} ${description}`);
    const identity = identityReview(input, title, description, grade, certificationCompany);
    const record: SpecialistMarketplaceRecord = {
      sourceId: 'weiss',
      provider: source.label,
      title: title || 'Untitled public Weiss lot',
      description: description || null,
      lotId: text(lot.number) || (lot.id != null ? String(lot.id) : null),
      auctionName: text(auction?.name) || null,
      url: publicWeissLotUrl(lot.auction_id, lot.id),
      imageUrl: canonicalUrl(text(lot.focal_media_file_url_thumb_image)) ?? null,
      saleStatus: completed ? 'completed' : 'unknown',
      completed,
      price: completed ? winningBid : null,
      currency: completed ? currency : null,
      date,
      grade,
      certificationCompany,
      priceBasis: completed ? 'realized' : 'unknown',
      buyerPremiumIncluded: completed ? false : null,
      winningBid: completed ? winningBid : null,
      buyerPremiumPercentage: null,
      identityMatched: identity.matched,
      matchedTokens: identity.matchedTokens,
      exclusionReason: !completed
        ? 'The public Weiss result did not provide completed lot and auction flags, completed date, positive final leading bid, and explicit USD currency together.'
        : !identity.matched
          ? identity.reason ?? 'Identity could not be confirmed.'
          : 'Context-only pending source-specific signed-admission validation.',
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
    messages: [`Weiss ran one public completed-lot title search capped at ${base.recordCap} candidates and received ${lots.length}. ${sales.length} passed deterministic completed-sale and identity checks. Displayed prices are the returned final hammer bids; buyer premium is not added. All records remain context-only and cannot affect valuation or the final AI conclusion.`],
  };
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
    query: buildGoldinSearchQuery(input),
    sales: [] as SpecialistMarketplaceRecord[],
    context: [] as SpecialistMarketplaceRecord[],
    requestUrl: GOLDIN_PUBLIC_SOLD_SEARCH_ENDPOINT,
    recordCap: SOURCE_RULES.goldin!.recordCap,
  };
  const records = lots.map((lot) => {
    const title = text(lot.title);
    // Goldin's public browser result contract supplies dollar-denominated
    // winning-bid amounts (for example, 425000 plus a 20% premium is 510000).
    const winningBid = numberValue(lot.current_price);
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
    messages: [`Goldin ran one anonymous public sold-lot title search capped at ${base.recordCap} candidates and received ${lots.length}. ${sales.length} passed deterministic completed-sale and identity checks. Goldin’s returned dollar winning bids were combined with the returned buyer-premium percentage for all-in context. All records remain context-only and cannot affect valuation or the final AI conclusion.`],
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
  const winningBid = numberValue(lot.final_price);
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
  const queries = buildGoldinSearchQueries(input);
  const query = queries[0] ?? '';
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
  const errors: string[] = [];
  for (const [index, candidateQuery] of queries.entries()) {
    const body = {
      search: {
        queryType: 'Highest_Bids',
        keyword: candidateQuery,
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
      if (!response.ok) {
        errors.push(`${candidateQuery}: HTTP ${response.status}`);
        continue;
      }
      if (!/json/i.test(response.headers.get('content-type') ?? '')) {
        errors.push(`${candidateQuery}: unsupported response type`);
        continue;
      }
      const payload = await response.json() as GoldinPublicSearchResponse;
      const returnedLots = Array.isArray(payload.searchalgolia?.lots) ? payload.searchalgolia!.lots : [];
      if (returnedLots.length === 0 && index < queries.length - 1) continue;
      const parsed = parseGoldinPublicSearchResponse(input, payload);
      return {
        ...parsed,
        query: queries.slice(0, index + 1).join(' → '),
        messages: [`Goldin checked ${index + 1} bounded query variant${index === 0 ? '' : 's'} and used “${candidateQuery}”${index === 0 ? '' : ' after stricter queries returned zero lots'}.`, ...parsed.messages, ...errors],
      };
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'TimeoutError';
      errors.push(`${candidateQuery}: ${timedOut ? 'timed out' : 'request failed'}`);
    }
  }
  return {
    ...empty,
    query: queries.join(' → '),
    status: 'error' as const,
    messages: [`Goldin checked ${queries.length} bounded query variants but returned no lots. No pagination, account access, or workaround was attempted.`, ...errors],
  };
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

async function lookupWeissPublicCompletedLots(input: SpecialistMarketplaceLookupInput): Promise<SpecialistMarketplaceLookupResult> {
  const source = getSandboxSpecialistSource('weiss')!;
  const query = text(input.title).slice(0, 240);
  const requestUrl = query ? buildWeissCompletedLotSearchUrl(query) : WEISS_PUBLIC_COMPLETED_LOTS_ENDPOINT;
  const empty = {
    source: 'weiss' as const,
    label: source.label,
    searchContract: source.searchContract,
    query,
    sales: [] as SpecialistMarketplaceRecord[],
    context: [] as SpecialistMarketplaceRecord[],
    requestUrl,
    recordCap: SOURCE_RULES.weiss!.recordCap,
  };
  if (!query) return { ...empty, status: 'setup_required' as const, messages: ['Weiss automatic search requires an item title.'] };
  try {
    const response = await fetch(requestUrl, {
      headers: { Accept: 'application/json', 'User-Agent': 'Tradebilia Sandbox Read-Only Specialist Adapter/1.0' },
      redirect: 'error',
      signal: AbortSignal.timeout(SPECIALIST_MARKETPLACE_TIMEOUT_MS),
    });
    if (!response.ok) return { ...empty, status: 'error' as const, messages: [`Weiss public completed-lot search returned HTTP ${response.status}; no retry, pagination, login, or workaround was attempted.`] };
    if (!isAllowedSourceUrl('weiss', response.url)) return { ...empty, status: 'error' as const, messages: ['Weiss public completed-lot search redirected outside the allowlisted contract; the response was not parsed.'] };
    if (!/json/i.test(response.headers.get('content-type') ?? '')) return { ...empty, status: 'error' as const, messages: ['Weiss public completed-lot search returned an unsupported response type; it was not parsed.'] };
    return parseWeissPublicSearchResponse(input, response.url, await response.json() as WeissPublicSearchResponse);
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    return { ...empty, status: 'error' as const, messages: [timedOut ? 'Weiss public completed-lot search timed out; no retry was attempted.' : 'Weiss public completed-lot search could not be reached; no access workaround was attempted.'] };
  }
}

function parseStephenAuctionPage(input: SpecialistMarketplaceLookupInput, html: string, requestUrl: string): SpecialistMarketplaceLookupResult {
  const source = getSandboxSpecialistSource('stephen_album')!;
  const dom = new JSDOM(html, { url: requestUrl });
  const document = dom.window.document;
  const records: SpecialistMarketplaceRecord[] = [];
  const pageDate = extractDate(text(document.body?.textContent));
  const auctionName = text(document.querySelector('h1')?.textContent) || text(document.title);
  for (const block of Array.from(document.querySelectorAll('.gridItem'))) {
    if (records.length >= SOURCE_RULES.stephen_album!.recordCap) break;
    const body = text(block.textContent);
    const title = text(block.querySelector('.gridView_title')?.textContent || block.querySelector('a[title]')?.getAttribute('title') || '');
    const href = block.querySelector('a[href*="_i"]')?.getAttribute('href');
    const url = href ? canonicalUrl(new URL(href, requestUrl).toString()) : null;
    const hammerData = extractStephenHammer(body);
    const completed = Boolean(hammerData && /bidding has concluded/i.test(body));
    const grade = extractGrade(`${title} ${body}`);
    const certificationCompany = extractCertificationCompany(`${title} ${body}`);
    const identity = identityReview(input, title, body, grade, certificationCompany);
    const image = block.querySelector('img[src]')?.getAttribute('src');
    records.push({ sourceId: 'stephen_album', provider: source.label, title: title || 'Untitled public Stephen Album lot', description: text(block.querySelector('.gridView_description')?.textContent) || null, lotId: url?.match(/_i(\d+)$/i)?.[1] ?? extractLotId(body, url), auctionName: auctionName || null, url, imageUrl: image ? canonicalUrl(new URL(image, requestUrl).toString()) : null, saleStatus: completed ? 'completed' : 'unknown', completed, price: completed ? hammerData!.hammer : null, currency: completed ? 'USD' : null, date: extractDate(body) ?? pageDate, grade, certificationCompany, priceBasis: 'realized', buyerPremiumIncluded: false, winningBid: completed ? hammerData!.hammer : null, buyerPremiumPercentage: completed ? hammerData!.premium : null, identityMatched: identity.matched, matchedTokens: identity.matchedTokens, exclusionReason: !completed ? 'The public Stephen Album lot did not expose SOLD status and a hammer-plus-premium breakdown.' : !identity.matched ? identity.reason ?? 'Identity could not be confirmed.' : 'Context-only pending source-specific signed-admission validation.', valuationEligible: false });
  }
  const capped = records.slice(0, SOURCE_RULES.stephen_album!.recordCap);
  const sales = capped.filter((record) => record.completed && record.identityMatched);
  return { source: 'stephen_album', label: source.label, searchContract: source.searchContract, query: input.title, sales, context: capped.filter((record) => !record.completed || !record.identityMatched), requestUrl, recordCap: SOURCE_RULES.stephen_album!.recordCap, status: 'success', messages: [`Stephen Album read one bounded completed auction page and found ${capped.length} candidate records; ${sales.length} passed deterministic SOLD, price, and identity checks. Hammer prices exclude buyer premium. All results remain context-only.`] };
}

async function lookupStephenAlbum(input: SpecialistMarketplaceLookupInput): Promise<SpecialistMarketplaceLookupResult> {
  const source = getSandboxSpecialistSource('stephen_album')!;
  const empty = { source: 'stephen_album' as const, label: source.label, searchContract: source.searchContract, query: input.title, sales: [] as SpecialistMarketplaceRecord[], context: [] as SpecialistMarketplaceRecord[], requestUrl: STEPHEN_ALBUM_COMPLETED_AUCTIONS_ENDPOINT, recordCap: SOURCE_RULES.stephen_album!.recordCap };
  try {
    const archive = await fetch(STEPHEN_ALBUM_COMPLETED_AUCTIONS_ENDPOINT, { headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'Tradebilia Sandbox Read-Only Specialist Adapter/1.0' }, redirect: 'error', signal: AbortSignal.timeout(SPECIALIST_MARKETPLACE_TIMEOUT_MS) });
    if (!archive.ok) return { ...empty, status: 'error', messages: [`Stephen Album archive returned HTTP ${archive.status}; no retry or workaround was attempted.`] };
    const dom = new JSDOM(await archive.text(), { url: archive.url });
    const auctionUrls = [...new Set(Array.from(dom.window.document.querySelectorAll('a[href]')).map((anchor) => canonicalUrl(new URL(anchor.getAttribute('href')!, archive.url).toString())).filter((url): url is string => Boolean(url && new URL(url).hostname.toLowerCase() === 'www.sarc.auction' && /_as\d+(?:_p\d+)?$/i.test(new URL(url).pathname))).map((url) => url.replace(/_p\d+$/i, '')))].slice(0, 8);
    const combined: SpecialistMarketplaceRecord[] = [];
    for (const auctionUrl of auctionUrls) {
      const response = await fetch(auctionUrl, { headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'Tradebilia Sandbox Read-Only Specialist Adapter/1.0' }, redirect: 'error', signal: AbortSignal.timeout(SPECIALIST_MARKETPLACE_TIMEOUT_MS) });
      if (!response.ok) continue;
      const parsed = parseStephenAuctionPage(input, await response.text(), response.url);
      combined.push(...parsed.sales, ...parsed.context);
    }
    const capped = combined.slice(0, SOURCE_RULES.stephen_album!.recordCap);
    const sales = capped.filter((record) => record.completed && record.identityMatched);
    return { ...empty, status: 'success', requestUrl: auctionUrls[0] ?? empty.requestUrl, sales, context: capped.filter((record) => !record.completed || !record.identityMatched), messages: [`Stephen Album searched ${auctionUrls.length} bounded completed auction pages and found ${capped.length} candidates; ${sales.length} passed deterministic identity checks. All results remain context-only.`] };
  } catch (error) {
    return { ...empty, status: 'error', messages: [error instanceof Error && error.name === 'TimeoutError' ? 'Stephen Album search timed out; no retry was attempted.' : 'Stephen Album search could not be reached; no access workaround was attempted.'] };
  }
}

function reefNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[$,]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function newReefApiAudit(): ReefApiAudit {
  return { apiCalls: 0, searchCalls: 0, detailCalls: 0, estimatedCredits: 0, creditBasis: 'one-credit-per-request' };
}

function applyHistoryWindow<T extends { date: string | null }>(records: T[], historyWindow: 'recent_12_months' | 'historical' | 'all'): T[] {
  if (historyWindow === 'all') return records;
  const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
  return records.filter((record) => {
    if (!record.date) return true;
    const timestamp = Date.parse(record.date);
    if (!Number.isFinite(timestamp)) return true;
    return historyWindow === 'recent_12_months' ? timestamp >= cutoff : timestamp < cutoff;
  });
}

function reefBase(sourceId: 'tcgplayer_reef' | 'catawiki_reef', input: SpecialistMarketplaceLookupInput, requestUrl: string) {
  const source = getSandboxSpecialistSource(sourceId)!;
  return {
    source: sourceId,
    label: source.label,
    searchContract: source.searchContract,
    query: text(input.title).slice(0, 180),
    sales: [] as SpecialistMarketplaceRecord[],
    context: [] as SpecialistMarketplaceRecord[],
    requestUrl,
    recordCap: SOURCE_RULES[sourceId]!.recordCap,
    historyWindow: input.historyWindow ?? 'recent_12_months',
    reefApiAudit: newReefApiAudit(),
  };
}

async function reefPost<T>(endpoint: string, body: Record<string, unknown>, audit: ReefApiAudit, kind: 'search' | 'detail'): Promise<T> {
  audit.apiCalls += 1;
  audit.estimatedCredits += 1;
  if (kind === 'search') audit.searchCalls += 1;
  else audit.detailCalls += 1;
  if (!ENV.reefApiKey) throw new Error('ReefAPI is not configured for this sandbox.');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-API-Key': ENV.reefApiKey },
    body: JSON.stringify(body),
    redirect: 'error',
    signal: AbortSignal.timeout(SPECIALIST_MARKETPLACE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`ReefAPI returned HTTP ${response.status}.`);
  const payload = await response.json() as { ok?: boolean; data?: T; error?: { message?: string } };
  if (!payload.ok || payload.data == null) throw new Error(payload.error?.message ?? 'ReefAPI returned no usable data.');
  return payload.data;
}

async function reefAuctionetDetail(lot: Record<string, unknown>, audit: ReefApiAudit): Promise<Record<string, unknown> | null> {
  const itemId = lot.item_id ?? lot.id ?? lot.lot_id;
  if (itemId == null || itemId === '') return null;
  try {
    return await reefPost<Record<string, unknown>>(`${REEF_API_BASE}/auctionet/v1/detail`, { item_id: itemId }, audit, 'detail');
  } catch {
    return null;
  }
}

type TcgSearchData = { results?: Array<Record<string, unknown>> };
type TcgSalesData = { product?: Record<string, unknown>; sales?: Array<Record<string, unknown>> };
type CataSearchData = { lots?: Array<Record<string, unknown>> };

function reefRecord(
  sourceId: 'tcgplayer_reef' | 'catawiki_reef',
  input: SpecialistMarketplaceLookupInput,
  fields: { title: string; description?: string; lotId?: string | null; url?: string | null; imageUrl?: string | null; date?: string | null; price?: number | null; currency?: string | null; completed: boolean; grade?: string | null; certificationCompany?: string | null; detail: string },
): SpecialistMarketplaceRecord {
  const identity = identityReview(input, fields.title, `${fields.title} ${fields.description ?? ''}`, fields.grade ?? null, fields.certificationCompany ?? null);
  const usdCompleted = fields.completed && fields.currency?.toUpperCase() === 'USD' && Boolean(fields.price);
  return {
    sourceId,
    provider: getSandboxSpecialistSource(sourceId)!.label,
    title: fields.title || 'Untitled ReefAPI record',
    description: fields.description?.slice(0, 2_000) ?? null,
    lotId: fields.lotId ?? null,
    auctionName: null,
    url: fields.url ?? null,
    imageUrl: fields.imageUrl ?? null,
    saleStatus: usdCompleted ? 'completed' : 'unknown',
    completed: usdCompleted,
    price: usdCompleted ? fields.price! : null,
    currency: usdCompleted ? 'USD' : null,
    date: fields.date ?? null,
    grade: fields.grade ?? null,
    certificationCompany: fields.certificationCompany ?? null,
    priceBasis: usdCompleted ? 'closed' : 'unknown',
    buyerPremiumIncluded: null,
    winningBid: usdCompleted ? fields.price! : null,
    buyerPremiumPercentage: null,
    identityMatched: identity.matched,
    matchedTokens: identity.matchedTokens,
    exclusionReason: !fields.completed
      ? fields.detail
      : fields.currency?.toUpperCase() !== 'USD'
        ? `Provider returned ${fields.currency ?? 'an unspecified currency'}; only explicit USD records are admitted. ${fields.detail}`
        : !fields.price
          ? 'Provider record did not include a positive completed-sale price.'
          : !identity.matched
            ? identity.reason ?? 'Identity could not be confirmed.'
            : 'Context-only pending source-specific signed-admission validation.',
    valuationEligible: false,
  };
}

async function lookupTcgplayerReef(input: SpecialistMarketplaceLookupInput): Promise<SpecialistMarketplaceLookupResult> {
  const empty = reefBase('tcgplayer_reef', input, TCGPLAYER_SEARCH_ENDPOINT);
  if (!empty.query) return { ...empty, status: 'setup_required', messages: ['TCGplayer search requires an item title.'] };
  try {
    const searched = await reefPost<TcgSearchData>(TCGPLAYER_SEARCH_ENDPOINT, { query: empty.query, per_page: empty.recordCap, page: 1, currency: 'USD' }, empty.reefApiAudit, 'search');
    const products = (searched.results ?? []).slice(0, 4);
    const records: SpecialistMarketplaceRecord[] = [];
    for (const product of products) {
      const productId = String(product.product_id ?? '');
      if (!productId) continue;
      const sales = await reefPost<TcgSalesData>(TCGPLAYER_SALES_ENDPOINT, { product_id: Number(productId), per_page: 5, currency: 'USD' }, empty.reefApiAudit, 'detail');
      for (const sale of (sales.sales ?? []).slice(0, 5)) {
        records.push(reefRecord('tcgplayer_reef', input, {
          title: text(sale.title) || text(product.name),
          description: `${text(product.set)}${product.condition ? ` · ${text(product.condition)}` : ''}`,
          lotId: `${productId}:${text(sale.sold_at)}`,
          url: text(product.url) || `https://www.tcgplayer.com/product/${productId}`,
          imageUrl: text(product.image) || null,
          date: text(sale.sold_at) || null,
          price: reefNumber(sale.price),
          currency: text(sale.currency || product.currency),
          completed: Boolean(text(sale.sold_at) && reefNumber(sale.price)),
          detail: 'This is a provider-confirmed TCGplayer sale record; active listing and market-price fields were not used.',
        }));
      }
    }
    const capped = applyHistoryWindow(records, empty.historyWindow).slice(0, empty.recordCap);
    const sales = capped.filter(record => record.completed && record.identityMatched);
    return { ...empty, status: 'success', sales, context: capped.filter(record => !record.completed || !record.identityMatched), messages: [`TCGplayer via ReefAPI searched ${products.length} bounded products and read ${capped.length} sale records in the ${empty.historyWindow.replace(/_/g, ' ')} window; ${sales.length} passed USD, price, and identity checks. Active listings and guide prices were excluded. All results remain context-only.`] };
  } catch (error) {
    return { ...empty, status: 'error', messages: [error instanceof Error ? error.message : 'TCGplayer ReefAPI lookup failed; no retry was attempted.'] };
  }
}

async function lookupCatawikiReef(input: SpecialistMarketplaceLookupInput): Promise<SpecialistMarketplaceLookupResult> {
  const empty = reefBase('catawiki_reef', input, CATAWIKI_SEARCH_ENDPOINT);
  if (!empty.query) return { ...empty, status: 'setup_required', messages: ['Catawiki search requires an item title.'] };
  try {
    const searched = await reefPost<CataSearchData>(CATAWIKI_SEARCH_ENDPOINT, { query: empty.query, currency: 'USD', per_page: empty.recordCap, page: 1, status: 'closed' }, empty.reefApiAudit, 'search');
    const records = applyHistoryWindow((searched.lots ?? []).slice(0, empty.recordCap).map((lot) => reefRecord('catawiki_reef', input, {
      title: text(lot.title),
      description: text(lot.subtitle),
      lotId: text(lot.lot_id) || null,
      url: text(lot.url) || null,
      imageUrl: text(lot.image) || null,
      date: text(lot.end_time) || null,
      price: reefNumber(lot.sold_price),
      currency: text(lot.currency),
      completed: ['closed', 'sold', 'ended'].includes(text(lot.status).toLowerCase()) && Boolean(lot.is_sold) && Boolean(reefNumber(lot.sold_price)),
      detail: ['open', 'open_now'].includes(text(lot.status).toLowerCase()) ? 'Provider returned an open/current-bid lot; it is not completed-sale evidence.' : 'Provider did not return an explicit sold lot with a positive sold_price.',
    })), empty.historyWindow);
    const sales = records.filter(record => record.completed && record.identityMatched);
    return { ...empty, status: 'success', sales, context: records.filter(record => !record.completed || !record.identityMatched), messages: [`Catawiki via ReefAPI returned ${records.length} bounded lot records in the ${empty.historyWindow.replace(/_/g, ' ')} window; ${sales.length} had explicit USD sold prices and passed identity checks. Open/current-bid lots were retained only as context. All results remain context-only.`] };
  } catch (error) {
    return { ...empty, status: 'error', messages: [error instanceof Error ? error.message : 'Catawiki ReefAPI lookup failed; no retry was attempted.'] };
  }
}

async function lookupAuctionet(input: SpecialistMarketplaceLookupInput): Promise<SpecialistMarketplaceLookupResult> {
  const historyWindow = input.historyWindow ?? 'recent_12_months';
  const empty = { source: 'auctionet' as const, label: getSandboxSpecialistSource('auctionet')!.label, searchContract: 'automatic_title_search' as const, query: text(input.title), sales: [] as SpecialistMarketplaceRecord[], context: [] as SpecialistMarketplaceRecord[], requestUrl: AUCTIONET_SEARCH_ENDPOINT, recordCap: SOURCE_RULES.auctionet!.recordCap, historyWindow, reefApiAudit: newReefApiAudit() };
  if (!empty.query) return { ...empty, status: 'setup_required', messages: ['Auctionet search requires an item title.'] };
  try {
    const data = await reefPost<{ results?: Array<Record<string, unknown>> }>(AUCTIONET_SEARCH_ENDPOINT, { query: empty.query, status: 'ended', sort: historyWindow === 'historical' ? 'sold_only_historical' : 'sold_only_recent', page: 1, max_results: empty.recordCap, locale: 'en' }, empty.reefApiAudit, 'search');
    const searchLots = (data.results ?? []).slice(0, empty.recordCap);
    const detailedLots = await Promise.all(searchLots.map((lot) => reefAuctionetDetail(lot, empty.reefApiAudit)));
    const records = searchLots.map((searchLot, index) => {
      const lot = detailedLots[index] ?? { ...searchLot, status: 'detail_unverified', is_sold: false };
      const title = text(lot.title);
      const price = reefNumber(lot.final_bid);
      const sold = Boolean(lot.is_sold) && text(lot.status).toLowerCase() === 'ended' && Boolean(price);
      const currency = text(lot.currency).toUpperCase() || null;
      const identity = identityReview(input, title, `${title} ${text(lot.description)} ${text(lot.category)}`, extractGrade(title), extractCertificationCompany(title));
      const admitted = sold && currency === 'USD';
      return { sourceId: 'auctionet' as const, provider: getSandboxSpecialistSource('auctionet')!.label, title: title || 'Untitled Auctionet record', description: text(lot.description) || null, lotId: text(lot.item_id) || null, auctionName: text(lot.house) || null, url: text(lot.url) || null, imageUrl: text(lot.thumbnail) || (Array.isArray(lot.images) ? text(lot.images[0]) : null), saleStatus: admitted ? 'completed' as const : 'unknown' as const, completed: admitted, price: admitted ? price : null, currency: admitted ? 'USD' as const : null, date: text(lot.ends_at) || null, grade: extractGrade(title), certificationCompany: extractCertificationCompany(title), priceBasis: admitted ? 'closed' as const : 'unknown' as const, buyerPremiumIncluded: null, winningBid: admitted ? price : null, buyerPremiumPercentage: null, identityMatched: identity.matched, matchedTokens: identity.matchedTokens, exclusionReason: !sold ? 'ReefAPI did not return an explicit sold Auctionet ended lot with a positive final_bid.' : currency !== 'USD' ? `Auctionet returned ${currency}; ReefAPI documents that amounts remain in each lot currency, so non-USD records are not admitted.` : !identity.matched ? identity.reason ?? 'Identity could not be confirmed.' : 'Context-only pending buyer-premium and source-specific signed-admission validation.', valuationEligible: false as const };
    }).filter((record) => applyHistoryWindow([record], historyWindow).length > 0);
    const sales = records.filter(record => record.completed && record.identityMatched);
    return { ...empty, status: 'success', sales, context: records.filter(record => !record.completed || !record.identityMatched), messages: [`Auctionet via ReefAPI searched one bounded ended-auction page using the ${historyWindow.replace(/_/g, ' ')} window and returned ${records.length} lots; ${sales.length} passed sold, USD, and identity checks. ReefAPI does not convert currencies, and buyer-premium treatment remains unresolved, so all results remain context-only.`] };
  } catch (error) {
    return { ...empty, status: 'error', messages: [error instanceof Error ? error.message : 'Auctionet ReefAPI lookup failed; no retry was attempted.'] };
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
  if (input.sourceId === 'weiss') return lookupWeissPublicCompletedLots(input);
  if (input.sourceId === 'stephen_album') return lookupStephenAlbum(input);
  if (input.sourceId === 'tcgplayer_reef') return lookupTcgplayerReef(input);
  if (input.sourceId === 'catawiki_reef') return lookupCatawikiReef(input);
  if (input.sourceId === 'auctionet') return lookupAuctionet(input);
  if (input.sourceId === 'comic_book_realm') {
    try {
      const fetchPage = (url: string) => fetch(url, { headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'Tradebilia Sandbox Read-Only Specialist Adapter/1.0' }, redirect: 'follow', signal: AbortSignal.timeout(SPECIALIST_MARKETPLACE_TIMEOUT_MS) });
      const searchResponse = await fetchPage(request.url!);
      if (!searchResponse.ok) return { ...empty, status: 'error', messages: [`${source.label} search returned HTTP ${searchResponse.status}; no retry or access workaround was attempted.`] };
      if (!isAllowedSourceUrl(input.sourceId, searchResponse.url)) return { ...empty, status: 'error', messages: [`${source.label} search redirected outside the allowlisted public contract; the response was not parsed.`] };
      const searchHtml = await searchResponse.text();
      const issueUrl = text(input.sourceUrl) && isAllowedSourceUrl(input.sourceId, request.url!)
        ? request.url!
        : resolveComicBookRealmAnalyzerUrl(searchHtml, input, searchResponse.url);
      if (!issueUrl) return { ...empty, status: 'error', messages: [`${source.label} found no exact public CGC Analyzer issue page for “${comicBookRealmSearchQuery(input)}”. Facsimiles, variants, and foreign editions were excluded.`] };
      const issueResponse = issueUrl === searchResponse.url ? searchResponse : await fetchPage(issueUrl);
      if (!issueResponse.ok) return { ...empty, status: 'error', messages: [`${source.label} issue page returned HTTP ${issueResponse.status}; no retry or access workaround was attempted.`] };
      if (!isAllowedSourceUrl(input.sourceId, issueResponse.url) || !/\/comic\/id\//i.test(issueResponse.url)) return { ...empty, status: 'error', messages: [`${source.label} did not resolve to an allowlisted public issue page; the response was not parsed.`] };
      return parseComicBookRealmCgcAnalyzerHtml(issueResponse === searchResponse ? searchHtml : await issueResponse.text(), input, issueResponse.url);
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'TimeoutError';
      return { ...empty, status: 'error', messages: [timedOut ? `${source.label} timed out; no retry was attempted.` : `${source.label} could not be reached; no access workaround was attempted.`] };
    }
  }
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
