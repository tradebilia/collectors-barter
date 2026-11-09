import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ComparableTarget } from './testAiComparableEngine';
import { mapNumistaGuideGradeBand, normalizeGuideGrade, type GuideValueAnchor } from '../shared/testAiEvidenceNormalization';
import { parseTestAiDetails, resolveTestAiGradingCompany } from '../shared/testAiCriteria';
import { selectExactPriceChartingCoinGuide } from '../shared/priceChartingCoinGuide';
import type { NumistaLookup } from './numistaMetadata';
import { OBSERVATION_TOKEN_MAX_AGE_MS, sealCanonicalObservation } from './testAiCanonicalObservation';

export const GUIDE_PROVENANCE_VERSION = 'coin-guide-v1';
export const GUIDE_TOKEN_MAX_AGE_MS = OBSERVATION_TOKEN_MAX_AGE_MS;

type GuideOptions = { signingKey?: string; now?: Date };
export type GuideProviderIdentity = {
  title: string;
  country: string;
  denomination: string;
  year: string;
  mintMark: string;
  variety: string;
  form: string;
  strike?: string;
  designation?: string;
};
/** Server-acquired facts only. No route accepts this object or a price from the browser. */
export type GuideAcquisition = {
  sourceId: 'pricecharting' | 'numista';
  sourceQuery: string;
  sourceRecordId: string;
  currency: string;
  providerIdentity: GuideProviderIdentity;
  acquiredAt?: Date;
};

