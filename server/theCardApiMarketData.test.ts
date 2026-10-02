import { describe, expect, it } from 'vitest';
import {
  buildTheCardApiQuery,
  getTheCardApiKey,
  rankTheCardApiCatalogCandidates,
} from './theCardApi';

const sportsListing = {
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
    sport: 'Baseball',
  }),
};

const pokemonListing = {
  title: 'Pokémon Charizard Base Set 4/102 Holo PSA 9',
  category: 'pokemon',
  grade: '9',
  certificationCompany: 'PSA',
  itemDetails: JSON.stringify({
    cardName: 'Charizard',
    setName: 'Base Set',
    cardNumber: '4/102',
    year: '1999',
  }),
};

describe('The Card API Test AI adapter', () => {
  it('builds a bounded sports-card completed-sales request with grade and provider filters', () => {
    const query = buildTheCardApiQuery(sportsListing);
    expect(query).toMatchObject({ category: 'sports', saleLimit: 20, catalogLimit: 5 });
    expect(query.identityQuery).toBe('1989 Upper Deck Ken Griffey Jr. 1989 Upper Deck 1');
    expect(query.salesPath).toContain('graded=true');
    expect(query.salesPath).toContain('grader=PSA');
    expect(query.salesPath).toContain('grade=10');
    expect(query.salesPath).not.toContain('category=sports');
    expect(query.identityFallbackSalesPath).toContain('q=1989+Upper+Deck+Ken+Griffey+Jr.+1');
    expect(query.identityFallbackSalesPath).not.toContain('grade=');
    expect(query.catalogPath).toContain('category=sports');
    expect(query.catalogPath).toContain('card_number=1');
  });

  it('maps Pokémon/TCG to the provider category and carries stable identity fields', () => {
    const query = buildTheCardApiQuery(pokemonListing);
    expect(query.category).toBe('tcg');
    expect(query.identity).toMatchObject({ subject: 'Charizard', setName: 'Base Set', cardNumber: '4/102' });
    expect(query.catalogPath).toContain('category=trading_card_games');
  });

  it('uses custom grading company when the grading-company field is Other', () => {
    const query = buildTheCardApiQuery({
      ...sportsListing,
      certificationCompany: 'Other',
      itemDetails: JSON.stringify({
        year: '1979', manufacturer: 'Topps', player: 'Wayne Gretzky', cardNumber: '18',
        gradingCompany: 'Other', customGradingCompany: 'KSA',
      }),
    });
    expect(query.identity.gradingCompany).toBe('KSA');
    expect(query.salesPath).toContain('grader=KSA');
    expect(query.salesPath).not.toContain('grader=Other');
  });

  it('uses whole-number grades for PSA searches while retaining one decimal for other graders', () => {
    const psa = buildTheCardApiQuery({ ...sportsListing, grade: '9.0', certificationCompany: 'PSA' });
    const bgs = buildTheCardApiQuery({ ...sportsListing, grade: '9.0', certificationCompany: 'BGS' });
    expect(psa.salesPath).toContain('grader=PSA');
    expect(psa.salesPath).toContain('grade=9');
    expect(psa.salesPath).not.toContain('grade=9.0');
    expect(bgs.salesPath).toContain('grader=BGS');
    expect(bgs.salesPath).toContain('grade=9.0');
  });

  it('does not derive a provider query from the listing title when structured fields are absent', () => {
    const query = buildTheCardApiQuery({ title: '1989 Upper Deck Ken Griffey Jr. #1 PSA 10', category: 'sports_cards' });
    expect(query.identityQuery).toBe('');
    expect(query.salesPath).not.toContain('1989');
    expect(query.catalogPath).not.toContain('q=');
  });

  it('does not make non-card categories eligible for a provider request', () => {
    expect(buildTheCardApiQuery({ title: 'Rare stamp', category: 'stamps' }).category).toBeNull();
  });

  it('requires exact subject plus set/card-number alignment before catalog confirmation', () => {
    const ranked = rankTheCardApiCatalogCandidates(sportsListing, [
      { ucid: 'correct', subject: 'Ken Griffey Jr.', set_name: '1989 Upper Deck', card_number: '1', year: 1989 },
      { ucid: 'wrong-number', subject: 'Ken Griffey Jr.', set_name: '1989 Upper Deck', card_number: '2', year: 1989 },
      { ucid: 'wrong-player', subject: 'Ken Griffey Sr.', set_name: '1989 Upper Deck', card_number: '1', year: 1989 },
    ]);

    expect(ranked[0]).toEqual(expect.objectContaining({ candidate: expect.objectContaining({ ucid: 'correct' }), exactIdentity: true }));
    expect(ranked.find((candidate) => candidate.candidate.ucid === 'wrong-number')?.exactIdentity).toBe(false);
    expect(ranked.find((candidate) => candidate.candidate.ucid === 'wrong-player')?.exactIdentity).toBe(false);
  });

  it('reads the API key only from the server-side secret environment', () => {
    expect(getTheCardApiKey({ THE_CARD_API_KEY: ' tca_example ' } as NodeJS.ProcessEnv)).toBe('tca_example');
    expect(getTheCardApiKey({} as NodeJS.ProcessEnv)).toBeNull();
  });
});
