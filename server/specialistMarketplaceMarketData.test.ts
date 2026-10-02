import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildGoldinSearchQueries, buildGoldinSearchQuery, buildSpecialistMarketplaceRequest, lookupSpecialistMarketplace, parseSpecialistMarketplaceHtml, resolveComicBookRealmAnalyzerUrl } from './specialistMarketplaceMarketData';

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
  it('builds Goldin queries from structured fields and includes comic year without publisher', () => {
    expect(buildGoldinSearchQuery({
      sourceId: 'goldin',
      title: 'X-Men #137 CGC 9.8',
      category: 'comics',
      grade: '9.8',
      certificationCompany: 'CGC',
      itemDetails: JSON.stringify({ comicTitle: 'X-Men', issueNumber: '137', publicationYear: '1980', publisher: 'Marvel' }),
    })).toBe('X-Men 137 1980 CGC 9.8');
    expect(buildGoldinSearchQueries({
      sourceId: 'goldin',
      title: 'X-Men #137 CGC 9.8',
      category: 'comics',
      grade: '9.8',
      certificationCompany: 'CGC',
      itemDetails: JSON.stringify({ comicTitle: 'X-Men', issueNumber: '137', publicationYear: '1980' }),
    })).toEqual([
      'X-Men 137 1980 CGC 9.8',
      'X-Men 137 1980',
      'X-Men 137',
      'X-Men #137 CGC 9.8',
    ]);
  });

  it('falls back to a vaguer Goldin query only after the stricter query returns zero lots', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ searchalgolia: { lots: [] } }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ searchalgolia: { lots: [{
        lot_id: 'goldin-xmen-fallback',
        meta_slug: 'x-men-137-cgc-98-fallback',
        title: 'X-Men #137 CGC 9.8',
        status: 'Completed_Sold',
        current_price: 300,
        buyer_premium: 20,
        end_timestamp: '2025-05-08T00:00:00Z',
      }] } }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await lookupSpecialistMarketplace({
      sourceId: 'goldin',
      title: 'X-Men #137 CGC 9.8',
      category: 'comics',
      grade: '9.8',
      certificationCompany: 'CGC',
      itemDetails: JSON.stringify({ comicTitle: 'X-Men', issueNumber: '137', publicationYear: '1980' }),
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string).search.keyword).toBe('X-Men 137 1980');
    expect(result.sales).toHaveLength(1);
    expect(result.query).toBe('X-Men 137 1980 CGC 9.8 → X-Men 137 1980');
    expect(result.messages.join(' ')).toMatch(/checked 2 bounded query variants/i);
  });

  it('adds all recorded comic signers to the strict Goldin query before signer-free fallbacks', () => {
    const input = {
      sourceId: 'goldin' as const,
      title: 'Amazing Spider-Man #300 CGC 9.8 Signed',
      category: 'comics',
      grade: '9.8',
      certificationCompany: 'CGC',
      itemDetails: JSON.stringify({ comicTitle: 'Amazing Spider-Man', issueNumber: '300', publicationYear: '1990', signed: 'Yes', signers: ['Stan Lee', 'John Romita'] }),
    };
    expect(buildGoldinSearchQueries(input)[0]).toBe('Amazing Spider-Man 300 1990 stan lee john romita CGC 9.8');
    expect(buildGoldinSearchQueries(input)).toContain('Amazing Spider-Man 300 1990 CGC 9.8');
  });

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
      body: JSON.stringify({ search: { queryType: 'Highest_Bids', keyword: 'Super Mario Bros. 3 NES 1990 WATA 9.60', size: 12, from: 0, show_only: 'Sold', hasAnalyticsConsent: false } }),
    }));
  });

  it('rejects a Goldin CGC Signature Series 9.6 when the selected comic is CGC 9.8', async () => {
    const comic = {
      sourceId: 'goldin' as const,
      title: 'X-Men #137 CGC 9.8',
      category: 'comics',
      grade: '9.8',
      certificationCompany: 'CGC',
      itemDetails: JSON.stringify({ comicTitle: 'X-Men', issueNumber: '137', publisher: 'Marvel' }),
    };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      searchalgolia: {
        lots: [{
          lot_id: 'goldin-xmen-98',
          meta_slug: 'x-men-137-cgc-98-example',
          title: 'X-Men #137 (1980 Marvel) - CGC 9.8 - Death of Phoenix',
          status: 'Completed_Sold',
          current_price: 400,
          buyer_premium: 20,
          end_timestamp: '2025-05-08T00:00:00Z',
        }, {
          lot_id: 'goldin-xmen-96',
          meta_slug: 'x-men-137-cgc-signature-series-96-example',
          title: 'X-Men #137 (1980 Marvel) - CGC Signature Series 9.6 - Death of Phoenix',
          status: 'Completed_Sold',
          current_price: 250,
          buyer_premium: 20,
          end_timestamp: '2025-05-09T00:00:00Z',
        }],
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    const result = await lookupSpecialistMarketplace(comic);
    expect(result.sales).toHaveLength(1);
    expect(result.sales[0]?.grade).toBe('9.8');
    expect(result.context).toHaveLength(1);
    expect(result.context[0]).toMatchObject({ grade: '9.6', identityMatched: false });
    expect(result.context[0]?.exclusionReason).toMatch(/grade conflicts/i);
  });

  it('rejects a same-grade CGC Signature Series lot when the selected comic is not signed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ searchalgolia: { lots: [{
      lot_id: 'goldin-edge-signed',
      meta_slug: 'edge-spider-verse-2-cgc-signature-series-98',
      title: 'Edge of Spider-Verse #2 (2014 Marvel) Variant Edition - CGC Signature Series 9.8 - Signed by Stan Lee',
      status: 'Completed_Sold',
      current_price: 4500,
      buyer_premium: 20,
      end_timestamp: '2025-05-08T00:00:00Z',
    }] } }), { status: 200, headers: { 'content-type': 'application/json' } })));

    const result = await lookupSpecialistMarketplace({
      sourceId: 'goldin',
      title: 'Edge of Spider-Verse #2 CGC 9.8',
      category: 'comics',
      grade: '9.8',
      certificationCompany: 'CGC',
      itemDetails: JSON.stringify({ comicTitle: 'Edge of Spider-Verse', issueNumber: '2', year: '2014', signed: 'No' }),
    });

    expect(result.sales).toHaveLength(0);
    expect(result.context[0]).toMatchObject({ grade: '9.8', identityMatched: false });
    expect(result.context[0]?.exclusionReason).toMatch(/autograph|signature not declared/i);
  });

  it('keeps Goldin’s $425,000 Jordan winning bid in dollars before calculating the $510,000 all-in amount', async () => {
    const jordanRookie = {
      sourceId: 'goldin' as const,
      title: '1986-87 Fleer #57 Michael Jordan Rookie Card PSA GEM MT 10',
      category: 'sports_cards',
      grade: '10',
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
    expect(result.reefApiAudit).toMatchObject({ apiCalls: 3, searchCalls: 1, detailCalls: 2, estimatedCredits: 3, creditBasis: 'one-credit-per-request' });
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
    expect(result.reefApiAudit).toMatchObject({ apiCalls: 2, searchCalls: 1, detailCalls: 1, estimatedCredits: 2 });
  });
});

