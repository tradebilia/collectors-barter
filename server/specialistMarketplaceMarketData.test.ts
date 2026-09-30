import { describe, expect, it } from 'vitest';
import { buildSpecialistMarketplaceRequest, parseSpecialistMarketplaceHtml } from './specialistMarketplaceMarketData';

const videoGame = {
  sourceId: 'goldin' as const,
  title: '1978 Atari Space Invaders Sealed Video Game Wata 9.4',
  category: 'video_games',
  grade: '9.40',
  certificationCompany: 'WATA',
  itemDetails: JSON.stringify({ year: '1978', platform: 'Atari 2600', title: 'Space Invaders' }),
};

const vintageToy = {
  sourceId: 'morphy' as const,
  title: 'Caterpillar Tractor Tin Toy 1930s',
  category: 'vintage_toys',
  itemDetails: JSON.stringify({ manufacturer: 'Caterpillar', itemType: 'Tin Toy', era: '1930s' }),
};

const morphyLotUrl = 'https://auctions.morphyauctions.com/LOT123456.aspx';

describe('bounded specialist marketplace adapters', () => {
  it('hard-stops Goldin when its public Video Games + Sold response is only a JavaScript shell', () => {
    const request = buildSpecialistMarketplaceRequest(videoGame);
    expect(request.url).toBeNull();
    expect(request.error).toMatch(/no verified public completed-sale request contract/i);
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
