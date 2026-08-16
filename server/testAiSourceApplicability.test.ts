import { describe, expect, it } from 'vitest';
import { getEligibleTestAiSources } from '../shared/testAiSourceApplicability';

describe('internal Test AI source-category applicability policy', () => {
  it('limits grading and marketplace sources to valid categories and certificate prerequisites', () => {
    const ids = getEligibleTestAiSources({ category: 'sports_cards', gradingCompany: 'PSA', hasTitle: true }).map((source) => source.sourceId);
    expect(ids).toEqual(expect.arrayContaining(['ebay_active', 'sold_comps', 'psa', 'one_thirty_point', 'pwcc']));
    expect(ids).not.toContain('pcgs');
    expect(ids).not.toContain('smithsonian');
  });

  it('uses specialist sources only for their designated category', () => {
    expect(getEligibleTestAiSources({ category: 'stamps', hasTitle: true }).map((source) => source.sourceId)).toEqual(expect.arrayContaining(['ebay_active', 'sold_comps', 'smithsonian']));
    expect(getEligibleTestAiSources({ category: 'movies', hasTitle: true }).map((source) => source.sourceId)).toContain('wikidata');
    expect(getEligibleTestAiSources({ category: 'coins', gradingCompany: 'PCGS', hasTitle: true }).map((source) => source.sourceId)).toContain('pcgs');
  });
});
