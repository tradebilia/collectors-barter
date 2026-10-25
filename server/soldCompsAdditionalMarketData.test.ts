import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookupMercariSoldComps, lookupTcgplayerSoldComps, SOLD_COMPS_ADDITIONAL_LIMITS } from './soldCompsAdditionalMarketData';

const originalKey = process.env.SOLD_COMPS_API_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.SOLD_COMPS_API_KEY;
  else process.env.SOLD_COMPS_API_KEY = originalKey;
  vi.restoreAllMocks();
});

describe('SoldComps additional marketplace adapters', () => {
  it('returns no provider request when the API key is not configured', async () => {
    delete process.env.SOLD_COMPS_API_KEY;
    delete process.env.SOLID_COMPS_API_KEY;
    const fetchMock = vi.fn();
    const result = await lookupMercariSoldComps({ title: 'Charizard', category: 'pokemon' }, fetchMock as unknown as typeof fetch);
    expect(result.error).toBe('Sold-Comps API key not configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('normalizes bounded Mercari sold results as context-only records', async () => {
    process.env.SOLD_COMPS_API_KEY = 'test-key';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [{ itemId: 'm1', title: 'Charizard PSA 10', price: '185.00', currency: 'USD', status: 'sold', condition: 'Like New', soldAt: '2026-09-01', imageUrl: 'https://img.test/1.jpg', url: 'https://www.mercari.com/us/item/m1/' }],
      hasNextPage: true,
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const result = await lookupMercariSoldComps({ title: 'Charizard', category: 'pokemon' }, fetchMock as unknown as typeof fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestedUrl = String(fetchMock.mock.calls[0][0]);
    expect(requestedUrl).toContain('/v1/mercari?');
    expect(requestedUrl).toContain('sold=true');
    expect(requestedUrl).toContain(`count=${SOLD_COMPS_ADDITIONAL_LIMITS.maxMercariItems}`);
    expect(result.listings).toMatchObject([{ sourceId: 'mercari_sold_comps', price: 185, evidenceDisposition: 'warning_review', endedAt: '2026-09-01' }]);
  });

  it('builds Disney Pins Mercari criteria from character, pin name, and category', async () => {
    process.env.SOLD_COMPS_API_KEY = 'test-key';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const result = await lookupMercariSoldComps({
      title: 'Eeyore Around the World Pin Limited Edition',
      category: 'disney_pins',
      itemDetails: JSON.stringify({ character: 'Eeyore', pinName: 'Around the World', series: 'Around the World' }),
    }, fetchMock as unknown as typeof fetch);
    const requestedUrl = String(fetchMock.mock.calls[0][0]);
    expect(result.query).toBe('Eeyore Around the World Disney Pin');
    expect(new URL(requestedUrl).searchParams.get('keyword')).toBe('Eeyore Around the World Disney Pin');
  });

  it('builds coin Mercari criteria in year, variety, grader, grade order without denomination or country', async () => {
    process.env.SOLD_COMPS_API_KEY = 'test-key';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const result = await lookupMercariSoldComps({
      title: '1896 $1 United States PCGS MS63',
      category: 'coins',
      grade: 'MS63',
      certificationCompany: 'PCGS',
      itemDetails: JSON.stringify({ year: 1896, country: 'United States', denomination: '$1', variety: 'Morgan' }),
    }, fetchMock as unknown as typeof fetch);
    expect(result.query).toBe('1896 Morgan PCGS MS63');
    expect(result.query).not.toContain('$1');
    expect(result.query).not.toContain('United States');
    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get('keyword')).toBe('1896 Morgan PCGS MS63');
  });

  it('uses series as the coin variety fallback and does not duplicate repeated fields', async () => {
    process.env.SOLD_COMPS_API_KEY = 'test-key';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const result = await lookupMercariSoldComps({
      title: '1896 Morgan PCGS MS63',
      category: 'coins',
      grade: 'MS63',
      certificationCompany: 'PCGS',
      itemDetails: JSON.stringify({ year: '1896', denomination: '$1', series: 'Morgan', variety: 'Morgan', country: 'United States' }),
    }, fetchMock as unknown as typeof fetch);
    expect(result.query).toBe('1896 Morgan PCGS MS63');
  });

  it('builds Video Game Mercari criteria from the same fields as eBay Sold', async () => {
    process.env.SOLD_COMPS_API_KEY = 'test-key';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const result = await lookupMercariSoldComps({
      title: 'Super Mario Bros. 3 sealed game PSA 9.5',
      category: 'video_games',
      grade: '9.5',
      certificationCompany: 'PSA',
      condition: 'mint',
      itemDetails: JSON.stringify({ gameTitle: 'Super Mario Bros. 3', platform: 'Other', customPlatform: 'NES', releaseYear: '1990', upc: '012345678905', sealed: 'yes' }),
    }, fetchMock as unknown as typeof fetch);
    expect(result.query).toBe('1990 Super Mario Bros. 3 NES PSA 9.5');
    expect(result.query).not.toContain('012345678905');
    expect(result.query).not.toContain('sealed');
    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get('keyword')).toBe('1990 Super Mario Bros. 3 NES PSA 9.5');
  });

  it('omits Video Game condition from ungraded Mercari criteria', async () => {
    process.env.SOLD_COMPS_API_KEY = 'test-key';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const result = await lookupMercariSoldComps({
      title: 'Sonic the Hedgehog cartridge',
      category: 'video_games',
      condition: 'good',
      itemDetails: JSON.stringify({ gameTitle: 'Sonic the Hedgehog', platform: 'Genesis', releaseYear: '1991' }),
    }, fetchMock as unknown as typeof fetch);
    expect(result.query).toBe('1991 Sonic the Hedgehog Genesis');
    expect(result.query).not.toContain('good');
  });

  it('omits a zero placeholder grade for an ungraded coin', async () => {
    process.env.SOLD_COMPS_API_KEY = 'test-key';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const result = await lookupMercariSoldComps({
      title: '1982 Mexican coin',
      category: 'coins',
      grade: '0.00',
      itemDetails: JSON.stringify({ year: '1982', country: 'Mexico', denomination: '1', mintMark: 'Mexican Mint', condition: 'near_mint' }),
    }, fetchMock as unknown as typeof fetch);
    expect(result.query).toBe('1982');
    expect(result.query).not.toContain('0.00');
  });

  it('does not call TCGplayer for non-Pokémon categories', async () => {
    process.env.SOLD_COMPS_API_KEY = 'test-key';
    const fetchMock = vi.fn();
    const result = await lookupTcgplayerSoldComps({ title: 'Charizard', category: 'sports_cards' }, fetchMock as unknown as typeof fetch);
    expect(result.error).toBe('Sold-Comps TCGplayer is available for Pokémon only');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('searches Pokémon products then retrieves only dated positive-price sales', async () => {
    process.env.SOLD_COMPS_API_KEY = 'test-key';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ productId: 123, name: 'Charizard', setName: 'Base Set', number: '4/102', productLine: 'Pokemon', url: 'https://www.tcgplayer.com/product/123', imageUrl: 'https://img.test/card.jpg' }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [
        { price: 42, shippingPrice: 1.49, condition: 'Near Mint', variant: 'Holofoil', language: 'English', quantity: 1, soldDate: '2026-09-07T18:32:25Z' },
        { price: 0, shippingPrice: 1.49, soldDate: '2026-09-07T18:32:26Z' },
        { price: 20, shippingPrice: 1.49, soldDate: null },
      ] }), { status: 200 }));
    const result = await lookupTcgplayerSoldComps({ title: 'Charizard Base Set', category: 'pokemon' }, fetchMock as unknown as typeof fetch);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/v1/tcgplayer/search?');
    expect(String(fetchMock.mock.calls[1][0])).toContain('/v1/tcgplayer/sales?productId=123');
    expect(result.listings).toHaveLength(1);
    expect(result.listings[0]).toMatchObject({ sourceId: 'tcgplayer_sold_comps', price: 42, endedAt: '2026-09-07T18:32:25Z', evidenceDisposition: 'warning_review' });
  });
});
