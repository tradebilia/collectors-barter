import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildHakesSearchQueryForTest, HAKES_TEST_URLS, lookupHakes } from './hakesMarketData';
import { getSandboxSpecialistSource, isSandboxSpecialistSourceApplicable } from '../shared/sandboxSpecialistSources';

const target = {
  title: 'Star Wars #1 CGC 9.8',
  category: 'comics',
  grade: '9.8',
  certificationCompany: 'CGC',
  itemDetails: JSON.stringify({ comicTitle: 'Star Wars', issueNumber: '1', publicationYear: '1977' }),
};

afterEach(() => vi.restoreAllMocks());

describe('Hake’s full public catalog adapter', () => {
  it('uses structured fields rather than the free-form title', () => {
    expect(buildHakesSearchQueryForTest(target)).toBe('Star Wars 1 1977');
    expect(buildHakesSearchQueryForTest(target)).not.toContain('CGC');
  });

  it('maps every applicable pop-culture Tradebilia category and remains context-only', () => {
    const source = getSandboxSpecialistSource('hakes');
    expect(source?.searchContract).toBe('automatic_title_search');
    for (const category of ['comics', 'sports cards', 'vintage toys', 'video games', 'movies', 'music', 'autographs', 'disney pins', 'pokemon']) {
      expect(isSandboxSpecialistSourceApplicable('hakes', category), category).toBe(true);
    }
    expect(isSandboxSpecialistSourceApplicable('hakes', 'coins')).toBe(false);
    expect(source?.evidenceMode).toBe('context_only_until_adapter');
  });

  it('parses bounded closed-catalog candidates and never marks them valuation-eligible', async () => {
    const pastHtml = `<a href="/auctions/hakes-auctions/september-2026-pop-culture-auction-24709/catalog">View Catalog</a>`;
    const catalogHtml = `
      <html><head><title>September 2026 Pop Culture Auction</title></head><body>
        <div class="gtm-visible_item" id="stl-9830655">
          <a href="https://www.hakes.com/online-auctions/hakes-auctions/star-wars-1-cgc-98-9830655">STAR WARS #1 CGC 9.8</a>
          <img src="/images/star-wars.jpg" />
          Lot 4 Sold for $2,400 September 30, 2026
        </div>
      </body></html>`;
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(pastHtml, { status: 200, headers: { 'content-type': 'text/html' } }))
      .mockResolvedValueOnce(new Response(catalogHtml, { status: 200, headers: { 'content-type': 'text/html' } }));

    const result = await lookupHakes(target);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(HAKES_TEST_URLS.pastAuctions);
    expect(result.status).toBe('success');
    expect(result.query).toBe('Star Wars 1 1977');
    expect(result.sales).toHaveLength(1);
    expect(result.sales[0]).toMatchObject({ title: 'STAR WARS #1 CGC 9.8', price: 2400, completed: true, identityMatched: true, valuationEligible: false, priceBasis: 'closed' });
    expect(result.sales[0]?.buyerPremiumIncluded).toBeNull();
    expect(result.messages[0]).toMatch(/context-only/i);
  });

  it('keeps active/current-bid catalog records in context and does not treat asking prices as sales', async () => {
    const pastHtml = `<a href="/auctions/hakes-auctions/current/catalog">View Catalog</a>`;
    const catalogHtml = `<div class="gtm-visible_item" id="stl-1234567"><a href="/online-auctions/hakes-auctions/star-wars-1-1234567">STAR WARS #1</a> Lot 1 Current Bid $500 Register to Bid</div>`;
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(pastHtml, { status: 200, headers: { 'content-type': 'text/html' } }))
      .mockResolvedValueOnce(new Response(catalogHtml, { status: 200, headers: { 'content-type': 'text/html' } }));

    const result = await lookupHakes(target);
    expect(result.sales).toHaveLength(0);
    expect(result.context).toHaveLength(1);
    expect(result.context[0]).toMatchObject({ completed: false, price: null, valuationEligible: false });
  });
});
