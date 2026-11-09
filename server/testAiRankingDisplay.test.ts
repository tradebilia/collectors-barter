import { describe, expect, it } from 'vitest';
import { originatingRankingOccurrence, preserveParentDisplayRanking, sortMetadataRankedCandidates, validDisplayRank, collectEbayDisplayCandidates, buildEbayVisualReviewListings, mergeKnownEbayParentDisplayRows } from '../shared/testAiRankingDisplay';
import { buildSoldCompsAnalysisSales } from '../shared/testAiSoldCompsTransport';

describe('Stage 4 actual display ranking and parent subset preservation', () => {
  it('does not coerce null, empty, zero, booleans or invalid values into ranked candidates', () => {
    for (const value of [null, undefined, '', ' ', 0, '0', -1, NaN, Infinity, true, {}, []]) expect(validDisplayRank(value)).toBeNull();
    expect(validDisplayRank('77')).toBe(77);
    const sorted = sortMetadataRankedCandidates([
      { id: 'empty', metadataMatchRank: null }, { id: '77', metadataMatchRank: 77, metadataMatchScore: 10 },
      { id: 'one', metadataMatchRank: 1, metadataMatchScore: 100 }, { id: 'zero', metadataMatchRank: 0 },
    ]);
    expect(sorted.map((entry) => entry.id)).toEqual(['one', '77', 'empty', 'zero']);
  });
  it('keeps score ties stable, is immutable, and does not use price as a tiebreak', () => {
    const input = [{ id: 'first', metadataMatchScore: 50, price: 999 }, { id: 'second', metadataMatchScore: 50, price: 1 },
      { id: 'third', metadataMatchScore: 80, price: 100 }];
    expect(sortMetadataRankedCandidates(input).map((entry) => entry.id)).toEqual(['third', 'first', 'second']);
    expect(input.map((entry) => entry.id)).toEqual(['first', 'second', 'third']);
  });
  it('retains a known full-population rank and awards while updating only image-review outcome', () => {
    const parent = { id: 'same', metadataRanking: { populationId: 'source-full-run', sourceId: 'ebay_active', occurrenceKey: 'source-full-run/same#8', ordinal: 8, populationSize: 40, scorerRole: 'exact_comparable', score: 60, rank: 9 },
      metadataMatchRank: 9, metadataMatchScore: 60, metadataMatchReasons: ['gameTitle'],
      metadataScoreAwards: [{ field: 'gameTitle', source: 'title', awardedPoints: 20 }], metadataFieldComparisons: [{ targetField: 'Game Title' }] };
    const reviewed = { id: 'same', metadataOriginOccurrenceKey: parent.metadataRanking.occurrenceKey,
      metadataRanking: { populationId: 'subset', occurrenceKey: 'subset/same#0' }, metadataMatchRank: 1, metadataMatchScore: 100,
      metadataScoreAwards: [{ field: 'grade', source: 'structured', awardedPoints: 100 }], visualReviewStatus: 'match' };
    const result = preserveParentDisplayRanking(parent, reviewed);
    expect(result.metadataMatchRank).toBe(9);
    expect(result.metadataMatchScore).toBe(60);
    expect(result.metadataScoreAwards).toEqual(parent.metadataScoreAwards);
    expect((result as any).visualReviewStatus).toBe('match');
    expect(originatingRankingOccurrence(reviewed)).toBe(parent.metadataRanking.occurrenceKey);
  });
  it('does not substitute another same-title/id source occurrence or manufacture a parent population', () => {
    const parent = { id: 'same', title: 'Same title', metadataRanking: { populationId: 'A', occurrenceKey: 'A/same#0' }, metadataMatchRank: 8 };
    const different = { id: 'same', title: 'Same title', metadataRanking: { populationId: 'B', occurrenceKey: 'B/same#0' }, metadataMatchRank: 1 };
    expect(preserveParentDisplayRanking(parent, different).metadataRanking).toEqual(different.metadataRanking);
    expect(preserveParentDisplayRanking({ id: 'no-parent' }, different).metadataMatchRank).toBe(1);
  });
  it('the unchanged lossless Item A/B Sold-Comps helper retains additive awards/rank diagnostics but creates no approval', () => {
    const left = { title: 'A', price: 100, metadataScoreAwards: [{ field: 'grade', source: 'title', awardedPoints: 5 }],
      metadataRanking: { populationId: 'A', occurrenceKey: 'A/0' }, metadataMatchRank: 7 };
    const right = { ...left, title: 'B', metadataRanking: { populationId: 'B', occurrenceKey: 'B/0' }, metadataMatchRank: 12 };
    const [a] = buildSoldCompsAnalysisSales({ listings: [left] }, true);
    const [b] = buildSoldCompsAnalysisSales({ listings: [right] }, true);
    expect(a.metadataRanking).toEqual(left.metadataRanking);
    expect(b.metadataRanking).toEqual(right.metadataRanking);
    expect(a.metadataScoreAwards).toEqual(left.metadataScoreAwards);
    expect(b.metadataMatchRank).toBe(12);
    expect(a).not.toHaveProperty('verifiedIdentityApproval');
    expect(b).not.toHaveProperty('provenance');
  });
});


