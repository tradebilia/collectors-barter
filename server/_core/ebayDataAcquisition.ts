/**
 * eBay Data Acquisition Module
 *
 * Fetches sales data from eBay API and converts it to standardized format.
 * Handles eBay-specific API calls and data transformation.
 */

import { StandardizedSale, StandardizedItem, DataSourceConfig } from './marketDataTypes';
import { ENV } from './env';

export const ebayDataSourceConfig: DataSourceConfig = {
  sourceKey: 'ebay',
  sourceName: 'eBay',
  sourceType: 'sales_data',
  isActive: true,
  rateLimit: 100,
  cacheDurationMinutes: 1440,
  retryAttempts: 3,
  timeout: 30000,
};

const retryableEbayStatuses = new Set([408, 429, 500, 502, 503, 504]);
const ebayRetryAttempts = ebayDataSourceConfig.retryAttempts ?? 3;
const ebayTimeoutMs = ebayDataSourceConfig.timeout ?? 30000;

function waitForEbayRetry(attempt: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abortError = () => signal?.reason ?? new Error('eBay request was aborted.');
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, 250 * attempt);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function fetchEbayWithRetry(url: string, fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= ebayRetryAttempts; attempt += 1) {
    if (signal?.aborted) throw signal.reason ?? new Error('eBay request was aborted.');
    try {
      const response = await fetcher(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: signal ?? AbortSignal.timeout(ebayTimeoutMs),
      });
      if (response.ok || !retryableEbayStatuses.has(response.status) || attempt === ebayRetryAttempts) return response;
      lastError = new Error(`eBay API error: ${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
      if (attempt === ebayRetryAttempts) break;
    }
    await waitForEbayRetry(attempt, signal);
  }
  throw lastError instanceof Error ? lastError : new Error('eBay request failed after retry attempts.');
}

interface EbaySearchResult {
  itemId: string;
  title: string;
  price: number;
  currency: string;
  condition: string;
  image?: string;
  endDate?: string;
  soldDate?: string;
  soldPrice?: number;
  category?: string;
}

interface EbaySearchResponse {
  searchResult: EbaySearchResult[];
  paginationOutput?: { totalEntries: number; pageNumber: number; entriesPerPage: number };
}

export async function fetchEbaySalesData(
  searchTerm: string,
  options?: {
    maxResults?: number;
    sortOrder?: 'EndTimeSoonest' | 'EndTimeNewest' | 'PricePlusShippingLowest' | 'PricePlusShippingHighest';
    signal?: AbortSignal;
  }
): Promise<StandardizedSale[]> {
  try {
    const maxResults = options?.maxResults || 100;
    const sortOrder = options?.sortOrder || 'EndTimeNewest';
    const params = new URLSearchParams({
      'OPERATION-NAME': 'FindCompletedItems',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': ENV.ebayClientId || '',
      'RESPONSE-DATA-FORMAT': 'JSON',
      'REST-PAYLOAD': 'true',
      keywords: searchTerm,
      sortOrder,
      'paginationInput.entriesPerPage': maxResults.toString(),
    });
    const response = await fetchEbayWithRetry(
      `https://svcs.sandbox.ebay.com/services/search/FindingService/v1?${params.toString()}`,
      fetch,
      options?.signal,
    );
    if (!response.ok) throw new Error(`eBay API error: ${response.status} ${response.statusText}`);
    return normalizeEbaySalesData(await response.json(), searchTerm);
  } catch (error) {
    console.error('Error fetching eBay sales data:', error);
    return [];
  }
}

function normalizeEbaySalesData(ebayResponse: any, searchTerm: string): StandardizedSale[] {
  const sales: StandardizedSale[] = [];
  try {
    const items = ebayResponse?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];
    for (const item of items) {
      sales.push({
        saleId: `ebay_${item.itemId?.[0] || ''}`,
        itemId: `ebay_${item.itemId?.[0] || ''}`,
        sourceKey: 'ebay',
        sourceSaleId: item.itemId?.[0] || '',
        sourceUrl: `https://www.ebay.com/itm/${item.itemId?.[0] || ''}`,
        saleDate: new Date(item.listingInfo?.[0]?.endTime?.[0] || new Date()),
        salePrice: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || '0'),
        currency: item.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId'] || 'USD',
        saleType: 'auction',
        imageUrl: item.galleryURL?.[0],
        rawData: item,
        lastUpdated: new Date(),
      });
    }
  } catch (error) {
    console.error('Error normalizing eBay sales data:', error);
  }
  return sales;
}

export async function fetchEbayUserSalesHistory(
  accessToken: string,
  ebayUserId: string
): Promise<StandardizedSale[]> {
  try {
    return [];
  } catch (error) {
    console.error('Error fetching eBay user sales history:', error);
    return [];
  }
}

export async function searchEbayForItem(
  keywords: string,
  options?: {
    category?: string;
    condition?: 'New' | 'Used' | 'Refurbished';
    minPrice?: number;
    maxPrice?: number;
    signal?: AbortSignal;
  }
): Promise<StandardizedItem[]> {
  try {
    const params = new URLSearchParams({
      'OPERATION-NAME': 'FindItems',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': ENV.ebayClientId || '',
      'RESPONSE-DATA-FORMAT': 'JSON',
      'REST-PAYLOAD': 'true',
      keywords,
      'paginationInput.entriesPerPage': '50',
    });
    if (options?.condition) {
      params.append('itemFilter(0).name', 'Condition');
      params.append('itemFilter(0).value', options.condition);
    }
    if (options?.minPrice) {
      params.append('itemFilter(1).name', 'MinPrice');
      params.append('itemFilter(1).value', options.minPrice.toString());
    }
    if (options?.maxPrice) {
      params.append('itemFilter(2).name', 'MaxPrice');
      params.append('itemFilter(2).value', options.maxPrice.toString());
    }
    const response = await fetchEbayWithRetry(
      `https://svcs.sandbox.ebay.com/services/search/FindingService/v1?${params.toString()}`,
      fetch,
      options?.signal,
    );
    if (!response.ok) throw new Error(`eBay API error: ${response.status}`);
    return normalizeEbayItemsData(await response.json(), keywords);
  } catch (error) {
    console.error('Error searching eBay for items:', error);
    return [];
  }
}

function normalizeEbayItemsData(ebayResponse: any, searchTerm: string): StandardizedItem[] {
  const items: StandardizedItem[] = [];
  try {
    const ebayItems = ebayResponse?.findItemsResponse?.[0]?.searchResult?.[0]?.item || [];
    for (const item of ebayItems) {
      items.push({
        itemId: `ebay_${item.itemId?.[0] || ''}`,
        category: 'sports_cards',
        itemName: item.title?.[0] || '',
        sourceKey: 'ebay',
        sourceItemId: item.itemId?.[0],
        imageUrl: item.galleryURL?.[0],
        description: item.title?.[0],
        lastUpdated: new Date(),
      });
    }
  } catch (error) {
    console.error('Error normalizing eBay items:', error);
  }
  return items;
}

function mapEbayCategoryToTradebilia(ebayCategory: string):
  'comics' | 'sports_cards' | 'vintage_toys' | 'video_games' | 'stamps' | 'coins' | 'pokemon' | 'movies' | 'autographs' | 'disney_pins' {
  const categoryMap: Record<string, any> = {
    '261': 'sports_cards', '262': 'sports_cards', '263': 'sports_cards', '220': 'comics', '1000': 'vintage_toys', '1001': 'video_games',
  };
  return categoryMap[ebayCategory] || 'sports_cards';
}