type BoundIdentity = GuideProviderIdentity & {
  category: string;
  grade: string;
  certificationCompany: string;
  condition: string;
  metal: string;
};
type SignedGuidePayload = {
  version: typeof GUIDE_PROVENANCE_VERSION;
  target: BoundIdentity;
  providerIdentity: GuideProviderIdentity;
  anchor: Omit<GuideValueAnchor, 'provenanceToken'>;
};
const verifiedGuides = new WeakMap<object, { fingerprint: string; retrievedAt: number; expiresAt: number }>();

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}
function words(value: unknown): string {
  return text(value).normalize('NFKC').toLowerCase().replace(/\s+/g, ' ');
}
function key(value: unknown): string {
  return words(value).replace(/[\s/-]+/g, '_');
}
function first(details: Record<string, unknown>, aliases: string[]): string {
  for (const alias of aliases) if (text(details[alias])) return text(details[alias]);
  return '';
}
function country(value: unknown): string {
  const normalized = words(value);
  return /^(?:us|u\.s\.|usa|united states(?: of america)?)$/.test(normalized) ? 'united states' : normalized;
}
function denomination(value: unknown, issuer: string): string {
  const normalized = words(value);
  if (issuer !== 'united states') return normalized;
  if (/^(?:\$?1(?:\.0+)?|1 dollars?|one dollar)$/.test(normalized)) return '1 dollar';
  if (/^(?:\$?0?\.10|10c|10 cents?|1 dime|dime)$/.test(normalized)) return '1 dime';
  if (/^(?:\$?0?\.50|50c|50 cents?|1\/2 dollars?|half dollar|½ dollars?)$/.test(normalized)) return '1/2 dollar';
  if (/^(?:\$?0?\.01|1c|1 cents?|penny)$/.test(normalized)) return '1 cent';
  if (/^(?:\$?0?\.05|5c|5 cents?|nickel)$/.test(normalized)) return '5 cents';
  if (/^(?:\$?0?\.25|25c|25 cents?|quarter)$/.test(normalized)) return '25 cents';
  return normalized;
}
function mint(value: unknown): string {
  const normalized = words(value);
  const aliases: Record<string, string> = {
    '': '', 'no mint mark': '', philadelphia: '', 'carson city': 'cc',
    'new orleans': 'o', 'san francisco': 's', denver: 'd', 'west point': 'w',
  };
  return aliases[normalized] ?? normalized;
}
function usableGrade(value: unknown): string {
  return /^(?:ungraded|not[\s_-]*graded|none|n\/a|0+(?:\.0+)?)$/i.test(text(value)) ? '' : text(value);
}
function targetIdentity(target: ComparableTarget): BoundIdentity {
  const details = parseTestAiDetails(target.itemDetails);
  const issuer = country(first(details, ['country', 'issuingCountry', 'issuer']));
  const declaredGrade = usableGrade(target.grade) || usableGrade(first(details, ['grade', 'certifiedGrade']));
  return {
    title: words(target.title), category: key(target.category),
    country: issuer, denomination: denomination(first(details, ['denomination', 'faceValue', 'value']), issuer),
    year: first(details, ['year', 'issueYear', 'mintYear']),
    mintMark: mint(first(details, ['mintMark', 'mint', 'mintmark'])),
    variety: words(first(details, ['variety', 'varietyName', 'coinType', 'series', 'design', 'type', 'coinName'])),
    form: key(target.itemType || first(details, ['itemType', 'coinForm', 'form']) || 'single_coin'),
    strike: words(first(details, ['strike', 'strikeType'])), designation: words(first(details, ['designation', 'qualifier'])),
    grade: normalizeGuideGrade(declaredGrade || target.condition || first(details, ['condition'])),
    certificationCompany: words(resolveTestAiGradingCompany(details, target.certificationCompany || first(details, ['certificationCompany', 'gradingCompany', 'grader']))),
    condition: declaredGrade ? '' : normalizeGuideGrade(target.condition || first(details, ['condition'])),
    metal: words(first(details, ['metal', 'composition'])),
  };
}
function normalizeProvider(identity: GuideProviderIdentity): GuideProviderIdentity {
  const issuer = country(identity.country);
  return {
    title: words(identity.title), country: issuer, denomination: denomination(identity.denomination, issuer),
    year: text(identity.year), mintMark: mint(identity.mintMark), variety: words(identity.variety),
    form: key(identity.form), strike: words(identity.strike), designation: words(identity.designation),
  };
}
function fingerprint(identity: BoundIdentity): string { return JSON.stringify(identity); }
function identityWarnings(target: ComparableTarget, bound: BoundIdentity): string[] {
  const warnings: string[] = [];
  if (bound.category !== 'coins') warnings.push('Guide fallback is allowed for Coins only.');
  if (!bound.title || !bound.country || !bound.denomination || !/^(?:17|18|19|20)\d{2}$/.test(bound.year) || !bound.variety || !bound.grade) {
    warnings.push('Guide fallback requires bound coin title, country, denomination, year, variety and grade.');
  }
  if (bound.form !== 'single_coin' || /\b(?:set|collection|lot|roll|bag|banknote|replica|reproduction|pattern|medal|token)\b/i.test(bound.title)) {
    warnings.push('Guide fallback does not support this coin form.');
  }
  const titleYear = bound.title.match(/\b(?:17|18|19|20)\d{2}\b/)?.[0];
  if (titleYear && titleYear !== bound.year) warnings.push('Coin title and structured year conflict.');
  const titleMintToken = bound.title.match(new RegExp(`\\b${bound.year}\\s*[-–]?\\s*(CC|S|O|D|W|P)\\b`, 'i'))?.[1];
  const explicitNoMint = /\b(?:no mint mark|philadelphia)\b/.test(bound.title);
  if ((titleMintToken && mint(titleMintToken) !== bound.mintMark) || (explicitNoMint && bound.mintMark)) {
    warnings.push('Coin title and structured mint conflict.');
  }
  // A fallback quote must identify the same named variety, not merely a year
  // and denomination. Generic denomination/form words are not variety names.
  const namedVariety = bound.variety.replace(/\b(?:coins?|dollars?|cents?|penny|dime|nickel|quarter|half)\b/g, ' ').trim();
  if (namedVariety && !includesPhrase(bound.title, namedVariety)) warnings.push('Coin title does not confirm the structured named variety.');
  const titleDenomination = usdDenominationFromCoinName(bound.title);
  if (bound.country === 'united states' && titleDenomination && titleDenomination !== bound.denomination) warnings.push('Coin title and structured denomination conflict.');
  const gradeDesignation = bound.grade.match(/\d\+?(DCAM|CAM|DMPL|PL|FB|FS|RD|RB|BN)$/)?.[1] ?? '';
  if (gradeDesignation && bound.designation && gradeDesignation !== normalizeGuideGrade(bound.designation)) warnings.push('Coin structured grade and designation conflict.');
  for (const designation of bound.title.match(/\b(?:DCAM|CAM|DMPL|PL|FB|FS|RD|RB|BN)\b/gi) ?? []) {
    const qualifier = normalizeGuideGrade(designation);
    if (gradeDesignation !== qualifier && normalizeGuideGrade(bound.designation) !== qualifier) warnings.push('Coin title contains an unconfirmed meaningful designation.');
  }
  const titleGrade = text(target.title).match(/\b(?:MS|PR|PF|SP|AU|XF|VF|VG|AG|FR|PO|F|G)\s*[-_]?\s*\d+(?:\.\d+)?\+?(?:\s*(?:DCAM|CAM|DMPL|PL|FB|FS|RD|RB|BN))?(?=$|[^A-Z0-9+])/i)?.[0];
  if (titleGrade && normalizeGuideGrade(titleGrade) !== bound.grade && normalizeGuideGrade(titleGrade) !== normalizeGuideGrade(`${bound.grade}${bound.designation || ''}`)) warnings.push('Coin title and declared grade conflict.');
  const titleGrader = words(text(target.title).match(/\b(?:PCGS|NGC|ANACS|ICG)\b/i)?.[0]);
  if (titleGrader && bound.certificationCompany && titleGrader !== bound.certificationCompany) warnings.push('Coin title and declared grader conflict.');
  const details = parseTestAiDetails(target.itemDetails);
  const detailGrade = usableGrade(first(details, ['grade', 'certifiedGrade']));
  if (usableGrade(target.grade) && detailGrade && normalizeGuideGrade(target.grade) !== normalizeGuideGrade(detailGrade)) {
    warnings.push('Coin structured and declared grades conflict.');
  }
  return warnings;
}
function compatibilityWarnings(bound: BoundIdentity, provider: GuideProviderIdentity): string[] {
  const warnings: string[] = [];
  for (const field of ['country', 'denomination', 'year', 'mintMark', 'variety', 'form'] as const) {
    if (bound[field] !== provider[field]) warnings.push(`Provider coin ${field} is incompatible with the target.`);
  }
  if (!provider.title) warnings.push('Provider coin identity is missing.');
  for (const field of ['strike', 'designation'] as const) {
    if ((bound[field] || provider[field]) && bound[field] !== provider[field]) warnings.push(`Provider does not confirm the required coin ${field}.`);
  }
  return warnings;
}
function gradeWarnings(anchor: GuideValueAnchor, bound: BoundIdentity): string[] {
  if (normalizeGuideGrade(anchor.selectedGrade) !== bound.grade) return ['Guide selected grade does not match the target.'];
  const grade = normalizeGuideGrade(anchor.grade);
  if (anchor.sourceId === 'pricecharting') {
    if (anchor.matchType !== 'exact' || grade !== bound.grade || !/^(?:MS|PR|PF|SP|AU|XF|VF|F|VG|G|FR|PO)\d{1,3}(?:\+)?(?:[A-Z]+)?$/.test(grade)) {
      return ['PriceCharting coin guide requires the exact meaningful certified grade.'];
    }
  } else if (anchor.sourceId === 'numista') {
    if (anchor.matchType === 'exact' && grade === bound.grade) return [];
    // The existing Numista mapper removes qualifiers; reject them BEFORE mapping.
    const unqualified = /^(?:[A-Z]+\d{1,3}|VERYGOOD|NEARMINT)$/.test(bound.grade);
    if (anchor.matchType !== 'mapped' || !unqualified || mapNumistaGuideGradeBand(bound.grade) !== grade) {
      return ['Numista guide requires an exact grade or its documented unqualified grade-band mapping.'];
    }
  } else return ['This source is context-only, not an allowed Coin fallback guide.'];
  return [];
}

