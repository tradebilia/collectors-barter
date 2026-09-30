import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildSpecialistMarketplaceRequest, lookupSpecialistMarketplace, parseSpecialistMarketplaceHtml } from './specialistMarketplaceMarketData';

const goldinMarioLotUrl = 'https://goldin.co/item/1990-nes-nintendo-usa-super-mario-bros-3-right-variation-late-producti9parx';
const videoGame = {
  sourceId: 'goldin' as const,
  title: '1990 Super Mario Bros. 3 Sealed Video Game WATA 9.60',
  category: 'video_games',
  grade: '9.60',
  certificationCompany: 'WATA',
  itemDetails: JSON.stringify({ year: '1990', platform: 'NES', title: 'Super Mario Bros. 3' }),
};

const vintageToy = {
  sourceId: 'morphy' as const,
  title: 'Caterpillar Tractor Tin Toy 1930s',
  category: 'vintage_toys',
  itemDetails: JSON.stringify({ manufacturer: 'Caterpillar', itemType: 'Tin Toy', era: '1930s' }),
};

const morphyLotUrl = 'https://auctions.morphyauctions.com/LOT123456.aspx';

afterEach(() => vi.unstubAllGlobals());

describe('bounded specialist marketplace adapters', () => {
  it('requires a public Goldin item-detail URL and accepts the verified direct-lot route', () => {
    const missing = buildSpecialistMarketplaceRequest(videoGame);
    expect(missing.url).toBeNull();
    expect(missing.error).toMatch(/Paste a public Goldin \/item\//i);

    const rejected = buildSpecialistMarketplaceRequest({ ...videoGame, sourceUrl: 'https://goldin.co/buy/?show_only=Sold%20Items' });
    expect(rejected.url).toBeNull();
    expect(rejected.error).toMatch(/allowlisted public Goldin/i);

    const accepted = buildSpecialistMarketplaceRequest({ ...videoGame, sourceUrl: goldinMarioLotUrl });
    expect(accepted).toEqual({ url: goldinMarioLotUrl, error: null });

    for (const category of ['comics', 'sports_cards', 'vintage_toys', 'video_games', 'stamps', 'coins', 'pokemon', 'movies', 'music', 'autographs', 'disney_pins']) {
      expect(buildSpecialistMarketplaceRequest({ ...videoGame, category, sourceUrl: goldinMarioLotUrl }), `Goldin should accept a supplied public lot for ${category}`).toEqual({ url: goldinMarioLotUrl, error: null });
    }
  });

  it('reads a public Goldin direct-lot response, calculates all-in context, and preserves buyer-premium transparency', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      auction_title: 'Goldin September 2021 Auction',
      lot: {
        lot_id: '109637',
        lot_number: 48,
        title: '1990 NES Nintendo (USA) "Super Mario Bros. 3" Right Variation Sealed Video Game - WATA 9.6/A++',
        description: 'Encapsulated and graded 9.6 by WATA Games. Sealed Nintendo Entertainment System copy.',
        status: 'Completed_Sold',
        final_price: 28000,
        buyer_premium: '20',
        end_timestamp: '2021-09-19T00:40:00Z',
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    const result = await lookupSpecialistMarketplace({ ...videoGame, sourceUrl: goldinMarioLotUrl });
    expect(result.status).toBe('success');
    expect(result.sales).toHaveLength(1);
    expect(result.sales[0]).toMatchObject({
      sourceId: 'goldin',
      completed: true,
      price: 33600,
      winningBid: 28000,
      buyerPremiumPercentage: 20,
      buyerPremiumIncluded: true,
      priceBasis: 'closed',
      currency: 'USD',
      valuationEligible: false,
    });
    expect(result.messages.join(' ')).toMatch(/Winning bid \$28,000 plus 20% buyer premium equals displayed all-in context \$33,600/i);
  });

  it('requires a public allowlisted locator when a source has no generic keyword contract', () => {
    const request = buildSpecialistMarketplaceRequest(vintageToy);
    expect(request.url).toBeNull();
    expect(request.error).toMatch(/Paste a public closed Morphy/i);

    const rejected = buildSpecialistMarketplaceRequest({ ...vintageToy, sourceUrl: 'https://example.com/not-morphy' });
    expect(rejected.url).toBeNull();
    expect(rejected.error).toMatch(/allowlisted public Morphy/i);

    const accepted = buildSpecialistMarketplaceRequest({ ...vintageToy, sourceUrl: morphyLotUrl });
    expect(accepted).toEqual({ url: morphyLotUrl, error: null });
  });

  it('hard-stops a source without a verified public completed-sale request contract', () => {
    const request = buildSpecialistMarketplaceRequest({ ...videoGame, sourceId: 'heritage' });
    expect(request.url).toBeNull();
    expect(request.error).toMatch(/no verified public completed-sale request contract/i);
  });

  it('retains an explicit completed locator result as context-only and separates a different toy identity', () => {
    const html = `
      <html><head><title>Morphy Auctions — Past Lot Results</title></head><body>
        <h1>Past Auction Lots</h1>
        <article class="lot-card"><a href="/LOT123456.aspx">Caterpillar Tractor Tin Toy 1930s</a><span>Lot Sold</span><span>Sold: $1,080.00</span><span>Ended Dec 9, 2021</span></article>
        <article class="lot-card"><a href="/LOT123457.aspx">Dinky Tractor Tin Toy 1930s</a><span>Lot Sold</span><span>Sold: $800.00</span><span>Ended Dec 9, 2021</span></article>
      </body></html>`;
    const result = parseSpecialistMarketplaceHtml('morphy', html, vintageToy, morphyLotUrl);

    expect(result.status).toBe('success');
    expect(result.sales).toHaveLength(1);
    expect(result.sales[0]).toMatchObject({
      title: 'Caterpillar Tractor Tin Toy 1930s',
      completed: true,
      price: 1080,
      currency: 'USD',
      valuationEligible: false,
      priceBasis: 'closed',
      buyerPremiumIncluded: true,
      winningBid: null,
      buyerPremiumPercentage: null,
    });
    expect(result.context).toHaveLength(1);
    expect(result.context[0]?.exclusionReason).toMatch(/identity-token threshold/i);
  });

  it('does not fabricate a completed sale when a public locator exposes only a current bid', () => {
    const html = '<html><body><h1>Morphy Past Lots</h1><article><a href="/LOT123456.aspx">Caterpillar Tractor Tin Toy 1930s</a><span>Current Bid $900</span><span>Upcoming Auction</span></article></body></html>';
    const result = parseSpecialistMarketplaceHtml('morphy', html, vintageToy, morphyLotUrl);
    expect(result.sales).toEqual([]);
    expect(result.context).toHaveLength(1);
    expect(result.context[0]?.completed).toBe(false);
    expect(result.context[0]?.price).toBeNull();
  });
});
