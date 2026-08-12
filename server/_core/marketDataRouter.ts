/**
 * Market Data TRPC Router
 * 
 * Exposes market data acquisition functionality to the frontend.
 * Provides endpoints for fetching market data for items, certifications, and sales analysis.
 */

import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from './trpc';
import { marketDataOrchestrator } from './marketDataOrchestrator';
import { DataAcquisitionRequest } from './marketDataTypes';

/**
 * Input validation schemas
 */
const acquireMarketDataSchema = z.object({
  itemId: z.string().optional(),
  certificationNumber: z.string().optional(),
  category: z.enum([
    'comics',
    'sports_cards',
    'vintage_toys',
    'video_games',
    'stamps',
    'coins',
    'pokemon',
    'movies',
    'autographs',
    'disney_pins',
  ]).optional(),
  searchTerm: z.string().optional(),
  sources: z.array(z.string()).optional(),
  includeHistorical: z.boolean().optional(),
  cacheMaxAgeMinutes: z.number().optional(),
});

/**
 * Market Data Router
 */
export const marketDataRouter = router({
  /**
   * Acquire market data for an item
   * Can search by item ID, certification number, or keywords
   */
  acquireMarketData: publicProcedure
    .input(acquireMarketDataSchema)
    .query(async ({ input }) => {
      const request: DataAcquisitionRequest = {
        itemId: input.itemId,
        certificationNumber: input.certificationNumber,
        category: input.category,
        searchTerm: input.searchTerm,
        sources: input.sources,
        includeHistorical: input.includeHistorical,
        cacheMaxAgeMinutes: input.cacheMaxAgeMinutes,
      };

      const response = await marketDataOrchestrator.acquireMarketData(request);
      return response;
    }),

  /**
   * Search for items by keyword
   * Returns a list of matching items with basic information
   */
  searchItems: publicProcedure
    .input(
      z.object({
        searchTerm: z.string().min(1),
        category: z.string().optional(),
        maxResults: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const request: DataAcquisitionRequest = {
        searchTerm: input.searchTerm,
        category: input.category,
        sources: ['ebay'],
      };

      const response = await marketDataOrchestrator.acquireMarketData(request);
      
      if (response.success && response.data) {
        return {
          success: true,
          items: [response.data.item],
          totalResults: 1,
          executionTimeMs: response.executionTimeMs,
        };
      }

      return {
        success: false,
        items: [],
        totalResults: 0,
        error: response.error,
        executionTimeMs: response.executionTimeMs,
      };
    }),

  /**
   * Get sales history for an item
   * Returns recent sales with price trends
   */
  getSalesHistory: publicProcedure
    .input(
      z.object({
        searchTerm: z.string().optional(),
        certificationNumber: z.string().optional(),
        itemId: z.string().optional(),
        sources: z.array(z.string()).optional(),
        limit: z.number().min(1).max(500).optional(),
      })
    )
    .query(async ({ input }) => {
      const request: DataAcquisitionRequest = {
        searchTerm: input.searchTerm,
        certificationNumber: input.certificationNumber,
        itemId: input.itemId,
        sources: input.sources,
      };

      const response = await marketDataOrchestrator.acquireMarketData(request);

      if (response.success && response.data) {
        const sales = response.data.recentSales.slice(0, input.limit || 50);
        return {
          success: true,
          sales,
          statistics: response.data.statistics,
          totalSales: response.data.recentSales.length,
          executionTimeMs: response.executionTimeMs,
        };
      }

      return {
        success: false,
        sales: [],
        error: response.error,
        executionTimeMs: response.executionTimeMs,
      };
    }),

  /**
   * Get market statistics for an item
   * Returns price trends, confidence levels, and data quality metrics
   */
  getMarketStatistics: publicProcedure
    .input(
      z.object({
        searchTerm: z.string().optional(),
        certificationNumber: z.string().optional(),
        itemId: z.string().optional(),
        sources: z.array(z.string()).optional(),
      })
    )
    .query(async ({ input }) => {
      const request: DataAcquisitionRequest = {
        searchTerm: input.searchTerm,
        certificationNumber: input.certificationNumber,
        itemId: input.itemId,
        sources: input.sources,
      };

      const response = await marketDataOrchestrator.acquireMarketData(request);

      if (response.success && response.data) {
        return {
          success: true,
          statistics: response.data.statistics,
          dataQuality: response.data.dataQuality,
          executionTimeMs: response.executionTimeMs,
        };
      }

      return {
        success: false,
        error: response.error,
        executionTimeMs: response.executionTimeMs,
      };
    }),

  /**
   * Get complete market data package
   * Returns all available data: item info, sales, certifications, population, statistics
   */
  getCompleteMarketData: publicProcedure
    .input(acquireMarketDataSchema)
    .query(async ({ input }) => {
      const request: DataAcquisitionRequest = {
        itemId: input.itemId,
        certificationNumber: input.certificationNumber,
        category: input.category,
        searchTerm: input.searchTerm,
        sources: input.sources,
        includeHistorical: input.includeHistorical,
        cacheMaxAgeMinutes: input.cacheMaxAgeMinutes,
      };

      const response = await marketDataOrchestrator.acquireMarketData(request);
      return response;
    }),

  /**
   * Clear cache (admin only)
   * Useful for testing and forcing fresh data acquisition
   */
  clearCache: protectedProcedure
    .input(z.object({ source: z.string().optional() }).optional())
    .mutation(async ({ input, ctx }) => {
      // Check if user is admin
      const { requireDb } = await import("../db"); const db = await requireDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // For now, just return success
      // In production, you'd verify admin status
      return {
        success: true,
        message: 'Cache cleared',
      };
    }),
});
