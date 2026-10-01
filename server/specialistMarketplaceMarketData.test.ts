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

const weissComic = {
  sourceId: 'weiss' as const,
  title: 'Marvel Incredible Hulk #2 (1962) CGC 5.5',
  category: 'comics',
  grade: '5.5',
  certificationCompany: 'CGC',
  itemDetails: JSON.stringify({ year: '1962', issueNumber: '2', title: 'Incredible Hulk' }),
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

  it('uses the verified Weiss public completed-lot endpoint automatically across all mapped categories', () => {
    expect(buildSpecialistMarketplaceRequest(weissComic)).toEqual({
      url: 'https://api-frontend.nextlot.net/api/frontend/v1/sites/2218285/search/lots',
      error: null,
    });

    for (const category of ['comics', 'sports_cards', 'vintage_toys', 'video_games', 'stamps', 'coins', 'pokemon', 'movies', 'music', 'autographs', 'disney_pins']) {
      expect(buildSpecialistMarketplaceRequest({ ...weissComic, category }), `Weiss should automatically search ${category}`).toEqual({
        url: 'https://api-frontend.nextlot.net/api/frontend/v1/sites/2218285/search/lots',
        error: null,
      });
    }
  });

  it('runs one capped public Weiss completed-lot search, preserves final hammer bids, and retains non-completed rows as context-only', async () => {
    const response = new Response(JSON.stringify({
      total_count: 2,
      data: [{
        id: 48137391,
        auction_id: 1803422,
        number: '59',
        name: 'Marvel Incredible Hulk #2 (1962) CGC 5.5',
        description_html: 'Marvel Comics. Certified CGC 5.5.',
        focal_media_file_url_thumb_image: 'https://nlnx-media-files-production.s3.amazonaws.com/weiss/hulk.jpg',
        is_completed: true,
        leading_bid_amount_cents: 280000,
        auction: { id: 1803422, name: 'February Comics, Comic Art, & Animation', is_completed: true, completes_at: 1772061960, currency_code: 'USD' },
      }, {
        id: 48137392,
        auction_id: 1803422,
        number: '60',
        name: 'Marvel Avengers #1 CGC 5.5',
        is_completed: false,
        leading_bid_amount_cents: 500000,
        auction: { id: 1803422, name: 'February Comics, Comic Art, & Animation', is_completed: true, completes_at: 1772061960, currency_code: 'USD' },
      }],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
    Object.defineProperty(response, 'url', { value: 'https://api-frontend.nextlot.net/api/frontend/v1/sites/2218285/search/lots' });
    const fetchMock = vi.fn(async () => response);
    vi.stubGlobal('fetch', fetchMock);

    const result = await lookupSpecialistMarketplace(weissComic);

    expect(result.status).toBe('success');
    expect(result.recordCap).toBe(12);
    expect(result.sales).toHaveLength(1);
    expect(result.sales[0]).toMatchObject({
      sourceId: 'weiss',
      completed: true,
      price: 2800,
      winningBid: 2800,
      buyerPremiumIncluded: false,
      buyerPremiumPercentage: null,
      currency: 'USD',
      priceBasis: 'realized',
      url: 'https://weiss.auction/auctions/1803422/lots/48137391',
      valuationEligible: false,
    });
    expect(result.context).toHaveLength(1);
    expect(result.context[0]).toMatchObject({ completed: false, price: null, valuationEligible: false });
    expect(result.messages.join(' ')).toMatch(/final hammer bids; buyer premium is not added/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestUrl).toContain('page_number=1');
    expect(requestUrl).toContain('page_size=12');
    expect(requestUrl).toContain('filters=text_search%3A');
    expect(requestUrl).toContain('%7Cauction_completes_at%3A-1');
  });

  it('reports Weiss HTTP 403 without retrying or displaying a synthetic result', async () => {
    const fetchMock = vi.fn(async () => new Response('Forbidden', { status: 403, headers: { 'content-type': 'text/plain' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await lookupSpecialistMarketplace(weissComic);

    expect(result.status).toBe('error');
    expect(result.sales).toEqual([]);
    expect(result.context).toEqual([]);
    expect(result.messages.join(' ')).toMatch(/HTTP 403/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
    expect(request.error).toMatch(/source is not registered/i);
  });

  it('does not attempt the removed Alexander past-results query', () => {
    const request = buildSpecialistMarketplaceRequest({
      sourceId: 'alexander_historical',
      title: 'Donald Trump Signed Photograph',
      category: 'autographs',
    });
    expect(request.url).toBeNull();
    expect(request.error).toMatch(/source is not registered/i);
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

  it('verifies Auctionet search hits through bounded detail calls and keeps only recent records by default', async () => {
    const recent = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const old = new Date(Date.now() - 800 * 24 * 60 * 60 * 1000).toISOString();
    const searchPayload = { ok: true, data: { results: [
      { item_id: 101, title: 'Pokemon Base Set Charizard', status: 'ended', is_sold: true, currency: 'USD', final_bid: 125, ends_at: recent, url: 'https://auctionet.com/en/101-charizard' },
      { item_id: 102, title: 'Pokemon Base Set Charizard', status: 'ended', is_sold: true, currency: 'USD', final_bid: 150, ends_at: old, url: 'https://auctionet.com/en/102-charizard' },
    ] } };
    const detail = (id: number, date: string, price: number) => ({ ok: true, data: { item_id: id, title: 'Pokemon Base Set Charizard', status: 'ended', is_sold: true, currency: 'USD', final_bid: price, ends_at: date, url: `https://auctionet.com/en/${id}-charizard`, category: 'Pokemon' } });
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/search')) return new Response(JSON.stringify(searchPayload), { status: 200 });
      const body = JSON.parse(String(init?.body ?? '{}')) as { item_id?: number };
      return new Response(JSON.stringify(body.item_id === 101 ? detail(101, recent, 125) : detail(102, old, 150)), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await lookupSpecialistMarketplace({ sourceId: 'auctionet', title: 'Pokemon Base Set Charizard', category: 'pokemon' });
    expect(result.status).toBe('success');
    expect(result.historyWindow).toBe('recent_12_months');
    expect(result.sales).toHaveLength(1);
    expect(result.sales[0]).toMatchObject({ lotId: '101', price: 125, completed: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('supports Auctionet historical window without treating detail failures as sales', async () => {
    const old = new Date(Date.now() - 800 * 24 * 60 * 60 * 1000).toISOString();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/search')) return new Response(JSON.stringify({ ok: true, data: { results: [{ item_id: 201, title: 'Pokemon Base Set Blastoise', status: 'ended', is_sold: true, currency: 'USD', final_bid: 200, ends_at: old }] } }), { status: 200 });
      return new Response('Forbidden', { status: 403 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await lookupSpecialistMarketplace({ sourceId: 'auctionet', title: 'Pokemon Base Set Blastoise', category: 'pokemon', historyWindow: 'historical' });
    expect(result.status).toBe('success');
    expect(result.historyWindow).toBe('historical');
    expect(result.sales).toEqual([]);
    expect(result.context[0]?.completed).toBe(false);
    expect(result.context[0]?.exclusionReason).toMatch(/identity|completed-sale|USD|explicit sold/i);
  });
});
