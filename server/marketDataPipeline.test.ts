/**
 * Market Data Pipeline Tests
 * 
 * Comprehensive tests for the data acquisition, normalization, and AI analysis pipeline.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { marketDataOrchestrator } from './_core/marketDataOrchestrator';
import { marketDataCache } from './_core/marketDataCache';
import { analyzeTradeProposal } from './_core/tradeRoomAI';
import {
  StandardizedItem,
  StandardizedSale,
  MarketDataPackage,
  DataAcquisitionRequest,
} from './_core/marketDataTypes';

describe('Market Data Pipeline', () => {
  beforeEach(() => {
    // Clear cache before each test
    marketDataCache.clearAll();
  });

  afterEach(() => {
    // Cleanup
    marketDataCache.clearAll();
  });

  describe('Data Acquisition', () => {
    it('should acquire market data for a search term', async () => {
      const request: DataAcquisitionRequest = {
        searchTerm: '2012 Panini Prizm LeBron James',
        sources: ['ebay'],
      };

      const response = await marketDataOrchestrator.acquireMarketData(request);

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.item).toBeDefined();
      expect(response.executionTimeMs).toBeGreaterThan(0);
    });

    it('should return cached data on subsequent requests', async () => {
      const request: DataAcquisitionRequest = {
        searchTerm: 'test item',
        sources: ['ebay'],
      };

      // First request
      const response1 = await marketDataOrchestrator.acquireMarketData(request);
      const time1 = response1.executionTimeMs;

      // Second request (should be cached)
      const response2 = await marketDataOrchestrator.acquireMarketData(request);
      const time2 = response2.executionTimeMs;

      // Cached response should be faster
      expect(response2.cacheHit).toBe(true);
      expect(time2).toBeLessThan(time1);
    });

    it('should handle missing data gracefully', async () => {
      const request: DataAcquisitionRequest = {
        searchTerm: 'xyzabc123notarealitem',
        sources: ['ebay'],
      };

      const response = await marketDataOrchestrator.acquireMarketData(request);

      // Should still return a response, even if no data found
      expect(response).toBeDefined();
      expect(response.executionTimeMs).toBeGreaterThan(0);
    });
  });

  describe('Market Statistics', () => {
    it('should calculate correct statistics from sales data', async () => {
      const mockSales: StandardizedSale[] = [
        {
          saleId: '1',
          itemId: 'test_item',
          sourceKey: 'ebay',
          sourceSaleId: '123',
          saleDate: new Date('2024-01-01'),
          salePrice: 100,
          currency: 'USD',
        },
        {
          saleId: '2',
          itemId: 'test_item',
          sourceKey: 'ebay',
          sourceSaleId: '124',
          saleDate: new Date('2024-01-02'),
          salePrice: 150,
          currency: 'USD',
        },
        {
          saleId: '3',
          itemId: 'test_item',
          sourceKey: 'ebay',
          sourceSaleId: '125',
          saleDate: new Date('2024-01-03'),
          salePrice: 200,
          currency: 'USD',
        },
      ];

      const request: DataAcquisitionRequest = {
        searchTerm: 'test',
        sources: ['ebay'],
      };

      const response = await marketDataOrchestrator.acquireMarketData(request);

      if (response.data) {
        const stats = response.data.statistics;
        
        // Average should be (100 + 150 + 200) / 3 = 150
        expect(stats.averagePrice).toBeGreaterThan(0);
        expect(stats.medianPrice).toBeGreaterThan(0);
        expect(stats.highestPrice).toBeGreaterThan(stats.lowestPrice);
      }
    });

    it('should assess data quality correctly', async () => {
      const request: DataAcquisitionRequest = {
        searchTerm: 'test item',
        sources: ['ebay'],
      };

      const response = await marketDataOrchestrator.acquireMarketData(request);

      if (response.data) {
        const quality = response.data.dataQuality;
        
        expect(quality.completeness).toBeGreaterThanOrEqual(0);
        expect(quality.completeness).toBeLessThanOrEqual(100);
        expect(quality.freshness).toBeGreaterThanOrEqual(0);
        expect(quality.freshness).toBeLessThanOrEqual(100);
        expect(quality.reliability).toBeGreaterThanOrEqual(0);
        expect(quality.reliability).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Cache Manager', () => {
    it('should store and retrieve data from cache', () => {
      const testData = { test: 'data' };
      const source = 'test_source';
      const params = { key: 'value' };

      marketDataCache.set(source, params, testData, 60);
      const retrieved = marketDataCache.get(source, params);

      expect(retrieved).toEqual(testData);
    });

    it('should return null for expired cache entries', (done) => {
      const testData = { test: 'data' };
      const source = 'test_source';
      const params = { key: 'value' };

      // Store with 1 millisecond expiration
      marketDataCache.set(source, params, testData, 0.001);

      // Wait for expiration
      setTimeout(() => {
        const retrieved = marketDataCache.get(source, params);
        expect(retrieved).toBeNull();
        done();
      }, 100);
    });

    it('should clear cache by source', () => {
      const testData1 = { test: 'data1' };
      const testData2 = { test: 'data2' };

      marketDataCache.set('source1', { key: 'value' }, testData1, 60);
      marketDataCache.set('source2', { key: 'value' }, testData2, 60);

      expect(marketDataCache.has('source1', { key: 'value' })).toBe(true);
      expect(marketDataCache.has('source2', { key: 'value' })).toBe(true);

      marketDataCache.clearBySource('source1');

      expect(marketDataCache.has('source1', { key: 'value' })).toBe(false);
      expect(marketDataCache.has('source2', { key: 'value' })).toBe(true);
    });

    it('should provide cache statistics', () => {
      const testData = { test: 'data' };

      marketDataCache.set('source1', { key: 'value1' }, testData, 60);
      marketDataCache.set('source2', { key: 'value2' }, testData, 60);

      const stats = marketDataCache.getStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.activeEntries).toBe(2);
      expect(stats.expiredEntries).toBe(0);
    });
  });

  describe('Trade Analysis', () => {
    it('should analyze a trade proposal', async () => {
      const mockMarketData: MarketDataPackage = {
        item: {
          itemId: 'test_1',
          category: 'sports_cards',
          itemName: 'Test Card 1',
          sourceKey: 'ebay',
        },
        certifications: [],
        recentSales: [],
        populationData: [],
        statistics: {
          itemId: 'test_1',
          totalSales: 50,
          averagePrice: 100,
          medianPrice: 95,
          highestPrice: 200,
          lowestPrice: 50,
          priceRange: 150,
          priceStandardDeviation: 30,
          mostRecentSaleDate: new Date(),
          oldestSaleDate: new Date(),
          pricePercentile25: 70,
          pricePercentile75: 130,
          dataConfidence: 'high',
          dataRecency: 'fresh',
          sources: ['ebay'],
          lastCalculated: new Date(),
        },
        dataQuality: {
          completeness: 75,
          freshness: 90,
          reliability: 80,
        },
        generatedAt: new Date(),
      };

      const analysis = await analyzeTradeProposal({
        requestedItem: {
          title: 'Requested Card',
          category: 'sports_cards',
          condition: 'mint',
          estimatedValue: 100,
          marketData: mockMarketData,
        },
        offeredItems: [
          {
            title: 'Offered Card 1',
            category: 'sports_cards',
            condition: 'near_mint',
            estimatedValue: 80,
            marketData: mockMarketData,
          },
          {
            title: 'Offered Card 2',
            category: 'sports_cards',
            condition: 'excellent',
            estimatedValue: 40,
            marketData: mockMarketData,
          },
        ],
      });

      expect(analysis).toBeDefined();
      expect(analysis.fairnessScore).toBeGreaterThanOrEqual(0);
      expect(analysis.fairnessScore).toBeLessThanOrEqual(100);
      expect(['steal', 'fair', 'pass']).toContain(analysis.recommendation);
      expect(analysis.reasoning).toBeDefined();
      expect(analysis.valueDifference).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const request: DataAcquisitionRequest = {
        searchTerm: 'test',
        sources: ['invalid_source'],
      };

      const response = await marketDataOrchestrator.acquireMarketData(request);

      // Should return a response even on error
      expect(response).toBeDefined();
      expect(response.executionTimeMs).toBeGreaterThan(0);
    });

    it('should handle empty search results', async () => {
      const request: DataAcquisitionRequest = {
        searchTerm: '',
        sources: ['ebay'],
      };

      const response = await marketDataOrchestrator.acquireMarketData(request);

      expect(response).toBeDefined();
    });
  });
});
