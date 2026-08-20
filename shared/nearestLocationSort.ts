export type NearestLocationSortReason =
  | "sign_in_required"
  | "saved_town_required"
  | "location_unavailable";

export type LocationDistanceStatus = {
  requested: boolean;
  applied: boolean;
  reason: NearestLocationSortReason | null;
};

export type NearestLocationSortStatus = LocationDistanceStatus;

type DistanceSortableListing = {
  id: number;
  ownerId: number;
};

/**
 * Keeps exact locations server-only. Listings with an unavailable owner town
 * are retained, but are ordered after listings with a calculated distance.
 */
export function orderListingsByOwnerDistance<T extends DistanceSortableListing>(
  listings: T[],
  milesByOwnerId: ReadonlyMap<number, number | null>,
): T[] {
  const distanceFor = (listing: T) => milesByOwnerId.get(listing.ownerId) ?? Number.POSITIVE_INFINITY;

  return [...listings].sort((left, right) => {
    const distanceDifference = distanceFor(left) - distanceFor(right);
    return distanceDifference || right.id - left.id;
  });
}

export function filterListingsByOwnerDistance<T extends DistanceSortableListing>(
  listings: T[],
  milesByOwnerId: ReadonlyMap<number, number | null>,
  maximumMiles: number,
): T[] {
  return listings.filter(listing => {
    const miles = milesByOwnerId.get(listing.ownerId);
    return miles !== null && miles !== undefined && miles <= maximumMiles;
  });
}

/**
 * Returns a deliberately broad viewer-facing distance description. Exact miles,
 * towns, addresses, and coordinates remain server-only.
 */
export function getApproximateDistanceBand(
  miles: number | null | undefined,
  isViewerOwnedListing = false,
): string | null {
  if (isViewerOwnedListing) return "Your listing";
  if (miles === null || miles === undefined || !Number.isFinite(miles)) return null;
  if (miles <= 10) return "Within 10 miles";
  if (miles <= 25) return "10–25 miles away";
  if (miles <= 50) return "25–50 miles away";
  if (miles <= 100) return "50–100 miles away";
  if (miles <= 250) return "100–250 miles away";
  return "250+ miles away";
}
