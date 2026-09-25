import { describe, expect, it } from 'vitest';
import {
  buildPokemonPriceTrackerQuery,
  getPokemonPriceTrackerApiKey,
  rankPokemonPriceTrackerCandidates,
} from './pokemonPriceTracker';

const pokemonListing = {
  title: 'Pokémon Charizard Base Set 4/102 Holo PSA 9',
  category: 'pokemon',
  grade: '9',
  certificationCompany: 'PSA',
  itemDetails: JSON.stringify({
    cardName: 'Charizard',
    setName: 'Base Set',
    cardNumber: '4/102',
    variant: 'Holofoil',
    language: 'English',
  }),
};

describe('Pokémon Price Tracker sandbox adapter', () => {
  it('builds a bounded, language-aware catalog lookup from Pokémon identity fields', () => {
    expect(buildPokemonPriceTrackerQuery(pokemonListing)).toEqual(expect.objectContaining({
      query: 'Charizard 4/102 Base Set Holofoil',
      language: 'english',
      candidateLimit: 1,
      identity: expect.objectContaining({ cardName: 'Charizard', cardNumber: '4/102', setName: 'Base Set' }),
    }));
  });

  it('admits a provider candidate only after exact name, set, and card-number alignment', () => {
    const ranked = rankPokemonPriceTrackerCandidates(pokemonListing, [
      { tcgPlayerId: 'correct', name: 'Charizard', setName: 'Base Set', cardNumber: '004/102', totalSetNumber: null, prices: { primaryPrinting: 'Holofoil' }, printingsAvailable: ['Holofoil'] },
      { tcgPlayerId: 'wrong-set', name: 'Charizard', setName: 'Base Set 2', cardNumber: '4', totalSetNumber: '130' },
      { tcgPlayerId: 'wrong-number', name: 'Charizard', setName: 'Base Set', cardNumber: '3', totalSetNumber: '102' },
    ]);

    expect(ranked[0]).toEqual(expect.objectContaining({ card: expect.objectContaining({ tcgPlayerId: 'correct' }), exactIdentity: true }));
    expect(ranked.find((candidate) => candidate.card.tcgPlayerId === 'wrong-set')?.exactIdentity).toBe(false);
    expect(ranked.find((candidate) => candidate.card.tcgPlayerId === 'wrong-number')?.exactIdentity).toBe(false);
  });

  it('does not treat name-only results as exact identity matches', () => {
    const ranked = rankPokemonPriceTrackerCandidates(pokemonListing, [
      { tcgPlayerId: 'name-only', name: 'Charizard', setName: 'Unknown Set', cardNumber: '4', totalSetNumber: '102' },
    ]);

    expect(ranked[0]?.exactIdentity).toBe(false);
  });

  it('reads the provider key only from the server-side environment', () => {
    expect(getPokemonPriceTrackerApiKey({ POKEMON_PRICE_TRACKER_API_KEY: ' test-token ' } as NodeJS.ProcessEnv)).toBe('test-token');
    expect(getPokemonPriceTrackerApiKey({} as NodeJS.ProcessEnv)).toBeNull();
  });
});
