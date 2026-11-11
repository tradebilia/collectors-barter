import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { ENV } from './_core/env';
import type { MarketSale } from './testAiComparableEngine';
import { canonicalizeIdentityApprovalTarget, canonicalizeIdentityApprovalCandidateFields, identityApprovalCandidateFieldsCompatible, canonicalIdentityApprovalGrade, identityApprovalTargetsEquivalent, IDENTITY_APPROVAL_TARGET_VERSION, type IdentityApprovalTargetInput } from '../shared/testAiIdentityApprovalTarget';
import { videoGameGradersEquivalent } from '../shared/videoGameGraderEquivalence';
import { hasMeaningfulTransactionIdentity } from './testAiEconomicIntegrity';
import {
  decidingVisualEvidence, gradedVisualEvidenceIsConfirmed, conservativeGradedVisualReviews,
  hasCompletedCoinAdjudication, disneyPinsEvidenceIsExact,
  type VisualEvidence, type VisualSourceReview,
} from './testAiVisualSourceFilter';

/**
 * Server-owned observation contract for the Test AI sandbox.
 *
 * A browser may render a marketplace row, but it may not establish the source,
 * price, currency, completed-sale state, or price basis used by valuation. Known
 * server adapters issue a short-lived signed reference for each normalized row.
 * The analysis route verifies that reference and reconstructs the observation
 * from its signed facts.
 */
export const CANONICAL_OBSERVATION_VERSION = '2.9.0';
export const CANONICAL_OBSERVATION_POLICY_VERSION = '2.9.0';
export const OBSERVATION_TOKEN_MAX_AGE_MS = 20 * 60 * 1_000;

export const MERCARI_UNDATED_SALE_POLICY = 'mercari_undated_sold_v1' as const;
export const MERCARI_REPORTED_SOLD_PRICE_BASIS = 'Sold-Comps Mercari sold=true reported sold price' as const;
type FinalIdentityAdapterId = 'sold_comps' | 'mercari_sold_comps';
type AdapterId =
  | 'sold_comps'
  | 'mercari_sold_comps'
  | 'the_card_api'
  | 'cardsight_ai'
  | 'lelands'
  | 'pristine_auction'
  | 'collect_auction'
  | 'sirius_sports_auctions'
  | 'pcgs_auction_results'
  | '130point'
  | 'ngc'
  | 'rumsey'
  | 'cherrystone'
  | 'raritan'
  | 'morphy'
  | 'theriaults'
  | 'poster_auctions'
  | 'comicconnect'
  | 'university_archives'
  | 'swann'
  | 'rr_auction'
  | 'alexander_historical'
  | 'goldin'
  | 'weiss'
  | 'nate_sanders'
  | 'tcgplayer_reef'
  | 'comic_book_realm'
  | 'bertoia'
  | 'heritage'
  | 'hakes'
  | 'lcg';

export type VisualRequirement = 'not_required' | 'required';
export type DuplicateStatus = 'unique' | 'exact_duplicate' | 'probable_duplicate' | 'possible_duplicate';
export type PriceInclusionFlag = 'included' | 'excluded' | 'unknown';

export type CanonicalAdapterDefinition = {
  id: AdapterId;
  label: string;
  version: string;
  defaultOriginMarketplace: string;
  defaultPriceBasis: NonNullable<MarketSale['priceBasis']>;
  completedStatusBasis: string;
};

export const CANONICAL_ADAPTER_REGISTRY: Record<AdapterId, CanonicalAdapterDefinition> = {
  sold_comps: {
    id: 'sold_comps',
    label: 'eBay Sold-Comps',
    version: '1.0.0',
    defaultOriginMarketplace: 'ebay',
    defaultPriceBasis: 'sold',
    completedStatusBasis: 'Sold-Comps completed-sale endpoint',
  },
  mercari_sold_comps: {
    id: 'mercari_sold_comps', label: 'Mercari Sold-Comps', version: '1.0.0',
    defaultOriginMarketplace: 'mercari', defaultPriceBasis: 'sold',
    completedStatusBasis: MERCARI_REPORTED_SOLD_PRICE_BASIS,
  },
  the_card_api: {
    id: 'the_card_api',
    label: 'The Card API',
    version: '1.0.0',
    defaultOriginMarketplace: 'unknown_marketplace',
    defaultPriceBasis: 'sold',
    completedStatusBasis: 'The Card API provider-confirmed final sale',
  },
  cardsight_ai: {
    id: 'cardsight_ai',
    label: 'Cardsight.ai',
    version: '1.0.0',
    defaultOriginMarketplace: 'unknown_marketplace',
    defaultPriceBasis: 'sold',
    completedStatusBasis: 'Cardsight.ai completed auction record',
  },
  lelands: {
    id: 'lelands',
    label: 'Lelands',
    version: '1.0.0',
    defaultOriginMarketplace: 'lelands',
    defaultPriceBasis: 'realized',
    completedStatusBasis: 'Lelands realized-auction archive',
  },
  pristine_auction: {
    id: 'pristine_auction',
    label: 'Pristine Auction',
    version: '1.0.0',
    defaultOriginMarketplace: 'pristine_auction',
    defaultPriceBasis: 'realized',
    completedStatusBasis: 'Pristine Auction realized-auction archive',
  },
  collect_auction: { id: 'collect_auction', label: 'Collect Auctions via Parse.bot', version: '1.0.0', defaultOriginMarketplace: 'collect_auction', defaultPriceBasis: 'realized', completedStatusBasis: 'Collect Auctions completed-sale archive via Parse.bot' },
  sirius_sports_auctions: { id: 'sirius_sports_auctions', label: 'Sirius Sports Auctions', version: '1.0.0', defaultOriginMarketplace: 'sirius_sports_auctions', defaultPriceBasis: 'realized', completedStatusBasis: 'Sirius closed-lot prices-realized archive' },
  pcgs_auction_results: {
    id: 'pcgs_auction_results',
    label: 'PCGS Auction Prices Realized',
    version: '1.0.0',
    defaultOriginMarketplace: 'pcgs_auction_results',
    defaultPriceBasis: 'realized',
    completedStatusBasis: 'PCGS auction-prices-realized endpoint',
  },
  '130point': {
    id: '130point',
    label: '130point',
    version: '1.0.0',
    defaultOriginMarketplace: 'unknown_marketplace',
    defaultPriceBasis: 'sold',
    completedStatusBasis: '130point completed-sale search result',
  },
  ngc: { id: 'ngc', label: 'NGC Auction Central', version: '1.0.0', defaultOriginMarketplace: 'ngc', defaultPriceBasis: 'closed', completedStatusBasis: 'NGC Prices Realized context' },
  rumsey: { id: 'rumsey', label: 'Rumsey Auction Results', version: '1.0.0', defaultOriginMarketplace: 'rumsey', defaultPriceBasis: 'closed', completedStatusBasis: 'Rumsey Prices Realized lot join' },
  cherrystone: { id: 'cherrystone', label: 'Cherrystone Realizations', version: '1.0.0', defaultOriginMarketplace: 'cherrystone', defaultPriceBasis: 'unknown', completedStatusBasis: 'Cherrystone Price Realized result' },
  raritan: { id: 'raritan', label: 'Raritan Past Auctions', version: '1.0.0', defaultOriginMarketplace: 'raritan', defaultPriceBasis: 'closed', completedStatusBasis: 'Raritan Prices Realized auction table' },
  morphy: { id: 'morphy', label: 'Morphy Auctions', version: '1.0.0', defaultOriginMarketplace: 'morphy', defaultPriceBasis: 'closed', completedStatusBasis: 'Morphy closed lot final price' },
  theriaults: { id: 'theriaults', label: "Theriault's Archive", version: '1.0.0', defaultOriginMarketplace: 'theriaults', defaultPriceBasis: 'unknown', completedStatusBasis: "Theriault's archived Sold listing" },
  poster_auctions: { id: 'poster_auctions', label: 'Poster Auctions International', version: '1.0.0', defaultOriginMarketplace: 'poster_auctions', defaultPriceBasis: 'closed', completedStatusBasis: 'Poster Auctions completed lot result' },
  comicconnect: { id: 'comicconnect', label: 'ComicConnect Sold Archive', version: '1.1.0', defaultOriginMarketplace: 'comicconnect', defaultPriceBasis: 'sold', completedStatusBasis: 'ComicConnect sold archive record with explicit sold amount and date' },
  university_archives: { id: 'university_archives', label: 'University Archives', version: '1.0.0', defaultOriginMarketplace: 'university_archives', defaultPriceBasis: 'unknown', completedStatusBasis: 'University Archives sold lot' },
  swann: { id: 'swann', label: 'Swann Galleries', version: '1.0.0', defaultOriginMarketplace: 'swann', defaultPriceBasis: 'closed', completedStatusBasis: 'Swann closed lot result' },
  rr_auction: { id: 'rr_auction', label: 'RR Auction', version: '1.0.0', defaultOriginMarketplace: 'rr_auction', defaultPriceBasis: 'closed', completedStatusBasis: 'RR Auction closed lot result' },
  alexander_historical: { id: 'alexander_historical', label: 'Alexander Historical Auctions', version: '1.0.0', defaultOriginMarketplace: 'alexander_historical', defaultPriceBasis: 'unknown', completedStatusBasis: 'Alexander Historical completed lot' },
  goldin: { id: 'goldin', label: 'Goldin Video Game Auctions', version: '1.0.0', defaultOriginMarketplace: 'goldin', defaultPriceBasis: 'unknown', completedStatusBasis: 'Goldin Lot Sold record' },
  weiss: { id: 'weiss', label: 'Weiss Auctions', version: '1.0.0', defaultOriginMarketplace: 'weiss', defaultPriceBasis: 'realized', completedStatusBasis: 'Weiss completed-webcast final leading bid' },
  nate_sanders: { id: 'nate_sanders', label: 'Nate D. Sanders Auctions', version: '1.0.0', defaultOriginMarketplace: 'nate_sanders', defaultPriceBasis: 'closed', completedStatusBasis: 'Nate D. Sanders closed lot with final price including buyer premium' },
  tcgplayer_reef: { id: 'tcgplayer_reef', label: 'TCGplayer via ReefAPI', version: '1.0.0', defaultOriginMarketplace: 'tcgplayer', defaultPriceBasis: 'sold', completedStatusBasis: 'TCGplayer latest-sale record returned by ReefAPI' },
  comic_book_realm: { id: 'comic_book_realm', label: 'Comic Book Realm CGC Analyzer', version: '1.0.0', defaultOriginMarketplace: 'comic_book_realm', defaultPriceBasis: 'unknown', completedStatusBasis: 'Aggregated CGC guide estimate; never an individual completed sale' },
  bertoia: { id: 'bertoia', label: 'Bertoia Auctions', version: '1.0.0', defaultOriginMarketplace: 'bertoia', defaultPriceBasis: 'unknown', completedStatusBasis: 'Bertoia completed lot or catalog record' },
  heritage: { id: 'heritage', label: 'Heritage Auction Archives', version: '1.0.0', defaultOriginMarketplace: 'heritage', defaultPriceBasis: 'unknown', completedStatusBasis: 'Heritage completed lot result' },
  hakes: { id: 'hakes', label: "Hake's Auction Results", version: '1.0.0', defaultOriginMarketplace: 'hakes', defaultPriceBasis: 'unknown', completedStatusBasis: "Hake's completed lot result" },
  lcg: { id: 'lcg', label: 'LCG Auctions', version: '1.0.0', defaultOriginMarketplace: 'lcg', defaultPriceBasis: 'unknown', completedStatusBasis: 'LCG public gallery sold lot result' },
};

