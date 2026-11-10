import { buildMarketplaceSearchDefinition } from '../shared/marketplaceSearchDefinition';
import { normalizeMarketplaceCandidate, type MarketplaceCandidate, type MarketplaceConditionEvidence } from '../shared/testAiMarketplaceCandidate';
import { retrieveItemsAttempt, retrievalIssue, unavailableRetrievalAttempt, validateRetrievalRow,
  type RetrievalAttempt, type RetrievalAttemptContext, type RetrievalIssue, type RetrievalRowContract } from '../shared/testAiRetrievalAttempt';
import { captureMercariObservation, captureMercariResponseScrapedAt, encodeMercariRequestedMode, mercariObservedCurrency,
  mercariOriginalMetadata, type MercariListingStatus, type MercariObservationReport, type MercariObservedField,
  type MercariRequestedMode } from '../shared/testAiMercariObservation';
export type { MercariObservedField } from '../shared/testAiMercariObservation';

export type AdditionalSoldCompsInput = {
  title: string;
  category: string;
  grade?: string;
  condition?: string;
  certificationCompany?: string;
  itemDetails?: string;
  itemType?: string;
  statedTradeValue?: number;
  imageUrl?: string;
};

export type AdditionalSoldCompsListing = {
  title: string;
  titleCandidates?: string[];
  itemUrl: string | null;
  saleId: string;
  price: number;
  currency: string | null;
  endedAt: string | null;
  condition: string | null;
  marketplaceCondition?: string | null;
  conditionEvidence?: MarketplaceConditionEvidence;
  imageUrl: string | null;
  imageUrls?: string[];
  sourceId: 'mercari_sold_comps' | 'tcgplayer_sold_comps';
  sourceLabel: string;
  marketplace: 'Mercari' | 'TCGplayer';
  evidenceDisposition: 'warning_review';
  evidenceReasons: string[];
  providerMetadata?: Record<string, unknown>;
  canonicalCandidate?: MarketplaceCandidate;
  rawMetadata?: Record<string, unknown>;
  mercariObservation?: MercariObservationReport;
  observedStatus?: MercariListingStatus;
  listingStatus?: MercariListingStatus;
  requestedMode?: MercariRequestedMode;
  statusIssues?: readonly string[];
  economicIssues?: readonly string[];
  priceContext?: MercariObservationReport['priceContext'];
  saleStatus?: 'active' | 'unknown';
  priceBasis?: 'asking' | 'unknown';
  completedStatusBasis?: null;
  date?: null;
};

const SOLD_COMPS_API_URL = 'https://api.sold-comps.com';
const MAX_MERCARI_ITEMS = 100;
const MAX_TCG_PRODUCTS = 4;
const MAX_FALLBACK_QUERIES = 3;
const REQUEST_TIMEOUT_MS = 10_000;
const MERCARI_RETRIEVAL_BUDGET_MS = 40_000;

/** Explicit options bypass environment access, including when apiKey is null. */
export type AdditionalSoldCompsOptions = { apiKey: string | null };
export type MercariReviewOpportunity = { supported: boolean; eligibleCount: number };
/** Server-only synchronous preparation seam. No network, models or other side effects. */
export type MercariSoldCompsReviewOptions = {
  /** Owned by this invocation, never provider echoes or browser listing metadata. */
  requestedMode?: MercariRequestedMode;
  reviewOpportunity?: (listings: readonly AdditionalSoldCompsListing[]) => MercariReviewOpportunity;
  /** Optional absolute server deadline, clamped to invocation start + 40 seconds. */
  retrievalDeadlineAt?: number;
  /** Server-owned clock injection for synthetic tests; unused in legacy mode. */
  now?: () => number;
};
export type MercariReviewOpportunityDiagnostics = {
  supported: boolean | null;
  eligibleCount: number | null;
  stopReason: 'eligible_review_opportunity' | 'unsupported_context' | 'queries_exhausted' | 'processing_error' | 'retrieval_deadline';
  retrievalDeadlineAt: number | null;
  evaluations: Array<{ attempt: number; supported: boolean; eligibleCount: number }>;
  processingIssues: Array<{ attempt: number; code: 'callback_exception' | 'callback_async' | 'callback_invalid' | 'clock_invalid'; message: string }>;
};
export type MercariObservedFacts = Readonly<{
  /** Effective status for existing ingress compatibility; direct observation stays separate. */
  status: MercariListingStatus;
  observedStatus: MercariListingStatus;
  listingStatus: MercariListingStatus;
  requestedMode: MercariRequestedMode;
  fields: MercariObservationReport['fields'];
  report: MercariObservationReport;
}>;
// Not transported, not attached to metadata and not populated by the public normalizer.
const mercariObservedFacts = new WeakMap<object, MercariObservedFacts>();

