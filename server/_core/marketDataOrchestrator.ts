/**
 * Market Data Orchestrator
 * 
 * Central orchestration layer that:
 * - Manages multiple data sources
 * - Coordinates data acquisition from different providers
 * - Normalizes data to standard format
 * - Calculates market statistics
 * - Handles caching and performance
 */

import {
  StandardizedItem,
  StandardizedSale,
  StandardizedCertification,
  StandardizedPopulation,
  MarketStatistics,
  MarketDataPackage,
  DataAcquisitionRequest,
  DataAcquisitionResponse,
} from './marketDataTypes';
import { marketDataCache } from './marketDataCache';
import { fetchEbaySalesData, searchEbayForItem } from './ebayDataAcquisition';

/**
 * Main orchestrator class for market data acquisition
 */
export class MarketDataOrchestrator {
  private startTime: number = 0;

  /**
   * Acquire market data for an item
   */
  async acquireMarketData(request: DataAcquisitionRequest, options?: { signal?: AbortSignal }): Promise<DataAcquisitionResponse> {
    this.startTime = Date.now();

    try {
      // Determine which sources to query
      const sources = request.sources || ['ebay'];

      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cachedData = marketDataCache.get<MarketDataPackage>(
        'orchestrator',
        { cacheKey }
      );

      if (cachedData && !this.isStale(cachedData, request.cacheMaxAgeMinutes ?? 60)) {
        return {
          success: true,
          data: cachedData,
          sourcesQueried: sources,
          executionTimeMs: Date.now() - this.startTime,
          cacheHit: true,
        };
      }

      // Acquire data from each source
      const item = await this.acquireItem(request, options);
      const certifications = await this.acquireCertifications(request, sources);
      const sales = await this.acquireSales(request, sources, options);
      const populationData = await this.acquirePopulation(request, sources);

      // Calculate statistics from sales data
      const statistics = this.calculateStatistics(sales, item);

      // Assemble market data package
      const dataPackage: MarketDataPackage = {
        item: item || this.createPlaceholderItem(request),
        certifications,
        recentSales: sales.slice(0, 50), // Keep recent 50 sales
        populationData,
        statistics,
        dataQuality: this.assessDataQuality(item, certifications, sales, populationData),
        generatedAt: new Date(),
      };

      // Cache the result
      const cacheDuration = request.cacheMaxAgeMinutes || 60;
      marketDataCache.set('orchestrator', { cacheKey }, dataPackage, cacheDuration);

      return {
        success: true,
        data: dataPackage,
        sourcesQueried: sources,
        executionTimeMs: Date.now() - this.startTime,
        cacheHit: false,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        sourcesQueried: request.sources || [],
        executionTimeMs: Date.now() - this.startTime,
        cacheHit: false,
      };
    }
  }

  /**
   * Acquire item information from sources
   */
  private async acquireItem(request: DataAcquisitionRequest, options?: { signal?: AbortSignal }): Promise<StandardizedItem | null> {
    try {
      if (request.searchTerm) {
        const items = await searchEbayForItem(request.searchTerm, { signal: options?.signal });
        return items.length > 0 ? items[0] : null;
      }

      if (request.itemId) {
        // Would implement source-specific item lookup here
        return null;
      }

      return null;
    } catch (error) {
      console.error('Error acquiring item data:', error);
      return null;
    }
  }

  /**
   * Acquire certification data from grading companies
   */
  private async acquireCertifications(
    request: DataAcquisitionRequest,
    sources: string[]
  ): Promise<StandardizedCertification[]> {
    const certifications: StandardizedCertification[] = [];

    try {
      if (request.certificationNumber) {
        // Would implement PSA, CGC, BGS, SGC lookups here
        // For now, returning empty array as these require scraping or API access
      }
    } catch (error) {
      console.error('Error acquiring certification data:', error);
    }

    return certifications;
  }

  /**
   * Acquire sales data from multiple sources
   */
  private async acquireSales(
    request: DataAcquisitionRequest,
    sources: string[],
    options?: { signal?: AbortSignal }
  ): Promise<StandardizedSale[]> {
    const allSales: StandardizedSale[] = [];

    try {
      for (const source of sources) {
        if (source === 'ebay' && request.searchTerm) {
          const ebaySales = await fetchEbaySalesData(request.searchTerm, {
            maxResults: 100,
            sortOrder: 'EndTimeNewest',
            signal: options?.signal,
          });
          allSales.push(...ebaySales);
        }
        // Add other sources here (PSA, Heritage, Goldin, etc.)
      }

      // Sort by date, most recent first
      allSales.sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime());
    } catch (error) {
      console.error('Error acquiring sales data:', error);
    }

