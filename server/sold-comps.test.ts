import { describe, it, expect } from 'vitest';
import { buildEbayBrowseQuery, buildSoldCompsQueryCandidates, filterListingsByCertificationCompany, filterListingsByGrade, filterListingsByNumber, getSoldCompsApiKey } from './testAIRouter';

describe('Sold-Comps API key validation', () => {
  it('accepts the configured SOLID_COMPS_API_KEY name without exposing its value', () => {
    expect(getSoldCompsApiKey({ SOLID_COMPS_API_KEY: 'configured-key' })).toBe('configured-key');
  });

  it('prefers SOLD_COMPS_API_KEY when the standardized name is configured', () => {
    expect(getSoldCompsApiKey({ SOLD_COMPS_API_KEY: 'standard-key', SOLID_COMPS_API_KEY: 'legacy-key' })).toBe('standard-key');
  });

  it('reports no credential only when neither supported variable is configured', () => {
    expect(getSoldCompsApiKey({})).toBeNull();
  });

  it('retains the precise sports-card grade for completed-sale retrieval', () => {
    const query = '1989 Upper Deck Ken Griffey Jr 1 PSA 10';

    expect(buildEbayBrowseQuery(query, { preserveGrade: true })).toBe(query);
  });

  it('creates bounded targeted and broader fallback queries', () => {
    expect(buildSoldCompsQueryCandidates('Edge of the Spider-Verse #2 CGC 9.8')).toEqual([
      'Edge of the Spider-Verse #2 CGC',
      'Edge of the Spider-Verse #2',
      'Edge of the Spider-Verse #2 CGC 9.8',
      'Edge of Spider-Verse #2 CGC',
      'Edge of Spider-Verse #2',
      'Edge of Spider-Verse #2 CGC 9.8',
    ]);
  });

  it('adds an article-omission alias for marketplace titles that omit words such as the', () => {
    const queries = buildSoldCompsQueryCandidates('Edge of the Spider-Verse #2 CGC 9.8');

    expect(queries).toContain('Edge of Spider-Verse #2 CGC');
    expect(queries).toContain('Edge of Spider-Verse #2');
    expect(new Set(queries).size).toBe(queries.length);
    expect(queries.length).toBeLessThanOrEqual(6);
  });

  it('rejects an explicit wrong grading company while retaining an unstated provider for review', () => {
    const listings = [
      { title: 'Edge of the Spider-Verse #2 CGC 9.8' },
      { title: 'Edge of the Spider-Verse #2 CBCS 9.8' },
      { title: 'Edge of the Spider-Verse #2 9.8' },
    ];

    expect(filterListingsByCertificationCompany(listings, 'CGC')).toEqual([listings[0], listings[2]]);
  });

  it('accepts a comic title that writes the issue as a bare number before CGC', () => {
    const listing = { title: 'Edge Of The Spider-verse 2 Cgc 9.8 1st spider-Gwen white pages' };

    expect(filterListingsByNumber([listing], '2')).toEqual([listing]);
  });

  it('retains missing structured evidence but removes an explicit card-number contradiction', () => {
    const listings = [
      { title: '1989 Upper Deck Ken Griffey Jr Rookie PSA 10' },
      { title: '1989 Upper Deck Ken Griffey Jr #2 PSA 10' },
    ];

    expect(filterListingsByNumber(listings, '1', { allowMissingNumber: true })).toEqual([listings[0]]);
  });

  it('retains a missing marketplace grade for review while removing a stated wrong grade', () => {
    const listings = [
      { title: 'Edge of the Spider-Verse #2 CGC' },
      { title: 'Edge of the Spider-Verse #2 CGC 9.6' },
      { title: 'Edge of the Spider-Verse #2 CGC 9.8' },
    ];

    expect(filterListingsByGrade(listings, 9.8)).toEqual([listings[0], listings[2]]);
  });
});
