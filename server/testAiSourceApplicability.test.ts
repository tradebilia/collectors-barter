import { describe, expect, it } from 'vitest';
import { getEligibleTestAiSources, TEST_AI_SOURCE_APPLICABILITY } from '../shared/testAiSourceApplicability';
import { SANDBOX_SPECIALIST_SOURCES } from '../shared/sandboxSpecialistSources';

describe('internal Test AI source-category applicability policy', () => {
  it('limits grading and marketplace sources to valid categories and certificate prerequisites', () => {
    const ids = getEligibleTestAiSources({ category: 'sports_cards', gradingCompany: 'PSA', hasTitle: true }).map((source) => source.sourceId);
    expect(ids).toEqual(expect.arrayContaining(['ebay_active', 'sold_comps', 'psa', 'one_thirty_point', 'pwcc', 'the_card_api', 'cardsight_ai']));
    expect(ids).not.toContain('pcgs');
    expect(ids).not.toContain('smithsonian');
  });

  it('uses specialist sources only for their designated category', () => {
    expect(getEligibleTestAiSources({ category: 'stamps', hasTitle: true }).map((source) => source.sourceId)).toEqual(expect.arrayContaining(['ebay_active', 'sold_comps', 'smithsonian']));
    expect(getEligibleTestAiSources({ category: 'movies', hasTitle: true }).map((source) => source.sourceId)).toContain('wikidata');
    expect(getEligibleTestAiSources({ category: 'coins', gradingCompany: 'PCGS', hasTitle: true }).map((source) => source.sourceId)).toContain('pcgs');
    expect(getEligibleTestAiSources({ category: 'coins', gradingCompany: 'PCGS', hasTitle: true }).map((source) => source.sourceId)).toContain('pricecharting');
    const videoGameIds = getEligibleTestAiSources({ category: 'video_games', hasTitle: true }).map((source) => source.sourceId);
    expect(videoGameIds).toContain('igdb');
    expect(videoGameIds).toContain('pricecharting');
    expect(videoGameIds).not.toContain('tcgdex');
    const pokemonIds = getEligibleTestAiSources({ category: 'pokemon', hasTitle: true }).map((source) => source.sourceId);
    expect(pokemonIds).toContain('pokemon_price_tracker');
    expect(pokemonIds).toContain('the_card_api');
    expect(pokemonIds).toContain('cardsight_ai');
    expect(getEligibleTestAiSources({ category: 'stamps', hasTitle: true }).map((source) => source.sourceId)).not.toContain('pokemon_price_tracker');
    expect(getEligibleTestAiSources({ category: 'stamps', hasTitle: true }).map((source) => source.sourceId)).not.toContain('the_card_api');
    expect(getEligibleTestAiSources({ category: 'stamps', hasTitle: true }).map((source) => source.sourceId)).not.toContain('cardsight_ai');
  });

  it('enables Discogs only for titled Music items', () => {
    expect(getEligibleTestAiSources({ category: 'music', hasTitle: true }).map((source) => source.sourceId)).toContain('discogs');
    expect(getEligibleTestAiSources({ category: 'Music', hasTitle: true }).map((source) => source.sourceId)).toContain('discogs');
    expect(getEligibleTestAiSources({ category: 'music', hasTitle: false }).map((source) => source.sourceId)).not.toContain('discogs');
    expect(getEligibleTestAiSources({ category: 'vinyl', hasTitle: true }).map((source) => source.sourceId)).not.toContain('discogs');
  });

  it('shows active specialist sources in their researched categories while making Goldin and Weiss automatic context searches available everywhere', () => {
    const coinIds = getEligibleTestAiSources({ category: 'coins', hasTitle: true }).map((source) => source.sourceId);
    expect(coinIds).toEqual(expect.arrayContaining(['ngc', 'coin_archives', 'cng']));
    expect(coinIds).not.toContain('greatcollections');
    expect(coinIds).not.toContain('heritage');
    expect(coinIds).not.toContain('rumsey');

    const stampIds = getEligibleTestAiSources({ category: 'stamps', hasTitle: true }).map((source) => source.sourceId);
    expect(stampIds).toEqual(expect.arrayContaining(['rumsey', 'cherrystone', 'raritan']));
    expect(stampIds).not.toContain('heritage');
    expect(stampIds).toContain('goldin');

    const gameIds = getEligibleTestAiSources({ category: 'video_games', hasTitle: true }).map((source) => source.sourceId);
    expect(gameIds).toEqual(expect.arrayContaining(['goldin', 'hakes']));
    expect(gameIds).not.toContain('heritage');
    expect(gameIds).not.toContain('swann');
    const autographIds = getEligibleTestAiSources({ category: 'autographs', hasTitle: true }).map((source) => source.sourceId);
    for (const removed of ['greatcollections', 'university_archives', 'swann', 'rr_auction', 'alexander_historical', 'heritage']) expect(autographIds).not.toContain(removed);

    for (const category of ['comics', 'sports_cards', 'vintage_toys', 'video_games', 'stamps', 'coins', 'pokemon', 'movies', 'music', 'autographs', 'disney_pins']) {
      const sourceIds = getEligibleTestAiSources({ category, hasTitle: true }).map((source) => source.sourceId);
      expect(sourceIds, `Goldin should be eligible for ${category}`).toContain('goldin');
      expect(sourceIds, `Weiss should be eligible for ${category}`).toContain('weiss');
    }
  });

  it('keeps every active specialist source synchronized with the yellow-highlight applicability matrix', () => {
    for (const specialist of SANDBOX_SPECIALIST_SOURCES) {
      const applicability = TEST_AI_SOURCE_APPLICABILITY.find((source) => source.sourceId === specialist.id);
      expect(applicability, `${specialist.id} needs a source-applicability entry`).toBeDefined();
      for (const category of specialist.categories) {
        const eligibleIds = getEligibleTestAiSources({ category, hasTitle: true }).map((source) => source.sourceId);
        expect(eligibleIds, `${specialist.id} should highlight for ${category}`).toContain(specialist.id);
      }
    }
    expect(getEligibleTestAiSources({ category: 'comics', gradingCompany: 'CGC', hasTitle: true }).map((source) => source.sourceId)).toContain('comic_book_realm');
  });

  it('keeps Comic Book Realm configured for automatic title searching', () => {
    expect(SANDBOX_SPECIALIST_SOURCES.find((source) => source.id === 'comic_book_realm')?.searchContract).toBe('automatic_title_search');
  });

  it('does not associate Nate D. Sanders with Comics', () => {
    const comicsIds = getEligibleTestAiSources({ category: 'comics', hasTitle: true }).map((source) => source.sourceId);
    expect(comicsIds).not.toContain('nate_sanders');
    expect(SANDBOX_SPECIALIST_SOURCES.find((source) => source.id === 'nate_sanders')?.categories).not.toContain('comics');
    expect(getEligibleTestAiSources({ category: 'autographs', hasTitle: true }).map((source) => source.sourceId)).toContain('nate_sanders');
  });
});