    return allSales;
  }

  /**
   * Acquire population data from grading companies
   */
  private async acquirePopulation(
    request: DataAcquisitionRequest,
    sources: string[]
  ): Promise<StandardizedPopulation[]> {
    const populationData: StandardizedPopulation[] = [];

    try {
      // Would implement PSA, CGC, BGS, SGC population lookups here
      // For now, returning empty array
    } catch (error) {
      console.error('Error acquiring population data:', error);
    }

    return populationData;
  }

  /**
   * Calculate market statistics from sales data
   */
  private calculateStatistics(sales: StandardizedSale[], item: StandardizedItem | null): MarketStatistics {
    if (sales.length === 0) {
      return {
        itemId: item?.itemId || 'unknown',
        totalSales: 0,
        averagePrice: 0,
        medianPrice: 0,
        highestPrice: 0,
        lowestPrice: 0,
        priceRange: 0,
        priceStandardDeviation: 0,
        mostRecentSaleDate: new Date(),
        oldestSaleDate: new Date(),
        pricePercentile25: 0,
        pricePercentile75: 0,
        dataConfidence: 'low',
        dataRecency: 'stale',
        sources: [],
        lastCalculated: new Date(),
      };
    }

    const prices = sales.map(s => s.salePrice).filter(p => p > 0);
    prices.sort((a, b) => a - b);

    const sum = prices.reduce((a, b) => a + b, 0);
    const average = sum / prices.length;
    const median = prices.length % 2 === 0
      ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
      : prices[Math.floor(prices.length / 2)];

    const variance = prices.reduce((sum, price) => sum + Math.pow(price - average, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    const p25Index = Math.floor(prices.length * 0.25);
    const p75Index = Math.floor(prices.length * 0.75);

    const mostRecentSaleDate = sales[0]?.saleDate || new Date();
    const oldestSaleDate = sales[sales.length - 1]?.saleDate || new Date();

    // Determine data confidence based on sample size
    let dataConfidence: 'high' | 'medium' | 'low' = 'low';
    if (sales.length >= 50) {
      dataConfidence = 'high';
    } else if (sales.length >= 10) {
      dataConfidence = 'medium';
    }

    // Determine data recency
    const daysSinceLastSale = (Date.now() - mostRecentSaleDate.getTime()) / (1000 * 60 * 60 * 24);
    let dataRecency: 'fresh' | 'recent' | 'stale' = 'stale';
    if (daysSinceLastSale <= 7) {
      dataRecency = 'fresh';
    } else if (daysSinceLastSale <= 30) {
      dataRecency = 'recent';
    }

    return {
      itemId: item?.itemId || 'unknown',
      totalSales: sales.length,
      averagePrice: Math.round(average * 100) / 100,
      medianPrice: Math.round(median * 100) / 100,
      highestPrice: Math.max(...prices),
      lowestPrice: Math.min(...prices),
      priceRange: Math.max(...prices) - Math.min(...prices),
      priceStandardDeviation: Math.round(stdDev * 100) / 100,
      mostRecentSaleDate,
      oldestSaleDate,
      pricePercentile25: Math.round(prices[p25Index] * 100) / 100,
      pricePercentile75: Math.round(prices[p75Index] * 100) / 100,
      dataConfidence,
      dataRecency,
      sources: Array.from(new Set(sales.map(s => s.sourceKey))),
      lastCalculated: new Date(),
    };
  }

  /**
   * Assess data quality
   */
  private assessDataQuality(
    item: StandardizedItem | null,
    certifications: StandardizedCertification[],
    sales: StandardizedSale[],
    populationData: StandardizedPopulation[]
  ): { completeness: number; freshness: number; reliability: number } {
    let completeness = 0;
    let freshness = 0;
    let reliability = 0;

    // Completeness: how much data is available
    if (item) completeness += 25;
    if (certifications.length > 0) completeness += 25;
    if (sales.length > 0) completeness += 25;
    if (populationData.length > 0) completeness += 25;

    // Freshness: how recent is the data
    const now = new Date();
    const maxAge = 30; // days

    if (item && item.lastUpdated) {
      const age = (now.getTime() - item.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      freshness += Math.max(0, 25 - (age / maxAge) * 25);
    }

    if (sales.length > 0 && sales[0].saleDate) {
      const age = (now.getTime() - sales[0].saleDate.getTime()) / (1000 * 60 * 60 * 24);
      freshness += Math.max(0, 25 - (age / maxAge) * 25);
    }

    if (certifications.length > 0 && certifications[0].lastUpdated) {
      const age = (now.getTime() - certifications[0].lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      freshness += Math.max(0, 25 - (age / maxAge) * 25);
    }

    if (populationData.length > 0 && populationData[0].lastUpdated) {
      const age = (now.getTime() - populationData[0].lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      freshness += Math.max(0, 25 - (age / maxAge) * 25);
    }

    // Reliability: based on data sources and sample size
    if (sales.length >= 50) reliability += 40;
    else if (sales.length >= 10) reliability += 20;

    if (certifications.length > 0) reliability += 30;
    if (populationData.length > 0) reliability += 30;

    return {
      completeness: Math.min(100, Math.round(completeness)),
      freshness: Math.min(100, Math.round(freshness)),
      reliability: Math.min(100, Math.round(reliability)),
    };
  }

  /**
   * Generate cache key from request
   */
  private generateCacheKey(request: DataAcquisitionRequest): string {
    const key = JSON.stringify({
      itemId: request.itemId,
      certificationNumber: request.certificationNumber,
      searchTerm: request.searchTerm,
      sources: request.sources?.sort(),
    });
    return Buffer.from(key).toString('base64');
  }

  /**
   * Check if cached data is stale
   */
  private isStale(data: MarketDataPackage, maxAgeMinutes: number): boolean {
    const maxAge = maxAgeMinutes * 60 * 1000;
    const age = Date.now() - data.generatedAt.getTime();
    return age > maxAge;
  }

  /**
   * Create placeholder item when no data is found
   */
  private createPlaceholderItem(request: DataAcquisitionRequest): StandardizedItem {
    return {
      itemId: request.itemId || `search_${request.searchTerm}`,
      category: (request.category as any) || 'sports_cards',
      itemName: request.searchTerm || 'Unknown Item',
      sourceKey: 'unknown',
      lastUpdated: new Date(),
    };
  }
}

// Export singleton instance
export const marketDataOrchestrator = new MarketDataOrchestrator();
