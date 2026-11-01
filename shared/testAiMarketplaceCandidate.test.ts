import { describe, expect, it } from 'vitest';
import { normalizeMarketplaceCandidate, withMarketplaceCandidateDecision } from './testAiMarketplaceCandidate';

describe('shared marketplace candidate contract', () => {
  it('preserves provider metadata, title normalization, images, price, and source identity', () => {
    const candidate = normalizeMarketplaceCandidate({
      sourceId: 'ebay_active',
      sourceLabel: 'eBay Active Listings',
      id: 'listing-123',
      title: 'Nintendo NES Power Glove — Open Box',
      itemWebUrl: 'https://example.com/listing-123',
      imageUrls: ['https://example.com/one.jpg', 'https://example.com/one.jpg', 'https://example.com/two.jpg'],
      price: { value: '203' },
      currency: 'USD',
      itemSpecifics: { Platform: 'NES', Packaging: 'Open Box' },
      metadataMatchScore: 82,
      metadataMatchRank: 1,
      metadataMatchReasons: ['accessoryName', 'compatiblePlatform'],
    });

    expect(candidate).toMatchObject({
      candidateId: 'listing-123',
      sourceId: 'ebay_active',
      title: 'Nintendo NES Power Glove — Open Box',
      normalizedTitle: 'nintendo nes power glove open box',
      url: 'https://example.com/listing-123',
      imageUrl: 'https://example.com/one.jpg',
      imageUrls: ['https://example.com/one.jpg', 'https://example.com/two.jpg'],
      imageAvailability: 'available',
      price: 203,
      currency: 'USD',
      ranking: {
        state: 'assigned',
        score: 82,
        rank: 1,
        label: null,
        reasons: [],
        matchedFields: ['accessoryName', 'compatiblePlatform'],
      },
    });
    expect(candidate.rawMetadata).toMatchObject({ itemSpecifics: { Platform: 'NES', Packaging: 'Open Box' } });
  });

  it('accepts provider price objects through an explicit compatibility alias', () => {
    const candidate = normalizeMarketplaceCandidate({
      sourceId: 'ebay_active',
      title: 'Power Glove',
      price: '203',
      imageUrl: 'http://example.com/power-glove.jpg',
    });

    expect(candidate.price).toBe(203);
    expect(candidate.imageUrl).toBe('http://example.com/power-glove.jpg');
    expect(candidate.imageAvailability).toBe('available');
  });

  it('uses the first real provider title alias without discarding the other title observations', () => {
    const candidate = normalizeMarketplaceCandidate({
      sourceId: 'ebay_active',
      itemTitle: 'PAX Power Glove NES Famicom Controller Tested Working Boxed',
      listingTitle: 'Provider listing title fallback',
      name: 'Controller',
      itemSpecifics: { AccessoryType: 'Controller', Platform: 'NES' },
      aspects: { Brand: 'Nintendo' },
    });

    expect(candidate.title).toBe('PAX Power Glove NES Famicom Controller Tested Working Boxed');
    expect(candidate.titleSource).toBe('itemTitle');
    expect(candidate.titleCandidates).toEqual([
      'PAX Power Glove NES Famicom Controller Tested Working Boxed',
      'Provider listing title fallback',
      'Controller',
    ]);
    expect(candidate.structuredMetadata).toEqual({
      itemSpecifics: { AccessoryType: 'Controller', Platform: 'NES' },
      aspects: { Brand: 'Nintendo' },
    });
  });

  it('keeps missing metadata unknown rather than inventing conflicts or a score', () => {
    const candidate = normalizeMarketplaceCandidate({ title: 'Unknown collectible' });

    expect(candidate.universalFilter).toEqual({ state: 'unknown', reasons: [] });
    expect(candidate.itemTypeFilter).toEqual({ state: 'unknown', reasons: [] });
    expect(candidate.ranking).toEqual({
      state: 'not_assigned',
      score: null,
      rank: null,
      label: null,
      reasons: [],
      matchedFields: [],
    });
    expect(candidate.valuation).toEqual({ disposition: 'not_evaluated', reasons: [] });
  });

  it('preserves one candidate identity while decision stages are updated', () => {
    const original = normalizeMarketplaceCandidate({
      sourceId: 'sold_comps',
      saleId: 'sale-1',
      title: '1996 Topps Kobe Bryant #138 PSA 10',
      thumbnailUrl: 'https://example.com/card.jpg',
      metadataMatchScore: 94,
      metadataMatchRank: 1,
    });
    const updated = withMarketplaceCandidateDecision(original, {
      universalFilter: { state: 'passed', reasons: [] },
      itemTypeFilter: { state: 'passed', reasons: [] },
      visual: { requirement: 'required', status: 'match', rationale: 'Image confirms the same card and slab.', audit: { confidence: 'high' } },
      valuation: { disposition: 'valuation_eligible', reasons: ['Completed sale passed identity and visual checks.'] },
    });

    expect(updated.candidateId).toBe(original.candidateId);
    expect(updated.ranking).toEqual(original.ranking);
    expect(updated.imageUrl).toBe('https://example.com/card.jpg');
    expect(updated.visual.status).toBe('match');
    expect(updated.valuation.disposition).toBe('valuation_eligible');
  });

  it('marks invalid image aliases without dropping the rest of the candidate', () => {
    const candidate = normalizeMarketplaceCandidate({
      sourceId: 'mercari_sold_comps',
      title: 'Power Glove',
      imageUrl: 'javascript:alert(1)',
      price: 100,
    });

    expect(candidate.imageUrl).toBeNull();
    expect(candidate.imageUrls).toEqual([]);
    expect(candidate.imageAvailability).toBe('invalid');
    expect(candidate.price).toBe(100);
  });
});