export type CanonicalObservationFacts = {
  title: string | null;
  price: number | null;
  currency: string | null;
  date: string | null;
  /** Additive signed exception; omitted entirely from legacy adapter payloads. */
  saleDatePolicy?: typeof MERCARI_UNDATED_SALE_POLICY;
  sourceRecordId: string | null;
  canonicalUrl: string | null;
  originMarketplace: string;
  saleStatus: NonNullable<MarketSale['saleStatus']>;
  completedStatusBasis: string | null;
  priceBasis: NonNullable<MarketSale['priceBasis']>;
  visualRequirement: VisualRequirement;
  visualReviewStatus: NonNullable<MarketSale['visualReviewStatus']>;
  visualReviewRationale: string | null;
  evidenceDisposition: NonNullable<MarketSale['evidenceDisposition']> | null;
  evidenceReasons: string[];
  buyerPremium: PriceInclusionFlag;
  shipping: PriceInclusionFlag;
  tax: PriceInclusionFlag;
  saleForm: string | null;
  lotQuantity: number | null;
  validationErrors: string[];
};

export type CanonicalObservationProvenance = {
  version: typeof CANONICAL_OBSERVATION_VERSION;
  policyVersion: typeof CANONICAL_OBSERVATION_POLICY_VERSION;
  adapterId: AdapterId;
  adapterVersion: string;
  originMarketplace: string;
  acquiredAt: string;
  queryFingerprint: string;
  payloadHash: string;
  canonicalTransactionId: string | null;
};

type SignedObservationPayload = {
  version: typeof CANONICAL_OBSERVATION_VERSION;
  provenance: CanonicalObservationProvenance;
  facts: CanonicalObservationFacts;
  identityApproval?: IdentityApprovalV1;
};

export const IDENTITY_APPROVAL_VERSION = 'identity-approval-v1' as const;
export const IDENTITY_APPROVAL_POLICY = 'sold-comps-final-visual-v1' as const;
export type IdentityApprovalV1 = {
  version: typeof IDENTITY_APPROVAL_VERSION;
  policyVersion: typeof IDENTITY_APPROVAL_POLICY;
  status: 'approved';
  origin: 'server_final_visual';
  verdict: 'match';
  confidence: 'high' | 'medium';
  decidingPass: 'initial' | 'high_resolution_retry';
  requiredAdjudication: boolean;
  adjudicationCompleted: boolean;
  targetVersion: typeof IDENTITY_APPROVAL_TARGET_VERSION;
  targetFields: Readonly<Record<string, string>>;
  targetFingerprint: string;
  targetImageReferenceFingerprint: string;
  adapterId: FinalIdentityAdapterId;
  adapterVersion: string;
  originMarketplace: 'ebay' | 'mercari';
  sourceRecordId: string | null;
  canonicalTransactionId: string;
  sourceFactsHash: string;
  acquiredAt: string;
  decidingEvidence: VisualEvidence;
  decidingRationale: string;
  visualDifferences: NonNullable<VisualSourceReview['visualDifferences']>;
  /** Canonical subset of actual server-parsed provider facts, never copied from the target. */
  candidateIdentityFields?: Readonly<Record<string, string>>;
};
/** An opaque mint handle. Only this module's WeakMap establishes its brand. */
export type ServerFinalIdentityApproval = Readonly<{ readonly kind: 'server-final-identity-approval' }>;
type MintedApproval = { sale: MarketSale; facts: CanonicalObservationFacts; approval: IdentityApprovalV1 };
type VerifiedApproval = { facts: CanonicalObservationFacts; provenance: CanonicalObservationProvenance; approval: IdentityApprovalV1;
  verifiedAtWallMs: number; remainingAgeMs: number };
const mintedIdentityApprovals = new WeakMap<ServerFinalIdentityApproval, MintedApproval>();
const verifiedIdentityApprovals = new WeakMap<MarketSale, VerifiedApproval>();

export type SealedMarketObservation = {
  provenanceToken: string | null;
  provenance: CanonicalObservationProvenance | null;
  validationErrors: string[];
  identityApproval?: IdentityApprovalV1;
};