describe('Stage 4 actual eBay page DTO and full parent projections', () => {
  const parentRows = () => Array.from({ length: 40 }, (_, index) => ({
    id: String(index), title: 'Same listing title', imageUrl: `https://example.test/${index}.jpg`,
    imageUrls: Array.from({ length: 5 }, (_, image) => `https://example.test/${index}/${image}.jpg`),
    metadataRanking: { populationId: 'full', sourceId: 'ebay_active', occurrenceKey: `full/${index}`,
      ordinal: index, populationSize: 40, scorerRole: 'exact_comparable', score: 60, rank: index + 1 },
    metadataMatchScore: 60, metadataMatchRank: index + 1,
    metadataScoreAwards: [{ field: 'gameTitle', source: 'title', awardedPoints: 20 }],
  }));
  it('the real bounded DTO retains origin keys but neither external payload expansion nor browser scoring authority', () => {
    const rows = parentRows();
    const result = buildEbayVisualReviewListings({ listings: rows.slice(0, 20), visualReviewListings: rows.slice(0, 30) });
    expect(result).toHaveLength(30);
    expect(result[29].metadataRanking.occurrenceKey).toBe('full/29');
    expect(result[29].imageUrls).toHaveLength(3);
    expect(result[29]).not.toHaveProperty('metadataMatchScore');
    expect(result[29]).not.toHaveProperty('metadataScoreAwards');
  });
  it('preserves the actual parent ranks/awards for known review occurrences 21–30, not compact subset ranks', () => {
    const rows = parentRows();
    const base = { listings: rows.slice(0, 20), visualReviewListings: rows.slice(0, 30) };
    const reviewed = buildEbayVisualReviewListings(base).map((row, index) => ({ ...row,
      metadataOriginOccurrenceKey: row.metadataRanking.occurrenceKey,
      metadataRanking: { populationId: 'subset', sourceId: 'ebay_active_subset', occurrenceKey: `subset/${index}` },
      metadataMatchScore: 100, metadataMatchRank: 1, metadataScoreAwards: [], visualReviewStatus: 'match',
    }));
    const merged = mergeKnownEbayParentDisplayRows(base, reviewed);
    expect(merged[29].metadataMatchRank).toBe(30);
    expect(merged[29].metadataMatchScore).toBe(60);
    expect(merged[29].metadataScoreAwards).toEqual(rows[29].metadataScoreAwards);
    expect(merged[29].visualReviewStatus).toBe('match');
  });
  it('the actual master source helper retains the 31–40 tail without expanding the review input or primary panel', () => {
    const rows = parentRows();
    const data = { listings: rows.slice(0, 20), visualReviewListings: rows.slice(0, 30),
      visualFilter: { listings: [], contextListings: rows } };
    const master = collectEbayDisplayCandidates(data);
    expect(new Set(master.map((row) => row.metadataRanking.occurrenceKey)).size).toBe(40);
    expect(master.find((row) => row.metadataRanking.occurrenceKey === 'full/39')?.metadataMatchRank).toBe(40);
    expect(data.listings).toHaveLength(20);
    expect(buildEbayVisualReviewListings(data)).toHaveLength(30);
  });
});