/** Fresh adapter object identities only: copies, provider claims and other normalizers return null. */
export function getMercariObservedFacts(listing: unknown): MercariObservedFacts | null {
  return listing !== null && typeof listing === 'object' ? mercariObservedFacts.get(listing) ?? null : null;
}

function ownedMercariFacts(report: MercariObservationReport): MercariObservedFacts {
  return Object.freeze({ status: report.listingStatus, observedStatus: report.observedStatus,
    listingStatus: report.listingStatus, requestedMode: report.requestedMode, fields: report.fields, report });
}

const MERCARI_ROW: RetrievalRowContract = { idFields: ['itemId'], titleFields: ['title'], priceFields: ['price'] };
const TCG_PRODUCT_ROW: RetrievalRowContract = { idFields: ['productId'], titleFields: ['name'] };
const TCG_SALE_ROW: RetrievalRowContract = { priceFields: ['price'], dateFields: ['soldDate'] };

function getApiKey(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.SOLD_COMPS_API_KEY || env.SOLID_COMPS_API_KEY || null;
}

function requestHeaders(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}` };
}

function getItems(path: string, apiKey: string, fetchImpl: typeof fetch, context: RetrievalAttemptContext, contract: RetrievalRowContract,
  timeoutMs = REQUEST_TIMEOUT_MS) {
  return retrieveItemsAttempt(() => fetchImpl(`${SOLD_COMPS_API_URL}${path}`, {
    headers: requestHeaders(apiKey),
    signal: AbortSignal.timeout(timeoutMs),
  }), context, contract);
}

function getMercariItems(path: string, apiKey: string, fetchImpl: typeof fetch, context: RetrievalAttemptContext,
  timeoutMs: number, observeBody: (body: unknown) => void) {
  return retrieveItemsAttempt(async () => {
    const response = await fetchImpl(`${SOLD_COMPS_API_URL}${path}`, {
      headers: requestHeaders(apiKey),
      signal: AbortSignal.timeout(timeoutMs),
    });
    return { ok: response.ok, status: response.status, json: async () => {
      const body: unknown = await response.json();
      observeBody(body);
      return body;
    } };
  }, context, MERCARI_ROW);
}

function queryKeyword(input: AdditionalSoldCompsInput): string {
  return buildMarketplaceSearchDefinition(input).query;
}

function vintageToyMercariFallbacks(input: AdditionalSoldCompsInput): string[] {
  if (input.category.trim().toLowerCase().replace(/[- ]+/g, '_') !== 'vintage_toys') return [];
  let details: Record<string, unknown> = {};
  try {
    const parsed = input.itemDetails ? JSON.parse(input.itemDetails) : {};
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) details = parsed as Record<string, unknown>;
  } catch {
    details = {};
  }
  const value = (...keys: string[]) => keys.map((key) => String(details[key] ?? '').trim()).find(Boolean) ?? '';
  const toyIdentity = value('vehicleName', 'toyName', 'toyNameCharacter', 'playsetName', 'gamePuzzleName', 'modelKitName');
  const franchise = value('brand', 'franchise');
  if (!toyIdentity) return [];
  return [
    [toyIdentity, franchise].filter(Boolean).join(' '),
    toyIdentity,
  ];
}

function queryCandidates(input: AdditionalSoldCompsInput): string[] {
  const definition = buildMarketplaceSearchDefinition(input);
  return [definition.query, ...vintageToyMercariFallbacks(input), ...definition.fallbackQueries]
    .filter((candidate, index, candidates) => candidate && candidates.indexOf(candidate) === index)
    .slice(0, MAX_FALLBACK_QUERIES + 1);
}

function uniqueByKey<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = key(item);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

export function normalizeMercariSoldCandidate(item: unknown, requestedMode: MercariRequestedMode = 'sold'): AdditionalSoldCompsListing | null {
  return normalizeMercariObservedCandidate(item, captureMercariObservation(item, requestedMode));
}

function normalizeMercariObservedCandidate(row: unknown, report: MercariObservationReport): AdditionalSoldCompsListing | null {
  if (row === null || typeof row !== 'object') return null;
  // Keep the existing scalar validator; never invoke a provider getter to feed it.
  const scalars: Record<string, unknown> = {};
  for (const key of ['itemId', 'title', 'price']) {
    const descriptor = Object.getOwnPropertyDescriptor(row, key);
    if (!descriptor || !('value' in descriptor)) return null;
    scalars[key] = descriptor.value;
  }
  if (validateRetrievalRow(scalars, MERCARI_ROW).length) return null;
  const item = mercariOriginalMetadata(report);
  const price = Number(scalars.price);
  const currency = mercariObservedCurrency(report);
  const saleStatus = report.listingStatus === 'active' ? 'active' as const : 'unknown' as const;
  const priceBasis = report.listingStatus === 'active' ? 'asking' as const : 'unknown' as const;
  const imageValues = [
    ...(Array.isArray(item.images) ? item.images : []),
    ...(Array.isArray(item.photos) ? item.photos : []),
    ...(Array.isArray(item.imageUrls) ? item.imageUrls : []),
    ...(Array.isArray(item.galleryImages) ? item.galleryImages : []),
    ...(Array.isArray(item.gallery) ? item.gallery : []),
    ...(Array.isArray(item.galleryUrls) ? item.galleryUrls : []),
    item.imageUrl,
    item.thumbnailUrl,
  ];
  const canonicalCandidate = normalizeMarketplaceCandidate({
    ...item,
    sourceId: 'mercari_sold_comps',
    sourceLabel: 'Sold-Comps (Mercari Listings)',
    title: scalars.title,
    listingTitle: item.listingTitle,
    name: item.name,
    itemId: scalars.itemId,
    saleId: `mercari:${String(scalars.itemId)}`,
    url: item.url,
    itemUrl: item.itemUrl,
    price,
    currency,
    soldCurrency: null,
    date: null,
    endedAt: null,
    saleStatus,
    priceBasis,
    completedStatusBasis: null,
    marketplace: 'Mercari',
    originMarketplace: 'Mercari',
    condition: item.condition,
    marketplaceCondition: item.condition,
    description: item.description,
    imageUrls: imageValues,
  }, {
    sourceId: 'mercari_sold_comps',
    sourceLabel: 'Sold-Comps (Mercari Listings)',
    marketplace: 'Mercari',
    originMarketplace: 'Mercari',
    rawMetadata: item,
    saleStatus,
    priceBasis,
    valuation: { disposition: 'context_only', reasons: ['Mercari final price and sale-event date remain unverified.'] },
  });
  // Shared normalizers may use nullish aliases; enforce Mercari's explicit original economics.
  canonicalCandidate.currency = currency;
  canonicalCandidate.date = null;
  Object.assign(canonicalCandidate, { endedAt: null, completedStatusBasis: null });
  return {
    title: canonicalCandidate.title,
    titleCandidates: canonicalCandidate.titleCandidates,
    itemUrl: canonicalCandidate.url,
    saleId: `mercari:${String(scalars.itemId)}`,
    price: canonicalCandidate.price ?? price,
    currency,
    endedAt: null,
    date: null,
    saleStatus,
    priceBasis,
    completedStatusBasis: null,
    condition: canonicalCandidate.marketplaceCondition,
    marketplaceCondition: canonicalCandidate.marketplaceCondition,
    conditionEvidence: canonicalCandidate.conditionEvidence,
    imageUrl: canonicalCandidate.imageUrl,
    imageUrls: canonicalCandidate.imageUrls,
    sourceId: 'mercari_sold_comps',
    sourceLabel: 'Sold-Comps (Mercari Listings)',
    marketplace: 'Mercari',
    evidenceDisposition: 'warning_review',
    evidenceReasons: ['Mercari listings remain context/review only; final price, sale-event date and signed admission are unverified.',
      ...report.statusIssues, ...report.economicIssues],
    mercariObservation: report,
    observedStatus: report.observedStatus,
    listingStatus: report.listingStatus,
    requestedMode: report.requestedMode,
    statusIssues: report.statusIssues,
    economicIssues: report.economicIssues,
    priceContext: report.priceContext,
    rawMetadata: item,
    providerMetadata: Object.freeze({
      ...item,
      providerCondition: item.condition,
    }),
    canonicalCandidate,
  };
}

function tcgplayerListing(product: any, sale: any, index: number): AdditionalSoldCompsListing | null {
  if (validateRetrievalRow(product, TCG_PRODUCT_ROW).length || validateRetrievalRow(sale, TCG_SALE_ROW).length) return null;
  const price = Number(sale?.price);
  const soldDate = typeof sale?.soldDate === 'string' && sale.soldDate.trim() ? sale.soldDate : null;
  return {
    title: [product.name, product.setName, product.number].filter(Boolean).join(' — '),
    itemUrl: typeof product.url === 'string' ? product.url : null,
    saleId: `tcgplayer:${String(product.productId)}:${soldDate || index}:${price}`,
    price,
    currency: 'USD',
    endedAt: soldDate,
    condition: typeof sale.condition === 'string' ? sale.condition : null,
    imageUrl: typeof product.imageUrl === 'string' ? product.imageUrl : null,
    sourceId: 'tcgplayer_sold_comps',
    sourceLabel: 'Sold-Comps (TCGplayer Sold)',
    marketplace: 'TCGplayer',
    evidenceDisposition: 'warning_review',
    evidenceReasons: ['SoldComps TCGplayer sales are available for Pokémon testing but remain context-only until provider-specific identity, printing, language, and signed-admission review is complete.'],
    providerMetadata: {
      productId: product.productId,
      setName: product.setName,
      setCode: product.setCode,
      number: product.number,
      rarity: product.rarity,
      productLine: product.productLine,
      variant: sale.variant,
      language: sale.language,
      quantity: sale.quantity,
      shippingPrice: sale.shippingPrice,
      listingType: sale.listingType,
    },
  };
}

function unavailable(query: string, provider: 'mercari' | 'tcgplayer', outcome: 'config_unavailable' | 'input_unsupported', error: string) {
  const receipt = unavailableRetrievalAttempt({ query, stage: 'search', attempt: 1 }, outcome);
  return { query, provider, listings: [] as AdditionalSoldCompsListing[], metrics: null, error, received: 0,
    retrievalCoverage: [receipt], attemptIssues: [receipt] as RetrievalIssue[], partial: false,
    hasNextPage: false, productsMatched: 0, productsReviewed: 0 };
}

function retainNormalizedRows(
  rows: Record<string, unknown>[], receipt: RetrievalAttempt, retained: AdditionalSoldCompsListing[],
  normalize: (row: Record<string, unknown>, index: number) => AdditionalSoldCompsListing | null,
  preserveTransportOutcome = false,
) {
  if (receipt.accepted === null) return;
  receipt.normalized = 0;
  receipt.normalizationRejected = 0;
  for (const [index, row] of rows.entries()) {
    try {
      const listing = normalize(row, index);
      if (!listing) throw new Error('Row normalization unavailable');
      retained.push(listing);
      receipt.normalized += 1;
    } catch {
      // Safe bounded summary only; metadata exceptions cannot reset earlier rows.
      receipt.normalizationRejected += 1;
      receipt.rejectionCounts.normalization_failure = (receipt.rejectionCounts.normalization_failure ?? 0) + 1;
    }
  }
  if (receipt.normalizationRejected > 0) {
    receipt.message = 'Sold-Comps provider rows failed normalization';
    if (receipt.normalized === 0 && !preserveTransportOutcome) {
      receipt.status = 'error';
      receipt.outcome = 'row_rejection';
    }
  }
}

export type MercariReturnedPopulations = Readonly<{
  soldListings: readonly AdditionalSoldCompsListing[];
  activeListings: readonly AdditionalSoldCompsListing[];
  unknownListings: readonly AdditionalSoldCompsListing[];
}>;
type MercariRetrievalAttempt = RetrievalAttempt & { requestedMode: MercariRequestedMode; responseScrapedAt?: MercariObservedField };
function mercariReturnedPopulations(listings: readonly AdditionalSoldCompsListing[]): MercariReturnedPopulations {
  const soldListings: AdditionalSoldCompsListing[] = [];
  const activeListings: AdditionalSoldCompsListing[] = [];
  const unknownListings: AdditionalSoldCompsListing[] = [];
  for (const listing of listings) {
    const status = getMercariObservedFacts(listing)?.listingStatus ?? 'unknown';
    (status === 'sold' ? soldListings : status === 'active' ? activeListings : unknownListings).push(listing);
  }
  return Object.freeze({ soldListings: Object.freeze(soldListings), activeListings: Object.freeze(activeListings),
    unknownListings: Object.freeze(unknownListings) });
}
function mercariUnavailable(query: string, outcome: 'config_unavailable' | 'input_unsupported', error: string,
  requestedMode: MercariRequestedMode, reviewOpportunity: MercariReviewOpportunityDiagnostics | null) {
  const result = unavailable(query, 'mercari', outcome, error);
  const receipt: MercariRetrievalAttempt = { ...result.retrievalCoverage[0], requestedMode };
  return { ...result, requestedMode, returnedPopulations: mercariReturnedPopulations(result.listings),
    retrievalCoverage: [receipt], attemptIssues: [receipt], reviewOpportunity };
}

export async function lookupMercariSoldComps(input: AdditionalSoldCompsInput, fetchImpl: typeof fetch = fetch,
  options?: AdditionalSoldCompsOptions, reviewOptions?: MercariSoldCompsReviewOptions) {
  const requestedMode: MercariRequestedMode = reviewOptions?.requestedMode === 'active' ? 'active' : 'sold';
  // Only callback mode has an aggregate deadline. Capture its start before query/config work.
  const callback = reviewOptions?.reviewOpportunity;
  const callbackMode = callback !== undefined;
  const clock = reviewOptions?.now ?? Date.now;
  const reviewOpportunity: MercariReviewOpportunityDiagnostics | null = callbackMode ? {
    supported: null, eligibleCount: null, stopReason: 'queries_exhausted', retrievalDeadlineAt: null,
    evaluations: [], processingIssues: [],
  } : null;
  const processingIssue = (code: MercariReviewOpportunityDiagnostics['processingIssues'][number]['code'], attempt: number) => {
    if (!reviewOpportunity) return;
    reviewOpportunity.supported = null;
    reviewOpportunity.eligibleCount = null;
    reviewOpportunity.stopReason = 'processing_error';
    reviewOpportunity.processingIssues.push({ attempt, code, message: 'Mercari review-opportunity processing unavailable' });
  };
  let deadlineAt: number | null = null;
  if (callbackMode) {
    try {
      const startedAt = clock();
      if (!Number.isFinite(startedAt)) throw new Error('Invalid clock');
      const supplied = reviewOptions?.retrievalDeadlineAt;
      if (supplied !== undefined && !Number.isFinite(supplied)) throw new Error('Invalid deadline');
      deadlineAt = Math.min(startedAt + MERCARI_RETRIEVAL_BUDGET_MS, supplied ?? Infinity);
      if (!Number.isFinite(deadlineAt)) throw new Error('Invalid deadline');
      reviewOpportunity!.retrievalDeadlineAt = deadlineAt;
    } catch {
      processingIssue('clock_invalid', 0);
    }
  }
  const apiKey = options ? options.apiKey : getApiKey();
  const keywords = queryCandidates(input);
  const keyword = keywords[0] ?? queryKeyword(input);
  if (!apiKey) return mercariUnavailable(keyword, 'config_unavailable', 'Sold-Comps API key not configured', requestedMode, reviewOpportunity);
  if (!keyword) return mercariUnavailable(keyword, 'input_unsupported', 'A title is required for Mercari Sold-Comps lookup', requestedMode, reviewOpportunity);
  // Keep both normalized progress and history outside the fallible request boundary.
  const executedQueries: string[] = [];
  const retrievalCoverage: MercariRetrievalAttempt[] = [];
  const attemptIssues: RetrievalIssue[] = [];
  const retained: AdditionalSoldCompsListing[] = [];
  let hasNextPage = false;
  for (const candidate of keywords) {
    let timeoutMs = REQUEST_TIMEOUT_MS;
    if (reviewOpportunity) {
      if (reviewOpportunity.stopReason === 'processing_error') break;
      try {
        const current = clock();
        if (!Number.isFinite(current)) throw new Error('Invalid clock');
        const remaining = Math.floor(deadlineAt! - current);
        if (remaining <= 0) {
          reviewOpportunity.stopReason = 'retrieval_deadline';
          break;
        }
        timeoutMs = Math.min(REQUEST_TIMEOUT_MS, remaining);
      } catch {
        processingIssue('clock_invalid', retrievalCoverage.length);
        break;
      }
    }
    const params = new URLSearchParams({ keyword: candidate, page: '1', count: String(MAX_MERCARI_ITEMS), sortOrder: 'newest', sold: encodeMercariRequestedMode(requestedMode) });
    executedQueries.push(candidate);
    let responseScrapedAt: MercariObservedField | undefined;
    const result = await getMercariItems(`/v1/mercari?${params.toString()}`, apiKey, fetchImpl,
      { query: candidate, stage: 'search', attempt: retrievalCoverage.length + 1 }, timeoutMs,
      (body) => { responseScrapedAt = captureMercariResponseScrapedAt(body); });
    const receipt: MercariRetrievalAttempt = Object.assign(result.receipt, { requestedMode },
      responseScrapedAt === undefined ? {} : { responseScrapedAt });
    retrievalCoverage.push(receipt);
    retainNormalizedRows(result.items, result.receipt, retained, (row) => {
      // Capture original own fields before normalization; only this adapter owns object authority.
      const report = captureMercariObservation(row, requestedMode, responseScrapedAt);
      const listing = normalizeMercariObservedCandidate(row, report);
      if (listing) mercariObservedFacts.set(listing, ownedMercariFacts(report));
      // Keep invocation identity and the returned first occurrence stable during preparation.
      if (listing && callbackMode) Object.freeze(listing);
      return listing;
    }, callbackMode);
    const issue = retrievalIssue(result.receipt);
    if (issue) attemptIssues.push(issue);
    hasNextPage = hasNextPage || result.hasNextPage;
    if (!reviewOpportunity) {
      // Preserve the legacy MINIMAL-valid stop, including all-normalization-failed batches.
      if (result.items.length > 0) break;
      continue;
    }
    const union = Object.freeze(uniqueByKey(retained, (listing) => listing.saleId));
    const preparationTimeRemaining = () => {
      try {
        const current = clock();
        if (!Number.isFinite(current)) throw new Error('Invalid clock');
        if (current >= deadlineAt!) {
          reviewOpportunity.stopReason = 'retrieval_deadline';
          return false;
        }
        return true;
      } catch {
        processingIssue('clock_invalid', retrievalCoverage.length);
        return false;
      }
    };
    if (!preparationTimeRemaining()) break;
    try {
      // Do not await: asynchronous callbacks are not an approved preparation contract.
      const decision: unknown = callback!(union);
      if (decision instanceof Promise) {
        // Consume rejected native promises without waiting or using any result as authority.
        void Promise.prototype.then.call(decision, undefined, () => undefined);
        processingIssue('callback_async', retrievalCoverage.length);
        break;
      }
      if (decision === null || typeof decision !== 'object' || Array.isArray(decision)) {
        processingIssue('callback_invalid', retrievalCoverage.length);
        break;
      }
      if ('then' in decision) {
        processingIssue('callback_async', retrievalCoverage.length);
        break;
      }
      const supported = Object.getOwnPropertyDescriptor(decision, 'supported');
      const eligibleCount = Object.getOwnPropertyDescriptor(decision, 'eligibleCount');
      if (!supported || !('value' in supported) || typeof supported.value !== 'boolean'
        || !eligibleCount || !('value' in eligibleCount) || !Number.isSafeInteger(eligibleCount.value)
        || eligibleCount.value < 0 || eligibleCount.value > union.length
        || (!supported.value && eligibleCount.value !== 0)) {
        processingIssue('callback_invalid', retrievalCoverage.length);
        break;
      }
      reviewOpportunity.supported = supported.value;
      reviewOpportunity.eligibleCount = eligibleCount.value;
      reviewOpportunity.evaluations.push({ attempt: retrievalCoverage.length, supported: supported.value, eligibleCount: eligibleCount.value });
      if (!preparationTimeRemaining()) break;
      // Unsupported/context-only workflows retain their existing bounded minimal-progress stop.
      if (!supported.value && result.items.length > 0) {
        reviewOpportunity.stopReason = 'unsupported_context';
        break;
      }
      if (supported.value && eligibleCount.value > 0) {
        reviewOpportunity.stopReason = 'eligible_review_opportunity';
        break;
      }
    } catch {
      // Never reclassify HTTP success/counts as callback failure or expose exception prose.
      processingIssue('callback_exception', retrievalCoverage.length);
      break;
    }
  }
  const listings = uniqueByKey(retained, (listing) => listing.saleId);
  const partial = listings.length > 0 && (attemptIssues.length > 0
    || (reviewOpportunity?.processingIssues.length ?? 0) > 0 || reviewOpportunity?.stopReason === 'retrieval_deadline');
  return {
    query: keyword, listings, requestedMode, returnedPopulations: mercariReturnedPopulations(listings),
    metrics: { executedQueries, fallbackQueriesUsed: executedQueries.slice(1), retrievalCoverage, attemptIssues, partial, reviewOpportunity, requestedMode },
    error: listings.length > 0 ? null : attemptIssues.at(-1)?.message ?? null,
    provider: 'mercari', received: listings.length, hasNextPage,
    retrievalCoverage, attemptIssues, partial, reviewOpportunity,
  };
}

export async function lookupTcgplayerSoldComps(input: AdditionalSoldCompsInput, fetchImpl: typeof fetch = fetch, options?: AdditionalSoldCompsOptions) {
  const keywords = queryCandidates(input);
  const keyword = keywords[0] ?? queryKeyword(input);
  if (input.category.trim().toLowerCase().replace(/[_-]+/g, ' ') !== 'pokemon') {
    return unavailable(keyword, 'tcgplayer', 'input_unsupported', 'Sold-Comps TCGplayer is available for Pokémon only');
  }
  const apiKey = options ? options.apiKey : getApiKey();
  if (!apiKey) return unavailable(keyword, 'tcgplayer', 'config_unavailable', 'Sold-Comps API key not configured');
  if (!keyword) return unavailable(keyword, 'tcgplayer', 'input_unsupported', 'A title is required for TCGplayer Sold-Comps lookup');
  const executedQueries: string[] = [];
  const searchCoverage: RetrievalAttempt[] = [];
  const retrievalCoverage: RetrievalAttempt[] = [];
  const attemptIssues: RetrievalIssue[] = [];
  const listings: AdditionalSoldCompsListing[] = [];
  let products: Record<string, unknown>[] = [];
  for (const candidate of keywords) {
    const searchParams = new URLSearchParams({ keyword: candidate, page: '1', count: String(MAX_TCG_PRODUCTS), sortOrder: 'bestMatch' });
    executedQueries.push(candidate);
    const result = await getItems(`/v1/tcgplayer/search?${searchParams.toString()}`, apiKey, fetchImpl,
      { query: candidate, stage: 'search', attempt: retrievalCoverage.length + 1 }, TCG_PRODUCT_ROW);
    searchCoverage.push(result.receipt);
    retrievalCoverage.push(result.receipt);
    const issue = retrievalIssue(result.receipt);
    if (issue) attemptIssues.push(issue);
    products = result.items.filter((product) => String(product.productLine || '').toLowerCase() === 'pokemon').slice(0, MAX_TCG_PRODUCTS);
    if (products.length > 0) break;
  }
  for (const product of products) {
    const productId = String(product.productId);
    const salesParams = new URLSearchParams({ productId, listingType: 'ListingWithPhotos' });
    const result = await getItems(`/v1/tcgplayer/sales?${salesParams.toString()}`, apiKey, fetchImpl,
      { query: productId, stage: 'product_sales', attempt: retrievalCoverage.length + 1 }, TCG_SALE_ROW);
    retrievalCoverage.push(result.receipt);
    retainNormalizedRows(result.items, result.receipt, listings, (sale, index) => tcgplayerListing(product, sale, index));
    const issue = retrievalIssue(result.receipt);
    if (issue) attemptIssues.push(issue);
    // A later failed product cannot erase earlier normalized sales/history.
    // Preserve the former immediate-stop-on-product-error call schedule.
    if ((result.receipt.status === 'error' && result.receipt.outcome !== 'row_rejection')
      || (result.receipt.normalizationRejected ?? 0) > 0) break;
  }
  const partial = listings.length > 0 && attemptIssues.length > 0;
  return { query: keyword, listings,
    metrics: { executedQueries, fallbackQueriesUsed: executedQueries.slice(1), retrievalCoverage, searchCoverage, attemptIssues, partial },
    error: listings.length > 0 ? null : attemptIssues.at(-1)?.message ?? null,
    provider: 'tcgplayer', productsMatched: products.length,
    productsReviewed: retrievalCoverage.filter((receipt) => receipt.stage === 'product_sales' && receipt.executed).length,
    received: listings.length,
    retrievalCoverage, attemptIssues, partial };
}

export const SOLD_COMPS_ADDITIONAL_LIMITS = { maxMercariItems: MAX_MERCARI_ITEMS, maxTcgProducts: MAX_TCG_PRODUCTS } as const;
