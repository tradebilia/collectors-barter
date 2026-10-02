import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { ENV } from './_core/env';
import type { MarketSale } from './testAiComparableEngine';

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

type AdapterId =
  | 'sold_comps'
  | 'the_card_api'
  | 'cardsight_ai'
  | 'lelands'
  | 'pristine_auction'
  | 'pcgs_auction_results'
  | '130point'
  | 'ngc'
  | 'cng'
  | 'rumsey'
  | 'cherrystone'
  | 'raritan'
  | 'morphy'
  | 'theriaults'
  | 'poster_auctions'
  | 'bonhams'
  | 'comicconnect'
  | 'university_archives'
  | 'swann'
  | 'rr_auction'
  | 'alexander_historical'
  | 'goldin'
  | 'weiss'
  | 'stephen_album'
  | 'nate_sanders'
  | 'tcgplayer_reef'
  | 'catawiki_reef'
  | 'auctionet'
  | 'comic_book_realm'
  | 'coin_archives'
  | 'bertoia'
  | 'heritage'
  | 'hakes';

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
  cng: { id: 'cng', label: 'CNG Past Auctions', version: '1.0.0', defaultOriginMarketplace: 'cng', defaultPriceBasis: 'closed', completedStatusBasis: 'CNG individually explicit Sold For lot' },
  rumsey: { id: 'rumsey', label: 'Rumsey Auction Results', version: '1.0.0', defaultOriginMarketplace: 'rumsey', defaultPriceBasis: 'closed', completedStatusBasis: 'Rumsey Prices Realized lot join' },
  cherrystone: { id: 'cherrystone', label: 'Cherrystone Realizations', version: '1.0.0', defaultOriginMarketplace: 'cherrystone', defaultPriceBasis: 'unknown', completedStatusBasis: 'Cherrystone Price Realized result' },
  raritan: { id: 'raritan', label: 'Raritan Past Auctions', version: '1.0.0', defaultOriginMarketplace: 'raritan', defaultPriceBasis: 'closed', completedStatusBasis: 'Raritan Prices Realized auction table' },
  morphy: { id: 'morphy', label: 'Morphy Auctions', version: '1.0.0', defaultOriginMarketplace: 'morphy', defaultPriceBasis: 'closed', completedStatusBasis: 'Morphy closed lot final price' },
  theriaults: { id: 'theriaults', label: "Theriault's Archive", version: '1.0.0', defaultOriginMarketplace: 'theriaults', defaultPriceBasis: 'unknown', completedStatusBasis: "Theriault's archived Sold listing" },
  poster_auctions: { id: 'poster_auctions', label: 'Poster Auctions International', version: '1.0.0', defaultOriginMarketplace: 'poster_auctions', defaultPriceBasis: 'closed', completedStatusBasis: 'Poster Auctions completed lot result' },
  bonhams: { id: 'bonhams', label: 'Bonhams Popular Culture', version: '1.0.0', defaultOriginMarketplace: 'bonhams', defaultPriceBasis: 'closed', completedStatusBasis: 'Bonhams completed lot result' },
  comicconnect: { id: 'comicconnect', label: 'ComicConnect Sold Archive', version: '1.1.0', defaultOriginMarketplace: 'comicconnect', defaultPriceBasis: 'sold', completedStatusBasis: 'ComicConnect sold archive record with explicit sold amount and date' },
  university_archives: { id: 'university_archives', label: 'University Archives', version: '1.0.0', defaultOriginMarketplace: 'university_archives', defaultPriceBasis: 'unknown', completedStatusBasis: 'University Archives sold lot' },
  swann: { id: 'swann', label: 'Swann Galleries', version: '1.0.0', defaultOriginMarketplace: 'swann', defaultPriceBasis: 'closed', completedStatusBasis: 'Swann closed lot result' },
  rr_auction: { id: 'rr_auction', label: 'RR Auction', version: '1.0.0', defaultOriginMarketplace: 'rr_auction', defaultPriceBasis: 'closed', completedStatusBasis: 'RR Auction closed lot result' },
  alexander_historical: { id: 'alexander_historical', label: 'Alexander Historical Auctions', version: '1.0.0', defaultOriginMarketplace: 'alexander_historical', defaultPriceBasis: 'unknown', completedStatusBasis: 'Alexander Historical completed lot' },
  goldin: { id: 'goldin', label: 'Goldin Video Game Auctions', version: '1.0.0', defaultOriginMarketplace: 'goldin', defaultPriceBasis: 'unknown', completedStatusBasis: 'Goldin Lot Sold record' },
  weiss: { id: 'weiss', label: 'Weiss Auctions', version: '1.0.0', defaultOriginMarketplace: 'weiss', defaultPriceBasis: 'realized', completedStatusBasis: 'Weiss completed-webcast final leading bid' },
  stephen_album: { id: 'stephen_album', label: 'Stephen Album Rare Coins', version: '1.0.0', defaultOriginMarketplace: 'stephen_album', defaultPriceBasis: 'realized', completedStatusBasis: 'Stephen Album SOLD lot with hammer and buyer-premium separation' },
  nate_sanders: { id: 'nate_sanders', label: 'Nate D. Sanders Auctions', version: '1.0.0', defaultOriginMarketplace: 'nate_sanders', defaultPriceBasis: 'closed', completedStatusBasis: 'Nate D. Sanders closed lot with final price including buyer premium' },
  tcgplayer_reef: { id: 'tcgplayer_reef', label: 'TCGplayer via ReefAPI', version: '1.0.0', defaultOriginMarketplace: 'tcgplayer', defaultPriceBasis: 'sold', completedStatusBasis: 'TCGplayer latest-sale record returned by ReefAPI' },
  catawiki_reef: { id: 'catawiki_reef', label: 'Catawiki via ReefAPI', version: '1.0.0', defaultOriginMarketplace: 'catawiki', defaultPriceBasis: 'closed', completedStatusBasis: 'Catawiki sold lot with explicit sold_price returned by ReefAPI' },
  auctionet: { id: 'auctionet', label: 'Auctionet', version: '1.0.0', defaultOriginMarketplace: 'auctionet', defaultPriceBasis: 'closed', completedStatusBasis: 'Auctionet ended search record with Hammered status and USD amount' },
  comic_book_realm: { id: 'comic_book_realm', label: 'Comic Book Realm CGC Analyzer', version: '1.0.0', defaultOriginMarketplace: 'comic_book_realm', defaultPriceBasis: 'unknown', completedStatusBasis: 'Aggregated CGC guide estimate; never an individual completed sale' },
  coin_archives: { id: 'coin_archives', label: 'CoinArchives', version: '1.0.0', defaultOriginMarketplace: 'coin_archives', defaultPriceBasis: 'unknown', completedStatusBasis: 'CoinArchives completed lot record' },
  bertoia: { id: 'bertoia', label: 'Bertoia Auctions', version: '1.0.0', defaultOriginMarketplace: 'bertoia', defaultPriceBasis: 'unknown', completedStatusBasis: 'Bertoia completed lot or catalog record' },
  heritage: { id: 'heritage', label: 'Heritage Auction Archives', version: '1.0.0', defaultOriginMarketplace: 'heritage', defaultPriceBasis: 'unknown', completedStatusBasis: 'Heritage completed lot result' },
  hakes: { id: 'hakes', label: "Hake's Auction Results", version: '1.0.0', defaultOriginMarketplace: 'hakes', defaultPriceBasis: 'unknown', completedStatusBasis: "Hake's completed lot result" },
};

