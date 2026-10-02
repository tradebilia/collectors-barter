import { describe, expect, it } from 'vitest';
import { buildParseAuctionSearch, getParseAuctionApiKey, isParseAuctionSourceSupported, normalizeCollectSale } from './parseAuctionMarketData';

describe('Parse.bot auction market adapters', () => {
  const card = { title: '1989 Upper Deck Ken Griffey Jr. #1 PSA 10', category: 'sports_cards', grade: '10', certificationCompany: 'PSA', itemDetails: JSON.stringify({ player: 'Ken Griffey Jr.', setName: '1989 Upper Deck', cardNumber: '1' }) };

  it('builds the documented bounded Lelands archive request', () => {
    const request = buildParseAuctionSearch('lelands', card);
    expect(request.url).toContain('/scraper/d219970c-feb5-4d1a-a22e-9146392618be/search_sales');
    expect(request.url).toContain('limit=5');
    expect(request.url).toContain('sort=best');
    expect(request.query).toContain('Ken Griffey Jr.');
  });

  it('builds the documented completed-only Pristine request', () => {
    const request = buildParseAuctionSearch('pristine_auction', card);
    expect(request.url).toContain('/scraper/90fb8e63-d89d-4d24-8445-c25ef960c168/search_lots');
    expect(request.url).toContain('status=completed');
    expect(request.url).toContain('page=1');
  });

  it('builds the documented completed-only Collect Auctions request for sports cards', () => {
    const request = buildParseAuctionSearch('collect_auction', card);
    expect(request.url).toContain('/scraper/55b768f5-0318-4c87-b33c-7270166fd56e/search_sold');
    expect(request.url).toContain('page=1');
    expect(request.query).toContain('Ken Griffey Jr.');
  });

  it('limits source applicability to the categories covered by each archive', () => {
    expect(isParseAuctionSourceSupported('lelands', 'sports_cards')).toBe(true);
    expect(isParseAuctionSourceSupported('lelands', 'autographs')).toBe(true);
    expect(isParseAuctionSourceSupported('pristine_auction', 'sports_cards')).toBe(true);
    expect(isParseAuctionSourceSupported('pristine_auction', 'comics')).toBe(false);
    expect(isParseAuctionSourceSupported('collect_auction', 'sports_cards')).toBe(true);
    expect(isParseAuctionSourceSupported('collect_auction', 'comics')).toBe(false);
  });

  it('admits only explicit sold Collect Auctions detail records and preserves the hammer basis', () => {
    const target = { title: '1989 Upper Deck Ken Griffey Jr. #1', category: 'sports_cards', grade: '10', certificationCompany: 'PSA' };
    const sold = normalizeCollectSale({ status: 'completed_sold', title: '1989 Upper Deck Ken Griffey Jr. #1 PSA 10', hammer_price: 1250, sale_date: '2026-01-15', grader: 'PSA', grade: '10', currency: 'USD' }, target);
    const unsold = normalizeCollectSale({ status: 'active', title: '1989 Upper Deck Ken Griffey Jr. #1 PSA 10', hammer_price: 1250, grader: 'PSA', grade: '10' }, target);
    expect(sold.completed).toBe(true);
    expect(sold.price).toBe(1250);
    expect(sold.priceBasis).toBe('hammer');
    expect(unsold.completed).toBe(false);
    expect(unsold.price).toBeNull();
  });

  it('reads only the server-side Parse.bot credential', () => {
    expect(getParseAuctionApiKey({ PARSE_BOT_API_KEY: '  example  ' } as NodeJS.ProcessEnv)).toBe('example');
    expect(getParseAuctionApiKey({} as NodeJS.ProcessEnv)).toBeNull();
  });
});
