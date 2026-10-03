import { describe, expect, it } from 'vitest';
import { buildParseComcSearch, getParseComcApiKey, isParseComcSourceSupported, normalizeComcListing } from './parseComcMarketData';

describe('Parse.bot COMC adapter', () => {
  const sportsCard = {
    title: '1989 Upper Deck Ken Griffey Jr. Rookie RC #1',
    category: 'sports_cards',
    grade: '10.00',
    certificationCompany: 'PSA',
    itemDetails: JSON.stringify({ year: '1989', manufacturer: 'Upper Deck', player: 'Ken Griffey Jr.', cardNumber: '1', gradingCompany: 'PSA', sport: 'Baseball' }),
  };

  it('builds a bounded structured COMC request without using a raw listing title fallback', () => {
    const request = buildParseComcSearch(sportsCard);
    expect(request.query).toContain('1989');
    expect(request.query).toContain('Upper Deck');
    expect(request.query).toContain('Ken Griffey Jr.');
    expect(request.query).toContain('PSA 10');
    expect(request.url).toContain('/214a63d8-8383-4871-9267-593aec0bf063/search_listings');
    expect(request.url).toContain('grader=PSA');
    expect(request.url).toContain('category=');
    expect(request.url).toContain('sort=recently_added');
  });

  it('supports Sports Cards and Pokémon, while leaving Pokémon without a sports category filter', () => {
    expect(isParseComcSourceSupported('sports cards')).toBe(true);
    expect(isParseComcSourceSupported('pokemon')).toBe(true);
    const pokemon = buildParseComcSearch({ title: 'Charizard Base Set #4', category: 'pokemon', itemDetails: JSON.stringify({ year: '1999', setName: 'Base Set', cardNumber: '4', cardName: 'Charizard' }) });
    expect(pokemon.query).toContain('Charizard');
    expect(pokemon.url).not.toContain('category=');
  });

  it('normalizes active COMC asking-price inventory as context only', () => {
    const listing = normalizeComcListing({
      title: 'Ken Griffey Jr. [PSA 10 GEM MINT]',
      set_description: '1989 Upper Deck - [Base] #1',
      url: 'https://www.comc.com/Cards/Baseball/1989/Upper_Deck/1',
      price: '$5,000.00',
      quantity_available: 1,
      grader: 'PSA',
      grade: '10',
      attributes: ['Rookie'],
    }, sportsCard);
    expect(listing).toMatchObject({ price: 5000, currency: 'USD', active: true, completed: false, saleStatus: 'active', valuationEligible: false, contextOnly: true, grader: 'PSA', grade: '10' });
    expect(listing.priceSemantics).toContain('context only');
  });

  it('reads only the server-side Parse.bot credential', () => {
    expect(getParseComcApiKey({ PARSE_BOT_API_KEY: '  configured-key  ' } as NodeJS.ProcessEnv)).toBe('configured-key');
  });
});
