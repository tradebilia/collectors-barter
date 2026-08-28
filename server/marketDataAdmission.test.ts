import { afterEach, describe, expect, it, vi } from 'vitest';
import { marketDataRouter } from './_core/marketDataRouter';
import { marketDataOrchestrator } from './_core/marketDataOrchestrator';
import { resetMarketDataAdmissionForTest } from './_core/marketDataAdmission';
import { fetchEbayWithRetry } from './_core/ebayDataAcquisition';

const noDataResult = {
  success: false,
  error: 'No cached result',
  sourcesQueried: ['ebay'],
  executionTimeMs: 1,
  cacheHit: false,
} as const;

function caller(user: { id: number; role: string } | null, ip = '198.51.100.80') {
  return marketDataRouter.createCaller({ req: { ip } as any, res: {} as any, user: user as any });
}

afterEach(() => {
  resetMarketDataAdmissionForTest();
  vi.restoreAllMocks();
});

describe('shared market-data admission', () => {
  it('rejects an unauthenticated caller before the market-data service can run', async () => {
    const acquire = vi.spyOn(marketDataOrchestrator, 'acquireMarketData').mockResolvedValue(noDataResult);
    await expect(caller(null).acquireMarketData({ searchTerm: 'Jordan card' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(acquire).not.toHaveBeenCalled();
  });

  it('rejects unsupported sources and oversized/empty search input before an external lookup can run', async () => {
    const acquire = vi.spyOn(marketDataOrchestrator, 'acquireMarketData').mockResolvedValue(noDataResult);
    const member = caller({ id: 401, role: 'user' });
    await expect(member.acquireMarketData({ searchTerm: 'Jordan card', sources: ['unapproved-source'] as any })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(member.getSalesHistory({ searchTerm: 'x' })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(member.getCompleteMarketData({ searchTerm: 'x'.repeat(161) })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(acquire).not.toHaveBeenCalled();
  });

  it('limits a member before a ninth cache-miss-capable request reaches the shared service', async () => {
    const acquire = vi.spyOn(marketDataOrchestrator, 'acquireMarketData').mockResolvedValue(noDataResult);
    const member = caller({ id: 402, role: 'user' });
    for (let count = 0; count < 8; count += 1) {
      await expect(member.acquireMarketData({ searchTerm: `Jordan card ${count}` })).resolves.toEqual(noDataResult);
    }
    await expect(member.acquireMarketData({ searchTerm: 'Jordan card limit' })).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
    expect(acquire).toHaveBeenCalledTimes(8);
    expect(acquire.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('honors an already-aborted shared request budget before eBay receives any call', async () => {
    const controller = new AbortController();
    controller.abort(new Error('Market-data request time budget exceeded.'));
    const fetcher = vi.fn();
    await expect(fetchEbayWithRetry('https://example.invalid/ebay', fetcher, controller.signal)).rejects.toThrow('Market-data request time budget exceeded.');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
