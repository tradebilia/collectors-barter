import { afterEach, describe, expect, it, vi } from 'vitest';
import { LCG_MAX_RECORDS, lookupLcg } from './lcgMarketData';

afterEach(() => vi.restoreAllMocks());

describe('LCG Auctions adapter', () => {
  it('uses only the structured character or toy name in the LCG request', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(`
      <html><body>
        <a href="/bids/bidplace.aspx?itemid=3221">1984 Transformers Megatron AFA 90</a>
      </body></html>`, { status: 200, headers: { 'content-type': 'text/html' } }));
    const result = await lookupLcg({ sourceId: 'lcg', category: 'vintage_toys', title: 'ignored title', itemDetails: JSON.stringify({ brand: 'Hasbro', line: 'Transformers', toyName: 'Megatron', year: '1984' }), grade: '90', certificationCompany: 'AFA' });
    expect(decodeURIComponent(String(vi.mocked(fetch).mock.calls[0]?.[0]))).toContain('SearchText=Megatron');
    expect(decodeURIComponent(String(vi.mocked(fetch).mock.calls[0]?.[0]))).not.toContain('Hasbro Transformers 1984 90 AFA');
    expect(result.status).toBe('success');
    expect(result.sales).toHaveLength(0);
    expect(result.context[0]?.lotId).toBe('3221');
    expect(result.context[0]?.valuationEligible).toBe(false);
  });

  it('enriches a gallery lot from its detail page with completed sale facts', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('/Lots/Gallery')) {
        return new Response('<html><body><a href="/bids/bidplace.aspx?itemid=3221">1984 Transformers Megatron AFA 90</a></body></html>', { status: 200 });
      }
      return new Response(`<html><body>
        <h1>1984 Transformers: Megatron No Rubsign AFA 90</h1>
        <div>End: 9/13/2026 5:00 PM EST</div>
        <div>Prices Shown Include Buyer's Premium.</div>
        <div>SOLD FOR $161,457.60</div>
        <img src="/images/3221.jpg" />
      </body></html>`, { status: 200 });
    });
    const result = await lookupLcg({ sourceId: 'lcg', category: 'vintage_toys', title: 'ignored title', itemDetails: JSON.stringify({ brand: 'Hasbro', line: 'Transformers', toyName: 'Megatron', year: '1984' }), grade: '90', certificationCompany: 'AFA' });
    const record = result.context[0];
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(record?.completed).toBe(true);
    expect(record?.saleStatus).toBe('completed');
    expect(record?.price).toBe(161457.6);
    expect(record?.date).toBe('2026-09-13T00:00:00.000Z');
    expect(record?.buyerPremiumIncluded).toBe(true);
    expect(record?.url).toContain('itemid=3221');
  });

  it('uses a 100-lot cap and reports HTTP failures without bypassing protections', async () => {
    expect(LCG_MAX_RECORDS).toBe(100);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('blocked', { status: 403 }));
    const result = await lookupLcg({ sourceId: 'lcg', category: 'vintage_toys', title: 'Toy', itemDetails: JSON.stringify({ brand: 'Hasbro', toyName: 'Toy' }) });
    expect(result.status).toBe('error');
    expect(result.messages[0]).toContain('HTTP 403');
  });
});
