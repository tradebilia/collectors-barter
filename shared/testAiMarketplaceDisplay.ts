export type MarketplaceDisplayCandidate = {
  title?: unknown;
  evidenceDisposition?: unknown;
};

/**
 * Active-market context may retain excluded records for audit, but those records
 * must not appear in the candidate list or be sent to visual review.
 */
export function isActiveCandidateHiddenBeforeVision(
  listing: MarketplaceDisplayCandidate,
  targetIsGraded: boolean,
): boolean {
  if (listing.evidenceDisposition === 'pre_vision_excluded') return true;
  return targetIsGraded && /\btested\b/i.test(String(listing.title ?? ''));
}

export function filterVisibleActiveCandidates<T extends MarketplaceDisplayCandidate>(
  listings: T[] | null | undefined,
  targetIsGraded: boolean,
): T[] {
  return (listings ?? []).filter((listing) => !isActiveCandidateHiddenBeforeVision(listing, targetIsGraded));
}
