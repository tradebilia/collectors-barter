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
  itemUrl: string | null;
  saleId: string;
  price: number;
  currency: string;
  endedAt: string | null;
  condition: string | null;
  imageUrl: string | null;
  sourceId: 'mercari_sold_comps' | 'tcgplayer_sold_comps';
  sourceLabel: string;
  marketplace: 'Mercari' | 'TCGplayer';
  evidenceDisposition: 'warning_review';
  evidenceReasons: string[];
  providerMetadata?: Record<string, unknown>;
};

const SOLD_COMPS_API_URL = 'https://api.sold-comps.com';
const MAX_MERCARI_ITEMS = 100;
const MAX_TCG_PRODUCTS = 4;
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
  const normalizedCategory = input.category.trim().toLowerCase().replace(/[\s-]+/g, '_');
  let details: Record<string, unknown> = {};
  if (typeof input.itemDetails === 'string') {
    try {
      const parsed = JSON.parse(input.itemDetails);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) details = parsed as Record<string, unknown>;
    } catch {
      // Fall back to the title when the stored detail payload is malformed.
    }
  }
  const text = (...keys: string[]) => keys.map((key) => details[key]).find((value) => (typeof value === 'string' || typeof value === 'number') && String(value).trim()) as string | number | undefined;
  if (normalizedCategory === 'coins') {
    const rawGrade = String(input.grade ?? '').trim();
    const usableGrade = /^(?:raw|ungraded|n\/a|none|null|undefined)$/i.test(rawGrade) || (Number.isFinite(Number(rawGrade)) && Number(rawGrade) <= 0) ? '' : rawGrade;
    const coinParts = [
      text('year', 'issueYear', 'mintYear'),
      text('variety', 'varietyName', 'coinType', 'series'),
      input.certificationCompany,
      usableGrade,
    ]
      .map((value) => value == null ? '' : String(value).replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .filter((value, index, all) => all.findIndex((candidate) => candidate.toLowerCase() === value.toLowerCase()) === index);
    if (coinParts.length > 0) return coinParts.join(' ');
  }
  if (normalizedCategory === 'disney_pins') {
    const character = text('character', 'characterName');
    const pinName = text('pinName', 'name');
    const disneyPinParts = [character, pinName, 'Disney Pin']
      .map((value) => value == null ? '' : String(value).trim())
      .filter(Boolean)
      .filter((value, index, all) => all.findIndex((candidate) => candidate.toLowerCase() === value.toLowerCase()) === index);
    if (disneyPinParts.length > 1) return disneyPinParts.join(' ');
  }
  const title = input.title.trim();
  if (!title) return '';
  return title;
}

function mercariListing(item: any): AdditionalSoldCompsListing | null {
  const price = Number(item?.price);
  if (!item?.itemId || !item?.title || !Number.isFinite(price) || price <= 0) return null;
  return {
    title: String(item.title),
    itemUrl: typeof item.url === 'string' ? item.url : null,
    saleId: `mercari:${String(item.itemId)}`,
    price,
    currency: String(item.currency || 'USD').toUpperCase(),
    endedAt: typeof item.soldAt === 'string' ? item.soldAt : null,
    condition: typeof item.condition === 'string' ? item.condition : null,
    imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : typeof item.thumbnailUrl === 'string' ? item.thumbnailUrl : null,
    sourceId: 'mercari_sold_comps',
    sourceLabel: 'Sold-Comps (Mercari Sold)',
    marketplace: 'Mercari',
    evidenceDisposition: 'warning_review',
    evidenceReasons: ['Mercari results are available for testing but remain context-only until provider-specific identity and signed-admission review is complete.'],
    providerMetadata: { marketplace: item.marketplace, categoryId: item.categoryId, categoryName: item.categoryName, brand: item.brand, status: item.status },
  };
}

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
  const keyword = queryKeyword(input);
  if (!apiKey) return { query: keyword, listings: [], metrics: null, error: 'Sold-Comps API key not configured' };
  if (!keyword) return { query: keyword, listings: [], metrics: null, error: 'A title is required for Mercari Sold-Comps lookup' };
  try {
    const params = new URLSearchParams({ keyword, page: '1', count: String(MAX_MERCARI_ITEMS), sortOrder: 'newest', sold: 'true' });
    const data = await getJson(`/v1/mercari?${params.toString()}`, apiKey, fetchImpl);
    const listings = (Array.isArray(data?.items) ? data.items : []).map(mercariListing).filter(Boolean) as AdditionalSoldCompsListing[];
    return { query: keyword, listings, metrics: null, error: null, provider: 'mercari', received: listings.length, hasNextPage: Boolean(data?.hasNextPage) };
  } catch (error) {
    return { query: keyword, listings: [], metrics: null, error: error instanceof Error ? error.message : 'Mercari Sold-Comps lookup failed' };
  }
}

export async function lookupTcgplayerSoldComps(input: AdditionalSoldCompsInput, fetchImpl: typeof fetch = fetch) {
  const apiKey = getApiKey();
  const keyword = queryKeyword(input);
  if (input.category.trim().toLowerCase().replace(/[_-]+/g, ' ') !== 'pokemon') {
    return { query: keyword, listings: [], metrics: null, error: 'Sold-Comps TCGplayer is available for Pokémon only' };
  }
  if (!apiKey) return { query: keyword, listings: [], metrics: null, error: 'Sold-Comps API key not configured' };
  if (!keyword) return { query: keyword, listings: [], metrics: null, error: 'A title is required for TCGplayer Sold-Comps lookup' };
  try {
    const searchParams = new URLSearchParams({ keyword, page: '1', count: String(MAX_TCG_PRODUCTS), sortOrder: 'bestMatch' });
    const search = await getJson(`/v1/tcgplayer/search?${searchParams.toString()}`, apiKey, fetchImpl);
    const products = (Array.isArray(search?.items) ? search.items : []).filter((product: any) => String(product?.productLine || '').toLowerCase() === 'pokemon').slice(0, MAX_TCG_PRODUCTS);
    const listings: AdditionalSoldCompsListing[] = [];
    for (const product of products) {
      const salesParams = new URLSearchParams({ productId: String(product.productId), listingType: 'ListingWithPhotos' });
      const sales = await getJson(`/v1/tcgplayer/sales?${salesParams.toString()}`, apiKey, fetchImpl);
      for (const [index, sale] of (Array.isArray(sales?.items) ? sales.items : []).entries()) {
        const listing = tcgplayerListing(product, sale, index);
        if (listing) listings.push(listing);
      }
    }
    return { query: keyword, listings, metrics: null, error: null, provider: 'tcgplayer', productsReviewed: products.length, received: listings.length };
  } catch (error) {
    return { query: keyword, listings: [], metrics: null, error: error instanceof Error ? error.message : 'TCGplayer Sold-Comps lookup failed' };
  }
}

export const SOLD_COMPS_ADDITIONAL_LIMITS = { maxMercariItems: MAX_MERCARI_ITEMS, maxTcgProducts: MAX_TCG_PRODUCTS } as const;