/**
 * Reuse the existing server-owned key WITHOUT exposing it or changing sale
 * signing. Its fixed context-only domain marker is never returned or admitted
 * as a sale. Only the marker HMAC is used as a domain-separated guide key.
 */
function signingKey(override?: string): string | null {
  const sealed = sealCanonicalObservation('comic_book_realm', {
    title: 'Test AI coin-guide signing domain v1 (not a sale)', currency: 'USD',
    saleStatus: 'unknown', priceBasis: 'unknown',
  }, { signingKey: override, acquiredAt: new Date(0), query: GUIDE_PROVENANCE_VERSION });
  return sealed.provenanceToken?.split('.')[1] ?? null;
}
function signature(encoded: string, keyValue: string): string {
  return createHmac('sha256', keyValue).update(`${GUIDE_PROVENANCE_VERSION}:${encoded}`, 'utf8').digest('base64url');
}
function signaturesMatch(expected: string, received: string): boolean {
  const left = Buffer.from(expected), right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
}
function brand(anchor: GuideValueAnchor, bound: BoundIdentity): GuideValueAnchor {
  const frozen = Object.freeze(anchor);
  verifiedGuides.set(frozen, { fingerprint: fingerprint(bound), retrievedAt: Date.parse(anchor.retrievedAt!), expiresAt: Date.parse(anchor.expiresAt!) });
  return frozen;
}

