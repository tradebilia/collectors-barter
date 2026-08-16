import { describe, expect, it, vi, afterEach } from 'vitest';
import { classifySaleRecency, lookup130PointSales, lookupPriceCharting, lookupSgcCertification } from './parseMarketData';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('Parse SGC and PriceCharting adapters', () => {
  it('uses a POST cert_code request for the documented SGC endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { cert_code: '0453727', card_subject: 'Justin Herbert', grade: '10', population: '1' } }) });
    global.fetch = fetchMock as typeof fetch;

    const result = await lookupSgcCertification('0453727', { PARSE_BOT_API_KEY: 'configured-key' });

    expect(result.status).toBe('success');
    expect(result.data?.subject).toBe('Justin Herbert');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/f63ad1cb-5b08-4e33-9ea8-573b416e936d/search_cert'),
      expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ 'X-API-Key': 'configured-key' }), body: JSON.stringify({ cert_code: '0453727' }) }),
    );
  });

  it('uses PriceCharting search output slugs to fetch card detail pricing', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { cards: [{ name: 'Charizard', set: 'Base Set', set_slug: 'pokemon-base-set', card_slug: 'charizard-4' }] } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { name: 'Charizard #4', set: 'Base Set', prices: { ungraded: 100, psa_10: 1000 } } }) });
    global.fetch = fetchMock as typeof fetch;

    const result = await lookupPriceCharting('charizard base set', { PARSE_BOT_API_KEY: 'configured-key' });

    expect(result.status).toBe('success');
    expect(result.data?.prices.psa_10).toBe(1000);
    expect(fetchMock.mock.calls[0][0]).toContain('/search_pokemon_cards?query=charizard%20base%20set');
    expect(fetchMock.mock.calls[1][0]).toContain('/get_card_detail?set_slug=pokemon-base-set&card_slug=charizard-4');
  });

  it('uses the documented 130point sold-search endpoint with bounded read-only inputs', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { total_found: 1, items_returned: 1, items: [{ id: 'sale-1', title: 'Michael Jordan Rookie', price: 4500, currency: 'USD', date: '2026-08-01', sale_type: 'auction', sold_via: 'eBay', url: 'https://example.com/sale' }] } }) });
    global.fetch = fetchMock as typeof fetch;

    const result = await lookup130PointSales('Michael Jordan rookie', { PARSE_BOT_API_KEY: 'configured-key' });

    expect(result.status).toBe('success');
    expect(result.data?.items[0]?.marketplace).toBe('eBay');
    expect(result.data?.items[0]?.recency).toBe('recent');
    expect(fetchMock.mock.calls[0][0]).toContain('/28d873f5-47d5-4c01-a275-e80c6b3fc610/search_sold_items?sort=BestMatch&limit=10&query=Michael%20Jordan%20rookie&marketplace=all');
  });

  it('classifies older and undated 130point records as historical context rather than recent comparables', () => {
    const referenceTime = Date.parse('2026-08-16T00:00:00Z');

    expect(classifySaleRecency('2016-08-15', referenceTime)).toBe('historical');
    expect(classifySaleRecency('2026-06-01', referenceTime)).toBe('recent');
    expect(classifySaleRecency(null, referenceTime)).toBe('undated');
  });

  it('does not call either provider when the Parse key is unavailable', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    expect((await lookupSgcCertification('0453727', {})).status).toBe('error');
    expect((await lookupPriceCharting('charizard', {})).status).toBe('error');
    expect((await lookup130PointSales('Michael Jordan', {})).status).toBe('error');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