export type CanonicalObservationFacts = {
  title: string | null;
  price: number | null;
  currency: string | null;
  date: string | null;
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
};

export type SealedMarketObservation = {
  provenanceToken: string | null;
  provenance: CanonicalObservationProvenance | null;
  validationErrors: string[];
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
  if (!facts.date) facts.validationErrors.push('provider record is missing a valid sale date');
  if (!facts.sourceRecordId && !facts.canonicalUrl) facts.validationErrors.push('provider record is missing both a provider record ID and canonical URL');
  return facts;
}

function asMarketSale(facts: CanonicalObservationFacts, provenance: CanonicalObservationProvenance): MarketSale {
  const reasons = [...facts.evidenceReasons, ...facts.validationErrors];
  const recency = facts.date ? (Date.now() - Date.parse(facts.date) <= 365 * 86_400_000 ? 'recent' : 'historical') : 'undated';
  return {
    title: facts.title,
    price: facts.price,
    currency: facts.currency,
    date: facts.date,
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
  options?: { query?: string | null; acquiredAt?: Date; signingKey?: string; visualRequirement?: VisualRequirement; saleForm?: string | null; lotQuantity?: number | null },
): SealedMarketObservation {
  const adapter = CANONICAL_ADAPTER_REGISTRY[adapterId];
  const facts = normalizedFacts(adapter, sale, options);
  const canonicalTransactionId = facts.canonicalUrl
    ? `url:${facts.canonicalUrl}`
    : facts.sourceRecordId
      ? `record:${adapterId}:${normalizeKey(facts.sourceRecordId)}`
      : null;
  const acquiredAt = (options?.acquiredAt ?? new Date()).toISOString();
  const provenance: CanonicalObservationProvenance = {
    version: CANONICAL_OBSERVATION_VERSION,
    policyVersion: CANONICAL_OBSERVATION_POLICY_VERSION,
    adapterId,
    adapterVersion: adapter.version,
    originMarketplace: facts.originMarketplace,
    acquiredAt,
    queryFingerprint: sha256(clip(options?.query, 600) ?? ''),
    payloadHash: sha256(JSON.stringify({ adapterId, facts, acquiredAt })),
    canonicalTransactionId,
  };
  const payload: SignedObservationPayload = { version: CANONICAL_OBSERVATION_VERSION, provenance, facts };
  const signingKey = resolveSigningKey(options?.signingKey);
  if (!signingKey) return { provenanceToken: null, provenance, validationErrors: facts.validationErrors };
  const encoded = toBase64Url(JSON.stringify(payload));
  return { provenanceToken: `${encoded}.${tokenSignature(encoded, signingKey)}`, provenance, validationErrors: facts.validationErrors };
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
  const adapter = CANONICAL_ADAPTER_REGISTRY[payload.provenance.adapterId];
  if (!adapter || payload.provenance.adapterVersion !== adapter.version) {
    return { verified: false, sale: fallback(), reasons: ['server provenance adapter is unsupported or out of policy'] };
  }
  const timestamp = Date.parse(payload.provenance.acquiredAt);
  const now = options?.now ?? new Date();
  if (!Number.isFinite(timestamp) || timestamp > now.getTime() || now.getTime() - timestamp > (options?.maxAgeMs ?? OBSERVATION_TOKEN_MAX_AGE_MS)) {
    return { verified: false, sale: fallback(), reasons: ['server provenance reference has expired or has an invalid acquisition time'] };
  }
  const expectedHash = sha256(JSON.stringify({ adapterId: payload.provenance.adapterId, facts: payload.facts, acquiredAt: payload.provenance.acquiredAt }));
  if (payload.provenance.payloadHash !== expectedHash) {
    return { verified: false, sale: fallback(), reasons: ['server provenance payload hash is invalid'] };
  }
  const sale = asMarketSale(payload.facts, payload.provenance);
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