/** Issuance boundary for existing server lookup wrappers and explicit synthetic fixtures. */
export function issueGuideAnchor(
  anchor: GuideValueAnchor,
  target: ComparableTarget,
  acquisition: GuideAcquisition,
  options?: GuideOptions,
): { guideAnchor: GuideValueAnchor | null; warnings: string[] } {
  const bound = targetIdentity(target);
  const provider = normalizeProvider(acquisition.providerIdentity);
  const now = options?.now ?? new Date();
  const acquiredAt = acquisition.acquiredAt ?? now;
  const warnings = [...identityWarnings(target, bound), ...compatibilityWarnings(bound, provider), ...gradeWarnings(anchor, bound)];
  if (anchor.sourceId !== acquisition.sourceId) warnings.push('Guide source does not match its server acquisition path.');
  if (text(acquisition.currency).toUpperCase() !== 'USD' || (anchor.currency && anchor.currency.toUpperCase() !== 'USD')) warnings.push('Guide fallback requires a provider-documented USD value.');
  if (!Number.isFinite(anchor.value) || anchor.value <= 0 || anchor.value > 10_000_000) warnings.push('Guide value must be finite and positive.');
  if (!text(acquisition.sourceQuery) || !text(acquisition.sourceRecordId)) warnings.push('Guide source query and provider record identity are required.');
  if (!Number.isFinite(now.getTime()) || !Number.isFinite(acquiredAt.getTime()) || acquiredAt.getTime() > now.getTime() || now.getTime() >= acquiredAt.getTime() + GUIDE_TOKEN_MAX_AGE_MS) warnings.push('Guide retrieval time is invalid or expired.');
  if (warnings.length) return { guideAnchor: null, warnings: [...new Set(warnings)] };
  const keyValue = signingKey(options?.signingKey);
  if (!keyValue) return { guideAnchor: null, warnings: ['Server guide signing is unavailable.'] };
  const facts: Omit<GuideValueAnchor, 'provenanceToken'> = {
    sourceId: acquisition.sourceId,
    sourceLabel: acquisition.sourceId === 'pricecharting' ? 'PriceCharting Coin Guide' : 'Numista Coin Catalog',
    grade: normalizeGuideGrade(anchor.grade), selectedGrade: bound.grade, matchType: anchor.matchType,
    value: anchor.value, recordedSales: null, lastSaleDate: null, totalRecordedSales: null,
    currency: 'USD', retrievedAt: acquiredAt.toISOString(),
    expiresAt: new Date(acquiredAt.getTime() + GUIDE_TOKEN_MAX_AGE_MS).toISOString(),
    sourceQuery: text(acquisition.sourceQuery), sourceRecordId: text(acquisition.sourceRecordId), form: bound.form,
  };
  const payload: SignedGuidePayload = { version: GUIDE_PROVENANCE_VERSION, target: bound, providerIdentity: provider, anchor: facts };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return { guideAnchor: brand({ ...facts, provenanceToken: `${encoded}.${signature(encoded, keyValue)}` }, bound), warnings: [] };
}

/** Brand cannot survive serialization, copying, a different target, or expiry. */
export function isVerifiedGuideAnchor(value: unknown, target?: ComparableTarget, now: Date = new Date()): boolean {
  if (!value || typeof value !== 'object') return false;
  const verified = verifiedGuides.get(value);
  return Boolean(verified && Number.isFinite(now.getTime()) && now.getTime() >= verified.retrievedAt && now.getTime() < verified.expiresAt
    && (!target || verified.fingerprint === fingerprint(targetIdentity(target))));
}