export type VerifiedMarketObservation =
  | { verified: true; sale: MarketSale; provenance: CanonicalObservationProvenance; reasons: string[] }
  | { verified: false; sale: MarketSale; reasons: string[] };

function clip(value: unknown, maximum: number): string | null {
  const text = typeof value === 'string' ? value.trim() : value === null || value === undefined ? '' : String(value).trim();
  return text ? text.slice(0, maximum) : null;
}

function normalizeKey(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function normalizeMarketplace(value: unknown, fallback: string): string {
  const normalized = normalizeKey(value);
  return normalized || fallback;
}

function normalizeCurrency(value: unknown): string | null {
  const currency = clip(value, 12)?.toUpperCase() ?? null;
  return currency && /^[A-Z]{3}$/.test(currency) ? currency : null;
}

function normalizeDate(value: unknown): string | null {
  const text = clip(value, 120);
  if (!text) return null;
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function normalizePrice(value: unknown): number | null {
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function normalizeSaleStatus(value: unknown): NonNullable<MarketSale['saleStatus']> {
  return value === 'completed' || value === 'closed' ? 'completed' : value === 'active' ? 'active' : 'unknown';
}

function normalizePriceBasis(value: unknown, fallback: NonNullable<MarketSale['priceBasis']>): NonNullable<MarketSale['priceBasis']> {
  return value === 'sold' || value === 'closed' || value === 'realized' ? value : fallback;
}

function normalizeVisualStatus(value: unknown): NonNullable<MarketSale['visualReviewStatus']> {
  return value === 'match' || value === 'rough_match' || value === 'mismatch' || value === 'unreadable' || value === 'not_reviewed'
    ? value
    : 'not_reviewed';
}

function normalizeDisposition(value: unknown): NonNullable<MarketSale['evidenceDisposition']> | null {
  return value === 'valuation_eligible' || value === 'warning_review' || value === 'context_only' || value === 'rejected_objective_conflict' || value === 'omitted_by_cap' || value === 'not_visually_reviewed_window'
    ? value
    : null;
}

function normalizeInclusion(value: unknown): PriceInclusionFlag {
  return value === 'included' || value === 'excluded' ? value : 'unknown';
}

function normalizedReasons(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.map((reason) => clip(reason, 300)).filter((reason): reason is string => Boolean(reason)))].slice(0, 20)
    : [];
}

function canonicalUrl(value: unknown): string | null {
  const raw = clip(value, 1_500);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    parsed.pathname = parsed.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|mkcid$|mkrid$|campid$|tooldomain$|customid$|hash$)/i.test(key)) parsed.searchParams.delete(key);
    }
    parsed.searchParams.sort();
    const query = parsed.searchParams.toString();
    return `${parsed.hostname}${parsed.pathname}${query ? `?${query}` : ''}`;
  } catch {
    return raw.toLowerCase().replace(/\s+/g, ' ');
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function fromBase64Url(value: string): string | null {
  try {
    return Buffer.from(value, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

function tokenSignature(encodedPayload: string, key: string): string {
  return createHmac('sha256', key).update(encodedPayload, 'utf8').digest('base64url');
}

function signatureMatches(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const receivedBuffer = Buffer.from(received, 'utf8');
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

function resolveSigningKey(override?: string): string | null {
  const key = (override ?? ENV.jwtSecret).trim();
  return key || null;
}

function normalizedFacts(
  adapter: CanonicalAdapterDefinition,
  sale: MarketSale,
  options?: { visualRequirement?: VisualRequirement; saleForm?: string | null; lotQuantity?: number | null },
): CanonicalObservationFacts {
  const title = clip(sale.title, 600);
  const price = normalizePrice(sale.price);
  const currency = normalizeCurrency(sale.currency);
  const date = normalizeDate(sale.date);
  const sourceRecordId = clip(sale.saleId, 240);
  const facts: CanonicalObservationFacts = {
    title,
    price,
    currency,
    date,
    sourceRecordId,
    canonicalUrl: canonicalUrl(sale.url),
    originMarketplace: normalizeMarketplace(sale.originMarketplace ?? sale.marketplace, adapter.defaultOriginMarketplace),
    saleStatus: normalizeSaleStatus(sale.saleStatus),
    completedStatusBasis: clip(sale.completedStatusBasis, 240) ?? adapter.completedStatusBasis,
    // Each adapter route must state the observed price basis explicitly. Do
    // not turn a missing provider field into a usable sale by applying a
    // registry default at the seal boundary.
    priceBasis: normalizePriceBasis(sale.priceBasis, 'unknown'),
    visualRequirement: options?.visualRequirement ?? (sale.visualRequirement === 'required' ? 'required' : 'not_required'),
    visualReviewStatus: normalizeVisualStatus(sale.visualReviewStatus),
    visualReviewRationale: clip(sale.visualReviewRationale, 300),
    evidenceDisposition: normalizeDisposition(sale.evidenceDisposition),
    evidenceReasons: normalizedReasons(sale.evidenceReasons),
    buyerPremium: normalizeInclusion(sale.buyerPremium),
    shipping: normalizeInclusion(sale.shipping),
    tax: normalizeInclusion(sale.tax),
    saleForm: clip(options?.saleForm ?? sale.saleForm, 80),
    lotQuantity: Number.isInteger(Number(options?.lotQuantity ?? sale.lotQuantity)) && Number(options?.lotQuantity ?? sale.lotQuantity) > 0
      ? Number(options?.lotQuantity ?? sale.lotQuantity)
      : null,
    validationErrors: [],
  };
  if (!facts.title) facts.validationErrors.push('provider record is missing a title');
  if (facts.price === null) facts.validationErrors.push('provider record is missing a positive realized price');
  if (facts.currency === null) facts.validationErrors.push('provider record is missing a valid three-letter currency');
  const saleDatePolicy = (sale as MarketSale & { saleDatePolicy?: string | null }).saleDatePolicy;
  if (saleDatePolicy !== undefined && saleDatePolicy !== null) {
    if (adapter.id === 'mercari_sold_comps' && facts.originMarketplace === 'mercari'
      && saleDatePolicy === MERCARI_UNDATED_SALE_POLICY && sale.date === null) {
      facts.saleDatePolicy = MERCARI_UNDATED_SALE_POLICY;
    } else facts.validationErrors.push('sale date policy is invalid for this adapter, origin, or non-null date');
  }
  if (!facts.date && !facts.saleDatePolicy) facts.validationErrors.push('provider record is missing a valid sale date');
  if (!facts.sourceRecordId && !facts.canonicalUrl) facts.validationErrors.push('provider record is missing both a provider record ID and canonical URL');
  return facts;
}

function transactionId(adapterId: AdapterId, facts: CanonicalObservationFacts): string | null {
  return facts.canonicalUrl ? `url:${facts.canonicalUrl}`
    : facts.sourceRecordId ? `record:${adapterId}:${normalizeKey(facts.sourceRecordId)}` : null;
}
function sourceFactsHash(facts: CanonicalObservationFacts): string {
  return sha256(JSON.stringify(facts));
}
function imageFingerprint(reference: unknown): string | null {
  return typeof reference === 'string' && reference.trim() && reference.trim().length <= 2_000
    ? sha256(reference.trim()) : null;
}
const EVIDENCE_KEYS: Array<keyof VisualEvidence> = [
  'slabVisible', 'gradingLabelVisible', 'graderVisible', 'numericGradeVisible', 'gradeMatches',
  'rawOrLooseVisible', 'characterMatches', 'artworkMatches', 'silhouetteMatches', 'backingCardMatches',
  'setDesignMatches', 'identityMatches', 'dateMatches', 'varietyMatches', 'mintMarkMatches', 'denominationMatches',
];
function boundedEvidence(evidence: VisualEvidence | undefined): VisualEvidence {
  return Object.fromEntries(EVIDENCE_KEYS.filter((key) => typeof evidence?.[key] === 'boolean')
    .map((key) => [key, evidence![key]]));
}
function immutableCopy<T>(value: T): T {
  const copy = JSON.parse(JSON.stringify(value)) as T;
  const freeze = (object: unknown): void => {
    if (!object || typeof object !== 'object') return;
    Object.values(object).forEach(freeze);
    Object.freeze(object);
  };
  freeze(copy);
  return copy;
}
function usableTransaction(facts: CanonicalObservationFacts): boolean {
  const usableRecord = Boolean(facts.sourceRecordId && !/^(unknown|none|null|undefined|n\/?a)$/i.test(facts.sourceRecordId)
    && /[a-z0-9]/i.test(facts.sourceRecordId));
  return usableRecord || Boolean(facts.canonicalUrl && /^ebay\.[a-z.]+\/itm\/(?:[^/?]+\/)?\d+(?:\?|$)/i.test(facts.canonicalUrl));
}
function approvalFactsAreEligible(facts: CanonicalObservationFacts, acquiredAt: string, adapterId: FinalIdentityAdapterId): boolean {
  const date = facts.date ? Date.parse(facts.date) : NaN, acquisition = Date.parse(acquiredAt);
  const mercari = adapterId === 'mercari_sold_comps';
  const transactionUsable = mercari ? hasMeaningfulTransactionIdentity({ title: facts.title, price: facts.price, saleId: facts.sourceRecordId })
    || Boolean(facts.canonicalUrl && /^mercari\.com\/us\/item\/m\d+(?:\?|$)/i.test(facts.canonicalUrl)) : usableTransaction(facts);
  const dateEligible = mercari ? facts.date === null && facts.saleDatePolicy === MERCARI_UNDATED_SALE_POLICY
    && facts.completedStatusBasis === MERCARI_REPORTED_SOLD_PRICE_BASIS
    : facts.saleDatePolicy === undefined && Number.isFinite(date) && date <= acquisition;
  return facts.validationErrors.length === 0 && facts.originMarketplace === (mercari ? 'mercari' : 'ebay')
    && transactionUsable && facts.currency === 'USD' && facts.price !== null && facts.price > 0
    && dateEligible && Number.isFinite(acquisition)
    && facts.saleStatus === 'completed' && facts.priceBasis === 'sold'
    && facts.visualRequirement === 'required' && facts.visualReviewStatus === 'match' && facts.evidenceDisposition === 'valuation_eligible'
    && facts.evidenceReasons.length === 0 && !(facts.lotQuantity !== null && facts.lotQuantity > 1)
    && !/\b(?:lot|bundle|components?|accessory[- ]only|manual[- ]only|box[- ]only)\b/i.test(facts.saleForm ?? '');
}
function metadataTarget(metadata: string): IdentityApprovalTargetInput | null {
  const details = metadata.match(/(?:^|;)\s*fullItemDetails=(.*)$/s)?.[1];
  if (!details) return null;
  const field = (key: string) => metadata.match(new RegExp(`(?:^|;)\\s*${key}=([^;]*)`, 'i'))?.[1]?.trim();
  return { title: field('title'), category: field('category'), itemType: field('itemType'),
    grade: field('grade'), certificationCompany: field('certificationCompany'), itemDetails: details };
}

function hardDecidingDifference(difference: NonNullable<VisualSourceReview['visualDifferences']>[number], category: string): boolean {
  if (!/hard|material|conflict|mismatch/i.test(difference.impact)
    || /serial|tracking|qr|barcode|(?:certification|certificate|cert)[ _-]*(?:id|number)/i.test(difference.field)) return false;
  if (category === 'disney_pins' && /^(?:(?:numeric[ _-]*)?grade|grader|grading[ _-]*company|certification[ _-]*company|slab|grading[ _-]*label|raw[ _-]*(?:or|versus|vs)[ _-]*graded|graded[ _-]*state|is[ _-]*graded)$/i.test(difference.field.trim())) return false;
  const left = difference.targetObservation.trim(), right = difference.candidateObservation.trim();
  if (left.normalize('NFKC').toLowerCase().replace(/[_\s-]+/g, ' ') === right.normalize('NFKC').toLowerCase().replace(/[_\s-]+/g, ' ')) return false;
  if (/^(numeric[ _-]*)?grade$/i.test(difference.field)
    && canonicalIdentityApprovalGrade(left) === canonicalIdentityApprovalGrade(right)) return false;
  if (/grader|grading company|certification company/i.test(difference.field)
    && videoGameGradersEquivalent(category, left, right)) return false;
  if (category === 'video_games' && /label|designation|suffix|seal(?:ed)?[ _-]*(?:grade|rating)/i.test(difference.field)) {
    const suffixOnly = (value: string) => value.replace(/\b(?:sealed\s+)?A\+{1,3}(?!\+)/gi, '')
      .normalize('NFKC').toLowerCase().replace(/[_\s-]+/g, ' ').trim();
    if (/\b(?:sealed\s+)?A\+{1,3}(?!\+)/i.test(`${left} ${right}`) && suffixOnly(left) === suffixOnly(right)) return false;
  }
  return true;
}

export type ServerFinalIdentityApprovalOptions = {
  sale: MarketSale;
  target: IdentityApprovalTargetInput;
  reviewedTarget: IdentityApprovalTargetInput;
  targetImageReference: string;
  expectedImageReference: string;
  targetMetadata: string;
  review: VisualSourceReview;
  acquiredAt?: Date;
  /** Server wrapper passes only known declarations from its already parsed provider metadata. */
  candidateIdentityFields?: Record<string, string>;
  /** Diagnostic callback only. Never changes approval or signing authority. */
  onRejected?: (reason: string) => void;
};
/** Server post-Stage-1 record-bound eBay or authorized undated Mercari path. */
export function createServerFinalIdentityApproval(options: ServerFinalIdentityApprovalOptions): ServerFinalIdentityApproval | null {
  const { sale, target, reviewedTarget, review, targetMetadata } = options;
  const reject = (reason: string): null => { options.onRejected?.(reason); return null; };
  if (sale.sourceId !== 'sold_comps' && sale.sourceId !== 'mercari_sold_comps') return reject('APPROVAL_SOURCE_UNSUPPORTED: source adapter cannot issue this visual approval.');
  const adapterId = sale.sourceId;
  if (sale.sourceAdapter && sale.sourceAdapter !== adapterId) return reject('APPROVAL_ADAPTER_CONFLICT: source ID and adapter disagree.');
  if (adapterId === 'mercari_sold_comps' && (sale.originMarketplace !== 'mercari' || sale.recency !== 'undated'
    || sale.completedStatusBasis !== MERCARI_REPORTED_SOLD_PRICE_BASIS)) return reject('MERCARI_POLICY_BINDING_INVALID: marketplace, undated classification or sold=true basis does not match the approved exception.');
  const canonical = canonicalizeIdentityApprovalTarget(target);
  if (canonical.conflicts.length || canonical.serialized.length > 3_000 || !identityApprovalTargetsEquivalent(reviewedTarget, target)) return reject('APPROVAL_TARGET_BINDING_INVALID: reviewed target differs from the valuation target, has conflicting fields or exceeds the identity limit.');
  const actualMetadataTarget = metadataTarget(targetMetadata);
  if (!actualMetadataTarget || !identityApprovalTargetsEquivalent(reviewedTarget, actualMetadataTarget)) return reject('APPROVAL_REVIEW_METADATA_BINDING_INVALID: the metadata supplied to image review does not bind to this target.');
  const candidate = options.candidateIdentityFields === undefined ? undefined
    : canonicalizeIdentityApprovalCandidateFields(canonical.fields.category, options.candidateIdentityFields);
  if (candidate && (candidate.conflicts.length || !identityApprovalCandidateFieldsCompatible(canonical.fields, candidate.fields))) return reject('APPROVAL_CANDIDATE_FIELDS_CONFLICT: parsed candidate identity or grading fields conflict with the target.');
  if (canonical.fields.category === 'autographs' || /original art|signed item|reference/.test(canonical.fields.itemType ?? '')) return reject('APPROVAL_CONTEXT_ONLY_ITEM_TYPE: this item type is not eligible for direct completed-sale approval.');
  const picture = imageFingerprint(options.targetImageReference);
  if (!picture || picture !== imageFingerprint(options.expectedImageReference)) return reject('APPROVAL_TARGET_IMAGE_BINDING_INVALID: reviewed target image is missing or differs from the valuation target image.');
  const acquiredAt = (options.acquiredAt ?? new Date()).toISOString();
  const facts = normalizedFacts(CANONICAL_ADAPTER_REGISTRY[adapterId], sale);
  if (!approvalFactsAreEligible(facts, acquiredAt, adapterId) || review.verdict !== 'match' || !review.visualAudit) return reject('APPROVAL_FACTS_OR_REVIEW_INVALID: source facts failed the approval policy, or a matched visual audit is missing.');
  if (!identityApprovalCandidateFieldsCompatible(canonical.fields, { saleForm: facts.saleForm ?? '' })
    || candidate && (Number(candidate.fields.lotQuantity) > 1
      || /\b(?:lot|bundle|components?|accessory[- ]only|manual[- ]only|box[- ]only)\b/i.test(candidate.fields.saleForm ?? candidate.fields.productForm ?? ''))) return reject('APPROVAL_TRANSACTION_FORM_CONFLICT: lot, bundle or partial-product form conflicts with the target.');
  const audit = review.visualAudit;
  const isRetry = audit.finalPass === 'high_resolution_retry';
  const confidence = isRetry ? audit.retryConfidence : audit.initialConfidence;
  const decidingVerdict = isRetry ? audit.retryVerdict : audit.initialVerdict;
  if (!Number.isInteger(audit.imageCount) || audit.imageCount < 1) return reject('APPROVAL_IMAGE_COUNT_MISSING: no submitted image count is recorded in the visual audit.');
  // Final normalizations may correct initial unreadable/mismatch, but never
  // manufacture confidence or replace the deciding pass's observations.
  if (confidence !== 'high' && confidence !== 'medium' || review.confidence !== confidence) return reject('APPROVAL_CONFIDENCE_INSUFFICIENT: deciding-pass confidence must be medium or high and agree with the returned review.');
  if (isRetry && (audit.retryStatus !== 'performed' || decidingVerdict !== 'match'
    || audit.adjudicationStatus !== undefined && audit.adjudicationStatus !== 'confirmed')) return reject('APPROVAL_RETRY_NOT_CONFIRMED: retry was not completed as a confirmed match.');
  if (!isRetry && audit.finalPass !== 'initial') return reject('APPROVAL_DECIDING_PASS_INVALID: no recognized deciding image-review pass is recorded.');
  if (!isRetry && decidingVerdict !== 'match' && !audit.normalizations?.some((normalization) => normalization.verdictAfter === 'match'
    && ['video_game_identical_sealed_label', 'video_game_soft_sealed_suffix', 'video_game_sealed_implies_cib_self_description',
      'video_game_psa_wata_equivalence', 'graded_final_evidence_confirmation', 'coin_unknown_crop_supplement'].includes(normalization.rule))) return reject('APPROVAL_DECIDING_VERDICT_NOT_MATCH: deciding pass has no match or authorized equivalence normalization.');
  if (audit.adjudicationStatus === 'unavailable') return reject('APPROVAL_ADJUDICATION_UNAVAILABLE: required adjudication did not return usable evidence.');
  const requiredAdjudication = canonical.fields.category === 'coins' || isRetry;
  if (canonical.fields.category === 'coins' && !hasCompletedCoinAdjudication(review, targetMetadata, facts.title ?? '')) return reject('APPROVAL_COIN_ADJUDICATION_INCOMPLETE: independent coin identity adjudication is not complete.');
  const ownEvidence = isRetry ? audit.finalEvidence : audit.finalEvidence ?? review.visualEvidence ?? audit.initialEvidence;
  if (!ownEvidence || isRetry && !audit.finalEvidence) return reject('APPROVAL_DECIDING_EVIDENCE_MISSING: deciding pass did not record its own visual evidence.');
  if (!isRetry && audit.finalEvidence && review.visualEvidence
    && JSON.stringify(boundedEvidence(audit.finalEvidence)) !== JSON.stringify(boundedEvidence(review.visualEvidence))) return reject('APPROVAL_EVIDENCE_CONFLICT: final audit evidence differs from the returned review evidence.');
  const evidence = boundedEvidence(decidingVisualEvidence({ visualEvidence: ownEvidence, visualAudit: audit }));
  const graded = canonical.fields.category !== 'disney_pins' && canonical.fields.gradedState === 'graded';
  if (graded && !gradedVisualEvidenceIsConfirmed(evidence)) return reject('APPROVAL_GRADED_EVIDENCE_INCOMPLETE: slab, label, grader, numeric grade and grade match were not all confirmed.');
  if (canonical.fields.category !== 'disney_pins' && canonical.fields.gradedState === 'raw' && (evidence.rawOrLooseVisible !== true || evidence.slabVisible === true)) return reject('APPROVAL_UNGRADED_STATE_UNCONFIRMED: the target is ungraded, but deciding evidence did not confirm rawOrLooseVisible=true with no visible slab.');
  if (canonical.fields.category !== 'disney_pins' && evidence.identityMatches !== true) return reject('APPROVAL_IDENTITY_NOT_CONFIRMED: deciding visual evidence did not confirm identityMatches=true.');
  if (canonical.fields.category === 'disney_pins' && !disneyPinsEvidenceIsExact(evidence, targetMetadata)) return reject('APPROVAL_PIN_IDENTITY_INCOMPLETE: required exact pin identity evidence was not confirmed.');
  if (['identityMatches', 'artworkMatches', 'dateMatches', 'varietyMatches', 'mintMarkMatches', 'denominationMatches']
    .some((key) => evidence[key as keyof VisualEvidence] === false)) return reject(`APPROVAL_VISUAL_IDENTITY_CONFLICT: deciding evidence reports false for ${['identityMatches', 'artworkMatches', 'dateMatches', 'varietyMatches', 'mintMarkMatches', 'denominationMatches'].filter(key => evidence[key as keyof VisualEvidence] === false).join(', ')}.`);
  const decidingRationale = audit.decidingRationale ?? (isRetry ? audit.retryRationale : audit.initialRationale) ?? review.rationale;
  const reconciled = conservativeGradedVisualReviews([{ ...review, rationale: decidingRationale, candidateIndex: 0, visualEvidence: evidence }],
    [{ title: facts.title, ...(candidate ? { normalizedStructuredMetadata: candidate.fields } : {}) }], targetMetadata)[0];
  if (reconciled?.verdict !== 'match') return reject('APPROVAL_CONSERVATIVE_REVIEW_NOT_MATCH: grading/identity reconciliation did not retain a match.');
  if ((review.visualDifferences ?? []).length > 30) return reject('APPROVAL_VISUAL_DIFFERENCES_LIMIT: visual differences exceed the 30-row limit.');
  if ((review.visualDifferences ?? []).some((difference) => difference.field.length > 80 || difference.targetObservation.length > 300
    || difference.candidateObservation.length > 300 || difference.impact.length > 120)) return reject('APPROVAL_VISUAL_DIFFERENCE_LENGTH: a visual difference exceeds the bounded field length.');
  const differences = (review.visualDifferences ?? []).map((difference) => ({
    field: clip(difference.field, 80) ?? '', targetObservation: clip(difference.targetObservation, 300) ?? '',
    candidateObservation: clip(difference.candidateObservation, 300) ?? '', impact: clip(difference.impact, 120) ?? '',
  }));
  if (differences.some((difference) => hardDecidingDifference(difference, canonical.fields.category))) return reject(`APPROVAL_MATERIAL_VISUAL_DIFFERENCE: ${differences.filter(difference => hardDecidingDifference(difference, canonical.fields.category)).map(difference => difference.field).join(', ')} conflicts with the target.`);
  const rationale = clip(decidingRationale, 600) ?? '';
  const approval: IdentityApprovalV1 = immutableCopy({
    version: IDENTITY_APPROVAL_VERSION, policyVersion: IDENTITY_APPROVAL_POLICY, status: 'approved',
    origin: 'server_final_visual', verdict: 'match', confidence, decidingPass: audit.finalPass,
    // Reaching this point proves the retry's own complete deciding evidence.
    // Coins additionally passed their independent confirmed-adjudication guard.
    requiredAdjudication, adjudicationCompleted: true,
    targetVersion: IDENTITY_APPROVAL_TARGET_VERSION, targetFields: canonical.fields,
    targetFingerprint: sha256(canonical.serialized), targetImageReferenceFingerprint: picture,
    adapterId, adapterVersion: CANONICAL_ADAPTER_REGISTRY[adapterId].version, originMarketplace: adapterId === 'mercari_sold_comps' ? 'mercari' : 'ebay',
    sourceRecordId: facts.sourceRecordId, canonicalTransactionId: transactionId(adapterId, facts)!,
    sourceFactsHash: sourceFactsHash(facts), acquiredAt, decidingEvidence: evidence, decidingRationale: rationale, visualDifferences: differences,
    ...(candidate ? { candidateIdentityFields: candidate.fields } : {}),
  });
  if (!approval.adjudicationCompleted || JSON.stringify(approval).length > 7_000) return null;
  const handle: ServerFinalIdentityApproval = Object.freeze({ kind: 'server-final-identity-approval' });
  mintedIdentityApprovals.set(handle, { sale, facts: immutableCopy(facts), approval });
  return handle;
}

function validApproval(approval: IdentityApprovalV1, facts: CanonicalObservationFacts, provenance: CanonicalObservationProvenance): boolean {
  if (!approval || typeof approval !== 'object' || Array.isArray(approval)) return false;
  const keys = ['version', 'policyVersion', 'status', 'origin', 'verdict', 'confidence', 'decidingPass', 'requiredAdjudication',
    'adjudicationCompleted', 'targetVersion', 'targetFields', 'targetFingerprint', 'targetImageReferenceFingerprint',
    'adapterId', 'adapterVersion', 'originMarketplace', 'sourceRecordId', 'canonicalTransactionId', 'sourceFactsHash',
    'acquiredAt', 'decidingEvidence', 'decidingRationale', 'visualDifferences'];
  if (Object.prototype.hasOwnProperty.call(approval, 'candidateIdentityFields')) keys.push('candidateIdentityFields');
  if (Object.keys(approval).length !== keys.length || Object.keys(approval).some((key) => !keys.includes(key))) return false;
  if (approval.version !== IDENTITY_APPROVAL_VERSION || approval.policyVersion !== IDENTITY_APPROVAL_POLICY
    || approval.status !== 'approved' || approval.origin !== 'server_final_visual' || approval.verdict !== 'match'
    || !['high', 'medium'].includes(approval.confidence) || !['initial', 'high_resolution_retry'].includes(approval.decidingPass)
    || typeof approval.requiredAdjudication !== 'boolean' || approval.adjudicationCompleted !== true
    || approval.targetVersion !== IDENTITY_APPROVAL_TARGET_VERSION) return false;
  if (!['sold_comps', 'mercari_sold_comps'].includes(provenance.adapterId) || approval.adapterId !== provenance.adapterId
    || approval.adapterVersion !== provenance.adapterVersion || approval.originMarketplace !== (provenance.adapterId === 'mercari_sold_comps' ? 'mercari' : 'ebay')
    || provenance.originMarketplace !== facts.originMarketplace || approval.originMarketplace !== facts.originMarketplace
    || approval.sourceRecordId !== facts.sourceRecordId || approval.acquiredAt !== provenance.acquiredAt
    || approval.canonicalTransactionId !== transactionId(provenance.adapterId, facts)
    || approval.canonicalTransactionId !== provenance.canonicalTransactionId
    || approval.sourceFactsHash !== sourceFactsHash(facts) || !approvalFactsAreEligible(facts, provenance.acquiredAt, approval.adapterId)) return false;
  if (!approval.targetFields || typeof approval.targetFields !== 'object' || Array.isArray(approval.targetFields)
    || Object.keys(approval.targetFields).length > 100 || !approval.targetFields.category
    || Object.values(approval.targetFields).some((value) => typeof value !== 'string' || !value || value.length > 2_000)) return false;
  const fields = Object.fromEntries(Object.keys(approval.targetFields).sort().map((key) => [key, approval.targetFields[key]]));
  if (sha256(JSON.stringify({ version: approval.targetVersion, fields })) !== approval.targetFingerprint
    || !/^[a-f0-9]{64}$/.test(approval.targetImageReferenceFingerprint)) return false;
  const reconstructedTarget = canonicalizeIdentityApprovalTarget({
    title: fields.title, category: fields.category, itemType: fields.itemType, grade: fields.grade,
    certificationCompany: fields.certificationCompany, condition: fields.hardCondition, itemDetails: fields,
  });
  if (reconstructedTarget.conflicts.length || sha256(reconstructedTarget.serialized) !== approval.targetFingerprint) return false;
  if (fields.category === 'autographs' || /original art|signed item|reference/.test(fields.itemType ?? '')) return false;
  if (Object.prototype.hasOwnProperty.call(approval, 'candidateIdentityFields')) {
    const candidate = canonicalizeIdentityApprovalCandidateFields(fields.category, approval.candidateIdentityFields!);
    if (candidate.conflicts.length || JSON.stringify(candidate.fields) !== JSON.stringify(approval.candidateIdentityFields)
      || !identityApprovalCandidateFieldsCompatible(fields, candidate.fields) || Number(candidate.fields.lotQuantity) > 1
      || /\b(?:lot|bundle|components?|accessory[- ]only|manual[- ]only|box[- ]only)\b/i.test(candidate.fields.saleForm ?? candidate.fields.productForm ?? '')) return false;
  }
  if (!identityApprovalCandidateFieldsCompatible(fields, { saleForm: facts.saleForm ?? '' })) return false;
  if (fields.category === 'coins' && (!approval.requiredAdjudication || approval.decidingPass !== 'high_resolution_retry')
    || approval.decidingPass === 'high_resolution_retry' && !approval.requiredAdjudication) return false;
  const evidence = approval.decidingEvidence;
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)
    || Object.keys(evidence).some((key) => !EVIDENCE_KEYS.includes(key as keyof VisualEvidence) || typeof evidence[key as keyof VisualEvidence] !== 'boolean')) return false;
  if (fields.category !== 'disney_pins' && (fields.gradedState === 'graded' && !gradedVisualEvidenceIsConfirmed(evidence)
    || fields.gradedState === 'raw' && (evidence.rawOrLooseVisible !== true || evidence.slabVisible === true))) return false;
  if (fields.category !== 'disney_pins' && evidence.identityMatches !== true
    || fields.category === 'disney_pins' && !disneyPinsEvidenceIsExact(evidence)) return false;
  if (['identityMatches', 'artworkMatches', 'dateMatches', 'varietyMatches', 'mintMarkMatches', 'denominationMatches']
    .some((key) => evidence[key as keyof VisualEvidence] === false)) return false;
  if (typeof approval.decidingRationale !== 'string' || approval.decidingRationale.length > 600
    || !Array.isArray(approval.visualDifferences) || approval.visualDifferences.length > 30) return false;
  return approval.visualDifferences.every((difference) => difference && typeof difference === 'object'
    && Object.keys(difference).length === 4 && ['field', 'targetObservation', 'candidateObservation', 'impact']
      .every((key) => typeof difference[key as keyof typeof difference] === 'string'
        && difference[key as keyof typeof difference].length <= (key === 'field' ? 80 : key === 'impact' ? 120 : 300))
    && !hardDecidingDifference(difference, fields.category));
}

function authorityStillBound(sale: MarketSale, authority: VerifiedApproval): boolean {
  const elapsed = Date.now() - authority.verifiedAtWallMs;
  if (elapsed < 0 || elapsed > authority.remainingAgeMs) return false;
  const adapterId = authority.approval.adapterId;
  if (sale.sourceId !== adapterId || sale.sourceAdapter !== adapterId
    || adapterId === 'mercari_sold_comps' && sale.recency !== 'undated'
    || sale.observationId !== authority.provenance.payloadHash || sale.canonicalTransactionId !== authority.provenance.canonicalTransactionId
    || sale.evidenceDisposition !== 'valuation_eligible' || sale.duplicateStatus && !['unique', 'possible_duplicate'].includes(sale.duplicateStatus)) return false;
  const current = normalizedFacts(CANONICAL_ADAPTER_REGISTRY[adapterId], sale);
  // Reconstructed URLs are already scheme-less canonical facts. Preserve their
  // path case only when exactly bound, or parse a scheme-less successor with an
  // authority-local https prefix. Never change legacy sealing normalization.
  if (sale.url === authority.facts.canonicalUrl) current.canonicalUrl = authority.facts.canonicalUrl;
  else if (typeof sale.url === 'string' && !/^[a-z][a-z\d+.-]*:/i.test(sale.url)) current.canonicalUrl = canonicalUrl(`https://${sale.url}`);
  const structured = (sale as MarketSale & { normalizedStructuredMetadata?: unknown }).normalizedStructuredMetadata;
  if (authority.approval.candidateIdentityFields !== undefined) {
    const candidate = canonicalizeIdentityApprovalCandidateFields(authority.approval.targetFields.category, structured as Record<string, string>);
    if (candidate.conflicts.length || JSON.stringify(candidate.fields) !== JSON.stringify(authority.approval.candidateIdentityFields)) return false;
  } else if (structured !== undefined) {
    const candidate = canonicalizeIdentityApprovalCandidateFields(authority.approval.targetFields.category, structured as Record<string, string>);
    if (candidate.conflicts.length || !identityApprovalCandidateFieldsCompatible(authority.approval.targetFields, candidate.fields)) return false;
  }
  // Normalization may append economic diagnostics, but cannot change signed
  // economics, visual status, form, transaction, or primary source facts.
  const { evidenceReasons: _reasons, validationErrors: _errors, ...signed } = authority.facts;
  const { evidenceReasons: _currentReasons, validationErrors: _currentErrors, ...observed } = current;
  return JSON.stringify(signed) === JSON.stringify(observed);
}
export function getVerifiedIdentityApproval(
  sale: MarketSale, target: IdentityApprovalTargetInput & { approvalTargetImageReference?: string }, imageReference?: string,
): IdentityApprovalV1 | null {
  const authority = verifiedIdentityApprovals.get(sale);
  if (!authority || !authorityStillBound(sale, authority)) return null;
  const canonical = canonicalizeIdentityApprovalTarget(target);
  if (canonical.conflicts.length || sha256(canonical.serialized) !== authority.approval.targetFingerprint
    || imageFingerprint(imageReference ?? target.approvalTargetImageReference) !== authority.approval.targetImageReferenceFingerprint) return null;
  return authority.approval;
}
/** Only an already verified object can deliberately authorize its normalized successor. */
export function transferVerifiedIdentityApproval(from: MarketSale, to: MarketSale): boolean {
  const authority = verifiedIdentityApprovals.get(from);
  if (!authority || !authorityStillBound(from, authority) || !authorityStillBound(to, authority)) return false;
  verifiedIdentityApprovals.set(to, authority);
  return true;
}

/** Null dates are admitted only by private, still-bound final identity authority. */
export function hasVerifiedMercariUndatedSale(
  sale: MarketSale, target?: IdentityApprovalTargetInput & { approvalTargetImageReference?: string }, imageReference?: string,
): boolean {
  const authority = verifiedIdentityApprovals.get(sale);
  return Boolean(authority && authority.approval.adapterId === 'mercari_sold_comps'
    && authority.facts.originMarketplace === 'mercari' && authority.facts.date === null
    && authority.facts.saleDatePolicy === MERCARI_UNDATED_SALE_POLICY
    && sale.date === null && sale.recency === 'undated' && authorityStillBound(sale, authority)
    && (!target || getVerifiedIdentityApproval(sale, target, imageReference)));
}

function asMarketSale(facts: CanonicalObservationFacts, provenance: CanonicalObservationProvenance): MarketSale {
  const reasons = [...facts.evidenceReasons, ...facts.validationErrors];
  const recency = facts.date ? (Date.now() - Date.parse(facts.date) <= 365 * 86_400_000 ? 'recent' : 'historical') : 'undated';
  return {
    title: facts.title,
    price: facts.price,
    currency: facts.currency,
    date: facts.date,
    ...(facts.saleDatePolicy ? { saleDatePolicy: facts.saleDatePolicy } : {}),
    marketplace: facts.originMarketplace,
    originMarketplace: facts.originMarketplace,
    sourceId: provenance.adapterId,
    sourceAdapter: provenance.adapterId,
    sourceLabel: CANONICAL_ADAPTER_REGISTRY[provenance.adapterId].label,
    saleId: facts.sourceRecordId,
    url: facts.canonicalUrl,
    recency,
    saleStatus: facts.saleStatus,
    completedStatusBasis: facts.completedStatusBasis,
    priceBasis: facts.priceBasis,
    visualRequirement: facts.visualRequirement,
    visualReviewStatus: facts.visualReviewStatus,
    visualReviewRationale: facts.visualReviewRationale,
    evidenceDisposition: facts.evidenceDisposition,
    evidenceReasons: reasons,
    buyerPremium: facts.buyerPremium,
    shipping: facts.shipping,
    tax: facts.tax,
    saleForm: facts.saleForm,
    lotQuantity: facts.lotQuantity,
    observationId: provenance.payloadHash,
    canonicalTransactionId: provenance.canonicalTransactionId,
    duplicateStatus: 'unique',
    provenanceToken: null,
    provenance: provenance,
  };
}

/** Issues a short-lived reference for one server-normalized marketplace row. */
export function sealCanonicalObservation(
  adapterId: AdapterId,
  sale: MarketSale,
  options?: { query?: string | null; acquiredAt?: Date; signingKey?: string; visualRequirement?: VisualRequirement; saleForm?: string | null; lotQuantity?: number | null; identityApproval?: ServerFinalIdentityApproval | null },
): SealedMarketObservation {
  const adapter = CANONICAL_ADAPTER_REGISTRY[adapterId];
  const facts = normalizedFacts(adapter, sale, options);
  const canonicalTransactionId = facts.canonicalUrl
    ? `url:${facts.canonicalUrl}`
    : facts.sourceRecordId
      ? `record:${adapterId}:${normalizeKey(facts.sourceRecordId)}`
      : null;
  const mint = options?.identityApproval && typeof options.identityApproval === 'object'
    ? mintedIdentityApprovals.get(options.identityApproval) : undefined;
  const acquiredAt = (options?.acquiredAt ?? (mint ? new Date(mint.approval.acquiredAt) : new Date())).toISOString();
  const structured = (sale as MarketSale & { normalizedStructuredMetadata?: unknown }).normalizedStructuredMetadata;
  const currentCandidate = mint?.approval.candidateIdentityFields !== undefined && structured !== undefined
    ? canonicalizeIdentityApprovalCandidateFields(mint.approval.targetFields.category, structured as Record<string, string>) : undefined;
  const candidateStillBound = !currentCandidate || currentCandidate.conflicts.length === 0
    && JSON.stringify(currentCandidate.fields) === JSON.stringify(mint?.approval.candidateIdentityFields);
  const identityApproval = mint && adapterId === mint.approval.adapterId && mint.sale === sale
    && mint.approval.acquiredAt === acquiredAt && sourceFactsHash(facts) === mint.approval.sourceFactsHash
    && candidateStillBound && canonicalTransactionId === mint.approval.canonicalTransactionId ? mint.approval : undefined;
  const provenance: CanonicalObservationProvenance = {
    version: CANONICAL_OBSERVATION_VERSION,
    policyVersion: CANONICAL_OBSERVATION_POLICY_VERSION,
    adapterId,
    adapterVersion: adapter.version,
    originMarketplace: facts.originMarketplace,
    acquiredAt,
    queryFingerprint: sha256(clip(options?.query, 600) ?? ''),
    payloadHash: sha256(JSON.stringify(identityApproval ? { adapterId, facts, acquiredAt, identityApproval } : { adapterId, facts, acquiredAt })),
    canonicalTransactionId,
  };
  const payload: SignedObservationPayload = { version: CANONICAL_OBSERVATION_VERSION, provenance, facts };
  if (identityApproval) payload.identityApproval = identityApproval;
  const signingKey = resolveSigningKey(options?.signingKey);
  const transport = identityApproval ? { identityApproval } : {};
  if (!signingKey) return { provenanceToken: null, provenance, validationErrors: facts.validationErrors, ...transport };
  const encoded = toBase64Url(JSON.stringify(payload));
  return { provenanceToken: `${encoded}.${tokenSignature(encoded, signingKey)}`, provenance, validationErrors: facts.validationErrors, ...transport };
}

/**
 * Verifies a client-carried observation reference. On failure, returns a context
 * row suitable for the ledger but never a trusted market sale.
 */
export function verifyCanonicalObservation(
  candidate: MarketSale,
  options?: { now?: Date; signingKey?: string; maxAgeMs?: number },
): VerifiedMarketObservation {
  const fallback = (): MarketSale => ({
    title: clip(candidate.title, 600),
    price: normalizePrice(candidate.price),
    currency: normalizeCurrency(candidate.currency),
    date: normalizeDate(candidate.date),
    marketplace: clip(candidate.marketplace, 160),
    sourceId: null,
    sourceLabel: 'Unverified client observation',
    saleId: clip(candidate.saleId, 240),
    url: canonicalUrl(candidate.url),
    saleStatus: 'unknown',
    completedStatusBasis: null,
    priceBasis: 'unknown',
    visualRequirement: 'not_required',
    visualReviewStatus: 'not_reviewed',
    visualReviewRationale: null,
    evidenceDisposition: 'context_only',
    evidenceReasons: ['server provenance reference is absent or invalid; retained as context only'],
    duplicateStatus: 'unique',
    provenanceToken: null,
    provenance: null,
  });
  const token = clip(candidate.provenanceToken, 16_000);
  const key = resolveSigningKey(options?.signingKey);
  if (!token || !key) return { verified: false, sale: fallback(), reasons: ['server provenance reference is absent or signing is unavailable'] };
  const [encoded, signature, ...rest] = token.split('.');
  if (!encoded || !signature || rest.length || !signatureMatches(tokenSignature(encoded, key), signature)) {
    return { verified: false, sale: fallback(), reasons: ['server provenance signature is invalid'] };
  }
  const rawPayload = fromBase64Url(encoded);
  if (!rawPayload) return { verified: false, sale: fallback(), reasons: ['server provenance payload is unreadable'] };
  let payload: SignedObservationPayload | null = null;
  try { payload = JSON.parse(rawPayload) as SignedObservationPayload; } catch { /* fall through */ }
  if (!payload || payload.version !== CANONICAL_OBSERVATION_VERSION || !payload.provenance || !payload.facts) {
    return { verified: false, sale: fallback(), reasons: ['server provenance payload does not match the active observation contract'] };
  }
  if (payload.provenance.version !== CANONICAL_OBSERVATION_VERSION || payload.provenance.policyVersion !== CANONICAL_OBSERVATION_POLICY_VERSION
    || !Array.isArray(payload.facts.evidenceReasons) || !Array.isArray(payload.facts.validationErrors)) {
    return { verified: false, sale: fallback(), reasons: ['server provenance facts or policy are malformed'] };
  }
  const adapter = CANONICAL_ADAPTER_REGISTRY[payload.provenance.adapterId];
  if (!Object.prototype.hasOwnProperty.call(CANONICAL_ADAPTER_REGISTRY, payload.provenance.adapterId)
    || !adapter || payload.provenance.adapterVersion !== adapter.version) {
    return { verified: false, sale: fallback(), reasons: ['server provenance adapter is unsupported or out of policy'] };
  }
  const timestamp = Date.parse(payload.provenance.acquiredAt);
  const now = options?.now ?? new Date();
  if (!Number.isFinite(timestamp) || timestamp > now.getTime() || now.getTime() - timestamp > (options?.maxAgeMs ?? OBSERVATION_TOKEN_MAX_AGE_MS)) {
    return { verified: false, sale: fallback(), reasons: ['server provenance reference has expired or has an invalid acquisition time'] };
  }
  const hasApproval = Object.prototype.hasOwnProperty.call(payload, 'identityApproval');
  const hashInput = { adapterId: payload.provenance.adapterId, facts: payload.facts, acquiredAt: payload.provenance.acquiredAt };
  const expectedHash = sha256(JSON.stringify(hasApproval ? { ...hashInput, identityApproval: payload.identityApproval } : hashInput));
  if (payload.provenance.payloadHash !== expectedHash) {
    return { verified: false, sale: fallback(), reasons: ['server provenance payload hash is invalid'] };
  }
  let approvalValid = !hasApproval;
  if (hasApproval) {
    try { approvalValid = validApproval(payload.identityApproval!, payload.facts, payload.provenance); }
    catch { approvalValid = false; }
  }
  if (!approvalValid) {
    return { verified: false, sale: fallback(), reasons: ['server identity approval contract or binding is invalid'] };
  }
  const sale = asMarketSale(payload.facts, payload.provenance);
  if (hasApproval) {
    const authority: VerifiedApproval = immutableCopy({ facts: payload.facts, provenance: payload.provenance, approval: payload.identityApproval!,
      verifiedAtWallMs: Date.now(), remainingAgeMs: OBSERVATION_TOKEN_MAX_AGE_MS - (now.getTime() - timestamp) });
    Object.assign(sale, { identityApproval: authority.approval, visualEvidence: authority.approval.decidingEvidence,
      ...(authority.approval.candidateIdentityFields !== undefined ? { normalizedStructuredMetadata: authority.approval.candidateIdentityFields } : {}) });
    verifiedIdentityApprovals.set(sale, authority);
  }
  return { verified: true, sale, provenance: payload.provenance, reasons: payload.facts.validationErrors };
}

/** Adds sealed provenance fields to a server-generated source result without discarding its display fields. */
export function attachCanonicalProvenance<T extends MarketSale>(
  adapterId: AdapterId,
  sales: T[],
  options?: { query?: string | null; acquiredAt?: Date; signingKey?: string; visualRequirement?: VisualRequirement; saleForm?: string | null },
): Array<T & { provenanceToken: string | null; provenance: CanonicalObservationProvenance | null; validationErrors: string[] }> {
  return sales.map((sale) => {
    const sealed = sealCanonicalObservation(adapterId, sale, options);
    return { ...sale, provenanceToken: sealed.provenanceToken, provenance: sealed.provenance, validationErrors: sealed.validationErrors };
  });
}
