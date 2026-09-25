import { describe, expect, it } from 'vitest';
import { buildParseAuctionSearch, getParseAuctionApiKey, isParseAuctionSourceSupported } from './parseAuctionMarketData';

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

  it('limits source applicability to the categories covered by each archive', () => {
    expect(isParseAuctionSourceSupported('lelands', 'sports_cards')).toBe(true);
    expect(isParseAuctionSourceSupported('lelands', 'autographs')).toBe(true);
    expect(isParseAuctionSourceSupported('pristine_auction', 'sports_cards')).toBe(true);
    expect(isParseAuctionSourceSupported('pristine_auction', 'comics')).toBe(false);
  });

  it('reads only the server-side Parse.bot credential', () => {
    expect(getParseAuctionApiKey({ PARSE_BOT_API_KEY: '  example  ' } as NodeJS.ProcessEnv)).toBe('example');
    expect(getParseAuctionApiKey({} as NodeJS.ProcessEnv)).toBeNull();
  });
});
