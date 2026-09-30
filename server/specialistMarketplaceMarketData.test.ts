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
  it('uses the verified Goldin public sold-search endpoint automatically and preserves direct-lot support', () => {
    const automatic = buildSpecialistMarketplaceRequest(videoGame);
    expect(automatic).toEqual({ url: 'https://d1wu47wucybvr3.cloudfront.net/api/lots_v2', error: null });

    const accepted = buildSpecialistMarketplaceRequest({ ...videoGame, sourceUrl: goldinMarioLotUrl });
    expect(accepted).toEqual({ url: goldinMarioLotUrl, error: null });

    for (const category of ['comics', 'sports_cards', 'vintage_toys', 'video_games', 'stamps', 'coins', 'pokemon', 'movies', 'music', 'autographs', 'disney_pins']) {
      expect(buildSpecialistMarketplaceRequest({ ...videoGame, category }), `Goldin should automatically search ${category}`).toEqual({ url: 'https://d1wu47wucybvr3.cloudfront.net/api/lots_v2', error: null });
    }
  });

  it('runs one capped public Goldin title search, preserves dollar-denominated bids, and retains mismatches as context-only', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      searchalgolia: {
        total: 33,
        lots: [
          {
            lot_id: 'goldin-mario-1',
            lot_number: 611,
            meta_slug: '1990-nes-nintendo-usa-super-mario-bros-3-right-bros-sealed-video-gamegemqt',
            title: '1990 NES Nintendo Super Mario Bros. 3 (USA) Sealed Video Game - WATA 9.6/A++',
            status: 'Completed_Sold',
            current_price: 28000,
            buyer_premium: 20,
            end_timestamp: '2021-05-22T02:30:00Z',
          },
          {
            lot_id: 'goldin-mario-2',
            lot_number: 638,
            meta_slug: '1996-n64-nintendo-64-usa-super-mario-64-sealed-video-game-wata-9-2-ah4ckb',
            title: '1996 N64 Nintendo 64 Super Mario 64 (USA) Sealed Video Game - WATA 9.2/A+',
            status: 'Completed_Sold',
            current_price: 14170,
            buyer_premium: 20,
            end_timestamp: '2022-05-22T02:30:00Z',
          },
        ],
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await lookupSpecialistMarketplace(videoGame);
    expect(result.status).toBe('success');
    expect(result.recordCap).toBe(12);
    expect(result.sales).toHaveLength(1);
    expect(result.sales[0]).toMatchObject({
      completed: true,
      price: 33600,
      winningBid: 28000,
      buyerPremiumPercentage: 20,
      buyerPremiumIncluded: true,
      url: 'https://goldin.co/item/1990-nes-nintendo-usa-super-mario-bros-3-right-bros-sealed-video-gamegemqt',
      valuationEligible: false,
    });
    expect(result.context).toHaveLength(1);
    expect(result.context[0]?.exclusionReason).toMatch(/identity-token threshold|grade conflicts/i);
    expect(fetchMock).toHaveBeenCalledWith('https://d1wu47wucybvr3.cloudfront.net/api/lots_v2', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ search: { queryType: 'Highest_Bids', keyword: videoGame.title, size: 12, from: 0, show_only: 'Sold', hasAnalyticsConsent: false } }),
    }));
  });

  it('keeps Goldin’s $425,000 Jordan winning bid in dollars before calculating the $510,000 all-in amount', async () => {
    const jordanRookie = {
      sourceId: 'goldin' as const,
      title: '1986-87 Fleer #57 Michael Jordan Rookie Card PSA GEM MT 10',
      category: 'sports_cards',
      certificationCompany: 'PSA',
      itemDetails: JSON.stringify({ year: '1986-87', cardNumber: '57', player: 'Michael Jordan' }),
    };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      searchalgolia: {
        lots: [{
          lot_id: 'goldin-jordan-1',
          lot_number: 57,
          meta_slug: '1986-87-fleer-57-michael-jordan-rookie-card-psa-gem-mt-10eim16',
          title: '1986-87 Fleer #57 Michael Jordan Rookie Card – PSA GEM MT 10',
          status: 'Completed_Sold',
          current_price: 425000,
          buyer_premium: 20,
          end_timestamp: '2021-04-07T01:14:42Z',
        }, {
          lot_id: 'goldin-jordan-complete-set',
          lot_number: 58,
          meta_slug: '1986-87-fleer-basketball-psa-graded-high-grade-complete-set-132-includzfnwa',
          title: '1986-87 Fleer Basketball PSA-Graded Near Complete Set (131/132) – Includes #57 Michael Jordan Rookie Card PSA GEM MT 10',
          status: 'Completed_Sold',
          current_price: 425000,
          buyer_premium: 20,
          end_timestamp: '2022-03-13T03:30:11Z',
        }],
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    const result = await lookupSpecialistMarketplace(jordanRookie);
    expect(result.sales).toHaveLength(1);
    expect(result.sales[0]).toMatchObject({
      winningBid: 425000,
      buyerPremiumPercentage: 20,
      price: 510000,
      buyerPremiumIncluded: true,
    });
    expect(result.context).toHaveLength(1);
    expect(result.context[0]?.exclusionReason).toMatch(/single item versus lot\/bundle differs/i);
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