/** Verify and reconstruct only signed source facts; never honor serialized trust flags. */
export function verifyGuideAnchors(
  anchors: GuideValueAnchor[],
  target: ComparableTarget,
  options?: GuideOptions,
): { trustedAnchors: GuideValueAnchor[]; warnings: string[] } {
  const trustedAnchors: GuideValueAnchor[] = [], warnings: string[] = [];
  if (!anchors.length) return { trustedAnchors, warnings };
  const bound = targetIdentity(target), now = options?.now ?? new Date();
  const targetWarnings = identityWarnings(target, bound);
  if (targetWarnings.length) return { trustedAnchors, warnings: targetWarnings };
  const keyValue = signingKey(options?.signingKey);
  const warn = (reason: string) => warnings.push(reason);
  for (const candidate of anchors) {
    if (!candidate || typeof candidate !== 'object') { warn('Guide observation is invalid.'); continue; }
    const token = candidate.provenanceToken;
    if (!keyValue || typeof token !== 'string' || token.length > 16_000) { warn('Guide provenance is missing or signing is unavailable.'); continue; }
    const [encoded, received, ...rest] = token.split('.');
    if (!encoded || !received || rest.length || !signaturesMatch(signature(encoded, keyValue), received)) { warn('Guide provenance signature is invalid.'); continue; }
    try {
      const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SignedGuidePayload;
      if (payload.version !== GUIDE_PROVENANCE_VERSION || !payload.anchor || !payload.target || !payload.providerIdentity) { warn('Guide provenance contract is invalid.'); continue; }
      if (fingerprint(payload.target) !== fingerprint(bound)) { warn('Guide proof is bound to a different target identity, grade or form.'); continue; }
      const facts = payload.anchor;
      const retrievedAt = Date.parse(facts.retrievedAt ?? ''), expiresAt = Date.parse(facts.expiresAt ?? '');
      if (!Number.isFinite(now.getTime()) || !Number.isFinite(retrievedAt) || !Number.isFinite(expiresAt) || retrievedAt > now.getTime() || now.getTime() >= expiresAt || expiresAt - retrievedAt !== GUIDE_TOKEN_MAX_AGE_MS) { warn('Guide provenance has expired or has an invalid retrieval time.'); continue; }
      const fields = ['sourceId', 'sourceLabel', 'grade', 'selectedGrade', 'matchType', 'value', 'currency', 'retrievedAt', 'expiresAt', 'sourceQuery', 'sourceRecordId', 'form', 'recordedSales', 'lastSaleDate', 'totalRecordedSales'] as const;
      if (fields.some((field) => field === 'grade' || field === 'selectedGrade'
        ? normalizeGuideGrade(candidate[field]) !== normalizeGuideGrade(facts[field])
        : candidate[field] !== facts[field])) { warn('Guide observation was altered from its server-issued facts.'); continue; }
      if (facts.currency !== 'USD' || !Number.isFinite(facts.value) || facts.value <= 0 || facts.value > 10_000_000 || !facts.sourceQuery || !facts.sourceRecordId || facts.form !== 'single_coin') { warn('Guide signed financial or form facts are invalid.'); continue; }
      const applicabilityWarnings = [...gradeWarnings(facts, bound), ...compatibilityWarnings(bound, payload.providerIdentity)];
      if (applicabilityWarnings.length) { warnings.push(...applicabilityWarnings); continue; }
      trustedAnchors.push(brand({ ...facts, provenanceToken: token }, bound));
    } catch { warn('Guide provenance payload is unreadable or invalid.'); }
  }
  return { trustedAnchors, warnings: [...new Set(warnings)] };
}

function includesPhrase(haystack: string, needle: string): boolean {
  const tokens = words(needle).replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  const observed = ` ${words(haystack).replace(/[^a-z0-9]+/g, ' ')} `;
  return tokens.length > 0 && tokens.every((token) => observed.includes(` ${token} `));
}
function usdDenominationFromCoinName(name: string): string {
  const normalized = words(name);
  if (/\b(?:half dollar|half-dollar|50 cents?)\b/.test(normalized)) return '1/2 dollar';
  if (/\b(?:quarter|25 cents?)\b/.test(normalized)) return '25 cents';
  if (/\b(?:dime|10 cents?)\b/.test(normalized)) return '1 dime';
  if (/\b(?:nickel|5 cents?)\b/.test(normalized)) return '5 cents';
  if (/\b(?:cent|penny)\b/.test(normalized)) return '1 cent';
  const amount = normalized.match(/\b(\d+)\s+dollars?\b/)?.[1];
  if (amount) return `${Number(amount)} ${Number(amount) === 1 ? 'dollar' : 'dollars'}`;
  if (/\b(?:dollar|silver eagle)\b/.test(normalized)) return '1 dollar';
  return '';
}
function titleMint(name: string, year: string): string {
  return mint(name.match(new RegExp(`\\b${year}\\s*[-–]?\\s*([A-Za-z]{1,3})\\b`))?.[1] ?? '');
}
function emptyQuote(reason: string): { guideAnchor: null; guideWarnings: string[] } {
  return { guideAnchor: null, guideWarnings: [reason] };
}

