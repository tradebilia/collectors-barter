import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fetchEbayWithRetry } from './_core/ebayDataAcquisition';

const root = resolve(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), 'utf8');

function procedureBlock(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  return source.slice(start, end);
}

describe('third-pass reliability repairs', () => {
  it('limits counterpart inventory, middleman actions, and voting links to trade participants', () => {
    const source = read('server/tradeFlowRouter.ts');
    const blocks = [
      procedureBlock(source, 'getOtherUserInventory: protectedProcedure', 'getShippingInfo: protectedProcedure'),
      procedureBlock(source, 'middleManService: protectedProcedure', 'generateVotingLink: protectedProcedure'),
      procedureBlock(source, 'generateVotingLink: protectedProcedure', 'castVote: protectedProcedure'),
    ];

    for (const block of blocks) {
      expect(block).toContain('proposal.recipientId !== userId && proposal.requesterId !== userId');
      expect(block).toContain("code: 'FORBIDDEN'");
    }
  });

  it('deletes a draft’s photo records before its parent record in one transaction', () => {
    const source = read('server/db.ts');
    const block = procedureBlock(source, 'export async function deleteDraft(', 'export async function getDraftById(');

    expect(block).toContain('db.transaction(async (tx) =>');
    expect(block.indexOf('tx.delete(listingPhotos)')).toBeLessThan(block.indexOf('tx.delete(draftListings)'));
  });

  it('honors requested cache freshness and eBay request-resilience configuration', () => {
    const orchestratorSource = read('server/_core/marketDataOrchestrator.ts');
    const ebaySource = read('server/_core/ebayDataAcquisition.ts');

    expect(orchestratorSource).toContain('this.isStale(cachedData, request.cacheMaxAgeMinutes ?? 60)');
    expect(orchestratorSource).toContain('maxAgeMinutes * 60 * 1000');
    expect(ebaySource).toContain('const ebayRetryAttempts = ebayDataSourceConfig.retryAttempts ?? 3');
    expect(ebaySource).toContain('const ebayTimeoutMs = ebayDataSourceConfig.timeout ?? 30000');
    expect(ebaySource).toContain('AbortSignal.timeout(ebayTimeoutMs)');
    expect(ebaySource).toContain('attempt <= ebayRetryAttempts');
    expect(ebaySource).toContain('fetchEbayWithRetry(');
  });

  it('retries a transient eBay response and returns the recovered response', async () => {
    let calls = 0;
    const response = await fetchEbayWithRetry('https://example.test/ebay', async (_url, init) => {
      calls += 1;
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return calls === 1
        ? new Response('', { status: 503, statusText: 'Service Unavailable' })
        : new Response('{}', { status: 200, statusText: 'OK' });
    });

    expect(calls).toBe(2);
    expect(response.ok).toBe(true);
  });
});
