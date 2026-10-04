import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookupLcg } from './lcgMarketData';

afterEach(() => vi.restoreAllMocks());

describe('LCG Auctions adapter', () => {
  it('uses structured Vintage Toys fields in the public gallery request', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(`
      <html><body>
        <a href="/bids/bidplace.aspx?itemid=3221">1984 Transformers Megatron AFA 90</a>
        <span>SOLD FOR $1,200</span><span>October 1, 2026</span>
      </body></html>`, { status: 200, headers: { 'content-type': 'text/html' } }));
    const result = await lookupLcg({ sourceId: 'lcg', category: 'vintage_toys', title: 'ignored title', itemDetails: JSON.stringify({ year: '1984', subject: 'Transformers Megatron' }), grade: '90', certificationCompany: 'AFA' });
    expect(decodeURIComponent(String(vi.mocked(fetch).mock.calls[0]?.[0]))).toContain('SearchText=Transformers Megatron 1984');
    expect(result.status).toBe('success');
    expect(result.sales).toHaveLength(0);
    expect(result.context[0]?.lotId).toBe('3221');
    expect(result.context[0]?.valuationEligible).toBe(false);
  });

  it('reports a real HTTP failure without retry or bypass', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('blocked', { status: 403 }));
    const result = await lookupLcg({ sourceId: 'lcg', category: 'vintage_toys', title: 'Toy', itemDetails: JSON.stringify({ subject: 'Toy' }) });
    expect(result.status).toBe('error');
    expect(result.messages[0]).toContain('HTTP 403');
  });
});
