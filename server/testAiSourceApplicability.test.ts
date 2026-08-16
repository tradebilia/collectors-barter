import { describe, expect, it } from 'vitest';
import { TEST_AI_SOURCE_APPLICABILITY, TRADEBILIA_CATEGORIES, getSourceApplicability } from '../shared/testAiSourceApplicability';

describe('Test AI source-category applicability policy', () => {
  it('covers every Tradebilia category in the source-policy taxonomy', () => {
    expect(TRADEBILIA_CATEGORIES).toEqual([
      'comics', 'sports_cards', 'vintage_toys', 'video_games', 'stamps',
      'coins', 'pokemon', 'movies', 'autographs', 'disney_pins',
    ]);
  });

  it('keeps general eBay-derived completed-sale data applicable to every category', () => {
    for (const category of TRADEBILIA_CATEGORIES) {
      expect(getSourceApplicability('sold_comps', category).isApplicable).toBe(true);
    }
    expect(TEST_AI_SOURCE_APPLICABILITY.sold_comps.note).toContain('all Tradebilia categories');
  });

  it('requires the appropriate collectible category and certificate for grading sources', () => {
    expect(getSourceApplicability('psa', 'sports_cards')).toMatchObject({ isApplicable: true, requires: ['certificate'] });
    expect(getSourceApplicability('psa', 'stamps').isApplicable).toBe(false);
    expect(getSourceApplicability('pcgs', 'coins').isApplicable).toBe(true);
    expect(getSourceApplicability('pcgs', 'pokemon').isApplicable).toBe(false);
  });

  it('keeps reference and market-specialist sources limited to their supported categories', () => {
    expect(getSourceApplicability('smithsonian', 'stamps').isApplicable).toBe(true);
    expect(getSourceApplicability('smithsonian', 'coins').isApplicable).toBe(false);
    expect(getSourceApplicability('wikidata', 'movies').isApplicable).toBe(true);
    expect(getSourceApplicability('wikidata', 'autographs').isApplicable).toBe(true);
    expect(getSourceApplicability('pricecharting', 'pokemon').isApplicable).toBe(true);
    expect(getSourceApplicability('pricecharting', 'sports_cards').isApplicable).toBe(false);
  });

  it('records historical completed-sale sources as context requiring exact-match review', () => {
    expect(getSourceApplicability('pwcc', 'pokemon')).toMatchObject({ isApplicable: true, requires: ['title', 'exact_match_review'] });
    expect(getSourceApplicability('one_thirty_point', 'disney_pins').isApplicable).toBe(true);
    expect(TEST_AI_SOURCE_APPLICABILITY.one_thirty_point.note).toContain('never as an automatic current value');
  });
});
