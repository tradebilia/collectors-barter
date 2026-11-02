import { describe, expect, it } from 'vitest';
import { normalizeEbayMarketplaceCandidate } from './ebayMarketplaceCandidate';
import { normalizeMercariSoldCandidate } from './soldCompsAdditionalMarketData';

type AdapterCase = {
  name: string;
  normalize: () => any;
};

const moonlightingImages = ['https://img.test/front.jpg', 'https://img.test/back.jpg'];

const adapters: AdapterCase[] = [
  {
    name: 'eBay active',
    normalize: () => normalizeEbayMarketplaceCandidate({
      itemId: 'ebay-active-moonlighting',
      title: 'Moonlighting Seasons 1 & 2 DVD Collection',
      listingTitle: 'Moonlighting Seasons 1 & 2 DVD Collection',
      price: { value: '24.99', currency: 'USD' },
      condition: 'Pre-Owned',
      itemWebUrl: 'https://www.ebay.com/itm/ebay-active-moonlighting',
      imageUrls: moonlightingImages,
      itemSpecifics: { Format: 'DVD', Seasons: '1 & 2' },
      seller: { username: 'seller-ebay' },
    }, { sourceId: 'ebay_active', sourceLabel: 'eBay active listings', saleStatus: 'active', priceBasis: 'asking' }),
  },
  {
    name: 'eBay sold',
    normalize: () => normalizeEbayMarketplaceCandidate({
      saleId: 'ebay-sold-moonlighting',
      title: 'Moonlighting Seasons 1 & 2 DVD Collection',
      price: { value: '15.00', currency: 'USD' },
      soldAt: '2026-09-01',
      condition: 'Used',
      url: 'https://www.ebay.com/itm/ebay-sold-moonlighting',
      additionalImages: moonlightingImages.map((url) => ({ imageUrl: url })),
      aspects: { Format: 'DVD', Seasons: '1 & 2' },
    }, { sourceId: 'sold_comps', sourceLabel: 'eBay Sold-Comps', retrievalQuery: 'Moonlighting Seasons 1 & 2 DVD', saleStatus: 'completed', priceBasis: 'sold' }),
  },
  {
    name: 'Mercari sold',
    normalize: () => normalizeMercariSoldCandidate({
      itemId: 'mercari-sold-moonlighting',
      title: 'Moonlighting Seasons 1 & 2 DVD Collection',
      price: '15.00',
      currency: 'USD',
      soldAt: '2026-09-01',
      condition: 'Pre-Owned',
      url: 'https://www.mercari.com/us/item/mercari-sold-moonlighting',
      images: moonlightingImages.map((url) => ({ url })),
    })?.canonicalCandidate,
  },
];

describe('shared eBay/Mercari marketplace adapter contract', () => {
  it.each(adapters)('$name preserves canonical identity, completed/active status, and the image gallery', ({ normalize }) => {
    const candidate = normalize();
    expect(candidate).toMatchObject({
      title: 'Moonlighting Seasons 1 & 2 DVD Collection',
      imageUrl: moonlightingImages[0],
      imageUrls: moonlightingImages,
      marketplace: candidate.marketplace,
    });
    expect(candidate.titleCandidates).toContain('Moonlighting Seasons 1 & 2 DVD Collection');
    expect(candidate.conditionEvidence.usable).toBe(true);
  });

  it.each(adapters)('$name keeps cosmetic condition separate from objective condition evidence', ({ normalize }) => {
    const candidate = normalize();
    expect(candidate.marketplaceCondition).toMatch(/Pre-Owned|Used/);
    expect(candidate.conditionEvidence).toMatchObject({
      usable: true,
      damaged: false,
      incomplete: false,
      nonFunctional: false,
      replacementOnly: false,
      packagingOnly: false,
      reasons: [],
    });
  });

  it.each([
    ['eBay', () => normalizeEbayMarketplaceCandidate({ title: 'Moonlighting DVD set for parts', condition: 'Used', imageUrls: moonlightingImages }, { sourceId: 'ebay_active', saleStatus: 'active', priceBasis: 'asking' })],
    ['Mercari', () => normalizeMercariSoldCandidate({ itemId: 'mercari-parts', title: 'Moonlighting DVD set for parts', price: 5, condition: 'Used', images: moonlightingImages })?.canonicalCandidate],
  ])('%s marks parts-only wording as objective evidence', (_name, normalize) => {
    const candidate = normalize();
    expect(candidate.conditionEvidence).toMatchObject({ usable: false, replacementOnly: true });
    expect(candidate.conditionEvidence.reasons).toContain('replacement or repair-part wording');
  });
});
