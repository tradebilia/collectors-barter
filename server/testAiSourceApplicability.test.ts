import { describe, expect, it } from 'vitest';
import { getEligibleTestAiSources } from '../shared/testAiSourceApplicability';

describe('internal Test AI source-category applicability policy', () => {
  it('limits grading and marketplace sources to valid categories and certificate prerequisites', () => {
    const ids = getEligibleTestAiSources({ category: 'sports_cards', gradingCompany: 'PSA', hasTitle: true }).map((source) => source.sourceId);
    expect(ids).toEqual(expect.arrayContaining(['ebay_active', 'sold_comps', 'psa', 'one_thirty_point', 'pwcc', 'the_card_api']));
    expect(ids).not.toContain('pcgs');
    expect(ids).not.toContain('smithsonian');
  });

  it('uses specialist sources only for their designated category', () => {
    expect(getEligibleTestAiSources({ category: 'stamps', hasTitle: true }).map((source) => source.sourceId)).toEqual(expect.arrayContaining(['ebay_active', 'sold_comps', 'smithsonian']));
    expect(getEligibleTestAiSources({ category: 'movies', hasTitle: true }).map((source) => source.sourceId)).toContain('wikidata');
    expect(getEligibleTestAiSources({ category: 'coins', gradingCompany: 'PCGS', hasTitle: true }).map((source) => source.sourceId)).toContain('pcgs');
    const videoGameIds = getEligibleTestAiSources({ category: 'video_games', hasTitle: true }).map((source) => source.sourceId);
    expect(videoGameIds).toContain('igdb');
    expect(videoGameIds).not.toContain('tcgdex');
    const pokemonIds = getEligibleTestAiSources({ category: 'pokemon', hasTitle: true }).map((source) => source.sourceId);
    expect(pokemonIds).toContain('pokemon_price_tracker');
    expect(pokemonIds).toContain('the_card_api');
    expect(getEligibleTestAiSources({ category: 'stamps', hasTitle: true }).map((source) => source.sourceId)).not.toContain('pokemon_price_tracker');
    expect(getEligibleTestAiSources({ category: 'stamps', hasTitle: true }).map((source) => source.sourceId)).not.toContain('the_card_api');
  });

  it('enables Discogs only for titled Music items', () => {
    expect(getEligibleTestAiSources({ category: 'music', hasTitle: true }).map((source) => source.sourceId)).toContain('discogs');
    expect(getEligibleTestAiSources({ category: 'Music', hasTitle: true }).map((source) => source.sourceId)).toContain('discogs');
    expect(getEligibleTestAiSources({ category: 'music', hasTitle: false }).map((source) => source.sourceId)).not.toContain('discogs');
    expect(getEligibleTestAiSources({ category: 'vinyl', hasTitle: true }).map((source) => source.sourceId)).not.toContain('discogs');
  });
});
