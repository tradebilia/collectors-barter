/**
 * eBay Data Acquisition Module
 * 
 * Fetches sales data from eBay API and converts it to standardized format.
 * Handles eBay-specific API calls and data transformation.
 */

import { StandardizedSale, StandardizedItem, DataSourceConfig } from './marketDataTypes';
import { ENV } from './env';

/**
 * eBay Data Source Configuration
 */
export const ebayDataSourceConfig: DataSourceConfig = {
  sourceKey: 'ebay',
  sourceName: 'eBay',
  sourceType: 'sales_data',
  isActive: true,
  rateLimit: 100, // requests per minute
  cacheDurationMinutes: 1440, // 24 hours
  retryAttempts: 3,
  timeout: 30000, // 30 seconds
};

/**
 * eBay API Response Types
 */
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
  paginationOutput?: {
    totalEntries: number;
    pageNumber: number;
    entriesPerPage: number;
  };
}

/**
 * Fetch completed sales from eBay for a given search term
 * Uses eBay Shopping API (public, no auth required for basic searches)
 */
export async function fetchEbaySalesData(
  searchTerm: string,
  options?: {
    maxResults?: number;
    sortOrder?: 'EndTimeSoonest' | 'EndTimeNewest' | 'PricePlusShippingLowest' | 'PricePlusShippingHighest';
  }
): Promise<StandardizedSale[]> {
  try {
    const maxResults = options?.maxResults || 100;
    const sortOrder = options?.sortOrder || 'EndTimeNewest';

    // Use eBay Shopping API to search for completed listings
    // Note: This is a simplified example. In production, you'd want to use the Browse API
    // with proper OAuth tokens for authenticated requests.
    
    const params = new URLSearchParams({
      'OPERATION-NAME': 'FindCompletedItems',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': ENV.ebayClientId || '',
      'RESPONSE-DATA-FORMAT': 'JSON',
      'REST-PAYLOAD': 'true',
      'keywords': searchTerm,
      'sortOrder': sortOrder,
      'paginationInput.entriesPerPage': maxResults.toString(),
    });

    const response = await fetch(
      `https://svcs.sandbox.ebay.com/services/search/FindingService/v1?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`eBay API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const sales = normalizeEbaySalesData(data, searchTerm);
    return sales;
  } catch (error) {
    console.error('Error fetching eBay sales data:', error);
    return [];
  }
}

/**
 * Normalize eBay API response to standardized sales format
 */
function normalizeEbaySalesData(ebayResponse: any, searchTerm: string): StandardizedSale[] {
  const sales: StandardizedSale[] = [];

  try {
    const items = ebayResponse?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];

    for (const item of items) {
      const sale: StandardizedSale = {
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
      };

      sales.push(sale);
    }
  } catch (error) {
    console.error('Error normalizing eBay sales data:', error);
  }

  return sales;
}

/**
 * Fetch user's eBay feedback and convert to sales data insights
 * This gives us historical information about what the user has sold
 */
export async function fetchEbayUserSalesHistory(
  accessToken: string,
  ebayUserId: string
): Promise<StandardizedSale[]> {
  try {
    // This would use the eBay Trading API or Browse API to get user's sold items
    // For now, returning empty array as this requires authenticated requests
    // In production, integrate with the existing getUserFeedback function
    
    return [];
  } catch (error) {
    console.error('Error fetching eBay user sales history:', error);
    return [];
  }
}

/**
 * Search eBay for a specific item by keywords and return standardized data
 */
export async function searchEbayForItem(
  keywords: string,
  options?: {
    category?: string;
    condition?: 'New' | 'Used' | 'Refurbished';
    minPrice?: number;
    maxPrice?: number;
  }
): Promise<StandardizedItem[]> {
  try {
    const params = new URLSearchParams({
      'OPERATION-NAME': 'FindItems',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': ENV.ebayClientId || '',
      'RESPONSE-DATA-FORMAT': 'JSON',
      'REST-PAYLOAD': 'true',
      'keywords': keywords,
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

    const response = await fetch(
      `https://svcs.sandbox.ebay.com/services/search/FindingService/v1?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`eBay API error: ${response.status}`);
    }

    const data = await response.json();
    const items = normalizeEbayItemsData(data, keywords);
    return items;
  } catch (error) {
    console.error('Error searching eBay for items:', error);
    return [];
  }
}

/**
 * Normalize eBay items to standardized format
 */
function normalizeEbayItemsData(ebayResponse: any, searchTerm: string): StandardizedItem[] {
  const items: StandardizedItem[] = [];

  try {
    const ebayItems = ebayResponse?.findItemsResponse?.[0]?.searchResult?.[0]?.item || [];

    for (const item of ebayItems) {
      const standardItem: StandardizedItem = {
        itemId: `ebay_${item.itemId?.[0] || ''}`,
        category: 'sports_cards', // Default, would need to map from eBay category
        itemName: item.title?.[0] || '',
        sourceKey: 'ebay',
        sourceItemId: item.itemId?.[0],
        imageUrl: item.galleryURL?.[0],
        description: item.title?.[0],
        lastUpdated: new Date(),
      };

      items.push(standardItem);
    }
  } catch (error) {
    console.error('Error normalizing eBay items:', error);
  }

  return items;
}

/**
 * Get eBay category mapping
 * Maps eBay category IDs to Tradebilia categories
 */
function mapEbayCategoryToTradebilia(ebayCategory: string): 
  'comics' | 'sports_cards' | 'vintage_toys' | 'video_games' | 'stamps' | 'coins' | 'pokemon' | 'movies' | 'autographs' | 'disney_pins' {
  // This would contain a mapping of eBay category IDs to Tradebilia categories
  // For now, defaulting to sports_cards
  const categoryMap: Record<string, any> = {
    '261': 'sports_cards',
    '262': 'sports_cards',
    '263': 'sports_cards',
    '220': 'comics',
    '1000': 'vintage_toys',
    '1000': 'video_games',
  };

  return categoryMap[ebayCategory] || 'sports_cards';
}
