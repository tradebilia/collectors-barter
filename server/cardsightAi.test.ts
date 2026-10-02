import { describe, expect, it } from 'vitest';
import {
  buildCardsightCatalogQuery,
  flattenCardsightPricing,
  getCardsightApiKey,
  rankCardsightCatalogCandidates,
  selectCardsightParallel,
} from './cardsightAi';

const gradedSportsCard = {
  title: '1989 Upper Deck Ken Griffey Jr. #1 PSA 10',
  category: 'sports_cards',
  grade: '10',
  certificationCompany: 'PSA',
  itemDetails: JSON.stringify({
    year: '1989',
    manufacturer: 'Upper Deck',
    player: 'Ken Griffey Jr.',
    setName: '1989 Upper Deck',
    cardNumber: '1',
  }),
};

describe('Cardsight.ai Test AI adapter', () => {
  it('builds a bounded catalog lookup with the available stable card identity', () => {
    const query = buildCardsightCatalogQuery(gradedSportsCard);
    expect(query.categorySupported).toBe(true);
    expect(query.catalogLimit).toBe(5);
    expect(query.path).toContain('name=Ken+Griffey+Jr.');
    expect(query.path).toContain('number=1');
    expect(query.path).toContain('releaseName=1989+Upper+Deck');
    expect(query.path).toContain('year=1989');
  });

  it('requires strict subject, set, and card-number alignment before selecting a catalog card', () => {
    const ranked = rankCardsightCatalogCandidates(gradedSportsCard, [
      { id: 'exact', name: 'Ken Griffey Jr.', setName: '1989 Upper Deck', number: '1', releaseYear: '1989' },
      { id: 'wrong-number', name: 'Ken Griffey Jr.', setName: '1989 Upper Deck', number: '2', releaseYear: '1989' },
      { id: 'wrong-player', name: 'Ken Griffey Sr.', setName: '1989 Upper Deck', number: '1', releaseYear: '1989' },
    ]);
    expect(ranked[0]).toMatchObject({ card: { id: 'exact' }, exactIdentity: true });
    expect(ranked.find((entry) => entry.card.id === 'wrong-number')?.exactIdentity).toBe(false);
    expect(ranked.find((entry) => entry.card.id === 'wrong-player')?.exactIdentity).toBe(false);
  });

  it('maps a Shadowless Pokémon listing to the Base release while retaining Shadowless as the required parallel', () => {
    const input = {
      title: 'Pokemon Charizard Shadowless #4 PSA 9',
      category: 'pokemon',
      grade: '9',
      certificationCompany: 'PSA',
      itemDetails: JSON.stringify({ cardName: 'Charizard', setName: 'Shadowless', cardNumber: '4/102', editionEra: 'Shadowless', year: '1999' }),
    };
    const query = buildCardsightCatalogQuery(input);
    expect(query.path).toContain('releaseName=Base');
    expect(query.identity.variant).toBe('Shadowless');
    const ranked = rankCardsightCatalogCandidates(input, [{ id: 'base-charizard', name: 'Charizard', releaseName: 'Base', number: '4', releaseYear: '1999' }]);
    expect(ranked[0]?.exactIdentity).toBe(true);
    expect(selectCardsightParallel({ parallels: [{ id: 'shadowless', name: 'Shadowless' }] }, query.identity.variant)).toMatchObject({ id: 'shadowless', status: 'exact' });
  });

  it('requires an exact declared parallel before price, market, or population evidence is used', () => {
    expect(selectCardsightParallel({ parallels: [{ id: 'gold', name: 'Gold Refractor' }] }, 'Gold')).toEqual({ id: 'gold', name: 'Gold Refractor', status: 'exact' });
    expect(selectCardsightParallel({ parallels: [{ id: 'gold', name: 'Gold Refractor' }] }, 'Black')).toEqual({ id: null, name: null, status: 'review_required' });
    expect(selectCardsightParallel({ parallels: [{ id: 'gold', name: 'Gold Refractor' }] }, '')).toEqual({ id: null, name: null, status: 'base' });
  });

  it('keeps only the exact grading-company and grade partition for a graded item', () => {
    const sales = flattenCardsightPricing({
      graded: [
        { company_name: 'PSA', grades: [
          { grade_value: '10', grade_id: 'psa-10', records: [{ title: 'PSA 10 auction', price: 100, date: '2026-09-01', source: 'ebay', listing_type: 'auction' }] },
          { grade_value: '9', grade_id: 'psa-9', records: [{ title: 'PSA 9 auction', price: 50, date: '2026-09-01', source: 'ebay', listing_type: 'auction' }] },
        ] },
        { company_name: 'BGS', grades: [
          { grade_value: '10', grade_id: 'bgs-10', records: [{ title: 'BGS 10 auction', price: 200, date: '2026-09-01', source: 'ebay', listing_type: 'auction' }] },
        ] },
      ],
    }, gradedSportsCard);

    expect(sales).toHaveLength(1);
    expect(sales[0]).toMatchObject({ title: 'PSA 10 auction', certificationCompany: 'PSA', grade: '10', completed: true, saleStatus: 'completed' });
  });

  it('labels fixed-price records as non-valuation asking-price context', () => {
    const sales = flattenCardsightPricing({
      raw: { records: [{ title: 'Buy it now', price: 100, date: '2026-09-01', source: 'ebay', listing_type: 'fixed' }] },
    }, { title: 'Ungraded card', category: 'sports_cards' });
    expect(sales[0]).toMatchObject({ completed: false, saleStatus: 'active' });
    expect(sales[0]?.priceSemantics).toContain('context only');
  });

  it('only reads the configured Cardsight.ai key from server-side environment', () => {
    expect(getCardsightApiKey({ CARDSIGHT_API_KEY: ' cardsight_example ' } as NodeJS.ProcessEnv)).toBe('cardsight_example');
    expect(getCardsightApiKey({} as NodeJS.ProcessEnv)).toBeNull();
  });

  it('keeps full pricing, time-series, marketplace, and population payloads distinct', async () => {
    const source = await import('node:fs').then((fs) => fs.readFileSync(new URL('./cardsightAi.ts', import.meta.url), 'utf8'));
    expect(source).toContain('/pricing/${encodeURIComponent(cardId)}?');
    expect(source).toContain('/pricing/${encodeURIComponent(cardId)}/timeseries?');
    expect(source).toContain('/marketplace/${encodeURIComponent(cardId)}?');
    expect(source).toContain('/population/card/${encodeURIComponent(cardId)}');
    expect(source).toContain('pricingDetails: pricing.payload');
    expect(source).toContain('pricingTimeseriesDetails: pricingTimeseries.payload');
    expect(source).toContain('marketplaceDetails: marketplace.payload');
    expect(source).toContain('populationDetails: population.payload');
  });
});
