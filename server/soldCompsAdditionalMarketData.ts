import { buildMarketplaceSearchDefinition } from '../shared/marketplaceSearchDefinition';
import { normalizeMarketplaceCandidate, type MarketplaceCandidate, type MarketplaceConditionEvidence } from '../shared/testAiMarketplaceCandidate';
import { retrieveItemsAttempt, retrievalIssue, unavailableRetrievalAttempt, validateRetrievalRow,
  type RetrievalAttempt, type RetrievalAttemptContext, type RetrievalIssue, type RetrievalRowContract } from '../shared/testAiRetrievalAttempt';

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
  currency: string;
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
};

const SOLD_COMPS_API_URL = 'https://api.sold-comps.com';
const MAX_MERCARI_ITEMS = 100;
const MAX_TCG_PRODUCTS = 4;
const MAX_FALLBACK_QUERIES = 3;
const REQUEST_TIMEOUT_MS = 10_000;

/** Explicit options bypass environment access, including when apiKey is null. */
export type AdditionalSoldCompsOptions = { apiKey: string | null };
const MERCARI_ROW: RetrievalRowContract = { idFields: ['itemId'], titleFields: ['title'], priceFields: ['price'] };
const TCG_PRODUCT_ROW: RetrievalRowContract = { idFields: ['productId'], titleFields: ['name'] };
const TCG_SALE_ROW: RetrievalRowContract = { priceFields: ['price'], dateFields: ['soldDate'] };

function getApiKey(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.SOLD_COMPS_API_KEY || env.SOLID_COMPS_API_KEY || null;
}

function requestHeaders(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}` };
}

function getItems(path: string, apiKey: string, fetchImpl: typeof fetch, context: RetrievalAttemptContext, contract: RetrievalRowContract) {
  return retrieveItemsAttempt(() => fetchImpl(`${SOLD_COMPS_API_URL}${path}`, {
    headers: requestHeaders(apiKey),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }), context, contract);
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

export function normalizeMercariSoldCandidate(item: any): AdditionalSoldCompsListing | null {
  if (validateRetrievalRow(item, MERCARI_ROW).length) return null;
  const price = Number(item?.price);
  const imageValues = [
    ...(Array.isArray(item.images) ? item.images : []),
    ...(Array.isArray(item.photos) ? item.photos : []),
    item.imageUrl,
    item.thumbnailUrl,
  ];
  const canonicalCandidate = normalizeMarketplaceCandidate({
    ...item,
    sourceId: 'mercari_sold_comps',
    sourceLabel: 'Sold-Comps (Mercari Sold)',
    title: item.title,
    listingTitle: item.listingTitle,
    name: item.name,
    itemId: item.itemId,
    saleId: `mercari:${String(item.itemId)}`,
    url: item.url,
    itemUrl: item.itemUrl,
    price,
    soldPrice: price,
    currency: String(item.currency || 'USD').toUpperCase(),
    soldCurrency: String(item.currency || 'USD').toUpperCase(),
    date: item.soldAt,
    endedAt: item.soldAt,
    saleStatus: 'completed',
    priceBasis: 'sold',
    marketplace: 'Mercari',
    originMarketplace: 'Mercari',
    condition: item.condition,
    marketplaceCondition: item.condition,
    description: item.description,
    imageUrls: imageValues,
  }, {
    sourceId: 'mercari_sold_comps',
    sourceLabel: 'Sold-Comps (Mercari Sold)',
    marketplace: 'Mercari',
    originMarketplace: 'Mercari',
    saleStatus: 'completed',
    priceBasis: 'sold',
  });
  return {
    title: canonicalCandidate.title,
    titleCandidates: canonicalCandidate.titleCandidates,
    itemUrl: canonicalCandidate.url,
    saleId: `mercari:${String(item.itemId)}`,
    price: canonicalCandidate.price ?? price,
    currency: canonicalCandidate.currency ?? 'USD',
    endedAt: canonicalCandidate.date,
    condition: canonicalCandidate.marketplaceCondition,
    marketplaceCondition: canonicalCandidate.marketplaceCondition,
    conditionEvidence: canonicalCandidate.conditionEvidence,
    imageUrl: canonicalCandidate.imageUrl,
    imageUrls: canonicalCandidate.imageUrls,
    sourceId: 'mercari_sold_comps',
    sourceLabel: 'Sold-Comps (Mercari Sold)',
    marketplace: 'Mercari',
    evidenceDisposition: 'warning_review',
    evidenceReasons: ['Mercari results are available for testing but remain context-only until provider-specific identity and signed-admission review is complete.'],
    providerMetadata: {
      ...canonicalCandidate.rawMetadata,
      marketplace: item.marketplace,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      brand: item.brand,
      status: item.status,
      providerCondition: item.condition,
    },
    canonicalCandidate,
  };
}

const mercariListing = normalizeMercariSoldCandidate;

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
    if (receipt.normalized === 0) {
      receipt.status = 'error';
      receipt.outcome = 'row_rejection';
    }
  }
}

export async function lookupMercariSoldComps(input: AdditionalSoldCompsInput, fetchImpl: typeof fetch = fetch, options?: AdditionalSoldCompsOptions) {
  const apiKey = options ? options.apiKey : getApiKey();
  const keywords = queryCandidates(input);
  const keyword = keywords[0] ?? queryKeyword(input);
  if (!apiKey) return unavailable(keyword, 'mercari', 'config_unavailable', 'Sold-Comps API key not configured');
  if (!keyword) return unavailable(keyword, 'mercari', 'input_unsupported', 'A title is required for Mercari Sold-Comps lookup');
  // Keep both normalized progress and history outside the fallible request boundary.
  const executedQueries: string[] = [];
  const retrievalCoverage: RetrievalAttempt[] = [];
  const attemptIssues: RetrievalIssue[] = [];
  const retained: AdditionalSoldCompsListing[] = [];
  let hasNextPage = false;
  for (const candidate of keywords) {
    const params = new URLSearchParams({ keyword: candidate, page: '1', count: String(MAX_MERCARI_ITEMS), sortOrder: 'newest', sold: 'true' });
    executedQueries.push(candidate);
    const result = await getItems(`/v1/mercari?${params.toString()}`, apiKey, fetchImpl,
      { query: candidate, stage: 'search', attempt: retrievalCoverage.length + 1 }, MERCARI_ROW);
    retrievalCoverage.push(result.receipt);
    retainNormalizedRows(result.items, result.receipt, retained, mercariListing);
    const issue = retrievalIssue(result.receipt);
    if (issue) attemptIssues.push(issue);
    hasNextPage = hasNextPage || result.hasNextPage;
    // Approved stop is MINIMAL valid provider progress, not score/image/economic admission.
    // An all-invalid raw array advances only through the existing bounded query list.
    if (result.items.length > 0) break;
  }
  const listings = uniqueByKey(retained, (listing) => listing.saleId);
  const partial = listings.length > 0 && attemptIssues.length > 0;
  return {
    query: keyword, listings,
    metrics: { executedQueries, fallbackQueriesUsed: executedQueries.slice(1), retrievalCoverage, attemptIssues, partial },
    error: listings.length > 0 ? null : attemptIssues.at(-1)?.message ?? null,
    provider: 'mercari', received: listings.length, hasNextPage,
    retrievalCoverage, attemptIssues, partial,
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