describe("Comic Book Realm CGC guide context adapter", () => {
  const comic = {
    sourceId: "comic_book_realm" as const,
    title: "X-Men #137",
    category: "comics",
    grade: "9.8",
    certificationCompany: "CGC",
    itemDetails: JSON.stringify({
      issueNumber: "137",
      year: "1980",
      title: "X-Men",
    }),
  };
  const cbrUrl =
    "https://comicbookrealm.com/cgc-analyzer/comic/id/535/marvel-comics-x-men-137";
  it("builds an automatic public CGC Analyzer search and preserves direct issue support", () => {
    expect(buildSpecialistMarketplaceRequest(comic)).toMatchObject({
      url: "https://comicbookrealm.com/cgc-analyzer/search-results/X-Men%20137",
      error: null,
    });
    expect(
      buildSpecialistMarketplaceRequest({ ...comic, sourceUrl: cbrUrl })
    ).toEqual({ url: cbrUrl, error: null });
    expect(
      buildSpecialistMarketplaceRequest({
        ...comic,
        sourceUrl: "https://comicbookrealm.com/series/113/535/x-men-137",
      }).url
    ).toBeNull();
  });
  it("includes issue number when the inventory uses issueNo and comicTitle aliases", () => {
    expect(buildSpecialistMarketplaceRequest({
      ...comic,
      title: "DareDevil 1st Electra",
      itemDetails: JSON.stringify({ comicTitle: "DareDevil", issueNo: "168", publisher: "Marvel" }),
    })).toMatchObject({
      url: "https://comicbookrealm.com/cgc-analyzer/search-results/Dare%20Devil%20168",
      error: null,
    });
  });
  it("selects the exact non-facsimile issue from public search results", () => {
    const searchHtml = `<a href="/cgc-analyzer/comic/id/209295/marvel-comics-x-men-facsimile-edition-137">The X-Men #137 Marvel Comics</a><a href="/cgc-analyzer/comic/id/535/marvel-comics-x-men-137">The X-Men #137 Marvel Comics</a><a href="/cgc-analyzer/comic/id/344706/editions-heritage-x-men-137-french-canadian-edition">X-Men #137 Editions Heritage</a>`;
    expect(resolveComicBookRealmAnalyzerUrl(searchHtml, comic, "https://comicbookrealm.com/cgc-analyzer/search-results/X-Men%20137")).toBe(cbrUrl);
  });
  it("does not confuse the base Star Wars series with Return of the Jedi", () => {
    const starWars = {
      sourceId: "comic_book_realm" as const,
      title: "Star Wars #1",
      category: "comics",
      grade: "9.8",
      itemDetails: JSON.stringify({ issueNumber: "1", title: "Star Wars" }),
    };
    const searchHtml = `<a href="/cgc-analyzer/comic/id/1080/marvel-comics-star-wars-return-of-the-jedi-1">Star Wars: Return of the Jedi #1 Marvel Comics</a><a href="/cgc-analyzer/comic/id/570/marvel-comics-star-wars-1">Star Wars #1 Marvel Comics</a>`;
    expect(resolveComicBookRealmAnalyzerUrl(searchHtml, starWars, "https://comicbookrealm.com/cgc-analyzer/search-results/Star%20Wars%201")).toBe("https://comicbookrealm.com/cgc-analyzer/comic/id/570/marvel-comics-star-wars-1");
  });
  it("parses guide estimates and recorded-sale context without creating sold comps", () => {
    const html = `<html><head><title>X-Men #137 9/80 Marvel Comics (CGC Analyzer)</title></head><body><h1>X-Men #137 9/80 Marvel Comics (CGC Analyzer)</h1><table><tr><td>Certified Category:</td><td>Universal/Modern</td></tr><tr><td>Recorded Sales:</td><td>1,142</td></tr></table><table><tr><th>Grade</th><th>Population</th><th>Last Sale</th><th>Recorded Sales</th><th>Estimated Value</th><th>Raw Value</th></tr><tr><td>9.8</td><td>0</td><td>Sep 15, 2026</td><td>156</td><td>$455.00</td><td>*</td></tr><tr><td>9.6</td><td>0</td><td>Sep 8, 2026</td><td>295</td><td>$165.00</td><td>*</td></tr><tr><td>9.4</td><td>0</td><td>Sep 13, 2026</td><td>212</td><td>$120.00</td><td>*</td></tr></table></body></html>`;
    const result = parseSpecialistMarketplaceHtml(
      "comic_book_realm",
      html,
      comic,
      cbrUrl
    );
    expect(result.status).toBe("success");
    expect(result.sales).toEqual([]);
    expect(result.context).toHaveLength(3);
    expect(result.guideSummary).toMatchObject({
      totalRecordedSales: 1142,
      certifiedCategory: "Universal/Modern",
    });
    expect(result.guideRows?.[0]).toMatchObject({
      grade: "9.8",
      recordedSales: 156,
      estimatedValue: 455,
    });
    expect(result.context[0]).toMatchObject({
      price: 455,
      currency: "USD",
      valuationEligible: false,
      completed: false,
    });
    expect(result.context[0]?.exclusionReason).toMatch(
      /aggregated guide estimate/i
    );
  });
});
