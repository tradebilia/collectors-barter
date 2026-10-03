import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildParse130PointSearch, getParse130PointApiKey, lookupParse130PointSales, normalizeParse130PointSale, PARSE_130POINT_API_ID } from './parse130PointMarketData';

const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; vi.restoreAllMocks(); });

describe('Parse.bot 130point adapter', () => {
  const sportsCard = {
    title: '1989 Upper Deck Ken Griffey Jr. Rookie RC #1',
    category: 'sports_cards',
    grade: '10.00',
    certificationCompany: 'PSA',
    itemDetails: JSON.stringify({ year: '1989', manufacturer: 'Upper Deck', player: 'Ken Griffey Jr.', cardNumber: '1', gradingCompany: 'PSA', sport: 'Baseball' }),
  };

  it('builds the documented sold-search request from structured fields only', () => {
    const request = buildParse130PointSearch(sportsCard);
    expect(request.query).toContain('1989');
    expect(request.query).toContain('Upper Deck');
    expect(request.query).toContain('Ken Griffey Jr.');
    expect(request.query).toContain('PSA 10');
    expect(request.url).toContain(`/${PARSE_130POINT_API_ID}/search_sold_items`);
    expect(request.url).toContain('sort=EndTimeSoonest');
    expect(request.url).toContain('limit=200');
    expect(request.url).toContain('marketplace=all');
    expect(request.url).not.toContain(encodeURIComponent(sportsCard.title));
  });

  it('does not issue a title fallback query when structured fields are absent', () => {
    const request = buildParse130PointSearch({ title: 'Charizard Base Set #4', category: 'pokemon' });
    expect(request.query).toBe('');
    expect(request.url).not.toContain('query=');
  });

  it('normalizes dated USD sales and keeps non-USD or undated records context-only', () => {
    const sale = normalizeParse130PointSale({ id: 'sale-1', source_id: 'source-1', title: 'Ken Griffey Jr. PSA 10', price: 4500, currency: 'USD', end_time_utc: '2026-09-01T12:00:00Z', sold_via: 'eBay' }, Date.parse('2026-09-15T00:00:00Z'));
    expect(sale).toMatchObject({ id: 'sale-1', sourceId: 'one_thirty_point', price: 4500, currency: 'USD', completed: true, saleStatus: 'completed', valuationEligible: true, contextOnly: false, recency: 'recent' });
    expect(normalizeParse130PointSale({ price: 20, currency: 'CAD', title: 'Other' }, Date.parse('2026-09-15T00:00:00Z'))).toMatchObject({ valuationEligible: false, contextOnly: true, recency: 'undated' });
  });

  it('normalizes successful Parse.bot response and exposes count plus sale details', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { total_found: 1, items_returned: 1, items: [{ id: 'sale-1', title: 'Ken Griffey Jr. PSA 10', price: 4500, price_display: '$4,500.00', currency: 'USD', end_time_utc: '2026-09-01T12:00:00Z', sold_via: 'eBay', marketplace: 'ebay', sale_type: 'Auction', url: 'https://example.com/sale' }] } }))) as typeof fetch;
    const result = await lookupParse130PointSales(sportsCard);
    expect(result.status).toBe('success');
    expect(result.data).toMatchObject({ totalFound: 1, itemsReturned: 1 });
    expect(result.data?.items[0]).toMatchObject({ title: 'Ken Griffey Jr. PSA 10', price: 4500, marketplace: 'eBay', valuationEligible: true });
    expect(fetchMockUrl()).toContain(`/${PARSE_130POINT_API_ID}/search_sold_items`);
  });

  it('uses the server-side Parse.bot key only', () => {
    expect(getParse130PointApiKey({ PARSE_BOT_API_KEY: '  configured-key  ' } as NodeJS.ProcessEnv)).toBe('configured-key');
  });
});

function fetchMockUrl(): string { return String((global.fetch as any).mock.calls[0]?.[0] ?? ''); }
