import { describe, expect, it, vi, afterEach } from 'vitest';
import { classifySaleRecency, isPriceChartingCoinIdentityCompatible, lookup130PointSales, lookupPriceCharting, lookupPriceChartingBigMovers, lookupPriceChartingCardBySlugs, lookupPriceChartingCoin, lookupPriceChartingVideoGame, lookupPwccSales, lookupSgcCertification, parseErrorMessage } from './parseMarketData';

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

  it('searches PriceCharting coins and follows the returned slugs to detail pricing', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { coins: [{ name: '1909-S VDB Lincoln Cent', set_slug: 'lincoln-cents', coin_slug: '1909-s-vdb' }] } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { name: '1909-S VDB Lincoln Cent', mint: 'San Francisco', prices: { ungraded: 900, ms65: 12000 } } }) });
    global.fetch = fetchMock as typeof fetch;
    const result = await lookupPriceChartingCoin('1909 S VDB', { PARSE_BOT_API_KEY: 'configured-key' });
    expect(result.status).toBe('success');
    expect(result.data?.prices.ms65).toBe(12000);
    expect(fetchMock.mock.calls[0][0]).toContain('/search_coins?query=1909%20S%20VDB');
    expect(fetchMock.mock.calls[1][0]).toContain('/get_coin_detail?set_slug=lincoln-cents&coin_slug=1909-s-vdb');
  });

  it('rejects a different year or material instead of accepting a fuzzy coin match', async () => {
    expect(isPriceChartingCoinIdentityCompatible('1945 Walking Liberty Silver Half Dollar', '2016 W [GOLD] Walking Liberty Half Dollar')).toBe(false);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { coins: [{ name: '2016 W [GOLD] Walking Liberty Half Dollar', set_slug: 'walking-liberty', coin_slug: '2016-w-gold' }] } }),
    });
    global.fetch = fetchMock as typeof fetch;
    const result = await lookupPriceChartingCoin('1945 Walking Liberty Silver Half Dollar', { PARSE_BOT_API_KEY: 'configured-key' });
    expect(result.status).toBe('not_found');
    expect(result.message).toContain('conflicting year, material, or denomination');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses the bounded PriceCharting UPC endpoint for video games', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { title: 'The Legend of Zelda', platform: 'NES', upcs: ['045496630025'], prices: { cib: 80 } } }) });
    global.fetch = fetchMock as typeof fetch;
    const result = await lookupPriceChartingVideoGame('045496630025', { PARSE_BOT_API_KEY: 'configured-key' });
    expect(result.status).toBe('success');
    expect(result.data?.platform).toBe('NES');
    expect(fetchMock.mock.calls[0][0]).toContain('/lookup_video_game_by_upc?upc=045496630025');
  });

  it('supports compatible TCG detail lookups when item metadata provides exact slugs', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { name: 'Blue-Eyes White Dragon', set: 'Legend of Blue Eyes', card_number: 'LOB-001', prices: { ungraded: 40 } } }) });
    global.fetch = fetchMock as typeof fetch;
    const result = await lookupPriceChartingCardBySlugs('legend-of-blue-eyes', 'blue-eyes-white-dragon', { PARSE_BOT_API_KEY: 'configured-key' });
    expect(result.status).toBe('success');
    expect(result.data?.cardNumber).toBe('LOB-001');
    expect(fetchMock.mock.calls[0][0]).toContain('/get_card_detail?set_slug=legend-of-blue-eyes&card_slug=blue-eyes-white-dragon');
  });

  it('limits market movers to a context-only bounded list', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { movers: Array.from({ length: 30 }, (_, index) => ({ name: `Item ${index}`, change: index })) } }) });
    global.fetch = fetchMock as typeof fetch;
    const result = await lookupPriceChartingBigMovers({ PARSE_BOT_API_KEY: 'configured-key' });
    expect(result.status).toBe('success');
    expect(result.data?.movers).toHaveLength(25);
    expect(fetchMock.mock.calls[0][0]).toContain('/get_big_movers');
  });

  it('does not call either provider when the Parse key is unavailable', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    expect((await lookupSgcCertification('0453727', {})).status).toBe('error');
    expect((await lookupPriceCharting('charizard', {})).status).toBe('error');
    expect((await lookupPriceChartingCoin('1909', {})).status).toBe('error');
    expect((await lookupPriceChartingVideoGame('045496630025', {})).status).toBe('error');
    expect((await lookupPriceChartingCardBySlugs('set', 'card', {})).status).toBe('error');
    expect((await lookupPriceChartingBigMovers({})).status).toBe('error');
    expect((await lookup130PointSales('Michael Jordan', {})).status).toBe('error');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('treats older or undated 130point records as historical research context', () => {
    const now = Date.parse('2026-08-16T00:00:00Z');
    expect(classifySaleRecency('2026-02-16', now)).toBe('recent');
    expect(classifySaleRecency('2025-02-15', now)).toBe('historical');
    expect(classifySaleRecency('2014-03-01', now)).toBe('historical');
    expect(classifySaleRecency(null, now)).toBe('undated');
  });

  it('requests sold PWCC / Fanatics Collect listings and maps cents plus date recency', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [{ listing_uuid: 'lot-1', title: 'Charizard PSA 10', purchase_price_cents: 324000, sold_date: 1650170476, marketplace: 'PREMIER', grade: 10, grading_service: 'PSA', cert_number: '24909560' }], total_hits: 1 }) });
    global.fetch = fetchMock as typeof fetch;
    const result = await lookupPwccSales('charizard psa 10', { PARSE_BOT_API_KEY: 'configured-key' });
    expect(result.status).toBe('success');
    expect(result.data?.items[0]).toEqual(expect.objectContaining({ price: 3240, recency: 'historical', marketplace: 'PREMIER' }));
    expect(fetchMock.mock.calls[0][0]).toContain('/6f75fc48-78a3-4fa4-a96a-937d35bf9385/search_listings?keywords=charizard+psa+10&status=Sold&page=0&hits_per_page=10');
  });

  it('identifies Parse.bot credit exhaustion and provider-supplied errors clearly', () => {
    expect(parseErrorMessage(402, 'Parse PriceCharting', { error: { message: 'All your credits are used' } })).toContain('monthly credit limit');
    expect(parseErrorMessage(403, 'Parse SGC', { message: 'API key is invalid' })).toBe('Parse SGC credentials are not authorized (HTTP 403). Check the secure Parse key configuration.');
    expect(parseErrorMessage(500, 'Parse 130point', { error: { message: 'Upstream scraper unavailable' } })).toBe('Parse 130point returned HTTP 500: Upstream scraper unavailable');
  });

  it('surfaces a structured Parse.bot credit error from a live adapter', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 402, json: async () => ({ status: 'error', error: { message: 'All your credits are used' } }) }) as typeof fetch;
    const result = await lookup130PointSales('Michael Jordan rookie', { PARSE_BOT_API_KEY: 'configured-key' });
    expect(result.status).toBe('error');
    expect(result.message).toContain('monthly credit limit');
    expect(result.message).toContain('HTTP 402');
  });
});
