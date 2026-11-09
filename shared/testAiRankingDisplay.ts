import { retainOriginDisplayRanking } from './testAiRankingPopulation';

export function validDisplayRank(value: unknown): number | null {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return null;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const rank = Number(value);
  return Number.isSafeInteger(rank) && rank > 0 ? rank : null;
}
function validScore(value: unknown): number | null {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return null;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= 100 ? score : null;
}

/** Display only. This comparator must never control review caps or admission. */
export function sortMetadataRankedCandidates<T extends Record<string, any>>(listings: T[]): T[] {
  return listings.map((listing, index) => ({ listing, index }))
    .sort((a, b) => {
      const rankA = validDisplayRank(a.listing.metadataMatchRank) ?? Number.POSITIVE_INFINITY;
      const rankB = validDisplayRank(b.listing.metadataMatchRank) ?? Number.POSITIVE_INFINITY;
      if (rankA !== rankB) return rankA - rankB;
      const scoreA = validScore(a.listing.metadataMatchScore) ?? Number.NEGATIVE_INFINITY;
      const scoreB = validScore(b.listing.metadataMatchScore) ?? Number.NEGATIVE_INFINITY;
      return scoreB - scoreA || a.index - b.index;
    }).map(({ listing }) => listing);
}

export function originatingRankingOccurrence(listing: Record<string, any>): string | null {
  const value = listing.metadataOriginOccurrenceKey ?? listing.metadataRanking?.originOccurrenceKey ?? listing.metadataRanking?.occurrenceKey;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Only a known local parent can supply its full-population display ranking. */
export function preserveParentDisplayRanking<T extends Record<string, any>>(parent: T, reviewed: Record<string, any>): T {
  const parentKey = parent.metadataRanking?.occurrenceKey;
  const reviewedKey = originatingRankingOccurrence(reviewed);
  const merged = { ...parent, ...reviewed } as T;
  if (typeof parentKey !== 'string' || reviewedKey !== parentKey) return merged;
  return retainOriginDisplayRanking(parent, merged);
}

/** Full returned source projections feed the existing one master list only. */
export function collectEbayDisplayCandidates(data: Record<string, any> | null | undefined): Record<string, any>[] {
  const groups = [data?.listings, data?.visualReviewListings, data?.visualFilter?.listings,
    data?.visualFilter?.contextListings, data?.preVisionFilter?.excludedListings];
  return groups.flatMap((group) => Array.isArray(group) ? group : []).map((row) => ({ ...row,
    itemUrl: row.itemUrl ?? row.itemWebUrl ?? row.url,
    imageUrl: row.imageUrl ?? row.thumbnailUrl ?? row.imageUrls?.[0],
    price: row.price ?? row.soldPrice ?? row.listingPrice,
  }));
}

/** Same bounded explicit DTO as the page, with a display-only occurrence hint. */
export function buildEbayVisualReviewListings(data: Record<string, any> | null | undefined): Record<string, any>[] {
  const reviewListings = Array.isArray(data?.visualReviewListings) ? data.visualReviewListings : [];
  const listingRows = Array.isArray(data?.listings) ? data.listings : [];
  const hasImage = (row: Record<string, any>) => typeof row?.imageUrl === 'string'
    || (Array.isArray(row?.imageUrls) && row.imageUrls.some((url: unknown) => typeof url === 'string' && url.length > 0));
  const sourceListings = reviewListings.some(hasImage) ? reviewListings : listingRows;
  return sourceListings.slice(0, 30).map((listing: Record<string, any>) => {
    const imageUrls = Array.isArray(listing.imageUrls)
      ? listing.imageUrls.filter((url: unknown) => typeof url === 'string').slice(0, 3) : [];
    return {
      id: String(listing.id ?? listing.itemId ?? listing.itemUrl ?? ''),
      title: String(listing.title ?? ''), price: Number(listing.price?.value ?? listing.price) || null,
      currency: String(listing.currency ?? listing.price?.currency ?? 'USD'),
      condition: listing.condition ? String(listing.condition) : null,
      seller: listing.seller ? String(listing.seller) : null,
      itemUrl: listing.itemUrl ? String(listing.itemUrl) : null,
      imageUrl: typeof listing.imageUrl === 'string' ? listing.imageUrl : imageUrls[0] ?? null,
      imageUrls,
      listingType: listing.listingType ? String(listing.listingType) : null,
      bidCount: Number.isFinite(Number(listing.bidCount)) ? Number(listing.bidCount) : null,
      uniqueBidderCount: Number.isFinite(Number(listing.uniqueBidderCount)) ? Number(listing.uniqueBidderCount) : null,
      currentBidPrice: Number.isFinite(Number(listing.currentBidPrice?.value ?? listing.currentBidPrice)) ? Number(listing.currentBidPrice?.value ?? listing.currentBidPrice) : null,
      auctionEndDate: listing.auctionEndDate ? String(listing.auctionEndDate) : null,
      metadataRanking: listing.metadataRanking,
    };
  });
}

export function mergeKnownEbayParentDisplayRows(base: Record<string, any>, reviewed: Record<string, any>[]): Record<string, any>[] {
  const parents = new Map<string, Record<string, any>>();
  for (const row of collectEbayDisplayCandidates(base)) {
    const key = originatingRankingOccurrence(row);
    if (key && !parents.has(key)) parents.set(key, row);
  }
  return reviewed.map((row) => {
    const key = originatingRankingOccurrence(row);
    const parent = key ? parents.get(key) : undefined;
    return parent ? preserveParentDisplayRanking(parent, row) : row;
  });
}