function exactPriceChartingGuide(target: ComparableTarget, prices: unknown) {
  const existing = selectExactPriceChartingCoinGuide({ category: target.category, grade: target.grade, prices });
  if (existing) return existing;
  // The existing selector rejects plus-designation keys outright. Preserve its
  // strict equality contract while admitting an explicitly returned exact key,
  // never downgrading MS65+ to MS65 or removing a meaningful qualifier.
  const grade = normalizeGuideGrade(target.grade);
  if (key(target.category) !== 'coins' || !/^(?:MS|PR|PF|SP|AU|XF|VF|F|VG|G|FR|PO)\d{1,3}\+?(?:[A-Z]+)?$/.test(grade)
    || !prices || typeof prices !== 'object' || Array.isArray(prices)) return null;
  for (const [candidateGrade, rawValue] of Object.entries(prices as Record<string, unknown>)) {
    if (normalizeGuideGrade(candidateGrade) !== grade || (typeof rawValue !== 'number' && typeof rawValue !== 'string')) continue;
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value <= 0 || value > 10_000_000) return null;
    return { grade, selectedGrade: grade, matchType: 'exact' as const, value: Math.round(value * 100) / 100 };
  }
  return null;
}

/** Pure return wrapper: no acquisition, query construction, or provider calls. */
export function priceChartingCoinGuideQuote(
  result: { status: string; query?: string; data?: { name?: unknown; set?: unknown; year?: unknown; mint?: unknown; url?: unknown; prices?: unknown; source?: unknown; currency?: unknown } | null },
  target: ComparableTarget,
  search: { year: string; variety: string; mintMark?: string },
  options?: GuideOptions,
): { guideAnchor: GuideValueAnchor | null; guideWarnings: string[] } {
  if (result.status !== 'success' || !result.data) return emptyQuote('No provider-valid PriceCharting coin guide was returned.');
  const bound = targetIdentity(target), data = result.data;
  if (data.source !== 'US coin price-guide context' || (text(data.currency) && text(data.currency).toUpperCase() !== 'USD')) {
    return emptyQuote('Only the existing USD US-coin PriceCharting acquisition path may issue a guide.');
  }
  // Keep the existing provider query contract: metadata only scopes admission.
  if (bound.country !== 'united states' || bound.year !== search.year || bound.variety !== words(search.variety) || bound.mintMark !== mint(search.mintMark)) {
    return emptyQuote('PriceCharting coin search is not bound to the same US coin target.');
  }
  const providerTitle = [text(data.name), text(data.set)].filter(Boolean).join(' ');
  const returnedYear = text(data.year).match(/\b(?:17|18|19|20)\d{2}\b/)?.[0]
    ?? providerTitle.match(/\b(?:17|18|19|20)\d{2}\b/)?.[0] ?? '';
  if (!includesPhrase(providerTitle, bound.variety) || returnedYear !== bound.year
    || titleMint(providerTitle, bound.year) !== bound.mintMark
    || (text(data.mint) && mint(data.mint) !== bound.mintMark)) {
    return emptyQuote('PriceCharting returned an incompatible coin identity.');
  }
  const selected = exactPriceChartingGuide(target, data.prices);
  if (!selected) return emptyQuote('No exact meaningful PriceCharting certified-grade quote was returned.');
  const issued = issueGuideAnchor({
    sourceId: 'pricecharting', sourceLabel: 'PriceCharting Coin Guide', ...selected,
    recordedSales: null, lastSaleDate: null, totalRecordedSales: null,
  }, target, {
    sourceId: 'pricecharting', sourceQuery: text(result.query), sourceRecordId: text(data.url) || providerTitle,
    // This existing acquisition path is explicitly the US-coin USD price guide;
    // it does not convert currency or infer currency from browser metadata.
    currency: 'USD', providerIdentity: {
      title: providerTitle, country: 'United States', denomination: usdDenominationFromCoinName(providerTitle),
      year: returnedYear, mintMark: titleMint(providerTitle, bound.year), variety: bound.variety,
      form: /\b(?:set|lot|roll|bag|replica|pattern|medal|token)\b/i.test(providerTitle) ? 'unsupported' : 'single_coin',
      strike: includesPhrase(providerTitle, bound.strike ?? '') ? bound.strike : '',
      designation: includesPhrase(providerTitle, bound.designation ?? '') ? bound.designation : '',
    },
  }, options);
  return { guideAnchor: issued.guideAnchor, guideWarnings: issued.warnings };
}

