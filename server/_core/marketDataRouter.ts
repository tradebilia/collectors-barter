/**
 * Market Data TRPC Router
 *
 * A shared, authenticated market-data boundary for future member-facing Trade
 * AI features. The administrator Test AI Sandbox uses its own protected router.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from './trpc';
import { marketDataOrchestrator } from './marketDataOrchestrator';
import { DataAcquisitionRequest } from './marketDataTypes';
import { isMarketDataAdmissionAllowed, MARKET_DATA_REQUEST_BUDGET_MS } from './marketDataAdmission';

const supportedSourceSchema = z.enum(['ebay']);
const categorySchema = z.enum([
  'comics', 'sports_cards', 'vintage_toys', 'video_games', 'stamps', 'coins', 'pokemon', 'movies', 'autographs', 'disney_pins',
]);
const identifierRefinement = { message: 'Provide an item ID, certification number, or at least two search characters.' };

const acquireMarketDataSchema = z.object({
  itemId: z.string().trim().min(1).max(128).optional(),
  certificationNumber: z.string().trim().min(1).max(128).optional(),
  category: categorySchema.optional(),
  searchTerm: z.string().trim().min(2).max(160).optional(),
  sources: z.array(supportedSourceSchema).min(1).max(1).optional(),
  includeHistorical: z.boolean().optional(),
  cacheMaxAgeMinutes: z.number().int().min(5).max(1_440).optional(),
}).refine(input => Boolean(input.itemId || input.certificationNumber || input.searchTerm), identifierRefinement);

const salesHistorySchema = z.object({
  searchTerm: z.string().trim().min(2).max(160).optional(),
  certificationNumber: z.string().trim().min(1).max(128).optional(),
  itemId: z.string().trim().min(1).max(128).optional(),
  sources: z.array(supportedSourceSchema).min(1).max(1).optional(),
  limit: z.number().int().min(1).max(50).optional(),
}).refine(input => Boolean(input.searchTerm || input.certificationNumber || input.itemId), identifierRefinement);

const marketStatisticsSchema = z.object({
  searchTerm: z.string().trim().min(2).max(160).optional(),
  certificationNumber: z.string().trim().min(1).max(128).optional(),
  itemId: z.string().trim().min(1).max(128).optional(),
  sources: z.array(supportedSourceSchema).min(1).max(1).optional(),
}).refine(input => Boolean(input.searchTerm || input.certificationNumber || input.itemId), identifierRefinement);

async function acquireForMember(request: DataAcquisitionRequest, input: { userId: number; isAdmin: boolean; ip: string }) {
  if (!isMarketDataAdmissionAllowed(input)) {
    throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Market-data research is temporarily limited. Please wait a minute and try again.' });
  }

  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutResult = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort(new Error('Market-data request time budget exceeded.'));
      reject(new TRPCError({ code: 'TIMEOUT', message: 'Market-data research took too long. Please try again.' }));
    }, MARKET_DATA_REQUEST_BUDGET_MS);
  });

  try {
    return await Promise.race([marketDataOrchestrator.acquireMarketData(request, { signal: controller.signal }), timeoutResult]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function callerAdmission(ctx: { user: { id: number; role: string }; req: { ip?: string } }) {
  return { userId: ctx.user.id, isAdmin: ctx.user.role === 'admin', ip: ctx.req.ip || 'unknown' };
}

export const marketDataRouter = router({
  acquireMarketData: protectedProcedure
    .input(acquireMarketDataSchema)
    .query(async ({ input, ctx }) => {
      const request: DataAcquisitionRequest = {
        itemId: input.itemId,
        certificationNumber: input.certificationNumber,
        category: input.category,
        searchTerm: input.searchTerm,
        sources: input.sources,
        includeHistorical: input.includeHistorical,
        cacheMaxAgeMinutes: input.cacheMaxAgeMinutes,
      };
      return acquireForMember(request, callerAdmission(ctx));
    }),

  searchItems: protectedProcedure
    .input(z.object({
      searchTerm: z.string().trim().min(2).max(160),
      category: categorySchema.optional(),
      maxResults: z.number().int().min(1).max(10).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const response = await acquireForMember({
        searchTerm: input.searchTerm,
        category: input.category,
        sources: ['ebay'],
      }, callerAdmission(ctx));

      if (response.success && response.data) {
        return { success: true, items: [response.data.item], totalResults: 1, executionTimeMs: response.executionTimeMs };
      }
      return { success: false, items: [], totalResults: 0, error: response.error, executionTimeMs: response.executionTimeMs };
    }),

  getSalesHistory: protectedProcedure
    .input(salesHistorySchema)
    .query(async ({ input, ctx }) => {
      const response = await acquireForMember({
        searchTerm: input.searchTerm,
        certificationNumber: input.certificationNumber,
        itemId: input.itemId,
        sources: input.sources,
      }, callerAdmission(ctx));

      if (response.success && response.data) {
        const sales = response.data.recentSales.slice(0, input.limit || 50);
        return { success: true, sales, statistics: response.data.statistics, totalSales: response.data.recentSales.length, executionTimeMs: response.executionTimeMs };
      }
      return { success: false, sales: [], error: response.error, executionTimeMs: response.executionTimeMs };
    }),

  getMarketStatistics: protectedProcedure
    .input(marketStatisticsSchema)
    .query(async ({ input, ctx }) => {
      const response = await acquireForMember({
        searchTerm: input.searchTerm,
        certificationNumber: input.certificationNumber,
        itemId: input.itemId,
        sources: input.sources,
      }, callerAdmission(ctx));

      if (response.success && response.data) {
        return { success: true, statistics: response.data.statistics, dataQuality: response.data.dataQuality, executionTimeMs: response.executionTimeMs };
      }
      return { success: false, error: response.error, executionTimeMs: response.executionTimeMs };
    }),

  getCompleteMarketData: protectedProcedure
    .input(acquireMarketDataSchema)
    .query(async ({ input, ctx }) => acquireForMember({
      itemId: input.itemId,
      certificationNumber: input.certificationNumber,
      category: input.category,
      searchTerm: input.searchTerm,
      sources: input.sources,
      includeHistorical: input.includeHistorical,
      cacheMaxAgeMinutes: input.cacheMaxAgeMinutes,
    }, callerAdmission(ctx))),

  clearCache: protectedProcedure
    .input(z.object({ source: supportedSourceSchema.optional() }).optional())
    .mutation(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only administrators can manage market-data caches.' });
      }
      return { success: false, message: 'Market-data cache clearing is not available in this deployment.' };
    }),
});
