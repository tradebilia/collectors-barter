import { buildMarketplaceSearchDefinition } from '../shared/marketplaceSearchDefinition';
import { normalizeMarketplaceCandidate, type MarketplaceCandidate, type MarketplaceConditionEvidence } from '../shared/testAiMarketplaceCandidate';

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

function getApiKey(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.SOLD_COMPS_API_KEY || env.SOLID_COMPS_API_KEY || null;
}

function requestHeaders(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}` };
}

async function getJson(path: string, apiKey: string, fetchImpl: typeof fetch = fetch): Promise<any> {
  const response = await fetchImpl(`${SOLD_COMPS_API_URL}${path}`, {
    headers: requestHeaders(apiKey),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof body?.message === 'string' ? body.message : `HTTP ${response.status}`;
    throw new Error(`SoldComps provider error: ${message}`);
  }
  return body;
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
  const price = Number(item?.price);
  if (!item?.itemId || !item?.title || !Number.isFinite(price) || price <= 0) return null;
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
  const price = Number(sale?.price);
  const soldDate = typeof sale?.soldDate === 'string' && sale.soldDate.trim() ? sale.soldDate : null;
  if (!product?.productId || !product?.name || !Number.isFinite(price) || price <= 0 || !soldDate) return null;
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

export async function lookupMercariSoldComps(input: AdditionalSoldCompsInput, fetchImpl: typeof fetch = fetch) {
  const apiKey = getApiKey();
  const keywords = queryCandidates(input);
  const keyword = keywords[0] ?? queryKeyword(input);
  if (!apiKey) return { query: keyword, listings: [], metrics: null, error: 'Sold-Comps API key not configured' };
  if (!keyword) return { query: keyword, listings: [], metrics: null, error: 'A title is required for Mercari Sold-Comps lookup' };
  try {
    const executedQueries: string[] = [];
    const retrievalCoverage: Array<{ query: string; received: number; status: 'success' | 'error' }> = [];
    const rawItems: any[] = [];
    let hasNextPage = false;
    let lastError: string | null = null;
    for (const candidate of keywords) {
      const params = new URLSearchParams({ keyword: candidate, page: '1', count: String(MAX_MERCARI_ITEMS), sortOrder: 'newest', sold: 'true' });
      try {
        const data = await getJson(`/v1/mercari?${params.toString()}`, apiKey, fetchImpl);
        const items = Array.isArray(data?.items) ? data.items : [];
        executedQueries.push(candidate);
        retrievalCoverage.push({ query: candidate, received: items.length, status: 'success' });
        hasNextPage = hasNextPage || Boolean(data?.hasNextPage);
        rawItems.push(...items);
        lastError = null;
        if (items.length > 0) break;
      } catch (error) {
        executedQueries.push(candidate);
        retrievalCoverage.push({ query: candidate, received: 0, status: 'error' });
        lastError = error instanceof Error ? error.message : 'Mercari Sold-Comps lookup failed';
        if (rawItems.length > 0) break;
      }
    }
    const listings = uniqueByKey(rawItems.map(mercariListing).filter(Boolean) as AdditionalSoldCompsListing[], (listing) => listing.saleId);
    return {
      query: keyword,
      listings,
      metrics: { executedQueries, fallbackQueriesUsed: executedQueries.slice(1), retrievalCoverage },
      error: listings.length > 0 ? null : lastError,
      provider: 'mercari',
      received: listings.length,
      hasNextPage,
    };
  } catch (error) {
    return { query: keyword, listings: [], metrics: null, error: error instanceof Error ? error.message : 'Mercari Sold-Comps lookup failed' };
  }
}

export async function lookupTcgplayerSoldComps(input: AdditionalSoldCompsInput, fetchImpl: typeof fetch = fetch) {
  const apiKey = getApiKey();
  const keywords = queryCandidates(input);
  const keyword = keywords[0] ?? queryKeyword(input);
  if (input.category.trim().toLowerCase().replace(/[_-]+/g, ' ') !== 'pokemon') {
    return { query: keyword, listings: [], metrics: null, error: 'Sold-Comps TCGplayer is available for Pokémon only' };
  }
  if (!apiKey) return { query: keyword, listings: [], metrics: null, error: 'Sold-Comps API key not configured' };
  if (!keyword) return { query: keyword, listings: [], metrics: null, error: 'A title is required for TCGplayer Sold-Comps lookup' };
  try {
    const executedQueries: string[] = [];
    const retrievalCoverage: Array<{ query: string; received: number; status: 'success' | 'error' }> = [];
    let products: any[] = [];
    let lastError: string | null = null;
    for (const candidate of keywords) {
      const searchParams = new URLSearchParams({ keyword: candidate, page: '1', count: String(MAX_TCG_PRODUCTS), sortOrder: 'bestMatch' });
      try {
        const search = await getJson(`/v1/tcgplayer/search?${searchParams.toString()}`, apiKey, fetchImpl);
        executedQueries.push(candidate);
        products = (Array.isArray(search?.items) ? search.items : []).filter((product: any) => String(product?.productLine || '').toLowerCase() === 'pokemon').slice(0, MAX_TCG_PRODUCTS);
        retrievalCoverage.push({ query: candidate, received: products.length, status: 'success' });
        lastError = null;
        if (products.length > 0) break;
      } catch (error) {
        executedQueries.push(candidate);
        retrievalCoverage.push({ query: candidate, received: 0, status: 'error' });
        lastError = error instanceof Error ? error.message : 'TCGplayer Sold-Comps lookup failed';
      }
    }
    const listings: AdditionalSoldCompsListing[] = [];
    for (const product of products) {
      const salesParams = new URLSearchParams({ productId: String(product.productId), listingType: 'ListingWithPhotos' });
      const sales = await getJson(`/v1/tcgplayer/sales?${salesParams.toString()}`, apiKey, fetchImpl);
      for (const [index, sale] of (Array.isArray(sales?.items) ? sales.items : []).entries()) {
        const listing = tcgplayerListing(product, sale, index);
        if (listing) listings.push(listing);
      }
    }
    return { query: keyword, listings, metrics: { executedQueries, fallbackQueriesUsed: executedQueries.slice(1), retrievalCoverage }, error: listings.length > 0 ? null : lastError, provider: 'tcgplayer', productsReviewed: products.length, received: listings.length };
  } catch (error) {
    return { query: keyword, listings: [], metrics: null, error: error instanceof Error ? error.message : 'TCGplayer Sold-Comps lookup failed' };
  }
}

export const SOLD_COMPS_ADDITIONAL_LIMITS = { maxMercariItems: MAX_MERCARI_ITEMS, maxTcgProducts: MAX_TCG_PRODUCTS } as const;
