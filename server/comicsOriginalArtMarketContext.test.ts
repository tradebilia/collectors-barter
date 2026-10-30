import { describe, expect, it } from 'vitest';
import { buildComicsOriginalArtQueries, isComicsOriginalArt } from '../shared/testAiCriteria';
import { buildVisualTargetMetadata, filterVisualSourceCandidates, originalArtMarketRelevanceBand, originalArtMarketRelevanceScore } from './testAiVisualSourceFilter';

describe('Comics Original Art market-context workflow', () => {
  it('builds broad queries from the approved Original Art fields', () => {
    const queries = buildComicsOriginalArtQueries({
      artistName: 'Todd McFarlane',
      artworkTitle: 'Spawn',
      artType: 'Comic Book Cover Sketch / Remark',
      coverSketchComicTitle: 'Spawn',
      coverSketchIssueNumber: '300',
    }, 'fallback');
    expect(queries[0]).toContain('Todd McFarlane');
    expect(queries[0]).toContain('Comic Book Cover Sketch / Remark');
    expect(queries[0]).toContain('Spawn');
    expect(queries[0]).toContain('300');
    expect(queries.length).toBeGreaterThan(2);
    expect(isComicsOriginalArt('original_art')).toBe(true);
    expect(isComicsOriginalArt('Original Art')).toBe(true);
    expect(isComicsOriginalArt('single_comic')).toBe(false);
  });

  it('keeps Original Art candidates as context and makes no visual-review call', async () => {
    const target = buildVisualTargetMetadata({
      title: 'Spawn original art',
      category: 'comics',
      itemType: 'original_art',
      fullItemDetails: {
        artistName: 'Todd McFarlane',
        artworkTitle: 'Spawn',
        artType: 'Comic Book Cover Sketch / Remark',
        coverSketchComicTitle: 'Spawn',
        coverSketchIssueNumber: '300',
        publisher: 'Image',
      },
    });
    const score = originalArtMarketRelevanceScore({
      title: 'Todd McFarlane Spawn Comic Book Cover Sketch Remark Spawn #300 Image',
      imageUrl: 'https://example.com/candidate.jpg',
    }, target);
    expect(score.score).toBe(100);
    expect(originalArtMarketRelevanceBand(score.score)).toBe('highly relevant');
    const result = await filterVisualSourceCandidates({
      sourceRole: 'ebay',
      sourceLabel: 'eBay Sold-Comps',
      targetImageUrl: 'https://example.com/target.jpg',
      targetMetadata: target,
      listings: [{ title: 'Todd McFarlane Spawn Comic Book Cover Sketch Remark Spawn #300 Image', imageUrl: 'https://example.com/candidate.jpg', price: 1000 }],
    });
    expect(result.listings).toHaveLength(0);
    expect(result.contextListings).toHaveLength(1);
    expect(result.contextListings?.[0]).toMatchObject({ metadataMatchRank: 1, metadataMatchScore: 100 });
    expect(result.reviewedCount).toBe(0);
    expect(result.reviews).toHaveLength(0);
    expect(result.note).toContain('not sent to visual analysis');
  });
});