/** Pure return wrapper around Numista's existing issue-scoped USD acquisition. */
export function numistaCoinGuideQuote(
  result: NumistaLookup,
  target: ComparableTarget,
  options?: GuideOptions,
): { guideAnchor: GuideValueAnchor | null; guideWarnings: string[] } {
  if (result.status !== 'success' || !result.data || !result.data.guideValue || !result.data.guideIssueId) {
    return emptyQuote('No provider-valid issue-scoped Numista USD guide was returned.');
  }
  const data = result.data, bound = targetIdentity(target);
  const facts = (label: string) => text(data.facts.find((fact) => words(fact.label) === words(label))?.value);
  const providerText = [data.title, ...data.facts.map((fact) => fact.value)].join(' ');
  const yearFacts = facts('Year');
  const range = yearFacts.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
  const yearConfirmed = yearFacts === bound.year || Boolean(range && Number(bound.year) >= Number(range[1]) && Number(bound.year) <= Number(range[2]));
  if (!yearConfirmed || !includesPhrase(providerText, bound.variety)) {
    return emptyQuote('Numista does not confirm the target coin year and variety.');
  }
  // Catalogue type titles and requested selectors do not establish the mint of
  // the selected issue. Bind only the existing acquisition's raw issue facts.
  if (data.guideIssueYear == null || String(data.guideIssueYear) !== bound.year
    || typeof data.guideIssueMintMark !== 'string' || mint(data.guideIssueMintMark) !== bound.mintMark) {
    return emptyQuote('Numista selected issue does not independently confirm the target year and mint.');
  }
  if (text(target.itemDetails) && !/^(?:17|18|19|20)\d{2}$/.test(bound.year)) return emptyQuote('Numista guide is not scoped to the target year.');
  const providerYear = data.title.match(/\b(?:17|18|19|20)\d{2}\b/)?.[0];
  const explicitProviderMint = data.title.match(new RegExp(`\\b${bound.year}\\s*[-–]?\\s*(CC|S|O|D|W|P)\\b`, 'i'))?.[1];
  if (providerYear && (providerYear !== bound.year || (explicitProviderMint && mint(explicitProviderMint) !== bound.mintMark))) {
    return emptyQuote('Numista provider title conflicts with the target issue year or mint.');
  }
  const issued = issueGuideAnchor({
    sourceId: 'numista', sourceLabel: 'Numista Coin Catalog', value: Number(data.guideValue),
    grade: data.guideGrade ?? '', selectedGrade: data.guideSelectedGrade ?? '',
    matchType: data.guideMatchType ?? undefined, recordedSales: null, lastSaleDate: null, totalRecordedSales: null,
  }, target, {
    sourceId: 'numista', sourceQuery: data.query, sourceRecordId: `${data.id}:issue:${data.guideIssueId}`,
    currency: data.guideCurrency ?? '', providerIdentity: {
      title: data.title, country: facts('Issuer'), denomination: facts('Value'), year: String(data.guideIssueYear),
      mintMark: mint(data.guideIssueMintMark), variety: bound.variety,
      form: /^coin$/i.test(facts('Object type')) && !/\b(?:set|lot|roll|bag|replica|pattern|medal|token)\b/i.test(data.title) ? 'single_coin' : 'unsupported',
      strike: includesPhrase(providerText, bound.strike ?? '') ? bound.strike : '',
      designation: includesPhrase(providerText, bound.designation ?? '') ? bound.designation : '',
    },
  }, options);
  return { guideAnchor: issued.guideAnchor, guideWarnings: issued.warnings };
}
